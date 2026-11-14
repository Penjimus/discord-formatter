// Compatibilité : quelles options de la barre d'outils sont permises à une position
// (docs/discord-rules.md §10, S6, S7). Le document est supposé valide (construit par l'appli).
import {
  ansiBlock,
  codeBlock,
  paragraph,
  text,
  type Block,
  type CodeBlock,
  type DiscordDocument,
  type LineStyle,
  type ListKind,
  type Mark,
  type Paragraph,
} from './document';
import { validate } from './validate';
import { reasonOf, type ReasonCode, type ReasonParams } from './reasons';

/** Options de la barre d'outils. */
export const TOOLBAR_OPTIONS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'spoiler',
  'inlineCode',
  'heading1',
  'heading2',
  'heading3',
  'subtext',
  'bulletList',
  'orderedList',
  'indent',
  'outdent',
  'quote',
  'codeBlock',
  'codeLanguage',
  'ansiColor',
  'ansiBackground',
  'ansiBold',
  'ansiItalic',
  'ansiUnderline',
  'ansiStrike',
  'mention',
  'timestamp',
  'emoji',
  'link',
  'blankLine',
] as const;
export type ToolbarOption = (typeof TOOLBAR_OPTIONS)[number];

/** État d'une option : active, ou grisée avec sa raison. */
export interface OptionState {
  readonly enabled: boolean;
  readonly reason: string | null;
  /** Nom de la raison, que l'interface affiche dans sa langue (`null` : permise, ou cas imprévu). */
  readonly code: ReasonCode | null;
  readonly params: ReasonParams;
}

/** Position du curseur : le bloc, et s'il est dans un code en ligne. */
export interface Position {
  readonly block: number;
  readonly inInlineCode?: boolean;
}

type Toolbar = Record<ToolbarOption, OptionState>;

const ALLOWED: OptionState = { enabled: true, reason: null, code: null, params: {} };

function greyed(code: ReasonCode | null, reason: string, params: ReasonParams = {}): OptionState {
  return { enabled: false, reason, code, params };
}

const TEXT_STYLES = ['bold', 'italic', 'underline', 'strike', 'spoiler'] as const;
const ANSI_OPTIONS = ['ansiColor', 'ansiBackground', 'ansiBold', 'ansiItalic', 'ansiUnderline', 'ansiStrike'] as const;

const NOTHING_IN_CODE = greyed('nothingInCode', 'Rien n\'est interprété dans un bloc de code (D7, D8).');
const NOTHING_IN_INLINE_CODE = greyed('nothingInInlineCode', 'Rien n\'est interprété dans du code en ligne (D6, I2).');
const ANSI_ONLY_IN_BLOCK = greyed('ansiOnlyInBlock', 'Les couleurs ANSI n\'existent que dans un bloc de code ansi (§5, §10).');

/**
 * Essaie une modification : l'option est permise si le document obtenu est valide.
 * Les constructeurs peuvent refuser avant même la validation.
 */
function attempt(build: () => readonly Block[]): OptionState {
  try {
    const problems = validate({ blocks: build() });
    return problems.length === 0 ? ALLOWED : greyed(problems[0].code, problems[0].message, problems[0].params);
  } catch (error) {
    return greyed(reasonOf(error).code, error instanceof Error ? error.message : String(error), reasonOf(error).params);
  }
}

function replaced(blocks: readonly Block[], changes: ReadonlyMap<number, Block>): Block[] {
  return blocks.map((block, i) => changes.get(i) ?? block);
}

/**
 * Éléments de la même sous-liste que l'élément `index` : même niveau, même parent (G5).
 * Un bloc placé sous une puce ne coupe que les sous-listes plus profondes que sa puce (E14e, E14f).
 */
export function subListIndices(blocks: readonly Block[], index: number): number[] {
  const line = blocks[index] as Paragraph;
  const level = line.list!.level;
  const indices = [index];
  const walk = (step: 1 | -1) => {
    for (let j = index + step; j >= 0 && j < blocks.length; j += step) {
      const block = blocks[j];
      // Le bloc suit une puce déjà parcourue (ou que la boucle va trouver) de niveau au moins `level`.
      if (block.type === 'codeBlock' && block.inBullet) continue;
      if (block.type !== 'paragraph' || !block.list || block.quote !== line.quote) return;
      if (block.list.level < level) return;
      if (block.list.level === level) indices.push(j);
    }
  };
  walk(-1);
  walk(1);
  return indices;
}

/**
 * L'élément `index` et ses sous-éléments, qui changent de niveau avec lui. Un bloc placé sous
 * une puce suit sa puce sans changement (son indentation se déduit de la puce).
 */
export function subtreeIndices(blocks: readonly Block[], index: number): number[] {
  const line = blocks[index] as Paragraph;
  const indices = [index];
  for (let j = index + 1; j < blocks.length; j++) {
    const block = blocks[j];
    if (block.type === 'codeBlock' && block.inBullet) continue;
    if (block.type !== 'paragraph' || !block.list || block.quote !== line.quote) break;
    if (block.list.level <= line.list!.level) break;
    indices.push(j);
  }
  return indices;
}

function withLevel(block: Block, delta: number): Block {
  const line = block as Paragraph;
  return { ...line, list: { ...line.list!, level: line.list!.level + delta } };
}

/** Options pour une ligne (texte normal, titre, sous-texte, puce, citation). */
function lineToolbar(blocks: readonly Block[], index: number, line: Paragraph, inInlineCode: boolean): Toolbar {
  // Une ligne vide reçoit un contenu provisoire : on juge la mise en page, pas le contenu à venir.
  const current: Paragraph = line.content.length > 0 ? line : { ...line, content: [text('x')] };
  const base = replaced(blocks, new Map([[index, current]]));
  const change = (changes: Partial<Paragraph>) =>
    attempt(() => replaced(base, new Map([[index, { ...current, ...changes }]])));

  const toggleStyle = (style: LineStyle) => change({ style: line.style === style ? 'normal' : style });

  // Style de texte : jugé en l'ajoutant à toute la ligne, car une ligne stylée sans puce peut
  // empêcher le sous-texte d'une puce plus bas (X7). Dans une puce, rien à vérifier (G14).
  const textStyle = (mark: Mark): OptionState => {
    if (line.list || line.content.length === 0) return ALLOWED;
    const content = line.content.map((node) => ({ ...node, marks: [...new Set([...node.marks, mark])] }));
    return change({ content });
  };

  const toggleList = (kind: ListKind): OptionState => {
    if (line.list?.kind === kind) return change({ list: null });
    if (!line.list) return change({ list: { kind, level: 1, start: null } });
    // À un même niveau, tout prend le type du premier (D3) : toute la sous-liste change de type.
    const changes = new Map<number, Block>();
    for (const i of subListIndices(base, index)) {
      const item = base[i] as Paragraph;
      changes.set(i, { ...item, list: { kind, level: item.list!.level, start: null } });
    }
    return attempt(() => replaced(base, changes));
  };

  const changeLevel = (delta: 1 | -1): OptionState => {
    if (!line.list) return greyed('levelNotList', 'Seul un élément de liste change de niveau.');
    if (delta === -1 && line.list.level === 1) return greyed('levelAlreadyFirst', 'L\'élément est déjà au premier niveau.');
    const changes = new Map(subtreeIndices(base, index).map((i) => [i, withLevel(base[i], delta)] as const));
    return attempt(() => replaced(base, changes));
  };

  const insertCodeBlock = (): OptionState => {
    if (inInlineCode) return NOTHING_IN_INLINE_CODE;
    if (line.style !== 'normal') return greyed('codeBlockInHeading', 'Un bloc de code ne peut pas être dans un titre ou un sous-texte (§10).');
    return attempt(() => {
      const block = codeBlock('x', { quote: line.quote, inBullet: line.list !== null });
      return [...base.slice(0, index + 1), block, ...base.slice(index + 1)];
    });
  };

  const insideCode = inInlineCode ? NOTHING_IN_INLINE_CODE : ALLOWED;
  const ansi = ANSI_ONLY_IN_BLOCK;
  return {
    // Styles permis partout, sauf au-dessus d'une puce en sous-texte (X7) ; dans un code en ligne,
    // ils entourent tout le code (§5, X8).
    ...Object.fromEntries(TEXT_STYLES.map((option) => [option, textStyle(option)])),
    inlineCode: ALLOWED,
    heading1: toggleStyle('heading1'),
    heading2: toggleStyle('heading2'),
    heading3: toggleStyle('heading3'),
    subtext: toggleStyle('subtext'),
    bulletList: toggleList('bullet'),
    orderedList: toggleList('ordered'),
    indent: changeLevel(1),
    outdent: changeLevel(-1),
    quote: change({ quote: !line.quote }),
    codeBlock: insertCodeBlock(),
    codeLanguage: greyed('languageOnlyInBlock', 'Le langage se choisit dans un bloc de code.'),
    ...Object.fromEntries(ANSI_OPTIONS.map((option) => [option, ansi])),
    mention: insideCode,
    timestamp: insideCode,
    emoji: ALLOWED,
    // Lien permis dans toute ligne (§10, L4) ; pas dans du code (S19).
    link: insideCode,
    blankLine: line.quote ? greyed('blankLineEndsQuote', 'Une ligne vide ordinaire termine la citation.') : ALLOWED,
  } as Toolbar;
}

/** Options dans un bloc de code (S6) ou un bloc `ansi` (S7). */
function codeBlockToolbar(blocks: readonly Block[], index: number, block: CodeBlock): Toolbar {
  const nothing = NOTHING_IN_CODE;
  const colorable = block.language === '' || block.language.toLowerCase() === 'ansi';
  const ansi = colorable ? ALLOWED : greyed('languageNotColorable', 'Un bloc avec un langage ne peut pas être coloré (§5).');
  const toggleQuote = attempt(() => {
    const options = { marks: block.marks, quote: !block.quote, inBullet: block.inBullet };
    const moved = block.segments
      ? ansiBlock(block.segments, options)
      : codeBlock(block.code, { ...options, language: block.language });
    return replaced(blocks, new Map([[index, moved]]));
  });
  let blankLine = ALLOWED;
  if (block.inBullet) blankLine = greyed('bulletBlockBlankLine', 'Une ligne vide casse un bloc placé sous une puce (G11).');
  else if (block.quote) blankLine = greyed('blankLineQuotedBlock', 'Ligne vide dans un bloc cité : non testé dans Discord.');

  const result = Object.fromEntries(TOOLBAR_OPTIONS.map((option) => [option, nothing])) as Toolbar;
  return {
    ...result,
    codeLanguage: block.segments
      ? greyed('coloredBlockLanguage', 'Un bloc coloré est un bloc ansi : retirer les couleurs pour changer de langage (§5).')
      : ALLOWED,
    ...Object.fromEntries(ANSI_OPTIONS.map((option) => [option, ansi])),
    quote: toggleQuote,
    // Un émoji standard s'affiche dans un bloc de code (D15).
    emoji: ALLOWED,
    blankLine,
  };
}

/** État de chaque option de la barre d'outils à la position donnée. */
export function toolbarState(message: DiscordDocument, position: Position): Toolbar {
  // Un message vide : une seule ligne vide.
  const blocks = message.blocks.length > 0 ? message.blocks : [paragraph()];
  const block = blocks[position.block];
  if (!block) throw new Error('Position hors du document.');
  if (block.type === 'codeBlock') return codeBlockToolbar(blocks, position.block, block);
  return lineToolbar(blocks, position.block, block, position.inInlineCode ?? false);
}
