// Le « document » : la source de vérité unique, indépendante de l'interface.
// Les constructeurs refusent tout ce que Discord ne sait pas rendre (docs/discord-rules.md §1, §5, §10).

/** Styles de texte, rangés du plus extérieur au plus intérieur (§2.1). */
export const MARK_ORDER = ['spoiler', 'strike', 'underline', 'bold', 'italic'] as const;
export type Mark = (typeof MARK_ORDER)[number];

/** Morceau de texte ordinaire, avec ses styles (sans saut de ligne). */
export interface TextNode {
  readonly type: 'text';
  readonly text: string;
  readonly marks: readonly Mark[];
}

/** Code en ligne : son contenu n'est jamais interprété ni échappé. */
export interface CodeNode {
  readonly type: 'code';
  readonly code: string;
  readonly marks: readonly Mark[];
}

/**
 * Morceau brut : syntaxe que l'appli ne sait pas encore représenter (titre, puce, mention, lien,
 * bloc de code…) ou dont la lecture est incertaine. Il est réécrit tel quel, sans échappement (S12).
 */
export interface RawNode {
  readonly type: 'raw';
  readonly raw: string;
  readonly marks: readonly Mark[];
}

export type InlineNode = TextNode | CodeNode | RawNode;

/** Une ligne du message. Une ligne vide est un paragraphe sans contenu. */
export interface Paragraph {
  readonly type: 'paragraph';
  readonly content: readonly InlineNode[];
}

/** Un message complet : une suite de lignes (titres, listes, citations viendront à l'étape 3). */
export interface DiscordDocument {
  readonly blocks: readonly Paragraph[];
}

/** Dédoublonne les styles et les range dans l'ordre fixe. */
function normalizeMarks(marks: readonly Mark[]): Mark[] {
  return MARK_ORDER.filter((mark) => marks.includes(mark));
}

export function text(content: string, marks: readonly Mark[] = []): TextNode {
  if (content.includes('\n')) {
    throw new Error('Un texte ne contient pas de saut de ligne : utiliser un paragraphe par ligne.');
  }
  return { type: 'text', text: content, marks: normalizeMarks(marks) };
}

export function code(content: string, marks: readonly Mark[] = []): CodeNode {
  if (content === '' || content.includes('\n')) {
    throw new Error('Un code en ligne ne peut être ni vide ni sur plusieurs lignes.');
  }
  // Cas non testés dans Discord (§5) : on ne permet pas de les construire.
  if (content.startsWith('`') || content.endsWith('`') || content.includes('``')) {
    throw new Error('Code en ligne non pris en charge : accent grave en bord ou doublé.');
  }
  // Le code est une entité unique : tous les styles de texte sont permis autour (§5, X8).
  return { type: 'code', code: content, marks: normalizeMarks(marks) };
}

export function raw(content: string, marks: readonly Mark[] = []): RawNode {
  if (content === '' || content.includes('\n')) {
    throw new Error('Un morceau brut ne peut être ni vide ni sur plusieurs lignes.');
  }
  return { type: 'raw', raw: content, marks: normalizeMarks(marks) };
}

function sameMarks(a: readonly Mark[], b: readonly Mark[]): boolean {
  return a.length === b.length && a.every((mark, i) => mark === b[i]);
}

/** Crée une ligne : retire les textes vides et fusionne les voisins de même nature aux mêmes styles. */
export function paragraph(...content: InlineNode[]): Paragraph {
  const merged: InlineNode[] = [];
  for (const node of content) {
    if (node.type === 'text' && node.text === '') continue;
    const previous = merged[merged.length - 1];
    if (previous?.type === 'text' && node.type === 'text' && sameMarks(previous.marks, node.marks)) {
      merged[merged.length - 1] = { ...previous, text: previous.text + node.text };
    } else if (previous?.type === 'raw' && node.type === 'raw' && sameMarks(previous.marks, node.marks)) {
      merged[merged.length - 1] = { ...previous, raw: previous.raw + node.raw };
    } else {
      merged.push(node);
    }
  }
  return { type: 'paragraph', content: merged };
}

export function createDocument(...blocks: Paragraph[]): DiscordDocument {
  return { blocks };
}
