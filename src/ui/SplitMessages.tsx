// Messages découpés (S25, S26) : un cadre par message, sous le panneau droit, chacun avec son
// compteur et son bouton « Copier ». Simple affichage : le texte de droite n'est jamais modifié.
import { useEffect, useState } from 'react';
import { ESC, ZERO_WIDTH_SPACE } from '../core/characters';
import { foundTemplateWords } from '../core/elements';
import { discordLength } from '../core/length';
import { TemplateWarning } from './TemplateWarning';
import { copyText } from './clipboard';
import { formatNumber, useTexts } from './i18n/language';
import type { Texts } from './i18n/fr';
import { headerToggle } from './DiscordTextPanel';

interface Props {
  messages: string[];
  limit: number;
  /** Numéro (à partir de 0) du seul message déroulé, `null` si tous sont réduits. */
  expanded: number | null;
  /** Clic sur l'en-tête d'un message. */
  onHeaderClick(index: number): void;
}

function invisibleNames(texts: Texts): Record<string, string> {
  return { [ESC]: texts.split.invisibleEsc, [ZERO_WIDTH_SPACE]: texts.split.invisibleSpace };
}

/** Montre les caractères invisibles par un point rouge, comme le panneau droit ; la copie reste intacte. */
function showInvisibles(message: string, texts: Texts): React.ReactNode[] {
  const names = invisibleNames(texts);
  return message.split(new RegExp(`([${ESC}${ZERO_WIDTH_SPACE}])`)).map((part, i) =>
    names[part]
      ? <span key={i} className="invisible-char" title={names[part]}>•</span>
      : part,
  );
}

type CopyState = 'done' | 'failed';

export function SplitMessages({ messages, limit, expanded, onHeaderClick }: Props) {
  // État de copie de chaque message, effacé à chaque modification du texte ou de la limite.
  const texts = useTexts();
  const t = texts.split;
  const [copied, setCopied] = useState<Record<number, CopyState>>({});
  useEffect(() => setCopied({}), [messages]);

  async function copy(index: number) {
    const ok = await copyText(messages[index]);
    setCopied((old) => ({ ...old, [index]: ok ? 'done' : 'failed' }));
  }

  return (
    <section className={`split-messages${expanded === null ? '' : ' has-expanded'}`} aria-label={t.ariaLabel}>
      <p className="split-intro">
        {t.introBefore}<strong>{t.introCount(messages.length)}</strong>{t.introAfter}
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
                {t.title(index + 1, messages.length)}
              </h3>
              <span className="split-message-count">
                {formatNumber(texts, discordLength(message))} / {formatNumber(texts, limit)}
              </span>
              <button type="button" className={`copy-button${state === 'done' ? ' is-copied' : ''}`}
                onClick={() => void copy(index)}>
                {state === 'done' ? t.copied : state === 'failed' ? t.copyFailed : t.copy}
              </button>
            </header>
            {open && <pre className="split-message-text">{showInvisibles(message, texts)}</pre>}
            <TemplateWarning words={foundTemplateWords(message)} />
          </article>
        );
      })}
    </section>
  );
}
