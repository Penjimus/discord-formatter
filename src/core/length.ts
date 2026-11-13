// Compteur de caractères « à la Discord » (docs/discord-rules.md §9 et §12).

/** Limites proposées : 2000 (sans Nitro) ou 4000 (avec Nitro). */
export type MessageLimit = 2000 | 4000;

export interface LengthCheck {
  /** Longueur du texte en unités UTF-16. */
  length: number;
  limit: MessageLimit;
  /** Caractères restants ; négatif en cas de dépassement. */
  remaining: number;
  /** Vrai si le texte dépasse la limite (2001 est refusé, K2). */
  over: boolean;
}

/** Longueur comptée par Discord : unités UTF-16, texte final tel quel. */
export function discordLength(text: string): number {
  return text.length;
}

/** Compare le texte à la limite, sans jamais le modifier ni le couper. */
export function checkLength(text: string, limit: MessageLimit): LengthCheck {
  const length = discordLength(text);
  return { length, limit, remaining: limit - length, over: length > limit };
}
