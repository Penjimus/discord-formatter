// Brouillon dans la mémoire du navigateur (localStorage) : rien ne quitte l'ordinateur (SPEC.md §7).
// Mémoire bloquée ou pleine : l'appli marche sans brouillon, sans message d'erreur (S30).
import { decodeDraft, encodeDraft, EMPTY_DRAFT, type Draft } from '../core/draft';

const STORAGE_KEY = 'discord-formatter:brouillon';

export function loadDraft(): Draft {
  try {
    return decodeDraft(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_DRAFT;
  }
}

/** Enregistre le brouillon ; renvoie faux si le navigateur l'a refusé. */
export function saveDraft(draft: Draft): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, encodeDraft(draft));
    return true;
  } catch {
    return false;
  }
}
