// Liste des propositions de mention, affichée sous le « @ » ou le « # » tapé (S8).
import { useEditorState, type Editor } from '@tiptap/react';
import { chooseMention, mentionSuggestKey } from './mentionSuggest';
import { useTexts } from './i18n/language';

export function MentionMenu({ editor }: { editor: Editor }) {
  const t = useTexts().mentionMenu;
  const current = useEditorState({ editor, selector: ({ editor: e }) => mentionSuggestKey.getState(e.state) ?? null });
  if (!current) return null;

  let place: { top: number; left: number };
  try {
    const box = editor.view.coordsAtPos(current.from);
    place = { top: box.bottom + 4, left: box.left };
  } catch {
    return null;
  }

  return (
    <ul className="mention-menu" role="listbox" aria-label={t.ariaLabel} style={place}>
      {current.choices.map((choice, position) => (
        <li
          key={choice.kind}
          role="option"
          aria-selected={position === current.selected}
          className={`mention-option${position === current.selected ? ' is-active' : ''}`}
          // Garde le curseur dans l'éditeur au clic.
          onMouseDown={(event) => {
            event.preventDefault();
            chooseMention(editor, current, choice);
          }}
        >
          {current.trigger} {t.choices[choice.kind]}
        </li>
      ))}
      <li className="mention-hint" aria-hidden="true">{t.hint}</li>
    </ul>
  );
}
