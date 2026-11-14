// Découpage d'un document en plusieurs messages (SPEC S20 à S24, docs/discord-rules.md §12, « Découpage »).
// On coupe le document, jamais le texte : chaque morceau devient un petit document, écrit par
// `serialize`, qui referme et rouvre lui-même styles, spoilers, citations, blocs et couleurs.
import {
  analyzeLists,
  ansiBlock,
  code,
  codeBlock,
  createDocument,
  isBlankLine,
  isEmptyQuoteLine,
  layoutLine,
  linkOf,
  raw,
  text,
  timestamp,
  type AnsiSegment,
  type Block,
  type CodeBlock,
  type DiscordDocument,
  type InlineNode,
  type Paragraph,
} from './document';
import { discordLength } from './length';
import { linkEnd } from './links';
import { serialize } from './serialize';

/** Un bloc à placer, avec le numéro qu'il affiche dans le document d'origine (listes numérotées). */
interface Item {
  readonly block: Block;
  readonly number: number | null;
}

/**
 * Coupe le message en messages d'au plus `limit` unités UTF-16 chacun, balises ajoutées comprises.
 * Ordre de préférence : ligne vide ou bord d'un bloc de code, puis entre deux lignes, puis dans une
 * sous-liste (N2, option A) ; dans une ligne : entre phrases, entre mots, puis au caractère près.
 */
export function split(message: DiscordDocument, limit: number): string[] {
  const whole = serialize(message);
  if (discordLength(whole) <= limit) return [whole];
  const positions = analyzeLists(message.blocks);
  let items: Item[] = message.blocks.map((block, i) => {
    const position = positions[i];
    const ordered = block.type === 'paragraph' && block.list?.kind === 'ordered';
    return { block, number: ordered && position && position !== 'too-deep' ? position.number : null };
  });
  const messages: string[] = [];
  while (items.length > 0) {
    // Les lignes vides au bord d'un message disparaissent (J5).
    while (items.length > 0 && isBlankLine(items[0].block)) items.shift();
    if (items.length === 0) break;
    const cut = bestBlockCut(items, limit);
    if (cut) {
      messages.push(cut.text);
      items = items.slice(cut.end);
      continue;
    }
    // Le premier bloc ne tient pas seul : il est coupé à l'intérieur (S23).
    const { head, tail } = splitFirstBlock(items[0], limit);
    messages.push(head);
    items = tail ? [tail, ...items.slice(1)] : items.slice(1);
  }
  return messages;
}

/**
 * Préférence d'une coupe entre `before` et `after` : 0 au bord d'une ligne vide ou d'un bloc de code,
 * 1 entre deux lignes, 2 juste avant un sous-élément ou un bloc placé dans une puce (N2, option A).
 */
function blockCutTier(before: Block, after: Block): number {
  if (isBlankLine(before) || isBlankLine(after)) return 0;
  if (after.type === 'codeBlock' && after.inBullet) return 2;
  if (before.type === 'codeBlock' || after.type === 'codeBlock') return 0;
  if (after.list && after.list.level > 1) return 2;
  return 1;
}

/** La coupe entre blocs la plus naturelle, la plus loin possible ; `null` si le premier bloc ne tient pas seul. */
function bestBlockCut(items: readonly Item[], limit: number): { end: number; text: string } | null {
  const fits = new Map<number, string>();
  for (let end = 1; end <= items.length; end++) {
    const written = writeMessage(items.slice(0, end));
    if (written === null) continue;
    if (discordLength(written) > limit) break;
    fits.set(end, written);
  }
  const tierOf = (end: number) => (end === items.length ? 0 : blockCutTier(items[end - 1].block, items[end].block));
  for (let tier = 0; tier <= 2; tier++) {
    const ends = [...fits.keys()].filter((end) => tierOf(end) <= tier);
    if (ends.length > 0) {
      const end = Math.max(...ends);
      return { end, text: fits.get(end)! };
    }
  }
  return null;
}

/**
 * Écrit un morceau du document comme un message à part entière, ou `null` s'il n'est pas valide.
 * Retouches : bloc de puce en tête écrit hors de la liste ; sous-liste en tête remontée d'un
 * niveau (N2, option A) ; numérotation reprise (N1) ; ligne citée vide en fin retirée (G28, G30).
 */
function writeMessage(items: readonly Item[]): string | null {
  const blocks = items.map((item) => item.block);
  const first = blocks[0];
  if (first?.type === 'codeBlock' && first.inBullet) blocks[0] = { ...first, inBullet: false };
  while (blocks.length > 0 && isEmptyQuoteLine(blocks[blocks.length - 1])) blocks.pop();
  liftDetachedSublists(blocks);
  const positions = analyzeLists(blocks);
  const numbered = blocks.map((block, i): Block => {
    const position = positions[i];
    if (block.type !== 'paragraph' || block.list?.kind !== 'ordered' || !position || position === 'too-deep') {
      return block;
    }
    return { ...block, list: { ...block.list, start: position.first ? (items[i]?.number ?? 1) : null } };
  });
  try {
    return serialize(createDocument(...numbered));
  } catch {
    return null;
  }
}

/** Sous-liste sans parent (en tête de message) : elle remonte au niveau libre, avec ses sous-éléments. */
function liftDetachedSublists(blocks: Block[]): void {
  for (let guard = 0; guard < blocks.length; guard++) {
    const positions = analyzeLists(blocks);
    const k = positions.indexOf('too-deep');
    if (k < 0) return;
    const start = blocks[k] as Paragraph;
    const level = start.list!.level;
    const previous = blocks[k - 1];
    const parentLevel = previous?.type === 'paragraph' && previous.list && previous.quote === start.quote
      ? previous.list.level
      : 0;
    const delta = level - parentLevel - 1;
    for (let i = k; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.type === 'codeBlock' && block.inBullet) continue;
      if (block.type !== 'paragraph' || !block.list || block.list.level < level) break;
      blocks[i] = { ...block, list: { ...block.list, level: block.list.level - delta } };
    }
  }
}

/** Coupe le premier bloc (trop long à lui seul) : le début, écrit, et la suite, à placer ensuite. */
function splitFirstBlock(item: Item, limit: number): { head: string; tail: Item | null } {
  const write = (block: Block) => writeMessage([{ ...item, block }]);
  if (item.block.type === 'paragraph') {
    // Un lien trop long pour tenir, même réduit à un caractère, devient du texte (S23).
    const block = { ...item.block, content: withoutOversizedLinks(item.block.content, limit) };
    const written = write(block);
    if (written !== null && discordLength(written) <= limit) return { head: written, tail: null };
    item = { ...item, block };
  }
  const pieces = item.block.type === 'paragraph'
    ? paragraphCuts(item.block)
    : codeBlockCuts(item.block);
  for (let tier = 0; tier < pieces.tiers; tier++) {
    const candidates = pieces.cuts.filter((cut) => cut.tier <= tier);
    const found = furthestFitting(candidates, (cut) => {
      const written = write(cut.head);
      return written !== null && discordLength(written) <= limit ? written : null;
    });
    if (found) return { head: found.written, tail: { ...item, block: found.cut.tail } };
  }
  // Rien ne tient (limite minuscule) : le plus petit début possible, pour avancer quand même.
  const smallest = pieces.cuts.find((cut) => write(cut.head) !== null);
  if (smallest) return { head: write(smallest.head)!, tail: { ...item, block: smallest.tail } };
  return { head: write(item.block) ?? serialize({ blocks: [item.block] }), tail: null };
}

/** Une coupe possible dans un bloc : préférence (0 = la meilleure), début et suite. */
interface BlockCut {
  readonly tier: number;
  readonly head: Block;
  readonly tail: Block;
}

/** Les coupes d'un bloc, dans l'ordre du texte. */
interface BlockCuts {
  readonly cuts: readonly BlockCut[];
  readonly tiers: number;
}

/**
 * La coupe la plus loin dont le début tient : recherche par dichotomie (la longueur croît avec
 * le début), puis vérification en reculant si besoin.
 */
function furthestFitting<T>(candidates: readonly T[], fit: (candidate: T) => string | null):
  { cut: T; written: string } | null {
  let low = 0;
  let high = candidates.length - 1;
  let best = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (fit(candidates[middle]) !== null) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  for (let i = best >= 0 ? best : candidates.length - 1; i >= 0; i--) {
    const written = fit(candidates[i]);
    if (written !== null) return { cut: candidates[i], written };
  }
  return null;
}

const graphemes = new Intl.Segmenter('fr', { granularity: 'grapheme' });

/** Les caractères visibles d'un texte (un émoji composé reste entier), avec leur position. */
function graphemeRanges(content: string): { start: number; end: number; char: string }[] {
  return [...graphemes.segment(content)].map((s) => ({ start: s.index, end: s.index + s.segment.length, char: s.segment }));
}

/** Un caractère d'une ligne : dans quel morceau, à quelle position, et de quelle sorte. */
interface Unit {
  readonly node: number;
  readonly start: number;
  readonly end: number;
  readonly char: string;
  /** Coupable seulement au caractère près (code en ligne), ou en tout dernier recours (morceau brut). */
  readonly inner: 'none' | 'code' | 'raw';
  readonly inLink: boolean;
}

const SPACE = /^\s+$/u;
const SENTENCE_END = /[.!?…]/u;
const CLOSERS = /[)»"'’\]]/u;

/** Lien dont même un seul caractère ne tiendrait pas dans la limite : il devient du texte (S23). */
function withoutOversizedLinks(content: readonly InlineNode[], limit: number): InlineNode[] {
  return content.map((node) => {
    const target = linkOf(node);
    if (!target || discordLength(`[x${linkEnd(target)}`) <= limit) return node;
    if (node.type === 'text') return text(node.text, node.marks);
    if (node.type === 'code') return code(node.code, node.marks);
    if (node.type === 'timestamp') return timestamp(node.seconds, node.style, node.marks);
    return node;
  });
}

function lineUnits(content: readonly InlineNode[]): Unit[] {
  return content.flatMap((node, index): Unit[] => {
    const inLink = linkOf(node) !== undefined;
    if (node.type === 'text' || node.type === 'code' || node.type === 'raw') {
      const value = node.type === 'text' ? node.text : node.type === 'code' ? node.code : node.raw;
      const inner = node.type === 'text' ? 'none' : node.type;
      return graphemeRanges(value).map((r) => ({ node: index, ...r, inner, inLink }));
    }
    return [{ node: index, start: 0, end: 0, char: '', inner: 'none', inLink }];
  });
}

/** Les morceaux d'une ligne entre deux caractères `from` et `to` (exclu). */
function sliceLine(content: readonly InlineNode[], units: readonly Unit[], from: number, to: number): InlineNode[] {
  const nodes: InlineNode[] = [];
  let k = from;
  while (k < to) {
    const index = units[k].node;
    let end = k;
    while (end < to && units[end].node === index) end++;
    const node = content[index];
    const [start, stop] = [units[k].start, units[end - 1].end];
    if (node.type === 'text') nodes.push(text(node.text.slice(start, stop), node.marks, node.link));
    else if (node.type === 'code') nodes.push(code(node.code.slice(start, stop), node.marks, node.link));
    else if (node.type === 'raw') nodes.push(raw(node.raw.slice(start, stop), node.marks));
    else nodes.push(node);
    k = end;
  }
  return nodes;
}

/**
 * Coupes possibles dans une ligne. Préférences : 0 entre deux phrases, 1 entre deux mots, 2 entre
 * deux mots d'un lien, 3 au caractère près (code en ligne compris), 4 dans un morceau brut.
 * Les espaces de la coupe ne sont écrits nulle part (N7).
 */
function paragraphCuts(block: Paragraph): BlockCuts {
  const content = block.content;
  const units = lineUnits(content);
  const layout = { quote: block.quote, style: block.style, list: block.list ? { kind: block.list.kind, level: block.list.level } : undefined };
  const isSpace = (u: Unit | undefined) => u !== undefined && u.inner === 'none' && SPACE.test(u.char);
  const cuts: BlockCut[] = [];
  for (let c = 1; c < units.length; c++) {
    const [before, after] = [units[c - 1], units[c]];
    let tier: number;
    if (isSpace(after) && !isSpace(before)) {
      const sentence = SENTENCE_END.test(before.char)
        || (CLOSERS.test(before.char) && SENTENCE_END.test(units[c - 2]?.char ?? ''));
      tier = after.inLink && before.inLink ? 2 : sentence ? 0 : 1;
    } else if (isSpace(after) || isSpace(before)) {
      continue; // Une coupe dans une suite d'espaces est déjà proposée à son début.
    } else {
      tier = before.node === after.node && after.inner === 'raw' ? 4 : 3;
    }
    let headEnd = c;
    while (headEnd > 0 && isSpace(units[headEnd - 1])) headEnd--;
    let tailStart = c;
    while (tailStart < units.length && isSpace(units[tailStart])) tailStart++;
    if (headEnd === 0 || tailStart === units.length) continue;
    try {
      const head = layoutLine(layout, ...sliceLine(content, units, 0, headEnd));
      const tail = layoutLine(layout, ...sliceLine(content, units, tailStart, units.length));
      cuts.push({ tier, head, tail });
    } catch {
      // Coupe impossible (code en ligne avec un accent grave au bord…) : on l'ignore.
    }
  }
  return { cuts, tiers: 5 };
}

/** Les morceaux colorés entre deux positions du texte du bloc. */
function sliceSegments(segments: readonly AnsiSegment[], from: number, to: number): AnsiSegment[] {
  const sliced: AnsiSegment[] = [];
  let offset = 0;
  for (const segment of segments) {
    const [start, end] = [offset, offset + segment.text.length];
    offset = end;
    const [a, b] = [Math.max(start, from), Math.min(end, to)];
    if (a < b) sliced.push({ text: segment.text.slice(a - start, b - start), style: segment.style });
  }
  return sliced;
}

/**
 * Coupes possibles dans un bloc de code trop long (choix 2A) : 0 entre deux lignes (le saut de ligne
 * disparaît), 1 au caractère près. Le bloc est refermé puis rouvert avec le même langage.
 */
function codeBlockCuts(block: CodeBlock): BlockCuts {
  const ranges = graphemeRanges(block.code);
  const options = { marks: block.marks, quote: block.quote, inBullet: block.inBullet };
  const piece = (from: number, to: number): CodeBlock => (block.segments
    ? ansiBlock(sliceSegments(block.segments, from, to), options)
    : codeBlock(block.code.slice(from, to), { ...options, language: block.language }));
  const cuts: BlockCut[] = [];
  for (let c = 1; c < ranges.length; c++) {
    const atNewline = ranges[c].char === '\n';
    if (!atNewline && ranges[c - 1].char === '\n') continue; // Déjà proposée au saut de ligne.
    try {
      const head = piece(0, ranges[c].start);
      const tail = piece(atNewline ? ranges[c].end : ranges[c].start, block.code.length);
      cuts.push({ tier: atNewline ? 0 : 1, head, tail });
    } catch {
      // Morceau vide (lignes vides seulement) : coupe ignorée.
    }
  }
  return { cuts, tiers: 2 };
}
