// Validation d'un document (docs/discord-rules.md §3, §5, §6, §10).
// Les règles ne sont écrites qu'une fois, dans les constructeurs de document.ts : on reconstruit
// chaque élément avec eux, et toute erreur levée est un problème.
import {
  ansiBlock,
  code,
  codeBlock,
  createDocument,
  layoutLine,
  mention,
  raw,
  text,
  timestamp,
  type Block,
  type DiscordDocument,
  type InlineNode,
} from './document';

/** Un problème : le bloc concerné (`null` s'il tient à plusieurs blocs, par exemple une liste) et sa raison. */
export interface Problem {
  readonly block: number | null;
  readonly message: string;
}

function rebuildInline(node: InlineNode): InlineNode {
  switch (node.type) {
    case 'text':
      return text(node.text, node.marks);
    case 'code':
      return code(node.code, node.marks);
    case 'raw':
      return raw(node.raw, node.marks);
    case 'mention':
      return mention(node.kind, node.id, node.marks);
    case 'timestamp':
      return timestamp(node.seconds, node.style, node.marks);
  }
}

function rebuildBlock(block: Block): Block {
  if (block.type === 'paragraph') {
    const list = block.list ? { kind: block.list.kind, level: block.list.level, start: block.list.start } : undefined;
    return layoutLine({ quote: block.quote, list, style: block.style }, ...block.content.map(rebuildInline));
  }
  const options = { marks: block.marks, quote: block.quote, inBullet: block.inBullet };
  if (block.segments === null) return codeBlock(block.code, { ...options, language: block.language });
  // Bloc coloré : toujours un bloc `ansi` (§5, « langage et couleur »).
  if (block.language.toLowerCase() !== 'ansi') {
    throw new Error('Un bloc avec un langage ne peut pas être coloré.');
  }
  if (block.segments.map((segment) => segment.text).join('') !== block.code) {
    throw new Error('Le texte du bloc coloré ne correspond pas à ses morceaux.');
  }
  return ansiBlock(block.segments, options);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Liste des problèmes du document : vide s'il est valide. */
export function validate(message: DiscordDocument): Problem[] {
  const problems: Problem[] = [];
  message.blocks.forEach((block, index) => {
    try {
      rebuildBlock(block);
    } catch (error) {
      problems.push({ block: index, message: errorMessage(error) });
    }
  });
  // Règles entre blocs : listes (D3, G2, niveaux) et blocs placés dans une puce (D13).
  try {
    createDocument(...message.blocks);
  } catch (error) {
    problems.push({ block: null, message: errorMessage(error) });
  }
  return problems;
}
