// Étape 8 : traducteurs document ↔ éditeur de gauche (S10, S12, S14) et changement minimal (S13).
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { documentToEditor, editorToDocument, type EditorNode } from '../../src/ui/editorConvert';
import { textChange } from '../../src/ui/textChange';
import { ESC, ZERO_WIDTH_SPACE } from '../../src/core/characters';

/** Le document passe par l'éditeur et revient identique. */
function throughEditor(message: string) {
  const document = parse(message);
  return { document, back: editorToDocument(documentToEditor(document)) };
}

const MESSAGES: Record<string, string> = {
  vide: '',
  S1_gras: '**bonjour**',
  S2_gras_italique: '***bonjour***',
  styles: '__souligné__ ~~barré~~ ||spoiler|| *italique* `code`',
  code_stylé: '**`code`** et ||`secret`||',
  lignes_vides: 'a\n\nb\n',
  titres: '# Titre\n## Deux\n### Trois\n-# sous-texte',
  listes: '- a\n  - b\n    1. c\n    2. d\n- e\n\n3. x\n4. y',
  citation: '> citée\n> - puce citée',
  bloc: '```js\nconst a = 1;\n```',
  bloc_sous_puce: '- puce\n  ```\n  code\n  ```\n- suite',
  ansi: `\`\`\`ansi\n${ESC}[1;31mrouge${ESC}[0m normal\n\`\`\``,
  mentions: '<@ID_UTILISATEUR> <@&123> <#ID_SALON> <t:1700000000:R>',
  S12_inconnu: 'lien [texte](https://exemple.fr) et :emoji_perso: et <a:x:123>',
  invisible: `a${ZERO_WIDTH_SPACE}b`,
};

describe('Aller-retour document → éditeur → document (S14)', () => {
  for (const [name, message] of Object.entries(MESSAGES)) {
    it(name, () => {
      const { document, back } = throughEditor(message);
      expect(back).toEqual(document);
      expect(serialize(back)).toBe(serialize(document));
    });
  }
});

describe('Messages réels de examples/ passés par l\'éditeur (S14, S15)', () => {
  const files = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true });
  for (const [path, content] of Object.entries(files)) {
    it(path.split('/').pop()!, () => {
      const { document, back } = throughEditor(content);
      expect(back).toEqual(document);
    });
  }
});

const line = (attrs: Record<string, unknown>, ...content: EditorNode[]): EditorNode => ({
  type: 'line',
  attrs: { quote: false, listKind: null, listLevel: 0, listStart: null, lineStyle: 'normal', ...attrs },
  content: content.length > 0 ? content : undefined,
});
const t = (value: string, ...marks: string[]): EditorNode => ({ type: 'text', text: value, marks: marks.map((type) => ({ type })) });
const doc = (...content: EditorNode[]): EditorNode => ({ type: 'doc', content });
const bullet = { listKind: 'bullet', listLevel: 1 };

describe('Éditeur → document : réparation vers une forme valide', () => {
  it('éditeur vide : message vide', () => {
    expect(serialize(editorToDocument(doc(line({}))))).toBe('');
  });

  it('S1 : texte en gras', () => {
    expect(serialize(editorToDocument(doc(line({}, t('bonjour', 'bold')))))).toBe('**bonjour**');
  });

  it('puce laissée vide après Entrée : ligne vide', () => {
    expect(serialize(editorToDocument(doc(line(bullet, t('a')), line(bullet))))).toBe('- a\n');
  });

  it('élément numéroté ajouté par Entrée : numéro suivant', () => {
    const ordered = { listKind: 'ordered', listLevel: 1 };
    const message = doc(line({ ...ordered, listStart: 3 }, t('a')), line(ordered, t('b')));
    expect(serialize(editorToDocument(message))).toBe('3. a\n4. b');
  });

  it('à un même niveau, le type du premier élément l\'emporte (D3)', () => {
    const message = doc(line(bullet, t('a')), line({ listKind: 'ordered', listLevel: 1, listStart: 1 }, t('b')));
    expect(serialize(editorToDocument(message))).toBe('- a\n- b');
  });

  it('niveau sauté : ramené au niveau possible', () => {
    const message = doc(line(bullet, t('a')), line({ listKind: 'bullet', listLevel: 3 }, t('b')));
    expect(serialize(editorToDocument(message))).toBe('- a\n  - b');
  });

  it('titre dans une puce : la puce reste, le titre est retiré (D14)', () => {
    expect(serialize(editorToDocument(doc(line({ ...bullet, lineStyle: 'heading1' }, t('a')))))).toBe('- a');
  });

  it('code en ligne impossible (accent grave au bord) : redevient du texte', () => {
    const back = editorToDocument(doc(line({}, t('`a', 'code', 'bold'))));
    expect(back.blocks[0]).toMatchObject({ content: [{ type: 'text', text: '`a', marks: ['bold'] }] });
  });

  it('bloc de puce dont la puce a été supprimée : bloc hors de la liste', () => {
    const block = parse('- puce\n  ```\n  code\n  ```').blocks[1];
    const back = editorToDocument(doc(line({}, t('texte')), { type: 'codeBlock', attrs: { block } }));
    expect(serialize(back)).toBe('texte\n```\ncode\n```');
  });
});

describe('Changement minimal du texte de droite (S13)', () => {
  it('textes égaux : rien', () => {
    expect(textChange('abc', 'abc')).toBeNull();
  });

  it('seule la partie modifiée est remplacée', () => {
    expect(textChange('a bc d', 'a **bc** d')).toEqual({ from: 2, to: 4, insert: '**bc**' });
    expect(textChange('ab cd', 'ab xx cd')).toEqual({ from: 3, to: 3, insert: 'xx ' });
  });

  it('un émoji n\'est jamais coupé en deux', () => {
    const change = textChange('a😀', 'a😃')!;
    expect(change.from).toBe(1);
    expect(change.insert).toBe('😃');
  });
});
