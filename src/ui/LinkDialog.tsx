// Fenêtre de lien masqué (S16, S17) : adresse, case « sans aperçu », et texte quand rien n'est sélectionné.
import { useEffect, useRef, useState } from 'react';
import { LINK_PROTOCOLS, link, linkEnd, type LinkTarget } from '../core/links';
import { reasonOf } from '../core/reasons';
import { reasonText, useTexts } from './i18n/language';
import type { Texts } from './i18n/fr';

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
function checkAddress(url: string, noPreview: boolean, texts: Texts): LinkTarget | string {
  if (url.trim() === '') return texts.linkDialog.enterAddress;
  try {
    return link(url, noPreview);
  } catch (error) {
    return reasonText(texts, reasonOf(error));
  }
}

export function LinkDialog({ target, onConfirm, onRemove, onCancel }: Props) {
  const [url, setUrl] = useState(target.url);
  const [noPreview, setNoPreview] = useState(target.noPreview);
  const [label, setLabel] = useState(target.label);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const texts = useTexts();
  const t = texts.linkDialog;
  const editing = target.range !== null;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const checked = checkAddress(url, noPreview, texts);
  const labelMissing = target.askText && label.trim() === '';
  const valid = typeof checked !== 'string' && !labelMissing;
  const preview = typeof checked === 'string' ? '—' : `[${label || t.defaultText}${linkEnd(checked)}`;

  return (
    <dialog
      ref={dialogRef}
      className="timestamp-dialog link-dialog"
      aria-label={t.ariaLabel}
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
        <h3>{editing ? t.editTitle : t.insertTitle}</h3>
        <p className="timestamp-help">
          {t.help(LINK_PROTOCOLS.join(', '))}
        </p>
        <div className="link-fields">
          {target.askText && (
            <label>
              {t.linkText}
              <input type="text" value={label} required autoFocus onChange={(event) => setLabel(event.target.value)} />
            </label>
          )}
          <label>
            {t.address}
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
            {t.noPreview}
          </label>
        </div>
        {url.trim() !== '' && typeof checked === 'string' && <p className="timestamp-error" role="alert">{checked}</p>}
        <p className="timestamp-syntax">{t.discordText} <code>{preview}</code></p>
        <div className="timestamp-actions">
          {editing && (
            <button type="button" className="style-button link-remove" onClick={onRemove}>{t.remove}</button>
          )}
          <button type="button" className="style-button" onClick={onCancel}>{t.cancel}</button>
          <button type="submit" className="style-button is-primary" disabled={!valid}>
            {editing ? t.edit : t.insert}
          </button>
        </div>
      </form>
    </dialog>
  );
}
