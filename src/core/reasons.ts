// Raisons d'un refus du document (grisage, adresse ou date refusée) : chacune a un nom stable,
// que l'interface affiche dans sa langue (étape 18). Le message français reste celui de l'erreur
// (tests, console) ; il n'est plus montré tel quel à l'utilisateur.

/** Toutes les raisons possibles ; l'interface a un texte pour chacune, dans chaque langue. */
export const REASON_CODES = [
  'textNewline',
  'inlineCodeShape',
  'inlineCodeBacktick',
  'rawShape',
  'mentionId',
  'timestampSeconds',
  'timestampStyle',
  'listLevel',
  'listStart',
  'headingInBullet',
  'emptyLayout',
  'codeLanguageWord',
  'codeBlockEmpty',
  'quotedBlockBlankLine',
  'bulletBlockBlankLine',
  'bulletBlockQuoted',
  'bulletBlockStyled',
  'bulletBlockAfterNumbered',
  'ansiRgb',
  'ansiIndexed',
  'ansiCode',
  'escInText',
  'languageNotColorable',
  'coloredBlockMismatch',
  'listTooDeep',
  'listKindMismatch',
  'listStartNotFirst',
  'subtextBulletBelowStyled',
  'emptyQuoteLineAlone',
  'linkProtocol',
  'linkCharacters',
  'linkMalformed',
  'linkContent',
  'levelNotList',
  'levelAlreadyFirst',
  'codeBlockInHeading',
  'languageOnlyInBlock',
  'blankLineEndsQuote',
  'blankLineQuotedBlock',
  'coloredBlockLanguage',
  'nothingInCode',
  'nothingInInlineCode',
  'ansiOnlyInBlock',
  'dateInvalid',
  'dateBefore1970',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/** Valeurs à placer dans le texte de la raison (par exemple le niveau maximal d'une liste). */
export type ReasonParams = Readonly<Record<string, string | number>>;

/** Erreur d'une règle du document : son nom, ses valeurs, et le message français. */
export class RuleError extends Error {
  constructor(readonly code: ReasonCode, message: string, readonly params: ReasonParams = {}) {
    super(message);
    this.name = 'RuleError';
  }
}

/** Nom et valeurs de la raison d'une erreur ; `null` pour une erreur sans nom (cas imprévu). */
export function reasonOf(error: unknown): { code: ReasonCode | null; params: ReasonParams } {
  return error instanceof RuleError ? { code: error.code, params: error.params } : { code: null, params: {} };
}
