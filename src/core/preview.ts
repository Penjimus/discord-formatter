// Aperçu façon Discord (étape 17, SPEC.md S31 à S34) : le document rangé pour l'affichage.
// Simple lecture du document : rien n'est modifié (S32). Les règles viennent de docs/discord-rules.md.
import {
  analyzeLists,
  isBlankLine,
  linkOf,
  listLevelBefore,
  type Block,
  type DiscordDocument,
  type InlineNode,
  type ListPosition,
  type Mark,
} from './document';
import { sameLink, type LinkTarget } from './links';

/** Morceaux voisins qui forment un même lien (ou aucun lien) : un seul lien affiché (§4). */
export interface PreviewRun {
  readonly link: LinkTarget | undefined;
  readonly nodes: readonly PreviewNode[];
}

/** Un morceau du texte, avec le numéro du spoiler qui le cache (`null` hors spoiler). */
export interface PreviewNode {
  readonly node: InlineNode;
  readonly spoiler: number | null;
}

/** Une ligne ou un bloc de code, prêt à afficher. */
export type PreviewBlock =
  | {
      readonly type: 'paragraph';
      readonly block: Extract<Block, { type: 'paragraph' }>;
      /** Place dans la liste (numéro affiché, type imposé par le premier élément, D3, G1). */
      readonly list: ListPosition | null;
      readonly runs: readonly PreviewRun[];
    }
  | {
      readonly type: 'codeBlock';
      readonly block: Extract<Block, { type: 'codeBlock' }>;
      /** Niveau de la puce qui porte le bloc (0 hors d'une puce). */
      readonly bulletLevel: number;
      readonly spoiler: number | null;
    };

/** Suite de blocs voisins, cités ou non : une citation est affichée avec une seule barre. */
export interface PreviewGroup {
  readonly quote: boolean;
  readonly blocks: readonly PreviewBlock[];
}

/** Retire les lignes vides du début et de la fin, comme Discord à l'envoi (J5). */
function trimBlankLines(blocks: readonly Block[]): readonly Block[] {
  let start = 0;
  let end = blocks.length;
  while (start < end && isBlankLine(blocks[start])) start += 1;
  while (end > start && isBlankLine(blocks[end - 1])) end -= 1;
  return blocks.slice(start, end);
}

/**
 * Numérote les spoilers : des morceaux spoilers qui se suivent, même d'une ligne à l'autre,
 * forment un seul spoiler (révélé d'un seul clic). Une ligne vide ne l'interrompt pas (A27).
 */
function spoilerNumbering() {
  let count = 0;
  let open = false;
  return (marks: readonly Mark[]): number | null => {
    if (!marks.includes('spoiler')) {
      open = false;
      return null;
    }
    if (!open) count += 1;
    open = true;
    return count;
  };
}

/** Regroupe les morceaux voisins de même lien. */
function linkRuns(nodes: readonly PreviewNode[]): PreviewRun[] {
  const runs: { link: LinkTarget | undefined; nodes: PreviewNode[] }[] = [];
  for (const item of nodes) {
    const target = linkOf(item.node);
    const last = runs[runs.length - 1];
    if (last && sameLink(last.link, target)) last.nodes.push(item);
    else runs.push({ link: target, nodes: [item] });
  }
  return runs;
}

/** Le message rangé pour l'aperçu : groupes cités ou non, lignes numérotées, liens et spoilers. */
export function previewOf(message: DiscordDocument): PreviewGroup[] {
  const blocks = trimBlankLines(message.blocks);
  const lists = analyzeLists(blocks);
  const spoiler = spoilerNumbering();
  const groups: { quote: boolean; blocks: PreviewBlock[] }[] = [];

  blocks.forEach((block, i) => {
    let item: PreviewBlock;
    if (block.type === 'codeBlock') {
      item = {
        type: 'codeBlock',
        block,
        bulletLevel: block.inBullet ? (listLevelBefore(blocks, i) ?? 1) : 0,
        spoiler: spoiler(block.marks),
      };
    } else {
      const position = lists[i];
      const nodes = block.content.map((node) => ({ node, spoiler: spoiler(node.marks) }));
      item = {
        type: 'paragraph',
        block,
        list: position === null || position === 'too-deep' ? null : position,
        runs: linkRuns(nodes),
      };
    }
    const last = groups[groups.length - 1];
    if (last && last.quote === block.quote) last.blocks.push(item);
    else groups.push({ quote: block.quote, blocks: [item] });
  });
  return groups;
}
