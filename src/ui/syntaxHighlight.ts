// Coloration syntaxique des blocs de code dans l'éditeur de gauche (étape 12b, docs/discord-rules.md §5).
// Affichage seulement : le document et le texte Discord ne changent pas.
// Highlight.js est la bibliothèque de Discord ; elle n'est chargée qu'au premier bloc avec un langage.
import type { HLJSApi } from 'highlight.js';

/** Un morceau coloré du code : positions [from, to[ et classe Highlight.js (`hljs-keyword`…). */
export interface HighlightRange {
  readonly from: number;
  readonly to: number;
  readonly className: string;
}

/**
 * Le bloc est-il coloré ? Langage connu de Highlight.js, sans tenir compte des majuscules (F2).
 * Un langage inconnu n'est pas coloré (F1) ; `ansi` garde ses propres couleurs (§6).
 */
export function isHighlighted(hljs: HLJSApi, language: string): boolean {
  return language !== '' && language.toLowerCase() !== 'ansi' && hljs.getLanguage(language) !== undefined;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'" };

/** Retire l'échappement HTML produit par Highlight.js. */
function unescapeHtml(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#x27|#39);/g, (_, name: string) => ENTITIES[name]);
}

/**
 * Morceaux colorés du code, sans chevauchement : chaque suite de caractères prend la classe de
 * l'élément le plus intérieur qui la contient. Lit le HTML renvoyé par Highlight.js.
 */
export function highlightRanges(hljs: HLJSApi, code: string, language: string): HighlightRange[] {
  if (!isHighlighted(hljs, language)) return [];
  const html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  const ranges: HighlightRange[] = [];
  const stack: string[] = [];
  let offset = 0;
  const pattern = /<span class="([^"]*)">|<\/span>|([^<]+)/g;
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    if (match[1] !== undefined) {
      // Classes composées (« hljs-title function_ ») : la première suffit pour la couleur.
      stack.push(match[1].split(' ')[0]);
    } else if (match[2] !== undefined) {
      const length = unescapeHtml(match[2]).length;
      const className = stack[stack.length - 1];
      if (className) {
        const previous = ranges[ranges.length - 1];
        if (previous && previous.to === offset && previous.className === className) {
          ranges[ranges.length - 1] = { ...previous, to: offset + length };
        } else {
          ranges.push({ from: offset, to: offset + length, className });
        }
      }
      offset += length;
    } else {
      stack.pop();
    }
  }
  return ranges;
}

let loading: Promise<HLJSApi> | null = null;

/** Charge Highlight.js (tous les langages) une seule fois, au premier besoin. */
export function loadHighlighter(): Promise<HLJSApi> {
  loading ??= import('highlight.js').then((module) => module.default);
  return loading;
}
