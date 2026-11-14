// Mentions et horodatages : syntaxe Discord, conversion de date, modèles à compléter (docs/discord-rules.md §7, §8).
import { RuleError } from './reasons';
import { LEGACY_MENTION_TEMPLATES, MENTION_TEMPLATES, type MentionKind, type MentionNode, type TimestampNode } from './document';

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
  if (Number.isNaN(milliseconds)) throw new RuleError('dateInvalid', 'Date impossible.');
  if (milliseconds < 0) throw new RuleError('dateBefore1970', 'Date antérieure à 1970 : non prise en charge.');
  return Math.floor(milliseconds / 1000);
}

/**
 * Modèles encore présents dans le texte Discord final (§7) : l'avertissement de l'interface
 * s'affiche tant que la liste n'est pas vide.
 */
export function unfilledTemplates(discordText: string): MentionKind[] {
  return (Object.keys(MENTION_TEMPLATES) as MentionKind[]).filter((kind) =>
    templateWords(kind).some((word) => discordText.includes(word)),
  );
}

/** Modèles (actuels ou anciens) présents dans le texte, pour les nommer dans l'avertissement. */
export function foundTemplateWords(discordText: string): string[] {
  return (Object.keys(MENTION_TEMPLATES) as MentionKind[])
    .flatMap(templateWords)
    .filter((word) => discordText.includes(word));
}

function templateWords(kind: MentionKind): string[] {
  const legacy = LEGACY_MENTION_TEMPLATES[kind];
  return legacy === undefined ? [MENTION_TEMPLATES[kind]] : [MENTION_TEMPLATES[kind], legacy];
}
