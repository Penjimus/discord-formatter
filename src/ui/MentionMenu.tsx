// Liste des propositions de mention, affichée sous le « @ » ou le « # » tapé (S8).
import { useEditorState, type Editor } from '@tiptap/react';
import { chooseMention, mentionSuggestKey } from './mentionSuggest';

export function MentionMenu({ editor }: { editor: Editor }) {
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
    <ul className="mention-menu" role="listbox" aria-label="Propositions de mention" style={place}>
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
          {current.trigger} {choice.label}
        </li>
      ))}
      <li className="mention-hint" aria-hidden="true">Entrée : choisir · Espace : continuer à écrire</li>
    </ul>
  );
}
