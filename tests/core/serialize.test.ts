// Étape 1 : écriture des styles (séries A et Z du cahier, docs/discord-rules.md §1, §2, §5).
import { describe, expect, it } from 'vitest';
import { ZERO_WIDTH_SPACE as ZWSP } from '../../src/core/characters';
import { code, createDocument, paragraph, text } from '../../src/core/document';
import { serialize } from '../../src/core/serialize';

/** Raccourci : sérialise un message d'une seule ligne. */
function line(...content: Parameters<typeof paragraph>): string {
  return serialize(createDocument(paragraph(...content)));
}

describe('Styles simples (§1)', () => {
  it('gras, italique, souligné, barré, spoiler', () => {
    expect(line(text('x', ['bold']))).toBe('**x**');
    expect(line(text('x', ['italic']))).toBe('*x*');
    expect(line(text('x', ['underline']))).toBe('__x__');
    // Barré : « Documenté », non vérifié dans Discord.
    expect(line(text('x', ['strike']))).toBe('~~x~~');
    expect(line(text('x', ['spoiler']))).toBe('||x||');
  });

  it('code en ligne', () => {
    expect(line(code('a *b* c'))).toBe('`a *b* c`');
  });

  it('message vide et lignes vides conservées', () => {
    expect(serialize(createDocument())).toBe('');
    expect(
      serialize(createDocument(paragraph(text('a')), paragraph(), paragraph(text('b')))),
    ).toBe('a\n\nb');
  });
});

describe('Ordre fixe des balises (§2.1)', () => {
  it('A8_styles_cumules_dans_l_ordre_spoiler_barre_souligne_gras_italique', () => {
    const message = createDocument(
      paragraph(text('a) '), text('texte', ['bold', 'italic'])),
      paragraph(text('b) '), text('texte', ['underline', 'bold', 'italic'])),
      paragraph(
        text('c) '),
        text('texte', ['italic', 'bold', 'underline', 'strike', 'spoiler']),
      ),
    );
    expect(serialize(message)).toBe(
      'a) ***texte***\nb) __***texte***__\nc) ||~~__***texte***__~~||',
    );
  });

  it("l'ordre donné en entrée n'a pas d'importance", () => {
    expect(line(text('x', ['italic', 'spoiler', 'bold']))).toBe('||***x***||');
  });
});

describe('Styles imbriqués (§1)', () => {
  it('A9_italique_a_l_interieur_du_gras_fermeture_commune', () => {
    expect(line(text('a ', ['bold']), text('b', ['bold', 'italic'])))
      .toBe('**a *b***');
  });

  it('A10_italique_a_l_interieur_du_gras_ouverture_commune', () => {
    expect(line(text('a', ['bold', 'italic']), text(' b', ['bold'])))
      .toBe('***a* b**');
  });

  it('A12_gras_a_l_interieur_de_l_italique_fermeture_commune', () => {
    expect(line(text('a ', ['italic']), text('b', ['italic', 'bold'])))
      .toBe('*a **b***');
  });

  it('A13_gras_a_l_interieur_de_l_italique_ouverture_commune', () => {
    expect(line(text('a', ['italic', 'bold']), text(' b', ['italic'])))
      .toBe('***a** b*');
  });

  it('A14_code_en_ligne_dans_un_gras', () => {
    expect(line(text('x ', ['bold']), code('code', ['bold']), text(' y', ['bold'])))
      .toBe('**x `code` y**');
  });

  it('A15_code_en_ligne_dans_un_spoiler', () => {
    expect(line(code('code', ['spoiler']))).toBe('||`code`||');
  });

  it('A16_code_en_ligne_contenant_un_accent_grave', () => {
    expect(line(code('a`b'))).toBe('``a`b``');
  });
});

describe('Collisions de délimiteurs (§2.3)', () => {
  it('A1_A2_gras_puis_italique_utilise_le_tiret_bas', () => {
    expect(line(text('1', ['bold']), text('2', ['italic']))).toBe('**1**_2_');
  });

  it('A3_A4_italique_puis_gras_utilise_le_tiret_bas', () => {
    expect(line(text('1', ['italic']), text('2', ['bold']))).toBe('_1_**2**');
  });

  it('A5_A6_souligne_puis_italique_garde_l_asterisque', () => {
    expect(line(text('1', ['underline']), text('2', ['italic']))).toBe('__1__*2*');
  });

  it('A7_gras_espace_italique_sans_collision', () => {
    expect(line(text('1', ['bold']), text(' '), text('2', ['italic']))).toBe('**1** *2*');
  });

  it('Z1_gras_puis_italique_colle_a_une_lettre_utilise_l_espace_invisible', () => {
    expect(line(text('1', ['bold']), text('2', ['italic']), text('b')))
      .toBe(`**1**${ZWSP}*2*b`);
  });

  it('Z1_cas_residuel_au_milieu_d_un_mot', () => {
    expect(line(text('a'), text('b', ['bold']), text('c', ['italic']), text('d')))
      .toBe(`a**b**${ZWSP}*c*d`);
  });

  it('Z2_Z3_italique_entre_souligne_et_gras', () => {
    // Z3 (espace invisible des deux côtés) est aussi correct ; l'appli écrit la forme Z2, plus courte.
    expect(line(text('1', ['underline']), text('2', ['italic']), text('3', ['bold'])))
      .toBe(`__1__*2*${ZWSP}**3**`);
  });

  it('chevauchement gras / italique : le second italique prend le tiret bas', () => {
    expect(line(text('a', ['bold']), text('b', ['bold', 'italic']), text('c', ['italic'])))
      .toBe('**a*b***_c_');
  });
});

describe('Styles sur plusieurs lignes (§1)', () => {
  it('A17_le_gras_continue_sur_la_ligne_suivante_sans_etre_referme', () => {
    const message = createDocument(paragraph(text('a', ['bold'])), paragraph(text('b', ['bold'])));
    expect(serialize(message)).toBe('**a\nb**');
  });

  it('A17_style_partiel_sur_deux_lignes', () => {
    const message = createDocument(
      paragraph(text('x '), text('a', ['bold'])),
      paragraph(text('b', ['bold']), text(' y')),
    );
    expect(serialize(message)).toBe('x **a\nb** y');
  });

  it('A27_le_gras_traverse_une_ligne_vide', () => {
    const message = createDocument(
      paragraph(text('a', ['bold'])),
      paragraph(),
      paragraph(text('b', ['bold'])),
    );
    expect(serialize(message)).toBe('**a\n\nb**');
  });

  it('A27_une_ligne_vide_entre_deux_styles_differents_les_referme', () => {
    const message = createDocument(
      paragraph(text('a', ['bold'])),
      paragraph(),
      paragraph(text('b', ['underline'])),
    );
    expect(serialize(message)).toBe('**a**\n\n__b__');
  });

  it('un début de ligne à l’intérieur d’un style continué est échappé', () => {
    const message = createDocument(
      paragraph(text('a', ['bold'])),
      paragraph(text('# b', ['bold'])),
    );
    expect(serialize(message)).toBe('**a\n\\# b**');
  });
});

describe('Espaces au bord d’un style (§1)', () => {
  it('A18_espace_avant_fermeture_d_italique_sorti_de_l_italique', () => {
    expect(line(text('a ', ['italic']), text('b'))).toBe('*a* b');
  });

  it('A18_espace_apres_ouverture_d_italique_sorti_de_l_italique', () => {
    expect(line(text('a'), text(' b', ['italic']))).toBe('a *b*');
  });

  it('A18_italique_compose_uniquement_d_espaces_ecrit_sans_balise', () => {
    expect(line(text('a', ['bold']), text(' ', ['italic']), text('b', ['bold'])))
      .toBe('**a** **b**');
  });

  it('A18_espace_sorti_de_l_italique_mais_garde_dans_le_gras', () => {
    expect(line(text('a ', ['bold', 'italic']), text('b', ['bold']))).toBe('***a* b**');
  });

  it('A28_espace_apres_ouverture_conserve_dans_le_gras', () => {
    expect(line(text(' a', ['bold']))).toBe('** a**');
  });

  it('A29_espace_apres_ouverture_d_italique_sorti_pour_eviter_une_puce', () => {
    // `* a*` en début de ligne serait lu comme une puce.
    expect(line(text(' a', ['italic']))).toBe(' *a*');
  });

  it('A19_A22_espace_avant_fermeture_conserve_pour_les_autres_styles', () => {
    expect(line(text('a ', ['bold']), text('b'))).toBe('**a **b');
    expect(line(text('a ', ['underline']), text('b'))).toBe('__a __b');
    expect(line(text('a ', ['strike']), text('b'))).toBe('~~a ~~b');
    expect(line(text('a ', ['spoiler']), text('b'))).toBe('||a ||b');
  });
});

describe('Styles au milieu d’un mot (§1)', () => {
  it('A23_A26_souligne_gras_barre_spoiler_au_milieu_d_un_mot', () => {
    expect(line(text('a'), text('b', ['underline']), text('c'))).toBe('a__b__c');
    expect(line(text('a'), text('b', ['bold']), text('c'))).toBe('a**b**c');
    expect(line(text('a'), text('b', ['strike']), text('c'))).toBe('a~~b~~c');
    expect(line(text('a'), text('b', ['spoiler']), text('c'))).toBe('a||b||c');
  });
});

describe('Modèle du document : un document invalide ne se construit pas', () => {
  it('deux morceaux voisins aux mêmes styles sont fusionnés', () => {
    const p = paragraph(text('a', ['bold']), text('b', ['bold']), text(''));
    expect(p.content).toEqual([text('ab', ['bold'])]);
  });

  it('les styles sont dédoublonnés et rangés dans l’ordre fixe', () => {
    expect(text('x', ['italic', 'bold', 'italic']).marks).toEqual(['bold', 'italic']);
  });

  it('un texte ne contient pas de saut de ligne (une ligne = un paragraphe)', () => {
    expect(() => text('a\nb')).toThrow();
  });

  it('un code en ligne ne prend que gras et spoiler (A14, A15 ; le reste est à tester)', () => {
    expect(() => code('x', ['italic'])).toThrow();
    expect(() => code('x', ['underline'])).toThrow();
    expect(() => code('x', ['strike'])).toThrow();
  });

  it('un code en ligne non testé dans Discord ne se construit pas', () => {
    expect(() => code('')).toThrow();
    expect(() => code('`a')).toThrow();
    expect(() => code('a`')).toThrow();
    expect(() => code('a``b')).toThrow();
    expect(() => code('a\nb')).toThrow();
  });
});
