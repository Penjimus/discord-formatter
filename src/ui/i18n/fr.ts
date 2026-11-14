// Textes de l'interface en français (étape 18). La liste anglaise (en.ts) doit avoir exactement
// les mêmes entrées : le contrôle des types et tests/ui/texts.test.ts le vérifient.
// Ces textes ne touchent jamais le texte produit pour Discord (S38).
import type { ReasonCode, ReasonParams } from '../../core/reasons';
import type { MentionKind, TimestampStyle } from '../../core/document';

const plural = (count: number, word: string) => `${word}${count > 1 ? 's' : ''}`;

export const fr = {
  /** Langue des dates, nombres et de la vérification d'orthographe. */
  locale: 'fr-FR',

  app: {
    tagline: 'Écrivez à gauche ou collez un message à droite : les deux côtés restent synchronisés.',
    guide: 'Guide d\'utilisation',
    guidePage: 'guide.html',
    languageGroup: 'Langue de l\'interface',
    languageTitle: 'Interface en français',
  },

  counter: {
    over: (count: string) => `${count} de trop`,
    remaining: (count: string, value: number) => `${count} ${plural(value, 'restant')}`,
    draftSaved: '✓ Brouillon enregistré',
    draftSavedTitle: 'Gardé dans ce navigateur seulement : vous le retrouverez en rouvrant la page',
    limits: 'Limite de caractères',
    withoutNitro: 'Limite sans Nitro',
    withNitro: 'Limite avec Nitro',
    progress: 'Caractères utilisés',
  },

  textPanel: {
    placeholder: 'Collez ou écrivez ici un message Discord…',
    ariaLabel: 'Message Discord (texte brut)',
    fullMessage: 'Message complet',
    discordMessage: 'Message Discord',
    copy: 'Copier',
    copied: 'Copié !',
    copyFailed: 'Copie impossible',
  },

  split: {
    ariaLabel: 'Messages découpés',
    introBefore: 'Votre texte dépasse la limite : il est découpé en ',
    introCount: (count: number) => `${count} messages`,
    introAfter: '. Copiez-les et envoyez-les dans l\'ordre. Cliquez sur un titre pour voir le message.',
    title: (number: number, total: number) => `Message ${number} / ${total}`,
    copy: 'Copier',
    copied: '✓ Copié',
    copyFailed: 'Copie impossible',
    invisibleEsc: 'Caractère ESC (couleurs ANSI)',
    invisibleSpace: 'Espace invisible (U+200B)',
  },

  templateWarning: (names: string) =>
    `À compléter dans Discord : remplacez ${names} par le vrai identifiant (mode développeur, clic droit > Copier `
    + 'l\'identifiant), ou mentionnez directement la personne, le rôle ou le salon.',

  editor: {
    title: 'Éditeur',
    ariaLabel: 'Éditeur visuel',
    timestampChipTitle: (syntax: string) => `${syntax} : cliquer pour modifier`,
  },

  toolbar: {
    ariaLabel: 'Mise en forme',
    stylesGroup: 'Styles',
    layoutGroup: 'Mise en page',
    discordGroup: 'Éléments Discord',
    codeGroup: 'Bloc de code',
    ansiGroup: 'Couleurs ANSI',
    impossible: (title: string, reason: string) => `${title} : impossible ici. ${reason}`,
    bold: 'Gras',
    italic: 'Italique',
    underline: 'Souligné',
    strike: 'Barré',
    spoiler: 'Spoiler',
    inlineCode: 'Code',
    strikeShortcut: 'Ctrl+Maj+S',
    heading1: 'Titre 1',
    heading2: 'Titre 2',
    heading3: 'Titre 3',
    heading1Label: 'T1',
    heading2Label: 'T2',
    heading3Label: 'T3',
    subtext: 'Sous-texte',
    subtextTitle: 'Sous-texte (petit, gris)',
    quote: 'Citation',
    bulletList: '• Liste',
    bulletListTitle: 'Liste à puces',
    orderedList: '1. Liste',
    orderedListTitle: 'Liste numérotée',
    outdent: 'Niveau −',
    outdentTitle: 'Niveau − (Maj+Tab)',
    indent: 'Niveau +',
    indentTitle: 'Niveau + (Tab)',
    mentionLabels: { user: '@ Utilisateur', role: '@ Rôle', channel: '# Salon' } satisfies Record<MentionKind, string>,
    mentionTitles: {
      user: (syntax: string) => `Mention d'utilisateur (insère ${syntax})`,
      role: (syntax: string) => `Mention de rôle (insère ${syntax})`,
      channel: (syntax: string) => `Lien vers un salon (insère ${syntax})`,
    } satisfies Record<MentionKind, (syntax: string) => string>,
    timestamp: '🕒 Horodatage',
    timestampTitle: 'Insérer un horodatage (date et heure)',
    link: '🔗 Lien',
    linkTitle: 'Lien masqué : le texte sélectionné devient cliquable',
    codeBlock: 'Bloc de code',
    codeBlockTitle: 'Insérer un bloc de code',
    language: 'Langage',
    languageTitle: 'Langage du bloc de code (vide par défaut)',
    languageNone: 'aucun',
    ansi: 'ANSI',
    ansiTitle: (label: string, shortcut: string) => `${label} ANSI (${shortcut})`,
    textColor: 'Texte',
    background: 'Fond',
    colors256: (label: string) => `${label} : 256 couleurs`,
    colorNumber: (index: number) => `Couleur ${index}`,
    customColor: 'Couleur au choix',
    customColorAria: (label: string) => `${label} au choix`,
    removeColor: 'Retirer la couleur',
    noColorAria: (label: string) => `${label} : aucune`,
  },

  /** Noms des couleurs ANSI (codes 30 à 37, 40 à 47, 90 à 97, 100 à 107). */
  palette: {
    text: ['Gris foncé', 'Rouge', 'Vert', 'Jaune', 'Bleu', 'Rose', 'Cyan', 'Blanc'],
    background: ['Bleu nuit foncé', 'Orange / rouge brique', 'Gris marbré', 'Gris turquoise', 'Gris clair', 'Indigo',
      'Gris très clair', 'Blanc'],
    bright: ['Gris', 'Rouge clair', 'Vert clair', 'Jaune clair', 'Bleu clair', 'Rose clair', 'Cyan clair', 'Blanc vif'],
    brightBackground: (name: string) => `Fond ${name.toLowerCase()}`,
  },

  emoji: {
    button: '😀 Émoji',
    title: 'Insérer un émoji',
    name: 'Émoji',
    dialog: 'Choisir un émoji',
    search: 'Rechercher (étoile, star…)',
    searchLabel: 'Rechercher un émoji',
    categories: 'Catégories',
    loadFailed: 'Chargement des émojis impossible.',
    loading: 'Chargement des émojis…',
    results: (count: number) => `${count} ${plural(count, 'résultat')}`,
  },

  mentionMenu: {
    ariaLabel: 'Propositions de mention',
    hint: 'Entrée : choisir · Espace : continuer à écrire',
    choices: { user: 'Utilisateur', role: 'Rôle', channel: 'Salon' } satisfies Record<MentionKind, string>,
  },

  timestampDialog: {
    ariaLabel: 'Horodatage',
    insertTitle: 'Insérer un horodatage',
    editTitle: 'Modifier l\'horodatage',
    help: 'Chaque lecteur verra la date dans son propre fuseau horaire et sa langue.',
    date: 'Date',
    time: 'Heure',
    chooseDate: 'Choisissez une date.',
    chooseTime: 'Choisissez une heure.',
    styleLegend: 'Style d\'affichage',
    defaultStyle: 'Par défaut (comme f)',
    styleNames: {
      t: 'Heure courte',
      T: 'Heure avec secondes',
      d: 'Date courte',
      D: 'Date longue',
      f: 'Date longue et heure',
      F: 'Jour, date et heure',
      s: 'Date courte et heure',
      S: 'Date courte et heure avec secondes',
      R: 'Temps relatif',
    } satisfies Record<TimestampStyle, string>,
    discordText: 'Texte Discord :',
    cancel: 'Annuler',
    insert: 'Insérer',
    edit: 'Modifier',
  },

  linkDialog: {
    ariaLabel: 'Lien',
    insertTitle: 'Insérer un lien',
    editTitle: 'Modifier le lien',
    help: (protocols: string) => `Le texte sera cliquable dans Discord, l'adresse cachée. Débuts permis : ${protocols}.`,
    linkText: 'Texte du lien',
    address: 'Adresse',
    noPreview: 'Sans aperçu (pas de carte sous le message)',
    enterAddress: 'Saisissez une adresse.',
    defaultText: 'texte',
    discordText: 'Texte Discord :',
    remove: 'Retirer le lien',
    cancel: 'Annuler',
    insert: 'Insérer',
    edit: 'Modifier',
  },

  linkBubble: {
    ariaLabel: 'Lien',
    noPreview: 'sans aperçu',
    edit: 'Modifier',
    open: 'Ouvrir',
  },

  preview: {
    title: 'Aperçu façon Discord',
    messages: (count: number) => `${count} messages`,
    hide: 'Masquer l’aperçu',
    show: 'Afficher l’aperçu',
    empty: 'Le message apparaîtra ici.',
    author: 'Vous',
    today: (time: string) => `Aujourd’hui à ${time}`,
    spoiler: 'Spoiler : cliquer pour révéler',
  },

  /** Raison d'une option grisée, d'une adresse ou d'une date refusée. */
  reasons: {
    textNewline: () => 'Un texte ne contient pas de saut de ligne : utiliser un paragraphe par ligne.',
    inlineCodeShape: () => 'Un code en ligne ne peut être ni vide ni sur plusieurs lignes.',
    inlineCodeBacktick: () => 'Code en ligne non pris en charge : accent grave en bord ou doublé.',
    rawShape: () => 'Un morceau brut ne peut être ni vide ni sur plusieurs lignes.',
    mentionId: (p: ReasonParams) => `Identifiant de mention impossible : des chiffres, ou ${p.template}.`,
    timestampSeconds: () => 'Horodatage impossible : un nombre entier de secondes, positif ou nul.',
    timestampStyle: (p: ReasonParams) => `Style d'horodatage inconnu : ${p.styles}, ou aucun.`,
    listLevel: (p: ReasonParams) => `Niveau de liste impossible : de 1 à ${p.max}.`,
    listStart: () => 'Numéro de départ impossible.',
    headingInBullet: () => 'Un titre ne peut pas être dans une puce (D14).',
    emptyLayout: () => 'Une citation, une puce, un titre ou un sous-texte ne peut pas être vide.',
    codeLanguageWord: () => 'Le langage est un mot sans espace ni accent grave.',
    codeBlockEmpty: () => 'Un bloc de code ne peut pas être vide.',
    quotedBlockBlankLine: () => 'Ligne vide dans un bloc de code cité : non testé dans Discord.',
    bulletBlockBlankLine: () => 'Pas de ligne vide dans un bloc placé dans une puce (G11).',
    bulletBlockQuoted: () => 'Bloc dans une liste citée : non testé dans Discord.',
    bulletBlockStyled: () => 'Style autour d\'un bloc placé dans une puce : non testé dans Discord.',
    bulletBlockAfterNumbered: () => 'Un bloc placé dans une puce suit une puce, pas un élément numéroté (D13).',
    ansiRgb: (p: ReasonParams) =>
      `${p.target === 'background' ? 'Fond' : 'Couleur de texte'} au choix impossible : rouge, vert et bleu de 0 à 255.`,
    ansiIndexed: (p: ReasonParams) =>
      `${p.target === 'background' ? 'Fond' : 'Couleur de texte'} du mode 256 couleurs impossible : de 0 à 255.`,
    ansiCode: (p: ReasonParams) => `${p.target === 'background' ? 'Fond' : 'Couleur de texte'} ANSI impossible : `
      + `code de ${p.min} à ${p.max} ou de ${p.brightMin} à ${p.brightMax}.`,
    escInText: () => 'Le caractère ESC ne s\'écrit pas dans le texte.',
    languageNotColorable: () => 'Un bloc avec un langage ne peut pas être coloré (§5).',
    coloredBlockMismatch: () => 'Le texte du bloc coloré ne correspond pas à ses morceaux.',
    listTooDeep: () => 'Sous-niveau de liste sans niveau parent.',
    listKindMismatch: () => 'À un même niveau, tous les éléments ont le type du premier (D3).',
    listStartNotFirst: () => 'Seul le premier élément numéroté porte un numéro de départ (G2).',
    subtextBulletBelowStyled: () => 'Discord n\'applique pas le sous-texte dans une puce placée sous une ligne '
      + 'stylée : ajoutez une ligne vide au-dessus de la liste (X7).',
    emptyQuoteLineAlone: () => 'Une ligne vide dans une citation doit être suivie de texte cité (G28, G30).',
    linkProtocol: (p: ReasonParams) => `Adresse impossible : elle doit commencer par ${p.protocols} (L7).`,
    linkCharacters: () => 'Adresse impossible : les caractères < > et \\ ne sont pas permis.',
    linkMalformed: () => 'Adresse de lien mal écrite (espace ou parenthèse seule).',
    linkContent: () => 'Un lien contient ce qui ne peut pas être dans son texte (émoji, mention, « [ » seul, L5, L11).',
    levelNotList: () => 'Seul un élément de liste change de niveau.',
    levelAlreadyFirst: () => 'L\'élément est déjà au premier niveau.',
    codeBlockInHeading: () => 'Un bloc de code ne peut pas être dans un titre ou un sous-texte (§10).',
    languageOnlyInBlock: () => 'Le langage se choisit dans un bloc de code.',
    blankLineEndsQuote: () => 'Une ligne vide ordinaire termine la citation.',
    blankLineQuotedBlock: () => 'Ligne vide dans un bloc cité : non testé dans Discord.',
    coloredBlockLanguage: () => 'Un bloc coloré est un bloc ansi : retirer les couleurs pour changer de langage (§5).',
    nothingInCode: () => 'Rien n\'est interprété dans un bloc de code (D7, D8).',
    nothingInInlineCode: () => 'Rien n\'est interprété dans du code en ligne (D6, I2).',
    ansiOnlyInBlock: () => 'Les couleurs ANSI n\'existent que dans un bloc de code ansi (§5, §10).',
    dateInvalid: () => 'Date impossible.',
    dateBefore1970: () => 'Date antérieure à 1970 : non prise en charge.',
  } satisfies Record<ReasonCode, (params: ReasonParams) => string>,
  /** Raison sans nom (cas imprévu). */
  reasonUnknown: 'Impossible ici.',
};

/** La forme de la liste des textes : la liste anglaise doit la suivre exactement. */
export type Texts = typeof fr;
