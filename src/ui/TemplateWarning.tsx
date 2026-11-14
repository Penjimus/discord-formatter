// Avertissement discret tant qu'un modèle de mention reste à compléter (S8, docs/discord-rules.md §7).
// Affiché sous le panneau droit et dans chaque message découpé qui contient un modèle (S26).
// Il nomme les modèles présents, anciens compris (`ID_UTILISATEUR`, `ID_SALON`, S38).
import { useTexts } from './i18n/language';

export function TemplateWarning({ words }: { words: string[] }) {
  const texts = useTexts();
  if (words.length === 0) return null;
  return <p className="template-warning" role="status">{texts.templateWarning(words.join(', '))}</p>;
}
