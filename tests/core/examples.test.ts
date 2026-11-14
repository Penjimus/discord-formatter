// Étape 12 : rendu attendu des messages réels de examples/ (S15), d'après les fichiers NOM.md.
// Chaque test reprend une ligne du fichier .md : ce que Discord affiche, traduit en document.
import { describe, expect, it } from 'vitest';
import type { Block, CodeBlock, DiscordDocument, Paragraph } from '../../src/core/document';
import { parse } from '../../src/core/parse';

const files = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true });

function read(name: string): DiscordDocument {
  const content = files[`../../examples/${name}.txt`];
  if (content === undefined) throw new Error(`Exemple introuvable : ${name}`);
  return parse(content.replace(/\r\n/g, '\n'));
}

function paragraphAt(document: DiscordDocument, index: number): Paragraph {
  const block: Block | undefined = document.blocks[index];
  if (block?.type !== 'paragraph') throw new Error(`Le bloc ${index} n'est pas une ligne`);
  return block;
}

function codeBlockAt(document: DiscordDocument, index: number): CodeBlock {
  const block: Block | undefined = document.blocks[index];
  if (block?.type !== 'codeBlock') throw new Error(`Le bloc ${index} n'est pas un bloc de code`);
  return block;
}

const PLAIN = { bold: false, italic: false, underline: false, strike: false, background: null, color: null };
const bullet = { kind: 'bullet', level: 1, start: null };

describe('examples/hello_world (X5)', () => {
  it('ligne 1 : gras et souligné qui se chevauchent', () => {
    expect(paragraphAt(read('hello_world'), 0).content).toMatchObject([
      { type: 'text', text: 'Hello W', marks: ['bold'] },
      { type: 'text', text: 'o', marks: expect.arrayContaining(['bold', 'underline']) },
      { type: 'text', text: 'rl', marks: ['underline'] },
      { type: 'text', text: 'd', marks: expect.arrayContaining(['bold', 'underline']) },
      { type: 'text', text: '!', marks: ['bold'] },
    ]);
  });
});

describe('examples/ODJ2 (X6)', () => {
  const document = read('ODJ2');
  it('4 lignes', () => expect(document.blocks).toHaveLength(4));
  it('ligne 1 : titre', () => {
    expect(paragraphAt(document, 0)).toMatchObject({ style: 'heading1', list: null });
  });
  it('lignes 2 et 3 : éléments de liste', () => {
    for (const index of [1, 2]) {
      expect(paragraphAt(document, index)).toMatchObject({ style: 'normal', list: bullet });
    }
  });
  it('ligne 4 : dernier élément, en sous-texte, « -# » invisible', () => {
    expect(paragraphAt(document, 3)).toMatchObject({
      style: 'subtext',
      list: bullet,
      content: [{ type: 'text', text: "Note : merci d'arriver à l'heure", marks: [] }],
    });
  });
});

describe('examples/ODJ (X7)', () => {
  const document = read('ODJ');
  it('4 lignes', () => expect(document.blocks).toHaveLength(4));
  it('ligne 1 : titre', () => {
    expect(paragraphAt(document, 0)).toMatchObject({ style: 'heading1', list: null });
  });
  it('lignes 2 et 3 : éléments de liste barrés', () => {
    for (const index of [1, 2]) {
      const line = paragraphAt(document, index);
      expect(line).toMatchObject({ style: 'normal', list: bullet });
      expect(line.content.every((node) => node.marks.includes('strike'))).toBe(true);
    }
  });
  it('ligne 4 : dernier élément, « -# » visible, sous-texte non appliqué', () => {
    const line = paragraphAt(document, 3);
    expect(line).toMatchObject({ style: 'normal', list: bullet });
    const visible = line.content.map((node) => (node.type === 'text' ? node.text : node.type === 'raw' ? node.raw : '')).join('');
    expect(visible).toBe("-# Note : merci d'arriver à l'heure");
  });
});

describe('examples/citation (X1)', () => {
  const document = read('citation');
  it('ligne 1 : ouverture du barré seule, rien d\'affiché', () => {
    expect(paragraphAt(document, 0)).toMatchObject({ quote: false, list: null, content: [] });
  });
  it('lignes 2 et 3 : citation barrée', () => {
    for (const index of [1, 2]) {
      const line = paragraphAt(document, index);
      expect(line.quote).toBe(true);
      expect(line.content).toMatchObject([{ type: 'text', marks: ['strike'] }]);
    }
  });
  it('ligne 4 : horodatage « F », barré, hors citation', () => {
    expect(paragraphAt(document, 3)).toMatchObject({
      quote: false,
      content: [
        { type: 'text', text: 'Date limite : ', marks: ['strike'] },
        { type: 'timestamp', seconds: 1735689600, style: 'F', marks: ['strike'] },
      ],
    });
  });
});

describe('examples/classic_format_complement (X8)', () => {
  const document = read('classic_format_complement');
  it('ligne 1 : code en ligne en italique', () => {
    expect(paragraphAt(document, 0).content).toMatchObject([{ type: 'code', marks: ['italic'] }]);
  });
  it('ligne 2 : code en ligne barré', () => {
    expect(paragraphAt(document, 1).content).toMatchObject([{ type: 'code', marks: ['strike'] }]);
  });
  it('ligne 3 : balises visibles dans le code, non appliquées', () => {
    expect(paragraphAt(document, 2).content).toMatchObject([
      { type: 'code', code: "Là par contre, ~~Ce n'est absolument pas barré~~ ou en *italique*", marks: [] },
    ]);
  });
  it('ligne 4 : code en ligne sous spoiler', () => {
    expect(paragraphAt(document, 3).content).toMatchObject([{ type: 'code', marks: ['spoiler'] }]);
  });
});

describe('examples/couleurs (X2)', () => {
  const document = read('couleurs');
  it('ligne 1 : « couleurs » en gras', () => {
    expect(paragraphAt(document, 0).content).toMatchObject([
      { type: 'text', marks: [] },
      { type: 'text', text: 'couleurs', marks: ['bold'] },
      { type: 'text', marks: [] },
    ]);
  });
  it('lignes 2, 6, 8 et 9 : vides', () => {
    for (const index of [1, 5, 7, 8]) expect(paragraphAt(document, index).content).toEqual([]);
  });
  it('lignes 3 à 5 : liste de 3 éléments', () => {
    for (const index of [2, 3, 4]) expect(paragraphAt(document, index).list).toEqual(bullet);
  });
  it('ligne 7 : « :star: préférées » en italique, les deux :star: gardés (émoji dans Discord)', () => {
    expect(paragraphAt(document, 6).content).toMatchObject([
      { type: 'text', text: 'Sont mes ', marks: [] },
      { type: 'raw', raw: ':star:', marks: ['italic'] },
      { type: 'text', text: ' préférées', marks: ['italic'] },
      { type: 'raw', raw: ':star:', marks: [] },
      { type: 'text', text: ' ', marks: [] },
    ]);
  });
  it('ligne 10 : sous spoiler, la ligne complète est barrée', () => {
    const line = paragraphAt(document, 9);
    expect(line.content.every((node) => node.marks.includes('spoiler'))).toBe(true);
    expect(line.content.filter((node) => node.type === 'text' && node.text.trim() !== '')).toMatchObject([
      { text: 'On peut aussi faire comme ça :', marks: expect.arrayContaining(['strike']) },
    ]);
  });
  it('lignes 11 à 20 : bloc ansi sous spoiler, couleurs 30 à 37 et styles', () => {
    const block = codeBlockAt(document, 10);
    expect(block).toMatchObject({ language: 'ansi', marks: ['spoiler'] });
    const colored = (block.segments ?? []).filter((segment) => segment.text !== '\n');
    expect(colored).toEqual([30, 31, 32, 33, 34, 35, 36, 37].map((color) => ({
      text: `${color} couleur`,
      style: {
        ...PLAIN,
        color,
        underline: color === 35,
        bold: color === 36,
        background: color === 36 ? 47 : null,
        italic: color === 37,
      },
    })));
  });
  it('rien après le bloc', () => expect(document.blocks).toHaveLength(11));
});

describe('examples/cellule_des_huit (X3)', () => {
  const document = read('cellule_des_huit');
  it('ligne 1 : « Membres de la cellule » en italique', () => {
    expect(paragraphAt(document, 0).content).toMatchObject([
      { type: 'text', text: 'Membres de la cellule :', marks: ['italic'] },
    ]);
  });
  it('lignes 2 à 7 : bloc ansi, noms en gras, grades en jaune, identité en italique', () => {
    const block = codeBlockAt(document, 1);
    expect(block.language).toBe('ansi');
    const segments = block.segments ?? [];
    const styleOf = (part: string) => segments.find((segment) => segment.text === part)?.style;
    for (const name of ['Volaldur Thaoreus :', 'Falcarion Thaoreus :', "Lorindolo D'Automnia :", 'Aelion Vanyarel :']) {
      expect(styleOf(name)).toEqual({ ...PLAIN, bold: true });
    }
    expect(styleOf('Apprenti-Justiciar')?.color).toEqual({ r: 255, g: 218, b: 6 });
    expect(styleOf('Agent')?.color).toEqual({ r: 191, g: 163, b: 0 });
    expect(styleOf('Ancre son identité civile à Blancherive')).toEqual({ ...PLAIN, italic: true });
    expect(styleOf('Ancre son identité civile à Vendeaume')).toEqual({ ...PLAIN, italic: true });
  });
});

describe('examples/cellule_des_huit_malforme (X4)', () => {
  const document = read('cellule_des_huit_malforme');
  it('ligne 1 : « *Membres de la cellule » puis l\'émoticône :* (😗 dans Discord), sans italique', () => {
    expect(paragraphAt(document, 0).content).toMatchObject([
      { type: 'text', text: '*Membres de la cellule ', marks: [] },
      { type: 'raw', raw: ':*', marks: [] },
    ]);
  });
  it('lignes 2 à 7 : même bloc ansi que le message bien formé', () => {
    expect(document.blocks[1]).toEqual(read('cellule_des_huit').blocks[1]);
  });
});
