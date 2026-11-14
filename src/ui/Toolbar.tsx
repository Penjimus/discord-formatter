// Barre d'outils de l'éditeur de gauche : styles, mise en page, bloc de code, couleurs ANSI.
// Les options impossibles à l'endroit du curseur sont grisées (toolbarState, étape 6 ; S6, S7).
import { useEditorState, type Editor } from '@tiptap/react';
import { toolbarState, type OptionState, type ToolbarOption } from '../core/compatibility';
import { MENTION_TEMPLATES, type LineStyle, type ListKind, type MentionKind } from '../core/document';
import { mentionSyntax } from '../core/elements';
import {
  BACKGROUND_COLORS,
  BRIGHT_BACKGROUND_COLORS,
  BRIGHT_TEXT_COLORS,
  TEXT_COLORS,
  cssColor,
  indexedCss,
  type PaletteEntry,
} from './ansiPalette';
import {
  analysisDocument,
  changeListLevel,
  currentAnsiColor,
  insertCodeBlock,
  insertMention,
  setAnsiColor,
  setCodeLanguage,
  toggleAnsiFlag,
  toggleLineStyle,
  toggleList,
  toggleQuote,
} from './editorCommands';
import { ANSI_FLAG_MARKS, CODE_MARK, LINK_MARK, type AnsiFlag } from './editorConvert';
import { EmojiPicker } from './EmojiPicker';
import { greyedTitle, reasonText, useTexts } from './i18n/language';
import type { Texts } from './i18n/fr';

/** Boutons de mention (§7) : chacun insère son modèle, à compléter dans Discord (S8). */
const MENTIONS: MentionKind[] = ['user', 'role', 'channel'];

/** Langages proposés dans le champ (docs/discord-rules.md §5) ; on peut en taper un autre. */
const LANGUAGES = ['ansi', 'js', 'py', 'html', 'css', 'json', 'c', 'cpp', 'cs', 'php', 'sql', 'bash', 'yaml', 'xml', 'md'];

const STYLES = [
  { option: 'bold', mark: 'bold', hint: 'Ctrl+B' },
  { option: 'italic', mark: 'italic', hint: 'Ctrl+I' },
  { option: 'underline', mark: 'underline', hint: 'Ctrl+U' },
  { option: 'strike', mark: 'strike', hint: 'strike' },
  { option: 'spoiler', mark: 'spoiler', hint: '' },
  { option: 'inlineCode', mark: CODE_MARK, hint: 'Ctrl+E' },
] as const;

/** Nom d'un style dans les textes (le code en ligne s'appelle `inlineCode`). */
function styleLabel(texts: Texts, option: (typeof STYLES)[number]['option']): string {
  return texts.toolbar[option];
}

/** Raccourci affiché (Ctrl+Maj+S en français, Ctrl+Shift+S en anglais). */
function shortcut(texts: Texts, hint: string): string {
  return hint === 'strike' ? texts.toolbar.strikeShortcut : hint;
}

const LINE_STYLES: { option: ToolbarOption; style: LineStyle; label: (t: Texts['toolbar']) => string; title: (t: Texts['toolbar']) => string }[] = [
  { option: 'heading1', style: 'heading1', label: (t) => t.heading1Label, title: (t) => t.heading1 },
  { option: 'heading2', style: 'heading2', label: (t) => t.heading2Label, title: (t) => t.heading2 },
  { option: 'heading3', style: 'heading3', label: (t) => t.heading3Label, title: (t) => t.heading3 },
  { option: 'subtext', style: 'subtext', label: (t) => t.subtext, title: (t) => t.subtextTitle },
];

const ANSI_FLAGS: { flag: AnsiFlag; option: ToolbarOption; hint: string }[] = [
  { flag: 'bold', option: 'ansiBold', hint: 'Ctrl+B' },
  { flag: 'italic', option: 'ansiItalic', hint: 'Ctrl+I' },
  { flag: 'underline', option: 'ansiUnderline', hint: 'Ctrl+U' },
  { flag: 'strike', option: 'ansiStrike', hint: 'strike' },
];

/** Nom d'une couleur prédéfinie (codes 30 à 37, 40 à 47, 90 à 97, 100 à 107). */
function colorName(texts: Texts, code: number): string {
  const { palette } = texts;
  if (code >= 100) return palette.brightBackground(palette.bright[code - 100]);
  if (code >= 90) return palette.bright[code - 90];
  if (code >= 40) return palette.background[code - 40];
  return palette.text[code - 30];
}

/** Ce que la barre affiche : état des options et de la ligne du curseur. */
function readToolbar(editor: Editor) {
  const { state } = editor;
  const { $from } = state.selection;
  const index = $from.index(0);
  const node = state.doc.child(Math.min(index, state.doc.childCount - 1));
  let options: Record<ToolbarOption, OptionState> | null = null;
  try {
    options = toolbarState(analysisDocument(state), { block: index, inInlineCode: editor.isActive(CODE_MARK) });
  } catch (error) {
    console.error('Barre d\'outils non calculée :', error);
  }
  return {
    options,
    inCodeBlock: node.type.name === 'codeBlock',
    language: node.type.name === 'codeBlock' ? String(node.attrs.language) : '',
    lineStyle: node.type.name === 'line' ? String(node.attrs.lineStyle) : 'normal',
    listKind: (node.attrs.listKind ?? null) as ListKind | null,
    quote: Boolean(node.attrs.quote),
    marks: Object.fromEntries(STYLES.map(({ mark }) => [mark, editor.isActive(mark)])),
    inLink: editor.isActive(LINK_MARK),
    ansiFlags: Object.fromEntries(ANSI_FLAGS.map(({ flag }) => [flag, editor.isActive(ANSI_FLAG_MARKS[flag])])),
    color: currentAnsiColor(state, 'color'),
    background: currentAnsiColor(state, 'background'),
  };
}

interface ButtonProps {
  label: string;
  title: string;
  state: OptionState | undefined;
  active?: boolean;
  className?: string;
  onClick(): void;
}

/** Bouton de la barre : grisé avec sa raison en bulle d'aide. */
function ToolButton({ label, title, state, active = false, className = '', onClick }: ButtonProps) {
  const texts = useTexts();
  const enabled = state?.enabled ?? false;
  return (
    <button
      type="button"
      className={`style-button ${className}${active ? ' is-active' : ''}`}
      aria-pressed={active}
      disabled={!enabled}
      title={enabled ? title : greyedTitle(texts, title, state)}
      // Garde la sélection de l'éditeur au clic.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface ColorRowProps {
  editor: Editor;
  target: 'color' | 'background';
  label: string;
  palette: readonly PaletteEntry[];
  current: string | null;
  state: OptionState | undefined;
}

/** Les 256 couleurs (`38;5;N`, `48;5;N`, E16), dans un panneau qui s'ouvre au clic. */
function IndexedPicker({ editor, target, label, current, enabled, title }: {
  editor: Editor; target: 'color' | 'background'; label: string; current: string | null; enabled: boolean;
  title: (name: string) => string;
}) {
  const t = useTexts().toolbar;
  const active = current?.startsWith('n') ?? false;
  return (
    <details className={`indexed-picker${enabled ? '' : ' is-disabled'}`}>
      <summary
        className={`swatch swatch-indexed${active ? ' is-active' : ''}`}
        style={active && current ? { background: cssColor(current) } : undefined}
        title={title(t.colors256(label))}
        aria-label={t.colors256(label)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => { if (!enabled) event.preventDefault(); }}
      >
        256
      </summary>
      <div className="indexed-grid" role="group" aria-label={t.colors256(label)}>
        {Array.from({ length: 256 }, (_, index) => (
          <button
            key={index}
            type="button"
            className={`indexed-swatch${current === `n${index}` ? ' is-active' : ''}`}
            style={{ background: indexedCss(index) }}
            title={t.colorNumber(index)}
            aria-label={t.colorNumber(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              setAnsiColor(editor, target, `n${index}`);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}
          />
        ))}
      </div>
    </details>
  );
}

/** Couleurs prédéfinies (normales et claires), 256 couleurs, couleur au choix et « aucune ». */
function ColorRow({ editor, target, label, palette, current, state }: ColorRowProps) {
  const texts = useTexts();
  const t = texts.toolbar;
  const enabled = state?.enabled ?? false;
  const title = (name: string) => (enabled ? name : greyedTitle(texts, name, state));
  const custom = current?.startsWith('#') ? current : '#ffffff';
  return (
    <div className="color-row" role="group" aria-label={label}>
      <span className="color-row-label">{label}</span>
      {palette.map((entry) => (
        <button
          key={entry.code}
          type="button"
          className={`swatch${current === String(entry.code) ? ' is-active' : ''}`}
          style={{ background: entry.css }}
          disabled={!enabled}
          title={title(`${colorName(texts, entry.code)} (${entry.code})`)}
          aria-label={colorName(texts, entry.code)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setAnsiColor(editor, target, String(entry.code))}
        />
      ))}
      <IndexedPicker editor={editor} target={target} label={label} current={current} enabled={enabled} title={title} />
      <label className={`swatch swatch-custom${current?.startsWith('#') ? ' is-active' : ''}`} title={title(t.customColor)}
        style={current?.startsWith('#') ? { background: cssColor(current) } : undefined}>
        <span aria-hidden="true">+</span>
        <input
          type="color"
          aria-label={t.customColorAria(label)}
          disabled={!enabled}
          value={custom}
          onChange={(event) => setAnsiColor(editor, target, event.target.value)}
        />
      </label>
      <button
        type="button"
        className="swatch swatch-none"
        disabled={!enabled || current === null}
        title={title(t.removeColor)}
        aria-label={t.noColorAria(label)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setAnsiColor(editor, target, null)}
      >
        ✕
      </button>
    </div>
  );
}

interface ToolbarProps {
  editor: Editor;
  /** Ouvre la fenêtre d'horodatage pour en insérer un nouveau. */
  onInsertTimestamp(): void;
  /** Ouvre la fenêtre de lien (nouveau lien, ou celui sous le curseur). */
  onInsertLink(): void;
}

export function Toolbar({ editor, onInsertTimestamp, onInsertLink }: ToolbarProps) {
  const texts = useTexts();
  const t = texts.toolbar;
  const view = useEditorState({ editor, selector: ({ editor: current }) => readToolbar(current) });
  const option = (name: ToolbarOption) => view.options?.[name];
  const languageState = option('codeLanguage');

  return (
    <div className="toolbar" role="toolbar" aria-label={t.ariaLabel}>
      <div className="toolbar-group" role="group" aria-label={t.stylesGroup}>
        {STYLES.map(({ option: name, mark, hint }) => {
          const label = styleLabel(texts, name);
          return (
            <ToolButton key={mark} label={label} title={hint ? `${label} (${shortcut(texts, hint)})` : label}
              className={`style-${mark}`} state={option(name)} active={view.marks[mark]}
              onClick={() => editor.chain().focus().toggleMark(mark).run()} />
          );
        })}
      </div>

      <div className="toolbar-group" role="group" aria-label={t.layoutGroup}>
        {LINE_STYLES.map(({ option: name, style, label, title }) => (
          <ToolButton key={style} label={label(t)} title={title(t)} state={option(name)}
            active={view.lineStyle === style} onClick={() => toggleLineStyle(editor, style)} />
        ))}
        <ToolButton label={t.quote} title={t.quote} state={option('quote')} active={view.quote}
          onClick={() => toggleQuote(editor)} />
        <ToolButton label={t.bulletList} title={t.bulletListTitle} state={option('bulletList')}
          active={view.listKind === 'bullet'} onClick={() => toggleList(editor, 'bullet')} />
        <ToolButton label={t.orderedList} title={t.orderedListTitle} state={option('orderedList')}
          active={view.listKind === 'ordered'} onClick={() => toggleList(editor, 'ordered')} />
        <ToolButton label={t.outdent} title={t.outdentTitle} state={option('outdent')}
          onClick={() => changeListLevel(editor, -1)} />
        <ToolButton label={t.indent} title={t.indentTitle} state={option('indent')}
          onClick={() => changeListLevel(editor, 1)} />
      </div>

      <div className="toolbar-group" role="group" aria-label={t.discordGroup}>
        {MENTIONS.map((kind) => (
          <ToolButton key={kind} label={t.mentionLabels[kind]}
            title={t.mentionTitles[kind](mentionSyntax({ type: 'mention', kind, id: MENTION_TEMPLATES[kind], marks: [] }))}
            state={option('mention')} onClick={() => insertMention(editor, kind)} />
        ))}
        <EmojiPicker editor={editor} state={option('emoji')} />
        <ToolButton label={t.timestamp} title={t.timestampTitle} state={option('timestamp')}
          onClick={onInsertTimestamp} />
        <ToolButton label={t.link} title={t.linkTitle} state={option('link')}
          active={view.inLink} onClick={onInsertLink} />
      </div>

      <div className="toolbar-group" role="group" aria-label={t.codeGroup}>
        <ToolButton label={t.codeBlock} title={t.codeBlockTitle} state={option('codeBlock')}
          onClick={() => insertCodeBlock(editor)} />
        <label className="language-field" title={languageState?.enabled ? t.languageTitle : reasonText(texts, languageState)}>
          {t.language}
          <input
            type="text"
            list="code-languages"
            placeholder={view.inCodeBlock ? t.languageNone : ''}
            value={view.language}
            disabled={!(languageState?.enabled ?? false)}
            spellCheck={false}
            onChange={(event) => setCodeLanguage(editor, event.target.value)}
          />
        </label>
        <datalist id="code-languages">
          {LANGUAGES.map((language) => <option key={language} value={language} />)}
        </datalist>
      </div>

      <div className="toolbar-group toolbar-ansi" role="group" aria-label={t.ansiGroup}>
        <span className="color-row-label">{t.ansi}</span>
        {ANSI_FLAGS.map(({ flag, option: name, hint }) => {
          const label = styleLabel(texts, flag);
          return (
            <ToolButton key={flag} label={label} title={t.ansiTitle(label, shortcut(texts, hint))} className={`style-${flag}`}
              state={option(name)} active={view.ansiFlags[flag]} onClick={() => toggleAnsiFlag(editor, flag)} />
          );
        })}
        <ColorRow editor={editor} target="color" label={t.textColor} palette={[...TEXT_COLORS, ...BRIGHT_TEXT_COLORS]}
          current={view.color} state={option('ansiColor')} />
        <ColorRow editor={editor} target="background" label={t.background} palette={[...BACKGROUND_COLORS, ...BRIGHT_BACKGROUND_COLORS]}
          current={view.background} state={option('ansiBackground')} />
      </div>
    </div>
  );
}
