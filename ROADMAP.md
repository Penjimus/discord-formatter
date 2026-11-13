# ROADMAP.md : Discord Formatter

Étapes de construction, dans l'ordre. **Une étape = une session de travail** : plan d'abord, tests, démonstration, commit, puis on passe à la suivante.

Légende : `[ ]` à faire, `[~]` en cours, `[x]` terminée et validée par l'utilisateur.

## Règles de cette roadmap

- Claude Code ne travaille que sur **l'étape en cours** et ne coche une étape qu'après la **validation de l'utilisateur**.
- Chaque étape se termine par le compte rendu décrit dans `CLAUDE.md` (quoi essayer, ce qui a été décidé seul, ce qui reste).
- Les tests des étapes précédentes doivent **continuer à passer**.
- Le **cœur du formatage** (étapes 1 à 7) se construit **avant** l'interface (étapes 8 à 11) : c'est là que se joue la qualité. Chaque test automatique porte l'identifiant du test Discord dont il vient (voir `docs/cahier-de-tests.md`).
- Si une étape révèle une règle Discord manquante ou douteuse, on **s'arrête**, l'utilisateur la teste dans Discord, elle entre dans `docs/discord-rules.md`, puis on reprend.
- **Pendant les étapes sans interface (1 à 7)**, l'utilisateur ne voit rien à l'écran. Chaque compte rendu présente donc un **tableau « entrée → sortie »** de quelques cas, que l'utilisateur compare à ce qu'il sait de Discord. Si cela ne suffit pas, il peut demander un **banc d'essai temporaire** (une page où l'on colle du texte Discord et où l'on voit le résultat), à valider avant création car il sort du périmètre du SPEC.

## Avant l'étape 0 (à faire par l'utilisateur)

- [✓] Créer un dossier de projet et y placer : `SPEC.md`, `CLAUDE.md`, `ROADMAP.md`, `docs/discord-rules.md`, `docs/cahier-de-tests.md`.
- [✓] Ranger dans `docs/tests-discord/` les deux fichiers de tests d'origine (`tests-discord.md`, `tests-discord-speciaux.txt`).
- [-] Créer `examples/` et y déposer **quelques messages Discord réels** (voir étape 12 pour le format). Peut attendre l'étape 8, mais plus tôt vaut mieux.

---

## Partie 1 : le cœur du formatage (sans interface)

### [ ] Étape 0 : Choix techniques et squelette

**Objectif** : choisir les technologies, créer le projet, vérifier que tout tourne.

- Claude Code propose **2 ou 3 stacks** (voir `SPEC.md` section 7 et `CLAUDE.md`), l'utilisateur choisit.
- Création du squelette, du dépôt git, de l'outil de tests, d'une commande de lancement unique.
- `CLAUDE.md` est complété : stack retenue, raisons, commandes.
- Un test factice passe.

**Validation** : l'utilisateur lance la commande de tests et la commande de l'appli (une page vide s'ouvre).

### [ ] Étape 1 : Modèle de document et texte en ligne (écriture)

**Objectif** : définir le document central et savoir **écrire** (`serialize`) le texte avec styles.

- Styles : gras, italique, souligné, barré, spoiler, code en ligne.
- Ordre fixe des balises (Spoiler > Barré > Souligné > Gras > Italique).
- **Collisions** : `_` à la place de `*` quand c'est permis, sinon `U+200B` (`docs/discord-rules.md` §2.3).
- **Échappement** (§11) : n'échapper que ce qui serait interprété, avec la **règle prudente** tant que les paires entre lignes ne sont pas testées.
- Pas de balises de style autour d'un texte uniquement composé d'émojis ou de mentions (convention à valider).

**Tests** : séries A, B, C, Z1 à Z3 du cahier.
**Validation** : tableau « entrée → sortie » dans le compte rendu ; l'utilisateur confirme que les sorties sont conformes à Discord.

### [ ] Étape 2 : Lecture du texte en ligne et aller-retour

**Objectif** : savoir **lire** (`parse`) du texte Discord en document.

- Les mêmes styles que l'étape 1, y compris les combinaisons et les cas cassés (A1, A3, A5 doivent être lus comme Discord les lit).
- **Syntaxe inconnue conservée en texte brut** : rien n'est perdu (S12).
- **Aller-retour** : `parse` puis `serialize` donne un résultat équivalent (S14).

**Tests** : les tests de l'étape 1 relus dans l'autre sens, plus l'aller-retour sur tous les cas.
**Validation** : l'utilisateur donne 5 à 10 textes à lui ; le compte rendu montre l'aller-retour.

### [ ] Étape 3 : Blocs de structure

**Objectif** : titres, sous-texte, citations, listes, blocs de code, en lecture et en écriture.

- Titres 1 à 3, sous-texte `-#`, citation `> ` sur chaque ligne (jamais `>>>`, lu en texte brut).
- Listes à plusieurs niveaux (maximum 11), **type du premier élément imposé à tout le niveau**, numéros successifs réels, pas de titre dans une puce.
- Blocs de code : langage libre, saut de ligne après l'ouverture, lignes vides de début et de fin supprimées, `U+200B` si trois accents graves dans le contenu, rien d'interprété à l'intérieur.

**Tests** : séries D, F, G du cahier (D3, D10 à D14, F1 à F5, G1 à G4 en particulier).
**Validation** : tableau « entrée → sortie » ; l'utilisateur vérifie les imbrications (liste dans citation, bloc dans puce, etc.).

### [ ] Étape 4 : Couleurs ANSI

**Objectif** : blocs colorés, en lecture et en écriture.

- Un bloc de langage vide auquel on applique une couleur devient un bloc `ansi` ; un langage spécifié interdit la couleur.
- Codes : styles (`1`, `4`), fond, texte, **toujours dans l'ordre styles, fond, texte** ; reset `<ESC>[0m`, jamais `<ESC>[m`.
- Persistance d'une ligne à l'autre : un seul reset à la fin d'un passage multiligne.
- Lecture de blocs `ansi` collés ; ANSI hors bloc `ansi` conservé en texte brut.
- `U+001B` toujours écrit sous forme d'échappement dans le code source (voir `CLAUDE.md`).

**Tests** : série E du cahier.
**Validation** : l'utilisateur copie la sortie d'un exemple, la colle dans Discord, vérifie les couleurs sur ordinateur (sur mobile, rien n'est coloré : c'est normal).

### [ ] Étape 5 : Mentions, émojis, horodatages

**Objectif** : les éléments dédiés, en lecture et en écriture.

- Modèles `<@ID_UTILISATEUR>`, `<@&ID_ROLE>`, `<#ID_SALON>` et **détection** des modèles non complétés (pour l'avertissement de l'interface).
- Émojis standards en caractère Unicode.
- Horodatages `<t:SECONDES:STYLE>` : les 9 styles et l'absence de style ; **toujours des secondes**.
- Mention : aucun style appliqué ; rien d'interprété dans un bloc de code.
- Syntaxes hors périmètre (émojis personnalisés, commandes, `<id:…>`) conservées en texte brut.

**Tests** : séries H, I, M du cahier.
**Validation** : tableau « entrée → sortie » ; conversion date → timestamp vérifiée avec 2 ou 3 dates connues.

### [ ] Étape 6 : Compatibilité (grisage des options)

**Objectif** : une fonction qui répond à « ce format est-il permis ici ? », d'après la matrice de `docs/discord-rules.md` §10.

- `validate` : un document invalide est détecté ; la construction d'un document invalide est impossible.
- Fonction de contexte : à partir de la position (texte normal, titre, puce, citation, bloc de code, bloc `ansi`, spoiler…), liste des options actives et grisées.
- Les cases « ? » de la matrice sont traitées **prudemment** (grisées) jusqu'à test réel, et notées dans le compte rendu.

**Tests** : une ligne de test par case testée de la matrice ; imbrications de contenants (§10).
**Validation** : l'utilisateur relit le tableau « contexte → options actives » généré, case par case.

### [ ] Étape 7 : Compteur de caractères

**Objectif** : la longueur « à la Discord » et la limite.

- Longueur en **unités UTF-16** du texte du panneau droit (😀 = 2, drapeau = 4, `<ESC>` = 1).
- Calcul des caractères restants pour une limite de 2000 ou 4000 ; dépassement détecté, **sans jamais bloquer** l'écriture.

**Tests** : K1 à K10 du cahier.
**Validation** : tableau « texte → longueur » avec des émojis simples et composés.

---

## Partie 2 : l'interface

### [ ] Étape 8 : Deux panneaux et synchronisation

**Objectif** : la première version utilisable : écrire à gauche, voir à droite, et inversement.

- Deux panneaux côte à côte, éditeur visuel à gauche (texte et styles en ligne), texte brut à droite, bouton « Copier ».
- Synchronisation dans les deux sens **sans boucle ni perte du curseur** (S13).
- Interface en français.

**Scénarios** : S1, S2, S10, S12, S13 (partiellement S14).
**Validation** : l'utilisateur écrit à gauche, colle à droite, copie vers Discord, et compare.

### [ ] Étape 9 : Barre d'outils et structure

**Objectif** : l'éditeur de gauche devient un vrai traitement de texte pour Discord.

- Barre d'outils : styles, titres, sous-texte, citation, listes à plusieurs niveaux, bloc de code avec champ « langage ».
- **Grisage contextuel** selon l'étape 6 (S6, S7).
- Couleurs ANSI : couleur du texte, couleur de fond, styles autorisés ; le bloc devient `ansi` si le langage est vide (S4, S11).
- L'éditeur de gauche affiche les couleurs ANSI comme Discord sur ordinateur (palette à relever, voir `docs/discord-rules.md` §14).

**Scénarios** : S3, S4, S5, S6, S7, S11.
**Validation** : l'utilisateur rejoue les scénarios un par un.

### [ ] Étape 10 : Mentions, émojis, horodatages dans l'interface

**Objectif** : les boutons dédiés.

- Mentions utilisateur, rôle, salon : insertion du modèle et **avertissement discret** tant qu'un modèle reste (S8).
- Sélecteur d'émojis standards (S8b).
- Horodatage : **calendrier**, choix de l'heure, choix du **style**, aperçu lisible à gauche (S8c).

**Scénarios** : S8, S8b, S8c.
**Validation** : l'utilisateur insère chaque élément, colle dans Discord, vérifie le rendu (pour une mention, il complète l'identifiant dans Discord).

### [ ] Étape 11 : Compteur et barre de progression

**Objectif** : la limite de caractères dans l'interface.

- Compteur visible en permanence, bouton 2000 / 4000, barre de progression des caractères restants.
- Changement d'aspect au dépassement, écriture toujours libre.

**Scénarios** : S9, S9b, S9c.
**Validation** : l'utilisateur colle un long texte, bascule la limite, dépasse, et vérifie que rien n'est coupé.

### [ ] Étape 12 : Fidélité sur messages réels

**Objectif** : vérifier l'appli sur de vrais messages.

- Chaque fichier de `examples/` est traité correctement (S15) : `NOM.discord.txt` (message collé) et `NOM.attendu.md` (description de ce qu'on doit voir à gauche).
- Aller-retour sur tous les exemples (S14).
- Correction des écarts trouvés ; toute nouvelle règle entre d'abord dans `docs/discord-rules.md`.
- À vérifier : le bouton « Copier » conserve bien `<ESC>` et `U+200B` une fois collés dans Discord (`docs/discord-rules.md` §14, point 8).
- Point à vérifier : si on **copie un message ANSI depuis Discord**, le caractère `<ESC>` est-il conservé ? Sinon, le collage d'un message ANSI ne peut pas fonctionner et il faudra en parler.

**Validation** : l'utilisateur fournit de nouveaux messages inédits et vérifie.

### [ ] Étape 13 : Finitions et mise en ligne

**Objectif** : une version prête à être utilisée.

- Revue de l'ensemble : tous les scénarios S1 à S15 rejoués.
- Petit guide d'utilisation en français (une page).
- Mise en ligne gratuite (si l'utilisateur la veut), avec explications simples.
- Mise à jour finale de `CLAUDE.md` et de ce fichier.

---

## Après la première version (hors périmètre actuel)

À ne pas commencer sans accord, mais à ne pas rendre impossible :

- **Découpage en plusieurs messages** : coupe cohérente, balises refermées puis rouvertes à chaque frontière, balises ajoutées comprises dans la limite.
- **Liens masqués** `[texte](url)`.
- Aperçu façon Discord, sauvegarde de brouillons, version mobile.

---

## Journal des décisions

*(Claude Code ajoute ici, avec la date, chaque décision prise en cours de route : choix techniques, écarts avec les règles, questions tranchées par l'utilisateur.)*

| Date | Étape | Décision | Pourquoi |
|---|---|---|---|

---

## Prompt de démarrage (étape 0)

À coller dans Claude Code, depuis le dossier du projet :

> Lis l'étape 0 de `ROADMAP.md` et la section 7 de `SPEC.md` (`CLAUDE.md` est déjà chargé). Nous commençons l'étape 0. Je n'ai aucune connaissance en développement : explique-moi tout en français simple. En mode plan, propose-moi 2 ou 3 stacks techniques adaptées aux contraintes de `SPEC.md` (section 7), avec avantages et inconvénients sans jargon et ta recommandation. N'écris aucun code avant que j'aie choisi.

## Prompt type pour les étapes suivantes

> Lis l'étape N de `ROADMAP.md` et son journal des décisions, puis uniquement les sections de `docs/discord-rules.md`, les scénarios de `SPEC.md` et les séries de `docs/cahier-de-tests.md` utiles à cette étape. En mode plan, dis-moi ce que tu vas faire. N'implémente qu'après mon accord.