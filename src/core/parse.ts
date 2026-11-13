// Lecture du texte Discord en document (docs/discord-rules.md §1, §2.3, §3, §4, §5, §11).
// Méthode de Discord : à chaque position, on essaie les règles dans un ordre fixe ; pour `*` et `_`,
// la règle qui couvre le plus long morceau l'emporte. Ce qui n'est pas reconnu reste du texte,
// et ce que le document ne sait pas encore représenter devient un morceau brut, réécrit tel quel (S12).
import { ZERO_WIDTH_SPACE } from './characters';
import {
  analyzeLists,
  code,
  codeBlock,
  createDocument,
  layoutLine,
  MAX_LIST_LEVEL,
  paragraph,
  raw,
  text,
  type Block,
  type CodeBlock,
  type DiscordDocument,
  type InlineNode,
  type LineLayout,
  type Mark,
} from './document';

/** Résultat brut de la lecture, avant le découpage en lignes. */
type Piece =
  | {
      /** `marker` : marqueur de début de ligne (`> `, `- `, `1. `, `# `…). */
      readonly kind: 'text' | 'code' | 'raw' | 'marker';
      readonly value: string;
      readonly marks: readonly Mark[];
    }
  | {
      readonly kind: 'codeBlock';
      readonly block: CodeBlock;
      /** Texte d'origine, réécrit tel quel si le bloc s'avère mal placé. */
      readonly value: string;
      readonly marks: readonly Mark[];
    };

/** Un style trouvé à une position : son contenu (à relire) et la longueur totale lue. */
interface StyleMatch {
  readonly mark: Mark;
  readonly content: string;
  readonly length: number;
  /** Départage : à longueur égale, l'italique l'emporte sur le gras, qui l'emporte sur le souligné. */
  readonly quality: number;
}

/** `\` suivi d'un caractère autre qu'une lettre non accentuée, un chiffre ou un espace (C17, C19). */
const ESCAPE = /^\\([^0-9A-Za-z\s])/u;
/**
 * Bloc de code sous la forme écrite par l'appli : langage (un mot) puis saut de ligne, contenu sans
 * trois accents graves (F5), fermeture seule en début de ligne. Rien n'y est interprété.
 */
const PLAIN_BLOCK = /^```([^\s`]*)\n((?:(?!```)[\s\S])*?)\n```(?=\n|$)/;
/** Le même dans une citation : `> ` devant chaque ligne (D10). */
const QUOTED_BLOCK = /^```([^\s`]*)\n((?:> (?:(?!```)[^\n])*\n)*?)> ```(?=\n|$)/;
/** Autres formes de bloc (F3, F5, bloc indenté de D13) : conservées brutes. */
const CODE_BLOCK = /^```[\s\S]*?```/;
/** Espace invisible placé par l'appli entre le premier et le deuxième de trois accents graves (Z4). */
const BLOCK_ZERO_WIDTH = new RegExp(`\`${ZERO_WIDTH_SPACE}(?=\`\`)`);
const INLINE_CODE = /^(`+)([\s\S]*?[^`])\1(?!`)/;
/** Mentions, émojis personnalisés, horodatages, commandes, liens sans aperçu (étape 5, §4). */
const ANGLE = /^<(?:@!?|@&|#|:|a:|t:|\/|id:|https?:\/\/)[^<>\n]*>/;
/** Lien masqué (C16). */
const MASKED_LINK = /^\[[^\]\n]*\]\([^)\s]+\)/;
/** Adresse : jusqu'au premier espace ou `<`, sans ponctuation finale (C21, §4). */
const URL = /^https?:\/\/[^\s<]+[^<.,:;"')\]\s]/;
/** Débuts de ligne : titre, sous-texte, puce, liste numérotée, citation. */
const LINE_MARKER = /^[ \t]*(?:#+ |-# |[-*] |\d+\. |>+ )/;
/** Marqueur de liste : indentation en espaces, puis `-`, `*` ou un numéro (sans zéro inutile). */
const LIST_MARKER = /^( *)(?:[-*]|(0|[1-9]\d{0,8})\.) $/;
const HEADING_MARKER = /^(#{1,3}) $/;

const STYLE_RULES: readonly { mark: Mark; pattern: RegExp; bonus: number }[] = [
  { mark: 'spoiler', pattern: /^\|\|((?:\\[\s\S]|[^\\])+?)\|\|/, bonus: 0 },
  { mark: 'strike', pattern: /^~~((?:\\[\s\S]|[^\\])+?)~~/, bonus: 0 },
  { mark: 'bold', pattern: /^\*\*((?:\\[\s\S]|[^\\])+?)\*\*(?!\*)/, bonus: 0.1 },
  { mark: 'underline', pattern: /^__((?:\\[\s\S]|[^\\])+?)__(?!_)/, bonus: 0 },
  // Italique `*` : jamais suivi d'un espace à l'ouverture (C1, A29) ; un `*` seul ne peut pas
  // être dans le contenu, seulement une paire `**` (A31).
  { mark: 'italic', pattern: /^\*(?=\S)((?:\*\*|\\[\s\S]|[^\\*])+?)\*(?!\*)/, bonus: 0.2 },
  // Italique `_` : la fermeture n'est pas suivie d'une lettre ou d'un chiffre (B1) ; l'ouverture
  // peut être collée à une lettre (A30).
  { mark: 'italic', pattern: /^_((?:__|\\[\s\S]|[^\\_])+?)_(?![\p{L}\p{N}_])/u, bonus: 0.2 },
];

const ASCII_ALNUM = /[0-9A-Za-z]/;

/** Le style le plus long qui commence ici (règle de Discord pour `*`, `**`, `_`, `__`). */
function matchStyle(source: string): StyleMatch | null {
  let best: StyleMatch | null = null;
  for (const rule of STYLE_RULES) {
    const match = rule.pattern.exec(source);
    if (!match) continue;
    const candidate: StyleMatch = {
      mark: rule.mark,
      content: match[1],
      length: match[0].length,
      quality: match[0].length + rule.bonus,
    };
    if (!best || candidate.quality > best.quality) best = candidate;
  }
  return best;
}

/**
 * Code en ligne reconnu seulement sous les formes testées : un accent grave de chaque côté,
 * ou deux si le contenu en contient un (A16). Le reste (forme douteuse) reste brut.
 */
function inlineCode(fence: string, content: string): string | null {
  if (content.includes('\n') || /^\s|\s$/u.test(content)) return null;
  if (fence.length !== (content.includes('`') ? 2 : 1)) return null;
  try {
    return code(content).code;
  } catch {
    return null; // Forme que le document refuse (accent grave en bord ou doublé).
  }
}

/** Bloc de code reconnu à cette position, ou `null`. `prefix` : marqueurs déjà lus sur la ligne. */
function matchCodeBlock(rest: string, prefix: string, marks: readonly Mark[]): Piece | null {
  const quote = prefix === '> ';
  if (prefix !== '' && !quote) return null; // Bloc dans une puce ou un titre : non pris en charge.
  const match = (quote ? QUOTED_BLOCK : PLAIN_BLOCK).exec(rest);
  if (!match) return null;
  let content = quote
    ? match[2].split('\n').slice(0, -1).map((line) => line.slice(2)).join('\n')
    : match[2];
  while (BLOCK_ZERO_WIDTH.test(content)) content = content.replace(BLOCK_ZERO_WIDTH, '`');
  try {
    const block = codeBlock(content, { language: match[1], marks, quote });
    return { kind: 'codeBlock', block, value: match[0], marks };
  } catch {
    return null; // Bloc vide, ou ligne vide dans un bloc cité : conservé brut.
  }
}

/**
 * Lit un morceau de texte. `linePrefix` : `null` si le morceau ne commence pas une ligne, sinon les
 * marqueurs déjà lus sur cette ligne (un style ouvert en début de ligne laisse son contenu en
 * début de ligne : `~~- a` est une puce, X7).
 */
function parseRange(source: string, marks: readonly Mark[], linePrefix: string | null): Piece[] {
  const pieces: Piece[] = [];
  const push = (kind: 'text' | 'code' | 'raw' | 'marker', value: string) =>
    pieces.push({ kind, value, marks });
  let prefix = linePrefix;
  let i = 0;
  while (i < source.length) {
    if (i > 0 && source[i - 1] === '\n') prefix = '';
    const lineStart = prefix;
    const rest = source.slice(i);
    if (lineStart !== null) {
      const marker = LINE_MARKER.exec(rest);
      if (marker) {
        push('marker', marker[0]);
        i += marker[0].length;
        // Marqueurs enchaînés (`- -# `, X6) : la position reste un début de ligne.
        prefix = lineStart + marker[0];
        continue;
      }
      const block = matchCodeBlock(rest, lineStart, marks);
      if (block) {
        pieces.push(block);
        i += block.value.length;
        prefix = null;
        continue;
      }
    }
    prefix = null;

    const escape = ESCAPE.exec(rest);
    if (escape) {
      push('text', escape[1]);
      i += escape[0].length;
      continue;
    }

    const rawMatch =
      CODE_BLOCK.exec(rest) ??
      ANGLE.exec(rest) ??
      MASKED_LINK.exec(rest) ??
      (i === 0 || !ASCII_ALNUM.test(source[i - 1]) ? URL.exec(rest) : null);
    if (rawMatch) {
      push('raw', rawMatch[0]);
      i += rawMatch[0].length;
      continue;
    }

    const codeMatch = INLINE_CODE.exec(rest);
    if (codeMatch) {
      const content = inlineCode(codeMatch[1], codeMatch[2]);
      push(content === null ? 'raw' : 'code', content ?? codeMatch[0]);
      i += codeMatch[0].length;
      continue;
    }

    const style = matchStyle(rest);
    if (style) {
      const starItalic = rest[0] === '*' && style.mark === 'italic';
      let content = style.content;
      if (starItalic) {
        // Un espace avant la fermeture d'un italique `*` est perdu (A18).
        content = content.replace(/ +$/u, '');
        // Espace invisible placé par l'appli entre « : » et `*` (§9) : l'écriture le remet.
        if (content.endsWith(`:${ZERO_WIDTH_SPACE}`)) content = content.slice(0, -1);
        const last = pieces.length - 1;
        if (pieces[last]?.value === ZERO_WIDTH_SPACE && pieces[last - 1]?.value.endsWith(':')) {
          pieces.pop();
        }
      }
      pieces.push(...parseRange(content, [...marks, style.mark], lineStart));
      i += style.length;
      continue;
    }

    push('text', source[i]);
    i += 1;
  }
  return pieces;
}

function toNode(kind: 'text' | 'code' | 'raw' | 'marker', value: string, marks: readonly Mark[]): InlineNode {
  if (kind === 'code') return code(value, marks);
  return kind === 'text' ? text(value, marks) : raw(value, marks);
}

/**
 * Retire l'espace invisible placé entre deux morceaux stylés : l'appli le remet à l'écriture
 * là où il évite une collision (§2.3, Z1 à Z3).
 */
function dropBoundaryZeroWidthSpaces(nodes: readonly InlineNode[]): InlineNode[] {
  const content = paragraph(...nodes).content;
  const onlyZeroWidth = new RegExp(`^${ZERO_WIDTH_SPACE}+$`, 'u');
  return content.filter(
    (node, i) =>
      !(node.type === 'text' && onlyZeroWidth.test(node.text) && i > 0 && i < content.length - 1),
  );
}

/** Une ligne lue, avant l'interprétation de ses marqueurs. */
interface RawLine {
  readonly markers: Piece[];
  readonly nodes: InlineNode[];
  block?: CodeBlock;
  /** Les marqueurs à partir de cette position sont gardés bruts (niveau de liste sauté). */
  keepRawFrom: number;
}

/** Découpe la lecture en lignes. Un bloc de code mal placé (texte sur sa ligne) redevient brut. */
function toRawLines(pieces: readonly Piece[]): RawLine[] {
  const newLine = (): RawLine => ({ markers: [], nodes: [], keepRawFrom: Infinity });
  const lines: RawLine[] = [newLine()];
  pieces.forEach((piece, p) => {
    const current = lines[lines.length - 1];
    if (piece.kind === 'marker') {
      current.markers.push(piece);
      return;
    }
    if (piece.kind === 'codeBlock') {
      const next = pieces[p + 1];
      if (current.nodes.length === 0 && !current.block && (!next || next.value.startsWith('\n'))) {
        current.block = piece.block;
        return;
      }
    }
    piece.value.split('\n').forEach((segment, index) => {
      if (index > 0) lines.push(newLine());
      const kind = piece.kind === 'codeBlock' ? 'raw' : piece.kind;
      if (segment !== '') lines[lines.length - 1].nodes.push(toNode(kind, segment, piece.marks));
    });
  });
  return lines;
}

/**
 * Interprète les marqueurs d'une ligne, dans l'ordre permis : citation, puis liste, puis titre ou
 * sous-texte (§3, §10). Le premier marqueur qui ne convient pas, et ceux qui le suivent, restent
 * bruts (S12). Renvoie aussi la position du marqueur de liste.
 */
function interpretLine(line: RawLine): { block: Block; listMarker: number } {
  if (line.block) return { block: line.block, listMarker: -1 };
  let quote = false;
  let list: LineLayout['list'];
  let style: LineLayout['style'] = 'normal';
  let listMarker = -1;
  let used = 0;
  for (const marker of line.markers) {
    if (used >= line.keepRawFrom) break;
    const value = marker.value;
    const listMatch = LIST_MARKER.exec(value);
    const headingMatch = HEADING_MARKER.exec(value);
    if (value === '> ' && used === 0) {
      quote = true;
    } else if (listMatch && !list && style === 'normal') {
      const indent = listMatch[1].length;
      const level = indent / 2 + 1;
      if (indent % 2 !== 0 || level > MAX_LIST_LEVEL) break;
      const number = listMatch[2];
      list = number === undefined
        ? { kind: 'bullet', level }
        : { kind: 'ordered', level, start: Number(number) };
      listMarker = used;
    } else if (headingMatch && !list && style === 'normal') {
      style = `heading${headingMatch[1].length as 1 | 2 | 3}`;
    } else if (value === '-# ' && style === 'normal' && !quote) {
      style = 'subtext';
    } else {
      break;
    }
    used++;
  }
  const rawMarkers = line.markers.slice(used).map((m) => raw(m.value, m.marks));
  const content = dropBoundaryZeroWidthSpaces([...rawMarkers, ...line.nodes]);
  try {
    return { block: layoutLine({ quote, list, style }, ...content), listMarker };
  } catch {
    // Ligne mise en page sans contenu (`# ` seul…) : tout reste brut.
    const all = line.markers.map((m) => raw(m.value, m.marks));
    return { block: paragraph(...dropBoundaryZeroWidthSpaces([...all, ...line.nodes])), listMarker: -1 };
  }
}

/**
 * Lit les listes comme Discord : un sous-niveau sans parent reste brut ; chaque élément prend le
 * type du premier élément de sa sous-liste (D3) ; seul le premier numéro compte (G1, G2).
 */
function toBlocks(lines: RawLine[]): Block[] {
  for (;;) {
    const results = lines.map(interpretLine);
    const blocks = results.map((r) => r.block);
    const positions = analyzeLists(blocks);
    let demoted = false;
    positions.forEach((position, i) => {
      if (position === 'too-deep') {
        lines[i].keepRawFrom = results[i].listMarker;
        demoted = true;
      }
    });
    if (demoted) continue;
    return blocks.map((block, i) => {
      const position = positions[i];
      if (block.type !== 'paragraph' || !block.list || position === null || position === 'too-deep') {
        return block;
      }
      const start = position.first && position.kind === 'ordered' ? block.list.start : null;
      return layoutLine(
        { quote: block.quote, style: block.style, list: { kind: position.kind, level: block.list.level, start } },
        ...block.content,
      );
    });
  }
}

/** Texte Discord → document. Rien n'est perdu : ce qui n'est pas reconnu reste du texte ou du brut. */
export function parse(message: string): DiscordDocument {
  if (message === '') return createDocument();
  return createDocument(...toBlocks(toRawLines(parseRange(message, [], ''))));
}
