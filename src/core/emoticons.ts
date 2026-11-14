// Émoticônes que Discord convertit en émojis à l'envoi, texte collé compris (I7, X4, §9).
// L'appli ne les protège pas : le texte Discord les garde telles quelles, et l'éditeur de gauche
// les affiche en émoji, comme Discord le fera.

/** Émoticône → émoji affiché par Discord (I7) ; `:*` (X4) a son propre traitement à la lecture. */
export const EMOTICON_EMOJIS: Readonly<Record<string, string>> = {
  ':)': '\u{1F642}',
  ':(': '\u{1F641}',
  ':D': '\u{1F604}',
  ':P': '\u{1F61B}',
  ';)': '\u{1F609}',
  '<3': '❤️',
  ':o': '\u{1F62E}',
  ':*': '\u{1F617}',
};

/** Les sept émoticônes de I7, reconnues seulement entourées d'espaces ou de bords (forme testée). */
const CONVERTED = [':)', ':(', ':D', ':P', ';)', '<3', ':o'] as const;

/** Émoticône de I7 qui commence à `index` dans `source`, bords compris, ou `null`. */
export function emoticonAt(source: string, index: number): string | null {
  if (index > 0 && !/\s/u.test(source[index - 1])) return null;
  for (const emoticon of CONVERTED) {
    if (!source.startsWith(emoticon, index)) continue;
    const after = source[index + emoticon.length];
    if (after === undefined || /\s/u.test(after)) return emoticon;
  }
  return null;
}

/** Positions des émoticônes de I7 dans un texte. */
export function findEmoticons(source: string): { index: number; emoticon: string }[] {
  const found: { index: number; emoticon: string }[] = [];
  for (let i = 0; i < source.length; i++) {
    const emoticon = emoticonAt(source, i);
    if (emoticon) {
      found.push({ index: i, emoticon });
      i += emoticon.length - 1;
    }
  }
  return found;
}
