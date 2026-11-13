// Étape 3 : blocs de structure (séries D, F, G, X, Z du cahier, docs/discord-rules.md §2.4, §3, §5, §10).
import { describe, expect, it } from 'vitest';
import { ZERO_WIDTH_SPACE as ZWSP } from '../../src/core/characters';
import {
  bulletItem,
  codeBlock,
  createDocument,
  heading,
  layoutLine,
  MAX_LIST_LEVEL,
  numberedItem,
  paragraph,
  quoted,
  raw,
  subtext,
  text,
  type Block,
  type DiscordDocument,
} from '../../src/core/document';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';

const doc = (...blocks: Block[]) => createDocument(...blocks);
const write = (...blocks: Block[]) => serialize(createDocument(...blocks));
const subtextItem = (level: number, content: string) =>
  layoutLine({ list: { kind: 'bullet', level }, style: 'subtext' }, text(content));

/** Le texte relu puis réécrit est identique (forme déjà écrite comme le ferait l'appli). */
function expectSameText(message: string): void {
  expect(serialize(parse(message))).toBe(message);
}

describe('Titres et sous-texte (D1, D2)', () => {
  it('D1_D2_ecriture', () => {
    expect(write(heading(1, text('a')), heading(2, text('b')), heading(3, text('c')), subtext(text('d'))))
      .toBe('# a\n## b\n### c\n-# d');
    expect(write(heading(1, text('a', ['bold']), text(' b')))).toBe('# **a** b');
  });

  it('D1_D2_lecture', () => {
    expect(parse('# a\n## b\n### c\n-# d')).toEqual(
      doc(heading(1, text('a')), heading(2, text('b')), heading(3, text('c')), subtext(text('d'))),
    );
    expect(parse('# **a** b')).toEqual(doc(heading(1, text('a', ['bold']), text(' b'))));
  });

  it('niveau 4 non pris en charge : conservé brut', () => {
    expect(parse('#### x')).toEqual(doc(paragraph(raw('#### '), text('x'))));
  });

  it('un titre ou un sous-texte vide ne se construit pas', () => {
    expect(() => heading(1)).toThrow();
    expect(() => subtext()).toThrow();
  });

  it('texte commençant par un marqueur : échappé après le marqueur', () => {
    expect(write(heading(1, text('# x')))).toBe('# \\# x');
    expect(write(bulletItem(1, text('- x')))).toBe('- \\- x');
  });
});

describe('Listes (D3, G1, G2, X6)', () => {
  it('puces sur plusieurs niveaux, 2 espaces par niveau', () => {
    const message = doc(bulletItem(1, text('a')), bulletItem(2, text('b')), bulletItem(3, text('c')), bulletItem(1, text('d')));
    expect(serialize(message)).toBe('- a\n  - b\n    - c\n- d');
    expect(parse('- a\n  - b\n    - c\n- d')).toEqual(message);
  });

  it('G1_numeros_successifs_reels', () => {
    const message = doc(numberedItem(1, 1, text('a')), numberedItem(1, null, text('b')), numberedItem(1, null, text('c')));
    expect(serialize(message)).toBe('1. a\n2. b\n3. c');
    expect(parse('1. a\n1. b\n1. c')).toEqual(message);
  });

  it('G2_le_premier_numero_donne_le_depart', () => {
    const message = doc(numberedItem(1, 3, text('a')), numberedItem(1, null, text('b')), numberedItem(1, null, text('c')));
    expect(parse('3. a\n7. b\n2. c')).toEqual(message);
    expect(serialize(message)).toBe('3. a\n4. b\n5. c');
  });

  it('numéro de départ par défaut : 1', () => {
    expect(write(numberedItem(1, null, text('a')))).toBe('1. a');
  });

  it('D3_un_niveau_prend_le_type_de_son_premier_element', () => {
    expect(() => doc(bulletItem(1, text('a')), numberedItem(1, null, text('b')))).toThrow();
    expect(parse('- a\n  - b\n1. c')).toEqual(
      doc(bulletItem(1, text('a')), bulletItem(2, text('b')), bulletItem(1, text('c'))),
    );
    expect(parse('1. a\n- b')).toEqual(doc(numberedItem(1, 1, text('a')), numberedItem(1, null, text('b'))));
  });

  it('un sous-niveau peut avoir un type différent de son parent', () => {
    const message = doc(bulletItem(1, text('a')), numberedItem(2, 1, text('b')), numberedItem(2, null, text('c')));
    expect(serialize(message)).toBe('- a\n  1. b\n  2. c');
    expect(parse('- a\n  1. b\n  2. c')).toEqual(message);
  });

  it('ligne vide au milieu d’une liste : la numérotation repart', () => {
    const message = doc(numberedItem(1, 1, text('a')), paragraph(), numberedItem(1, 1, text('b')));
    expect(serialize(message)).toBe('1. a\n\n1. b');
    expect(parse('1. a\n\n1. b')).toEqual(message);
  });

  it('A29_asterisque_espace_en_debut_de_ligne_est_une_puce', () => {
    expect(parse('* a*')).toEqual(doc(bulletItem(1, text('a*'))));
    expect(serialize(parse('* rouge\n* vert'))).toBe('- rouge\n- vert');
  });

  it('C13_un_nombre_suivi_de_point_espace_est_une_liste', () => {
    expect(parse('2020. une année')).toEqual(doc(numberedItem(1, 2020, text('une année'))));
  });

  it('X6_sous_texte_dans_une_puce', () => {
    expect(write(subtextItem(1, 'Note'))).toBe('- -# Note');
    expect(parse('- -# Note')).toEqual(doc(subtextItem(1, 'Note')));
  });

  it('D14_titre_dans_une_puce_impossible', () => {
    expect(() => layoutLine({ list: { kind: 'bullet', level: 1 }, style: 'heading1' }, text('x'))).toThrow();
    expect(parse('- # titre dans une puce')).toEqual(doc(bulletItem(1, raw('# '), text('titre dans une puce'))));
    expectSameText('- # titre dans une puce\n- > citation dans une puce');
  });

  it('11 niveaux au maximum ; le 12e reste brut', () => {
    expect(() => bulletItem(MAX_LIST_LEVEL + 1, text('x'))).toThrow();
    const lines = Array.from({ length: 12 }, (_, i) => `${'  '.repeat(i)}- n${i + 1}`);
    const message = parse(lines.join('\n'));
    expect(message.blocks[10]).toEqual(bulletItem(11, text('n11')));
    expect(message.blocks[11]).toEqual(paragraph(raw(`${'  '.repeat(11)}- `), text('n12')));
  });

  it('niveau sauté ou indentation impaire : refusé à l’écriture, brut à la lecture', () => {
    expect(() => doc(bulletItem(1, text('a')), bulletItem(3, text('b')))).toThrow();
    expect(() => doc(bulletItem(2, text('a')))).toThrow();
    expect(parse('- a\n    - b')).toEqual(doc(bulletItem(1, text('a')), paragraph(raw('    - '), text('b'))));
    expect(parse('- a\n - b')).toEqual(doc(bulletItem(1, text('a')), paragraph(raw(' - '), text('b'))));
  });

  it('seul le premier élément porte un numéro de départ', () => {
    expect(() => doc(numberedItem(1, 1, text('a')), numberedItem(1, 5, text('b')))).toThrow();
  });

  it('une puce vide ne se construit pas', () => {
    expect(() => bulletItem(1)).toThrow();
  });
});

describe('Citations (D4, D11, D12, G3, G4)', () => {
  it('D4_citation_sur_deux_lignes', () => {
    const message = doc(quoted(paragraph(text('a'))), quoted(paragraph(text('b'))));
    expect(serialize(message)).toBe('> a\n> b');
    expect(parse('> a\n> b')).toEqual(message);
  });

  it('G4_le_texte_qui_suit_sort_de_la_citation', () => {
    const message = doc(quoted(paragraph(text('a'))), paragraph(text('b')));
    expect(serialize(message)).toBe('> a\nb');
    expect(parse('> a\nb')).toEqual(message);
  });

  it('G3_chevron_seul_affiche_tel_quel', () => {
    expect(() => quoted(paragraph())).toThrow();
    expect(parse('> a\n>\n> b')).toEqual(
      doc(quoted(paragraph(text('a'))), paragraph(text('>')), quoted(paragraph(text('b')))),
    );
  });

  it('D11_liste_dans_une_citation', () => {
    const message = doc(
      quoted(bulletItem(1, text('puce 1'))),
      quoted(bulletItem(2, text('puce 2'))),
      quoted(bulletItem(1, text('puce 3'))),
    );
    expect(serialize(message)).toBe('> - puce 1\n>   - puce 2\n> - puce 3');
    expect(parse('> - puce 1\n>   - puce 2\n> - puce 3')).toEqual(message);
  });

  it('D12_titre_dans_une_citation', () => {
    const message = doc(quoted(heading(1, text('titre dans une citation'))), quoted(paragraph(text('texte'))));
    expect(serialize(message)).toBe('> # titre dans une citation\n> texte');
    expect(parse('> # titre dans une citation\n> texte')).toEqual(message);
  });

  it('>>> jamais généré : conservé brut', () => {
    expect(parse('>>> a')).toEqual(doc(paragraph(raw('>>> '), text('a'))));
  });

  it('sous-texte dans une citation (non testé) : refusé, brut à la lecture', () => {
    expect(() => quoted(subtext(text('x')))).toThrow();
    expect(parse('> -# x')).toEqual(doc(quoted(paragraph(raw('-# '), text('x')))));
  });

  it('entrer ou sortir d’une citation interrompt la liste', () => {
    expect(write(bulletItem(1, text('a')), quoted(numberedItem(1, null, text('b'))))).toBe('- a\n> 1. b');
  });
});

describe('Blocs de code (D7 à D10, F1 à F5, Z4)', () => {
  it('D7_D8_rien_n_est_interprete_ni_echappe', () => {
    expect(write(codeBlock('**a** _b_ \\ <@1> # c'))).toBe('```\n**a** _b_ \\ <@1> # c\n```');
    expect(write(codeBlock('const a = 1;', { language: 'js' }))).toBe('```js\nconst a = 1;\n```');
    expect(parse('```\n**a**\n```')).toEqual(doc(codeBlock('**a**')));
  });

  it('F1_F2_langage_libre_garde_tel_quel', () => {
    expect(parse('```zzzinconnu\ntexte du bloc\n```')).toEqual(doc(codeBlock('texte du bloc', { language: 'zzzinconnu' })));
    expect(parse('```JS\nconst a = 1;\n```')).toEqual(doc(codeBlock('const a = 1;', { language: 'JS' })));
    expect(() => codeBlock('x', { language: 'a b' })).toThrow();
  });

  it('F3_contenu_sur_la_ligne_d_ouverture_conserve_brut', () => {
    expectSameText('```texte sur la même ligne```\n```js console.log(1)```');
  });

  it('F4_lignes_vides_de_debut_et_de_fin_supprimees', () => {
    expect(codeBlock('\n\nligne au milieu\n\n').code).toBe('ligne au milieu');
    expect(parse('```\n\nligne au milieu\n\n```')).toEqual(doc(codeBlock('ligne au milieu')));
    expect(() => codeBlock('\n\n')).toThrow();
  });

  it('ligne vide au milieu d’un bloc : conservée', () => {
    expect(write(codeBlock('a\n\nb'))).toBe('```\na\n\nb\n```');
    expect(parse('```\na\n\nb\n```')).toEqual(doc(codeBlock('a\n\nb')));
  });

  it('F5_trois_accents_graves_dans_le_contenu_casse_le_bloc_conserve_brut', () => {
    // Le début reste brut ; les trois derniers accents graves sont lus comme du texte (et échappés).
    const message = parse('```\navant ``` après\n```');
    expect(message.blocks.some((block) => block.type === 'codeBlock')).toBe(false);
    expect(parse(serialize(message))).toEqual(message);
  });

  it('Z4_espace_invisible_apres_le_premier_accent_grave', () => {
    expect(write(codeBlock('avant ``` après'))).toBe(`\`\`\`\navant \`${ZWSP}\`\` après\n\`\`\``);
    expect(write(codeBlock('````'))).toBe(`\`\`\`\n\`${ZWSP}\`${ZWSP}\`\`\n\`\`\``);
    expect(parse(`\`\`\`\navant \`${ZWSP}\`\` après\n\`\`\``)).toEqual(doc(codeBlock('avant ``` après')));
  });

  it('D10_bloc_de_code_dans_une_citation', () => {
    const message = doc(quoted(paragraph(text('citation'))), codeBlock('bloc dans la citation', { quote: true }));
    const written = '> citation\n> ```\n> bloc dans la citation\n> ```';
    expect(serialize(message)).toBe(written);
    expect(parse(written)).toEqual(message);
  });

  it('D13_bloc_sous_une_puce_conserve_brut_en_attendant_la_regle', () => {
    expectSameText('- puce\n  ```\n  bloc dans une puce\n  ```\n- puce suivante');
  });

  it('un bloc de code vide ne se construit pas', () => {
    expect(() => codeBlock('')).toThrow();
  });
});

describe('Styles autour des blocs et sur plusieurs lignes (§2.4, X1, X2, X7, X10)', () => {
  it('X2_spoiler_autour_d_un_bloc_de_code', () => {
    const message = doc(
      paragraph(text(' ', ['spoiler']), text('On peut', ['spoiler', 'strike'])),
      codeBlock('x', { language: 'ansi', marks: ['spoiler'] }),
    );
    const written = '|| ~~On peut~~\n```ansi\nx\n```||';
    expect(serialize(message)).toBe(written);
    expect(parse(written)).toEqual(message);
  });

  it('spoiler collé à l’ouverture d’un bloc avec langage', () => {
    const message = doc(codeBlock('x', { language: 'js', marks: ['spoiler'] }));
    expect(serialize(message)).toBe('||```js\nx\n```||');
    expect(parse('||```js\nx\n```||')).toEqual(message);
  });

  it('style qui continue sur une ligne de titre', () => {
    const message = doc(paragraph(text('a', ['bold'])), heading(1, text('b', ['bold'])));
    expect(serialize(message)).toBe('**a\n# b**');
    expect(parse('**a\n# b**')).toEqual(message);
  });

  it('X7_barre_autour_de_puces', () => {
    const message = doc(bulletItem(1, text('a', ['strike'])), bulletItem(1, text('b', ['strike'])));
    expect(parse('~~- a\n- b~~')).toEqual(message);
    expect(serialize(message)).toBe('~~- a\n- b~~');
  });

  it('X10_barre_autour_d_une_citation_puis_du_texte', () => {
    const message = doc(
      paragraph(),
      quoted(paragraph(text('a', ['strike']))),
      quoted(paragraph(text('b', ['strike']))),
      paragraph(text('c', ['strike'])),
    );
    expect(serialize(message)).toBe('\n~~> a\n> b\nc~~');
    expect(parse('\n~~> a\n> b\nc~~')).toEqual(message);
  });

  it('style commencé au milieu d’une ligne citée : refermé en fin de ligne', () => {
    expect(write(quoted(paragraph(text('a '), text('b', ['bold']))), paragraph(text('c', ['bold']))))
      .toBe('> a **b**\n**c**');
  });

  it('style terminé au milieu d’une ligne citée : rouvert après le marqueur', () => {
    expect(write(paragraph(text('a', ['bold'])), quoted(paragraph(text('b', ['bold']), text(' c')))))
      .toBe('**a**\n> **b** c');
  });

  it('style sur une seule ligne : écrit après le marqueur', () => {
    expect(write(bulletItem(1, text('a', ['bold'])), bulletItem(1, text('b')))).toBe('- **a**\n- b');
  });
});

describe('Aller-retour des structures (S14)', () => {
  const DOCUMENTS: Record<string, DiscordDocument> = {
    titres: doc(heading(1, text('a', ['italic'])), heading(3, text('b')), subtext(text('c', ['underline']))),
    listes: doc(
      numberedItem(1, 4, text('a')), bulletItem(2, text('b', ['bold'])), bulletItem(2, text('c')),
      numberedItem(1, null, text('d')), paragraph(), bulletItem(1, text('e')), subtextItem(1, 'f'),
    ),
    citations: doc(
      quoted(heading(2, text('t'))), quoted(bulletItem(1, text('a'))), quoted(bulletItem(2, text('b'))),
      codeBlock('x\ny', { quote: true, language: 'py' }), paragraph(text('fin')),
    ),
    blocs: doc(codeBlock('a ``` b\n\nc', { marks: ['strike', 'spoiler'] }), codeBlock('d')),
    styles_entre_lignes: doc(
      paragraph(text('a', ['underline'])), quoted(paragraph(text('b', ['underline']))),
      bulletItem(1, text('c', ['bold'])), heading(1, text('d', ['bold'])),
    ),
  };

  for (const [name, message] of Object.entries(DOCUMENTS)) {
    it(`${name}_se_relit_a_l_identique`, () => {
      expect(parse(serialize(message))).toEqual(message);
    });
  }
});
