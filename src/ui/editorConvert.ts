// Traducteurs entre le document (src/core) et le contenu de l'éditeur visuel de gauche.
// Fonctions pures, sans TipTap ni navigateur : l'éditeur n'est qu'une vue du document.
import {
  ansiBlock,
  ansiStyle,
  blockInBulletProblem,
  subtextBulletProblem,
  code,
  codeBlock,
  createDocument,
  isPlainAnsiStyle,
  layoutLine,
  mention,
  raw,
  text,
  timestamp,
  type AnsiSegment,
  type AnsiStyle,
  type Block,
  type CodeBlock,
  type DiscordDocument,
  type InlineNode,
  type LineStyle,
  type ListKind,
  type Mark,
  type MentionKind,
  type Paragraph,
  type TimestampStyle,
} from '../core/document';
import { attrToColor, colorToAttr } from './ansiPalette';

/** Marque de l'éditeur (style), sous la forme JSON de TipTap. */
export interface EditorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/** Nœud de l'éditeur, sous la forme JSON de TipTap. */
export interface EditorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  text?: string;
  marks?: EditorMark[];
}

/** Attributs d'une ligne de l'éditeur : la mise en page du paragraphe. */
export interface LineAttrs {
  quote: boolean;
  listKind: ListKind | null;
  listLevel: number;
  listStart: number | null;
  lineStyle: LineStyle;
}

/** Attributs d'un bloc de code de l'éditeur (son contenu est son texte). */
export interface CodeBlockAttrs {
  language: string;
  quote: boolean;
  inBullet: boolean;
  /** Styles de texte qui entourent tout le bloc (X2). */
  marks: Mark[];
}

/** Nom du style « code en ligne » dans l'éditeur. */
export const CODE_MARK = 'code';

/** Styles ANSI de l'éditeur (marques permises seulement dans un bloc de code). */
export const ANSI_FLAG_MARKS = {
  bold: 'ansiBold',
  italic: 'ansiItalic',
  underline: 'ansiUnderline',
  strike: 'ansiStrike',
} as const;
export type AnsiFlag = keyof typeof ANSI_FLAG_MARKS;
export const ANSI_COLOR_MARK = 'ansiColor';
export const ANSI_BACKGROUND_MARK = 'ansiBackground';
const ANSI_FLAGS = Object.keys(ANSI_FLAG_MARKS) as AnsiFlag[];

const TEXT_MARKS: readonly Mark[] = ['spoiler', 'strike', 'underline', 'bold', 'italic'];

// ---------- Document → éditeur ----------

function marksOf(marks: readonly Mark[], extra: string[] = []): { type: string }[] | undefined {
  const all = [...marks, ...extra];
  return all.length > 0 ? all.map((type) => ({ type })) : undefined;
}

function inlineToEditor(node: InlineNode): EditorNode {
  switch (node.type) {
    case 'text':
      return { type: 'text', text: node.text, marks: marksOf(node.marks) };
    case 'code':
      return { type: 'text', text: node.code, marks: marksOf(node.marks, [CODE_MARK]) };
    case 'raw':
      return { type: 'raw', attrs: { raw: node.raw }, marks: marksOf(node.marks) };
    case 'mention':
      return { type: 'mention', attrs: { kind: node.kind, id: node.id }, marks: marksOf(node.marks) };
    case 'timestamp':
      return { type: 'timestamp', attrs: { seconds: node.seconds, style: node.style }, marks: marksOf(node.marks) };
  }
}

function lineAttrs(line: Paragraph): LineAttrs {
  return {
    quote: line.quote,
    listKind: line.list?.kind ?? null,
    listLevel: line.list?.level ?? 0,
    listStart: line.list?.start ?? null,
    lineStyle: line.style,
  };
}

/** Mise en forme ANSI → marques de l'éditeur. */
function ansiMarks(style: AnsiStyle): EditorMark[] | undefined {
  const marks: EditorMark[] = [];
  for (const flag of ANSI_FLAGS) if (style[flag]) marks.push({ type: ANSI_FLAG_MARKS[flag] });
  if (style.background !== null) marks.push({ type: ANSI_BACKGROUND_MARK, attrs: { color: colorToAttr(style.background) } });
  if (style.color !== null) marks.push({ type: ANSI_COLOR_MARK, attrs: { color: colorToAttr(style.color) } });
  return marks.length > 0 ? marks : undefined;
}

function codeBlockToEditor(block: CodeBlock): EditorNode {
  const attrs: CodeBlockAttrs = { language: block.language, quote: block.quote, inBullet: block.inBullet, marks: [...block.marks] };
  const segments = block.segments ?? [{ text: block.code, style: ansiStyle() }];
  const content = segments.map((segment) => ({ type: 'text', text: segment.text, marks: ansiMarks(segment.style) }));
  return { type: 'codeBlock', attrs: { ...attrs }, content };
}

function blockToEditor(block: Block): EditorNode {
  if (block.type === 'codeBlock') return codeBlockToEditor(block);
  const content = block.content.map(inlineToEditor);
  return { type: 'line', attrs: { ...lineAttrs(block) }, content: content.length > 0 ? content : undefined };
}

/** Contenu de l'éditeur pour un document. Un message vide est une seule ligne vide. */
export function documentToEditor(message: DiscordDocument): EditorNode {
  const content = message.blocks.map(blockToEditor);
  if (content.length === 0) content.push(blockToEditor(layoutLine({})));
  return { type: 'doc', content };
}

// ---------- Éditeur → document ----------

function markNames(node: EditorNode): string[] {
  return (node.marks ?? []).map((mark) => mark.type);
}

function textMarks(names: readonly string[]): Mark[] {
  return TEXT_MARKS.filter((mark) => names.includes(mark));
}

function inlineFromEditor(node: EditorNode): InlineNode | null {
  const names = markNames(node);
  const marks = textMarks(names);
  const attrs = node.attrs ?? {};
  switch (node.type) {
    case 'text': {
      const content = node.text ?? '';
      if (content === '') return null;
      if (!names.includes(CODE_MARK)) return text(content, marks);
      // Code impossible (accent grave au bord…) : redevient du texte, styles gardés.
      try {
        return code(content, marks);
      } catch {
        return text(content, marks);
      }
    }
    case 'raw':
      return raw(String(attrs.raw), marks);
    case 'mention':
      return mention(attrs.kind as MentionKind, String(attrs.id), marks);
    case 'timestamp':
      return timestamp(Number(attrs.seconds), (attrs.style ?? null) as TimestampStyle | null, marks);
    default:
      return null;
  }
}

/** Ligne de l'éditeur → paragraphe, réparé vers la forme valide la plus proche. */
function lineFromEditor(node: EditorNode, placeholder: boolean): Paragraph {
  const attrs = (node.attrs ?? {}) as Partial<LineAttrs>;
  const content = (node.content ?? []).map(inlineFromEditor).filter((n): n is InlineNode => n !== null);
  const list = attrs.listKind
    ? { kind: attrs.listKind, level: Math.max(1, attrs.listLevel ?? 1), start: attrs.listStart ?? null }
    : undefined;
  const layout = { quote: attrs.quote ?? false, list, style: attrs.lineStyle ?? 'normal' };
  // Une ligne mise en page laissée vide (après Entrée) s'écrit comme une ligne vide.
  // Pour l'analyse (barre d'outils, puces affichées), elle reçoit un contenu provisoire.
  if (content.length === 0 && !placeholder) return layoutLine({});
  if (content.length === 0) content.push(text('x'));
  try {
    return layoutLine(layout, ...content);
  } catch {
    // Combinaison refusée (titre dans une puce, sous-texte cité) : la mise en forme de ligne est retirée.
    return layoutLine({ ...layout, style: 'normal' }, ...content);
  }
}

/** Mise en forme ANSI d'un morceau de texte de l'éditeur. */
function styleFromMarks(node: EditorNode): AnsiStyle {
  const options: { -readonly [K in keyof AnsiStyle]?: AnsiStyle[K] } = {};
  for (const mark of node.marks ?? []) {
    const flag = ANSI_FLAGS.find((name) => ANSI_FLAG_MARKS[name] === mark.type);
    if (flag) options[flag] = true;
    const color = mark.attrs?.color;
    if (typeof color !== 'string') continue;
    if (mark.type === ANSI_COLOR_MARK) options.color = attrToColor(color);
    if (mark.type === ANSI_BACKGROUND_MARK) options.background = attrToColor(color);
  }
  try {
    return ansiStyle(options);
  } catch {
    return ansiStyle();
  }
}

/** Retire les lignes vides : elles cassent un bloc placé sous une puce (G11), non testées dans un bloc cité. */
function withoutBlankLines(segments: readonly AnsiSegment[]): AnsiSegment[] {
  let previous = '';
  return segments.map((segment) => {
    let kept = '';
    for (const character of segment.text) {
      if (character === '\n' && previous === '\n') continue;
      kept += character;
      previous = character;
    }
    return { ...segment, text: kept };
  });
}

/**
 * Bloc de code de l'éditeur → bloc du document, ou `null` s'il est vide (il n'est pas écrit).
 * Une mise en forme ANSI fait d'un bloc sans langage un bloc `ansi` (§5) ; un placement refusé est retiré.
 */
function codeBlockFromEditor(node: EditorNode, placeholder: boolean): CodeBlock | null {
  const attrs = (node.attrs ?? {}) as Partial<CodeBlockAttrs>;
  const language = (attrs.language ?? '').replace(/[\s`]/gu, '');
  const quote = attrs.quote ?? false;
  const inBullet = attrs.inBullet ?? false;
  let segments: AnsiSegment[] = (node.content ?? [])
    .filter((child) => child.type === 'text' && (child.text ?? '') !== '')
    .map((child) => ({ text: child.text ?? '', style: styleFromMarks(child) }));
  if (inBullet || quote) segments = withoutBlankLines(segments);
  if (segments.every((segment) => segment.text.replace(/\n/g, '') === '')) {
    if (!placeholder) return null;
    segments = [{ text: 'x', style: ansiStyle() }];
  }
  const content = segments.map((segment) => segment.text).join('');
  const colorable = language === '' || language.toLowerCase() === 'ansi';
  const colored = colorable && segments.some((segment) => !isPlainAnsiStyle(segment.style));
  const placements = [
    { marks: attrs.marks ?? [], quote, inBullet },
    { marks: attrs.marks ?? [], quote, inBullet: false },
    { marks: [], quote: false, inBullet: false },
  ];
  for (const options of placements) {
    try {
      if (colored) return ansiBlock(segments, options);
    } catch {
      // Couleurs impossibles (caractère ESC collé…) : le bloc est gardé sans couleur.
    }
    try {
      return codeBlock(content, { ...options, language: colored ? 'ansi' : language });
    } catch {
      // Placement refusé : on essaie le suivant.
    }
  }
  return null;
}

/** Bloc de code recréé hors de la puce. */
function outOfBullet(block: CodeBlock): CodeBlock {
  const options = { marks: block.marks, quote: block.quote, inBullet: false };
  if (block.segments) return ansiBlock(block.segments, options);
  return codeBlock(block.code, { ...options, language: block.language });
}

/**
 * Remet les listes en ordre après une modification à gauche : pas de niveau sauté, type du premier
 * élément à chaque niveau (D3), numéro de départ sur le premier seulement, bloc de puce après une puce.
 */
function repairLists(blocks: readonly Block[]): Block[] {
  const repaired: Block[] = [];
  let stack: ListKind[] = [];
  let quote = false;
  for (const block of blocks) {
    if (block.type === 'codeBlock') {
      let current = block;
      if (current.inBullet && blockInBulletProblem([...repaired, current], repaired.length) !== null) {
        current = outOfBullet(current);
      }
      const previous = repaired[repaired.length - 1];
      if (current.inBullet) {
        const level = previous?.type === 'paragraph' && previous.list ? previous.list.level : 1;
        stack.length = Math.min(stack.length, level);
      } else {
        stack = [];
      }
      repaired.push(current);
      continue;
    }
    if (!block.list) {
      stack = [];
      repaired.push(block);
      continue;
    }
    if (block.quote !== quote) stack = [];
    quote = block.quote;
    const level = Math.min(block.list.level, stack.length + 1);
    stack.length = Math.min(stack.length, level);
    const first = stack[level - 1] === undefined;
    const kind = first ? block.list.kind : stack[level - 1];
    if (first) stack.push(kind);
    const start = first && kind === 'ordered' ? block.list.start : null;
    repaired.push(layoutLine({ quote: block.quote, list: { kind, level, start }, style: block.style }, ...block.content));
  }
  return repaired;
}

/** Puce en sous-texte placée sous une ligne stylée (X7) : elle redevient une puce normale. */
function repairSubtextBullets(blocks: readonly Block[]): Block[] {
  const repaired = [...blocks];
  repaired.forEach((block, i) => {
    if (block.type === 'paragraph' && subtextBulletProblem(repaired, i) !== null) {
      repaired[i] = { ...block, style: 'normal' };
    }
  });
  return repaired;
}

function isEmptyLine(block: Block): boolean {
  return block.type === 'paragraph' && block.content.length === 0;
}

/** Document correspondant au contenu de l'éditeur. */
export function editorToDocument(root: EditorNode): DiscordDocument {
  const blocks: Block[] = [];
  for (const node of root.content ?? []) {
    if (node.type === 'codeBlock') {
      const block = codeBlockFromEditor(node, false);
      if (block) blocks.push(block);
    } else if (node.type === 'line') {
      blocks.push(lineFromEditor(node, false));
    }
  }
  // L'éditeur garde toujours au moins une ligne : seule et vide, c'est un message vide.
  if (blocks.length === 1 && isEmptyLine(blocks[0])) return createDocument();
  return createDocument(...repairSubtextBullets(repairLists(blocks)));
}

/**
 * Document d'analyse : exactement un bloc par nœud de l'éditeur, dans le même ordre. Les lignes
 * mises en page et les blocs de code laissés vides y reçoivent un contenu provisoire (« x »),
 * pour juger la barre d'outils (étape 6) et afficher les puces là où l'on écrit.
 */
export function editorToAnalysisDocument(root: EditorNode): DiscordDocument {
  const blocks = (root.content ?? []).map((node) =>
    node.type === 'codeBlock' ? codeBlockFromEditor(node, true) ?? codeBlock('x') : lineFromEditor(node, true));
  return createDocument(...repairSubtextBullets(repairLists(blocks)));
}
