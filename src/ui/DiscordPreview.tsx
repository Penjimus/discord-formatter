// Aperçu façon Discord (étape 17, SPEC.md S31 à S34) : le message tel que Discord l'affiche sur
// ordinateur, thème sombre. Simple affichage du document : rien n'est modifié (S32).
// Teintes, tailles et polices reproduites à l'œil (écart accepté, comme pour l'ANSI, §6).
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { HLJSApi } from 'highlight.js';
import type { AnsiSegment, CodeBlock, DiscordDocument, InlineNode, Mark, MentionNode } from '../core/document';
import { EMOTICON_EMOJIS } from '../core/emoticons';
import { previewOf, type PreviewBlock, type PreviewGroup, type PreviewNode } from '../core/preview';
import { timestampPreview } from '../core/timestampPreview';
import { colorToAttr, cssColor } from './ansiPalette';
import { loadedEmojiIndex, onEmojiIndexLoaded } from './emojiLibrary';
import { highlightRanges, isHighlighted, loadHighlighter } from './syntaxHighlight';
import { useLanguage, useTexts, type Language } from './i18n/language';
import type { Texts } from './i18n/fr';

interface Props {
  /** Les messages à afficher : un seul, ou les messages découpés (S34). */
  messages: readonly DiscordDocument[];
  shown: boolean;
  onToggle: () => void;
}

/** Spoilers révélés, par message (« message-numéro »). */
type Revealed = ReadonlySet<string>;

interface RenderContext {
  readonly message: number;
  readonly revealed: Revealed;
  readonly reveal: (key: string) => void;
  readonly hljs: HLJSApi | null;
  readonly texts: Texts;
  readonly language: Language;
}

/** Balises HTML des styles de texte (le spoiler est traité à part). */
const MARK_TAGS: Record<Exclude<Mark, 'spoiler'>, string> = {
  strike: 's',
  underline: 'u',
  bold: 'strong',
  italic: 'em',
};

const MENTION_SIGNS: Record<MentionNode['kind'], string> = { user: '@', role: '@', channel: '#' };

/** Puces des niveaux de liste (disque, cercle, carré, comme les listes habituelles). */
const BULLETS = ['•', '◦', '▪'];

/** Un spoiler : caché, un clic le révèle (S33). */
function Spoiler({ id, context, block = false, children }: {
  id: number;
  context: RenderContext;
  /** Spoiler autour d'un bloc de code : une boîte entière plutôt qu'un morceau de ligne. */
  block?: boolean;
  children: ReactNode;
}) {
  const key = `${context.message}-${id}`;
  const revealed = context.revealed.has(key);
  const Tag = block ? 'div' : 'span';
  return (
    <Tag className={`dp-spoiler${block ? ' dp-spoiler-block' : ''}${revealed ? ' is-revealed' : ''}`}
      title={revealed ? undefined : context.texts.preview.spoiler}
      onClick={(event) => {
        if (revealed) return;
        // Un premier clic sur un lien caché le révèle seulement, sans l'ouvrir.
        event.preventDefault();
        context.reveal(key);
      }}>
      {children}
    </Tag>
  );
}

/** Le contenu d'un morceau, sans ses styles. */
function nodeContent(node: InlineNode, context: RenderContext): ReactNode {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'code':
      return <code className="dp-code">{node.code}</code>;
    case 'mention':
      return <span className="dp-mention">{MENTION_SIGNS[node.kind]}{node.id}</span>;
    case 'timestamp':
      return <span className="dp-timestamp">{timestampPreview(node.seconds, node.style, { language: context.language })}</span>;
    case 'raw': {
      // Émoticône ou code `:nom:` : l'émoji, comme Discord ; sinon le texte tel quel (S33).
      const emoji = EMOTICON_EMOJIS[node.raw] ?? loadedEmojiIndex()?.emojiForCode(node.raw) ?? null;
      return emoji ? <span title={node.raw}>{emoji}</span> : node.raw;
    }
  }
}

function renderNode({ node, spoiler }: PreviewNode, key: number, context: RenderContext): ReactNode {
  let content = nodeContent(node, context);
  // Du plus intérieur au plus extérieur (§2.1).
  for (const mark of [...node.marks].reverse()) {
    if (mark === 'spoiler') continue;
    const Tag = MARK_TAGS[mark] as 'strong';
    content = <Tag>{content}</Tag>;
  }
  if (spoiler !== null) content = <Spoiler id={spoiler} context={context}>{content}</Spoiler>;
  return <Fragment key={key}>{content}</Fragment>;
}

/** Morceau d'un bloc `ansi` coloré, avec ses styles et couleurs (§6). */
function renderAnsi(segment: AnsiSegment, key: number): ReactNode {
  const { style } = segment;
  const classes = [
    style.bold && 'ansi-bold',
    style.italic && 'ansi-italic',
    style.underline && 'ansi-underline',
    style.strike && 'ansi-strike',
  ].filter(Boolean).join(' ');
  return (
    <span key={key} className={classes || undefined} style={{
      color: style.color === null ? undefined : cssColor(colorToAttr(style.color)),
      backgroundColor: style.background === null ? undefined : cssColor(colorToAttr(style.background)),
    }}>{segment.text}</span>
  );
}

/** Code coloré par Highlight.js (étape 12b). */
function renderHighlighted(block: CodeBlock, hljs: HLJSApi): ReactNode[] {
  const parts: ReactNode[] = [];
  let offset = 0;
  for (const range of highlightRanges(hljs, block.code, block.language)) {
    if (range.from > offset) parts.push(block.code.slice(offset, range.from));
    parts.push(<span key={range.from} className={range.className}>{block.code.slice(range.from, range.to)}</span>);
    offset = range.to;
  }
  parts.push(block.code.slice(offset));
  return parts;
}

function renderCodeBlock(item: Extract<PreviewBlock, { type: 'codeBlock' }>, key: number, context: RenderContext) {
  const { block } = item;
  const highlighted = context.hljs !== null && isHighlighted(context.hljs, block.language);
  const content = block.segments
    ? block.segments.map(renderAnsi)
    : highlighted && context.hljs ? renderHighlighted(block, context.hljs) : block.code;
  let element: ReactNode = (
    <pre className={`dp-codeblock${highlighted ? ' code-block-syntax' : ''}`}>{content}</pre>
  );
  for (const mark of [...block.marks].reverse()) {
    if (mark === 'spoiler') continue;
    const Tag = MARK_TAGS[mark] as 'strong';
    element = <Tag>{element}</Tag>;
  }
  if (item.spoiler !== null) element = <Spoiler id={item.spoiler} context={context} block>{element}</Spoiler>;
  return (
    <div key={key} className="dp-block" style={{ marginLeft: `${item.bulletLevel * 1.5}em` }}>{element}</div>
  );
}

function renderParagraph(item: Extract<PreviewBlock, { type: 'paragraph' }>, key: number, context: RenderContext) {
  const { block, list } = item;
  let nodeKey = 0;
  const content = item.runs.map((run, i) => {
    const nodes = run.nodes.map((node) => renderNode(node, nodeKey++, context));
    return run.link
      ? <a key={i} className="dp-link" href={run.link.url} target="_blank" rel="noreferrer">{nodes}</a>
      : <Fragment key={i}>{nodes}</Fragment>;
  });
  const classes = ['dp-line', `dp-${block.style}`];
  if (!list) return <div key={key} className={classes.join(' ')}>{content.length ? content : <br />}</div>;
  const level = block.list?.level ?? 1;
  const marker = list.kind === 'ordered' ? `${list.number}.` : BULLETS[Math.min(level, BULLETS.length) - 1];
  return (
    <div key={key} className={[...classes, 'dp-list'].join(' ')} style={{ paddingLeft: `${level * 1.5}em` }}>
      <span className="dp-marker" style={{ left: `${level * 1.5 - 1.5}em` }}>{marker}</span>
      {content}
    </div>
  );
}

function renderGroup(group: PreviewGroup, key: number, context: RenderContext) {
  const blocks = group.blocks.map((item, i) =>
    item.type === 'codeBlock' ? renderCodeBlock(item, i, context) : renderParagraph(item, i, context));
  return group.quote
    ? <blockquote key={key} className="dp-quote">{blocks}</blockquote>
    : <Fragment key={key}>{blocks}</Fragment>;
}

/**
 * Heure d'envoi : maintenant. « Aujourd'hui à 14:32 » sur le premier message ; l'heure seule,
 * au survol, sur les suivants (messages envoyés à la suite, comme dans Discord).
 */
function sendTime(texts: Texts): { full: string; short: string } {
  const short = new Intl.DateTimeFormat(texts.locale, texts.locale === 'fr-FR'
    ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    : { hour: 'numeric', minute: '2-digit' }).format(new Date());
  return { full: texts.preview.today(short), short };
}

/** Un bloc de code avec un langage colorable est-il présent ? (Highlight.js chargé seulement alors.) */
function needsHighlighter(messages: readonly DiscordDocument[]): boolean {
  return messages.some((message) => message.blocks.some((block) =>
    block.type === 'codeBlock' && block.language !== '' && block.language.toLowerCase() !== 'ansi'));
}

export function DiscordPreview({ messages, shown, onToggle }: Props) {
  const texts = useTexts();
  const t = texts.preview;
  const language = useLanguage();
  const [revealed, setRevealed] = useState<Revealed>(new Set());
  const [hljs, setHljs] = useState<HLJSApi | null>(null);
  const [, setEmojiVersion] = useState(0);

  // Les émojis chargés : les codes `:nom:` sont redessinés en émoji.
  useEffect(() => onEmojiIndexLoaded(() => setEmojiVersion((version) => version + 1)), []);
  const wantsHighlighter = shown && needsHighlighter(messages);
  useEffect(() => {
    if (wantsHighlighter && !hljs) void loadHighlighter().then(setHljs);
  }, [wantsHighlighter, hljs]);

  const reveal = (key: string) => setRevealed((old) => new Set(old).add(key));
  const previews = shown ? messages.map(previewOf) : [];
  const empty = previews.every((groups) => groups.length === 0);
  const time = sendTime(texts);

  return (
    <section className={`discord-preview${shown ? '' : ' is-hidden'}`} aria-label={t.title}>
      <header className="discord-preview-header">
        <h2>{t.title}</h2>
        {shown && messages.length > 1 && <span className="discord-preview-note">{t.messages(messages.length)}</span>}
        <button type="button" onClick={onToggle}>{shown ? t.hide : t.show}</button>
      </header>
      {shown && (
        <div className="dp-chat">
          {empty ? <p className="dp-empty">{t.empty}</p> : previews.map((groups, index) => (
            <article key={index} className={`dp-message${index === 0 ? ' is-first' : ''}`}>
              {index === 0 ? <>
                <div className="dp-avatar" aria-hidden="true" />
                <div className="dp-author"><span className="dp-name">{t.author}</span><span className="dp-time">{time.full}</span></div>
              </> : <span className="dp-hover-time" aria-hidden="true">{time.short}</span>}
              <div className="dp-content">
                {groups.map((group, i) => renderGroup(group, i, { message: index, revealed, reveal, hljs, texts, language }))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
