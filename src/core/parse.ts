// Lecture du texte Discord en document (docs/discord-rules.md §1, §2.3, §4, §5, §11).
// Méthode de Discord : à chaque position, on essaie les règles dans un ordre fixe ; pour `*` et `_`,
// la règle qui couvre le plus long morceau l'emporte. Ce qui n'est pas reconnu reste du texte,
// et ce que le document ne sait pas encore représenter devient un morceau brut, réécrit tel quel (S12).
import { ZERO_WIDTH_SPACE } from './characters';
import {
  code,
  createDocument,
  paragraph,
  raw,
  text,
  type DiscordDocument,
  type InlineNode,
  type Mark,
  type Paragraph,
} from './document';

/** Résultat brut de la lecture, avant le découpage en lignes. */
interface Piece {
  readonly kind: 'text' | 'code' | 'raw';
  readonly value: string;
  readonly marks: readonly Mark[];
}

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
/** Bloc de code (étape 3) : conservé brut, rien n'y est interprété. */
const CODE_BLOCK = /^```[\s\S]*?```/;
const INLINE_CODE = /^(`+)([\s\S]*?[^`])\1(?!`)/;
/** Mentions, émojis personnalisés, horodatages, commandes, liens sans aperçu (étape 5, §4). */
const ANGLE = /^<(?:@!?|@&|#|:|a:|t:|\/|id:|https?:\/\/)[^<>\n]*>/;
/** Lien masqué (C16). */
const MASKED_LINK = /^\[[^\]\n]*\]\([^)\s]+\)/;
/** Adresse : jusqu'au premier espace ou `<`, sans ponctuation finale (C21, §4). */
const URL = /^https?:\/\/[^\s<]+[^<.,:;"')\]\s]/;
/** Débuts de ligne : titre, sous-texte, puce, liste numérotée, citation (étape 3). */
const LINE_MARKER = /^[ \t]*(?:#+ |-# |[-*] |\d+\. |>+ )/;

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

/**
 * Lit un morceau de texte. `lineStart` : ce morceau commence-t-il une ligne ? (un style ouvert en
 * début de ligne laisse son contenu en début de ligne : `~~- a` est une puce, X7).
 */
function parseRange(source: string, marks: readonly Mark[], lineStart: boolean): Piece[] {
  const pieces: Piece[] = [];
  const push = (kind: Piece['kind'], value: string) => pieces.push({ kind, value, marks });
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    if ((i === 0 && lineStart) || source[i - 1] === '\n') {
      const marker = LINE_MARKER.exec(rest);
      if (marker) {
        push('raw', marker[0]);
        i += marker[0].length;
        // Marqueurs enchaînés (`- -# `, X6) : la position reste un début de ligne.
        lineStart = true;
        source = source.slice(i);
        i = 0;
        continue;
      }
    }

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
      const atLineStart = (i === 0 && lineStart) || source[i - 1] === '\n';
      pieces.push(...parseRange(content, [...marks, style.mark], atLineStart));
      i += style.length;
      continue;
    }

    push('text', source[i]);
    i += 1;
  }
  return pieces;
}

function toNode(kind: Piece['kind'], value: string, marks: readonly Mark[]): InlineNode {
  if (kind === 'code') return code(value, marks);
  return kind === 'raw' ? raw(value, marks) : text(value, marks);
}

/**
 * Retire l'espace invisible placé entre deux morceaux stylés : l'appli le remet à l'écriture
 * là où il évite une collision (§2.3, Z1 à Z3).
 */
function dropBoundaryZeroWidthSpaces(line: Paragraph): Paragraph {
  const onlyZeroWidth = new RegExp(`^${ZERO_WIDTH_SPACE}+$`, 'u');
  const kept = line.content.filter(
    (node, i) =>
      !(node.type === 'text' && onlyZeroWidth.test(node.text) && i > 0 && i < line.content.length - 1),
  );
  return paragraph(...kept);
}

/** Découpe la lecture en lignes : une ligne = un paragraphe. */
function toParagraphs(pieces: readonly Piece[]): Paragraph[] {
  const lines: InlineNode[][] = [[]];
  for (const piece of pieces) {
    piece.value.split('\n').forEach((segment, index) => {
      if (index > 0) lines.push([]);
      if (segment !== '') lines[lines.length - 1].push(toNode(piece.kind, segment, piece.marks));
    });
  }
  return lines.map((nodes) => dropBoundaryZeroWidthSpaces(paragraph(...nodes)));
}

/** Texte Discord → document. Rien n'est perdu : ce qui n'est pas reconnu reste du texte ou du brut. */
export function parse(message: string): DiscordDocument {
  if (message === '') return createDocument();
  return createDocument(...toParagraphs(parseRange(message, [], true)));
}
