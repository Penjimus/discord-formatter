// Traducteurs entre le document (src/core) et le contenu de l'éditeur visuel de gauche.
// Fonctions pures, sans TipTap ni navigateur : l'éditeur n'est qu'une vue du document.
import {
  ansiBlock,
  blockInBulletProblem,
  code,
  codeBlock,
  createDocument,
  layoutLine,
  mention,
  raw,
  text,
  timestamp,
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

/** Nœud de l'éditeur, sous la forme JSON de TipTap. */
export interface EditorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  text?: string;
  marks?: { type: string }[];
}

/** Attributs d'une ligne de l'éditeur : la mise en page du paragraphe. */
export interface LineAttrs {
  quote: boolean;
  listKind: ListKind | null;
  listLevel: number;
  listStart: number | null;
  lineStyle: LineStyle;
}

/** Nom du style « code en ligne » dans l'éditeur. */
export const CODE_MARK = 'code';

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

function blockToEditor(block: Block): EditorNode {
  if (block.type === 'codeBlock') return { type: 'codeBlock', attrs: { block } };
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
function lineFromEditor(node: EditorNode): Paragraph {
  const attrs = (node.attrs ?? {}) as Partial<LineAttrs>;
  const content = (node.content ?? []).map(inlineFromEditor).filter((n): n is InlineNode => n !== null);
  const list = attrs.listKind
    ? { kind: attrs.listKind, level: Math.max(1, attrs.listLevel ?? 1), start: attrs.listStart ?? null }
    : undefined;
  const layout = { quote: attrs.quote ?? false, list, style: attrs.lineStyle ?? 'normal' };
  // Une ligne mise en page laissée vide (après Entrée) s'écrit comme une ligne vide.
  if (content.length === 0) return layoutLine({});
  try {
    return layoutLine(layout, ...content);
  } catch {
    // Combinaison refusée (titre dans une puce, sous-texte cité) : la mise en forme de ligne est retirée.
    return layoutLine({ ...layout, style: 'normal' }, ...content);
  }
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

function isEmptyLine(block: Block): boolean {
  return block.type === 'paragraph' && block.content.length === 0;
}

/** Document correspondant au contenu de l'éditeur. */
export function editorToDocument(root: EditorNode): DiscordDocument {
  const blocks: Block[] = [];
  for (const node of root.content ?? []) {
    if (node.type === 'codeBlock') blocks.push(node.attrs?.block as CodeBlock);
    else if (node.type === 'line') blocks.push(lineFromEditor(node));
  }
  // L'éditeur garde toujours au moins une ligne : seule et vide, c'est un message vide.
  if (blocks.length === 1 && isEmptyLine(blocks[0])) return createDocument();
  return createDocument(...repairLists(blocks));
}
