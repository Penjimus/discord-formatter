// Écriture du document en texte Discord (docs/discord-rules.md §1, §2, §3, §5, §11).
import { ESC, ZERO_WIDTH_SPACE } from './characters';
import {
  analyzeLists,
  ansiCodes,
  isPlainAnsiStyle,
  type AnsiSegment,
  MARK_ORDER,
  paragraph,
  text,
  type Block,
  type CodeBlock,
  type DiscordDocument,
  type InlineNode,
  type ListPosition,
  type Mark,
  type Paragraph,
} from './document';
import { analyzeMessage, escapeText, type MessageContext } from './escape';

/**
 * Saut de ligne entre deux lignes. Il porte les styles communs à la fin de la ligne
 * précédente et au début de la suivante : ces styles continuent sans être refermés (A17).
 */
interface LineBreak {
  readonly type: 'break';
  readonly marks: readonly Mark[];
}

/**
 * Marqueur de début de ligne (`> `, `  - `, `1. `, `# `…). Il porte les styles qui continuent
 * d'une ligne à l'autre : leur balise est alors écrite avant lui (`~~- a`, X7, §2.4).
 */
interface Prefix {
  readonly type: 'prefix';
  readonly text: string;
  readonly marks: readonly Mark[];
}

type Atom = InlineNode | CodeBlock | LineBreak | Prefix;

/** Les morceaux du message, et pour chacun le numéro de sa ligne (-1 pour un saut de ligne). */
interface Layout {
  atoms: Atom[];
  readonly lineOf: readonly number[];
  /** La ligne commence-t-elle par un marqueur ? */
  readonly prefixed: readonly boolean[];
}

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

const STYLE_PREFIX: Record<Paragraph['style'], string> = {
  normal: '',
  heading1: '# ',
  heading2: '## ',
  heading3: '### ',
  subtext: '-# ',
};

/** Marqueur de début de ligne : citation, puis liste (2 espaces par niveau), puis titre (§3). */
function linePrefix(block: Block, position: ListPosition | 'too-deep' | null): string {
  const quote = block.quote ? '> ' : '';
  if (block.type === 'codeBlock') return block.inBullet ? '  ' : quote;
  let list = '';
  if (block.list && position && position !== 'too-deep') {
    const marker = position.kind === 'ordered' ? `${position.number}. ` : '- ';
    list = '  '.repeat(block.list.level - 1) + marker;
  }
  return quote + list + STYLE_PREFIX[block.style];
}

/** Morceaux de contenu d'un bloc : le texte d'une ligne, ou le bloc de code entier. */
function blockContent(block: Block): readonly Atom[] {
  return block.type === 'codeBlock' ? [block] : block.content;
}

/** Met tout le message à plat : marqueur et morceaux de chaque ligne, séparés par des sauts de ligne. */
function toLayout(blocks: readonly Block[]): Layout {
  const atoms: Atom[] = [];
  const lineOf: number[] = [];
  const prefixed: boolean[] = [];
  const positions = analyzeLists(blocks);
  const contents = blocks.map(blockContent);
  blocks.forEach((block, i) => {
    if (i > 0) {
      // Les lignes vides sont traversées (A27) : on compare les lignes non vides de part et d'autre.
      const previous = contents.slice(0, i).reverse().find((c) => c.length > 0)?.at(-1);
      const next = contents.slice(i).find((c) => c.length > 0)?.[0];
      const marks = previous && next ? previous.marks.filter((mark) => next.marks.includes(mark)) : [];
      atoms.push({ type: 'break', marks });
      lineOf.push(-1);
    }
    const prefix = linePrefix(block, positions[i]);
    prefixed.push(prefix !== '');
    if (prefix) {
      atoms.push({ type: 'prefix', text: prefix, marks: [] });
      lineOf.push(i);
    }
    for (const atom of contents[i]) {
      atoms.push(atom);
      lineOf.push(i);
    }
  });
  return { atoms, lineOf, prefixed };
}

/**
 * Règle des styles sur plusieurs lignes (§2.4) : un style qui traverse un saut de ligne doit
 * commencer en début de ligne (avant le marqueur) ou dans une ligne sans marqueur, et finir en fin
 * de ligne ou dans une ligne sans marqueur. Sinon il est refermé et rouvert au saut de ligne.
 */
function settleLineCrossings(layout: Layout): void {
  const { lineOf, prefixed } = layout;
  for (let changed = true; changed; ) {
    changed = false;
    const atoms = layout.atoms;
    // 1. Styles portés par chaque marqueur : ceux qui arrivent de la ligne précédente, et ceux
    //    qui couvrent toute la ligne et continuent sur la suivante.
    layout.atoms = atoms.map((atom, k) => {
      if (atom.type !== 'prefix') return atom;
      const before = atoms[k - 1]?.type === 'break' ? atoms[k - 1].marks : [];
      let end = k + 1;
      while (end < atoms.length && atoms[end].type !== 'break') end++;
      const content = atoms.slice(k + 1, end);
      const after = atoms[end]?.marks ?? [];
      const continuing = after.filter((mark) => content.every((a) => a.marks.includes(mark)));
      const marks = MARK_ORDER.filter((mark) => before.includes(mark) || continuing.includes(mark));
      return { ...atom, marks };
    });
    // 2. Retirer des sauts de ligne les styles qui commencent ou finissent mal.
    const current = layout.atoms;
    const removals = new Map<number, Mark[]>();
    for (const boundary of buildBoundaries(current)) {
      for (const span of boundary.opens) {
        const breaks: number[] = [];
        for (let k = span.start; k < span.end; k++) if (current[k].type === 'break') breaks.push(k);
        if (breaks.length === 0) continue;
        const startOk = current[span.start].type === 'prefix' || !prefixed[lineOf[span.start]];
        const last = span.end - 1;
        const endOk = span.end >= current.length || current[span.end].type === 'break' || !prefixed[lineOf[last]];
        // Retirer le style de toute la suite de sauts de ligne (lignes vides comprises, A27).
        const remove = (k: number) => {
          let first = k;
          while (current[first - 1]?.type === 'break') first--;
          for (let j = first; current[j]?.type === 'break'; j++) {
            removals.set(j, [...(removals.get(j) ?? []), span.mark]);
          }
        };
        if (!startOk) remove(breaks[0]);
        if (!endOk) remove(breaks[breaks.length - 1]);
      }
    }
    if (removals.size > 0) {
      changed = true;
      layout.atoms = current.map((atom, k) =>
        removals.has(k) ? { ...atom, marks: atom.marks.filter((m) => !removals.get(k)!.includes(m)) } : atom,
      );
    }
  }
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

/**
 * Écrit un bloc de code : saut de ligne après l'ouverture, `U+200B` après le premier de trois
 * accents graves (Z4), `> ` devant chaque ligne s'il est cité (D10). Rien n'est échappé.
 */
function writeCodeBlock(block: CodeBlock): string {
  const content = block.segments ? writeAnsi(block.segments) : block.code;
  const body = content.replace(/`(?=``)/g, `\`${ZERO_WIDTH_SPACE}`);
  const lines = ['```' + block.language, ...body.split('\n'), '```'];
  // Citation : `> ` devant chaque ligne (D10) ; puce : 2 espaces (D13, G9, G10).
  return lines.join(block.quote ? '\n> ' : block.inBullet ? '\n  ' : '\n');
}

/**
 * Contenu d'un bloc `ansi` (§6) : chaque passage mis en forme est ouvert par un seul code (styles,
 * fond, texte) et refermé par `<ESC>[0m`, même sur plusieurs lignes (E6). Le reset est placé avant
 * les sauts de ligne qui terminent le passage.
 */
function writeAnsi(segments: readonly AnsiSegment[]): string {
  const sgr = (codes: string) => `${ESC}[${codes}m`;
  return segments
    .map((segment) => {
      if (isPlainAnsiStyle(segment.style)) return segment.text;
      const body = segment.text.replace(/\n+$/, '');
      const trailing = segment.text.slice(body.length);
      return sgr(ansiCodes(segment.style).join(';')) + body + sgr('0') + trailing;
    })
    .join('');
}

/** Les caractères d'un morceau, sans balise. */
function nodeContent(node: Exclude<Atom, LineBreak>): string {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'code':
    case 'codeBlock':
      return node.code;
    case 'raw':
      return node.raw;
    case 'prefix':
      return node.text;
  }
}

/** Texte des morceaux qui suivent `k`, jusqu'à la fin de la ligne. */
function textAfter(atoms: readonly Atom[], k: number): string {
  let result = '';
  for (let i = k + 1; i < atoms.length; i++) {
    const atom = atoms[i];
    if (atom.type === 'break') break;
    result += nodeContent(atom);
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
    if (atom.type === 'raw') return atom.raw; // Réécrit tel quel (S12).
    if (atom.type === 'prefix') return atom.text;
    if (atom.type === 'codeBlock') return writeCodeBlock(atom);
    return escapeText(atom.text, message, {
      // Un marqueur reste interprété derrière des balises ouvrantes (A34, X7, X10)
      // et derrière un autre marqueur (`- -# `, X6).
      atLineStart: k === 0 || atoms[k - 1].type === 'break' || atoms[k - 1].type === 'prefix',
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

  /** Un `*` d'italique écrit juste après « : » formerait l'émoticône `:*` (X4, §9). */
  const followsColon = (k: number, written: string): boolean => {
    const first = [...boundaries[k].closes, ...boundaries[k].opens][0];
    return first?.mark === 'italic' && delimiter(first) === '*' && written.endsWith(':');
  };

  let result = '';
  for (let k = 0; k < boundaries.length; k++) {
    if (followsColon(k, result)) result += ZERO_WIDTH_SPACE;
    result += closeText(k) + (collides(k) ? ZERO_WIDTH_SPACE : '') + openText(k);
    if (k < written.length) result += written[k];
  }
  return result;
}

/** Document → texte Discord. Une ligne par paragraphe ; un style peut continuer sur la ligne suivante. */
export function serialize(message: DiscordDocument): string {
  const blocks = message.blocks.map((block) =>
    block.type === 'paragraph' ? moveSpacesOutOfItalic(block) : block,
  );
  const context = analyzeMessage({ ...message, blocks });
  const layout = toLayout(blocks);
  settleLineCrossings(layout);
  return writeAtomsWithMarks(layout.atoms, context);
}
