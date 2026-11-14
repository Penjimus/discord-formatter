// Langue de l'interface (étape 18, S36, S37) : français ou anglais. Seuls les textes de l'interface
// en dépendent ; le texte produit pour Discord ne change jamais (S38).
// Le choix est gardé dans la mémoire du navigateur, à part du brouillon.
import { useSyncExternalStore } from 'react';
import type { ReasonCode, ReasonParams } from '../../core/reasons';
import { en } from './en';
import { fr, type Texts } from './fr';

export type Language = 'fr' | 'en';
export const LANGUAGES: readonly Language[] = ['fr', 'en'];
export const TEXTS: Readonly<Record<Language, Texts>> = { fr, en };

const STORAGE_KEY = 'discord-formatter:langue';

/** Langue au tout premier lancement : français si le navigateur est en français, anglais sinon (S37). */
export function browserLanguage(preferred: readonly string[]): Language {
  return preferred[0]?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function initialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    // Mémoire bloquée : langue du navigateur, sans message (comme le brouillon, S30).
  }
  if (typeof navigator === 'undefined') return 'fr';
  return browserLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

let current: Language = typeof window === 'undefined' ? 'fr' : initialLanguage();
const listeners = new Set<() => void>();

export function currentLanguage(): Language {
  return current;
}

/** Textes de la langue en cours, pour le code hors de React (éditeur, propositions). */
export function currentTexts(): Texts {
  return TEXTS[current];
}

/** Change la langue, la garde dans le navigateur et prévient l'interface. */
export function setLanguage(language: Language): void {
  if (language === current) return;
  current = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Mémoire bloquée : le choix vaut pour cette visite seulement.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  for (const listener of listeners) listener();
}

export function onLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Langue en cours ; le composant est redessiné quand elle change. */
export function useLanguage(): Language {
  return useSyncExternalStore(onLanguageChange, currentLanguage);
}

/** Textes de la langue en cours ; le composant est redessiné quand elle change. */
export function useTexts(): Texts {
  return TEXTS[useLanguage()];
}

/** Texte d'une raison donnée par le cœur (grisage, adresse ou date refusée). */
export function reasonText(texts: Texts, reason: { code: ReasonCode | null; params: ReasonParams } | undefined): string {
  if (!reason?.code) return texts.reasonUnknown;
  return texts.reasons[reason.code](reason.params);
}

/** Nombre au format de la langue (« 1 234 » ou « 1,234 »). */
export function formatNumber(texts: Texts, value: number): string {
  return value.toLocaleString(texts.locale);
}

/** Bulle d'aide d'une option grisée : son nom, puis la raison dans la langue de l'interface. */
export function greyedTitle(texts: Texts, title: string, reason: { code: ReasonCode | null; params: ReasonParams } | undefined): string {
  return texts.toolbar.impossible(title, reasonText(texts, reason));
}
