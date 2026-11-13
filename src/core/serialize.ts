// Écriture du document en texte Discord (docs/discord-rules.md §1, §2, §5, §11).
import { ZERO_WIDTH_SPACE } from './characters';
import {
  MARK_ORDER,
  paragraph,
  text,
  type DiscordDocument,
  type InlineNode,
  type Mark,
  type Paragraph,
} from './document';
import { analyzeMessage, escapeText, type MessageContext } from './escape';

/**
 * Saut de ligne entre deux paragraphes. Il porte les styles communs à la fin de la ligne
 * précédente et au début de la suivante : ces styles continuent sans être refermés (A17).
 */
interface LineBreak {
  readonly type: 'break';
  readonly marks: readonly Mark[];
}

type Atom = InlineNode | LineBreak;

/** Une balise ouverte sur une suite de morceaux [start, end[ du message. */
interface Span {
  readonly mark: Mark;
  readonly start: number;
  end: number;
}

/** Ce qui s'écrit entre deux morceaux : les balises fermées (de l'intérieur vers l'extérieur), puis ouvertes. */
interface Boundary {
  readonly closes: Span[];
  readonly opens: Span[];
}

type ItalicDelimiter = '*' | '_';

const DELIMITERS: Record<Exclude<Mark, 'italic'>, string> = {
  spoiler: '||',
  strike: '~~',
  underline: '__',
  bold: '**',
};

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Sort les espaces des bords de l'italique : Discord perd un espace placé avant la fermeture (A18).
 * Un espace en italique étant invisible, le rendu ne change pas.
 */
function moveSpacesOutOfItalic(block: Paragraph): Paragraph {
  let nodes = block.content;
  for (;;) {
    const result: InlineNode[] = [];
    nodes.forEach((node, i) => {
      if (node.type !== 'text' || !node.marks.includes('italic')) {
        result.push(node);
        return;
      }
      const withoutItalic = node.marks.filter((mark) => mark !== 'italic');
      const opensHere = !nodes[i - 1]?.marks.includes('italic');
      const closesHere = !nodes[i + 1]?.marks.includes('italic');
      let body = node.text;
      const leading = opensHere ? /^\s*/u.exec(body)![0] : '';
      body = body.slice(leading.length);
      const trailing = closesHere ? /\s*$/u.exec(body)![0] : '';
      body = body.slice(0, body.length - trailing.length);
      result.push(text(leading, withoutItalic), text(body, node.marks), text(trailing, withoutItalic));
    });
    const normalized = paragraph(...result).content;
    // Recommencer tant qu'un nouveau bord d'italique est apparu.
    if (JSON.stringify(normalized) === JSON.stringify(nodes)) return block;
    nodes = normalized;
    block = { ...block, content: nodes };
  }
}

/** Met tout le message à plat : les morceaux de chaque ligne, séparés par des sauts de ligne. */
function toAtoms(blocks: readonly Paragraph[]): Atom[] {
  const atoms: Atom[] = [];
  blocks.forEach((block, i) => {
    if (i > 0) {
      // Les lignes vides sont traversées (A27) : on compare les lignes non vides de part et d'autre.
      const previous = blocks.slice(0, i).reverse().find((b) => b.content.length > 0)?.content.at(-1);
      const next = blocks.slice(i).find((b) => b.content.length > 0)?.content[0];
      const marks = previous && next ? previous.marks.filter((mark) => next.marks.includes(mark)) : [];
      atoms.push({ type: 'break', marks });
    }
    atoms.push(...block.content);
  });
  return atoms;
}

/** Nombre de morceaux consécutifs, à partir de `from`, qui portent ce style. */
function runLength(atoms: readonly Atom[], from: number, mark: Mark): number {
  let i = from;
  while (i < atoms.length && atoms[i].marks.includes(mark)) i++;
  return i - from;
}

/**
 * Place les balises. Une balise qui dure plus longtemps est placée à l'extérieur ;
 * à durée égale, l'ordre fixe s'applique (Spoiler > Barré > Souligné > Gras > Italique).
 */
function buildBoundaries(atoms: readonly Atom[]): Boundary[] {
  const boundaries: Boundary[] = [];
  const stack: Span[] = [];
  for (let i = 0; i <= atoms.length; i++) {
    const needed = i < atoms.length ? atoms[i].marks : [];
    const boundary: Boundary = { closes: [], opens: [] };
    // Fermer depuis le haut de la pile jusqu'à la première balise qui n'est plus voulue.
    const cut = stack.findIndex((span) => !needed.includes(span.mark));
    if (cut !== -1) {
      while (stack.length > cut) {
        const span = stack.pop()!;
        span.end = i;
        boundary.closes.push(span);
      }
    }
    const missing = needed
      .filter((mark) => !stack.some((span) => span.mark === mark))
      .sort(
        (a, b) =>
          runLength(atoms, i, b) - runLength(atoms, i, a) ||
          MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b),
      );
    for (const mark of missing) {
      const span: Span = { mark, start: i, end: -1 };
      stack.push(span);
      boundary.opens.push(span);
    }
    boundaries.push(boundary);
  }
  return boundaries;
}

/** Écrit un code en ligne ; deux accents graves s'il en contient un (A16). */
function writeCode(content: string): string {
  const fence = content.includes('`') ? '``' : '`';
  return fence + content + fence;
}

/** Texte des morceaux qui suivent `k`, jusqu'à la fin de la ligne. */
function textAfter(atoms: readonly Atom[], k: number): string {
  let result = '';
  for (let i = k + 1; i < atoms.length; i++) {
    const atom = atoms[i];
    if (atom.type === 'break') break;
    result += atom.type === 'text' ? atom.text : atom.code;
  }
  return result;
}

/** Écrit chaque morceau (texte échappé, code ou saut de ligne), sans les balises. */
function writeAtoms(
  atoms: readonly Atom[],
  boundaries: readonly Boundary[],
  message: MessageContext,
): string[] {
  const isDelimited = (k: number) => boundaries[k].closes.length + boundaries[k].opens.length > 0;
  return atoms.map((atom, k) => {
    if (atom.type === 'break') return '\n';
    if (atom.type === 'code') return writeCode(atom.code);
    return escapeText(atom.text, message, {
      atLineStart: (k === 0 || atoms[k - 1].type === 'break') && !isDelimited(k),
      delimitedBefore: isDelimited(k),
      delimitedAfter: isDelimited(k + 1),
      textAfter: textAfter(atoms, k),
    });
  });
}

/** Écrit le message : balises, choix du délimiteur d'italique et espaces invisibles (§2.3). */
function writeAtomsWithMarks(atoms: readonly Atom[], message: MessageContext): string {
  const boundaries = buildBoundaries(atoms);
  const written = writeAtoms(atoms, boundaries, message);
  const italic = new Map<Span, ItalicDelimiter>();

  const delimiter = (span: Span) =>
    span.mark === 'italic' ? (italic.get(span) ?? '*') : DELIMITERS[span.mark];
  const closeText = (k: number) => boundaries[k].closes.map(delimiter).join('');
  const openText = (k: number) => boundaries[k].opens.map(delimiter).join('');

  /** Une fermeture et une ouverture forment-elles trois symboles identiques (A1, A3, A5) ? */
  const collides = (k: number): boolean => {
    const closing = closeText(k);
    const opening = openText(k);
    if (!closing || !opening) return false;
    const symbol = closing[closing.length - 1];
    if (opening[0] !== symbol) return false;
    const run = closing.length - closing.replace(new RegExp(`\\${symbol}+$`), '').length
      + opening.length - opening.replace(new RegExp(`^\\${symbol}+`), '').length;
    return run >= 3;
  };

  /** Caractère écrit juste avant (ou après) la balise `span` à la frontière `k`. */
  const neighbour = (k: number, span: Span, side: 'before' | 'after'): string | undefined => {
    const pieces = [...boundaries[k].closes, ...boundaries[k].opens];
    const index = pieces.indexOf(span);
    if (side === 'before') {
      const before = pieces.slice(0, index).map(delimiter).join('');
      return before ? before[before.length - 1] : written[k - 1]?.slice(-1);
    }
    const after = pieces.slice(index + 1).map(delimiter).join('');
    return after ? after[0] : written[k]?.[0];
  };

  /** Le délimiteur actuel de l'italique `span` évite-t-il toute collision ? */
  const fits = (span: Span): boolean => {
    const ends = [span.start, span.end];
    if (ends.some(collides)) return false;
    if (italic.get(span) !== '_') return true;
    // `_` interdit collé à une lettre ou un chiffre (B1), et jamais `___` (A5).
    const outside = [neighbour(span.start, span, 'before'), neighbour(span.end, span, 'after')];
    if (outside.some((char) => char !== undefined && (WORD_CHAR.test(char) || char === '_'))) {
      return false;
    }
    return ends.every((k) => !(closeText(k) + openText(k)).includes('___'));
  };

  const italicSpans = boundaries.flatMap((b) => b.opens.filter((span) => span.mark === 'italic'));
  for (const span of italicSpans) {
    italic.set(span, '*');
    if (fits(span)) continue;
    italic.set(span, '_');
    if (fits(span)) continue;
    italic.set(span, '*'); // Cas résiduel : l'espace invisible règlera la collision.
  }

  let result = '';
  for (let k = 0; k < boundaries.length; k++) {
    result += closeText(k) + (collides(k) ? ZERO_WIDTH_SPACE : '') + openText(k);
    if (k < written.length) result += written[k];
  }
  return result;
}

/** Document → texte Discord. Une ligne par paragraphe ; un style peut continuer sur la ligne suivante. */
export function serialize(message: DiscordDocument): string {
  const blocks = message.blocks.map(moveSpacesOutOfItalic);
  const context = analyzeMessage({ ...message, blocks });
  return writeAtomsWithMarks(toAtoms(blocks), context);
}
