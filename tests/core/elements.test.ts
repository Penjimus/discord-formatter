// Étape 5 : mentions, émojis, horodatages (séries H, I, M du cahier, docs/discord-rules.md §1, §7, §8, §9).
import { describe, expect, it } from 'vitest';
import {
  bulletItem,
  code,
  codeBlock,
  createDocument,
  heading,
  mention,
  paragraph,
  quoted,
  raw,
  subtext,
  text,
  timestamp,
  TIMESTAMP_STYLES,
  type DiscordDocument,
} from '../../src/core/document';
import { dateToTimestamp, unfilledTemplates } from '../../src/core/elements';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';

const line = (...content: Parameters<typeof paragraph>) => createDocument(paragraph(...content));
const write = (...content: Parameters<typeof paragraph>) => serialize(line(...content));

/** Écrit, relit : même document (S14). */
function expectRoundTrip(message: DiscordDocument): void {
  expect(parse(serialize(message))).toEqual(message);
}

const NEW_YEAR_2025 = 1735689600;

describe('Horodatages (§8, série H)', () => {
  it('H1_les_neuf_styles_et_l_absence_de_style', () => {
    expect(write(timestamp(NEW_YEAR_2025))).toBe('<t:1735689600>');
    for (const style of TIMESTAMP_STYLES) {
      const written = `<t:1735689600:${style}>`;
      expect(write(timestamp(NEW_YEAR_2025, style))).toBe(written);
      expect(parse(written)).toEqual(line(timestamp(NEW_YEAR_2025, style)));
    }
    expect(parse('aucun : <t:1735689600>')).toEqual(line(text('aucun : '), timestamp(NEW_YEAR_2025)));
  });

  it('H1_les_lettres_sont_sensibles_a_la_casse', () => {
    expect(parse('<t:1735689600:t>')).not.toEqual(parse('<t:1735689600:T>'));
  });

  it('H2_une_date_donne_des_secondes_jamais_des_millisecondes', () => {
    expect(dateToTimestamp(new Date(Date.UTC(2025, 0, 1, 0, 0, 0)))).toBe(NEW_YEAR_2025);
    expect(write(timestamp(dateToTimestamp(new Date(Date.UTC(2025, 0, 1))), 'f'))).toBe('<t:1735689600:f>');
  });

  it('H2_horodatage_en_millisecondes_colle_lu_comme_Discord', () => {
    // Discord le lit en secondes (date absurde) : l'appli ne change pas le rendu.
    expect(parse('<t:1735689600000:f>')).toEqual(line(timestamp(1735689600000, 'f')));
  });

  it('conversion_de_dates_connues', () => {
    expect(dateToTimestamp(new Date(Date.UTC(1970, 0, 1)))).toBe(0);
    expect(dateToTimestamp(new Date(Date.UTC(2000, 0, 1)))).toBe(946684800);
    expect(dateToTimestamp(new Date(Date.UTC(2026, 10, 13, 12, 30)))).toBe(1794573000);
    // Les millisecondes sont arrondies vers le bas.
    expect(dateToTimestamp(new Date(NEW_YEAR_2025 * 1000 + 999))).toBe(NEW_YEAR_2025);
  });

  it('date_impossible_refusee', () => {
    expect(() => dateToTimestamp(new Date('pas une date'))).toThrow();
    expect(() => dateToTimestamp(new Date(Date.UTC(1969, 11, 31)))).toThrow();
  });

  it('horodatage_impossible_refuse', () => {
    expect(() => timestamp(1.5)).toThrow();
    expect(() => timestamp(-1)).toThrow();
    // @ts-expect-error : lettre inconnue
    expect(() => timestamp(NEW_YEAR_2025, 'x')).toThrow();
  });

  it('H3_styles_sur_un_horodatage', () => {
    const message = line(
      timestamp(NEW_YEAR_2025, 'f', ['bold']), text(' '),
      timestamp(NEW_YEAR_2025, 'f', ['italic']), text(' '),
      timestamp(NEW_YEAR_2025, 'f', ['underline']), text(' '),
      timestamp(NEW_YEAR_2025, 'f', ['strike']),
    );
    const sent = '**<t:1735689600:f>** *<t:1735689600:f>* __<t:1735689600:f>__ ~~<t:1735689600:f>~~';
    expect(serialize(message)).toBe(sent);
    expect(parse(sent)).toEqual(message);
  });

  it('D1_D5_horodatage_dans_titre_sous_texte_liste_citation_spoiler', () => {
    const t = () => timestamp(NEW_YEAR_2025, 'f');
    const message = createDocument(
      heading(1, t()),
      subtext(t()),
      bulletItem(1, t()),
      quoted(paragraph(t())),
      paragraph(timestamp(NEW_YEAR_2025, 'f', ['spoiler'])),
    );
    expect(serialize(message)).toBe(
      '# <t:1735689600:f>\n-# <t:1735689600:f>\n- <t:1735689600:f>\n> <t:1735689600:f>\n||<t:1735689600:f>||',
    );
    expect(parse(serialize(message))).toEqual(message);
  });

  it('D6_D7_D8_horodatage_brut_dans_le_code', () => {
    expect(parse('`<t:1735689600:f>`')).toEqual(line(code('<t:1735689600:f>')));
    expect(parse('```\n<t:1735689600:f>\n```')).toEqual(createDocument(codeBlock('<t:1735689600:f>')));
  });

  it('formes_d_horodatage_non_reconnues_conservees_brutes', () => {
    for (const form of ['<t:1735689600:x>', '<t:-5>', '<t:0123>', '<t:>', '<t:1735689600:ff>']) {
      expect(parse(form)).toEqual(line(raw(form)));
      expect(serialize(parse(form))).toBe(form);
    }
  });
});

describe('Mentions (§7, séries I et M)', () => {
  it('I1_les_trois_modeles', () => {
    const message = line(mention('user'), text(' '), mention('role'), text(' '), mention('channel'));
    expect(serialize(message)).toBe('<@ID_UTILISATEUR> <@&ID_ROLE> <#ID_SALON>');
    expect(parse('<@ID_UTILISATEUR> <@&ID_ROLE> <#ID_SALON>')).toEqual(message);
  });

  it('mentions_completees', () => {
    const message = line(
      mention('user', '123456789012345678'), text(' '),
      mention('role', '123456789012345678'), text(' '),
      mention('channel', '123456789012345678'),
    );
    const sent = '<@123456789012345678> <@&123456789012345678> <#123456789012345678>';
    expect(serialize(message)).toBe(sent);
    expect(parse(sent)).toEqual(message);
  });

  it('mention_impossible_refusee', () => {
    expect(() => mention('user', 'abc')).toThrow();
    expect(() => mention('user', '')).toThrow();
    expect(() => mention('user', 'ID_ROLE')).toThrow();
  });

  it('I2_mention_active_hors_code_brute_dans_le_code', () => {
    expect(parse('Hors code : <#123>')).toEqual(line(text('Hors code : '), mention('channel', '123')));
    expect(parse('Code en ligne : `<#123>`')).toEqual(line(text('Code en ligne : '), code('<#123>')));
    expect(parse('```\nBloc : <#123>\n```')).toEqual(createDocument(codeBlock('Bloc : <#123>')));
    expect(serialize(createDocument(codeBlock('<#123>')))).toBe('```\n<#123>\n```');
  });

  it('I2_identifiant_fictif_conserve_brut', () => {
    expect(parse('Hors code : <#ID_SALON_REEL>')).toEqual(line(text('Hors code : '), raw('<#ID_SALON_REEL>')));
  });

  it('M2_mention_dans_un_spoiler', () => {
    const message = line(text('a '), mention('user', '123', ['spoiler']));
    expect(serialize(message)).toBe('a ||<@123>||');
    expectRoundTrip(message);
  });

  it('M3_styles_autour_d_une_mention_ecrits_tels_quels', () => {
    // Convention §1 : pas de filtrage, le gras n'est pas coupé en deux.
    const message = line(
      text('toto ', ['bold']), mention('user', '1', ['bold']), text(' tata', ['bold']),
    );
    expect(serialize(message)).toBe('**toto <@1> tata**');
    expectRoundTrip(message);
  });

  it('M4_M5_M6_M7_mention_dans_titre_citation_liste_sous_texte', () => {
    const c = () => mention('channel', '123');
    const message = createDocument(heading(2, c()), quoted(paragraph(c())), bulletItem(1, c()), subtext(c()));
    expect(serialize(message)).toBe('## <#123>\n> <#123>\n- <#123>\n-# <#123>');
    expectRoundTrip(message);
  });

  it('C15_mention_echappee_reste_litterale', () => {
    expect(serialize(line(text('<@&123>')))).toBe('\\<@&123>');
    expect(parse('\\<@&123>')).toEqual(line(text('<@&123>')));
  });

  it('syntaxes_hors_perimetre_conservees_brutes', () => {
    for (const form of ['<@!123>', '<:ok:456>', '<a:ok:456>', '</commande:123>', '<id:customize>', '<@>', '<@ 1>']) {
      expect(parse(form)).toEqual(line(raw(form)));
      expect(serialize(parse(form))).toBe(form);
    }
  });
});

describe('Modèles à compléter (S8)', () => {
  it('detection_des_modeles_dans_le_texte', () => {
    expect(unfilledTemplates('<@ID_UTILISATEUR> et <#ID_SALON>')).toEqual(['user', 'channel']);
    expect(unfilledTemplates('<@&ID_ROLE>')).toEqual(['role']);
    expect(unfilledTemplates('<@123> <@&123> <#123>')).toEqual([]);
    expect(unfilledTemplates('')).toEqual([]);
  });

  it('l_avertissement_disparait_quand_le_modele_est_complete', () => {
    const before = serialize(line(text('Salut '), mention('user')));
    expect(unfilledTemplates(before)).toEqual(['user']);
    expect(unfilledTemplates(before.replace('ID_UTILISATEUR', '123'))).toEqual([]);
  });
});

describe('Émojis (§9, série I)', () => {
  it('I3_emojis_dans_les_styles_ecrits_tels_quels', () => {
    const sent = '**😀** *😀* __😀__ ~~😀~~ ||😀||';
    const message = line(
      text('😀', ['bold']), text(' '), text('😀', ['italic']), text(' '),
      text('😀', ['underline']), text(' '), text('😀', ['strike']), text(' '), text('😀', ['spoiler']),
    );
    expect(serialize(message)).toBe(sent);
    expect(parse(sent)).toEqual(message);
  });

  it('emojis_standards_en_caractere_unicode', () => {
    for (const emoji of ['😀', '🇫🇷', '👍🏽']) {
      expect(write(text(`a ${emoji} b`))).toBe(`a ${emoji} b`);
      expectRoundTrip(line(text(`a ${emoji} b`)));
    }
  });
});

describe('Aller-retour avec mentions et horodatages (S14)', () => {
  const MESSAGES = [
    'Date limite : <t:1735689600:F>', '~~a\n> b <t:1735689600:F>~~', '**<@1>**<@2>', '*<#1>*_a_',
    '<@1><@&2><#3><t:4>', '||<@ID_UTILISATEUR>||', '<t:1735689600:R> <:ok:456> :star:',
  ];
  for (const message of MESSAGES) {
    it(`stable : ${JSON.stringify(message)}`, () => {
      const first = parse(message);
      expect(parse(serialize(first))).toEqual(first);
    });
  }
});
