// Émojis standards (bibliothèque emojibase) : codes `:nom:` et recherche pour le sélecteur (S8b, docs/discord-rules.md §9).
// Les données sont fournies par l'appelant : le cœur ne charge rien lui-même.

/** Un émoji tel que fourni par emojibase (liste « compacte », en français). */
export interface EmojiSource {
  hexcode: string;
  label: string;
  unicode: string;
  group?: number;
  order?: number;
  tags?: string[];
}

/** Une catégorie emojibase (nom en français). */
export interface EmojiGroupSource {
  key: string;
  message: string;
  order: number;
}

/** Codes `:nom:` par émoji (clé : hexcode), un seul nom ou plusieurs. */
export type ShortcodeSource = Record<string, string | string[]>;

export interface Emoji {
  unicode: string;
  /** Nom français. */
  label: string;
  /** Noms des codes `:nom:`, sans les deux-points. */
  shortcodes: string[];
  /** Ce sur quoi porte la recherche : nom, mots-clés, codes, sans accents ni majuscules. */
  searchText: string[];
}

export interface EmojiCategory {
  key: string;
  name: string;
  emojis: Emoji[];
}

export interface EmojiIndex {
  categories: EmojiCategory[];
  /** Émoji d'un code `:nom:` (ou `\:nom:`, qui donne aussi l'émoji, I4) ; `null` si le nom est inconnu. */
  emojiForCode(code: string): string | null;
  /** Émojis dont le nom, un mot-clé ou un code contient la recherche (français ou anglais). */
  search(query: string): Emoji[];
}

/** Catégorie « composants » : teintes et cheveux seuls, pas des émojis à insérer. */
const COMPONENT_GROUP = 'component';
const CODE = /^\\?:([A-Za-z0-9_+-]+):$/;
const MAX_RESULTS = 200;

/** Minuscules, sans accents : « Étoile » et « etoile » se retrouvent. */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function buildEmojiIndex(
  sources: readonly EmojiSource[],
  shortcodes: ShortcodeSource,
  groups: readonly EmojiGroupSource[],
): EmojiIndex {
  const byCode = new Map<string, string>();
  const categories = [...groups]
    .sort((a, b) => a.order - b.order)
    .filter((group) => group.key !== COMPONENT_GROUP)
    .map((group) => ({ key: group.key, name: group.message, order: group.order, emojis: [] as Emoji[] }));
  const categoryOf = new Map(categories.map((category) => [category.order, category]));

  const sorted = [...sources].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const source of sorted) {
    const names = ([] as string[]).concat(shortcodes[source.hexcode] ?? []);
    for (const name of names) if (!byCode.has(name)) byCode.set(name, source.unicode);
    const category = source.group === undefined ? undefined : categoryOf.get(source.group);
    if (!category) continue;
    category.emojis.push({
      unicode: source.unicode,
      label: source.label,
      shortcodes: names,
      searchText: [source.label, ...(source.tags ?? []), ...names].map(normalizeSearch),
    });
  }

  const all = categories.flatMap((category) => category.emojis);

  return {
    categories: categories.map(({ key, name, emojis }) => ({ key, name, emojis })),
    emojiForCode(code) {
      const match = CODE.exec(code);
      return match ? byCode.get(match[1]) ?? null : null;
    },
    search(query) {
      const wanted = normalizeSearch(query).replace(/^:|:$/g, '');
      if (wanted === '') return [];
      // Classement : nom exact, code exact, mot-clé exact, nom qui commence par la recherche, le reste ;
      // à égalité, l'ordre d'emojibase.
      const ranked: Emoji[][] = [[], [], [], [], []];
      for (const emoji of all) {
        const [label] = emoji.searchText;
        const codes = emoji.shortcodes.map(normalizeSearch);
        if (label === wanted) ranked[0].push(emoji);
        else if (codes.includes(wanted)) ranked[1].push(emoji);
        else if (emoji.searchText.includes(wanted)) ranked[2].push(emoji);
        else if (label.startsWith(wanted)) ranked[3].push(emoji);
        else if (emoji.searchText.some((text) => text.includes(wanted))) ranked[4].push(emoji);
      }
      return ranked.flat().slice(0, MAX_RESULTS);
    },
  };
}
