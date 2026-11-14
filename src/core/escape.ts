// Échappement du texte ordinaire (docs/discord-rules.md §11).
// Règle prudente : tant que les paires entre lignes ne sont pas testées, un symbole est échappé
// dès qu'un partenaire existe n'importe où dans le message.
import type { DiscordDocument } from './document';

/** Ce qui, dans tout le message, pourrait servir de partenaire à un symbole. */
export interface MessageContext {
  readonly tildePairPossible: boolean;
  readonly pipePairPossible: boolean;
  readonly backtickPairPossible: boolean;
}

/** Ce qui entoure le morceau de texte à échapper. */
export interface TextSurroundings {
  /** Le morceau est tout au début de la ligne, sans balise devant. */
  readonly atLineStart: boolean;
  /** Une balise est écrite juste avant / juste après le morceau. */
  readonly delimitedBefore: boolean;
  readonly delimitedAfter: boolean;
  /** Le texte des morceaux suivants sur la même ligne. */
  readonly textAfter: string;
  /**
   * Le morceau est dans le texte d'un lien : un `[` n'y est jamais échappé (`\[` casse le lien, L5),
   * et les `]` sans `[` sont dans `forcedEscapes` (`\]`, L5).
   */
  readonly inLinkText?: boolean;
  /** Positions à échapper quoi qu'il arrive. */
  readonly forcedEscapes?: ReadonlySet<number>;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;
const SPACE = /\s/u;
/** Débuts de ligne interprétés par Discord : titre, sous-texte, puce, liste numérotée, citation. */
/** `>` seul sur sa ligne : ligne citée vide (G30), échappé aussi. */
const LINE_START_MARKER = /^(\s*)(?:(#+ )|(-# )|(- )|(\d+)\. |(>+ |>$))/u;
/** Débuts de mention, d'émoji personnalisé, d'horodatage, de commande ou de lien après un `<`. */
const ANGLE_PATTERN = /^(?:@|#|:|a:|t:|\/|id:|https?:)/u;

/**
 * Code `:nom:` que Discord pourrait convertir en émoji (convention §9, X2). Un nombre seul n'en est
 * pas un (« 12:30:45 »), sauf `:100:` et `:1234:`.
 */
export const EMOJI_CODE = /^:(?:[A-Za-z0-9_+-]*[A-Za-z_+-][A-Za-z0-9_+-]*|100|1234):/;

/** Compte les paires de symboles doublés (`~~`, `||`) dans une chaîne. */
function countDoubled(textValue: string, symbol: string): number {
  let count = 0;
  for (const run of textValue.match(new RegExp(`\\${symbol}{2,}`, 'g')) ?? []) {
    count += Math.floor(run.length / 2);
  }
  return count;
}

export function analyzeMessage(message: DiscordDocument): MessageContext {
  let tildes = 0;
  let pipes = 0;
  let backticks = 0;
  for (const block of message.blocks) {
    // Un bloc de code compte comme un morceau : par prudence, ses accents graves et son contenu
    // peuvent servir de partenaires à un symbole du texte.
    const nodes = block.type === 'codeBlock' ? [block] : block.content;
    for (const node of nodes) {
      if (node.type === 'code') backticks += 2;
      else if (node.type === 'mention' || node.type === 'timestamp') {
        // Aucun symbole de style dans une mention ou un horodatage : seules ses balises comptent.
      } else {
        // Un morceau brut est réécrit tel quel : ses symboles peuvent servir de partenaires.
        const content =
          node.type === 'text' ? node.text : node.type === 'raw' ? node.raw : `\`\`\`${node.code}\`\`\``;
        tildes += countDoubled(content, '~');
        pipes += countDoubled(content, '|');
        backticks += content.split('`').length - 1;
      }
      // Une balise écrite par l'appli compte comme deux partenaires (ouverture et fermeture).
      if (node.marks.includes('strike')) tildes += 2;
      if (node.marks.includes('spoiler')) pipes += 2;
    }
  }
  return {
    tildePairPossible: tildes >= 2,
    pipePairPossible: pipes >= 2,
    backtickPairPossible: backticks >= 2,
  };
}

/** Position du symbole de début de ligne à échapper, ou -1. */
function lineStartEscapeIndex(textValue: string): number {
  const match = LINE_START_MARKER.exec(textValue);
  if (!match) return -1;
  const indent = match[1].length;
  // Liste numérotée : on échappe le point (`2020\. `), sinon le premier symbole.
  return match[5] !== undefined ? indent + match[5].length : indent;
}

/** Le caractère fait-il partie d'une suite d'au moins deux `symbol` ? */
function inDoubledRun(textValue: string, i: number, symbol: string): boolean {
  return textValue[i - 1] === symbol || textValue[i + 1] === symbol;
}

function mustEscape(
  textValue: string,
  i: number,
  message: MessageContext,
  around: TextSurroundings,
): boolean {
  const char = textValue[i];
  const before = textValue[i - 1];
  const after = textValue[i + 1];
  const atEdge =
    (i === 0 && around.delimitedBefore) || (i === textValue.length - 1 && around.delimitedAfter);
  switch (char) {
    case '\\':
      return true; // C17
    case '*': // C1, C3 : littéral seulement entre deux espaces
      return !(before !== undefined && after !== undefined && SPACE.test(before) && SPACE.test(after));
    case '_': // B1, B2, C4, C5 : littéral seulement entre deux lettres ou chiffres
      return !(before !== undefined && after !== undefined && WORD_CHAR.test(before) && WORD_CHAR.test(after));
    case '~': // C6, C7
      return atEdge || (message.tildePairPossible && inDoubledRun(textValue, i, '~'));
    case '|': // C8, C9
      return atEdge || (message.pipePairPossible && inDoubledRun(textValue, i, '|'));
    case '`': // C10
      return atEdge || message.backtickPairPossible;
    case '<': // C15
      return ANGLE_PATTERN.test(textValue.slice(i + 1) + around.textAfter);
    case '[': // C16 ; dans le texte d'un lien, chaque `[` a son `]` (L5)
      return !around.inLinkText && (textValue.slice(i + 1) + around.textAfter).includes('](');
    default:
      return false;
  }
}

/** Échappe un morceau de texte ordinaire : n'ajoute un antislash que là où Discord interpréterait. */
export function escapeText(
  textValue: string,
  message: MessageContext,
  around: TextSurroundings,
): string {
  const lineStartIndex = around.atLineStart ? lineStartEscapeIndex(textValue) : -1;
  const emojiClosings = emojiCodeClosings(textValue);
  let result = '';
  for (let i = 0; i < textValue.length; i++) {
    const escape = i === lineStartIndex || emojiClosings.has(i) || (around.forcedEscapes?.has(i) ?? false)
      || mustEscape(textValue, i, message, around);
    result += escape ? `\\${textValue[i]}` : textValue[i];
  }
  return result;
}

/**
 * Positions des deux-points qui ferment un code `:nom:` (§9). Un antislash devant le dernier
 * deux-points empêche l'émoji (I4). Le deux-points de fermeture peut ouvrir le code suivant.
 * Rien juste après `<`, `<a` ou `<t` : le chevron, échappé, rend déjà la forme littérale (C15).
 */
function emojiCodeClosings(textValue: string): Set<number> {
  const closings = new Set<number>();
  for (let i = textValue.indexOf(':'); i !== -1; i = textValue.indexOf(':', i + 1)) {
    const match = EMOJI_CODE.exec(textValue.slice(i));
    if (match && !/<[at]?$/.test(textValue.slice(0, i))) closings.add(i + match[0].length - 1);
  }
  return closings;
}
