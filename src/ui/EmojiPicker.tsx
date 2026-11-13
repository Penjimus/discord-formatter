// Sélecteur d'émojis standards (S8b) : recherche par nom (français ou code Discord), catégories, insertion.
import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Emoji, EmojiIndex } from '../core/emojiIndex';
import type { OptionState } from '../core/compatibility';
import { insertEmoji } from './editorCommands';
import { loadEmojiIndex } from './emojiLibrary';

/** Largeur de la fenêtre, en pixels (la même que dans styles.css). */
const PANEL_WIDTH = 340;

function emojiTitle(emoji: Emoji): string {
  const codes = emoji.shortcodes.map((code) => `:${code}:`).join(' ');
  return codes ? `${emoji.label} ${codes}` : emoji.label;
}

export function EmojiPicker({ editor, state }: { editor: Editor; state: OptionState | undefined }) {
  const enabled = state?.enabled ?? false;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<EmojiIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  // Les émojis ne sont chargés qu'à la première ouverture.
  useEffect(() => {
    if (!open || index) return;
    loadEmojiIndex().then(setIndex, () => setFailed(true));
  }, [open, index]);

  // Un clic ailleurs ou la touche Échap ferme le sélecteur.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        editor.commands.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, editor]);

  const shown = index ? (query.trim() ? index.search(query) : index.categories[category]?.emojis ?? []) : [];

  function choose(emoji: Emoji) {
    insertEmoji(editor, emoji.unicode);
    setOpen(false);
  }

  return (
    <div className="emoji-picker" ref={rootRef}>
      <button
        type="button"
        className={`style-button${open ? ' is-active' : ''}`}
        disabled={!enabled}
        title={enabled ? 'Insérer un émoji' : `Émoji : impossible ici. ${state?.reason ?? ''}`}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          // La fenêtre s'ouvre sous le bouton, sans dépasser du bord droit de l'écran.
          const box = event.currentTarget.getBoundingClientRect();
          setPosition({ top: box.bottom + 4, left: Math.max(8, Math.min(box.left, window.innerWidth - PANEL_WIDTH - 8)) });
          setOpen((value) => !value);
        }}
      >
        😀 Émoji
      </button>
      {open && (
        <div className="emoji-panel" role="dialog" aria-label="Choisir un émoji" style={position}>
          <input
            type="search"
            className="emoji-search"
            placeholder="Rechercher (étoile, star…)"
            aria-label="Rechercher un émoji"
            value={query}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              // Entrée ne doit pas aussi créer une ligne dans l'éditeur.
              event.preventDefault();
              if (shown[0]) choose(shown[0]);
            }}
          />
          {index && !query.trim() && (
            <div className="emoji-tabs" role="tablist" aria-label="Catégories">
              {index.categories.map((item, position) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={position === category}
                  className={`emoji-tab${position === category ? ' is-active' : ''}`}
                  title={item.name}
                  onClick={() => setCategory(position)}
                >
                  {item.emojis[0]?.unicode}
                </button>
              ))}
            </div>
          )}
          <div className="emoji-caption">
            {failed ? 'Chargement des émojis impossible.'
              : !index ? 'Chargement des émojis…'
                : query.trim() ? `${shown.length} résultat${shown.length > 1 ? 's' : ''}`
                  : index.categories[category]?.name}
          </div>
          <div className="emoji-grid">
            {shown.map((emoji) => (
              <button
                key={emoji.unicode}
                type="button"
                className="emoji-cell"
                title={emojiTitle(emoji)}
                aria-label={emoji.label}
                onClick={() => choose(emoji)}
              >
                {emoji.unicode}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
