// Teintes des couleurs ANSI affichées à gauche (docs/discord-rules.md §6, « Affichage dans l'éditeur »).
// Palette provisoire (À tester) : elle ne touche que l'affichage, jamais le texte produit.
import { isIndexed, isRgb, type AnsiColor } from '../core/document';

export interface PaletteEntry {
  readonly code: number;
  readonly name: string;
  readonly css: string;
}

/** Couleurs de texte 30 à 37. */
export const TEXT_COLORS: readonly PaletteEntry[] = [
  { code: 30, name: 'Gris foncé', css: '#4f545c' },
  { code: 31, name: 'Rouge', css: '#dc322f' },
  { code: 32, name: 'Vert', css: '#859900' },
  { code: 33, name: 'Jaune', css: '#b58900' },
  { code: 34, name: 'Bleu', css: '#268bd2' },
  { code: 35, name: 'Rose', css: '#d33682' },
  { code: 36, name: 'Cyan', css: '#2aa198' },
  { code: 37, name: 'Blanc', css: '#ffffff' },
];

/** Couleurs de fond 40 à 47. */
export const BACKGROUND_COLORS: readonly PaletteEntry[] = [
  { code: 40, name: 'Bleu nuit foncé', css: '#002b36' },
  { code: 41, name: 'Orange / rouge brique', css: '#cb4b16' },
  { code: 42, name: 'Gris marbré', css: '#586e75' },
  { code: 43, name: 'Gris turquoise', css: '#657b83' },
  { code: 44, name: 'Gris clair', css: '#839496' },
  { code: 45, name: 'Indigo', css: '#6c71c4' },
  { code: 46, name: 'Gris très clair', css: '#93a1a1' },
  { code: 47, name: 'Blanc', css: '#fdf6e3' },
];

/** Teintes claires (codes 90 à 97 et 100 à 107, E16) : valeurs habituelles des terminaux. */
const BRIGHT_CSS = ['#808080', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#ffffff'];
const BRIGHT_NAMES = ['Gris', 'Rouge clair', 'Vert clair', 'Jaune clair', 'Bleu clair', 'Rose clair', 'Cyan clair', 'Blanc vif'];

/** Couleurs de texte claires 90 à 97 (E16). */
export const BRIGHT_TEXT_COLORS: readonly PaletteEntry[] = BRIGHT_CSS.map((css, i) => ({ code: 90 + i, name: BRIGHT_NAMES[i], css }));

/** Fonds clairs 100 à 107 (E16). */
export const BRIGHT_BACKGROUND_COLORS: readonly PaletteEntry[] = BRIGHT_CSS.map((css, i) => ({ code: 100 + i, name: `Fond ${BRIGHT_NAMES[i].toLowerCase()}`, css }));

const hex = (part: number) => part.toString(16).padStart(2, '0');

/**
 * Teinte d'une couleur du mode 256 couleurs (E16) : 0 à 15 comme les codes 30 à 37 puis clairs,
 * 16 à 231 un cube de 6 × 6 × 6, 232 à 255 des gris (répartition habituelle des terminaux).
 */
export function indexedCss(index: number): string {
  if (index < 8) return TEXT_COLORS[index].css;
  if (index < 16) return BRIGHT_CSS[index - 8];
  if (index < 232) {
    const levels = [0, 95, 135, 175, 215, 255];
    const n = index - 16;
    return `#${hex(levels[Math.floor(n / 36)])}${hex(levels[Math.floor(n / 6) % 6])}${hex(levels[n % 6])}`;
  }
  const gray = 8 + (index - 232) * 10;
  return `#${hex(gray)}${hex(gray)}${hex(gray)}`;
}

/**
 * Couleur ANSI → valeur rangée dans l'éditeur : le code (« 31 »), la couleur au choix (« #ffda06 »)
 * ou la couleur du mode 256 couleurs (« n196 »).
 */
export function colorToAttr(color: AnsiColor): string {
  if (isRgb(color)) return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
  if (isIndexed(color)) return `n${color.index}`;
  return String(color);
}

/** Valeur de l'éditeur → couleur ANSI. */
export function attrToColor(value: string): AnsiColor {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (match) return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
  if (value.startsWith('n')) return { index: Number(value.slice(1)) };
  return Number(value);
}

const ALL_CODES = [...TEXT_COLORS, ...BACKGROUND_COLORS, ...BRIGHT_TEXT_COLORS, ...BRIGHT_BACKGROUND_COLORS];

/** Teinte à afficher pour une valeur de l'éditeur. */
export function cssColor(value: string): string {
  if (value.startsWith('#')) return value;
  if (value.startsWith('n')) return indexedCss(Number(value.slice(1)));
  const code = Number(value);
  return ALL_CODES.find((entry) => entry.code === code)?.css ?? 'inherit';
}
