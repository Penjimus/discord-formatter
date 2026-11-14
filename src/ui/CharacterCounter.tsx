// Compteur de caractères du texte de droite, bouton 2000 / 4000 et barre de progression (S9, S9b, S9c).
// Il n'agit jamais sur le texte : l'écriture reste libre au-delà de la limite.
import { checkLength, progressRatio, type MessageLimit } from '../core/length';

const LIMITS: MessageLimit[] = [2000, 4000];

export function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR');
}

interface Props {
  text: string;
  limit: MessageLimit;
  onLimitChange(limit: MessageLimit): void;
  /** Vrai quand le brouillon a pu être enregistré dans le navigateur (S28) ; sinon rien n'est affiché (S30). */
  draftSaved?: boolean;
}

export function CharacterCounter({ text, limit, onLimitChange, draftSaved }: Props) {
  const check = checkLength(text, limit);
  const percent = progressRatio(check) * 100;
  const status = check.over
    ? `${formatNumber(-check.remaining)} de trop`
    : `${formatNumber(check.remaining)} restant${check.remaining > 1 ? 's' : ''}`;

  return (
    <div className={`char-counter${check.over ? ' is-over' : ''}`}>
      <div className="char-counter-line">
        <span className="char-counter-count" aria-live="polite">
          <strong>{formatNumber(check.length)}</strong> / {formatNumber(limit)} · {status}
        </span>
        {draftSaved && (
          <span className="draft-status" title="Gardé dans ce navigateur seulement : vous le retrouverez en rouvrant la page">
            ✓ Brouillon enregistré
          </span>
        )}
        <span className="char-counter-limits" role="group" aria-label="Limite de caractères">
          {LIMITS.map((value) => (
            <button key={value} type="button" aria-pressed={value === limit}
              className={value === limit ? 'is-active' : undefined}
              title={value === 2000 ? 'Limite sans Nitro' : 'Limite avec Nitro'}
              onClick={() => onLimitChange(value)}>
              {formatNumber(value)}
            </button>
          ))}
        </span>
      </div>
      <div className="char-counter-bar" role="progressbar" aria-label="Caractères utilisés"
        aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(check.length, limit)}>
        <div className="char-counter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
