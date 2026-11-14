// Étape 2 : aller-retour (S14) et conservation de tout le texte (S12, S15).
import { describe, expect, it } from 'vitest';
import {
  code,
  createDocument,
  paragraph,
  raw,
  text,
  type Block,
  type DiscordDocument,
} from '../../src/core/document';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';

const line = (...content: Parameters<typeof paragraph>) => createDocument(paragraph(...content));

/** Documents de l'étape 1 (écriture), qui doivent se relire à l'identique. */
const DOCUMENTS: Record<string, DiscordDocument> = {
  styles_simples: line(
    text('g', ['bold']), text(' '), text('i', ['italic']), text(' '), text('s', ['underline']),
    text(' '), text('b', ['strike']), text(' '), text('sp', ['spoiler']),
  ),
  A8: createDocument(
    paragraph(text('a) '), text('texte', ['bold', 'italic'])),
    paragraph(text('b) '), text('texte', ['underline', 'bold', 'italic'])),
    paragraph(text('c) '), text('texte', ['spoiler', 'strike', 'underline', 'bold', 'italic'])),
  ),
  A9: line(text('a ', ['bold']), text('b', ['bold', 'italic'])),
  A10: line(text('a', ['bold', 'italic']), text(' b', ['bold'])),
  A12: line(text('a ', ['italic']), text('b', ['italic', 'bold'])),
  A13: line(text('a', ['italic', 'bold']), text(' b', ['italic'])),
  A14: line(text('x ', ['bold']), code('code', ['bold']), text(' y', ['bold'])),
  A15: line(code('code', ['spoiler'])),
  A16: line(code('a`b')),
  A1_A2: line(text('1', ['bold']), text('2', ['italic'])),
  A3_A4: line(text('1', ['italic']), text('2', ['bold'])),
  A5_A6: line(text('1', ['underline']), text('2', ['italic'])),
  Z1: line(text('1', ['bold']), text('2', ['italic']), text('b')),
  Z1_mot: line(text('a'), text('b', ['bold']), text('c', ['italic']), text('d')),
  Z2: line(text('1', ['underline']), text('2', ['italic']), text('3', ['bold'])),
  chevauchement: line(text('a', ['bold']), text('b', ['bold', 'italic']), text('c', ['italic'])),
  A17: createDocument(paragraph(text('x '), text('a', ['bold'])), paragraph(text('b', ['bold']), text(' y'))),
  A27: createDocument(paragraph(text('a', ['bold'])), paragraph(), paragraph(text('b', ['bold']))),
  A27_styles_differents: createDocument(
    paragraph(text('a', ['bold'])), paragraph(), paragraph(text('b', ['underline'])),
  ),
  debut_de_ligne_dans_un_style: createDocument(
    paragraph(text('a', ['bold'])), paragraph(text('# b', ['bold'])),
  ),
  A34_debut_de_ligne_derriere_une_balise: createDocument(
    paragraph(text('# x', ['bold'])), paragraph(text('- a', ['strike'])),
  ),
  A19_A22: line(text('a ', ['bold']), text('b'), text('c ', ['strike']), text('d')),
  A23_A26: line(text('a'), text('b', ['underline']), text('c'), text('d', ['spoiler']), text('e')),
  X8: line(
    code('a', ['italic']), text(' '), code('b', ['strike']), text(' '), code('c', ['underline']),
    text(' '), code('d', ['spoiler', 'strike', 'underline', 'bold', 'italic']),
  ),
  echappements: createDocument(
    paragraph(text('a*b*c a_b_c __init__ 2 * 3 * 4')),
    paragraph(text('# pas un titre')),
    paragraph(text('- pas une puce')),
    paragraph(text('2020. une année')),
    paragraph(text('> pas une citation')),
    paragraph(text('<@&123> [a](b) \\ ~~ || `')),
  ),
  X4_italique_et_deux_points: createDocument(
    paragraph(text('Membres :', ['italic'])),
    paragraph(text('Note:'), text('b', ['italic'])),
  ),
  italique_de_symboles_A31: line(text('a '), text('**', ['italic']), text(' b')),
  // Étape 3 : `# ` et `- ` sont désormais de la structure ; `>>> ` et `#### ` restent bruts.
  brut: createDocument(
    paragraph(raw('>>> '), text('Titre', ['bold'])),
    // Étape 5 : `<@123>` est désormais une mention ; l'émoji personnalisé reste brut.
    paragraph(raw('#### '), text('puce '), raw('<:ok:456>')),
  ),
};

describe('Aller-retour document → texte → document (S14)', () => {
  for (const [name, message] of Object.entries(DOCUMENTS)) {
    it(`${name}_se_relit_a_l_identique`, () => {
      expect(parse(serialize(message))).toEqual(message);
    });
  }

  it('A18_espaces_au_bord_de_l_italique_sortis_de_l_italique', () => {
    // L'espace en italique est invisible : il ressort hors de l'italique (convention §1).
    const message = line(text(' a ', ['italic']), text('b'));
    expect(parse(serialize(message))).toEqual(line(text(' '), text('a', ['italic']), text(' b')));
  });
});

/** Lire, écrire, puis relire redonne le même document : le rendu est stable. */
/** Lignes vides du début et de la fin retirées : Discord ne les affiche pas (J5). */
function withoutEdgeBlankLines(message: DiscordDocument): DiscordDocument {
  const blocks = [...message.blocks];
  const blank = (b: Block | undefined) => b?.type === 'paragraph' && !b.quote && b.content.length === 0;
  while (blank(blocks[0])) blocks.shift();
  while (blank(blocks.at(-1))) blocks.pop();
  return { blocks };
}

function expectStable(message: string): void {
  const first = parse(message);
  expect(parse(serialize(first))).toEqual(withoutEdgeBlankLines(first));
}

describe('Aller-retour texte → document → texte (S14)', () => {
  const MESSAGES = [
    '**1***2*', '*1***2**', '__1___2_', '**1**_2_', '_1_**2**', '__1__*2*', '**1** *2*',
    '***a** b*', '*a **b***', '**a _b_**', '*a *b', '* a*', '** a**',
    'suite_mot_ fin', 'a **** b', 'a |||| b', '\\! \\: \\é \\( \\)',
    'snake_case_name et __init__.py', 'a ~~ b\nc ~~ d', '**a\n\nb**',
    'antislash : \\a et \\\\ et \\_', 'a < b > c\n<texte>\n<@&123>\n\\<@&123>',
    '[a](https://exemple.com)\n\\[a](https://exemple.com)\n<https://exemple.com>',
    '**https://exemple.com** https://exemple.com/_a_', '`a\nb`', '```\n**a**\n```',
    '#sans-espace\n\\# pas un titre\n1\\. pas une liste\n2020. une année',
  ];
  for (const message of MESSAGES) {
    it(`stable : ${JSON.stringify(message)}`, () => expectStable(message));
  }
});

describe('Messages réels de examples/ (S12, S15)', () => {
  // Chargement des fichiers par Vite (pas de dépendance supplémentaire).
  const files = import.meta.glob<string>('../../examples/*.txt', {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  it('le dossier contient des exemples', () => {
    expect(Object.keys(files).length).toBeGreaterThan(0);
  });

  for (const [file, content] of Object.entries(files)) {
    it(`${file} : relu sans perte, aller-retour stable`, () => {
      expectStable(content.replace(/\r\n/g, '\n'));
    });
  }
});
