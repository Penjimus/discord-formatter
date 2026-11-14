// Le « document » : la source de vérité unique, indépendante de l'interface.
import { ESC } from './characters';
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

/** Sorte de mention (§7). */
export type MentionKind = 'user' | 'role' | 'channel';

/** Modèles insérés par les boutons, à compléter dans Discord (§7). */
export const MENTION_TEMPLATES: Readonly<Record<MentionKind, string>> = {
  user: 'ID_UTILISATEUR',
  role: 'ID_ROLE',
  channel: 'ID_SALON',
};

/** Mention d'utilisateur, de rôle ou de salon. `id` : un nombre, ou le modèle de sa sorte. */
export interface MentionNode {
  readonly type: 'mention';
  readonly kind: MentionKind;
  readonly id: string;
  readonly marks: readonly Mark[];
}

/** Les 9 styles d'horodatage, sensibles à la casse (H1). */
export const TIMESTAMP_STYLES = ['t', 'T', 'd', 'D', 'f', 'F', 's', 'S', 'R'] as const;
export type TimestampStyle = (typeof TIMESTAMP_STYLES)[number];

/** Horodatage (§8) : toujours en secondes. `style` à `null` : aucune lettre (équivaut à `f`, H1). */
export interface TimestampNode {
  readonly type: 'timestamp';
  readonly seconds: number;
  readonly style: TimestampStyle | null;
  readonly marks: readonly Mark[];
}

export type InlineNode = TextNode | CodeNode | RawNode | MentionNode | TimestampNode;

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

/** Couleur au choix `38;2;R;G;B` (X3), composantes de 0 à 255. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Couleur du mode 256 couleurs `38;5;N` / `48;5;N` (E16), N de 0 à 255. */
export interface Indexed {
  readonly index: number;
}

/**
 * Couleur ANSI : code (30 à 37 et 90 à 97 pour le texte, 40 à 47 et 100 à 107 pour le fond),
 * couleur au choix ou couleur du mode 256 couleurs (§6, E16).
 */
export type AnsiColor = number | Rgb | Indexed;

/** Mise en forme ANSI d'un morceau de texte (§6). */
export interface AnsiStyle {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  /** Barré, code `9` (E13, E15). */
  readonly strike: boolean;
  /** Code 40 à 47 ou 100 à 107, fond au choix `48;2;R;G;B` (E14a), `48;5;N` (E16), ou `null`. */
  readonly background: AnsiColor | null;
  readonly color: AnsiColor | null;
}

/** Morceau de texte d'un bloc `ansi` ; il peut contenir des sauts de ligne (persistance, E6). */
export interface AnsiSegment {
  readonly text: string;
  readonly style: AnsiStyle;
}

/** Bloc de code : rien n'y est interprété (§5). Les styles l'entourent en entier (X2). */
export interface CodeBlock {
  readonly type: 'codeBlock';
  readonly quote: boolean;
  /**
   * Bloc placé sous la puce qui le précède, chaque ligne indentée comme le texte de la puce :
   * 2 espaces au niveau 1 (D13, G9, G10), 2 × N au niveau N (généralisé, §10).
   */
  readonly inBullet: boolean;
  /** Champ libre, vide par défaut (§5). */
  readonly language: string;
  /** Contenu réel, lignes séparées par `\n`, sans lignes vides au début ni à la fin. */
  readonly code: string;
  /**
   * Bloc `ansi` coloré : le contenu en morceaux mis en forme (`code` en est le texte seul).
   * `null` pour un bloc sans couleur : `code` est alors écrit tel quel (S12).
   */
  readonly segments: readonly AnsiSegment[] | null;
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

/**
 * Mention (§7). Sans identifiant, c'est le modèle à compléter (`<@ID_UTILISATEUR>`…).
 * Les styles sont permis : sans effet visible, sauf le spoiler (M2, M3, convention §1).
 */
export function mention(kind: MentionKind, id: string = MENTION_TEMPLATES[kind], marks: readonly Mark[] = []): MentionNode {
  if (!/^[0-9]+$/.test(id) && id !== MENTION_TEMPLATES[kind]) {
    throw new Error(`Identifiant de mention impossible : des chiffres, ou ${MENTION_TEMPLATES[kind]}.`);
  }
  return { type: 'mention', kind, id, marks: normalizeMarks(marks) };
}

/** La mention est-elle un modèle encore à compléter ? */
export function isTemplate(node: MentionNode): boolean {
  return node.id === MENTION_TEMPLATES[node.kind];
}

/** Horodatage (§8) : nombre entier de secondes, positif ou nul ; styles visibles (H3). */
export function timestamp(seconds: number, style: TimestampStyle | null = null, marks: readonly Mark[] = []): TimestampNode {
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    throw new Error('Horodatage impossible : un nombre entier de secondes, positif ou nul.');
  }
  if (style !== null && !TIMESTAMP_STYLES.includes(style)) {
    throw new Error(`Style d'horodatage inconnu : ${TIMESTAMP_STYLES.join(', ')}, ou aucun.`);
  }
  return { type: 'timestamp', seconds, style, marks: normalizeMarks(marks) };
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
  // Sous-texte dans une citation : permis (G29). Ligne citée vide : voir `emptyQuoteLine` (G28).
  if ((quote || list || style !== 'normal') && merged.length === 0) {
    throw new Error('Une citation, une puce, un titre ou un sous-texte ne peut pas être vide.');
  }
  return { type: 'paragraph', quote, list, style, content: merged };
}

/**
 * Ligne citée vide (`> ` ou `>`) : seulement dans une citation que du texte cité suit,
 * vérifié par `createDocument` (G28, G30). `quoted(paragraph())` reste refusé.
 */
export function emptyQuoteLine(): Paragraph {
  return { type: 'paragraph', quote: true, list: null, style: 'normal', content: [] };
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

/** Placement et styles d'un bloc de code. */
export interface CodeBlockOptions {
  readonly language?: string;
  readonly marks?: readonly Mark[];
  readonly quote?: boolean;
  readonly inBullet?: boolean;
}

/** Bloc de code. Lignes vides du début et de la fin supprimées (F4). */
export function codeBlock(content: string, options: CodeBlockOptions = {}): CodeBlock {
  const language = options.language ?? '';
  const quote = options.quote ?? false;
  const inBullet = options.inBullet ?? false;
  const marks = normalizeMarks(options.marks ?? []);
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
  if (inBullet) {
    // Une ligne vide casse le bloc placé dans une puce (G6, G11).
    if (lines.includes('')) throw new Error('Pas de ligne vide dans un bloc placé dans une puce (G11).');
    if (quote) throw new Error('Bloc dans une liste citée : non testé dans Discord.');
    if (marks.length > 0) throw new Error('Style autour d\'un bloc placé dans une puce : non testé dans Discord.');
  }
  return { type: 'codeBlock', quote, inBullet, language, code: lines.join('\n'), segments: null, marks };
}

const ANSI_STYLE_CODES = { bold: 1, italic: 3, underline: 4, strike: 9 } as const;

export function isRgb(color: AnsiColor): color is Rgb {
  return typeof color === 'object' && 'r' in color;
}

export function isIndexed(color: AnsiColor): color is Indexed {
  return typeof color === 'object' && 'index' in color;
}

const isByte = (value: number) => Number.isInteger(value) && value >= 0 && value <= 255;

/**
 * Vérifie une couleur : code de `min` à `min + 7` ou, en clair, de `min + 60` à `min + 67` (E16) ;
 * couleur au choix (X3, E14a) ; couleur du mode 256 couleurs (E16).
 * Renvoie une copie (les couleurs en objet sont recopiées champ par champ).
 */
function checkColor(color: AnsiColor | null, min: number, name: string): AnsiColor | null {
  if (color === null) return null;
  if (isRgb(color)) {
    if (![color.r, color.g, color.b].every(isByte)) {
      throw new Error(`${name} au choix impossible : rouge, vert et bleu de 0 à 255.`);
    }
    return { r: color.r, g: color.g, b: color.b };
  }
  if (isIndexed(color)) {
    if (!isByte(color.index)) throw new Error(`${name} du mode 256 couleurs impossible : de 0 à 255.`);
    return { index: color.index };
  }
  const inRange = (start: number) => color >= start && color <= start + 7;
  if (!(Number.isInteger(color) && (inRange(min) || inRange(min + 60)))) {
    throw new Error(`${name} ANSI impossible : code de ${min} à ${min + 7} ou de ${min + 60} à ${min + 67}.`);
  }
  return color;
}

/** Mise en forme ANSI ; refuse les codes que l'appli ne propose pas (§6). */
export function ansiStyle(options: Partial<AnsiStyle> = {}): AnsiStyle {
  return {
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    underline: options.underline ?? false,
    strike: options.strike ?? false,
    background: checkColor(options.background ?? null, 40, 'Fond'),
    color: checkColor(options.color ?? null, 30, 'Couleur de texte'),
  };
}

/** Le morceau est-il sans aucune mise en forme ? */
export function isPlainAnsiStyle(style: AnsiStyle): boolean {
  return !style.bold && !style.italic && !style.underline && !style.strike && style.background === null && style.color === null;
}

export function sameAnsiStyle(a: AnsiStyle, b: AnsiStyle): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Codes d'une mise en forme, dans l'ordre de l'appli : styles, fond, texte (§6). */
export function ansiCodes(style: AnsiStyle): string[] {
  const codes: string[] = [];
  for (const key of ['bold', 'italic', 'underline', 'strike'] as const) {
    if (style[key]) codes.push(String(ANSI_STYLE_CODES[key]));
  }
  const write = (color: AnsiColor, prefix: string) => {
    if (isRgb(color)) return `${prefix};2;${color.r};${color.g};${color.b}`;
    if (isIndexed(color)) return `${prefix};5;${color.index}`;
    return String(color);
  };
  if (style.background !== null) codes.push(write(style.background, '48'));
  if (style.color !== null) codes.push(write(style.color, '38'));
  return codes;
}

/** Morceau de texte d'un bloc `ansi`. Le caractère ESC n'y est pas permis : l'appli écrit les codes. */
export function ansiText(content: string, style: Partial<AnsiStyle> = {}): AnsiSegment {
  if (content.includes(ESC)) throw new Error('Le caractère ESC ne s\'écrit pas dans le texte.');
  return { text: content, style: ansiStyle(style) };
}

/**
 * Bloc `ansi` coloré. Les morceaux voisins de même mise en forme sont fusionnés, les lignes vides
 * du début et de la fin retirées (F4). Sans aucune couleur, c'est un bloc `ansi` normal (D9).
 */
export function ansiBlock(
  segments: readonly AnsiSegment[],
  options: Omit<CodeBlockOptions, 'language'> = {},
): CodeBlock {
  // Un même rendu n'a qu'une seule forme. Un saut de ligne au bord d'un passage n'a pas de couleur
  // visible : il est sorti du passage ; entre deux passages identiques, il les relie (E6).
  const split = segments.flatMap((segment) => {
    const checked = ansiText(segment.text, segment.style);
    if (isPlainAnsiStyle(checked.style)) return [checked];
    const [, before, body, after] = /^(\n*)([\s\S]*?)(\n*)$/.exec(checked.text)!;
    return [ansiText(before), { ...checked, text: body }, ansiText(after)];
  });
  const merged = mergeAnsiSegments(split);
  const linked = merged.flatMap((segment, i) => {
    const [previous, next] = [merged[i - 1], merged[i + 1]];
    const linksPassages = isPlainAnsiStyle(segment.style) && /^\n+$/.test(segment.text)
      && previous && next && sameAnsiStyle(previous.style, next.style);
    return linksPassages ? [{ ...segment, style: previous.style }] : [segment];
  });
  const result = mergeAnsiSegments(linked);
  ansiTrimBorders(result);
  const plain = codeBlock(result.map((segment) => segment.text).join(''), { ...options, language: 'ansi' });
  if (result.every((segment) => isPlainAnsiStyle(segment.style))) return plain;
  return { ...plain, segments: result };
}

/** Retire les morceaux vides et fusionne les voisins de même mise en forme. */
function mergeAnsiSegments(segments: readonly AnsiSegment[]): AnsiSegment[] {
  const merged: AnsiSegment[] = [];
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (segment.text === '') continue;
    if (previous && sameAnsiStyle(previous.style, segment.style)) {
      merged[merged.length - 1] = { ...previous, text: previous.text + segment.text };
    } else {
      merged.push(segment);
    }
  }
  return merged;
}

/** Lignes vides du bord (F4) : retire les sauts de ligne en tête et en fin. */
function ansiTrimBorders(merged: AnsiSegment[]): void {
  while (merged.length > 0 && merged[0].text.startsWith('\n')) {
    const rest = merged[0].text.replace(/^\n+/, '');
    if (rest === '') merged.shift();
    else merged[0] = { ...merged[0], text: rest };
  }
  while (merged.length > 0 && merged[merged.length - 1].text.endsWith('\n')) {
    const last = merged.length - 1;
    const rest = merged[last].text.replace(/\n+$/, '');
    if (rest === '') merged.pop();
    else merged[last] = { ...merged[last], text: rest };
  }
}

/**
 * Colore un bloc de code (§5, « langage et couleur ») : un bloc sans langage devient `ansi` ;
 * un bloc avec un autre langage ne peut pas être coloré.
 */
export function colorBlock(block: CodeBlock, segments: readonly AnsiSegment[]): CodeBlock {
  // Le langage est insensible à la casse (F2, E14b).
  if (block.language !== '' && block.language.toLowerCase() !== 'ansi') {
    throw new Error('Un bloc avec un langage ne peut pas être coloré.');
  }
  return ansiBlock(segments, { marks: block.marks, quote: block.quote, inBullet: block.inBullet });
}

/** Place une ligne ou un bloc de code dans une citation (`> ` sur chaque ligne). */
export function quoted<T extends Block>(block: T): T {
  if (block.type === 'codeBlock') {
    const options = { marks: block.marks, quote: true, inBullet: block.inBullet };
    // Bloc ansi coloré dans une citation : permis (E14c).
    if (block.segments) return ansiBlock(block.segments, options) as T;
    return codeBlock(block.code, { ...options, language: block.language }) as T;
  }
  const line = block as Paragraph;
  return layoutLine({ quote: true, list: line.list ?? undefined, style: line.style }, ...line.content) as T;
}

/**
 * Crée le message. Vérifie les listes : pas de niveau sauté, un seul type par sous-liste (D3),
 * numéro de départ sur le premier élément seulement (1 par défaut).
 */
export function createDocument(...blocks: Block[]): DiscordDocument {
  checkBlocksInBullets(blocks);
  blocks.forEach((_, i) => {
    const problem = subtextBulletProblem(blocks, i) ?? emptyQuoteLineProblem(blocks, i);
    if (problem) throw new Error(problem);
  });
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

/** Niveau de l'élément de liste juste avant le bloc `index`, ou `null`. */
export function listLevelBefore(blocks: readonly Block[], index: number): number | null {
  const previous = blocks[index - 1];
  return previous?.type === 'paragraph' && previous.list ? previous.list.level : null;
}

/**
 * Raison pour laquelle le bloc `index` (placé dans une puce) est mal placé, ou `null`.
 * Testé : juste après une puce de niveau 1 hors citation (D13, G9, G10) ; sous-puces : généralisé.
 * Ce qui suit est libre : la liste continue (E14e, E14f) ou s'arrête (E14g).
 * Non testé : deux blocs de suite, sous un élément numéroté, dans une liste citée.
 */
export function blockInBulletProblem(blocks: readonly Block[], index: number): string | null {
  const previous = blocks[index - 1];
  const position = analyzeLists(blocks)[index - 1];
  const afterBullet = previous?.type === 'paragraph' && !previous.quote && previous.list !== null
    && position !== null && position !== undefined && position !== 'too-deep' && position.kind === 'bullet';
  return afterBullet ? null : 'Un bloc placé dans une puce suit une puce, pas un élément numéroté (D13).';
}

/** Ligne vide ordinaire (sans citation). Une ligne citée vide (`> `, G28) n'en est pas une. */
export function isBlankLine(block: Block): boolean {
  return block.type === 'paragraph' && !block.quote && block.content.length === 0;
}

/** Ligne citée vide (`> `). */
export function isEmptyQuoteLine(block: Block | undefined): boolean {
  return block?.type === 'paragraph' && block.quote && block.content.length === 0;
}

/**
 * Raison pour laquelle le bloc `index` (ligne citée vide) ne serait pas rendu, ou `null`.
 * Une ligne citée vide s'affiche vide en première ligne (G28) ou au milieu (G30) d'une citation,
 * si du texte cité la suit. Plusieurs de suite : généralisé. En dernière ligne : non retenu.
 */
export function emptyQuoteLineProblem(blocks: readonly Block[], index: number): string | null {
  if (!isEmptyQuoteLine(blocks[index])) return null;
  let next = index + 1;
  while (isEmptyQuoteLine(blocks[next])) next++;
  return blocks[next]?.quote
    ? null
    : 'Une ligne vide dans une citation doit être suivie de texte cité (G28, G30).';
}

/** Bloc qui porte un style hors du texte d'une puce : ligne sans puce stylée, bloc de code entouré d'un style. */
export function isStyledOutsideBullet(block: Block): boolean {
  if (block.type === 'codeBlock') return block.marks.length > 0;
  return block.list === null && block.content.some((node) => node.marks.length > 0);
}

/**
 * Raison pour laquelle le bloc `index` (puce en sous-texte) ne serait pas rendu, ou `null`.
 * X7 (G12 à G27, §3) : Discord n'applique pas le sous-texte dans une puce si une ligne stylée la
 * précède sans ligne vide entre les deux. L'écriture place les styles des puces après le tiret (G14).
 */
export function subtextBulletProblem(blocks: readonly Block[], index: number): string | null {
  const block = blocks[index];
  if (block?.type !== 'paragraph' || block.list === null || block.style !== 'subtext') return null;
  for (let i = index - 1; i >= 0; i--) {
    const previous = blocks[i];
    if (isBlankLine(previous)) return null; // Ligne vide (G21).
    if (isStyledOutsideBullet(previous)) {
      return 'Discord n\'applique pas le sous-texte dans une puce placée sous une ligne stylée : '
        + 'ajoutez une ligne vide au-dessus de la liste (X7).';
    }
  }
  return null;
}

function checkBlocksInBullets(blocks: readonly Block[]): void {
  blocks.forEach((block, i) => {
    if (block.type !== 'codeBlock' || !block.inBullet) return;
    const problem = blockInBulletProblem(blocks, i);
    if (problem) throw new Error(problem);
  });
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
 * une ligne vide (réponse de l'auteur), ou par l'entrée / la sortie d'une citation. Un bloc de
 * code placé dans une puce ne l'interrompt pas (E14e, E14f).
 * Une sous-liste commence à chaque nouveau parent (G5).
 */
export function analyzeLists(blocks: readonly Block[]): (ListPosition | 'too-deep' | null)[] {
  let stack: { kind: ListKind; next: number }[] = [];
  let quote = false;
  return blocks.map((block, i) => {
    if (block.type === 'codeBlock' && block.inBullet) {
      // Le bloc appartient à la puce qui précède : les sous-listes plus profondes sont closes.
      stack.length = Math.min(stack.length, listLevelBefore(blocks, i) ?? 1);
      return null;
    }
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
