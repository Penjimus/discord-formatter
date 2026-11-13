// Barre d'outils de l'éditeur de gauche : styles, mise en page, bloc de code, couleurs ANSI.
// Les options impossibles à l'endroit du curseur sont grisées (toolbarState, étape 6 ; S6, S7).
import { useEditorState, type Editor } from '@tiptap/react';
import { toolbarState, type OptionState, type ToolbarOption } from '../core/compatibility';
import type { LineStyle, ListKind, MentionKind } from '../core/document';
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
import { ANSI_FLAG_MARKS, CODE_MARK, type AnsiFlag } from './editorConvert';
import { EmojiPicker } from './EmojiPicker';

/** Boutons de mention (§7) : chacun insère son modèle, à compléter dans Discord (S8). */
const MENTIONS: { kind: MentionKind; label: string; title: string }[] = [
  { kind: 'user', label: '@ Utilisateur', title: 'Mention d\'utilisateur (insère <@ID_UTILISATEUR>)' },
  { kind: 'role', label: '@ Rôle', title: 'Mention de rôle (insère <@&ID_ROLE>)' },
  { kind: 'channel', label: '# Salon', title: 'Lien vers un salon (insère <#ID_SALON>)' },
];

/** Langages proposés dans le champ (docs/discord-rules.md §5) ; on peut en taper un autre. */
const LANGUAGES = ['ansi', 'js', 'py', 'html', 'css', 'json', 'c', 'cpp', 'cs', 'php', 'sql', 'bash', 'yaml', 'xml', 'md'];

const STYLES = [
  { option: 'bold', mark: 'bold', label: 'Gras', hint: 'Ctrl+B' },
  { option: 'italic', mark: 'italic', label: 'Italique', hint: 'Ctrl+I' },
  { option: 'underline', mark: 'underline', label: 'Souligné', hint: 'Ctrl+U' },
  { option: 'strike', mark: 'strike', label: 'Barré', hint: 'Ctrl+Maj+S' },
  { option: 'spoiler', mark: 'spoiler', label: 'Spoiler', hint: '' },
  { option: 'inlineCode', mark: CODE_MARK, label: 'Code', hint: 'Ctrl+E' },
] as const;

const LINE_STYLES: { option: ToolbarOption; style: LineStyle; label: string; title: string }[] = [
  { option: 'heading1', style: 'heading1', label: 'T1', title: 'Titre 1' },
  { option: 'heading2', style: 'heading2', label: 'T2', title: 'Titre 2' },
  { option: 'heading3', style: 'heading3', label: 'T3', title: 'Titre 3' },
  { option: 'subtext', style: 'subtext', label: 'Sous-texte', title: 'Sous-texte (petit, gris)' },
];

const ANSI_FLAGS: { flag: AnsiFlag; option: ToolbarOption; label: string; hint: string }[] = [
  { flag: 'bold', option: 'ansiBold', label: 'Gras', hint: 'Ctrl+B' },
  { flag: 'italic', option: 'ansiItalic', label: 'Italique', hint: 'Ctrl+I' },
  { flag: 'underline', option: 'ansiUnderline', label: 'Souligné', hint: 'Ctrl+U' },
  { flag: 'strike', option: 'ansiStrike', label: 'Barré', hint: 'Ctrl+Maj+S' },
];

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
  const enabled = state?.enabled ?? false;
  return (
    <button
      type="button"
      className={`style-button ${className}${active ? ' is-active' : ''}`}
      aria-pressed={active}
      disabled={!enabled}
      title={enabled ? title : `${title} : impossible ici. ${state?.reason ?? ''}`}
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
function IndexedPicker({ editor, target, label, current, enabled, reason }: {
  editor: Editor; target: 'color' | 'background'; label: string; current: string | null; enabled: boolean; reason: string;
}) {
  const active = current?.startsWith('n') ?? false;
  return (
    <details className={`indexed-picker${enabled ? '' : ' is-disabled'}`}>
      <summary
        className={`swatch swatch-indexed${active ? ' is-active' : ''}`}
        style={active && current ? { background: cssColor(current) } : undefined}
        title={`${label} : 256 couleurs${reason}`}
        aria-label={`${label} : 256 couleurs`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => { if (!enabled) event.preventDefault(); }}
      >
        256
      </summary>
      <div className="indexed-grid" role="group" aria-label={`${label} : 256 couleurs`}>
        {Array.from({ length: 256 }, (_, index) => (
          <button
            key={index}
            type="button"
            className={`indexed-swatch${current === `n${index}` ? ' is-active' : ''}`}
            style={{ background: indexedCss(index) }}
            title={`Couleur ${index}`}
            aria-label={`Couleur ${index}`}
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
  const enabled = state?.enabled ?? false;
  const reason = enabled ? '' : ` : impossible ici. ${state?.reason ?? ''}`;
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
          title={`${entry.name} (${entry.code})${reason}`}
          aria-label={entry.name}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setAnsiColor(editor, target, String(entry.code))}
        />
      ))}
      <IndexedPicker editor={editor} target={target} label={label} current={current} enabled={enabled} reason={reason} />
      <label className={`swatch swatch-custom${current?.startsWith('#') ? ' is-active' : ''}`} title={`Couleur au choix${reason}`}
        style={current?.startsWith('#') ? { background: cssColor(current) } : undefined}>
        <span aria-hidden="true">+</span>
        <input
          type="color"
          aria-label={`${label} au choix`}
          disabled={!enabled}
          value={custom}
          onChange={(event) => setAnsiColor(editor, target, event.target.value)}
        />
      </label>
      <button
        type="button"
        className="swatch swatch-none"
        disabled={!enabled || current === null}
        title={`Retirer la couleur${reason}`}
        aria-label={`${label} : aucune`}
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
}

export function Toolbar({ editor, onInsertTimestamp }: ToolbarProps) {
  const view = useEditorState({ editor, selector: ({ editor: current }) => readToolbar(current) });
  const option = (name: ToolbarOption) => view.options?.[name];
  const languageState = option('codeLanguage');

  return (
    <div className="toolbar" role="toolbar" aria-label="Mise en forme">
      <div className="toolbar-group" role="group" aria-label="Styles">
        {STYLES.map(({ option: name, mark, label, hint }) => (
          <ToolButton key={mark} label={label} title={hint ? `${label} (${hint})` : label}
            className={`style-${mark}`} state={option(name)} active={view.marks[mark]}
            onClick={() => editor.chain().focus().toggleMark(mark).run()} />
        ))}
      </div>

      <div className="toolbar-group" role="group" aria-label="Mise en page">
        {LINE_STYLES.map(({ option: name, style, label, title }) => (
          <ToolButton key={style} label={label} title={title} state={option(name)}
            active={view.lineStyle === style} onClick={() => toggleLineStyle(editor, style)} />
        ))}
        <ToolButton label="Citation" title="Citation" state={option('quote')} active={view.quote}
          onClick={() => toggleQuote(editor)} />
        <ToolButton label="• Liste" title="Liste à puces" state={option('bulletList')}
          active={view.listKind === 'bullet'} onClick={() => toggleList(editor, 'bullet')} />
        <ToolButton label="1. Liste" title="Liste numérotée" state={option('orderedList')}
          active={view.listKind === 'ordered'} onClick={() => toggleList(editor, 'ordered')} />
        <ToolButton label="Niveau −" title="Niveau − (Maj+Tab)" state={option('outdent')}
          onClick={() => changeListLevel(editor, -1)} />
        <ToolButton label="Niveau +" title="Niveau + (Tab)" state={option('indent')}
          onClick={() => changeListLevel(editor, 1)} />
      </div>

      <div className="toolbar-group" role="group" aria-label="Éléments Discord">
        {MENTIONS.map(({ kind, label, title }) => (
          <ToolButton key={kind} label={label} title={title} state={option('mention')}
            onClick={() => insertMention(editor, kind)} />
        ))}
        <EmojiPicker editor={editor} state={option('emoji')} />
        <ToolButton label="🕒 Horodatage" title="Insérer un horodatage (date et heure)" state={option('timestamp')}
          onClick={onInsertTimestamp} />
      </div>

      <div className="toolbar-group" role="group" aria-label="Bloc de code">
        <ToolButton label="Bloc de code" title="Insérer un bloc de code" state={option('codeBlock')}
          onClick={() => insertCodeBlock(editor)} />
        <label className="language-field" title={languageState?.enabled ? 'Langage du bloc de code (vide par défaut)' : languageState?.reason ?? ''}>
          Langage
          <input
            type="text"
            list="code-languages"
            placeholder={view.inCodeBlock ? 'aucun' : ''}
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

      <div className="toolbar-group toolbar-ansi" role="group" aria-label="Couleurs ANSI">
        <span className="color-row-label">ANSI</span>
        {ANSI_FLAGS.map(({ flag, option: name, label, hint }) => (
          <ToolButton key={flag} label={label} title={`${label} ANSI (${hint})`} className={`style-${flag}`}
            state={option(name)} active={view.ansiFlags[flag]} onClick={() => toggleAnsiFlag(editor, flag)} />
        ))}
        <ColorRow editor={editor} target="color" label="Texte" palette={[...TEXT_COLORS, ...BRIGHT_TEXT_COLORS]}
          current={view.color} state={option('ansiColor')} />
        <ColorRow editor={editor} target="background" label="Fond" palette={[...BACKGROUND_COLORS, ...BRIGHT_BACKGROUND_COLORS]}
          current={view.background} state={option('ansiBackground')} />
      </div>
    </div>
  );
}
