// Fenêtre de lien masqué (S16, S17) : adresse, case « sans aperçu », et texte quand rien n'est sélectionné.
import { useEffect, useRef, useState } from 'react';
import { LINK_PROTOCOLS, link, linkEnd, type LinkTarget } from '../core/links';

/** Ce que la fenêtre modifie : un nouveau lien, ou un lien existant (son étendue). */
export interface LinkDialogTarget {
  range: { from: number; to: number } | null;
  url: string;
  noPreview: boolean;
  /** Demander le texte du lien (rien n'était sélectionné). */
  askText: boolean;
  /** Texte montré dans l'aperçu. */
  label: string;
}

interface Props {
  target: LinkDialogTarget;
  onConfirm(target: LinkTarget, label: string | null): void;
  onRemove(): void;
  onCancel(): void;
}

/** Adresse vérifiée par le cœur, ou le message d'erreur. */
function checkAddress(url: string, noPreview: boolean): LinkTarget | string {
  if (url.trim() === '') return 'Saisissez une adresse.';
  try {
    return link(url, noPreview);
  } catch (error) {
    return error instanceof Error ? error.message : 'Adresse impossible.';
  }
}

export function LinkDialog({ target, onConfirm, onRemove, onCancel }: Props) {
  const [url, setUrl] = useState(target.url);
  const [noPreview, setNoPreview] = useState(target.noPreview);
  const [label, setLabel] = useState(target.label);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editing = target.range !== null;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const checked = checkAddress(url, noPreview);
  const labelMissing = target.askText && label.trim() === '';
  const valid = typeof checked !== 'string' && !labelMissing;
  const preview = typeof checked === 'string' ? '—' : `[${label || 'texte'}${linkEnd(checked)}`;

  return (
    <dialog
      ref={dialogRef}
      className="timestamp-dialog link-dialog"
      aria-label="Lien"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (typeof checked !== 'string' && !labelMissing) onConfirm(checked, target.askText ? label : null);
        }}
      >
        <h3>{editing ? 'Modifier le lien' : 'Insérer un lien'}</h3>
        <p className="timestamp-help">
          Le texte sera cliquable dans Discord, l'adresse cachée. Débuts permis : {LINK_PROTOCOLS.join(', ')}.
        </p>
        <div className="link-fields">
          {target.askText && (
            <label>
              Texte du lien
              <input type="text" value={label} required autoFocus onChange={(event) => setLabel(event.target.value)} />
            </label>
          )}
          <label>
            Adresse
            <input
              type="text"
              value={url}
              placeholder="https://…"
              spellCheck={false}
              required
              autoFocus={!target.askText}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <label className="link-no-preview">
            <input type="checkbox" checked={noPreview} onChange={(event) => setNoPreview(event.target.checked)} />
            Sans aperçu (pas de carte sous le message)
          </label>
        </div>
        {url.trim() !== '' && typeof checked === 'string' && <p className="timestamp-error" role="alert">{checked}</p>}
        <p className="timestamp-syntax">Texte Discord : <code>{preview}</code></p>
        <div className="timestamp-actions">
          {editing && (
            <button type="button" className="style-button link-remove" onClick={onRemove}>Retirer le lien</button>
          )}
          <button type="button" className="style-button" onClick={onCancel}>Annuler</button>
          <button type="submit" className="style-button is-primary" disabled={!valid}>
            {editing ? 'Modifier' : 'Insérer'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
