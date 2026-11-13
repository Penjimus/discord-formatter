// Commandes de la barre d'outils et des raccourcis : elles modifient le contenu de l'éditeur.
// Les règles (ce qui est permis) viennent du cœur : voir toolbarState (src/core/compatibility.ts).
import type { Editor } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { subListIndices, subtreeIndices } from '../core/compatibility';
import { MAX_LIST_LEVEL, type DiscordDocument, type LineStyle, type ListKind } from '../core/document';
import {
  ANSI_BACKGROUND_MARK,
  ANSI_COLOR_MARK,
  ANSI_FLAG_MARKS,
  editorToAnalysisDocument,
  type AnsiFlag,
  type CodeBlockAttrs,
  type EditorNode,
  type LineAttrs,
} from './editorConvert';

/** Document d'analyse : un bloc par nœud de l'éditeur. */
export function analysisDocument(state: EditorState): DiscordDocument {
  return editorToAnalysisDocument(state.doc.toJSON() as EditorNode);
}

/** Position de départ de chaque nœud de premier niveau. */
function topPositions(doc: PmNode): number[] {
  const positions: number[] = [];
  doc.forEach((_node, offset) => positions.push(offset));
  return positions;
}

/** Indices des nœuds de premier niveau touchés par la sélection. */
function selectedIndices(state: EditorState): number[] {
  const { $from, $to } = state.selection;
  const indices: number[] = [];
  for (let i = $from.index(0); i <= Math.min($to.index(0), state.doc.childCount - 1); i++) indices.push(i);
  return indices;
}

/** Change les attributs de plusieurs nœuds de premier niveau en une seule étape d'annulation. */
function setAttrs(editor: Editor, changes: ReadonlyMap<number, Record<string, unknown>>): void {
  const { state, view } = editor;
  const positions = topPositions(state.doc);
  const tr = state.tr;
  for (const [index, attrs] of changes) {
    const node = state.doc.child(index);
    tr.setNodeMarkup(positions[index], undefined, { ...node.attrs, ...attrs });
  }
  view.dispatch(tr);
  view.focus();
}

/** Titre 1 à 3 ou sous-texte : posé, ou retiré s'il est déjà là. */
export function toggleLineStyle(editor: Editor, style: LineStyle): void {
  const indices = selectedIndices(editor.state).filter((i) => editor.state.doc.child(i).type.name === 'line');
  if (indices.length === 0) return;
  const first = editor.state.doc.child(indices[0]).attrs as LineAttrs;
  const next = first.lineStyle === style ? 'normal' : style;
  setAttrs(editor, new Map(indices.map((i) => [i, { lineStyle: next }])));
}

/** Citation posée ou retirée sur les lignes et blocs sélectionnés. */
export function toggleQuote(editor: Editor): void {
  const indices = selectedIndices(editor.state);
  const quote = !(editor.state.doc.child(indices[0]).attrs.quote as boolean);
  setAttrs(editor, new Map(indices.map((i) => [i, { quote }])));
}

/**
 * Liste à puces ou numérotée. Retire la liste si elle est déjà de ce type ; dans une liste de
 * l'autre type, toute la sous-liste change (à un même niveau, tout prend le type du premier, D3).
 */
export function toggleList(editor: Editor, kind: ListKind): void {
  const { state } = editor;
  const indices = selectedIndices(state).filter((i) => state.doc.child(i).type.name === 'line');
  if (indices.length === 0) return;
  const first = state.doc.child(indices[0]).attrs as LineAttrs;
  const changes = new Map<number, Record<string, unknown>>();
  if (first.listKind === kind) {
    for (const i of indices) changes.set(i, { listKind: null, listLevel: 0, listStart: null });
  } else if (first.listKind === null) {
    for (const i of indices) changes.set(i, { listKind: kind, listLevel: 1, listStart: null });
  } else {
    const blocks = analysisDocument(state).blocks;
    const touched = new Set(indices.flatMap((i) => (state.doc.child(i).attrs.listKind ? subListIndices(blocks, i) : [i])));
    for (const i of touched) {
      const level = (state.doc.child(i).attrs as LineAttrs).listLevel;
      changes.set(i, { listKind: kind, listLevel: Math.max(1, level), listStart: null });
    }
  }
  setAttrs(editor, changes);
}

/** Niveau + ou − : l'élément emmène ses sous-éléments. Renvoie `false` hors d'une liste. */
export function changeListLevel(editor: Editor, delta: 1 | -1): boolean {
  const { state } = editor;
  const items = selectedIndices(state).filter((i) => state.doc.child(i).attrs.listKind);
  if (items.length === 0) return false;
  const blocks = analysisDocument(state).blocks;
  const touched = new Set(items.flatMap((i) => subtreeIndices(blocks, i)));
  const changes = new Map<number, Record<string, unknown>>();
  for (const i of touched) {
    const level = (state.doc.child(i).attrs as LineAttrs).listLevel + delta;
    changes.set(i, { listLevel: Math.max(1, Math.min(MAX_LIST_LEVEL, level)) });
  }
  setAttrs(editor, changes);
  return true;
}

/**
 * Insère un bloc de code vide après la ligne du curseur (sous la puce si la ligne est une puce),
 * ou à la place de la ligne si elle est vide et sans mise en page. Le curseur entre dans le bloc.
 */
export function insertCodeBlock(editor: Editor): void {
  const { state, view } = editor;
  const index = state.selection.$from.index(0);
  const line = state.doc.child(index);
  if (line.type.name !== 'line') return;
  const attrs = line.attrs as LineAttrs;
  const position = topPositions(state.doc)[index];
  const blockAttrs: CodeBlockAttrs = { language: '', quote: attrs.quote, inBullet: attrs.listKind !== null, marks: [] };
  const block = state.schema.nodes.codeBlock.create(blockAttrs);
  const replace = line.content.size === 0 && attrs.listKind === null && attrs.lineStyle === 'normal';
  const tr = replace
    ? state.tr.replaceWith(position, position + line.nodeSize, block)
    : state.tr.insert(position + line.nodeSize, block);
  const inside = replace ? position + 1 : position + line.nodeSize + 1;
  tr.setSelection(TextSelection.create(tr.doc, inside));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

/** Bloc de code qui contient le curseur, avec sa position, ou `null`. */
function currentCodeBlock(state: EditorState): { node: PmNode; position: number } | null {
  const { $from } = state.selection;
  if ($from.parent.type.name !== 'codeBlock') return null;
  return { node: $from.parent, position: $from.before() };
}

/** Langage du bloc de code du curseur : un mot sans espace ni accent grave (§5). */
export function setCodeLanguage(editor: Editor, value: string): void {
  const block = currentCodeBlock(editor.state);
  if (!block) return;
  const language = value.replace(/[\s`]/gu, '');
  const { state, view } = editor;
  view.dispatch(state.tr.setNodeMarkup(block.position, undefined, { ...block.node.attrs, language }));
}

/** Un bloc sans langage devient `ansi` dès qu'il reçoit une mise en forme ANSI (§5). */
function ensureAnsi(tr: Transaction, block: { node: PmNode; position: number }): void {
  if (block.node.attrs.language === '') {
    tr.setNodeMarkup(block.position, undefined, { ...block.node.attrs, language: 'ansi' });
  }
}

function colorable(block: { node: PmNode }): boolean {
  const language = String(block.node.attrs.language);
  return language === '' || language.toLowerCase() === 'ansi';
}

/**
 * Pose ou retire une marque ANSI sur la sélection (ou pour le texte à venir si rien n'est sélectionné).
 * `attrs` : couleur à poser ; `null` retire la marque ; `undefined` bascule (styles ANSI).
 */
function applyAnsiMark(editor: Editor, name: string, attrs: Record<string, unknown> | null | undefined): boolean {
  const { state, view } = editor;
  const block = currentCodeBlock(state);
  if (!block || !colorable(block)) return false;
  const type = state.schema.marks[name];
  const { from, to, empty, $from } = state.selection;
  const current = state.storedMarks ?? $from.marks();
  const active = empty ? type.isInSet(current) !== undefined : state.doc.rangeHasMark(from, to, type);
  const remove = attrs === null || (attrs === undefined && active);
  const tr = state.tr;
  if (!remove) ensureAnsi(tr, block);
  if (empty) {
    const kept = type.removeFromSet(current);
    tr.setStoredMarks(remove ? kept : type.create(attrs ?? {}).addToSet(kept));
  } else if (remove) {
    tr.removeMark(from, to, type);
  } else {
    tr.addMark(from, to, type.create(attrs ?? {}));
  }
  view.dispatch(tr);
  view.focus();
  return true;
}

/** Gras, italique, souligné ou barré ANSI. Renvoie `false` hors d'un bloc qui peut être coloré. */
export function toggleAnsiFlag(editor: Editor, flag: AnsiFlag): boolean {
  return applyAnsiMark(editor, ANSI_FLAG_MARKS[flag], undefined);
}

/** Couleur de texte ou de fond ANSI (`null` : la retire). Valeur : code (« 31 ») ou « #rrggbb ». */
export function setAnsiColor(editor: Editor, target: 'color' | 'background', value: string | null): void {
  const name = target === 'color' ? ANSI_COLOR_MARK : ANSI_BACKGROUND_MARK;
  applyAnsiMark(editor, name, value === null ? null : { color: value });
}

/** Couleur (texte ou fond) à l'endroit du curseur, ou `null`. */
export function currentAnsiColor(state: EditorState, target: 'color' | 'background'): string | null {
  const name = target === 'color' ? ANSI_COLOR_MARK : ANSI_BACKGROUND_MARK;
  const marks = state.storedMarks ?? state.selection.$from.marks();
  const mark = marks.find((item) => item.type.name === name);
  return mark ? String(mark.attrs.color) : null;
}

/** Ligne qui remplace ou suit un bloc de code quand on en sort : une puce de même niveau sous une puce. */
function lineAfterBlock(state: EditorState, index: number): Partial<LineAttrs> {
  const block = state.doc.child(index).attrs as CodeBlockAttrs;
  const previous = index > 0 ? state.doc.child(index - 1) : null;
  if (block.inBullet && previous?.type.name === 'line' && previous.attrs.listKind) {
    return { quote: false, listKind: 'bullet', listLevel: previous.attrs.listLevel as number, listStart: null };
  }
  return { quote: block.quote };
}

/**
 * Entrée dans un bloc de code (choix 3A de l'utilisateur) :
 * - sur une ligne vide à la fin du bloc : on sort du bloc, la ligne vide est retirée ;
 *   sous une puce, la nouvelle ligne est une puce de même niveau (la liste continue, E14e) ;
 * - bloc vide : il redevient une ligne ;
 * - sur une ligne vide au milieu : rien dans un bloc sous une puce ou cité (G11), sinon nouvelle ligne ;
 * - ailleurs : nouvelle ligne dans le bloc.
 */
export function codeBlockEnter(editor: Editor): boolean {
  const { state, view } = editor;
  const block = currentCodeBlock(state);
  if (!block) return false;
  const { $from, empty } = state.selection;
  if (!empty) {
    view.dispatch(state.tr.insertText('\n').scrollIntoView());
    return true;
  }
  const content = block.node.textContent;
  const before = content.slice(0, $from.parentOffset);
  const after = content.slice($from.parentOffset);
  const onEmptyLine = (before === '' || before.endsWith('\n')) && (after === '' || after.startsWith('\n'));
  if (onEmptyLine && after === '') {
    const index = $from.index(0);
    const line = state.schema.nodes.line.create(lineAfterBlock(state, index));
    const tr = state.tr;
    if (content === '') {
      tr.replaceWith(block.position, block.position + block.node.nodeSize, line);
      tr.setSelection(TextSelection.create(tr.doc, block.position + 1));
    } else {
      tr.delete($from.pos - 1, $from.pos);
      const end = tr.mapping.map(block.position + block.node.nodeSize);
      tr.insert(end, line);
      tr.setSelection(TextSelection.create(tr.doc, end + 1));
    }
    view.dispatch(tr.scrollIntoView());
    return true;
  }
  const attrs = block.node.attrs as CodeBlockAttrs;
  if (onEmptyLine && (attrs.inBullet || attrs.quote)) return true;
  view.dispatch(state.tr.insertText('\n').scrollIntoView());
  return true;
}

/** Retour arrière au début d'un bloc de code : un bloc vide redevient une ligne, sinon rien. */
export function codeBlockBackspace(editor: Editor): boolean {
  const { state, view } = editor;
  const block = currentCodeBlock(state);
  const { $from, empty } = state.selection;
  if (!block || !empty || $from.parentOffset > 0) return false;
  if (block.node.content.size > 0) return true;
  const line = state.schema.nodes.line.create(lineAfterBlock(state, $from.index(0)));
  const tr = state.tr.replaceWith(block.position, block.position + block.node.nodeSize, line);
  tr.setSelection(TextSelection.create(tr.doc, block.position + 1));
  view.dispatch(tr);
  return true;
}
