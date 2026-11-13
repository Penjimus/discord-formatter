// Propositions de mention dans l'éditeur de gauche (S8) : « @ » propose Utilisateur ou Rôle, « # » propose Salon.
// Espace ferme les propositions sans ajouter d'espace ; Échap les ferme aussi.
import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { toolbarState } from '../core/compatibility';
import type { MentionKind } from '../core/document';
import { normalizeSearch } from '../core/emojiIndex';
import { analysisDocument, insertMention } from './editorCommands';
import { CODE_MARK } from './editorConvert';

export type MentionTrigger = '@' | '#';

export interface MentionChoice {
  kind: MentionKind;
  label: string;
}

const CHOICES: Readonly<Record<MentionTrigger, MentionChoice[]>> = {
  '@': [
    { kind: 'user', label: 'Utilisateur' },
    { kind: 'role', label: 'Rôle' },
  ],
  '#': [{ kind: 'channel', label: 'Salon' }],
};

/** Propositions ouvertes : où est le « @ » ou « # », ce qui a été tapé après, la proposition en surbrillance. */
export interface SuggestState {
  from: number;
  to: number;
  trigger: MentionTrigger;
  choices: MentionChoice[];
  selected: number;
}

type Meta = { open: { from: number; trigger: MentionTrigger } } | { close: true } | { select: number };

export const mentionSuggestKey = new PluginKey<SuggestState | null>('mentionSuggest');

/** Propositions dont le nom commence par le texte tapé (sans accents ni majuscules : « role » trouve « Rôle »). */
export function matchingChoices(trigger: MentionTrigger, query: string): MentionChoice[] {
  const wanted = normalizeSearch(query);
  return CHOICES[trigger].filter((choice) => normalizeSearch(choice.label).startsWith(wanted));
}

/** Une mention est-elle permise au curseur ? (grisage de l'étape 6 : pas dans du code) */
function mentionAllowed(state: EditorState): boolean {
  const marks = state.storedMarks ?? state.selection.$from.marks();
  try {
    const options = toolbarState(analysisDocument(state), {
      block: state.selection.$from.index(0),
      inInlineCode: marks.some((mark) => mark.type.name === CODE_MARK),
    });
    return options.mention.enabled;
  } catch {
    return false;
  }
}

/** Recalcule les propositions après une modification ou un déplacement du curseur ; `null` si elles se ferment. */
function follow(state: EditorState, from: number, trigger: MentionTrigger, selected: number): SuggestState | null {
  const { selection, doc } = state;
  if (!selection.empty) return null;
  const to = selection.from;
  if (to <= from || from < 0 || to > doc.content.size) return null;
  if (doc.resolve(from).parent !== selection.$from.parent) return null;
  const typed = doc.textBetween(from, to, '\n', '\n');
  if (typed[0] !== trigger) return null;
  const query = typed.slice(1);
  if (!/^\p{L}*$/u.test(query)) return null;
  const choices = matchingChoices(trigger, query);
  if (choices.length === 0) return null;
  return { from, to, trigger, choices, selected: Math.min(selected, choices.length - 1) };
}

function close(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(mentionSuggestKey, { close: true } satisfies Meta));
}

export const MentionSuggest = Extension.create({
  name: 'mentionSuggest',
  // Avant les autres raccourcis : Entrée, Tab et flèches servent aux propositions quand elles sont ouvertes.
  priority: 1000,

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin<SuggestState | null>({
        key: mentionSuggestKey,
        state: {
          init: () => null,
          apply(tr, old, _oldState, newState) {
            const meta = tr.getMeta(mentionSuggestKey) as Meta | undefined;
            if (meta && 'close' in meta) return null;
            if (meta && 'open' in meta) return follow(newState, meta.open.from, meta.open.trigger, 0);
            if (!old) return null;
            if (meta && 'select' in meta) return { ...old, selected: meta.select };
            if (!tr.docChanged && !tr.selectionSet) return old;
            return follow(newState, tr.mapping.map(old.from), old.trigger, old.selected);
          },
        },
        props: {
          // « @ » ou « # » tapé : il est écrit, et les propositions s'ouvrent si une mention est permise ici.
          handleTextInput(view, from, to, text) {
            if (text !== '@' && text !== '#') return false;
            if (!mentionAllowed(view.state)) return false;
            const tr = view.state.tr.insertText(text, from, to);
            tr.setMeta(mentionSuggestKey, { open: { from, trigger: text } } satisfies Meta);
            view.dispatch(tr);
            return true;
          },
          handleKeyDown(view, event) {
            const current = mentionSuggestKey.getState(view.state);
            if (!current) return false;
            const count = current.choices.length;
            switch (event.key) {
              case ' ':
              case 'Escape':
                // Retour à l'écriture normale ; l'espace n'est pas ajouté (demande de l'utilisateur).
                close(view);
                return true;
              case 'ArrowDown':
              case 'ArrowUp': {
                const step = event.key === 'ArrowDown' ? 1 : count - 1;
                view.dispatch(view.state.tr.setMeta(mentionSuggestKey, { select: (current.selected + step) % count } satisfies Meta));
                return true;
              }
              case 'Enter':
              case 'Tab':
                chooseMention(editor, current, current.choices[current.selected]);
                return true;
              default:
                return false;
            }
          },
        },
      }),
    ];
  },
});

/** Remplace « @rô » par le modèle choisi. */
export function chooseMention(editor: Editor, current: SuggestState, choice: MentionChoice | undefined): void {
  if (choice) insertMention(editor, choice.kind, { from: current.from, to: current.to });
}
