// Compteur de caractères du texte de droite, bouton 2000 / 4000 et barre de progression (S9, S9b, S9c).
// Il n'agit jamais sur le texte : l'écriture reste libre au-delà de la limite.
import { checkLength, progressRatio, type MessageLimit } from '../core/length';
import { formatNumber, useTexts } from './i18n/language';

const LIMITS: MessageLimit[] = [2000, 4000];

interface Props {
  text: string;
  limit: MessageLimit;
  onLimitChange(limit: MessageLimit): void;
  /** Vrai quand le brouillon a pu être enregistré dans le navigateur (S28) ; sinon rien n'est affiché (S30). */
  draftSaved?: boolean;
}

export function CharacterCounter({ text, limit, onLimitChange, draftSaved }: Props) {
  const texts = useTexts();
  const t = texts.counter;
  const number = (value: number) => formatNumber(texts, value);
  const check = checkLength(text, limit);
  const percent = progressRatio(check) * 100;
  const status = check.over ? t.over(number(-check.remaining)) : t.remaining(number(check.remaining), check.remaining);

  return (
    <div className={`char-counter${check.over ? ' is-over' : ''}`}>
      <div className="char-counter-line">
        <span className="char-counter-count" aria-live="polite">
          <strong>{number(check.length)}</strong> / {number(limit)} · {status}
        </span>
        {draftSaved && (
          <span className="draft-status" title={t.draftSavedTitle}>{t.draftSaved}</span>
        )}
        <span className="char-counter-limits" role="group" aria-label={t.limits}>
          {LIMITS.map((value) => (
            <button key={value} type="button" aria-pressed={value === limit}
              className={value === limit ? 'is-active' : undefined}
              title={value === 2000 ? t.withoutNitro : t.withNitro}
              onClick={() => onLimitChange(value)}>
              {number(value)}
            </button>
          ))}
        </span>
      </div>
      <div className="char-counter-bar" role="progressbar" aria-label={t.progress}
        aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(check.length, limit)}>
        <div className="char-counter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
