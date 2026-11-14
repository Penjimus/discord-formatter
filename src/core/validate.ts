// Validation d'un document (docs/discord-rules.md §3, §5, §6, §10).
// Les règles ne sont écrites qu'une fois, dans les constructeurs de document.ts : on reconstruit
// chaque élément avec eux, et toute erreur levée est un problème.
import { RuleError, reasonOf, type ReasonCode, type ReasonParams } from './reasons';
import {
  ansiBlock,
  code,
  codeBlock,
  createDocument,
  emptyQuoteLine,
  isEmptyQuoteLine,
  layoutLine,
  link,
  linkOf,
  mention,
  raw,
  text,
  timestamp,
  type Block,
  type DiscordDocument,
  type InlineNode,
  type LinkTarget,
} from './document';

/** Un problème : le bloc concerné (`null` s'il tient à plusieurs blocs, par exemple une liste) et sa raison. */
export interface Problem {
  readonly block: number | null;
  readonly message: string;
  /** Nom de la raison, pour l'interface (`null` : cas imprévu). */
  readonly code: ReasonCode | null;
  readonly params: ReasonParams;
}

/** Adresse vérifiée à nouveau (elle doit déjà être sous sa forme écrite). */
function rebuildLink(target: LinkTarget | undefined): LinkTarget | undefined {
  if (!target) return undefined;
  const rebuilt = link(target.url, target.noPreview);
  if (rebuilt.url !== target.url) throw new RuleError('linkMalformed', 'Adresse de lien mal écrite (espace ou parenthèse seule).');
  return rebuilt;
}

function rebuildInline(node: InlineNode): InlineNode {
  switch (node.type) {
    case 'text':
      return text(node.text, node.marks, rebuildLink(node.link));
    case 'code':
      return code(node.code, node.marks, rebuildLink(node.link));
    case 'raw':
      return raw(node.raw, node.marks);
    case 'mention':
      return mention(node.kind, node.id, node.marks);
    case 'timestamp':
      return timestamp(node.seconds, node.style, node.marks, rebuildLink(node.link));
  }
}

/** Les liens d'une ligne sont-ils déjà sous leur forme réglée (rien à couper ni à retirer) ? */
function checkLinks(original: readonly InlineNode[], rebuilt: readonly InlineNode[]): void {
  // Le lien de chaque caractère (un seul pour un élément) : il ne doit pas avoir changé.
  const flatten = (nodes: readonly InlineNode[]) => nodes.flatMap((node) =>
    node.type === 'text' ? [...node.text].map(() => linkOf(node)) : [linkOf(node)]);
  if (JSON.stringify(flatten(original)) !== JSON.stringify(flatten(rebuilt))) {
    throw new RuleError('linkContent', 'Un lien contient ce qui ne peut pas être dans son texte (émoji, mention, « [ » seul, L5, L11).');
  }
}

function rebuildBlock(block: Block): Block {
  if (isEmptyQuoteLine(block)) return emptyQuoteLine();
  if (block.type === 'paragraph') {
    const list = block.list ? { kind: block.list.kind, level: block.list.level, start: block.list.start } : undefined;
    const rebuilt = layoutLine({ quote: block.quote, list, style: block.style }, ...block.content.map(rebuildInline));
    checkLinks(block.content, rebuilt.content);
    return rebuilt;
  }
  const options = { marks: block.marks, quote: block.quote, inBullet: block.inBullet };
  if (block.segments === null) return codeBlock(block.code, { ...options, language: block.language });
  // Bloc coloré : toujours un bloc `ansi` (§5, « langage et couleur »).
  if (block.language.toLowerCase() !== 'ansi') {
    throw new RuleError('languageNotColorable', 'Un bloc avec un langage ne peut pas être coloré.');
  }
  if (block.segments.map((segment) => segment.text).join('') !== block.code) {
    throw new RuleError('coloredBlockMismatch', 'Le texte du bloc coloré ne correspond pas à ses morceaux.');
  }
  return ansiBlock(block.segments, options);
}

function problemOf(block: number | null, error: unknown): Problem {
  return { block, message: error instanceof Error ? error.message : String(error), ...reasonOf(error) };
}

/** Liste des problèmes du document : vide s'il est valide. */
export function validate(message: DiscordDocument): Problem[] {
  const problems: Problem[] = [];
  message.blocks.forEach((block, index) => {
    try {
      rebuildBlock(block);
    } catch (error) {
      problems.push(problemOf(index, error));
    }
  });
  // Règles entre blocs : listes (D3, G2, niveaux) et blocs placés dans une puce (D13).
  try {
    createDocument(...message.blocks);
  } catch (error) {
    problems.push(problemOf(null, error));
  }
  return problems;
}
