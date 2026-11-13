// Étape 2 : lecture du texte Discord (séries A, B, C, X, Z du cahier, docs/discord-rules.md §1, §2.3, §4, §5, §11).
import { describe, expect, it } from 'vitest';
import { ZERO_WIDTH_SPACE as ZWSP } from '../../src/core/characters';
import {
  bulletItem,
  code,
  codeBlock,
  createDocument,
  heading,
  layoutLine,
  mention,
  numberedItem,
  paragraph,
  quoted,
  raw,
  text,
  timestamp,
  type DiscordDocument,
  type Mark,
} from '../../src/core/document';
import { mentionSyntax, timestampSyntax } from '../../src/core/elements';
import { parse } from '../../src/core/parse';

/** Raccourci : document d'une seule ligne. */
function line(...content: Parameters<typeof paragraph>): DiscordDocument {
  return createDocument(paragraph(...content));
}

/** Ce que Discord affiche, sans les styles. */
function visible(message: DiscordDocument): string {
  return message.blocks
    .map((block) =>
      block.type === 'codeBlock'
        ? block.code
        : block.content
            .map((node) => {
              if (node.type === 'mention') return mentionSyntax(node);
              if (node.type === 'timestamp') return timestampSyntax(node);
              return node.type === 'text' ? node.text : node.type === 'code' ? node.code : node.raw;
            })
            .join(''),
    )
    .join('\n');
}

/** Styles du morceau qui contient ce texte. */
function marksOf(message: DiscordDocument, fragment: string): readonly Mark[] | undefined {
  for (const block of message.blocks) {
    if (block.type === 'codeBlock') continue;
    for (const node of block.content) {
      if (node.type === 'text' && node.text.includes(fragment)) return node.marks;
    }
  }
  return undefined;
}

describe('Styles simples (§1)', () => {
  it('gras, italique, souligné, barré, spoiler, code en ligne', () => {
    expect(parse('**x**')).toEqual(line(text('x', ['bold'])));
    expect(parse('*x*')).toEqual(line(text('x', ['italic'])));
    expect(parse('_x_')).toEqual(line(text('x', ['italic'])));
    expect(parse('__x__')).toEqual(line(text('x', ['underline'])));
    expect(parse('~~x~~')).toEqual(line(text('x', ['strike'])));
    expect(parse('||x||')).toEqual(line(text('x', ['spoiler'])));
    expect(parse('`a *b* c`')).toEqual(line(code('a *b* c')));
  });

  it('message vide et lignes vides conservées', () => {
    expect(parse('')).toEqual(createDocument());
    expect(parse('a\n\nb')).toEqual(
      createDocument(paragraph(text('a')), paragraph(), paragraph(text('b'))),
    );
  });
});

describe('Combinaisons et styles imbriqués (§1)', () => {
  it('A8_styles_cumules', () => {
    expect(parse('a) ***texte***\nb) __***texte***__\nc) ||~~__***texte***__~~||')).toEqual(
      createDocument(
        paragraph(text('a) '), text('texte', ['bold', 'italic'])),
        paragraph(text('b) '), text('texte', ['underline', 'bold', 'italic'])),
        paragraph(text('c) '), text('texte', ['spoiler', 'strike', 'underline', 'bold', 'italic'])),
      ),
    );
  });

  it('A9_A10_italique_a_l_interieur_du_gras', () => {
    expect(parse('**a *b***')).toEqual(line(text('a ', ['bold']), text('b', ['bold', 'italic'])));
    expect(parse('***a* b**')).toEqual(line(text('a', ['bold', 'italic']), text(' b', ['bold'])));
  });

  it('A11_italique_tiret_bas_dans_le_gras', () => {
    expect(parse('**a _b_**')).toEqual(line(text('a ', ['bold']), text('b', ['bold', 'italic'])));
  });

  it('A12_A13_gras_a_l_interieur_de_l_italique', () => {
    expect(parse('*a **b***')).toEqual(line(text('a ', ['italic']), text('b', ['italic', 'bold'])));
    expect(parse('***a** b*')).toEqual(line(text('a', ['italic', 'bold']), text(' b', ['italic'])));
  });

  it('A14_A15_code_en_ligne_dans_un_gras_ou_un_spoiler', () => {
    expect(parse('**x `code` y**')).toEqual(
      line(text('x ', ['bold']), code('code', ['bold']), text(' y', ['bold'])),
    );
    expect(parse('||`code`||')).toEqual(line(code('code', ['spoiler'])));
  });

  it('A16_code_en_ligne_contenant_un_accent_grave', () => {
    expect(parse('``a`b``')).toEqual(line(code('a`b')));
  });

  it('X5_gras_et_souligne_qui_se_chevauchent', () => {
    const message = parse('**Hello W**__**o**rl**d**__**!**');
    expect(visible(message)).toBe('Hello World!');
    expect(message).toEqual(
      line(
        text('Hello W', ['bold']),
        text('o', ['underline', 'bold']),
        text('rl', ['underline']),
        text('d', ['underline', 'bold']),
        text('!', ['bold']),
      ),
    );
  });

  it('X8_styles_autour_du_code_en_ligne_et_balises_dans_le_code', () => {
    expect(parse('*`a`*')).toEqual(line(code('a', ['italic'])));
    expect(parse('~~`a`~~')).toEqual(line(code('a', ['strike'])));
    expect(parse('__`a`__')).toEqual(line(code('a', ['underline'])));
    expect(parse('`x ~~a~~ ou *b*`')).toEqual(line(code('x ~~a~~ ou *b*')));
  });
});

describe('Collisions lues comme Discord (§2.3)', () => {
  it('A1_gras_puis_italique_colles_casse', () => {
    const message = parse('**1***2*');
    expect(visible(message)).toBe('1*2*');
    expect(marksOf(message, '1')).toEqual(['bold']);
    expect(marksOf(message, '2')).toEqual([]);
  });

  it('A2_gras_puis_italique_tiret_bas', () => {
    expect(parse('**1**_2_')).toEqual(line(text('1', ['bold']), text('2', ['italic'])));
  });

  it('A3_italique_puis_gras_colles_casse', () => {
    const message = parse('*1***2**');
    expect(visible(message)).toBe('1**2**');
    expect(marksOf(message, '1')).toEqual(['italic']);
    expect(marksOf(message, '2')).toEqual([]);
  });

  it('A4_italique_tiret_bas_puis_gras', () => {
    expect(parse('_1_**2**')).toEqual(line(text('1', ['italic']), text('2', ['bold'])));
  });

  it('A5_souligne_puis_italique_tiret_bas_casse', () => {
    const message = parse('__1___2_');
    expect(visible(message)).toBe('1_2_');
    expect(marksOf(message, '1')).toEqual(['underline']);
    expect(marksOf(message, '2')).toEqual([]);
  });

  it('A6_A7_sans_collision', () => {
    expect(parse('__1__*2*')).toEqual(line(text('1', ['underline']), text('2', ['italic'])));
    expect(parse('**1** *2*')).toEqual(line(text('1', ['bold']), text(' '), text('2', ['italic'])));
  });

  it('Z1_Z2_Z3_l_espace_invisible_entre_deux_styles_est_retire', () => {
    expect(parse(`**1**${ZWSP}*2*`)).toEqual(line(text('1', ['bold']), text('2', ['italic'])));
    const expected = line(text('1', ['underline']), text('2', ['italic']), text('3', ['bold']));
    expect(parse(`__1__*2*${ZWSP}**3**`)).toEqual(expected);
    expect(parse(`__1__${ZWSP}*2*${ZWSP}**3**`)).toEqual(expected);
  });

  it('un espace invisible au milieu d’un texte est conservé', () => {
    expect(parse(`a${ZWSP}b`)).toEqual(line(text(`a${ZWSP}b`)));
  });
});

describe('Délimiteurs et mots (§1)', () => {
  it('B1_tiret_bas_dans_un_mot_litteral', () => {
    expect(parse('le fichier mon_fichier_final.txt est prêt')).toEqual(
      line(text('le fichier mon_fichier_final.txt est prêt')),
    );
  });

  it('B2_souligne_dans_init', () => {
    expect(parse('snake_case_name et __init__.py')).toEqual(
      line(text('snake_case_name et '), text('init', ['underline']), text('.py')),
    );
  });

  it('A30_tiret_bas_d_ouverture_colle_a_une_lettre', () => {
    expect(parse('suite_mot_ fin')).toEqual(
      line(text('suite'), text('mot', ['italic']), text(' fin')),
    );
  });

  it('A32_tiret_bas_de_fermeture_colle_a_une_lettre_litteral', () => {
    expect(parse('_mot_suite')).toEqual(line(text('_mot_suite')));
  });

  it('A31_quatre_asterisques_donnent_deux_asterisques_en_italique', () => {
    expect(parse('a **** b')).toEqual(line(text('a '), text('**', ['italic']), text(' b')));
  });

  it('C3_asterisque_dans_un_mot', () => {
    expect(parse('a*b*c')).toEqual(line(text('a'), text('b', ['italic']), text('c')));
  });

  it('C4_tiret_bas_dans_un_mot', () => {
    expect(parse('a_b_c')).toEqual(line(text('a_b_c')));
  });

  it('A23_A26_styles_au_milieu_d_un_mot', () => {
    expect(parse('a__b__c')).toEqual(line(text('a'), text('b', ['underline']), text('c')));
    expect(parse('a**b**c')).toEqual(line(text('a'), text('b', ['bold']), text('c')));
    expect(parse('a~~b~~c')).toEqual(line(text('a'), text('b', ['strike']), text('c')));
    expect(parse('a||b||c')).toEqual(line(text('a'), text('b', ['spoiler']), text('c')));
  });
});

describe('Espaces au bord d’un style (§1)', () => {
  it('A18_espace_avant_fermeture_d_italique_perdu', () => {
    const message = parse('*a *b');
    expect(visible(message)).toBe('ab');
    expect(message).toEqual(line(text('a', ['italic']), text('b')));
  });

  it('A19_A22_espace_avant_fermeture_conserve', () => {
    expect(parse('**a **b')).toEqual(line(text('a ', ['bold']), text('b')));
    expect(parse('__a __b')).toEqual(line(text('a ', ['underline']), text('b')));
    expect(parse('~~a ~~b')).toEqual(line(text('a ', ['strike']), text('b')));
    expect(parse('||a ||b')).toEqual(line(text('a ', ['spoiler']), text('b')));
  });

  it('A28_espace_apres_ouverture_d_un_gras', () => {
    expect(parse('** a**')).toEqual(line(text(' a', ['bold'])));
  });

  // A29 : remplacé à l'étape 3 par le test de même nom dans structure.test.ts (vraie puce).
});

describe('Styles sur plusieurs lignes (§1)', () => {
  it('A17_le_gras_couvre_deux_lignes', () => {
    expect(parse('**a\nb**')).toEqual(
      createDocument(paragraph(text('a', ['bold'])), paragraph(text('b', ['bold']))),
    );
  });

  it('A27_le_gras_traverse_une_ligne_vide', () => {
    expect(parse('**a\n\nb**')).toEqual(
      createDocument(paragraph(text('a', ['bold'])), paragraph(), paragraph(text('b', ['bold']))),
    );
  });

  it('C18_deux_tildes_sur_deux_lignes_forment_un_barre', () => {
    expect(parse('a ~~ b\nc ~~ d')).toEqual(
      createDocument(
        paragraph(text('a '), text(' b', ['strike'])),
        paragraph(text('c ', ['strike']), text(' d')),
      ),
    );
  });
});

describe('Échappement relu (§11)', () => {
  it('C1_C2_asterisques_litteraux_et_echappes', () => {
    expect(parse('2 * 3 * 4')).toEqual(line(text('2 * 3 * 4')));
    expect(parse('2 \\* 3 \\* 4')).toEqual(line(text('2 * 3 * 4')));
  });

  it('C5_tiret_bas_echappe', () => {
    expect(parse('a\\_b\\_c')).toEqual(line(text('a_b_c')));
  });

  it('C6_C10_symboles_seuls_litteraux', () => {
    expect(parse('a ~ b ~ c')).toEqual(line(text('a ~ b ~ c')));
    expect(parse('a ~~ b')).toEqual(line(text('a ~~ b')));
    expect(parse('a | b | c')).toEqual(line(text('a | b | c')));
    expect(parse('a || b')).toEqual(line(text('a || b')));
    expect(parse('a ` b')).toEqual(line(text('a ` b')));
  });

  it('C20_quatre_barres_litterales', () => {
    expect(parse('a |||| b')).toEqual(line(text('a |||| b')));
  });

  it('C11_C14_debuts_de_ligne_echappes_ou_non', () => {
    expect(parse('#sans-espace\n\\# pas un titre\n\\## pas un titre non plus')).toEqual(
      createDocument(
        paragraph(text('#sans-espace')),
        paragraph(text('# pas un titre')),
        paragraph(text('## pas un titre non plus')),
      ),
    );
    expect(parse('-sans espace\n\\- pas une puce\n\\-# pas un sous-texte')).toEqual(
      createDocument(
        paragraph(text('-sans espace')),
        paragraph(text('- pas une puce')),
        paragraph(text('-# pas un sous-texte')),
      ),
    );
    expect(parse('1.sans espace\n1\\. pas une liste\n2020. une année')).toEqual(
      createDocument(
        paragraph(text('1.sans espace')),
        paragraph(text('1. pas une liste')),
        numberedItem(1, 2020, text('une année')), // étape 3 : vraie liste (C13)
      ),
    );
    expect(parse('>sans espace\n\\> pas une citation')).toEqual(
      createDocument(paragraph(text('>sans espace')), paragraph(text('> pas une citation'))),
    );
  });

  // Étape 5 : la mention de rôle est désormais lue comme une mention (accord de l'utilisateur).
  it('C15_chevrons_et_mention', () => {
    expect(parse('a < b > c\n<texte>\n<@&123>\n\\<@&123>')).toEqual(
      createDocument(
        paragraph(text('a < b > c')),
        paragraph(text('<texte>')),
        paragraph(mention('role', '123')),
        paragraph(text('<@&123>')),
      ),
    );
  });

  it('C16_lien_masque_brut_et_crochet_echappe', () => {
    expect(parse('[a](https://exemple.com)\n\\[a](https://exemple.com)')).toEqual(
      createDocument(
        paragraph(raw('[a](https://exemple.com)')),
        paragraph(text('[a]('), raw('https://exemple.com'), text(')')),
      ),
    );
  });

  it('C17_antislash', () => {
    expect(parse('antislash : \\a et \\\\ et \\_')).toEqual(
      line(text('antislash : \\a et \\ et _')),
    );
  });

  it('C19_antislash_devant_d_autres_symboles_disparait', () => {
    expect(parse('\\! \\: \\é \\( \\)')).toEqual(line(text('! : é ( )')));
  });
});

describe('Adresses (§4)', () => {
  it('C21_symboles_d_une_adresse_non_interpretes', () => {
    expect(parse('https://exemple.com/_a_')).toEqual(line(raw('https://exemple.com/_a_')));
  });

  it('C22_gras_autour_d_une_adresse', () => {
    expect(parse('**https://exemple.com**')).toEqual(line(raw('https://exemple.com', ['bold'])));
  });

  it('la ponctuation finale ne fait pas partie de l’adresse', () => {
    expect(parse('voir https://exemple.com.')).toEqual(
      line(text('voir '), raw('https://exemple.com'), text('.')),
    );
  });
});

describe('Syntaxe non reconnue conservée en brut (S12)', () => {
  // Étape 3 : titres, puces, citations et blocs de code sont désormais lus en structure.
  it('titres, puces, citations, marqueurs enchaînés (X6)', () => {
    expect(parse('# Titre\n- puce\n> citation\n- -# Note')).toEqual(
      createDocument(
        heading(1, text('Titre')),
        bulletItem(1, text('puce')),
        quoted(paragraph(text('citation'))),
        layoutLine({ list: { kind: 'bullet', level: 1 }, style: 'subtext' }, text('Note')),
      ),
    );
  });

  it('X7_puces_dans_un_barre', () => {
    expect(parse('~~- a\n- b~~')).toEqual(
      createDocument(bulletItem(1, text('a', ['strike'])), bulletItem(1, text('b', ['strike']))),
    );
  });

  it('bloc de code : rien n’y est interprété', () => {
    expect(parse('```\n**a**\n```')).toEqual(createDocument(codeBlock('**a**')));
  });

  // Étape 5 : mention et horodatage lus ; l'émoji personnalisé reste brut (accord de l'utilisateur).
  it('mentions, émojis, horodatages conservés', () => {
    expect(parse('<@123> <:ok:456> <t:1735689600:F> :star:')).toEqual(
      line(mention('user', '123'), text(' '), raw('<:ok:456>'), text(' '), timestamp(1735689600, 'F'), text(' :star:')),
    );
  });

  it('A33_code_en_ligne_sur_deux_lignes_conserve_brut', () => {
    // Discord en fait un seul code (A33) ; le document ne sait pas encore le représenter.
    expect(parse('`a\nb`')).toEqual(createDocument(paragraph(raw('`a')), paragraph(raw('b`'))));
  });

  it('code en ligne de forme non testée conservé brut', () => {
    expect(parse('`` a ``')).toEqual(line(raw('`` a ``')));
  });
});
