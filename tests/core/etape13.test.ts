// Étape 13 : constats G28, G29, I7, J5 (docs/discord-rules.md §3, §9, §13).
import { describe, expect, it } from 'vitest';
import {
  createDocument,
  emptyQuoteLine,
  paragraph,
  quoted,
  raw,
  subtext,
  text,
  type Block,
} from '../../src/core/document';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { toolbarState } from '../../src/core/compatibility';
import { EMOTICON_EMOJIS, findEmoticons } from '../../src/core/emoticons';
import { editorToDocument, type EditorNode } from '../../src/ui/editorConvert';

const doc = (...blocks: Block[]) => createDocument(...blocks);
const emptyQuote = () => emptyQuoteLine();

describe('G28 : ligne vide en première ligne d\'une citation', () => {
  it('G28_ligne_citee_vide_puis_texte_cite', () => {
    const message = doc(emptyQuote(), quoted(paragraph(text('dddd'))));
    expect(serialize(message)).toBe('> \n> dddd');
    expect(parse('> \n> dddd')).toEqual(message);
  });

  it('G28_apres_du_texte_hors_citation', () => {
    const message = doc(paragraph(text('a')), emptyQuote(), quoted(paragraph(text('b'))));
    expect(serialize(message)).toBe('a\n> \n> b');
    expect(parse('a\n> \n> b')).toEqual(message);
  });

  it('G28_G30_refusee_seule_ou_sans_texte_cite_apres', () => {
    expect(() => doc(emptyQuote())).toThrow();
    expect(() => doc(emptyQuote(), paragraph(text('a')))).toThrow();
    expect(() => doc(quoted(paragraph(text('a'))), emptyQuote())).toThrow();
    expect(() => doc(quoted(paragraph(text('a'))), emptyQuote(), paragraph(text('b')))).toThrow();
  });

  it('G30_plusieurs_lignes_citees_vides_generalise', () => {
    const message = doc(emptyQuote(), emptyQuote(), quoted(paragraph(text('a'))), emptyQuote(), emptyQuote(), quoted(paragraph(text('b'))));
    expect(serialize(message)).toBe('> \n>\n> a\n>\n>\n> b');
    expect(parse('> \n>\n> a\n>\n>\n> b')).toEqual(message);
  });

  it('G30_message_de_l_auteur', () => {
    const message = doc(
      quoted(paragraph(text('dzd'))), quoted(paragraph(text('czd'))), emptyQuote(), quoted(paragraph(text('DZq'))),
    );
    expect(parse('> dzd\n> czd\n>\n> DZq')).toEqual(message);
    expect(serialize(message)).toBe('> dzd\n> czd\n>\n> DZq');
    // `> ` au milieu : même lecture.
    expect(parse('> dzd\n> czd\n> \n> DZq')).toEqual(message);
  });

  it('G28_G30_mal_placee_a_la_lecture_reste_brute', () => {
    expect(parse('> a\n>\nb')).toEqual(doc(quoted(paragraph(text('a'))), paragraph(raw('>')), paragraph(text('b'))));
    expect(serialize(parse('> a\n>\nb'))).toBe('> a\n>\nb');
    expect(serialize(parse('>'))).toBe('>');
  });

  it('G30_texte_reduit_a_un_chevron_echappe', () => {
    expect(serialize(doc(quoted(paragraph(text('a'))), paragraph(text('>')), quoted(paragraph(text('b')))))).toBe('> a\n\\>\n> b');
    expect(parse('> a\n\\>\n> b')).toEqual(doc(quoted(paragraph(text('a'))), paragraph(text('>')), quoted(paragraph(text('b')))));
  });

  it('G28_depuis_l_editeur', () => {
    const line = (attrs: Record<string, unknown>, ...content: EditorNode[]): EditorNode => ({ type: 'line', attrs, content });
    const t = (value: string): EditorNode => ({ type: 'text', text: value });
    const editor = (...content: EditorNode[]): EditorNode => ({ type: 'doc', content });
    expect(serialize(editorToDocument(editor(line({ quote: true }), line({ quote: true }, t('dddd')))))).toBe('> \n> dddd');
    // Au milieu : ligne citée vide (G30) ; à la fin : ligne vide ordinaire.
    expect(serialize(editorToDocument(editor(
      line({ quote: true }, t('a')), line({ quote: true }), line({ quote: true }, t('b')),
    )))).toBe('> a\n>\n> b');
    expect(serialize(editorToDocument(editor(line({ quote: true }, t('a')), line({ quote: true }))))).toBe('> a');
  });
});

describe('G29 : sous-texte dans une citation', () => {
  it('G29_sous_texte_cite', () => {
    const message = doc(quoted(subtext(text('x'))));
    expect(serialize(message)).toBe('> -# x');
    expect(parse('> -# x')).toEqual(message);
  });

  it('G29_options_permises', () => {
    expect(toolbarState(doc(quoted(paragraph(text('a')))), { block: 0 }).subtext.enabled).toBe(true);
    expect(toolbarState(doc(subtext(text('a'))), { block: 0 }).quote.enabled).toBe(true);
  });
});

describe('I7 : émoticônes converties par Discord', () => {
  it('I7_message_du_test_relu_tel_quel', () => {
    const message = 'a :) b :( c :D d :P e ;) f <3 g :o';
    const read = parse(message);
    expect(serialize(read)).toBe(message);
    const raws = read.blocks.flatMap((b) => (b.type === 'paragraph' ? b.content : []))
      .filter((n) => n.type === 'raw').map((n) => (n.type === 'raw' ? n.raw : ''));
    expect(raws).toEqual([':)', ':(', ':D', ':P', ';)', '<3', ':o']);
  });

  it('I7_emojis_affiches', () => {
    expect(EMOTICON_EMOJIS[':)']).toBe('\u{1F642}');
    expect(EMOTICON_EMOJIS['<3']).toBe('❤️');
    expect(EMOTICON_EMOJIS[':o']).toBe('\u{1F62E}');
  });

  it('I7_forme_testee_seulement', () => {
    expect(findEmoticons('Merci:) et :Do et :)x')).toEqual([]);
    expect(findEmoticons(':) fin :)')).toEqual([{ index: 0, emoticon: ':)' }, { index: 7, emoticon: ':)' }]);
    expect(parse('`a :) b`')).toEqual(parse('`a :) b`'));
    expect(serialize(parse('`a :) b`'))).toBe('`a :) b`');
  });

  it('I7_tapee_comme_texte_ecrite_telle_quelle', () => {
    expect(serialize(doc(paragraph(text('Merci :) <3'))))).toBe('Merci :) <3');
  });
});

describe('J5 : lignes vides au bord du message', () => {
  it('J5_lignes_vides_retirees_au_debut_et_a_la_fin', () => {
    expect(serialize(doc(paragraph(), paragraph(), paragraph(text('a')), paragraph(), paragraph()))).toBe('a');
    expect(serialize(parse('\n\na\n\nb\n\n'))).toBe('a\n\nb');
  });

  it('J5_lignes_vides_du_milieu_gardees', () => {
    expect(serialize(doc(paragraph(text('a')), paragraph(), paragraph(), paragraph(text('b'))))).toBe('a\n\n\nb');
  });

  it('J5_style_sur_la_premiere_ligne_reste_ouvert', () => {
    // Forme de l'exemple « citation » : la balise ouvrante était seule sur la première ligne.
    expect(serialize(parse('~~\n> a\n> b\nc~~'))).toBe('~~> a\n> b\nc~~');
  });
});
