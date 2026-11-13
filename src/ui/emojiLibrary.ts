// Chargement des émojis d'emojibase, seulement quand on en a besoin (sélecteur ouvert, code `:nom:` collé).
// Noms en français (recherche, catégories) et codes `:nom:` de la liste GitHub, la plus proche de Discord :
// emojibase n'a pas de liste « Discord » (choix de l'utilisateur, étape 10, Q1).
import { buildEmojiIndex, type EmojiIndex, type EmojiSource } from '../core/emojiIndex';

let index: EmojiIndex | null = null;
let loading: Promise<EmojiIndex> | null = null;
const listeners = new Set<() => void>();

/** Prévient quand les émojis viennent d'être chargés (pour redessiner les codes `:nom:`). */
export function onEmojiIndexLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Les émojis, s'ils sont déjà chargés. */
export function loadedEmojiIndex(): EmojiIndex | null {
  return index;
}

/** Charge les émojis (une seule fois). */
export function loadEmojiIndex(): Promise<EmojiIndex> {
  loading ??= Promise.all([
    import('emojibase-data/fr/compact.json'),
    import('emojibase-data/en/shortcodes/github.json'),
    import('emojibase-data/fr/messages.json'),
  ]).then(([compact, github, messages]) => {
    index = buildEmojiIndex(compact.default as unknown as EmojiSource[], github.default, messages.default.groups);
    for (const listener of listeners) listener();
    return index;
  });
  return loading;
}

/** Le texte contient-il un code `:nom:` possible (à afficher en émoji à gauche) ? */
export function mayContainEmojiCode(text: string): boolean {
  return /:[A-Za-z0-9_+-]+:/.test(text);
}
