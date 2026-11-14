// Teintes des couleurs ANSI affichées à gauche (docs/discord-rules.md §6, « Affichage dans l'éditeur »).
// Palette provisoire (À tester) : elle ne touche que l'affichage, jamais le texte produit.
import { isIndexed, isRgb, type AnsiColor } from '../core/document';

/** Une couleur prédéfinie ; son nom est dans les textes de l'interface (i18n, `palette`). */
export interface PaletteEntry {
  readonly code: number;
  readonly css: string;
}

/** Couleurs de texte 30 à 37. */
export const TEXT_COLORS: readonly PaletteEntry[] = [
  { code: 30, css: '#4f545c' },
  { code: 31, css: '#dc322f' },
  { code: 32, css: '#859900' },
  { code: 33, css: '#b58900' },
  { code: 34, css: '#268bd2' },
  { code: 35, css: '#d33682' },
  { code: 36, css: '#2aa198' },
  { code: 37, css: '#ffffff' },
];

/** Couleurs de fond 40 à 47. */
export const BACKGROUND_COLORS: readonly PaletteEntry[] = [
  { code: 40, css: '#002b36' },
  { code: 41, css: '#cb4b16' },
  { code: 42, css: '#586e75' },
  { code: 43, css: '#657b83' },
  { code: 44, css: '#839496' },
  { code: 45, css: '#6c71c4' },
  { code: 46, css: '#93a1a1' },
  { code: 47, css: '#fdf6e3' },
];

/** Teintes claires (codes 90 à 97 et 100 à 107, E16) : valeurs habituelles des terminaux. */
const BRIGHT_CSS = ['#808080', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#ffffff'];

/** Couleurs de texte claires 90 à 97 (E16). */
export const BRIGHT_TEXT_COLORS: readonly PaletteEntry[] = BRIGHT_CSS.map((css, i) => ({ code: 90 + i, css }));

/** Fonds clairs 100 à 107 (E16). */
export const BRIGHT_BACKGROUND_COLORS: readonly PaletteEntry[] = BRIGHT_CSS.map((css, i) => ({ code: 100 + i, css }));

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
