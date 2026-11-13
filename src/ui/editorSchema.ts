// Schéma de l'éditeur visuel (TipTap) : la forme du contenu de gauche.
// Il reflète le document de src/core ; les traductions sont dans editorConvert.ts.
import { Extension, Mark, Node } from '@tiptap/core';
import { splitBlockAs } from '@tiptap/pm/commands';
import { gapCursor } from '@tiptap/pm/gapcursor';
import { history, redo, undo } from '@tiptap/pm/history';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { analyzeLists, type CodeBlock } from '../core/document';
import { CODE_MARK, editorToDocument, type EditorNode, type LineAttrs } from './editorConvert';

const DocumentNode = Node.create({ name: 'doc', topNode: true, content: 'block+' });

const TextNode = Node.create({ name: 'text', group: 'inline' });

/** Une ligne du message, avec sa mise en page (citation, liste, titre, sous-texte). */
const LineNode = Node.create({
  name: 'line',
  group: 'block',
  content: 'inline*',
  addAttributes() {
    return {
      quote: { default: false, rendered: false },
      listKind: { default: null, rendered: false },
      listLevel: { default: 0, rendered: false },
      listStart: { default: null, rendered: false },
      lineStyle: { default: 'normal', rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: 'p' }, { tag: 'div' }];
  },
  renderHTML({ node }) {
    const attrs = node.attrs as LineAttrs;
    const classes = ['line', `line-${attrs.lineStyle}`];
    if (attrs.quote) classes.push('line-quote');
    if (attrs.listKind) classes.push('line-list');
    return ['p', { class: classes.join(' '), style: `--list-level: ${attrs.listLevel}` }, 0];
  },
});

/** Pastille non modifiable à gauche : elle se supprime, son contenu se change à droite. */
function chip(name: string, label: (attrs: Record<string, unknown>) => string, attributes: string[]) {
  return Node.create({
    name,
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() {
      return Object.fromEntries(attributes.map((key) => [key, { default: null, rendered: false }]));
    },
    renderHTML({ node }) {
      return ['span', { class: `chip chip-${name}`, contenteditable: 'false' }, label(node.attrs)];
    },
  });
}

const RawNode = chip('raw', (attrs) => String(attrs.raw), ['raw']);
const MentionNode = chip('mention', (attrs) => {
  const prefix = attrs.kind === 'user' ? '<@' : attrs.kind === 'role' ? '<@&' : '<#';
  return `${prefix}${String(attrs.id)}>`;
}, ['kind', 'id']);
const TimestampNode = chip('timestamp', (attrs) => {
  const style = attrs.style ? `:${String(attrs.style)}` : '';
  return `<t:${String(attrs.seconds)}${style}>`;
}, ['seconds', 'style']);

/** Bloc de code, affiché tel quel ; il se modifie à droite (étape 9 : à gauche). */
const CodeBlockNode = Node.create({
  name: 'codeBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { block: { default: null, rendered: false } };
  },
  renderHTML({ node }) {
    const block = node.attrs.block as CodeBlock;
    const classes = ['code-block'];
    if (block.quote) classes.push('line-quote');
    if (block.inBullet) classes.push('code-block-in-bullet');
    const language = block.language !== '' ? block.language : 'code';
    return ['div', { class: classes.join(' '), contenteditable: 'false' },
      ['div', { class: 'code-block-language' }, language],
      ['pre', {}, block.code]];
  },
});

function simpleMark(name: string, tags: string[], render: string, shortcut?: string, className?: string) {
  return Mark.create({
    name,
    parseHTML() {
      return tags.map((tag) => ({ tag }));
    },
    renderHTML() {
      return [render, className ? { class: className } : {}, 0];
    },
    addKeyboardShortcuts() {
      return shortcut ? { [shortcut]: () => this.editor.commands.toggleMark(name) } : {};
    },
  });
}

const marks = [
  simpleMark('bold', ['strong', 'b'], 'strong', 'Mod-b'),
  simpleMark('italic', ['em', 'i'], 'em', 'Mod-i'),
  simpleMark('underline', ['u'], 'u', 'Mod-u'),
  simpleMark('strike', ['s', 'del'], 's', 'Mod-Shift-s'),
  simpleMark('spoiler', ['span.spoiler'], 'span', undefined, 'spoiler'),
  simpleMark(CODE_MARK, ['code'], 'code', 'Mod-e'),
];

/** Numéros et puces affichés comme dans Discord (type imposé par le premier élément, D3). */
function listMarkers(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];
  let message;
  try {
    message = editorToDocument(doc.toJSON() as EditorNode);
  } catch {
    return DecorationSet.empty;
  }
  const positions = analyzeLists(message.blocks);
  doc.forEach((node, offset, index) => {
    const position = positions[index];
    if (!position || position === 'too-deep') return;
    const marker = position.kind === 'bullet' ? '•' : `${position.number}.`;
    decorations.push(Decoration.node(offset, offset + node.nodeSize, { 'data-marker': marker }));
  });
  return DecorationSet.create(doc, decorations);
}

/** Retire une couche de mise en page : la liste, puis le titre ou sous-texte, puis la citation. */
function strippedLayout(attrs: LineAttrs): Partial<LineAttrs> | null {
  if (attrs.listKind) return { listKind: null, listLevel: 0, listStart: null };
  if (attrs.lineStyle !== 'normal') return { lineStyle: 'normal' };
  if (attrs.quote) return { quote: false };
  return null;
}

/**
 * Entrée : la nouvelle ligne garde la mise en page ; sur une ligne vide mise en page,
 * Entrée retire la mise en page sans créer de ligne (choix de l'utilisateur, étape 8).
 */
const LineBehaviour = Extension.create({
  name: 'lineBehaviour',
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;
        const line = $from.parent;
        if (line.type.name !== 'line') return false;
        const stripped = strippedLayout(line.attrs as LineAttrs);
        if (empty && line.content.size === 0 && stripped) {
          view.dispatch(state.tr.setNodeMarkup($from.before(), undefined, { ...line.attrs, ...stripped }));
          return true;
        }
        const keptMarks = state.storedMarks ?? ($from.parentOffset > 0 ? $from.marks() : null);
        return splitBlockAs((node) => ({ type: node.type, attrs: { ...node.attrs, listStart: null } }))(
          state,
          (tr) => {
            if (keptMarks) tr.ensureMarks(keptMarks);
            view.dispatch(tr.scrollIntoView());
          },
        );
      },
      'Mod-z': () => undo(this.editor.state, this.editor.view.dispatch),
      'Mod-y': () => redo(this.editor.state, this.editor.view.dispatch),
      'Mod-Shift-z': () => redo(this.editor.state, this.editor.view.dispatch),
    };
  },
  addProseMirrorPlugins() {
    return [
      history(),
      gapCursor(),
      new Plugin({
        state: {
          init: (_, state) => listMarkers(state.doc),
          apply: (tr, old) => (tr.docChanged ? listMarkers(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export const EDITOR_EXTENSIONS = [
  DocumentNode,
  TextNode,
  LineNode,
  RawNode,
  MentionNode,
  TimestampNode,
  CodeBlockNode,
  ...marks,
  LineBehaviour,
];
