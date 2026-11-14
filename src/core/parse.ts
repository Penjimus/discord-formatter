// Lecture du texte Discord en document (docs/discord-rules.md §1, §2.3, §3, §4, §5, §11).
// Méthode de Discord : à chaque position, on essaie les règles dans un ordre fixe ; pour `*` et `_`,
// la règle qui couvre le plus long morceau l'emporte. Ce qui n'est pas reconnu reste du texte,
// et ce que le document ne sait pas encore représenter devient un morceau brut, réécrit tel quel (S12).
import { ESC, ZERO_WIDTH_SPACE } from './characters';
import {
  analyzeLists,
  ansiBlock,
  ansiStyle,
  blockInBulletProblem,
  emptyQuoteLine,
  emptyQuoteLineProblem,
  isStyledOutsideBullet,
  listLevelBefore,
  code,
  codeBlock,
  type AnsiSegment,
  type AnsiStyle,
  type CodeBlockOptions,
  createDocument,
  layoutLine,
  MAX_LIST_LEVEL,
  mention,
  type MentionKind,
  paragraph,
  raw,
  text,
  timestamp,
  type TimestampStyle,
  type Block,
  type CodeBlock,
  type DiscordDocument,
  type InlineNode,
  type LineLayout,
  type Mark,
} from './document';
import { EMOJI_CODE } from './escape';
import { emoticonAt } from './emoticons';

type PieceKind = 'text' | 'code' | 'raw' | 'marker' | 'element';

/** Résultat brut de la lecture, avant le découpage en lignes. */
type Piece =
  | {
      /** `marker` : marqueur de début de ligne (`> `, `- `, `1. `, `# `…). */
      /** `element` : mention ou horodatage, sous sa forme écrite. */
      readonly kind: PieceKind;
      readonly value: string;
      readonly marks: readonly Mark[];
    }
  | {
      readonly kind: 'codeBlock';
      readonly block: CodeBlock;
      /** Texte d'origine, réécrit tel quel si le bloc s'avère mal placé. */
      readonly value: string;
      readonly marks: readonly Mark[];
      /** Bloc placé sous une puce : nombre d'espaces devant chaque ligne. */
      readonly indent: number;
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
/** Début d'un bloc sous une puce : un nombre pair d'espaces (2 par niveau) puis l'ouverture. */
const BULLET_BLOCK_START = /^((?: {2})+)```/;

/**
 * Le même sous une puce : `indent` espaces devant chaque ligne, 2 au niveau 1 (D13, G9, G10),
 * 2 × N au niveau N (généralisé, §10).
 */
function bulletBlockPattern(indent: number): RegExp {
  const spaces = ' '.repeat(indent);
  return new RegExp(`^${spaces}\`\`\`([^\\s\`]*)\\n((?:${spaces}(?:(?!\`\`\`)[^\\n])*\\n)*?)${spaces}\`\`\`(?=\\n|$)`);
}
/** Balise ANSI : `<ESC>[`, codes séparés par `;`, puis `m` (§6). */
const ANSI_TAG = new RegExp(`${ESC}\\[([0-9;]*)m`, 'g');
/** Autres formes de bloc (F3, F5, bloc mal indenté sous une puce) : conservées brutes. */
const CODE_BLOCK = /^```[\s\S]*?```/;
/** Espace invisible placé par l'appli entre le premier et le deuxième de trois accents graves (Z4). */
const BLOCK_ZERO_WIDTH = new RegExp(`\`${ZERO_WIDTH_SPACE}(?=\`\`)`);
const INLINE_CODE = /^(`+)([\s\S]*?[^`])\1(?!`)/;
/** Mention, sous les formes écrites par l'appli : identifiant en chiffres, ou modèle (§7). */
const MENTION = /^<(@&|@|#)([0-9]+|[A-Z_]+)>/;
const MENTION_KINDS: Readonly<Record<string, MentionKind>> = { '@': 'user', '@&': 'role', '#': 'channel' };
/** Horodatage : secondes sans zéro inutile, style facultatif (§8). */
const TIMESTAMP = /^<t:(0|[1-9][0-9]*)(?::([tTdDfFsSR]))?>/;
/** Autres formes entre chevrons (émojis personnalisés, commandes, liens sans aperçu…) : brutes (§4, §7). */
const ANGLE = /^<(?:@!?|@&|#|:|a:|t:|\/|id:|https?:\/\/)[^<>\n]*>/;
/** Lien masqué (C16). */
const MASKED_LINK = /^\[[^\]\n]*\]\([^)\s]+\)/;
/** Adresse : jusqu'au premier espace ou `<`, sans ponctuation finale (C21, §4). */
const URL = /^https?:\/\/[^\s<]+[^<.,:;"')\]\s]/;
/** Débuts de ligne : titre, sous-texte, puce, liste numérotée, citation. */
/** `>` seul sur sa ligne : ligne citée vide (G30). */
const LINE_MARKER = /^[ \t]*(?:#+ |-# |[-*] |\d+\. |>+ |>(?=\n|$))/;
/** Marqueur de liste : indentation en espaces, puis `-`, `*` ou un numéro (sans zéro inutile). */
const LIST_MARKER = /^( *)(?:[-*]|(0|[1-9]\d{0,8})\.) $/;
const HEADING_MARKER = /^(#{1,3}) $/;
/** Émoticône `:*`, convertie en 😗 par Discord (X4) ; `:**` n'en est pas une (A35). */
const EMOTICON_KISS = /^:\*(?!\*)/;

const STYLE_RULES: readonly { mark: Mark; pattern: RegExp; bonus: number }[] = [
  { mark: 'spoiler', pattern: /^\|\|((?:\\[\s\S]|[^\\])+?)\|\|/, bonus: 0 },
  { mark: 'strike', pattern: /^~~((?:\\[\s\S]|[^\\])+?)~~/, bonus: 0 },
  { mark: 'bold', pattern: /^\*\*((?:\\[\s\S]|[^\\])+?)\*\*(?!\*)/, bonus: 0.1 },
  { mark: 'underline', pattern: /^__((?:\\[\s\S]|[^\\])+?)__(?!_)/, bonus: 0 },
  // Italique `*` : jamais suivi d'un espace à l'ouverture (C1, A29) ; un `*` seul ne peut pas
  // être dans le contenu, seulement une paire `**` (A31). Le `*` de l'émoticône `:*` ne ferme pas
  // l'italique : Discord l'a déjà converti en 😗 (X4, §9).
  { mark: 'italic', pattern: /^\*(?=\S)((?:\*\*|\\[\s\S]|:\*(?!\*)|[^\\*])+?)(?<!:)\*(?!\*)/, bonus: 0.2 },
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

/**
 * Applique une balise ANSI (codes sans `<ESC>[` ni `m`) à une mise en forme. `null` si un code
 * n'est pas testé (§6) : le bloc entier reste alors tel quel.
 */
function applyAnsiCodes(style: AnsiStyle, codes: string): AnsiStyle | null {
  if (codes === '') return style; // `<ESC>[m` ne réinitialise pas (E12).
  const parts = codes.split(';');
  if (!parts.every((part) => /^(?:0|[1-9]\d*)$/.test(part))) return null;
  // Un `0`, à n'importe quelle place, efface ce que les balises précédentes avaient mis ; les autres
  // codes de la balise s'appliquent quand même (E12 `0;31`, E14a `31;0` et `3;0`).
  const next: Partial<Record<keyof AnsiStyle, unknown>> = parts.includes('0') ? ansiStyle() : { ...style };
  for (let i = 0; i < parts.length; i++) {
    const value = Number(parts[i]);
    if (value === 0 || value === 2 || value === 7) continue; // 2 et 7 : sans effet (E13, X3).
    else if (value === 1) next.bold = true;
    else if (value === 3) next.italic = true;
    else if (value === 4) next.underline = true;
    else if (value === 9) next.strike = true; // Barré (E13, E15).
    else if ((value >= 30 && value <= 37) || (value >= 90 && value <= 97)) next.color = value; // Clairs : E16.
    else if ((value >= 40 && value <= 47) || (value >= 100 && value <= 107)) next.background = value;
    else if ((value === 38 || value === 48) && parts[i + 1] === '5' && i + 2 < parts.length) {
      const index = Number(parts[i + 2]);
      if (index > 255) return null;
      // Mode 256 couleurs (E13, E15, E16).
      next[value === 38 ? 'color' : 'background'] = { index };
      i += 2;
    } else if ((value === 38 || value === 48) && parts[i + 1] === '2' && i + 4 < parts.length) {
      const [r, g, b] = parts.slice(i + 2, i + 5).map(Number);
      if (![r, g, b].every((part) => part <= 255)) return null;
      // Couleur au choix (X3), fond au choix (E14a).
      next[value === 38 ? 'color' : 'background'] = { r, g, b };
      i += 4;
    } else return null;
  }
  return ansiStyle(next as Partial<AnsiStyle>);
}

/**
 * Lit le contenu d'un bloc `ansi` (§6, E3, E4, E6, E12). `null` si le contenu n'a aucune balise, ou
 * contient une forme non testée : il est alors gardé tel quel (S12).
 */
function readAnsi(content: string): AnsiSegment[] | null {
  const segments: AnsiSegment[] = [];
  let style = ansiStyle();
  let last = 0;
  let found = false;
  for (const match of content.matchAll(ANSI_TAG)) {
    found = true;
    segments.push({ text: content.slice(last, match.index), style });
    const next = applyAnsiCodes(style, match[1]);
    if (!next) return null;
    style = next;
    last = match.index + match[0].length;
  }
  segments.push({ text: content.slice(last), style });
  const plain = segments.map((segment) => segment.text).join('');
  // ESC isolé, ou ligne du bord qui ne contient qu'une balise : forme douteuse.
  if (!found || plain.includes(ESC) || plain.startsWith('\n') || plain.endsWith('\n')) return null;
  return segments;
}

/** Bloc de code lu ; les blocs `ansi` (casse indifférente, E14b) sont lus en couleurs quand c'est sûr. */
function readCodeBlock(content: string, options: CodeBlockOptions): CodeBlock {
  const segments = options.language?.toLowerCase() === 'ansi' ? readAnsi(content) : null;
  if (segments) {
    const { language: _language, ...placement } = options;
    return ansiBlock(segments, placement);
  }
  return codeBlock(content, options);
}

/** Bloc de code reconnu à cette position, ou `null`. `prefix` : marqueurs déjà lus sur la ligne. */
function matchCodeBlock(rest: string, prefix: string, marks: readonly Mark[]): Piece | null {
  const quote = prefix === '> ';
  if (prefix !== '' && !quote) return null; // Bloc sur la ligne d'une puce ou d'un titre (G7).
  // Bloc sous une puce, indenté (D13, §10) : sa place et son indentation sont vérifiées avec les
  // lignes voisines.
  const indent = quote || marks.length > 0 ? 0 : BULLET_BLOCK_START.exec(rest)?.[1].length ?? 0;
  const inBullet = indent > 0;
  const match = (quote ? QUOTED_BLOCK : inBullet ? bulletBlockPattern(indent) : PLAIN_BLOCK).exec(rest);
  if (!match) return null;
  const strip = quote ? 2 : indent;
  let content = strip > 0
    ? match[2].split('\n').slice(0, -1).map((line) => line.slice(strip)).join('\n')
    : match[2];
  while (BLOCK_ZERO_WIDTH.test(content)) content = content.replace(BLOCK_ZERO_WIDTH, '`');
  try {
    const block = readCodeBlock(content, { language: match[1], marks, quote, inBullet });
    return { kind: 'codeBlock', block, value: match[0], marks, indent };
  } catch {
    return null; // Bloc vide, ou ligne vide dans un bloc cité ou dans une puce : conservé brut.
  }
}

/** Mention ou horodatage écrit sous cette forme, ou `null` (forme que le document refuse). */
function readElement(value: string, marks: readonly Mark[]): InlineNode | null {
  try {
    const mentionMatch = MENTION.exec(value);
    if (mentionMatch?.[0] === value) return mention(MENTION_KINDS[mentionMatch[1]], mentionMatch[2], marks);
    const timestampMatch = TIMESTAMP.exec(value);
    if (timestampMatch?.[0] === value) {
      return timestamp(Number(timestampMatch[1]), (timestampMatch[2] ?? null) as TimestampStyle | null, marks);
    }
  } catch {
    // Modèle d'une autre sorte (`<@ID_ROLE>`), nombre trop grand : forme non reconnue.
  }
  return null;
}

/**
 * Lit un morceau de texte. `linePrefix` : `null` si le morceau ne commence pas une ligne, sinon les
 * marqueurs déjà lus sur cette ligne (un style ouvert en début de ligne laisse son contenu en
 * début de ligne : `~~- a` est une puce, X7).
 */
function parseRange(source: string, marks: readonly Mark[], linePrefix: string | null): Piece[] {
  const pieces: Piece[] = [];
  const push = (kind: PieceKind, value: string) =>
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

    // Code `:nom:` (§9) : `\:nom:` donne quand même l'émoji (I4), il reste brut. La forme du test I5
    // (`:<U+200B>nom:`) est relue comme du texte ; l'écriture l'échappera par un antislash (`:nom\:`).
    const escapedEmoji = /^\\:[A-Za-z0-9_+-]+:/.exec(rest);
    if (escapedEmoji) {
      push('raw', escapedEmoji[0]);
      i += escapedEmoji[0].length;
      continue;
    }
    if (rest.startsWith(`:${ZERO_WIDTH_SPACE}`) && EMOJI_CODE.test(`:${rest.slice(2)}`)) {
      push('text', ':');
      i += 2;
      continue;
    }

    const escape = ESCAPE.exec(rest);
    if (escape) {
      push('text', escape[1]);
      i += escape[0].length;
      continue;
    }

    const element = MENTION.exec(rest) ?? TIMESTAMP.exec(rest);
    if (element && readElement(element[0], marks)) {
      push('element', element[0]);
      i += element[0].length;
      continue;
    }

    // Émoticône collée (`:)`, `<3`…) : convertie par Discord (I7), elle reste brute.
    const emoticon = emoticonAt(source, i);
    if (emoticon) {
      push('raw', emoticon);
      i += emoticon.length;
      continue;
    }

    const rawMatch =
      CODE_BLOCK.exec(rest) ??
      ANGLE.exec(rest) ??
      MASKED_LINK.exec(rest) ??
      EMOJI_CODE.exec(rest) ?? // Code `:nom:` collé : l'émoji reste dans Discord (§9).
      EMOTICON_KISS.exec(rest) ?? // Émoticône `:*` collée : 😗 dans Discord (X4, §9).
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

function toNode(kind: PieceKind, value: string, marks: readonly Mark[]): InlineNode {
  if (kind === 'code') return code(value, marks);
  if (kind === 'element') return readElement(value, marks)!;
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
  /** Texte d'origine du bloc, réécrit tel quel s'il s'avère mal placé. */
  blockSource?: string;
  /** Bloc placé sous une puce : nombre d'espaces devant ses lignes. */
  blockIndent?: number;
  /** Les marqueurs à partir de cette position sont gardés bruts (niveau de liste sauté). */
  keepRawFrom: number;
  /** Le marqueur `-# ` à la position `keepRawFrom` est du texte visible (X7). */
  visibleSubtextMarker?: boolean;
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
        current.blockSource = piece.value;
        current.blockIndent = piece.indent;
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
    if ((value === '> ' || value === '>') && used === 0) {
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
    } else if (value === '-# ' && style === 'normal') {
      style = 'subtext';
    } else {
      break;
    }
    used++;
  }
  const rawMarkers = line.markers.slice(used).map((m, j) =>
    line.visibleSubtextMarker && j === 0 ? text(m.value, m.marks) : raw(m.value, m.marks));
  const content = dropBoundaryZeroWidthSpaces([...rawMarkers, ...line.nodes]);
  // Ligne `> ` seule : ligne citée vide (G28), sa place est vérifiée par `toBlocks`.
  if (quote && !list && style === 'normal' && content.length === 0) return { block: emptyQuoteLine(), listMarker };
  try {
    return { block: layoutLine({ quote, list, style }, ...content), listMarker };
  } catch {
    // Ligne mise en page sans contenu (`# ` seul…) : tout reste brut.
    const all = line.markers.map((m) => raw(m.value, m.marks));
    return { block: paragraph(...dropBoundaryZeroWidthSpaces([...all, ...line.nodes])), listMarker: -1 };
  }
}

/**
 * X7 (G12 à G27, §3) : dans une puce, `-# ` n'est pas un sous-texte si une ligne plus haut, sans
 * ligne vide entre les deux, porte une balise hors du texte d'une puce (balise avant le tiret, ou
 * ligne sans puce stylée). Le `-# ` devient alors du texte, visible comme dans Discord ; l'écriture
 * l'échappe (`- \-# `, C12), ce qui garde le même rendu quelle que soit la forme réécrite.
 * Renvoie `true` si une ligne a changé (lecture à refaire).
 */
function demoteBrokenSubtexts(lines: RawLine[], blocks: readonly Block[]): boolean {
  let styledAbove = false;
  let changed = false;
  blocks.forEach((block, i) => {
    const line = lines[i];
    if (!line.block && line.markers.length === 0 && line.nodes.length === 0) {
      styledAbove = false; // Ligne vide (G21).
      return;
    }
    if (styledAbove && block.type === 'paragraph' && block.list && block.style === 'subtext') {
      line.keepRawFrom = line.markers.findIndex((marker) => marker.value === '-# ');
      line.visibleSubtextMarker = true;
      changed = true;
    }
    if (line.markers.some((marker) => marker.marks.length > 0) || isStyledOutsideBullet(block)) styledAbove = true;
  });
  return changed;
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
    if (demoteBrokenSubtexts(lines, blocks)) continue;
    const normalized = blocks.map((block, i) => {
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
    // Bloc indenté mal placé (pas sous une puce, indentation différente de celle du texte de la
    // puce, ou suivi d'une forme non testée) : brut.
    const misplaced = normalized.findIndex(
      (block, i) => block.type === 'codeBlock' && block.inBullet && (blockInBulletProblem(normalized, i) !== null
        || lines[i].blockIndent !== 2 * (listLevelBefore(normalized, i) ?? 0)),
    );
    // Ligne citée vide sans texte cité après elle (G28, G30) : brute.
    const emptyQuote = normalized.findIndex((_, i) => emptyQuoteLineProblem(normalized, i) !== null);
    if (emptyQuote !== -1) {
      lines[emptyQuote].keepRawFrom = 0;
      continue;
    }
    if (misplaced === -1) return normalized;
    lines.splice(misplaced, 1, ...rawLines(lines[misplaced].blockSource!));
  }
}

/** Lignes gardées telles quelles, une par ligne du texte. */
function rawLines(source: string): RawLine[] {
  return source.split('\n').map((segment) => ({
    markers: [],
    nodes: segment === '' ? [] : [raw(segment)],
    keepRawFrom: Infinity,
  }));
}

/** Texte Discord → document. Rien n'est perdu : ce qui n'est pas reconnu reste du texte ou du brut. */
export function parse(message: string): DiscordDocument {
  if (message === '') return createDocument();
  return createDocument(...toBlocks(toRawLines(parseRange(message, [], ''))));
}
