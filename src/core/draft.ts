// Brouillon (étape 16, SPEC.md S27 à S30) : mise en forme pour l'enregistrement et relecture.
// Fonctions pures : l'accès à la mémoire du navigateur est fait par l'interface (src/ui/draftStorage.ts).
// On garde le texte de droite tel quel (rien n'est perdu, S12) et non le document, dont la forme
// peut changer d'une version de l'appli à l'autre.
import type { MessageLimit } from './length';

export interface Draft {
  /** Texte de droite, exactement tel qu'il était. */
  text: string;
  limit: MessageLimit;
}

export const EMPTY_DRAFT: Draft = { text: '', limit: 2000 };

/** Numéro de format, pour reconnaître un brouillon d'une autre forme. */
const DRAFT_VERSION = 1;

export function encodeDraft(draft: Draft): string {
  return JSON.stringify({ version: DRAFT_VERSION, text: draft.text, limit: draft.limit });
}

/** Relit un brouillon enregistré ; absent ou illisible : brouillon vide (S30). */
export function decodeDraft(stored: string | null): Draft {
  if (!stored) return EMPTY_DRAFT;
  let data: unknown;
  try {
    data = JSON.parse(stored);
  } catch {
    return EMPTY_DRAFT;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return EMPTY_DRAFT;
  const record = data as Record<string, unknown>;
  if (record.version !== DRAFT_VERSION || typeof record.text !== 'string') return EMPTY_DRAFT;
  const limit: MessageLimit = record.limit === 4000 ? 4000 : 2000;
  return { text: record.text, limit };
}
