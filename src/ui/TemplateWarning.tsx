// Avertissement discret tant qu'un modèle de mention reste à compléter (S8, docs/discord-rules.md §7).
// Affiché sous le panneau droit et dans chaque message découpé qui contient un modèle (S26).
import { MENTION_TEMPLATES, type MentionKind } from '../core/document';

export function TemplateWarning({ kinds }: { kinds: MentionKind[] }) {
  if (kinds.length === 0) return null;
  const names = kinds.map((kind) => MENTION_TEMPLATES[kind]).join(', ');
  return (
    <p className="template-warning" role="status">
      À compléter dans Discord : remplacez {names} par le vrai identifiant (mode développeur, clic droit &gt; Copier
      l'identifiant), ou mentionnez directement la personne, le rôle ou le salon.
    </p>
  );
}
