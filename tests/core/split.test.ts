// Étape 15a : découpage en plusieurs messages (SPEC S20 à S24, docs/discord-rules.md §12, série N).
import { describe, expect, it } from 'vitest';
import { ESC } from '../../src/core/characters';
import {
  ansiBlock,
  ansiText,
  bulletItem,
  codeBlock,
  createDocument,
  link,
  mention,
  numberedItem,
  paragraph,
  quoted,
  text,
  type Block,
  type DiscordDocument,
  type InlineNode,
} from '../../src/core/document';
import { mentionSyntax, timestampSyntax } from '../../src/core/elements';
import { discordLength } from '../../src/core/length';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { split } from '../../src/core/split';
import { validate } from '../../src/core/validate';

const doc = (...blocks: Block[]): DiscordDocument => createDocument(...blocks);
const line = (...content: (string | InlineNode)[]) =>
  paragraph(...content.map((c) => (typeof c === 'string' ? text(c) : c)));
const blank = () => paragraph();

describe('S20 : un message par morceau, sous la limite', () => {
  it('texte court : un seul message, identique au texte de droite', () => {
    const message = doc(line('bonjour'));
    expect(split(message, 2000)).toEqual([serialize(message)]);
  });

  it('coupe de préférence à une ligne vide (entre blocs), qui disparaît (J5)', () => {
    const message = doc(line('aaaa'), line('bbbb'), blank(), line('cccc'), line('dddd'));
    expect(split(message, 15)).toEqual(['aaaa\nbbbb', 'cccc\ndddd']);
  });

  it('coupe de préférence au bord d\'un bloc de code', () => {
    const message = doc(line('intro'), codeBlock('x = 1', { language: 'py' }), line('fin'));
    expect(split(message, 20)).toEqual(['intro', '```py\nx = 1\n```\nfin']);
  });

  it('sinon entre deux lignes', () => {
    expect(split(doc(line('aaaa'), line('bbbb'), line('cccc')), 10)).toEqual(['aaaa\nbbbb', 'cccc']);
  });

  it('sinon entre deux phrases', () => {
    const message = doc(line('Phrase un. Phrase deux. Phrase trois.'));
    expect(split(message, 30)).toEqual(['Phrase un. Phrase deux.', 'Phrase trois.']);
  });

  it('sinon entre deux mots ; l\'espace de la coupe n\'est écrit nulle part (N7)', () => {
    expect(split(doc(line('un deux trois quatre')), 10)).toEqual(['un deux', 'trois', 'quatre']);
    expect(split(doc(line('un   deux')), 4)).toEqual(['un', 'deux']);
  });

  it('une mention n\'est jamais coupée', () => {
    expect(split(doc(line('a ', mention('user', '123456'))), 10)).toEqual(['a', '<@123456>']);
  });

  it('un élément de liste coupé garde sa puce dans le message suivant', () => {
    expect(split(doc(bulletItem(1, text('un deux trois'))), 9)).toEqual(['- un deux', '- trois']);
  });
});

describe('S23 : élément plus long que la limite à lui seul (choix 1A)', () => {
  it('un mot est coupé au caractère près', () => {
    expect(split(doc(line('abcdefghij')), 4)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('un émoji n\'est jamais coupé en deux (K3, K5)', () => {
    expect(split(doc(line('😀😀😀')), 5)).toEqual(['😀😀', '😀']);
    expect(split(doc(line('🇫🇷🇫🇷')), 6)).toEqual(['🇫🇷', '🇫🇷']);
  });

  it('un lien n\'est coupé qu\'en dernier recours', () => {
    const message = doc(line('voir ', text('ce lien', [], link('https://e.com')), ' ici'));
    expect(split(message, 30)).toEqual(['voir [ce lien](https://e.com)', 'ici']);
  });

  it('un lien coupé devient deux liens de même adresse', () => {
    const message = doc(line(text('un deux', [], link('https://e.com'))));
    expect(split(message, 21)).toEqual(['[un](https://e.com)', '[deux](https://e.com)']);
  });

  it('un lien dont l\'adresse seule dépasse la limite devient du texte simple', () => {
    const message = doc(line(text('a', [], link(`https://exemple.com/${'x'.repeat(50)}`))));
    expect(split(message, 30)).toEqual(['a']);
  });

  it('une ligne de code trop longue est coupée au caractère près (choix 2A)', () => {
    expect(split(doc(codeBlock('abcdefghij')), 12)).toEqual(['```\nabcd\n```', '```\nefgh\n```', '```\nij\n```']);
  });
});

describe('S21 : ce qui est à cheval est refermé puis rouvert', () => {
  it('style coupé entre deux mots', () => {
    expect(split(doc(line(text('un deux', ['bold']))), 8)).toEqual(['**un**', '**deux**']);
  });

  it('style qui continue d\'une ligne à l\'autre', () => {
    expect(split(doc(line(text('a', ['bold'])), line(text('b', ['bold']))), 6)).toEqual(['**a**', '**b**']);
  });

  it('N6_spoiler_et_gras_coupes', () => {
    const message = doc(line(text('début du secret', ['spoiler', 'bold'])));
    expect(split(message, 18)).toEqual(['||**début du**||', '||**secret**||']);
  });

  it('N3_bloc_de_code_coupe_garde_son_langage (choix 2A, entre deux lignes)', () => {
    const message = doc(codeBlock('const a = 1;\nconst b = 2;', { language: 'js' }));
    expect(split(message, 25)).toEqual(['```js\nconst a = 1;\n```', '```js\nconst b = 2;\n```']);
  });

  it('N4_passage_ansi_coupe_rouvert_dans_le_message_suivant', () => {
    const message = doc(ansiBlock([ansiText('début\nsuite', { bold: true, color: 31, background: 44 })]));
    expect(split(message, 32)).toEqual([
      `\`\`\`ansi\n${ESC}[1;44;31mdébut${ESC}[0m\n\`\`\``,
      `\`\`\`ansi\n${ESC}[1;44;31msuite${ESC}[0m\n\`\`\``,
    ]);
  });

  it('N5_citation_coupee', () => {
    const message = doc(...['un', 'deux', 'trois', 'quatre'].map((word) => quoted(line(word))));
    expect(split(message, 16)).toEqual(['> un\n> deux', '> trois\n> quatre']);
  });
});

describe('S22 et N2 : listes coupées', () => {
  it('N1_liste_numerotee_reprend_sa_numerotation', () => {
    const message = doc(
      numberedItem(1, 1, text('un')),
      numberedItem(1, null, text('deux')),
      numberedItem(1, null, text('trois')),
      numberedItem(1, null, text('quatre')),
    );
    expect(split(message, 18)).toEqual(['1. un\n2. deux', '3. trois\n4. quatre']);
  });

  it('N2 (option A) : coupe avant un élément de premier niveau plutôt que dans une sous-liste', () => {
    const message = doc(
      bulletItem(1, text('a')), bulletItem(2, text('a1')), bulletItem(2, text('a2')),
      bulletItem(1, text('b')), bulletItem(2, text('b1')),
    );
    expect(split(message, 24)).toEqual(['- a\n  - a1\n  - a2', '- b\n  - b1']);
  });

  it('N2 (option A) : sous-liste coupée de force, ses éléments remontent d\'un niveau', () => {
    const bullets = doc(bulletItem(1, text('a')), bulletItem(2, text('a1')), bulletItem(2, text('a2')), bulletItem(2, text('a3')));
    expect(split(bullets, 20)).toEqual(['- a\n  - a1\n  - a2', '- a3']);
    const numbers = doc(
      numberedItem(1, 1, text('a')),
      numberedItem(2, 1, text('x')), numberedItem(2, null, text('y')), numberedItem(2, null, text('z')),
    );
    expect(split(numbers, 18)).toEqual(['1. a\n  1. x\n  2. y', '3. z']);
  });

  it('bloc placé dans une puce, en tête de message : écrit hors de la liste', () => {
    const message = doc(bulletItem(1, text('puce')), codeBlock('x', { inBullet: true }));
    expect(split(message, 15)).toEqual(['- puce', '```\nx\n```']);
  });
});

/** Ce qui se voit, caractère par caractère (espaces exclus), avec styles et mise en page. */
function visible(message: DiscordDocument): string[] {
  const out: string[] = [];
  const chars = (s: string) => [...s].filter((c) => !/\s/u.test(c));
  for (const block of message.blocks) {
    if (block.type === 'codeBlock') {
      const where = `bloc|${block.language.toLowerCase()}|${block.quote}|${block.marks.join(',')}`;
      const segments = block.segments ?? [{ text: block.code, style: null }];
      for (const segment of segments) {
        for (const c of chars(segment.text)) out.push(`${c}|${where}|${JSON.stringify(segment.style)}`);
      }
      continue;
    }
    const where = `${block.quote}|${block.style}|${block.list?.kind ?? '-'}`;
    for (const node of block.content) {
      const marks = node.marks.join(',');
      const url = 'link' in node && node.link ? node.link.url : '';
      const content = node.type === 'text' ? node.text
        : node.type === 'code' ? `code:${node.code}`
        : node.type === 'raw' ? node.raw
        : node.type === 'mention' ? mentionSyntax(node)
        : timestampSyntax(node);
      for (const c of chars(content)) out.push(`${c}|${marks}|${url}|${where}`);
    }
  }
  return out;
}

/** S24 et vérifications de l'étape : sous la limite, relu valide, rien de perdu. */
function checkSplit(message: DiscordDocument, limit: number): string[] {
  const messages = split(message, limit);
  for (const piece of messages) {
    expect(discordLength(piece)).toBeLessThanOrEqual(limit);
    expect(piece).not.toMatch(/^\s/u);
    expect(piece).not.toMatch(/\n\s*$/u);
    expect(validate(parse(piece))).toEqual([]);
  }
  expect(messages.flatMap((piece) => visible(parse(piece)))).toEqual(visible(message));
  return messages;
}

const files = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true });
const examples = Object.entries(files).map(([path, content]) => ({
  name: path.replace(/^.*\/|\.txt$/g, ''),
  message: parse(content.replace(/\r\n/g, '\n')),
}));

describe('S24 : les messages relus et mis bout à bout redonnent le texte d\'origine', () => {
  for (const { name, message } of examples) {
    for (const limit of [150, 400]) {
      it(`examples/${name}, limite ${limit}`, () => {
        checkSplit(message, limit);
      });
    }
  }

  it('tous les exemples à la suite, limites 2000 et 4000', () => {
    const copies = [1, 2, 3].flatMap(() => examples.flatMap(({ message }) => [...message.blocks, blank()]));
    const all = createDocument(...copies);
    const length = discordLength(serialize(all));
    expect(length).toBeGreaterThan(4000);
    expect(checkSplit(all, 2000).length).toBeGreaterThanOrEqual(Math.ceil(length / 2000));
    checkSplit(all, 4000);
  });
});
