// Messages découpés (S25, S26) : un cadre par message, sous le panneau droit, chacun avec son
// compteur et son bouton « Copier ». Simple affichage : le texte de droite n'est jamais modifié.
import { useEffect, useState } from 'react';
import { ESC, ZERO_WIDTH_SPACE } from '../core/characters';
import { unfilledTemplates } from '../core/elements';
import { discordLength } from '../core/length';
import { TemplateWarning } from './TemplateWarning';
import { copyText } from './clipboard';
import { formatNumber } from './CharacterCounter';
import { headerToggle } from './DiscordTextPanel';

interface Props {
  messages: string[];
  limit: number;
  /** Numéro (à partir de 0) du seul message déroulé, `null` si tous sont réduits. */
  expanded: number | null;
  /** Clic sur l'en-tête d'un message. */
  onHeaderClick(index: number): void;
}

const INVISIBLE_NAMES: Record<string, string> = {
  [ESC]: 'Caractère ESC (couleurs ANSI)',
  [ZERO_WIDTH_SPACE]: 'Espace invisible (U+200B)',
};

/** Montre les caractères invisibles par un point rouge, comme le panneau droit ; la copie reste intacte. */
function showInvisibles(message: string): React.ReactNode[] {
  return message.split(new RegExp(`([${ESC}${ZERO_WIDTH_SPACE}])`)).map((part, i) =>
    INVISIBLE_NAMES[part]
      ? <span key={i} className="invisible-char" title={INVISIBLE_NAMES[part]}>•</span>
      : part,
  );
}

type CopyState = 'done' | 'failed';

export function SplitMessages({ messages, limit, expanded, onHeaderClick }: Props) {
  // État de copie de chaque message, effacé à chaque modification du texte ou de la limite.
  const [copied, setCopied] = useState<Record<number, CopyState>>({});
  useEffect(() => setCopied({}), [messages]);

  async function copy(index: number) {
    const ok = await copyText(messages[index]);
    setCopied((old) => ({ ...old, [index]: ok ? 'done' : 'failed' }));
  }

  return (
    <section className={`split-messages${expanded === null ? '' : ' has-expanded'}`} aria-label="Messages découpés">
      <p className="split-intro">
        Votre texte dépasse la limite : il est découpé en <strong>{messages.length} messages</strong>.
        Copiez-les et envoyez-les dans l'ordre. Cliquez sur un titre pour voir le message.
      </p>
      {messages.map((message, index) => {
        const state = copied[index];
        const open = expanded === index;
        return (
          <article key={index} className={`split-message${open ? ' is-expanded' : ''}`}>
            <header className="split-message-header is-toggle" {...headerToggle(() => onHeaderClick(index))}
              aria-expanded={open}>
              <h3>
                <span className="toggle-arrow" aria-hidden="true">{open ? '▾' : '▸'}</span>
                Message {index + 1} / {messages.length}
              </h3>
              <span className="split-message-count">
                {formatNumber(discordLength(message))} / {formatNumber(limit)}
              </span>
              <button type="button" className={`copy-button${state === 'done' ? ' is-copied' : ''}`}
                onClick={() => void copy(index)}>
                {state === 'done' ? '✓ Copié' : state === 'failed' ? 'Copie impossible' : 'Copier'}
              </button>
            </header>
            {open && <pre className="split-message-text">{showInvisibles(message)}</pre>}
            <TemplateWarning kinds={unfilledTemplates(message)} />
          </article>
        );
      })}
    </section>
  );
}
