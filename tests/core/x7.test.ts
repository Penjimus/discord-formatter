// Étape 12 : anomalie X7, sous-texte dans une puce sous une ligne stylée (docs/discord-rules.md §3, G12 à G27).
import { describe, expect, it } from 'vitest';
import {
  bulletItem,
  createDocument,
  layoutLine,
  paragraph,
  text,
  type Block,
  type DiscordDocument,
  type Paragraph,
} from '../../src/core/document';
import { toolbarState } from '../../src/core/compatibility';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { validate } from '../../src/core/validate';

const subtextBullet = (...content: Parameters<typeof paragraph>) =>
  layoutLine({ list: { kind: 'bullet', level: 1 }, style: 'subtext' }, ...content);

function lastLine(message: DiscordDocument): Paragraph {
  const block = message.blocks[message.blocks.length - 1];
  if (block.type !== 'paragraph') throw new Error('La dernière ligne n\'est pas une ligne de texte');
  return block;
}

/** Dernière ligne lue comme Discord l'affiche dans le cas X7 : puce normale, « -# » visible. */
function expectVisibleMarker(message: string, last = 'c') {
  const line = lastLine(parse(message));
  expect(line).toMatchObject({ style: 'normal', list: { kind: 'bullet' } });
  expect(line.content).toEqual([text(`-# ${last}`)]);
}

function expectSubtext(message: string) {
  expect(lastLine(parse(message)).style).toBe('subtext');
}

describe('X7 : lecture', () => {
  const broken: Record<string, [string, string?]> = {
    G12_puces_barrees_au_dessus: ['~~- a\n- b~~\n- -# c'],
    G13_une_puce_barree_au_dessus: ['~~- a~~\n- -# c'],
    G15_puces_en_gras_au_dessus: ['**- a\n- b**\n- -# c'],
    G16_puce_normale_intercalee: ['~~- a\n- b~~\n- c\n- -# d', 'd'],
    G18_barre_sur_deux_lignes_ordinaires: ['~~a\nb~~\n- -# c'],
    G19_ligne_en_gras_au_dessus: ['**a**\n- -# c'],
    G20_barre_ouvert_au_milieu_d_une_ligne: ['x ~~a\nb~~\n- -# c'],
    G22_souligne_au_dessus: ['__a__\n- -# c'],
    G23_spoiler_au_dessus: ['||a||\n- -# c'],
    G24_italique_au_dessus: ['*a*\n- -# c'],
  };
  for (const [name, [message, last]] of Object.entries(broken)) {
    it(`${name} : « -# » visible, puce normale`, () => expectVisibleMarker(message, last));
    it(`${name} : réécrit avec le même rendu (S14)`, () => expect(parse(serialize(parse(message)))).toEqual(parse(message)));
  }

  it('G12_reecrit_avec_le_tiret_du_sous_texte_echappe', () => {
    expect(serialize(parse('~~- a\n- b~~\n- -# c'))).toBe('~~- a\n- b~~\n- \\-# c');
  });

  it('G13_reecrit_balises_apres_le_tiret_et_sous_texte_echappe', () => {
    expect(serialize(parse('~~- a~~\n- -# c'))).toBe('- ~~a~~\n- \\-# c');
  });

  const fine: Record<string, string> = {
    G14_styles_apres_le_tiret: '- ~~a~~\n- ~~b~~\n- -# c',
    G21_ligne_vide_entre_les_deux: '~~- a~~\n\n- -# c',
    G25_texte_ordinaire_au_dessus: 'a\n- -# c',
    G26_texte_ordinaire_puis_puce: 'a\n- b\n- -# c',
    G27_citation_au_dessus: '> a\n- -# c',
    X6_titre_au_dessus: '# Titre\n- a\n- -# c',
  };
  for (const [name, message] of Object.entries(fine)) {
    it(`${name} : sous-texte appliqué`, () => expectSubtext(message));
  }

  it('G17_sous_texte_sans_puce : sous-texte appliqué', () => {
    expect(lastLine(parse('~~- a\n- b~~\n-# c'))).toMatchObject({ style: 'subtext', list: null });
  });
});

describe('X7 : modèle', () => {
  it('G19_puce_en_sous_texte_sous_une_ligne_en_gras_refusee', () => {
    expect(() => createDocument(paragraph(text('a', ['bold'])), subtextBullet(text('c')))).toThrow(/X7/);
  });

  it('G16_refusee_meme_avec_une_puce_normale_intercalee', () => {
    const blocks: Block[] = [paragraph(text('a', ['strike'])), bulletItem(1, text('b')), subtextBullet(text('c'))];
    expect(validate({ blocks })).not.toEqual([]);
  });

  it('G21_permise_apres_une_ligne_vide', () => {
    expect(() => createDocument(paragraph(text('a', ['bold'])), paragraph(), subtextBullet(text('c')))).not.toThrow();
  });

  it('G25_permise_sous_une_ligne_sans_style', () => {
    expect(() => createDocument(paragraph(text('a')), subtextBullet(text('c')))).not.toThrow();
  });

  it('G14_permise_sous_des_puces_stylees', () => {
    expect(() => createDocument(bulletItem(1, text('a', ['strike'])), subtextBullet(text('c')))).not.toThrow();
  });
});

describe('X7 : écriture', () => {
  it('G14_puces_barrees_puis_sous_texte_ecrites_balises_apres_le_tiret', () => {
    const message = createDocument(
      bulletItem(1, text('a', ['strike'])),
      bulletItem(1, text('b', ['strike'])),
      subtextBullet(text('c')),
    );
    expect(serialize(message)).toBe('- ~~a~~\n- ~~b~~\n- -# c');
  });

  it('sans puce en sous-texte, le barré continue d\'une puce à l\'autre (§2.4, inchangé)', () => {
    const message = createDocument(bulletItem(1, text('a', ['strike'])), bulletItem(1, text('b', ['strike'])));
    expect(serialize(message)).toBe('~~- a\n- b~~');
  });

  it('un style ne traverse pas la ligne vide qui précède un groupe avec une puce en sous-texte', () => {
    const message = createDocument(
      paragraph(text('a', ['strike'])),
      paragraph(),
      bulletItem(1, text('b', ['strike'])),
      subtextBullet(text('c')),
    );
    expect(serialize(message)).toBe('~~a~~\n\n- ~~b~~\n- -# c');
  });

  it('aller-retour stable (S14)', () => {
    const message = createDocument(
      bulletItem(1, text('a', ['strike'])),
      bulletItem(1, text('b', ['strike'])),
      subtextBullet(text('c')),
    );
    expect(parse(serialize(message))).toEqual(message);
  });
});

describe('X7 : barre d\'outils', () => {
  it('« Sous-texte » grisé sur une puce sous une ligne en gras', () => {
    const message = createDocument(paragraph(text('a', ['bold'])), bulletItem(1, text('c')));
    const state = toolbarState(message, { block: 1 });
    expect(state.subtext.enabled).toBe(false);
    expect(state.subtext.reason).toMatch(/X7/);
  });

  it('« Sous-texte » permis sur une puce sous une ligne sans style', () => {
    const message = createDocument(paragraph(text('a')), bulletItem(1, text('c')));
    expect(toolbarState(message, { block: 1 }).subtext.enabled).toBe(true);
  });

  it('styles de texte grisés sur une ligne sans puce au-dessus d\'une puce en sous-texte', () => {
    const message = createDocument(paragraph(text('a')), subtextBullet(text('c')));
    const state = toolbarState(message, { block: 0 });
    for (const option of ['bold', 'italic', 'underline', 'strike', 'spoiler'] as const) {
      expect(state[option].enabled, option).toBe(false);
    }
  });

  it('styles de texte permis sur une puce au-dessus d\'une puce en sous-texte (G14)', () => {
    const message = createDocument(bulletItem(1, text('a')), subtextBullet(text('c')));
    expect(toolbarState(message, { block: 0 }).bold.enabled).toBe(true);
  });
});
