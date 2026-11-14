// Panneau droit : le texte Discord brut (CodeMirror 6), avec le bouton « Copier ».
import { useEffect, useRef, useState } from 'react';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { copyText } from './clipboard';
import { textChange } from './textChange';
import { currentTexts, onLanguageChange, useTexts } from './i18n/language';

/** Marque les mises à jour venues de la gauche : le panneau n'y réagit pas (pas de boucle, S13). */
const fromOutside = Annotation.define<boolean>();

/** Textes de l'éditeur qui suivent la langue de l'interface (S36). */
const languageTexts = new Compartment();

function languageExtensions() {
  const t = currentTexts().textPanel;
  return [
    placeholder(t.placeholder),
    EditorView.contentAttributes.of({ 'aria-label': t.ariaLabel, spellcheck: 'false' }),
  ];
}

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
  /** Texte réduit (un message découpé est déroulé) : seuls l'en-tête et le compteur restent. */
  collapsed?: boolean;
  /** Clic sur l'en-tête : dérouler le message complet. Absent quand il n'y a rien à réduire. */
  onHeaderClick?: () => void;
}

/** Rend un en-tête cliquable au clavier aussi (Entrée, Espace), sans gêner ses boutons. */
export function headerToggle(onClick: (() => void) | undefined) {
  if (!onClick) return {};
  return {
    role: 'button',
    tabIndex: 0,
    onClick: (event: React.MouseEvent) => {
      if ((event.target as HTMLElement).closest('button')) return;
      onClick();
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      onClick();
    },
  };
}

export function DiscordTextPanel({ initialText, onUserChange, handleRef, notice, collapsed = false, onHeaderClick }: Props) {
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
          languageTexts.of(languageExtensions()),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            if (update.transactions.some((tr) => tr.annotation(fromOutside))) return;
            onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    const stopListening = onLanguageChange(() =>
      view.dispatch({ effects: languageTexts.reconfigure(languageExtensions()) }));
    handleRef.current = {
      setText(text) {
        const change = textChange(view.state.doc.toString(), text);
        if (change) view.dispatch({ changes: change, annotations: [fromOutside.of(true)] });
      },
    };
    return () => {
      stopListening();
      handleRef.current = null;
      viewRef.current = null;
      view.destroy();
    };
    // Le panneau est créé une seule fois ; le texte arrive ensuite par setText.
  }, []);

  async function copy() {
    const view = viewRef.current;
    if (!view) return;
    setCopyState((await copyText(view.state.doc.toString())) ? 'done' : 'failed');
    window.setTimeout(() => setCopyState('idle'), 2000);
  }

  const t = useTexts().textPanel;
  const copyLabel = copyState === 'done' ? t.copied : copyState === 'failed' ? t.copyFailed : t.copy;

  return (
    <section className={`panel${collapsed ? ' is-collapsed' : ''}`}>
      <header className={`panel-header${onHeaderClick ? ' is-toggle' : ''}`} {...headerToggle(onHeaderClick)}
        aria-expanded={onHeaderClick ? !collapsed : undefined}>
        <h2>
          {onHeaderClick && <span className="toggle-arrow" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>}
          {onHeaderClick ? t.fullMessage : t.discordMessage}
        </h2>
        <button type="button" className="copy-button" onClick={copy}>{copyLabel}</button>
      </header>
      <div className="panel-body discord-text" ref={hostRef} />
      {notice}
    </section>
  );
}
