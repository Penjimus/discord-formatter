// Fenêtre d'horodatage (S8c) : date et heure dans le calendrier du navigateur, puis style d'affichage.
// Sert à l'insertion et à la modification (clic sur un horodatage à gauche).
import { useEffect, useRef, useState } from 'react';
import { TIMESTAMP_STYLES, timestamp, type TimestampStyle } from '../core/document';
import { dateToTimestamp, timestampSyntax } from '../core/elements';
import { timestampPreview } from '../core/timestampPreview';
import { reasonOf } from '../core/reasons';
import { reasonText, useLanguage, useTexts } from './i18n/language';
import type { Texts } from './i18n/fr';

/** Ce que la fenêtre modifie : un horodatage existant (sa position) ou un nouveau (`position: null`). */
export interface TimestampTarget {
  position: number | null;
  seconds: number;
  style: TimestampStyle | null;
}

interface Props {
  target: TimestampTarget;
  onConfirm(seconds: number, style: TimestampStyle | null): void;
  onCancel(): void;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Secondes → champs « date » et « heure », à l'heure de l'ordinateur. */
function toFields(seconds: number): { date: string; time: string } {
  const value = new Date(seconds * 1000);
  return {
    date: `${String(value.getFullYear()).padStart(4, '0')}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`,
  };
}

/** Champs « date » et « heure » → secondes (jamais des millisecondes, H2), ou un message d'erreur. */
function toSeconds(date: string, time: string, texts: Texts): number | string {
  const day = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(date);
  const hour = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!day) return texts.timestampDialog.chooseDate;
  if (!hour) return texts.timestampDialog.chooseTime;
  const value = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), Number(hour[1]), Number(hour[2]), Number(hour[3] ?? 0));
  try {
    return dateToTimestamp(value);
  } catch (error) {
    return reasonText(texts, reasonOf(error));
  }
}

export function TimestampDialog({ target, onConfirm, onCancel }: Props) {
  const initial = toFields(target.seconds);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [style, setStyle] = useState<TimestampStyle | null>(target.style);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const texts = useTexts();
  const t = texts.timestampDialog;
  const language = useLanguage();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const seconds = toSeconds(date, time, texts);
  const valid = typeof seconds === 'number';
  const choices: (TimestampStyle | null)[] = [null, ...TIMESTAMP_STYLES];

  return (
    <dialog
      ref={dialogRef}
      className="timestamp-dialog"
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
          if (valid) onConfirm(seconds, style);
        }}
      >
        <h3>{target.position === null ? t.insertTitle : t.editTitle}</h3>
        <p className="timestamp-help">{t.help}</p>
        <div className="timestamp-fields">
          <label>
            {t.date}
            <input type="date" value={date} min="1970-01-01" required onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            {t.time}
            <input type="time" step={1} value={time} required onChange={(event) => setTime(event.target.value)} />
          </label>
        </div>
        {!valid && <p className="timestamp-error" role="alert">{seconds}</p>}
        <fieldset className="timestamp-styles">
          <legend>{t.styleLegend}</legend>
          {choices.map((choice) => (
            <label key={choice ?? 'aucun'} className={`timestamp-style${choice === style ? ' is-active' : ''}`}>
              <input type="radio" name="timestamp-style" checked={choice === style} onChange={() => setStyle(choice)} />
              <span className="timestamp-style-name">
                {choice === null ? t.defaultStyle : `${t.styleNames[choice]} (${choice})`}
              </span>
              <span className="timestamp-style-preview">{valid ? timestampPreview(seconds, choice, { language }) : '—'}</span>
            </label>
          ))}
        </fieldset>
        <p className="timestamp-syntax">
          {t.discordText} <code>{valid ? timestampSyntax(timestamp(seconds, style)) : '—'}</code>
        </p>
        <div className="timestamp-actions">
          <button type="button" className="style-button" onClick={onCancel}>{t.cancel}</button>
          <button type="submit" className="style-button is-primary" disabled={!valid}>
            {target.position === null ? t.insert : t.edit}
          </button>
        </div>
      </form>
    </dialog>
  );
}
