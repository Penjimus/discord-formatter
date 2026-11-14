// Étape 6 : compatibilité, grisage des options et validation (docs/discord-rules.md §10, série D, G11, E13).
import { describe, expect, it } from 'vitest';
import {
  ansiBlock,
  ansiText,
  bulletItem,
  code,
  codeBlock,
  createDocument,
  heading,
  layoutLine,
  MAX_LIST_LEVEL,
  mention,
  numberedItem,
  paragraph,
  quoted,
  subtext,
  text,
  timestamp,
  type Block,
  type DiscordDocument,
} from '../../src/core/document';
import { toolbarState, type Position, type ToolbarOption } from '../../src/core/compatibility';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { validate } from '../../src/core/validate';

const doc = (...blocks: Block[]) => createDocument(...blocks);

/** Options actives à la position donnée. */
function enabledAt(message: DiscordDocument, position: Position): ToolbarOption[] {
  const state = toolbarState(message, position);
  return (Object.keys(state) as ToolbarOption[]).filter((option) => state[option].enabled);
}

function expectEnabled(message: DiscordDocument, position: Position, options: ToolbarOption[]) {
  const enabled = enabledAt(message, position);
  for (const option of options) expect(enabled, option).toContain(option);
}

function expectGreyed(message: DiscordDocument, position: Position, options: ToolbarOption[]) {
  const state = toolbarState(message, position);
  for (const option of options) {
    expect(state[option].enabled, option).toBe(false);
    // Chaque option grisée dit pourquoi.
    expect(state[option].reason, option).toBeTruthy();
  }
}

const TEXT_STYLES: ToolbarOption[] = ['bold', 'italic', 'underline', 'strike', 'spoiler'];
const ANSI_OPTIONS: ToolbarOption[] = ['ansiColor', 'ansiBackground', 'ansiBold', 'ansiItalic', 'ansiUnderline', 'ansiStrike'];
const ELEMENTS: ToolbarOption[] = ['mention', 'timestamp', 'emoji'];
const LAYOUT: ToolbarOption[] = ['heading1', 'heading2', 'heading3', 'subtext', 'bulletList', 'orderedList'];

describe('Matrice §10 : contenants de texte', () => {
  it('texte normal : styles, spoiler, code en ligne et éléments permis ; pas d\'ANSI', () => {
    const message = doc(paragraph(text('a')));
    expectEnabled(message, { block: 0 }, [...TEXT_STYLES, 'inlineCode', ...ELEMENTS, ...LAYOUT, 'quote', 'codeBlock', 'blankLine']);
    expectGreyed(message, { block: 0 }, [...ANSI_OPTIONS, 'codeLanguage', 'indent', 'outdent']);
  });

  it('D1_titre : styles, spoiler, horodatage, mention permis ; pas de bloc de code ni d\'ANSI', () => {
    const message = doc(heading(1, text('a')));
    expectEnabled(message, { block: 0 }, [...TEXT_STYLES, 'inlineCode', ...ELEMENTS, 'heading2', 'heading1', 'quote']);
    expectGreyed(message, { block: 0 }, ['codeBlock', ...ANSI_OPTIONS]);
  });

  it('D2_sous_texte : styles et éléments permis ; pas de bloc de code ni d\'ANSI', () => {
    const message = doc(subtext(text('a')));
    expectEnabled(message, { block: 0 }, [...TEXT_STYLES, 'inlineCode', ...ELEMENTS]);
    expectGreyed(message, { block: 0 }, ['codeBlock', ...ANSI_OPTIONS]);
  });

  it('D3_liste : styles et éléments permis ; pas d\'ANSI', () => {
    const message = doc(bulletItem(1, text('a')));
    expectEnabled(message, { block: 0 }, [...TEXT_STYLES, 'inlineCode', ...ELEMENTS, 'quote']);
    expectGreyed(message, { block: 0 }, ANSI_OPTIONS);
  });

  it('D3_type_du_premier : une nouvelle puce à la suite d\'une liste numérotée est impossible', () => {
    const message = doc(numberedItem(1, 1, text('a')), paragraph(text('b')));
    expectGreyed(message, { block: 1 }, ['bulletList']);
    expectEnabled(message, { block: 1 }, ['orderedList']);
  });

  it('D3_type_du_premier : changer le type d\'un élément change toute sa sous-liste', () => {
    const message = doc(bulletItem(1, text('a')), bulletItem(1, text('b')));
    expectEnabled(message, { block: 1 }, ['orderedList']);
  });

  it('D4_citation : styles, éléments, titre (D12), liste (D11), bloc de code (D10) permis', () => {
    const message = doc(quoted(paragraph(text('a'))));
    expectEnabled(message, { block: 0 }, [...TEXT_STYLES, 'inlineCode', ...ELEMENTS, 'heading1', 'bulletList', 'codeBlock', 'quote']);
    expectGreyed(message, { block: 0 }, ANSI_OPTIONS);
  });

  it('G29_sous_texte_dans_une_citation_permis', () => {
    expectEnabled(doc(quoted(paragraph(text('a')))), { block: 0 }, ['subtext']);
    expectEnabled(doc(subtext(text('a'))), { block: 0 }, ['quote']);
  });

  it('G3_citation : pas de ligne vide dans une citation', () => {
    expectGreyed(doc(quoted(paragraph(text('a')))), { block: 0 }, ['blankLine']);
  });

  it('D5_spoiler : styles et éléments permis à l\'intérieur ; spoiler actif (pour le retirer)', () => {
    const message = doc(paragraph(text('a', ['spoiler'])));
    expectEnabled(message, { block: 0 }, [...TEXT_STYLES, 'inlineCode', ...ELEMENTS]);
  });

  it('D15_titre_puce_citation_dans_un_spoiler : permis', () => {
    const message = doc(
      heading(1, text('titre', ['spoiler'])),
      bulletItem(1, text('puce', ['spoiler'])),
      quoted(paragraph(text('citation', ['spoiler']))),
    );
    expectEnabled(message, { block: 0 }, ['heading1', 'heading2']);
    expectEnabled(message, { block: 1 }, ['bulletList']);
    expectEnabled(message, { block: 2 }, ['quote', 'heading1']);
  });

  it('D14_titre_dans_une_puce : grisé ; sous-texte dans une puce permis (X6)', () => {
    const message = doc(bulletItem(1, text('a')));
    expectGreyed(message, { block: 0 }, ['heading1', 'heading2', 'heading3']);
    expectEnabled(message, { block: 0 }, ['subtext']);
    // Inversement, un titre ne devient pas une puce.
    expectGreyed(doc(heading(2, text('a'))), { block: 0 }, ['bulletList', 'orderedList']);
  });

  it('M7_H3 : mention et horodatage permis dans un titre et un sous-texte', () => {
    expectEnabled(doc(heading(1, mention('user'))), { block: 0 }, ['mention', 'timestamp']);
    expectEnabled(doc(subtext(timestamp(1735689600, 'f', ['bold']))), { block: 0 }, ['mention', 'timestamp', 'bold']);
  });

  it('ligne vide : les mises en page restent proposées (le contenu viendra ensuite)', () => {
    const message = doc(paragraph(text('a')), paragraph());
    expectEnabled(message, { block: 1 }, ['heading1', 'subtext', 'bulletList', 'quote']);
  });

  it('document vide : traité comme une ligne vide', () => {
    expectEnabled(doc(), { block: 0 }, [...TEXT_STYLES, 'heading1', 'bulletList', 'codeBlock']);
  });
});

describe('Matrice §10 : code', () => {
  it('D6_code_en_ligne : ni mention, ni horodatage, ni bloc ; styles autour du code permis (X8) ; émoji permis (D15)', () => {
    const message = doc(paragraph(code('x')));
    const position = { block: 0, inInlineCode: true };
    expectGreyed(message, position, ['mention', 'timestamp', 'codeBlock', ...ANSI_OPTIONS]);
    expectEnabled(message, position, [...TEXT_STYLES, 'inlineCode', 'emoji']);
  });

  it('D7_bloc_sans_langage : rien d\'interprété ; couleur permise (le bloc devient ansi), langage modifiable', () => {
    const message = doc(codeBlock('x'));
    expectGreyed(message, { block: 0 }, [...TEXT_STYLES, 'inlineCode', 'mention', 'timestamp', ...LAYOUT, 'codeBlock', 'indent']);
    expectEnabled(message, { block: 0 }, [...ANSI_OPTIONS, 'codeLanguage', 'emoji', 'quote', 'blankLine']);
  });

  it('D8_bloc_avec_langage : rien d\'interprété, pas de couleur', () => {
    const message = doc(codeBlock('x', { language: 'js' }));
    expectGreyed(message, { block: 0 }, [...TEXT_STYLES, 'mention', 'timestamp', ...ANSI_OPTIONS]);
    expectEnabled(message, { block: 0 }, ['codeLanguage', 'emoji']);
  });

  it('D9_bloc_ansi_sans_couleur : couleur permise', () => {
    expectEnabled(doc(codeBlock('x', { language: 'ansi' })), { block: 0 }, ANSI_OPTIONS);
    expectEnabled(doc(codeBlock('x', { language: 'ANSI' })), { block: 0 }, ANSI_OPTIONS);
  });

  it('S7_bloc_ansi_colore : seules les options ANSI, barré compris (E15) ; langage figé', () => {
    const message = doc(ansiBlock([ansiText('x', { color: 31 })]));
    expectEnabled(message, { block: 0 }, ANSI_OPTIONS);
    expectGreyed(message, { block: 0 }, ['codeLanguage', ...TEXT_STYLES, 'inlineCode', 'mention', 'timestamp', ...LAYOUT]);
  });

  it('D10_E14c : un bloc de code, coloré ou non, peut être cité', () => {
    expectEnabled(doc(codeBlock('x')), { block: 0 }, ['quote']);
    expectEnabled(doc(ansiBlock([ansiText('x', { color: 31 })])), { block: 0 }, ['quote']);
  });

  it('bloc cité : pas de ligne vide (non testé)', () => {
    expectGreyed(doc(quoted(codeBlock('x'))), { block: 0 }, ['blankLine']);
  });
});

describe('Imbrications de contenants (§10)', () => {
  it('D13_G9_G10 : bloc de code permis sous une puce de niveau 1', () => {
    expectEnabled(doc(bulletItem(1, text('a'))), { block: 0 }, ['codeBlock']);
  });

  it('bloc de code sous une sous-puce : permis (généralisé, décision de l\'auteur)', () => {
    expectEnabled(doc(bulletItem(1, text('a')), bulletItem(2, text('b'))), { block: 1 }, ['codeBlock']);
  });

  it('bloc de code sous un élément numéroté ou dans une liste citée : non testé, grisé', () => {
    expectGreyed(doc(numberedItem(1, 1, text('a'))), { block: 0 }, ['codeBlock']);
    expectGreyed(doc(quoted(bulletItem(1, text('a')))), { block: 0 }, ['codeBlock']);
  });

  it('G11 : pas de ligne vide dans un bloc placé sous une puce ; ce bloc ne peut pas être cité', () => {
    const message = doc(bulletItem(1, text('a')), codeBlock('x', { inBullet: true }));
    expectGreyed(message, { block: 1 }, ['blankLine', 'quote']);
    expectEnabled(message, { block: 1 }, ['codeLanguage', ...ANSI_OPTIONS]);
  });

  it('G10_E14d : bloc sous une puce avec langage ou coloré : permis', () => {
    expect(validate(doc(bulletItem(1, text('a')), codeBlock('x', { inBullet: true, language: 'js' })))).toEqual([]);
    expect(validate(doc(bulletItem(1, text('a')), ansiBlock([ansiText('x', { color: 31 })], { inBullet: true })))).toEqual([]);
  });

  it('D11 : une puce peut être citée (liste dans une citation)', () => {
    expectEnabled(doc(bulletItem(1, text('a'))), { block: 0 }, ['quote']);
  });

  it('niveaux de liste : pas de niveau sauté, 11 niveaux au plus', () => {
    expectGreyed(doc(bulletItem(1, text('a'))), { block: 0 }, ['indent']);
    expectEnabled(doc(bulletItem(1, text('a')), bulletItem(1, text('b'))), { block: 1 }, ['indent']);
    const deep = Array.from({ length: MAX_LIST_LEVEL }, (_, i) => bulletItem(i + 1, text(`n${i + 1}`)));
    const message = doc(...deep, bulletItem(MAX_LIST_LEVEL, text('dernier')));
    expectGreyed(message, { block: MAX_LIST_LEVEL }, ['indent']);
    expectEnabled(message, { block: MAX_LIST_LEVEL }, ['outdent']);
    expectGreyed(doc(bulletItem(1, text('a'))), { block: 0 }, ['outdent']);
  });

  it('niveaux de liste : un élément emmène ses sous-éléments', () => {
    const message = doc(bulletItem(1, text('a')), bulletItem(1, text('b')), bulletItem(2, text('c')));
    expectEnabled(message, { block: 1 }, ['indent']);
  });
});

describe('validate : document invalide détecté', () => {
  it('un document construit par l\'appli est valide', () => {
    const message = doc(
      heading(1, text('titre', ['spoiler'])),
      bulletItem(1, text('puce'), mention('role')),
      codeBlock('x', { inBullet: true }),
      quoted(paragraph(timestamp(0, 'R'))),
      ansiBlock([ansiText('rouge', { color: 31, bold: true })]),
    );
    expect(validate(message)).toEqual([]);
  });

  it('D14 : titre dans une puce détecté', () => {
    const bullet = bulletItem(1, text('a'));
    const problems = validate({ blocks: [{ ...bullet, style: 'heading1' }] });
    expect(problems).toHaveLength(1);
    expect(problems[0].block).toBe(0);
  });

  it('D3 : types mélangés à un même niveau détectés', () => {
    const second = { ...bulletItem(1, text('b')), list: { kind: 'ordered' as const, level: 1, start: null } };
    expect(validate({ blocks: [bulletItem(1, text('a')), second] })).not.toEqual([]);
  });

  it('G11 : ligne vide dans un bloc sous une puce détectée', () => {
    const block = { ...codeBlock('x', { inBullet: true }), code: 'x\n\ny' };
    expect(validate({ blocks: [bulletItem(1, text('a')), block] })).not.toEqual([]);
  });

  it('D13 : bloc « sous une puce » sans puce au-dessus détecté', () => {
    const block = codeBlock('x', { inBullet: true });
    expect(validate({ blocks: [paragraph(text('a')), block] })).not.toEqual([]);
    expect(validate({ blocks: [numberedItem(1, 1, text('a')), block] })).not.toEqual([]);
    expect(validate({ blocks: [bulletItem(1, text('a')), bulletItem(2, text('b')), block] })).toEqual([]);
  });

  it('niveau + d\'une puce suivie de son bloc : le bloc suit la puce', () => {
    const message = doc(bulletItem(1, text('a')), bulletItem(1, text('b')), codeBlock('x', { inBullet: true }), bulletItem(2, text('c')));
    expectEnabled(message, { block: 1 }, ['indent']);
  });

  it('§5 : bloc coloré avec un autre langage détecté', () => {
    const colored = ansiBlock([ansiText('x', { color: 31 })]);
    expect(validate({ blocks: [{ ...colored, language: 'js' }] })).not.toEqual([]);
  });

  it('niveau de liste sauté ou au-delà de 11 détecté', () => {
    const tooDeep = { ...bulletItem(1, text('a')), list: { kind: 'bullet' as const, level: MAX_LIST_LEVEL + 1, start: null } };
    expect(validate({ blocks: [tooDeep] })).not.toEqual([]);
    expect(validate({ blocks: [bulletItem(2, text('a'))] })).not.toEqual([]);
  });

  it('H2 : horodatage non entier ou négatif détecté ; saut de ligne dans un texte détecté', () => {
    const line = paragraph(timestamp(1));
    expect(validate({ blocks: [{ ...line, content: [{ ...timestamp(1), seconds: -5 }] }] })).not.toEqual([]);
    expect(validate({ blocks: [{ ...line, content: [{ ...text('a'), text: 'a\nb' }] }] })).not.toEqual([]);
  });

  it('citation vide détectée', () => {
    const line = quoted(paragraph(text('a')));
    expect(validate({ blocks: [{ ...line, content: [] }] })).not.toEqual([]);
  });

  it('construction impossible : les constructeurs refusent ce que validate détecte', () => {
    expect(() => layoutLine({ list: { kind: 'bullet', level: 1 }, style: 'heading1' }, text('a'))).toThrow();
    expect(() => doc(paragraph(text('a')), codeBlock('x', { inBullet: true }))).toThrow();
    expect(() => codeBlock('x\n\ny', { inBullet: true })).toThrow();
  });
});

describe('D15 : spoiler sur titre, puce et citation ; émoji dans du code', () => {
  const t6 = '||# titre\n- puce\n> citation||\n`⭐` et :star:\n```\n⭐ dans un bloc\n```';

  it('D15_ecriture : le document donne le message testé', () => {
    const message = doc(
      heading(1, text('titre', ['spoiler'])),
      bulletItem(1, text('puce', ['spoiler'])),
      quoted(paragraph(text('citation', ['spoiler']))),
      paragraph(code('⭐'), text(' et')),
      codeBlock('⭐ dans un bloc'),
    );
    expect(serialize(message)).toBe('||# titre\n- puce\n> citation||\n`⭐` et\n```\n⭐ dans un bloc\n```');
  });

  it('D15_lecture : relu en titre, puce et citation sous spoiler, réécrit à l\'identique', () => {
    const message = parse(t6);
    expect(message.blocks.slice(0, 3).map((block) => block.type === 'paragraph' && [block.style, block.list?.kind ?? null, block.quote]))
      .toEqual([['heading1', null, false], ['normal', 'bullet', false], ['normal', null, true]]);
    expect(validate(message)).toEqual([]);
    expect(serialize(message)).toBe(t6);
  });
});

describe('validate : messages réels de examples/ (S15)', () => {
  const files = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true });
  for (const [file, content] of Object.entries(files)) {
    it(`${file} : document lu valide`, () => {
      expect(validate(parse(content.replace(/\r\n/g, '\n')))).toEqual([]);
    });
  }
});
