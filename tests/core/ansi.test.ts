// Étape 4 : couleurs ANSI (série E du cahier, X2, X3, docs/discord-rules.md §5, §6).
import { describe, expect, it } from 'vitest';
import { ESC, ZERO_WIDTH_SPACE as ZWSP } from '../../src/core/characters';
import {
  ansiBlock,
  ansiText,
  codeBlock,
  colorBlock,
  createDocument,
  paragraph,
  quoted,
  text,
  type Block,
  type CodeBlock,
} from '../../src/core/document';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';

const doc = (...blocks: Block[]) => createDocument(...blocks);
const write = (...blocks: Block[]) => serialize(createDocument(...blocks));
/** Balise ANSI : `sgr('1;31')` donne `<ESC>[1;31m`. */
const sgr = (codes: string) => `${ESC}[${codes}m`;
const RESET = sgr('0');
const ansi = (...lines: string[]) => ['```ansi', ...lines, '```'].join('\n');

/** Le seul bloc de code du message lu. */
function readBlock(message: string): CodeBlock {
  const blocks = parse(message).blocks.filter((block) => block.type === 'codeBlock');
  expect(blocks).toHaveLength(1);
  return blocks[0] as CodeBlock;
}

/** Le message écrit se relit en ce même document. */
function expectWrittenAndRead(blocks: Block[], written: string): void {
  expect(write(...blocks)).toBe(written);
  expect(parse(written)).toEqual(doc(...blocks));
}

describe('Écriture des couleurs (E1 à E8)', () => {
  it('E1_huit_couleurs_de_texte', () => {
    const codes = [30, 31, 32, 33, 34, 35, 36, 37];
    const segments = codes.flatMap((color, i) => [
      ansiText(`${color} couleur`, { color }),
      ...(i < codes.length - 1 ? [ansiText('\n')] : []),
    ]);
    expectWrittenAndRead(
      [ansiBlock(segments)],
      ansi(...codes.map((color) => `${sgr(String(color))}${color} couleur${RESET}`)),
    );
  });

  it('E2_huit_couleurs_de_fond', () => {
    const codes = [40, 41, 42, 43, 44, 45, 46, 47];
    const segments = codes.flatMap((background, i) => [
      ansiText(`${background} fond`, { background }),
      ...(i < codes.length - 1 ? [ansiText('\n')] : []),
    ]);
    expectWrittenAndRead(
      [ansiBlock(segments)],
      ansi(...codes.map((background) => `${sgr(String(background))}${background} fond${RESET}`)),
    );
  });

  it('E3_E7_styles_gras_souligne_italique_dans_une_seule_balise', () => {
    expectWrittenAndRead(
      [ansiBlock([
        ansiText('gras', { bold: true }), ansiText('\n'),
        ansiText('souligné', { underline: true }), ansiText('\n'),
        ansiText('italique', { italic: true }), ansiText('\n'),
        ansiText('les trois', { bold: true, italic: true, underline: true }),
      ])],
      ansi(
        `${sgr('1')}gras${RESET}`,
        `${sgr('4')}souligné${RESET}`,
        `${sgr('3')}italique${RESET}`,
        `${sgr('1;3;4')}les trois${RESET}`,
      ),
    );
  });

  it('E13_E15_barre_ansi_code_9_ecrit_apres_les_autres_styles', () => {
    expectWrittenAndRead(
      [ansiBlock([
        ansiText('barré', { strike: true }), ansiText('\n'),
        ansiText('tout', { bold: true, italic: true, underline: true, strike: true, background: 45, color: 31 }),
      ])],
      ansi(`${sgr('9')}barré${RESET}`, `${sgr('1;3;4;9;45;31')}tout${RESET}`),
    );
  });

  it('E15_barre_ansi_lu_dans_n_importe_quel_ordre', () => {
    const block = readBlock(ansi(`${sgr('31;9')}a${RESET}`));
    expect(block).toEqual(ansiBlock([ansiText('a', { color: 31, strike: true })]));
  });

  it('E5_ordre_styles_fond_texte', () => {
    const block = ansiBlock([
      ansiText("ordre de l'appli", { bold: true, underline: true, background: 45, color: 37 }),
    ]);
    expectWrittenAndRead([block], ansi(`${sgr('1;4;45;37')}ordre de l'appli${RESET}`));
  });

  it('E6_passage_sur_plusieurs_lignes_un_seul_reset', () => {
    expectWrittenAndRead(
      [ansiBlock([ansiText('ligne 1\nligne 2', { color: 31 }), ansiText('\nligne 3')])],
      ansi(`${sgr('31')}ligne 1`, `ligne 2${RESET}`, 'ligne 3'),
    );
  });

  it('E8_le_markdown_reste_du_texte_dans_un_bloc_ansi', () => {
    expectWrittenAndRead(
      [ansiBlock([ansiText('**gras** *italique* __souligné__', { color: 31 })])],
      ansi(`${sgr('31')}**gras** *italique* __souligné__${RESET}`),
    );
  });

  it('deux_passages_differents_reset_puis_nouveau_code', () => {
    expectWrittenAndRead(
      [ansiBlock([ansiText('a', { color: 31 }), ansiText('b', { color: 34 }), ansiText(' c')])],
      ansi(`${sgr('31')}a${RESET}${sgr('34')}b${RESET} c`),
    );
  });

  it('X2_spoiler_autour_d_un_bloc_ansi', () => {
    expectWrittenAndRead(
      [ansiBlock([ansiText('a', { color: 31 })], { marks: ['spoiler'] })],
      `||${ansi(`${sgr('31')}a${RESET}`)}||`,
    );
  });

  it('F4_Z4_lignes_vides_du_bord_retirees_et_accents_graves_proteges', () => {
    const block = ansiBlock([ansiText('\n'), ansiText('a ``` b', { color: 31 }), ansiText('\n\n')]);
    expect(block.code).toBe('a ``` b');
    expectWrittenAndRead([block], ansi(`${sgr('31')}a \`${ZWSP}\`\` b${RESET}`));
  });
});

describe('Couleurs au choix 38;2;R;G;B (X3, décision de l’auteur)', () => {
  it('X3_couleur_au_choix_ecrite_en_dernier', () => {
    const block = ansiBlock([
      ansiText('doré', { bold: true, background: 45, color: { r: 255, g: 218, b: 6 } }),
    ]);
    expectWrittenAndRead([block], ansi(`${sgr('1;45;38;2;255;218;6')}doré${RESET}`));
  });

  it('X3_composantes_hors_de_0_a_255_refusees', () => {
    expect(() => ansiText('x', { color: { r: 256, g: 0, b: 0 } })).toThrow();
    expect(() => ansiText('x', { color: { r: 1.5, g: 0, b: 0 } })).toThrow();
  });
});

describe('Le modèle refuse ce que Discord ne rend pas (§5, §6)', () => {
  it('couleur_impossible_dans_un_bloc_avec_langage', () => {
    expect(() => colorBlock(codeBlock('x', { language: 'js' }), [ansiText('x', { color: 31 })])).toThrow();
  });

  it('bloc_sans_langage_colore_devient_ansi', () => {
    const block = colorBlock(codeBlock('x', { marks: ['bold'] }), [ansiText('x', { color: 31 })]);
    expect(block.language).toBe('ansi');
    expect(block.marks).toEqual(['bold']);
    expect(write(block)).toBe(`**${ansi(`${sgr('31')}x${RESET}`)}**`);
  });

  it('codes_hors_liste_refuses', () => {
    expect(() => ansiText('x', { color: 38 })).toThrow();
    expect(() => ansiText('x', { color: 91 })).toThrow();
    expect(() => ansiText('x', { background: 48 })).toThrow();
    expect(() => ansiText('x', { background: 31 })).toThrow();
  });

  it('le_caractere_ESC_ne_peut_pas_etre_ecrit_dans_le_texte', () => {
    expect(() => ansiText(`a${ESC}[31mb`)).toThrow();
  });

  it('E14c_bloc_ansi_dans_une_citation', () => {
    expectWrittenAndRead(
      [quoted(ansiBlock([ansiText('rouge ligne 1\nrouge ligne 2', { color: 31 })]))],
      `> \`\`\`ansi\n> ${sgr('31')}rouge ligne 1\n> rouge ligne 2${RESET}\n> \`\`\``,
    );
  });

  it('E14a_fond_au_choix_ecrit_a_la_place_du_fond', () => {
    const block = ansiBlock([
      ansiText('violet', { bold: true, background: { r: 120, g: 40, b: 160 }, color: 37 }),
    ]);
    expectWrittenAndRead([block], ansi(`${sgr('1;48;2;120;40;160;37')}violet${RESET}`));
    expect(() => ansiText('x', { background: { r: 0, g: 300, b: 0 } })).toThrow();
  });

  it('D9_bloc_ansi_sans_couleur_est_un_bloc_normal', () => {
    const block = ansiBlock([ansiText('contenu')]);
    expect(block).toEqual(codeBlock('contenu', { language: 'ansi' }));
    expect(write(block)).toBe(ansi('contenu'));
  });
});

describe('Lecture des blocs ansi collés (E3, E4, E6, E9 à E13, X3, S11, S12)', () => {
  it('E3_balises_separees_lues_comme_une_seule', () => {
    const message = ansi(`${sgr('1')}${sgr('4')}gras et souligné${RESET}`);
    expect(readBlock(message)).toEqual(ansiBlock([ansiText('gras et souligné', { bold: true, underline: true })]));
    expect(serialize(parse(message))).toBe(ansi(`${sgr('1;4')}gras et souligné${RESET}`));
  });

  it('E4_ordre_des_codes_libre', () => {
    expect(readBlock(ansi(`${sgr('31;1')}a${RESET}`))).toEqual(readBlock(ansi(`${sgr('1;31')}a${RESET}`)));
    expect(serialize(parse(ansi(`${sgr('37;45')}a${RESET}`)))).toBe(ansi(`${sgr('45;37')}a${RESET}`));
  });

  it('E6_la_couleur_continue_jusqu_au_reset', () => {
    const message = ansi(`${sgr('31')}ligne 1 rouge sans reset`, 'ligne 2 sans aucun code', `${RESET}ligne 3 après reset`);
    expect(readBlock(message)).toEqual(ansiBlock([
      ansiText('ligne 1 rouge sans reset\nligne 2 sans aucun code', { color: 31 }),
      ansiText('\nligne 3 après reset'),
    ]));
  });

  it('E12_reset_0_et_0_31_et_reset_vide_sans_effet', () => {
    const message = ansi(
      `${sgr('31')}rouge${RESET} normal`,
      `${sgr('31')}rouge${sgr('')} normal (reset vide)`,
      `${sgr('0;31')}rouge (0;31)${RESET} normal`,
    );
    expect(readBlock(message)).toEqual(ansiBlock([
      ansiText('rouge', { color: 31 }),
      ansiText(' normal\n'),
      ansiText('rouge normal (reset vide)\nrouge (0;31)', { color: 31 }),
      ansiText(' normal'),
    ]));
  });

  it('E9_E10_codes_dans_un_bloc_sans_langage_ou_js_conserves_tels_quels', () => {
    for (const language of ['', 'js']) {
      const message = ['```' + language, `${sgr('31')}rouge${RESET}`, '```'].join('\n');
      expect(readBlock(message)).toEqual(codeBlock(`${sgr('31')}rouge${RESET}`, { language }));
      expect(serialize(parse(message))).toBe(message);
    }
  });

  it('E11_codes_hors_bloc_conserves_tels_quels', () => {
    const message = `${sgr('31')}rouge hors bloc${RESET}`;
    expect(parse(message).blocks.every((block) => block.type === 'paragraph')).toBe(true);
    expect(serialize(parse(message))).toBe(message);
  });

  it('E13_codes_sans_effet_2_et_7_ignores', () => {
    const message = ansi(`${sgr('7')}code 7${RESET}`, `${sgr('2')}code 2${RESET}`);
    expect(readBlock(message)).toEqual(codeBlock('code 7\ncode 2', { language: 'ansi' }));
  });

  it('E13_codes_non_testes_bloc_entier_conserve_tel_quel', () => {
    // `48;2;R;G;B` retiré de cette liste : testé depuis (E14a). `9` retiré : barré confirmé (E15).
    // `91` et `38;5;196` sont appliqués par Discord (E15) mais non utilisés par l'appli (§6).
    for (const codes of ['91', '38;5;196', '1;95', '48;5;1', '01', '1;;4']) {
      const message = ansi(`${sgr('31')}a${RESET}`, `${sgr(codes)}code ${codes}${RESET}`);
      const block = readBlock(message);
      expect(block.segments).toBeNull();
      expect(block.code).toBe(`${sgr('31')}a${RESET}\n${sgr(codes)}code ${codes}${RESET}`);
      expect(serialize(parse(message))).toBe(message);
    }
  });

  it('X3_code_2_sans_effet_et_couleur_au_choix', () => {
    const message = ansi(`${sgr('2;1;2')}Volaldur :${RESET} ${sgr('38;2;255;218;6')}Apprenti${RESET}`);
    expect(readBlock(message)).toEqual(ansiBlock([
      ansiText('Volaldur :', { bold: true }),
      ansiText(' '),
      ansiText('Apprenti', { color: { r: 255, g: 218, b: 6 } }),
    ]));
    expect(serialize(parse(message))).toBe(ansi(`${sgr('1')}Volaldur :${RESET} ${sgr('38;2;255;218;6')}Apprenti${RESET}`));
  });

  it('E14a_X3_un_0_dans_une_balise_efface_les_balises_precedentes', () => {
    const message = ansi(
      `${sgr('31;0')}ligne 1 : 31;0${RESET}`,
      `${sgr('1;31')}gras rouge ${sgr('3;0')}suite après 3;0${RESET}`,
      `${sgr('48;2;120;40;160')}fond au choix violet (48;2)${RESET}`,
    );
    expect(readBlock(message)).toEqual(ansiBlock([
      ansiText('ligne 1 : 31;0', { color: 31 }), ansiText('\n'),
      ansiText('gras rouge ', { bold: true, color: 31 }),
      ansiText('suite après 3;0', { italic: true }), ansiText('\n'),
      ansiText('fond au choix violet (48;2)', { background: { r: 120, g: 40, b: 160 } }),
    ]));
    expect(serialize(parse(message))).toBe(ansi(
      `${sgr('31')}ligne 1 : 31;0${RESET}`,
      `${sgr('1;31')}gras rouge ${RESET}${sgr('3')}suite après 3;0${RESET}`,
      `${sgr('48;2;120;40;160')}fond au choix violet (48;2)${RESET}`,
    ));
  });

  it('ESC_isole_bloc_conserve_tel_quel', () => {
    const message = ansi(`${ESC}pas une balise ${sgr('31')}a${RESET}`);
    expect(readBlock(message).segments).toBeNull();
    expect(serialize(parse(message))).toBe(message);
  });

  it('E14b_langage_ANSI_en_majuscules_lu_en_couleurs', () => {
    const message = ['```ANSI', `${sgr('31')}rouge${RESET}`, '```'].join('\n');
    expect(readBlock(message)).toEqual(ansiBlock([ansiText('rouge', { color: 31 })]));
    expect(serialize(parse(message))).toBe(ansi(`${sgr('31')}rouge${RESET}`));
    expect(colorBlock(codeBlock('x', { language: 'Ansi' }), [ansiText('x', { color: 31 })]).language).toBe('ansi');
  });

  it('E14c_bloc_ansi_cite_lu_en_couleurs', () => {
    const message = ['> ```ansi', `> ${sgr('31')}rouge ligne 1`, `> rouge ligne 2${RESET}`, '> ```'].join('\n');
    expect(readBlock(message)).toEqual(quoted(ansiBlock([ansiText('rouge ligne 1\nrouge ligne 2', { color: 31 })])));
    expect(serialize(parse(message))).toBe(message);
  });

  it('exemple_cellule_des_huit_lu_en_couleurs', () => {
    const message = ansi(`${sgr('2;1;2')}Falcarion :${RESET} ${sgr('3;0')}Ancre son identité${RESET}, Enquête`);
    expect(readBlock(message)).toEqual(ansiBlock([
      ansiText('Falcarion :', { bold: true }), ansiText(' '),
      ansiText('Ancre son identité', { italic: true }), ansiText(', Enquête'),
    ]));
  });

  it('couleur_ouverte_sur_une_ligne_vide_du_bord_bloc_conserve_tel_quel', () => {
    const message = ansi(`${sgr('31')}`, 'a');
    expect(readBlock(message).segments).toBeNull();
    expect(serialize(parse(message))).toBe(message);
  });

  it('S11_exemple_couleurs_lu_en_couleurs', () => {
    const message = [
      '|| ~~On peut aussi faire comme ça :~~',
      '```ansi',
      `${sgr('35;4')}35 couleur${RESET}`,
      `${sgr('36;1;47')}36 couleur${RESET}`,
      `${sgr('37;3')}37 couleur${RESET}`,
      '```||',
    ].join('\n');
    const block = readBlock(message);
    expect(block.marks).toEqual(['spoiler']);
    expect(block.segments).toEqual(ansiBlock([
      ansiText('35 couleur', { underline: true, color: 35 }), ansiText('\n'),
      ansiText('36 couleur', { bold: true, background: 47, color: 36 }), ansiText('\n'),
      ansiText('37 couleur', { italic: true, color: 37 }),
    ]).segments);
  });

  it('aller_retour_stable_d_un_bloc_ansi_mixte', () => {
    const message = ansi(`a ${sgr('1;31')}b`, `c${RESET} d ${sgr('45')}e${RESET}`);
    const first = parse(message);
    expect(parse(serialize(first))).toEqual(first);
    expect(serialize(createDocument(paragraph(text('x')), ...first.blocks))).toContain(sgr('1;31'));
  });
});
