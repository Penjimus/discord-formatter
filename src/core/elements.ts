// Mentions et horodatages : syntaxe Discord, conversion de date, modèles à compléter (docs/discord-rules.md §7, §8).
import { MENTION_TEMPLATES, type MentionKind, type MentionNode, type TimestampNode } from './document';

const MENTION_PREFIX: Readonly<Record<MentionKind, string>> = { user: '@', role: '@&', channel: '#' };

/** `<@ID>`, `<@&ID>` ou `<#ID>`. */
export function mentionSyntax(node: MentionNode): string {
  return `<${MENTION_PREFIX[node.kind]}${node.id}>`;
}

/** `<t:SECONDES>` ou `<t:SECONDES:STYLE>`. */
export function timestampSyntax(node: TimestampNode): string {
  return node.style === null ? `<t:${node.seconds}>` : `<t:${node.seconds}:${node.style}>`;
}

/** Date → nombre de secondes depuis le 1er janvier 1970 UTC, arrondi vers le bas (jamais des millisecondes, H2). */
export function dateToTimestamp(date: Date): number {
  const milliseconds = date.getTime();
  if (Number.isNaN(milliseconds)) throw new Error('Date impossible.');
  if (milliseconds < 0) throw new Error('Date antérieure à 1970 : non prise en charge.');
  return Math.floor(milliseconds / 1000);
}

/**
 * Modèles encore présents dans le texte Discord final (§7) : l'avertissement de l'interface
 * s'affiche tant que la liste n'est pas vide.
 */
export function unfilledTemplates(discordText: string): MentionKind[] {
  return (Object.keys(MENTION_TEMPLATES) as MentionKind[]).filter((kind) =>
    discordText.includes(MENTION_TEMPLATES[kind]),
  );
}
