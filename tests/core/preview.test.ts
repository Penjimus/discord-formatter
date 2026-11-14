// Étape 17 : aperçu façon Discord (SPEC.md S31 à S34).
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/core/parse';
import { previewOf, type PreviewBlock } from '../../src/core/preview';
import { serialize } from '../../src/core/serialize';
import { split } from '../../src/core/split';

const paragraphs = (blocks: readonly PreviewBlock[]) =>
  blocks.filter((item): item is Extract<PreviewBlock, { type: 'paragraph' }> => item.type === 'paragraph');

describe('Aperçu : lecture seule (S32)', () => {
  it('le document n\'est pas modifié', () => {
    const message = parse('**a**\n> b\n- c');
    const before = JSON.stringify(message);
    previewOf(message);
    expect(JSON.stringify(message)).toBe(before);
  });
});

describe('Aperçu : lignes vides au bord retirées (J5)', () => {
  it('les lignes vides du début et de la fin ne sont pas affichées, celles du milieu oui', () => {
    const groups = previewOf(parse('\n\na\n\nb\n\n'));
    expect(groups).toHaveLength(1);
    expect(groups[0].blocks).toHaveLength(3);
  });
});

describe('Aperçu : citations', () => {
  it('des lignes citées voisines forment un seul groupe (une seule barre)', () => {
    const groups = previewOf(parse('a\n> b\n> c\nd'));
    expect(groups.map((group) => [group.quote, group.blocks.length])).toEqual([[false, 1], [true, 2], [false, 1]]);
  });
});

describe('Aperçu : listes (G1, D3)', () => {
  it('la numérotation part du premier numéro', () => {
    const [group] = previewOf(parse('3. a\n7. b\n2. c'));
    expect(paragraphs(group.blocks).map((item) => item.list?.number)).toEqual([3, 4, 5]);
  });

  it('le premier élément impose le type du niveau', () => {
    const [group] = previewOf(parse('- a\n1. b'));
    expect(paragraphs(group.blocks).map((item) => item.list?.kind)).toEqual(['bullet', 'bullet']);
  });

  it('un bloc sous une puce garde le niveau de la puce', () => {
    const [group] = previewOf(parse('- a\n  - b\n    ```\n    x\n    ```'));
    const block = group.blocks.find((item) => item.type === 'codeBlock');
    expect(block?.type === 'codeBlock' && block.bulletLevel).toBe(2);
  });
});

describe('Aperçu : spoilers (S33)', () => {
  it('un spoiler sur plusieurs lignes est un seul spoiler', () => {
    const [group] = previewOf(parse('||a\nb||'));
    const numbers = paragraphs(group.blocks).flatMap((item) => item.runs.flatMap((run) => run.nodes.map((n) => n.spoiler)));
    expect(numbers).toEqual([1, 1]);
  });

  it('deux spoilers séparés par du texte sont deux spoilers', () => {
    const [group] = previewOf(parse('||a|| b ||c||'));
    const numbers = paragraphs(group.blocks)[0].runs.flatMap((run) => run.nodes.map((n) => n.spoiler));
    expect(numbers).toEqual([1, null, 2]);
  });

  it('un bloc de code sous spoiler a son numéro', () => {
    const [group] = previewOf(parse('||```js\nx\n```||'));
    expect(group.blocks[0].type === 'codeBlock' && group.blocks[0].spoiler).toBe(1);
  });
});

describe('Aperçu : liens (§4)', () => {
  it('les morceaux d\'un même lien forment un seul lien, même avec des styles différents', () => {
    const [group] = previewOf(parse('voir [a **b**](https://exemple.fr) ici'));
    const runs = paragraphs(group.blocks)[0].runs;
    expect(runs.map((run) => [run.link?.url ?? null, run.nodes.length])).toEqual([
      [null, 1],
      ['https://exemple.fr', 2],
      [null, 1],
    ]);
  });
});

describe('Aperçu : messages découpés (S34)', () => {
  it('chaque message découpé se lit et s\'affiche seul', () => {
    const long = Array.from({ length: 300 }, (_, i) => `- élément **${i}**`).join('\n');
    const messages = split(parse(long), 2000);
    expect(messages.length).toBeGreaterThan(1);
    const previews = messages.map((message) => previewOf(parse(message)));
    for (const groups of previews) expect(groups.length).toBeGreaterThan(0);
    // Rien n'est perdu : autant de lignes affichées que de lignes d'origine.
    const lines = previews.flatMap((groups) => groups.flatMap((group) => group.blocks));
    expect(lines).toHaveLength(300);
    expect(serialize(parse(long))).toBe(long);
  });
});
