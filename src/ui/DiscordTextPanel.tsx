// Panneau droit : le texte Discord brut (CodeMirror 6), avec le bouton « Copier ».
import { useEffect, useRef, useState } from 'react';
import { Annotation, EditorState } from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { textChange } from './textChange';

/** Marque les mises à jour venues de la gauche : le panneau n'y réagit pas (pas de boucle, S13). */
const fromOutside = Annotation.define<boolean>();

/** Commande donnée par l'application au panneau droit. */
export interface DiscordTextHandle {
  /** Remplace le texte, en ne changeant que la partie modifiée (le curseur reste en place). */
  setText(text: string): void;
}

interface Props {
  initialText: string;
  /** Appelé seulement quand l'utilisateur modifie lui-même le texte de droite. */
  onUserChange(text: string): void;
  handleRef: React.MutableRefObject<DiscordTextHandle | null>;
  /** Message affiché sous le texte (avertissement des modèles à compléter). */
  notice?: React.ReactNode;
}

/** Méthode de secours quand le navigateur refuse l'accès direct au presse-papiers. */
function copyWithSelection(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export function DiscordTextPanel({ initialText, onUserChange, handleRef, notice }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onUserChange);
  onChangeRef.current = onUserChange;
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: initialText,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          // Montre les caractères invisibles (ESC, U+200B) sous forme de point rouge.
          highlightSpecialChars(),
          EditorView.lineWrapping,
          placeholder('Collez ou écrivez ici un message Discord…'),
          EditorView.contentAttributes.of({ 'aria-label': 'Message Discord (texte brut)', spellcheck: 'false' }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            if (update.transactions.some((tr) => tr.annotation(fromOutside))) return;
            onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    handleRef.current = {
      setText(text) {
        const change = textChange(view.state.doc.toString(), text);
        if (change) view.dispatch({ changes: change, annotations: [fromOutside.of(true)] });
      },
    };
    return () => {
      handleRef.current = null;
      viewRef.current = null;
      view.destroy();
    };
    // Le panneau est créé une seule fois ; le texte arrive ensuite par setText.
  }, []);

  async function copy() {
    const view = viewRef.current;
    if (!view) return;
    const text = view.state.doc.toString();
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('done');
    } catch {
      setCopyState(copyWithSelection(text) ? 'done' : 'failed');
    }
    window.setTimeout(() => setCopyState('idle'), 2000);
  }

  const copyLabel = copyState === 'done' ? 'Copié !' : copyState === 'failed' ? 'Copie impossible' : 'Copier';

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Message Discord</h2>
        <button type="button" className="copy-button" onClick={copy}>{copyLabel}</button>
      </header>
      <div className="panel-body discord-text" ref={hostRef} />
      {notice}
    </section>
  );
}
