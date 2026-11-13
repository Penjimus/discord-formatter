// Panneau gauche : l'éditeur visuel (TipTap) et sa barre d'outils.
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import type { DiscordDocument, TimestampStyle } from '../core/document';
import { dateToTimestamp } from '../core/elements';
import { documentToEditor, type EditorNode } from './editorConvert';
import { placeTimestamp } from './editorCommands';
import { EDITOR_EXTENSIONS } from './editorSchema';
import { MentionMenu } from './MentionMenu';
import { TimestampDialog, type TimestampTarget } from './TimestampDialog';
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

/** Maintenant, à la minute près : la date proposée pour un nouvel horodatage. */
function currentMinute(): number {
  const seconds = dateToTimestamp(new Date());
  return seconds - (seconds % 60);
}

export function VisualPanel({ initialDocument, onUserChange, handleRef }: Props) {
  const [timestampTarget, setTimestampTarget] = useState<TimestampTarget | null>(null);
  // L'éditeur est créé une seule fois : le clic sur un horodatage passe par cette référence.
  const openTimestampRef = useRef(setTimestampTarget);
  openTimestampRef.current = setTimestampTarget;

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: documentToEditor(initialDocument),
    editorProps: {
      attributes: { 'aria-label': 'Éditeur visuel', spellcheck: 'true', lang: 'fr' },
      // Clic sur un horodatage : le calendrier se rouvre pour le modifier (S8c).
      handleClickOn(_view, _pos, node, nodePos, _event, direct) {
        if (!direct || node.type.name !== 'timestamp') return false;
        openTimestampRef.current({
          position: nodePos,
          seconds: Number(node.attrs.seconds),
          style: (node.attrs.style ?? null) as TimestampStyle | null,
        });
        return true;
      },
    },
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
      <Toolbar
        editor={editor}
        onInsertTimestamp={() => setTimestampTarget({ position: null, seconds: currentMinute(), style: null })}
      />
      <EditorContent editor={editor} className="panel-body visual-editor" />
      <MentionMenu editor={editor} />
      {timestampTarget && (
        <TimestampDialog
          target={timestampTarget}
          onCancel={() => {
            setTimestampTarget(null);
            editor.commands.focus();
          }}
          onConfirm={(seconds, style) => {
            placeTimestamp(editor, seconds, style, timestampTarget.position);
            setTimestampTarget(null);
          }}
        />
      )}
    </section>
  );
}
