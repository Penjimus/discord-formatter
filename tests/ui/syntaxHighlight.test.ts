// Étape 12b : coloration syntaxique des blocs de code à gauche (docs/discord-rules.md §5, F1, F2).
import { describe, expect, it } from 'vitest';
import hljs from 'highlight.js';
import { highlightRanges, isHighlighted } from '../../src/ui/syntaxHighlight';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { documentToEditor, editorToDocument } from '../../src/ui/editorConvert';

/** Texte de chaque morceau coloré, avec sa classe. */
function coloured(code: string, language: string): [string, string][] {
  return highlightRanges(hljs, code, language).map((range) => [code.slice(range.from, range.to), range.className]);
}

describe('Coloration syntaxique (étape 12b)', () => {
  it('js : le mot-clé « const » et le nombre sont colorés', () => {
    const parts = coloured('const a = 1;', 'js');
    expect(parts).toContainEqual(['const', 'hljs-keyword']);
    expect(parts).toContainEqual(['1', 'hljs-number']);
  });

  it('F2_nom_du_langage_insensible_a_la_casse', () => {
    expect(coloured('const a = 1;', 'JS')).toEqual(coloured('const a = 1;', 'js'));
  });

  it('py : chaîne et commentaire colorés', () => {
    const parts = coloured('x = "a" # note', 'py');
    expect(parts).toContainEqual(['"a"', 'hljs-string']);
    expect(parts).toContainEqual(['# note', 'hljs-comment']);
  });

  it('F1_langage_inconnu_non_colore', () => {
    expect(isHighlighted(hljs, 'zzz')).toBe(false);
    expect(highlightRanges(hljs, 'const a = 1;', 'zzz')).toEqual([]);
  });

  it('bloc ansi et bloc sans langage : non touchés', () => {
    expect(isHighlighted(hljs, 'ansi')).toBe(false);
    expect(isHighlighted(hljs, 'ANSI')).toBe(false);
    expect(isHighlighted(hljs, '')).toBe(false);
  });

  it('positions justes malgré les caractères échappés (<, &, guillemets)', () => {
    const code = 'if (a < b && c) { s = "x\'y"; }';
    for (const [part] of coloured(code, 'js')) expect(code).toContain(part);
    expect(coloured(code, 'js')).toContainEqual(['"x\'y"', 'hljs-string']);
  });

  it('morceaux sans chevauchement, dans l\'ordre', () => {
    const ranges = highlightRanges(hljs, 'function f(a) { return "s" + 2; }', 'js');
    ranges.forEach((range, i) => {
      expect(range.to).toBeGreaterThan(range.from);
      if (i > 0) expect(range.from).toBeGreaterThanOrEqual(ranges[i - 1].to);
    });
  });

  it('le texte de droite ne change pas (affichage seulement)', () => {
    const message = '```js\nconst a = 1;\n```';
    expect(serialize(editorToDocument(documentToEditor(parse(message))))).toBe(message);
  });
});
