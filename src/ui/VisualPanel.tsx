// Panneau gauche : l'éditeur visuel (TipTap) et ses boutons de style.
import { useEffect } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { DiscordDocument } from '../core/document';
import { CODE_MARK, documentToEditor, type EditorNode } from './editorConvert';
import { EDITOR_EXTENSIONS } from './editorSchema';

/** Commande donnée par l'application au panneau gauche. */
export interface VisualHandle {
  /** Redessine le document sans signaler de modification ; le curseur reste à sa place. */
  showDocument(message: DiscordDocument): void;
}

interface Props {
  initialDocument: DiscordDocument;
  /** Appelé seulement quand l'utilisateur modifie lui-même la gauche. */
  onUserChange(content: EditorNode): void;
  handleRef: React.MutableRefObject<VisualHandle | null>;
}

const STYLE_BUTTONS = [
  { mark: 'bold', label: 'Gras', hint: 'Ctrl+B' },
  { mark: 'italic', label: 'Italique', hint: 'Ctrl+I' },
  { mark: 'underline', label: 'Souligné', hint: 'Ctrl+U' },
  { mark: 'strike', label: 'Barré', hint: 'Ctrl+Maj+S' },
  { mark: 'spoiler', label: 'Spoiler', hint: '' },
  { mark: CODE_MARK, label: 'Code', hint: 'Ctrl+E' },
] as const;

function showDocument(editor: Editor, message: DiscordDocument) {
  const { from, to } = editor.state.selection;
  editor.commands.setContent(documentToEditor(message), { emitUpdate: false });
  // Remet le curseur au même endroit (ramené dans le texte si celui-ci a raccourci).
  const size = editor.state.doc.content.size;
  const clamp = (position: number) => Math.max(0, Math.min(position, size));
  const selection = TextSelection.between(editor.state.doc.resolve(clamp(from)), editor.state.doc.resolve(clamp(to)));
  editor.view.dispatch(editor.state.tr.setSelection(selection).setMeta('addToHistory', false));
}

function StyleButtons({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => Object.fromEntries(STYLE_BUTTONS.map(({ mark }) => [mark, current.isActive(mark)])),
  });
  return (
    <div className="style-buttons" role="toolbar" aria-label="Styles">
      {STYLE_BUTTONS.map(({ mark, label, hint }) => (
        <button
          key={mark}
          type="button"
          className={`style-button style-${mark}${active[mark] ? ' is-active' : ''}`}
          aria-pressed={active[mark]}
          title={hint ? `${label} (${hint})` : label}
          // Garde la sélection de l'éditeur au clic.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleMark(mark).run()}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function VisualPanel({ initialDocument, onUserChange, handleRef }: Props) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: documentToEditor(initialDocument),
    editorProps: { attributes: { 'aria-label': 'Éditeur visuel', spellcheck: 'true', lang: 'fr' } },
    onUpdate: ({ editor: current }) => onUserChange(current.getJSON() as EditorNode),
  });

  // Donne à l'application le moyen de redessiner la gauche (l'éditeur peut être recréé).
  useEffect(() => {
    handleRef.current = { showDocument: (message) => showDocument(editor, message) };
    return () => {
      handleRef.current = null;
    };
  }, [editor, handleRef]);

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Éditeur</h2>
        <StyleButtons editor={editor} />
      </header>
      <EditorContent editor={editor} className="panel-body visual-editor" />
    </section>
  );
}
