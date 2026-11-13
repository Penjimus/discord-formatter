// Plus petite modification pour passer d'un texte à un autre : remplacer seulement la partie
// changée garde le curseur du panneau droit à sa place (S13).

export interface TextChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/** Changement entre `before` et `after`, ou `null` s'ils sont égaux. */
export function textChange(before: string, after: string): TextChange | null {
  if (before === after) return null;
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before.charCodeAt(start) === after.charCodeAt(start)) start++;
  // Ne pas couper un émoji (paire d'unités UTF-16) en deux.
  if (start > 0 && isHighSurrogate(before.charCodeAt(start - 1))) start--;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before.charCodeAt(endBefore - 1) === after.charCodeAt(endAfter - 1)) {
    endBefore--;
    endAfter--;
  }
  if (endBefore < before.length && isHighSurrogate(before.charCodeAt(endBefore - 1))) {
    endBefore++;
    endAfter++;
  }
  return { from: start, to: endBefore, insert: after.slice(start, endAfter) };
}
