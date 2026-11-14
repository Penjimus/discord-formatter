// Chargement des émojis d'emojibase, seulement quand on en a besoin (sélecteur ouvert, code `:nom:` collé).
// Noms en français et en anglais (recherche dans les deux langues, noms affichés dans celle de
// l'interface, S39) et codes `:nom:` de la liste GitHub, la plus proche de Discord :
// emojibase n'a pas de liste « Discord » (choix de l'utilisateur, étape 10, Q1).
import { buildEmojiIndex, type EmojiIndex, type EmojiSource } from '../core/emojiIndex';
import type { Language } from './i18n/language';

const indexes: Partial<Record<Language, EmojiIndex>> = {};
let loading: Promise<Record<Language, EmojiIndex>> | null = null;
const listeners = new Set<() => void>();

/** Prévient quand les émojis viennent d'être chargés (pour redessiner les codes `:nom:`). */
export function onEmojiIndexLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Les émojis, s'ils sont déjà chargés (les codes `:nom:` sont les mêmes dans les deux langues). */
export function loadedEmojiIndex(language: Language = 'fr'): EmojiIndex | null {
  return indexes[language] ?? null;
}

/** Charge les émojis (une seule fois), avec les noms dans la langue voulue. */
export function loadEmojiIndex(language: Language = 'fr'): Promise<EmojiIndex> {
  loading ??= Promise.all([
    import('emojibase-data/fr/compact.json'),
    import('emojibase-data/en/compact.json'),
    import('emojibase-data/en/shortcodes/github.json'),
    import('emojibase-data/fr/messages.json'),
    import('emojibase-data/en/messages.json'),
  ]).then(([frCompact, enCompact, github, frMessages, enMessages]) => {
    const fr = frCompact.default as unknown as EmojiSource[];
    const en = enCompact.default as unknown as EmojiSource[];
    indexes.fr = buildEmojiIndex(fr, github.default, frMessages.default.groups, en);
    indexes.en = buildEmojiIndex(en, github.default, enMessages.default.groups, fr);
    for (const listener of listeners) listener();
    return indexes as Record<Language, EmojiIndex>;
  });
  return loading.then((loaded) => loaded[language]);
}

/** Le texte contient-il un code `:nom:` possible (à afficher en émoji à gauche) ? */
export function mayContainEmojiCode(text: string): boolean {
  return /:[A-Za-z0-9_+-]+:/.test(text);
}
