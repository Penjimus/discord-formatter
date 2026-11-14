// Schéma de l'éditeur visuel (TipTap) : la forme du contenu de gauche.
// Il reflète le document de src/core ; les traductions sont dans editorConvert.ts.
import { Extension, Mark, Node } from '@tiptap/core';
import { splitBlockAs } from '@tiptap/pm/commands';
import { gapCursor } from '@tiptap/pm/gapcursor';
import { history, redo, undo } from '@tiptap/pm/history';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { HLJSApi } from 'highlight.js';
import { highlightRanges, loadHighlighter } from './syntaxHighlight';
import { analyzeLists, type TimestampStyle } from '../core/document';
import { timestampPreview } from '../core/timestampPreview';
import { loadedEmojiIndex } from './emojiLibrary';
import { EMOTICON_EMOJIS, findEmoticons } from '../core/emoticons';
import { MentionSuggest } from './mentionSuggest';
import { cssColor } from './ansiPalette';
import { changeListLevel, codeBlockBackspace, codeBlockEnter, toggleAnsiFlag } from './editorCommands';
import {
  ANSI_BACKGROUND_MARK,
  ANSI_COLOR_MARK,
  ANSI_FLAG_MARKS,
  CODE_MARK,
  editorToAnalysisDocument,
  type AnsiFlag,
  type CodeBlockAttrs,
  type EditorNode,
  type LineAttrs,
} from './editorConvert';

const ANSI_MARK_NAMES = [...Object.values(ANSI_FLAG_MARKS), ANSI_COLOR_MARK, ANSI_BACKGROUND_MARK];
const LINE_MARK_NAMES = ['bold', 'italic', 'underline', 'strike', 'spoiler', CODE_MARK];

const DocumentNode = Node.create({ name: 'doc', topNode: true, content: 'block+' });

const TextNode = Node.create({ name: 'text', group: 'inline' });

/** Une ligne du message, avec sa mise en page (citation, liste, titre, sous-texte). */
const LineNode = Node.create({
  name: 'line',
  group: 'block',
  content: 'inline*',
  marks: LINE_MARK_NAMES.join(' '),
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

/** Ce qu'affiche une pastille : son texte, sa bulle d'aide, et une classe en plus. */
interface ChipView {
  label: string;
  title?: string;
  extraClass?: string;
}

/** Pastille non modifiable à gauche : elle se supprime, son contenu se change à droite. */
function chip(name: string, view: (attrs: Record<string, unknown>) => ChipView, attributes: string[]) {
  return Node.create({
    name,
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() {
      return Object.fromEntries(attributes.map((key) => [key, { default: null, rendered: false }]));
    },
    renderHTML({ node }) {
      const { label, title, extraClass } = view(node.attrs);
      const classes = `chip chip-${name}${extraClass ? ` ${extraClass}` : ''}`;
      return ['span', { class: classes, contenteditable: 'false', ...(title ? { title } : {}) }, label];
    },
  });
}

/** Syntaxe Discord d'un horodatage, montrée en bulle d'aide. */
function timestampText(attrs: Record<string, unknown>): string {
  const style = attrs.style ? `:${String(attrs.style)}` : '';
  return `<t:${String(attrs.seconds)}${style}>`;
}

// Un code `:nom:` ou une émoticône (gardés bruts par le cœur, §9) s'affichent en émoji si connus.
const RawNode = chip('raw', (attrs) => {
  const content = String(attrs.raw);
  const emoji = EMOTICON_EMOJIS[content] ?? loadedEmojiIndex()?.emojiForCode(content) ?? null;
  return emoji ? { label: emoji, title: content, extraClass: 'chip-emoji' } : { label: content };
}, ['raw']);
const MentionNode = chip('mention', (attrs) => {
  const prefix = attrs.kind === 'user' ? '<@' : attrs.kind === 'role' ? '<@&' : '<#';
  return { label: `${prefix}${String(attrs.id)}>` };
}, ['kind', 'id']);
// Aperçu lisible de la date dans le style choisi (S8c) ; un clic rouvre le calendrier.
const TimestampNode = chip('timestamp', (attrs) => ({
  label: timestampPreview(Number(attrs.seconds), (attrs.style ?? null) as TimestampStyle | null),
  title: `${timestampText(attrs)} : cliquer pour modifier`,
}), ['seconds', 'style']);

/**
 * Bloc de code, modifiable à gauche : son texte est le contenu du bloc ; seules les mises en forme
 * ANSI y sont permises (rien d'autre n'est interprété, §5). Le langage se choisit dans la barre d'outils.
 */
const CodeBlockNode = Node.create({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: ANSI_MARK_NAMES.join(' '),
  code: true,
  defining: true,
  addAttributes() {
    return {
      language: { default: '', rendered: false },
      quote: { default: false, rendered: false },
      inBullet: { default: false, rendered: false },
      marks: { default: [], rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: 'pre', preserveWhitespace: 'full' }];
  },
  renderHTML({ node }) {
    const attrs = node.attrs as CodeBlockAttrs;
    const classes = ['code-block'];
    if (attrs.quote) classes.push('line-quote');
    if (attrs.inBullet) classes.push('code-block-in-bullet');
    if (attrs.language.toLowerCase() === 'ansi') classes.push('code-block-ansi');
    // Bloc avec un langage : fond sombre, comme dans Discord (étape 12b, choix 2A).
    else if (attrs.language !== '') classes.push('code-block-ansi', 'code-block-syntax');
    const language = attrs.language !== '' ? attrs.language : 'bloc de code';
    return ['div', { class: classes.join(' '), spellcheck: 'false' },
      ['div', { class: 'code-block-language', contenteditable: 'false' }, language],
      ['pre', {}, ['code', {}, 0]]];
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

/** Style ANSI (gras, italique, souligné, barré) : affiché comme dans Discord sur ordinateur. */
function ansiFlagMark(name: string, className: string) {
  return Mark.create({
    name,
    renderHTML() {
      return ['span', { class: className }, 0];
    },
  });
}

/** Couleur ANSI (texte ou fond) : un code (« 31 ») ou une couleur au choix (« #ffda06 »). */
function ansiColorMark(name: string, property: 'color' | 'background-color') {
  return Mark.create({
    name,
    addAttributes() {
      return { color: { default: null, rendered: false } };
    },
    renderHTML({ mark }) {
      return ['span', { style: `${property}: ${cssColor(String(mark.attrs.color))}` }, 0];
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
  ansiFlagMark(ANSI_FLAG_MARKS.bold, 'ansi-bold'),
  ansiFlagMark(ANSI_FLAG_MARKS.italic, 'ansi-italic'),
  ansiFlagMark(ANSI_FLAG_MARKS.underline, 'ansi-underline'),
  ansiFlagMark(ANSI_FLAG_MARKS.strike, 'ansi-strike'),
  ansiColorMark(ANSI_BACKGROUND_MARK, 'background-color'),
  ansiColorMark(ANSI_COLOR_MARK, 'color'),
];

/**
 * Dans un bloc de code, Ctrl+B, I, U et Maj+S posent les styles ANSI (les styles de texte n'y
 * existent pas). Passe avant les raccourcis des styles de texte.
 */
const CodeBlockShortcuts = Extension.create({
  name: 'codeBlockShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    const ansi = (flag: AnsiFlag) => () => {
      if (this.editor.state.selection.$from.parent.type.name !== 'codeBlock') return false;
      toggleAnsiFlag(this.editor, flag);
      return true;
    };
    return {
      'Mod-b': ansi('bold'),
      'Mod-i': ansi('italic'),
      'Mod-u': ansi('underline'),
      'Mod-Shift-s': ansi('strike'),
      'Mod-e': () => this.editor.state.selection.$from.parent.type.name === 'codeBlock',
      Enter: () => codeBlockEnter(this.editor),
      Backspace: () => codeBlockBackspace(this.editor),
    };
  },
});

/** Numéros et puces affichés comme dans Discord (type imposé par le premier élément, D3). */
function listMarkers(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];
  let message;
  try {
    message = editorToAnalysisDocument(doc.toJSON() as EditorNode);
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
      // Retour arrière sur un élément de liste vide : on quitte la liste (demande de l'utilisateur, étape 9).
      Backspace: () => {
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;
        const line = $from.parent;
        if (!empty || line.type.name !== 'line' || line.content.size > 0 || !line.attrs.listKind) return false;
        view.dispatch(state.tr.setNodeMarkup($from.before(), undefined, { ...line.attrs, listKind: null, listLevel: 0, listStart: null }));
        return true;
      },
      // Tab et Maj+Tab : niveau + et − dans une liste.
      Tab: () => changeListLevel(this.editor, 1),
      'Shift-Tab': () => changeListLevel(this.editor, -1),
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

/**
 * Émoticône tapée à gauche (`:)`, `<3`…) : Discord la convertira en émoji (I7). Dès qu'elle est
 * suivie d'un espace, ou que le curseur la quitte en fin de ligne, elle devient une pastille
 * affichée en émoji (même texte à droite). Rien dans le code.
 */
const EmoticonDisplay = Extension.create({
  name: 'emoticonDisplay',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((tr) => tr.docChanged || tr.selectionSet)) return null;
          const rawType = state.schema.nodes.raw;
          const found: { from: number; to: number; emoticon: string; node: PmNode }[] = [];
          state.doc.descendants((block, blockPos) => {
            if (block.type.name !== 'line') return false;
            block.forEach((child, offset) => {
              if (!child.isText || child.marks.some((mark) => mark.type.name === CODE_MARK)) return;
              const textValue = child.text ?? '';
              const start = blockPos + 1 + offset;
              const atBlockEnd = offset + child.nodeSize === block.content.size;
              for (const { index, emoticon } of findEmoticons(textValue)) {
                const from = start + index;
                const to = from + emoticon.length;
                // En fin de ligne, on attend que le curseur parte (« :D » peut devenir « :Do »).
                const atEnd = index + emoticon.length === textValue.length;
                if (atEnd && (!atBlockEnd || state.selection.empty && state.selection.from === to)) continue;
                found.push({ from, to, emoticon, node: child });
              }
            });
            return false;
          });
          if (found.length === 0) return null;
          const tr = state.tr;
          for (const { from, to, emoticon, node } of found.reverse()) {
            tr.replaceWith(from, to, rawType.create({ raw: emoticon }, null, node.marks));
          }
          return tr;
        },
      }),
    ];
  },
});

const syntaxHighlightKey = new PluginKey<DecorationSet>('syntaxHighlight');
/** Highlight.js, une fois chargé (au premier bloc avec un langage). */
let highlighter: HLJSApi | null = null;

function needsHighlighter(doc: PmNode): boolean {
  let found = false;
  doc.descendants((node) => {
    const language = node.type.name === 'codeBlock' ? (node.attrs as CodeBlockAttrs).language : '';
    if (language !== '' && language.toLowerCase() !== 'ansi') found = true;
    return !found;
  });
  return found;
}

/** Couleurs du langage de chaque bloc de code (affichage seulement, étape 12b). */
function syntaxDecorations(doc: PmNode): DecorationSet {
  if (!highlighter) return DecorationSet.empty;
  const hljs = highlighter;
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return true;
    const start = pos + 1;
    for (const range of highlightRanges(hljs, node.textContent, (node.attrs as CodeBlockAttrs).language)) {
      decorations.push(Decoration.inline(start + range.from, start + range.to, { class: range.className }));
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

/** Coloration syntaxique : Highlight.js chargé au premier bloc avec un langage, puis recoloration à chaque frappe. */
const SyntaxHighlight = Extension.create({
  name: 'syntaxHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: syntaxHighlightKey,
        state: {
          init: (_, state) => syntaxDecorations(state.doc),
          apply: (tr, old) => (tr.docChanged || tr.getMeta(syntaxHighlightKey) ? syntaxDecorations(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        view(editorView) {
          const check = (view: EditorView) => {
            if (highlighter || !needsHighlighter(view.state.doc)) return;
            void loadHighlighter().then((loaded) => {
              highlighter = loaded;
              if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(syntaxHighlightKey, true));
            });
          };
          check(editorView);
          return { update: check };
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
  CodeBlockShortcuts,
  LineBehaviour,
  MentionSuggest,
  EmoticonDisplay,
  SyntaxHighlight,
];
