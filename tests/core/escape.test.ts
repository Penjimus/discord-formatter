// Étape 1 : échappement du texte ordinaire (séries B et C du cahier, docs/discord-rules.md §11).
import { describe, expect, it } from 'vitest';
import { code, createDocument, paragraph, text } from '../../src/core/document';
import { serialize } from '../../src/core/serialize';

/** Sérialise un message dont chaque argument est une ligne de texte sans style. */
function plain(...lines: string[]): string {
  return serialize(createDocument(...lines.map((l) => paragraph(text(l)))));
}

describe('Tiret bas (§1, §11)', () => {
  it('B1_tiret_bas_dans_un_mot_non_echappe', () => {
    expect(plain('le fichier mon_fichier_final.txt est prêt'))
      .toBe('le fichier mon_fichier_final.txt est prêt');
  });

  it('B2_tiret_bas_en_bord_de_mot_echappe', () => {
    expect(plain('snake_case_name et __init__.py'))
      .toBe('snake_case_name et \\_\\_init\\_\\_.py');
  });

  it('C4_tiret_bas_entre_lettres_non_echappe', () => {
    expect(plain('a_b_c')).toBe('a_b_c');
  });

  it('C5_tiret_bas_en_debut_de_mot_echappe', () => {
    expect(plain('_debut et fin_')).toBe('\\_debut et fin\\_');
  });

  it('J1_ligne_vide_visible_ecrite_a_la_main_est_echappee', () => {
    // « _ _ » écrit comme texte ordinaire ne doit pas devenir un italique.
    expect(plain('_ _')).toBe('\\_ \\_');
  });
});

describe('Astérisque (§11)', () => {
  it('C1_asterisques_entoures_d_espaces_non_echappes', () => {
    expect(plain('2 * 3 * 4')).toBe('2 * 3 * 4');
  });

  it('C2_C3_asterisques_dans_un_mot_echappes', () => {
    expect(plain('a*b*c')).toBe('a\\*b\\*c');
  });

  it('asterisque en debut de ligne echappe', () => {
    expect(plain('* pas une puce')).toBe('\\* pas une puce');
  });
});

describe('Tilde, barre verticale, accent grave : seulement si une paire est possible (§11)', () => {
  it('C6_tildes_simples_non_echappes', () => {
    expect(plain('a ~ b ~ c')).toBe('a ~ b ~ c');
  });

  it('C7_double_tilde_sans_partenaire_non_echappe', () => {
    expect(plain('a ~~ b')).toBe('a ~~ b');
  });

  it('C7_double_tilde_avec_partenaire_echappe_meme_sur_une_autre_ligne', () => {
    expect(plain('a ~~ b ~~ c')).toBe('a \\~\\~ b \\~\\~ c');
    expect(plain('a ~~ b', 'c ~~ d')).toBe('a \\~\\~ b\nc \\~\\~ d');
  });

  it('C7_double_tilde_echappe_si_le_message_contient_un_barre', () => {
    const message = createDocument(paragraph(text('a ~~ b '), text('x', ['strike'])));
    expect(serialize(message)).toBe('a \\~\\~ b ~~x~~');
  });

  it('C18_paire_de_tildes_sur_deux_lignes_echappee', () => {
    expect(plain('a ~~ b', 'c ~~ d')).toBe('a \\~\\~ b\nc \\~\\~ d');
  });

  it('C8_barres_simples_non_echappees', () => {
    expect(plain('a | b | c')).toBe('a | b | c');
  });

  it('C9_double_barre_sans_partenaire_non_echappee', () => {
    expect(plain('a || b')).toBe('a || b');
  });

  it('C9_double_barre_echappee_si_le_message_contient_un_spoiler', () => {
    const message = createDocument(paragraph(text('a || b')), paragraph(text('x', ['spoiler'])));
    expect(serialize(message)).toBe('a \\|\\| b\n||x||');
  });

  it('C10_accent_grave_seul_non_echappe', () => {
    expect(plain('a ` b')).toBe('a ` b');
  });

  it('C10_accents_graves_avec_partenaire_echappes', () => {
    expect(plain('a ` b', 'c ` d')).toBe('a \\` b\nc \\` d');
    const message = createDocument(paragraph(text('a ` b '), code('x')));
    expect(serialize(message)).toBe('a \\` b `x`');
  });
});

describe('Débuts de ligne (§11)', () => {
  it('C11_diese_suivi_d_un_espace_echappe', () => {
    expect(plain('#sans-espace', '# pas un titre', '## pas un titre non plus'))
      .toBe('#sans-espace\n\\# pas un titre\n\\## pas un titre non plus');
  });

  it('C12_tiret_suivi_d_un_espace_ou_de_diese_echappe', () => {
    expect(plain('-sans espace', '- pas une puce', '-# pas un sous-texte'))
      .toBe('-sans espace\n\\- pas une puce\n\\-# pas un sous-texte');
  });

  it('C13_nombre_suivi_de_point_espace_echappe', () => {
    expect(plain('1.sans espace', '1. pas une liste', '2020. une année'))
      .toBe('1.sans espace\n1\\. pas une liste\n2020\\. une année');
  });

  it('C14_chevron_suivi_d_un_espace_echappe', () => {
    expect(plain('>sans espace', '> pas une citation', '>>> pas une citation'))
      .toBe('>sans espace\n\\> pas une citation\n\\>>> pas une citation');
  });

  it('debut_de_ligne_precede_d_espaces_echappe_aussi', () => {
    expect(plain('  - pas une sous-puce')).toBe('  \\- pas une sous-puce');
  });

  it('pas d’échappement au milieu d’une ligne', () => {
    expect(plain('a # b - c > d 1. e')).toBe('a # b - c > d 1. e');
  });
});

describe('Chevron, crochet, antislash (§11)', () => {
  it('C15_chevrons_ordinaires_non_echappes', () => {
    expect(plain('a < b > c', '<texte>')).toBe('a < b > c\n<texte>');
  });

  it('C15_motif_de_mention_echappe', () => {
    expect(plain('<@&123>', '<@123>', '<#123>', '<t:1735689600:f>', '<:nom:123>'))
      .toBe('\\<@&123>\n\\<@123>\n\\<#123>\n\\<t:1735689600:f>\n\\<:nom:123>');
  });

  it('C16_crochet_suivi_d_une_parenthese_echappe', () => {
    expect(plain('[a](https://exemple.com)', '[a] seul'))
      .toBe('\\[a](https://exemple.com)\n[a] seul');
  });

  it('C17_antislash_toujours_double', () => {
    expect(plain('chemin C:\\dossier et \\_')).toBe('chemin C:\\\\dossier et \\\\\\_');
  });
});

describe('Symboles collés à une balise', () => {
  it('un symbole en bord de morceau stylé est échappé', () => {
    const message = createDocument(paragraph(text('x*'), text('y', ['bold'])));
    expect(serialize(message)).toBe('x\\***y**');
  });

  it('un début de ligne dans un gras n’a pas besoin d’échappement', () => {
    const message = createDocument(paragraph(text('# x', ['bold'])));
    expect(serialize(message)).toBe('**# x**');
  });
});
