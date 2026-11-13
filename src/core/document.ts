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

/** Mise en forme d'une ligne : normale, titre 1 à 3, ou sous-texte (§3). */
export type LineStyle = 'normal' | 'heading1' | 'heading2' | 'heading3' | 'subtext';

export type ListKind = 'bullet' | 'ordered';

/** Profondeur maximale d'une liste : le 12e niveau n'est pas interprété (§3). */
export const MAX_LIST_LEVEL = 11;

/** Plus grand numéro de départ accepté pour une liste numérotée. */
const MAX_LIST_START = 999_999_999;

/** Élément de liste. `start` : numéro de départ, porté seulement par le premier élément numéroté. */
export interface ListInfo {
  readonly kind: ListKind;
  readonly level: number;
  readonly start: number | null;
}

/**
 * Une ligne du message, avec sa mise en page (citation, élément de liste, titre ou sous-texte).
 * Une ligne vide est un paragraphe normal sans contenu.
 */
export interface Paragraph {
  readonly type: 'paragraph';
  readonly quote: boolean;
  readonly list: ListInfo | null;
  readonly style: LineStyle;
  readonly content: readonly InlineNode[];
}

/** Bloc de code : rien n'y est interprété (§5). Les styles l'entourent en entier (X2). */
export interface CodeBlock {
  readonly type: 'codeBlock';
  readonly quote: boolean;
  /** Champ libre, vide par défaut (§5). */
  readonly language: string;
  /** Contenu réel, lignes séparées par `\n`, sans lignes vides au début ni à la fin. */
  readonly code: string;
  readonly marks: readonly Mark[];
}

export type Block = Paragraph | CodeBlock;

/** Un message complet : une suite de lignes et de blocs de code. */
export interface DiscordDocument {
  readonly blocks: readonly Block[];
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

/** Retire les textes vides et fusionne les voisins de même nature aux mêmes styles. */
function mergeContent(content: readonly InlineNode[]): InlineNode[] {
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
  return merged;
}

/** Mise en page d'une ligne, pour `layoutLine`. */
export interface LineLayout {
  readonly quote?: boolean;
  readonly list?: { readonly kind: ListKind; readonly level: number; readonly start?: number | null };
  readonly style?: LineStyle;
}

/** Crée une ligne mise en page. Refuse ce que Discord ne rend pas (§3, §10). */
export function layoutLine(layout: LineLayout, ...content: InlineNode[]): Paragraph {
  const quote = layout.quote ?? false;
  const style = layout.style ?? 'normal';
  const merged = mergeContent(content);
  let list: ListInfo | null = null;
  if (layout.list) {
    const { kind, level } = layout.list;
    const start = layout.list.start ?? null;
    if (!Number.isInteger(level) || level < 1 || level > MAX_LIST_LEVEL) {
      throw new Error(`Niveau de liste impossible : de 1 à ${MAX_LIST_LEVEL}.`);
    }
    if (start !== null && (kind !== 'ordered' || !Number.isInteger(start) || start < 0 || start > MAX_LIST_START)) {
      throw new Error('Numéro de départ impossible.');
    }
    list = { kind, level, start };
  }
  if (list && style.startsWith('heading')) {
    throw new Error('Un titre ne peut pas être dans une puce (D14).');
  }
  if (quote && style === 'subtext') {
    throw new Error('Sous-texte dans une citation : non testé dans Discord.');
  }
  if ((quote || list || style !== 'normal') && merged.length === 0) {
    throw new Error('Une citation, une puce, un titre ou un sous-texte ne peut pas être vide.');
  }
  return { type: 'paragraph', quote, list, style, content: merged };
}

/** Ligne normale. */
export function paragraph(...content: InlineNode[]): Paragraph {
  return layoutLine({}, ...content);
}

export function heading(level: 1 | 2 | 3, ...content: InlineNode[]): Paragraph {
  return layoutLine({ style: `heading${level}` }, ...content);
}

export function subtext(...content: InlineNode[]): Paragraph {
  return layoutLine({ style: 'subtext' }, ...content);
}

export function bulletItem(level: number, ...content: InlineNode[]): Paragraph {
  return layoutLine({ list: { kind: 'bullet', level } }, ...content);
}

/** Élément numéroté ; `start` est le numéro de départ (premier élément seulement, sinon `null`). */
export function numberedItem(level: number, start: number | null, ...content: InlineNode[]): Paragraph {
  return layoutLine({ list: { kind: 'ordered', level, start } }, ...content);
}

/** Bloc de code. Lignes vides du début et de la fin supprimées (F4). */
export function codeBlock(
  content: string,
  options: { language?: string; marks?: readonly Mark[]; quote?: boolean } = {},
): CodeBlock {
  const language = options.language ?? '';
  const quote = options.quote ?? false;
  if (/[\s`]/u.test(language)) {
    throw new Error('Le langage est un mot sans espace ni accent grave.');
  }
  const lines = content.split('\n');
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) throw new Error('Un bloc de code ne peut pas être vide.');
  // Ligne vide dans un bloc cité : forme non testée (`> ` seul, voir G3).
  if (quote && lines.includes('')) {
    throw new Error('Ligne vide dans un bloc de code cité : non testé dans Discord.');
  }
  return { type: 'codeBlock', quote, language, code: lines.join('\n'), marks: normalizeMarks(options.marks ?? []) };
}

/** Place une ligne ou un bloc de code dans une citation (`> ` sur chaque ligne). */
export function quoted<T extends Block>(block: T): T {
  if (block.type === 'codeBlock') {
    return codeBlock(block.code, { language: block.language, marks: block.marks, quote: true }) as T;
  }
  const line = block as Paragraph;
  return layoutLine({ quote: true, list: line.list ?? undefined, style: line.style }, ...line.content) as T;
}

/**
 * Crée le message. Vérifie les listes : pas de niveau sauté, un seul type par sous-liste (D3),
 * numéro de départ sur le premier élément seulement (1 par défaut).
 */
export function createDocument(...blocks: Block[]): DiscordDocument {
  const positions = analyzeLists(blocks);
  const checked = blocks.map((block, i) => {
    const position = positions[i];
    if (position === null || block.type !== 'paragraph' || !block.list) return block;
    if (position === 'too-deep') throw new Error('Sous-niveau de liste sans niveau parent.');
    if (block.list.kind !== position.kind) {
      throw new Error('À un même niveau, tous les éléments ont le type du premier (D3).');
    }
    if (!position.first && block.list.start !== null) {
      throw new Error('Seul le premier élément numéroté porte un numéro de départ (G2).');
    }
    if (position.first && block.list.kind === 'ordered' && block.list.start === null) {
      return { ...block, list: { ...block.list, start: 1 } };
    }
    return block;
  });
  return { blocks: checked };
}

/** Place d'un élément dans sa sous-liste. */
export interface ListPosition {
  /** Type de la sous-liste : celui de son premier élément (D3). */
  readonly kind: ListKind;
  readonly first: boolean;
  /** Numéro affiché (listes numérotées) : départ + rang (G1, G2). */
  readonly number: number;
}

/**
 * Pour chaque bloc : sa place dans une liste, `null` s'il n'est pas un élément de liste,
 * `'too-deep'` s'il saute un niveau. Une liste est interrompue par tout autre bloc, y compris
 * une ligne vide (réponse de l'auteur), ou par l'entrée / la sortie d'une citation.
 * Une sous-liste commence à chaque nouveau parent (non testé).
 */
export function analyzeLists(blocks: readonly Block[]): (ListPosition | 'too-deep' | null)[] {
  let stack: { kind: ListKind; next: number }[] = [];
  let quote = false;
  return blocks.map((block) => {
    if (block.type !== 'paragraph' || !block.list) {
      stack = [];
      return null;
    }
    if (block.quote !== quote) stack = [];
    quote = block.quote;
    const { level } = block.list;
    if (level > stack.length + 1) return 'too-deep';
    stack.length = Math.min(stack.length, level);
    const current = stack[level - 1];
    if (current) {
      const number = current.next;
      current.next += 1;
      return { kind: current.kind, first: false, number };
    }
    const start = block.list.start ?? 1;
    stack.push({ kind: block.list.kind, next: start + 1 });
    return { kind: block.list.kind, first: true, number: start };
  });
}
