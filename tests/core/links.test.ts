// Étape 14 : liens masqués (docs/discord-rules.md §4, série L et C16, C21, C22 du cahier).
import { describe, expect, it } from 'vitest';
import {
  bulletItem,
  code,
  createDocument,
  layoutLine,
  link,
  mention,
  numberedItem,
  paragraph,
  quoted,
  raw,
  subtext,
  text,
  timestamp,
  type DiscordDocument,
  type InlineNode,
} from '../../src/core/document';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { validate } from '../../src/core/validate';
import { toolbarState } from '../../src/core/compatibility';
import { codeBlock } from '../../src/core/document';

const URL = 'https://exemple.com';
const L = link(URL);

const line = (...content: InlineNode[]): DiscordDocument => createDocument(paragraph(...content));

/** Le texte se relit en un document qui se réécrit à l'identique. */
function expectSameText(message: string): void {
  expect(serialize(parse(message))).toBe(message);
}

/** Le document s'écrit puis se relit sans changement (S14). */
function expectRoundTrip(message: DiscordDocument): void {
  expect(parse(serialize(message))).toEqual(message);
}

/** Le document lu contient-il un lien ? */
function hasLink(message: DiscordDocument): boolean {
  return message.blocks.some((block) => block.type === 'paragraph'
    && block.content.some((node) => 'link' in node && node.link !== undefined));
}

describe('Adresse d\'un lien (L6, L7, L12)', () => {
  it('L7_protocoles_cliquables', () => {
    for (const url of ['https://a.fr', 'http://a.fr', 'mailto:test@exemple.com', 'tel:+33100000000', 'discord://-/channels/@me']) {
      expect(link(url).url).toBe(url);
    }
  });

  it('L7_protocoles_refuses', () => {
    for (const url of ['exemple.com', 'www.exemple.com', 'ftp://exemple.com', 'steam://run/440', 'https://', '']) {
      expect(() => link(url), url).toThrow();
    }
  });

  it('L12_espace_ecrit_pourcent_20', () => {
    expect(link('https://exemple.com/a b').url).toBe('https://exemple.com/a%20b');
  });

  it('L6_parenthese_seule_ecrite_pourcent_29_paire_gardee', () => {
    expect(link('https://exemple.com/a)b').url).toBe('https://exemple.com/a%29b');
    expect(link('https://exemple.com/a(b').url).toBe('https://exemple.com/a%28b');
    expect(link('https://exemple.com/a_(b)').url).toBe('https://exemple.com/a_(b)');
  });

  it('chevrons et antislash refusés (non testés)', () => {
    expect(() => link('https://exemple.com/<a>')).toThrow();
    expect(() => link('https://exemple.com/a\\b')).toThrow();
  });
});

describe('Lecture et écriture des liens', () => {
  it('C16_lien_masque_lu_comme_un_lien', () => {
    expect(parse('[a](https://exemple.com)')).toEqual(line(text('a', [], L)));
    expectSameText('[a](https://exemple.com)\n\\[a](https://exemple.com)');
  });

  it('C21_C22_adresse_seule_inchangee', () => {
    expectSameText('https://exemple.com/_a_');
    expectSameText('**https://exemple.com**');
  });

  it('L1_styles_autour_du_lien', () => {
    expect(parse('**[gras](https://exemple.com)**')).toEqual(line(text('gras', ['bold'], L)));
    expect(parse('||[spoiler](https://exemple.com)||')).toEqual(line(text('spoiler', ['spoiler'], L)));
    for (const message of [
      '**[gras](https://exemple.com)**', '*[italique](https://exemple.com)*', '__[souligné](https://exemple.com)__',
      '~~[barré](https://exemple.com)~~', '||[spoiler](https://exemple.com)||',
    ]) {
      expectSameText(message);
    }
    // Plusieurs styles : réécrits dans l'ordre fixe (§2.1), même rendu.
    expect(parse('***__~~[tout](https://exemple.com)~~__***'))
      .toEqual(line(text('tout', ['strike', 'underline', 'bold', 'italic'], L)));
    expect(serialize(parse('***__~~[tout](https://exemple.com)~~__***')))
      .toBe('~~__***[tout](https://exemple.com)***__~~');
    expect(parse('_[italique](https://exemple.com)_')).toEqual(line(text('italique', ['italic'], L)));
  });

  it('L2_styles_dans_le_texte_du_lien', () => {
    expect(parse('[début **milieu** fin](https://exemple.com)')).toEqual(
      line(text('début ', [], L), text('milieu', ['bold'], L), text(' fin', [], L)));
    expectSameText('[début **milieu** fin](https://exemple.com)');
    expect(parse('[`code`](https://exemple.com)')).toEqual(line(code('code', [], L)));
    expectSameText('[`code`](https://exemple.com)');
    // Un style qui couvre tout le texte est écrit autour du lien (même rendu, L1 et L2).
    expect(serialize(parse('[**gras**](https://exemple.com)'))).toBe('**[gras](https://exemple.com)**');
  });

  it('L3_style_a_cheval_referme_au_bord_du_lien', () => {
    const message = line(text('gras ', ['bold']), text('lien', ['bold'], L), text(' suite', [], L));
    expect(serialize(message)).toBe('**gras **[**lien** suite](https://exemple.com)');
    expectRoundTrip(message);
    expectSameText('**avant [lien](https://exemple.com) après**');
  });

  it('L4_lien_dans_une_mise_en_page', () => {
    const message = [
      '- [puce](https://exemple.com)', '  - [sous-puce](https://exemple.com)', '', '1. [numéro](https://exemple.com)',
      '> [citation](https://exemple.com)', '> - [puce citée](https://exemple.com)',
      '-# [sous-texte](https://exemple.com)', '> -# [sous-texte cité](https://exemple.com)',
    ].join('\n');
    const document = parse(message);
    expect(document.blocks[0]).toEqual(bulletItem(1, text('puce', [], L)));
    expect(document.blocks[3]).toEqual(numberedItem(1, 1, text('numéro', [], L)));
    expect(document.blocks[4]).toEqual(quoted(paragraph(text('citation', [], L))));
    expect(document.blocks[6]).toEqual(subtext(text('sous-texte', [], L)));
    expect(document.blocks[7]).toEqual(layoutLine({ quote: true, style: 'subtext' }, text('sous-texte cité', [], L)));
    expectSameText(message);
  });

  it('L5_crochets_dans_le_texte', () => {
    expect(parse('[a [b] c](https://exemple.com)')).toEqual(line(text('a [b] c', [], L)));
    expectSameText('[a [b] c](https://exemple.com)');
    expect(parse('[d \\] e](https://exemple.com)')).toEqual(line(text('d ] e', [], L)));
    expectSameText('[d \\] e](https://exemple.com)');
    // `\[` et `]` seul : pas de lien, gardé tel quel.
    expect(hasLink(parse('[f \\[ g](https://exemple.com)'))).toBe(false);
    expectSameText('[f \\[ g](https://exemple.com)');
    expect(hasLink(parse('[h ] i](https://exemple.com)'))).toBe(false);
  });

  it('L6_symboles_dans_l_adresse', () => {
    expect(parse('[a](https://exemple.com/a_(b))')).toEqual(line(text('a', [], link('https://exemple.com/a_(b)'))));
    expect(parse('[c](https://exemple.com/a%29b)')).toEqual(line(text('c', [], link('https://exemple.com/a%29b'))));
    expect(parse('[e](https://exemple.com/_x_*y*~~z~~)'))
      .toEqual(line(text('e', [], link('https://exemple.com/_x_*y*~~z~~'))));
    // `\)` (adresse ouverte non relevée) et espace : gardés tels quels.
    for (const message of ['[b](https://exemple.com/a\\)b)', '[d](https://exemple.com/a b)']) {
      expect(hasLink(parse(message)), message).toBe(false);
      expectSameText(message);
    }
  });

  it('L7_adresse_non_cliquable_gardee_telle_quelle', () => {
    for (const message of ['[b](exemple.com)', '[c](www.exemple.com)', '[e](ftp://exemple.com)', '[f](steam://run/440)']) {
      expect(hasLink(parse(message)), message).toBe(false);
      expectSameText(message);
    }
    for (const message of ['[a](http://exemple.com)', '[d](mailto:test@exemple.com)', '[g](tel:+33100000000)', '[h](discord://-/channels/@me)']) {
      expect(hasLink(parse(message)), message).toBe(true);
      expectSameText(message);
    }
  });

  it('L8_lien_sans_apercu', () => {
    const wiki = 'https://fr.wikipedia.org/wiki/Discord';
    expect(parse(`[Wikipédia](<${wiki}>)`)).toEqual(line(text('Wikipédia', [], link(wiki, true))));
    expect(serialize(line(text('Wikipédia', [], link(wiki, true))))).toBe(`[Wikipédia](<${wiki}>)`);
    expectSameText(`**[Wikipédia](<${wiki}>)**`);
    expectSameText(`[Wikipédia](${wiki})`);
  });

  it('L9_contenus_particuliers', () => {
    expect(parse('mot[collé](https://exemple.com)mot')).toEqual(
      line(text('mot'), text('collé', [], L), text('mot')));
    expectSameText('mot[collé](https://exemple.com)mot');
    for (const message of [
      '[😀 :star: <t:1735689600:f>](https://exemple.com)', '[https://autre.com](https://exemple.com)',
      '[](https://exemple.com)', '[ ](https://exemple.com)', '[titre](https://exemple.com "info")',
    ]) {
      expect(hasLink(parse(message)), message).toBe(false);
      expectSameText(message);
    }
  });

  it('L10_formes_approchees_restent_du_texte', () => {
    for (const message of ['[a](b)', '[a] (https://exemple.com)', '[a]\\(https://exemple.com)', '[a]\n(https://exemple.com)']) {
      expect(hasLink(parse(message)), message).toBe(false);
    }
  });

  it('L11_seul_l_horodatage_est_permis_dans_le_texte', () => {
    expect(parse('[<t:1735689600:f>](https://exemple.com)')).toEqual(line(timestamp(1735689600, 'f', [], L)));
    expectSameText('[<t:1735689600:f>](https://exemple.com)');
    for (const message of ['[😀](https://exemple.com)', '[texte 😀](https://exemple.com)', '[:star:](https://exemple.com)',
      '[<@&123>](https://exemple.com)', '[<#123>](https://exemple.com)']) {
      expect(hasLink(parse(message)), message).toBe(false);
      expectSameText(message);
    }
  });

  it('L12_crochet_seul_et_pourcent_20', () => {
    expect(parse('[d](https://exemple.com/a%20b)')).toEqual(line(text('d', [], link('https://exemple.com/a%20b'))));
    expect(hasLink(parse('[f [ g](https://exemple.com)'))).toBe(false);
    expectSameText('[f [ g](https://exemple.com)');
  });
});

describe('Ce qui ne peut pas être dans le texte d\'un lien en sort (choix A)', () => {
  it('L11_emoji_sort_du_lien_qui_est_coupe_en_deux', () => {
    const message = line(text('Mon 😀 site', [], L));
    expect(message).toEqual(line(text('Mon ', [], L), text('😀'), text(' site', [], L)));
    expect(serialize(message)).toBe('[Mon ](https://exemple.com)😀[ site](https://exemple.com)');
    expectRoundTrip(message);
  });

  it('L11_mention_coupe_le_lien', () => {
    const message = line(text('a ', [], L), mention('role'), text(' b', [], L));
    expect(serialize(message)).toBe('[a ](https://exemple.com)<@&ID_ROLE>[ b](https://exemple.com)');
    expectRoundTrip(message);
  });

  it('L12_crochet_seul_sort_du_lien', () => {
    const message = line(text('a [ b', [], L));
    expect(message).toEqual(line(text('a ', [], L), text('['), text(' b', [], L)));
    expectRoundTrip(message);
  });

  it('L9_lien_vide_ou_adresse_retire', () => {
    expect(line(text(' ', [], L))).toEqual(line(text(' ')));
    expect(line(text('😀', [], L))).toEqual(line(text('😀')));
    expect(line(text('https://autre.com', [], L))).toEqual(line(text('https://autre.com')));
  });

  it('crochet fermant seul écrit \\] (L5)', () => {
    const message = line(text('a ] b', [], L));
    expect(serialize(message)).toBe('[a \\] b](https://exemple.com)');
    expectRoundTrip(message);
  });

  it('validate : un lien qui contient un émoji est un problème', () => {
    const broken: DiscordDocument = { blocks: [{ ...paragraph(text('x')), content: [{ ...text('a😀'), link: L }] }] };
    expect(validate(broken)).not.toEqual([]);
    expect(validate(line(text('a', [], L)))).toEqual([]);
  });
});

describe('Aller-retour des liens (S14)', () => {
  const messages: DiscordDocument[] = [
    line(text('voir '), text('ce site', ['bold'], L), text(' ici')),
    line(text('a', ['italic'], L), text('b', ['italic'])),
    line(text('*x*', [], L)),
    line(text('[a]', [], L)),
    line(text('un', [], L), text('deux', [], link('https://autre.fr', true))),
    line(text('début ', ['italic'], L), text('fin', ['italic', 'bold'], L), text('après', ['italic'])),
    line(text('[x] '), text('y', [], L)),
    createDocument(bulletItem(1, text('a', ['strike'], L)), bulletItem(1, text('b', ['strike']))),
  ];
  messages.forEach((message, i) => it(`document ${i + 1}`, () => expectRoundTrip(message)));
});

describe('Barre d\'outils : bouton « Lien » (S19)', () => {
  it('permis dans le texte, une puce, un titre', () => {
    for (const block of [paragraph(text('a')), bulletItem(1, text('a')), layoutLine({ style: 'heading1' }, text('a'))]) {
      expect(toolbarState(createDocument(block), { block: 0 }).link.enabled).toBe(true);
    }
  });

  it('grisé dans un code en ligne et dans un bloc de code', () => {
    expect(toolbarState(line(code('a')), { block: 0, inInlineCode: true }).link.enabled).toBe(false);
    expect(toolbarState(createDocument(codeBlock('a')), { block: 0 }).link.enabled).toBe(false);
  });

  it('un morceau brut ne porte jamais de lien', () => {
    expect(raw('x')).not.toHaveProperty('link');
  });
});
