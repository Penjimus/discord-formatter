// Panneau gauche : l'éditeur visuel (TipTap) et sa barre d'outils.
import { useEffect } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { DiscordDocument } from '../core/document';
import { documentToEditor, type EditorNode } from './editorConvert';
import { EDITOR_EXTENSIONS } from './editorSchema';
import { Toolbar } from './Toolbar';

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

function showDocument(editor: Editor, message: DiscordDocument) {
  const { from, to } = editor.state.selection;
  editor.commands.setContent(documentToEditor(message), { emitUpdate: false });
  // Remet le curseur au même endroit (ramené dans le texte si celui-ci a raccourci).
  const size = editor.state.doc.content.size;
  const clamp = (position: number) => Math.max(0, Math.min(position, size));
  const selection = TextSelection.between(editor.state.doc.resolve(clamp(from)), editor.state.doc.resolve(clamp(to)));
  editor.view.dispatch(editor.state.tr.setSelection(selection).setMeta('addToHistory', false));
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
        </header>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="panel-body visual-editor" />
    </section>
  );
}
