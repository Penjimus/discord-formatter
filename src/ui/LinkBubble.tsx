// Bulle au survol d'un lien, à gauche (S17) : son adresse, « Modifier » et « Ouvrir ».
import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { linkAt, type EditorLink } from './editorCommands';

interface Props {
  editor: Editor;
  onEdit(current: EditorLink): void;
}

interface Shown {
  current: EditorLink;
  left: number;
  top: number;
}

/** Délai avant de cacher la bulle : le temps d'y amener la souris. */
const HIDE_DELAY = 300;

export function LinkBubble({ editor, onEdit }: Props) {
  const [shown, setShown] = useState<Shown | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  const cancelHide = () => window.clearTimeout(hideTimer.current);
  const hideSoon = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setShown(null), HIDE_DELAY);
  };

  useEffect(() => {
    const dom = editor.view.dom;
    const onOver = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest?.('.editor-link');
      if (!element || !dom.contains(element)) return;
      let position: number;
      try {
        position = editor.view.posAtDOM(element, 0);
      } catch {
        return;
      }
      const current = linkAt(editor.state, position);
      if (!current) return;
      const rect = element.getBoundingClientRect();
      cancelHide();
      setShown({ current, left: rect.left, top: rect.bottom + 4 });
    };
    const onOut = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest?.('.editor-link')) hideSoon();
    };
    dom.addEventListener('mouseover', onOver);
    dom.addEventListener('mouseout', onOut);
    return () => {
      dom.removeEventListener('mouseover', onOver);
      dom.removeEventListener('mouseout', onOut);
      cancelHide();
    };
  }, [editor]);

  // Le texte change : la bulle se refermera au prochain survol si le lien a disparu.
  useEffect(() => {
    const close = () => setShown(null);
    editor.on('update', close);
    return () => {
      editor.off('update', close);
    };
  }, [editor]);

  if (!shown) return null;
  const { current } = shown;
  return (
    <div
      className="link-bubble"
      role="dialog"
      aria-label="Lien"
      style={{ left: shown.left, top: shown.top }}
      onMouseEnter={cancelHide}
      onMouseLeave={hideSoon}
    >
      <span className="link-bubble-url" title={current.url}>{current.url}</span>
      {current.noPreview && <span className="link-bubble-note">sans aperçu</span>}
      <button
        type="button"
        className="style-button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setShown(null);
          onEdit(current);
        }}
      >
        Modifier
      </button>
      <button
        type="button"
        className="style-button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => window.open(current.url, '_blank', 'noopener,noreferrer')}
      >
        Ouvrir
      </button>
    </div>
  );
}
