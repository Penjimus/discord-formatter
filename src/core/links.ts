// Liens masqués `[texte](adresse)` (docs/discord-rules.md §4, série L du cahier).
// Ce fichier n'importe rien de document.ts : document.ts s'appuie sur lui.

/** Adresse d'un lien, et lien sans aperçu (`[texte](<adresse>)`, L8b). */
export interface LinkTarget {
  readonly url: string;
  readonly noPreview: boolean;
}

/** Débuts d'adresse qui donnent un lien cliquable (C16, L7). Les autres sont refusés. */
export const LINK_PROTOCOLS = ['https://', 'http://', 'mailto:', 'tel:', 'discord://'] as const;

/**
 * Écrit les caractères qui casseraient le lien : un espace (`%20`, L12) et une parenthèse non
 * appariée (`%28`, `%29`, L6). Une paire `( … )` sans parenthèse à l'intérieur reste telle quelle (L6).
 */
function encodeAddress(url: string): string {
  const chars = [...url.replace(/\s/gu, (space) => encodeURIComponent(space))];
  const matched = new Set<number>();
  chars.forEach((char, i) => {
    if (char !== '(') return;
    const close = chars.findIndex((other, j) => j > i && (other === '(' || other === ')'));
    if (close !== -1 && chars[close] === ')') matched.add(i).add(close);
  });
  return chars
    .map((char, i) => {
      if (matched.has(i)) return char;
      if (char === '(') return '%28';
      if (char === ')') return '%29';
      return char;
    })
    .join('');
}

/** Adresse d'un lien. Refuse ce qui ne donnerait pas un lien cliquable (L6, L7). */
export function link(url: string, noPreview = false): LinkTarget {
  const trimmed = url.trim();
  const protocol = LINK_PROTOCOLS.find((start) => trimmed.startsWith(start));
  if (!protocol || trimmed.length === protocol.length) {
    throw new Error(`Adresse impossible : elle doit commencer par ${LINK_PROTOCOLS.join(', ')} (L7).`);
  }
  // Caractères non testés dans une adresse : refusés par prudence.
  if (/[<>\\\u0000-\u001f\u007f]/u.test(trimmed)) {
    throw new Error('Adresse impossible : les caractères < > et \\ ne sont pas permis.');
  }
  return { url: encodeAddress(trimmed), noPreview };
}

/** Les deux morceaux appartiennent-ils au même lien (ou tous deux à aucun) ? */
export function sameLink(a: LinkTarget | undefined, b: LinkTarget | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.url === b.url && a.noPreview === b.noPreview;
}

/** Fin d'un lien : `](adresse)`, ou `](<adresse>)` sans aperçu (L8b). */
export function linkEnd(target: LinkTarget): string {
  return target.noPreview ? `](<${target.url}>)` : `](${target.url})`;
}

/**
 * Caractère d'émoji (pictogramme, drapeau, teinte, liant) : il empêche le lien (L11).
 */
const EMOJI_CHAR = /[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}‍️⃣]/u;

/** Adresse dans le texte du lien : pas de lien (L9). Tout protocole `xxx://` par prudence. */
const ADDRESS_IN_TEXT = /[A-Za-z][A-Za-z0-9+.-]*:\/\//;

/** Un morceau d'une ligne, vu pour les liens. */
export interface LinkPiece {
  /** Caractères du morceau (texte ou code) ; vide pour un élément (horodatage, mention…). */
  readonly text: string;
  /** `element` : horodatage (permis dans un lien, L11) ; `blocker` : tout ce qui l'empêche (mention, brut…). */
  readonly kind: 'text' | 'code' | 'element' | 'blocker';
  readonly link: LinkTarget | undefined;
}

interface Unit {
  readonly piece: number;
  readonly char: string | null;
  readonly link: LinkTarget | undefined;
  keep: boolean;
}

/**
 * Ce qui reste dans le lien, caractère par caractère (un seul pour un élément). Ce qui ne peut pas
 * être dans le texte d'un lien en sort, et le lien est coupé en deux (choix A de l'utilisateur) :
 * émoji, mention, morceau brut (L9, L11), `[` sans `]` qui lui réponde (L5, L12), code en ligne
 * contenant un crochet (non testé). Un lien dont le texte est vide, blanc ou une adresse est retiré (L9).
 */
export function linkKeepMask(pieces: readonly LinkPiece[]): boolean[][] {
  const units: Unit[] = [];
  pieces.forEach((piece, p) => {
    if (piece.kind === 'element' || piece.kind === 'blocker') {
      units.push({ piece: p, char: null, link: piece.link, keep: piece.kind === 'element' && piece.link !== undefined });
      return;
    }
    const codeWithBracket = piece.kind === 'code' && /[[\]]/.test(piece.text);
    for (let i = 0; i < piece.text.length; i++) {
      const char = piece.text[i];
      units.push({ piece: p, char, link: piece.link, keep: piece.link !== undefined && !codeWithBracket });
    }
  });
  // Émojis : on regarde chaque caractère complet (deux unités pour un émoji hors du plan de base).
  for (let u = 0; u < units.length; u++) {
    const unit = units[u];
    if (unit.char === null) continue;
    const pair = unit.char + (units[u + 1]?.piece === unit.piece ? units[u + 1].char ?? '' : '');
    const codePoint = String.fromCodePoint(pair.codePointAt(0)!);
    if (EMOJI_CHAR.test(codePoint)) {
      for (let k = 0; k < codePoint.length; k++) units[u + k].keep = false;
    }
    u += codePoint.length - 1;
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const run of linkRuns(units)) {
      if (removeLoneBrackets(run) || removeEmptyLink(run)) changed = true;
    }
  }
  return pieces.map((_, p) => units.filter((unit) => unit.piece === p).map((unit) => unit.keep));
}

/** Suites de caractères voisins gardés dans un même lien. */
function linkRuns(units: readonly Unit[]): Unit[][] {
  const runs: Unit[][] = [];
  let current: Unit[] = [];
  for (const unit of units) {
    const previous = current[current.length - 1];
    if (unit.keep && previous && sameLink(previous.link, unit.link)) {
      current.push(unit);
      continue;
    }
    if (current.length > 0) runs.push(current);
    current = unit.keep ? [unit] : [];
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/**
 * Un `[` doit être suivi d'un `]` avant tout autre `[` (paire simple, L5) et ce `]` ne doit pas
 * ouvrir une adresse (`](`). Sinon il sort du lien.
 */
function removeLoneBrackets(run: Unit[]): boolean {
  let changed = false;
  run.forEach((unit, i) => {
    if (unit.char !== '[') return;
    const close = run.findIndex((other, j) => j > i && (other.char === '[' || other.char === ']'));
    const paired = close !== -1 && run[close].char === ']' && run[close + 1]?.char !== '(';
    if (!paired) {
      unit.keep = false;
      changed = true;
    }
  });
  return changed;
}

/** Texte vide, blanc ou contenant une adresse : pas de lien (L9). Un horodatage seul suffit (L11). */
function removeEmptyLink(run: Unit[]): boolean {
  const visible = run.map((unit) => unit.char ?? '').join('');
  const hasElement = run.some((unit) => unit.char === null);
  if ((hasElement || visible.trim() !== '') && !ADDRESS_IN_TEXT.test(visible)) return false;
  for (const unit of run) unit.keep = false;
  return true;
}
