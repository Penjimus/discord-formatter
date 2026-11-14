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
- [✓] Créer `examples/` et y déposer **quelques messages Discord réels** (voir étape 12 pour le format). 7 exemples déposés le 13/11/2026.

---

## Partie 1 : le cœur du formatage (sans interface)

### [x] Étape 0 : Choix techniques et squelette

**Objectif** : choisir les technologies, créer le projet, vérifier que tout tourne.

- Claude Code propose **2 ou 3 stacks** (voir `SPEC.md` section 7 et `CLAUDE.md`), l'utilisateur choisit.
- Création du squelette, du dépôt git, de l'outil de tests, d'une commande de lancement unique.
- `CLAUDE.md` est complété : stack retenue, raisons, commandes.
- Un test factice passe.

**Validation** : l'utilisateur lance la commande de tests et la commande de l'appli (une page vide s'ouvre).

### [x] Étape 1 : Modèle de document et texte en ligne (écriture)

**Objectif** : définir le document central et savoir **écrire** (`serialize`) le texte avec styles.

- Styles : gras, italique, souligné, barré, spoiler, code en ligne.
- Ordre fixe des balises (Spoiler > Barré > Souligné > Gras > Italique).
- **Collisions** : `_` à la place de `*` quand c'est permis, sinon `U+200B` (`docs/discord-rules.md` §2.3).
- **Échappement** (§11) : n'échapper que ce qui serait interprété, avec la **règle prudente** tant que les paires entre lignes ne sont pas testées.
- Pas de balises de style autour d'un texte uniquement composé d'émojis ou de mentions (convention à valider).

**Tests** : séries A, B, C, Z1 à Z3 du cahier.
**Validation** : tableau « entrée → sortie » dans le compte rendu ; l'utilisateur confirme que les sorties sont conformes à Discord.

### [x] Étape 2 : Lecture du texte en ligne et aller-retour

**Objectif** : savoir **lire** (`parse`) du texte Discord en document.

- Les mêmes styles que l'étape 1, y compris les combinaisons et les cas cassés (A1, A3, A5 doivent être lus comme Discord les lit).
- **Syntaxe inconnue conservée en texte brut** : rien n'est perdu (S12).
- **Aller-retour** : `parse` puis `serialize` donne un résultat équivalent (S14).
- **Rattrapage de l'étape 1** (code = entité unique, `docs/discord-rules.md` §5) : autoriser **tous les styles de texte** (gras, italique, souligné, barré, spoiler) autour d'un code en ligne, en écriture comme en lecture. Le test de l'étape 1 qui refuse italique, souligné et barré sur un code en ligne est **remplacé** par un test qui les accepte (accord de l'utilisateur, la règle ayant changé). Cas de référence : X8.

**Tests** : les tests de l'étape 1 relus dans l'autre sens, plus l'aller-retour sur tous les cas.
**Validation** : l'utilisateur donne 5 à 10 textes à lui ; le compte rendu montre l'aller-retour.

### [x] Étape 3 : Blocs de structure

**Objectif** : titres, sous-texte, citations, listes, blocs de code, en lecture et en écriture.

- Titres 1 à 3, sous-texte `-#`, citation `> ` sur chaque ligne (jamais `>>>`, lu en texte brut).
- Listes à plusieurs niveaux (maximum 11), **type du premier élément imposé à tout le niveau**, numéros successifs réels, pas de titre dans une puce.
- Blocs de code : langage libre, saut de ligne après l'ouverture, lignes vides de début et de fin supprimées, `U+200B` si trois accents graves dans le contenu, rien d'interprété à l'intérieur.
- **Code = entité unique** (§5) : les styles de texte peuvent entourer un bloc de code entier (X2) ; la mise en page (titre, sous-texte, puce, citation) s'applique à une ligne contenant un code en ligne ; un bloc de code ne peut pas être dans un titre ni un sous-texte.

**Tests** : séries D, F, G du cahier (D3, D10 à D14, F1 à F5, G1 à G4 en particulier), et X2.
**Validation** : tableau « entrée → sortie » ; l'utilisateur vérifie les imbrications (liste dans citation, bloc dans puce, etc.).

### [x] Étape 4 : Couleurs ANSI

**Objectif** : blocs colorés, en lecture et en écriture.

- Un bloc de langage vide auquel on applique une couleur devient un bloc `ansi` ; un langage spécifié interdit la couleur.
- Codes : styles (`1`, `3`, `4`), fond, texte, **toujours dans l'ordre styles, fond, texte** ; reset `<ESC>[0m`, jamais `<ESC>[m`.
- Persistance d'une ligne à l'autre : un seul reset à la fin d'un passage multiligne.
- Lecture de blocs `ansi` collés ; ANSI hors bloc `ansi` conservé en texte brut.
- `U+001B` toujours écrit sous forme d'échappement dans le code source (voir `CLAUDE.md`).
- **Rattrapage de l'étape 3** (bloc de code dans une puce, `docs/discord-rules.md` §3 « Listes ») : autoriser un bloc de code (avec ou sans langage, `ansi` compris) **dans une puce de niveau 1**, en écriture comme en lecture. Il est écrit sur les lignes qui suivent la puce, chaque ligne étant indentée de 2 espaces. Le modèle **refuse une ligne vide** dans ce bloc (G6, G11) ; la lecture d'un tel bloc reste brute. Le bloc ouvert sur la ligne même de la puce reste brut (G7). Les autres placements (puce de niveau 2+, élément numéroté, liste citée) restent refusés jusqu'à test. Le test `D13_bloc_sous_une_puce_conserve_brut_en_attendant_la_regle` est **remplacé** par un test qui lit un vrai bloc (accord de l'utilisateur, la règle ayant changé). Cas de référence : D13, G9 à G11.

**Tests** : série E du cahier ; G6, G7, G9 à G11 pour le rattrapage.
**Validation** : l'utilisateur copie la sortie d'un exemple, la colle dans Discord, vérifie les couleurs sur ordinateur (sur mobile, rien n'est coloré : c'est normal).

### [x] Étape 5 : Mentions, émojis, horodatages

**Objectif** : les éléments dédiés, en lecture et en écriture.

- Modèles `<@ID_UTILISATEUR>`, `<@&ID_ROLE>`, `<#ID_SALON>` et **détection** des modèles non complétés (pour l'avertissement de l'interface).
- Émojis standards en caractère Unicode.
- Horodatages `<t:SECONDES:STYLE>` : les 9 styles et l'absence de style ; **toujours des secondes**.
- Mention : aucun style appliqué ; rien d'interprété dans un bloc de code.
- Syntaxes hors périmètre (émojis personnalisés, commandes, `<id:…>`) conservées en texte brut.

**Tests** : séries H, I, M du cahier.
**Validation** : tableau « entrée → sortie » ; conversion date → timestamp vérifiée avec 2 ou 3 dates connues.

### [x] Étape 6 : Compatibilité (grisage des options)

**Objectif** : une fonction qui répond à « ce format est-il permis ici ? », d'après la matrice de `docs/discord-rules.md` §10.

- `validate` : un document invalide est détecté ; la construction d'un document invalide est impossible.
- Fonction de contexte : à partir de la position (texte normal, titre, puce, citation, bloc de code, bloc `ansi`, spoiler…), liste des options actives et grisées.
- Les cases « ? » de la matrice sont traitées **prudemment** (grisées) jusqu'à test réel, et notées dans le compte rendu.
- Bloc de code dans une puce : permis seulement sous une puce de niveau 1 ; dans ce bloc, la **ligne vide est impossible** (G11), ce qui servira à l'interface (étape 9) pour l'empêcher.

**Tests** : une ligne de test par case testée de la matrice ; imbrications de contenants (§10).
**Validation** : l'utilisateur relit le tableau « contexte → options actives » généré, case par case.

### [x] Étape 7 : Compteur de caractères

**Objectif** : la longueur « à la Discord » et la limite.

- Longueur en **unités UTF-16** du texte du panneau droit (😀 = 2, drapeau = 4, `<ESC>` = 1).
- Calcul des caractères restants pour une limite de 2000 ou 4000 ; dépassement détecté, **sans jamais bloquer** l'écriture.

**Tests** : K1 à K10 du cahier.
**Validation** : tableau « texte → longueur » avec des émojis simples et composés.

---

## Partie 2 : l'interface

### [x] Étape 8 : Deux panneaux et synchronisation

**Objectif** : la première version utilisable : écrire à gauche, voir à droite, et inversement.

- Deux panneaux côte à côte, éditeur visuel à gauche (texte et styles en ligne), texte brut à droite, bouton « Copier ».
- Synchronisation dans les deux sens **sans boucle ni perte du curseur** (S13).
- Interface en français.

**Scénarios** : S1, S2, S10, S12, S13 (partiellement S14).
**Validation** : l'utilisateur écrit à gauche, colle à droite, copie vers Discord, et compare.

### [x] Étape 9 : Barre d'outils et structure

**Objectif** : l'éditeur de gauche devient un vrai traitement de texte pour Discord.

- Barre d'outils : styles, titres, sous-texte, citation, listes à plusieurs niveaux, bloc de code avec champ « langage ».
- Bloc de code inséré dans une puce de niveau 1 : la touche Entrée sur une ligne vide ne doit pas créer de ligne vide dans ce bloc (elle casserait le bloc dans Discord, G11). Comportement exact à proposer à l'utilisateur à cette étape.
- **Grisage contextuel** selon l'étape 6 (S6, S7).
- Couleurs ANSI : couleur du texte, couleur de fond, styles autorisés ; le bloc devient `ansi` si le langage est vide (S4, S11).
- L'éditeur de gauche affiche les couleurs ANSI comme Discord sur ordinateur (palette à relever, voir `docs/discord-rules.md` §14).

**Scénarios** : S3, S4, S5, S6, S7, S11.
**Validation** : l'utilisateur rejoue les scénarios un par un.

### [x] Étape 10 : Mentions, émojis, horodatages dans l'interface

**Objectif** : les boutons dédiés.

- Mentions utilisateur, rôle, salon : insertion du modèle et **avertissement discret** tant qu'un modèle reste (S8).
- **Sélecteur d'émojis standards** (S8b), construit par l'appli à partir de la bibliothèque **emojibase** (liste des émojis seule, option légère choisie par l'utilisateur ; nouvelle dépendance installée à cette étape) : recherche par nom, catégories, insertion du caractère Unicode.
- Affichage en émoji, à gauche, des codes `:nom:` collés (conservés bruts par le cœur, `docs/discord-rules.md` §9), d'après les noms d'emojibase ; un nom inconnu reste affiché en texte.
- Horodatage : **calendrier**, choix de l'heure, choix du **style**, aperçu lisible à gauche (S8c).

**Scénarios** : S8, S8b, S8c.
**Validation** : l'utilisateur insère chaque élément, colle dans Discord, vérifie le rendu (pour une mention, il complète l'identifiant dans Discord).

### [x] Étape 11 : Compteur et barre de progression

**Objectif** : la limite de caractères dans l'interface.

- Compteur visible en permanence, bouton 2000 / 4000, barre de progression des caractères restants.
- Changement d'aspect au dépassement, écriture toujours libre.

**Scénarios** : S9, S9b, S9c.
**Validation** : l'utilisateur colle un long texte, bascule la limite, dépasse, et vérifie que rien n'est coupé.

### [x] Étape 12 : Fidélité sur messages réels

**Objectif** : vérifier l'appli sur de vrais messages.

- Chaque exemple de `examples/` est traité correctement (S15). Un exemple = deux fichiers de même nom :
  - `NOM.txt` : le message brut, tel qu'envoyé dans Discord (UTF-8) ;
  - `NOM.md` : ce que Discord affiche, une ligne par ligne du message, sous la forme `ligne N : description | texte de la ligne`.
- Aller-retour sur tous les exemples (S14).
- Correction des écarts trouvés ; toute nouvelle règle entre d'abord dans `docs/discord-rules.md`.
- À vérifier : le bouton « Copier » conserve bien `<ESC>` et `U+200B` une fois collés dans Discord (`docs/discord-rules.md` §14, point 7).
- Point à vérifier : si on **copie un message ANSI depuis Discord**, le caractère `<ESC>` est-il conservé ? Sinon, le collage d'un message ANSI ne peut pas fonctionner et il faudra en parler.

**Validation** : l'utilisateur fournit de nouveaux messages inédits et vérifie.

### [x] Étape 12b : Coloration syntaxique des blocs de code

**Objectif** : à gauche, un bloc de code avec un langage (`js`, `py`…) est coloré comme dans Discord.

- Bibliothèque **Highlight.js**, celle de Discord (`docs/discord-rules.md` §5) ; chaque langage chargé seulement quand il est utilisé.
- Langage inconnu : pas de couleur (F1) ; nom insensible à la casse (F2) ; bloc `ansi` et bloc sans langage inchangés.
- Coloration d'affichage seulement : le document et le texte de droite ne changent pas.
- Teintes proches de celles de Discord, à vérifier à l'œil (écart de teinte accepté, comme pour l'ANSI).

**Scénarios** : S3 (bloc avec langage), S6.
**Validation** : l'utilisateur crée des blocs `js`, `py`, `JS`, un langage inconnu, puis compare à l'œil avec Discord.

### [x] Étape 13 : Finitions et mise en ligne

**Objectif** : une version prête à être utilisée.

- Revue de l'ensemble : tous les scénarios S1 à S15 rejoués.
- Petit guide d'utilisation en français (une page).
- Mise en ligne gratuite (si l'utilisateur la veut), avec explications simples.
- Mise à jour finale de `CLAUDE.md` et de ce fichier.

*Notes (14/11/2026)* : guide = page `guide.html`, ouverte par le lien « Guide d'utilisation » en haut de l'appli (1A). Pas de mise en ligne pour l'instant (2C). Constats G28, G29, I7, J5 pris en compte avant la revue.

---

## Partie 3 : la deuxième version

Mêmes règles que les parties 1 et 2 (une étape = une session, plan d'abord, tests, validation, commit). En plus :

- Dans chaque étape, **le cœur passe avant l'interface** : les fonctions de `src/core` et leurs tests d'abord, l'interface ensuite.
- Une étape qui demande des règles Discord nouvelles **commence par une série de tests à passer dans Discord**. Les messages de test sont proposés par Claude Code, les résultats entrent dans `docs/cahier-de-tests.md` puis dans `docs/discord-rules.md`, et le code ne vient qu'après.
- Les scénarios de l'étape (S16, S17…) sont écrits dans `SPEC.md` §6 au début de l'étape, puis validés par l'utilisateur.
- Les points encore ouverts de `docs/discord-rules.md` §14 ne sont testés que si une étape en a besoin.

### [x] Étape 14 : Liens masqués

**Objectif** : écrire et lire des liens `[texte](adresse)`, et les insérer depuis la barre d'outils.

- Règles de départ : `docs/discord-rules.md` §4 (C16, C21, C22), colonne « Lien » de la matrice §10, échappement de `[` en §11.
- **Tests Discord d'abord**, pour les cas non couverts : styles autour du lien et à l'intérieur de son texte, lien dans un spoiler, une puce, une citation, un sous-texte, crochets ou parenthèses dans le texte ou dans l'adresse, lien `<adresse>` sans aperçu.
- Cœur : le lien devient un élément du document (il était conservé en morceau brut, étape 2) ; lecture, écriture, aller-retour, grisage (étape 6) ; une forme non testée reste brute (S12).
- Interface : bouton « Lien » avec un champ « adresse ». À gauche, le lien est affiché comme du texte cliquable et modifiable. Le comportement exact est à proposer à l'utilisateur pendant l'étape.

**Tests** : les nouveaux tests du cahier, plus C16, C21 et C22.
**Validation** : l'utilisateur insère des liens (simples, stylés, dans une liste, dans une citation), colle le résultat dans Discord et compare.

### [x] Étape 15a : Découpage en plusieurs messages (cœur)

**Objectif** : une fonction `split` qui coupe un document trop long en plusieurs messages Discord valides, chacun sous la limite choisie (2000 ou 4000).

- Coupe la plus naturelle possible : entre blocs, puis entre paragraphes (lignes), puis entre phrases, puis entre mots en dernier recours.
- **Refermer puis rouvrir** à chaque coupe ce qui est à cheval : styles de texte, spoiler, bloc de code (même langage), couleurs ANSI, citation. Les **balises ajoutées comptent** dans la limite.
- Chaque message est utilisable seul, et les lignes vides du début et de la fin sont retirées (J5).
- **Tests Discord d'abord** : liste numérotée reprise dans le message suivant (`3.` en premier élément), sous-liste en début de message, bloc de code ou passage ANSI coupé en deux, citation coupée, spoiler coupé.
- Questions à trancher pendant l'étape : que faire d'un élément plus long que la limite à lui seul (adresse, mot, ligne de code) ? Une coupe peut-elle tomber à l'intérieur d'un bloc de code ?

**Tests** : nouveaux tests du cahier ; chaque message produit est relu avec `parse` et ne dépasse pas la limite ; l'ensemble des messages relus redonne le document d'origine.
**Validation** : tableau « texte → messages » ; l'utilisateur colle chaque message dans Discord, l'un après l'autre.

### [x] Étape 15b : Découpage dans l'interface

**Objectif** : voir et copier les messages découpés.

- Proposé seulement quand le texte dépasse la limite (étape 11). Il ne modifie jamais le texte de droite.
- Chaque message est affiché avec son compteur et son propre bouton « Copier ».
- La présentation (panneau, fenêtre, onglets) est à proposer à l'utilisateur pendant l'étape.

**Validation** : l'utilisateur colle un long texte, découpe, copie chaque message dans Discord et vérifie que rien n'est perdu ni cassé.

### [x] Étape 16 : Brouillons

**Objectif** : ne plus perdre son texte en fermant la page.

- Sauvegarde **dans le navigateur seulement** (rien ne quitte l'ordinateur, `SPEC.md` §7).
- Questions à trancher pendant l'étape : un seul brouillon ou plusieurs (avec un nom) ? sauvegarde automatique ou par bouton ? La limite 2000 / 4000 est-elle aussi gardée ? (étape 11 : « non mémorisée »)

**Validation** : l'utilisateur écrit, ferme la page, la rouvre et retrouve son texte.

Choix faits (1A, 2A, 3A) : un seul brouillon, enregistré automatiquement (texte de droite tel quel et limite), mention « ✓ Brouillon enregistré » près du compteur. Scénarios S27 à S30 (`SPEC.md` §6). Cœur : `src/core/draft.ts` ; mémoire du navigateur : `src/ui/draftStorage.ts`.

### [x] Étape 17 : Aperçu façon Discord

**Objectif** : voir le message comme Discord l'affichera, avant de le copier.

- Rendu en lecture seule du texte de droite, sur fond sombre, d'après `docs/discord-rules.md` ; il reprend les teintes ANSI (§6) et la coloration des blocs (étape 12b), avec le même écart de teinte accepté.
- Questions à trancher pendant l'étape : troisième panneau ou bascule ? nom et avatar fictifs ? aperçu de chaque message découpé (étape 15) ?
- C'est un **affichage** : le document et le texte de droite ne changent pas.

**Validation** : l'utilisateur compare l'aperçu et Discord sur les exemples de `examples/`.

Choix faits : aperçu sous les deux panneaux, sur toute la largeur (panneaux un peu moins hauts, la page défile) ; nom « Vous », rond coloré et heure ; messages découpés affichés l'un sous l'autre. Scénarios S31 à S34 (`SPEC.md` §6). Cœur : `src/core/preview.ts` ; affichage : `src/ui/DiscordPreview.tsx`.

---

## Partie 4 : l'appli en anglais, puis en ligne

Mêmes règles que la partie 3 (une étape = une session, plan d'abord, scénarios écrits dans `SPEC.md` §6 au début de l'étape, tests, validation, commit).

### [x] Étape 18 : Interface en anglais (français toujours disponible)

**Objectif** : utiliser l'appli en anglais ou en français, au choix.

- Tous les textes de l'interface dans les deux langues : boutons, bulles d'aide, fenêtres, avertissements, compteur, messages découpés, aperçu, brouillon, guide d'utilisation.
- Un moyen de changer de langue, visible dans l'en-tête.
- Le **texte produit pour Discord ne change pas** selon la langue (même document, même `serialize`) ; seuls les textes de l'interface changent.
- Les textes de l'interface sont regroupés en un seul endroit, avec un test automatique qui vérifie qu'aucun texte ne manque dans l'une des deux langues.
- Questions à trancher pendant l'étape :
  - langue au premier lancement : celle du navigateur, ou l'anglais ? Le choix est-il mémorisé (comme la limite, étape 16) ?
  - modèles de mention (`ID_UTILISATEUR`, `ID_ROLE`, `ID_SALON`) : traduits en anglais ? Ils entrent dans le texte produit et dans la lecture (`docs/discord-rules.md` §7) ;
  - horodatages : aperçu à gauche et dans l'aperçu façon Discord dans la langue de l'interface ? (Discord les affiche dans la langue de chaque lecteur, §8) ;
  - sélecteur d'émojis : noms et recherche en anglais (emojibase existe en anglais) ;
  - guide : une page par langue, ou une page qui suit la langue choisie ?
  - outil de traduction : fichiers de textes écrits par l'appli, ou une bibliothèque (nouvelle dépendance à présenter) ?
- Mettre à jour `CLAUDE.md` (« interface en français ») et `SPEC.md` §7.

**Validation** : l'utilisateur passe d'une langue à l'autre et parcourt toute l'appli (barre d'outils, fenêtres, compteur, découpage, aperçu, guide) : plus aucun texte de l'autre langue, et le texte de droite reste identique.

### [x] Étape 19 : Mise en ligne sur GitHub Pages

**Objectif** : l'appli accessible à une adresse publique, gratuite, sans serveur.

- Prérequis : l'utilisateur rend le dépôt `Penjimus/discord-formatter` public **après** l'étape 18.
- **Avant de rendre le dépôt public** : vérifier ce qui deviendra visible (messages réels de `examples/`, cahier de tests, historique git) ; l'utilisateur décide de ce qui reste.
- Réglages de construction pour l'adresse de GitHub Pages (`…github.io/discord-formatter/`) : l'appli, le guide, les émojis et la coloration des blocs (fichiers chargés à la demande) doivent fonctionner en ligne.
- Questions à trancher pendant l'étape : mise à jour du site automatique à chaque envoi sur GitHub (GitHub Actions), ou à la demande ? Un fichier `README` de présentation sur GitHub ?
- Explications simples pour l'utilisateur : adresse du site, comment le mettre à jour, ce qui reste sur l'ordinateur de chaque visiteur (brouillon dans son navigateur, rien n'est envoyé ailleurs, `SPEC.md` §7).
- Mettre à jour `CLAUDE.md` (« Commandes », mise en ligne).

**Validation** : l'utilisateur ouvre l'adresse publique, écrit, copie vers Discord, ferme et rouvre la page (brouillon retrouvé), change de langue et ouvre le guide.

Choix faits (1A, 2A, 3A) : dépôt public tel quel, mise à jour automatique après les tests (`.github/workflows/pages.yml`), `README.md` en français et en anglais ; licence PolyForm Noncommercial 1.0.0 au nom de Benjamin Moro (`LICENSE.md`). Site : https://penjimus.github.io/discord-formatter/. Scénarios S40 à S43 (`SPEC.md` §6). Émojis chargés dès l'ouverture de la page (demande de l'utilisateur).

## Mises à jour possibles plus tard

À ne faire que si le point pose un vrai problème à l'usage :

- **Plusieurs brouillons avec un nom** (étape 16, option C écartée pour l'instant) : une liste pour choisir, renommer et supprimer ses brouillons. Attention à deux onglets ouverts en même temps, qui pourraient s'écraser l'un l'autre.
- **Découpage lent sur une très longue ligne** (constaté à l'étape 15b) : sur une seule ligne sans retour à la ligne, le temps de découpe croît vite (4 000 caractères : 23 ms ; 8 600 : 0,13 s ; 18 000 : 1 s ; 30 000 : 4,6 s), et il est refait à chaque frappe. Avec des retours à la ligne, aucun souci (30 000 caractères : 15 ms). Piste : accélérer la recherche de la coupe dans une ligne (`src/core/split.ts`) sans changer les messages produits.

## Toujours hors périmètre

À ne pas commencer sans accord, mais à ne pas rendre impossible :

- Version mobile.
- Comptes, partage en ligne, envoi direct vers Discord (webhooks, bots).
- Émojis personnalisés de serveur (conservés tels quels s'ils sont collés).

---

## Raccourcis clavier

*(Liste tenue à jour à chaque étape qui ajoute ou change un raccourci. Elle servira au guide d'utilisation de l'étape 13.)*

### Éditeur de gauche

| Raccourci | Effet | Depuis |
|---|---|---|
| Ctrl+B | Gras | Étape 8 |
| Ctrl+I | Italique | Étape 8 |
| Ctrl+U | Souligné | Étape 8 |
| Ctrl+Maj+S | Barré | Étape 8 |
| Ctrl+E | Code en ligne | Étape 8 |
| *(aucun)* | Spoiler : bouton seulement | Étape 8 |
| Entrée | Nouvelle ligne avec la même mise en page (citation, liste, titre) | Étape 8 |
| Entrée sur une ligne vide mise en page | Retire une couche de mise en page (liste, puis titre ou sous-texte, puis citation), sans créer de ligne | Étape 8 |
| Ctrl+Z | Annuler | Étape 8 |
| Ctrl+Y ou Ctrl+Maj+Z | Rétablir | Étape 8 |
| Tab / Maj+Tab | Niveau + / Niveau − d'un élément de liste (avec ses sous-éléments) | Étape 9 |
| Retour arrière sur un élément de liste vide | Quitte la liste (la ligne reste, sans puce ni numéro) | Étape 9 |
| Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Maj+S dans un bloc de code | Gras, italique, souligné, barré **ANSI** (le bloc sans langage devient `ansi`) | Étape 9 |
| Entrée dans un bloc de code | Nouvelle ligne dans le bloc | Étape 9 |
| Entrée sur une ligne vide à la fin d'un bloc | Sort du bloc (la ligne vide est retirée) ; sous une puce, crée la puce suivante de même niveau | Étape 9 |
| Entrée sur une ligne vide au milieu d'un bloc sous une puce ou cité | Rien (une ligne vide casserait le bloc, G11) | Étape 9 |
| Entrée ou Retour arrière dans un bloc vide | Le bloc redevient une ligne | Étape 9 |
| Entrée dans la recherche du sélecteur d'émojis | Insère le premier émoji trouvé | Étape 10 |
| Échap | Ferme le sélecteur d'émojis ou la fenêtre d'horodatage | Étape 10 |
| Clic sur un horodatage | Rouvre la fenêtre d'horodatage pour le modifier | Étape 10 |
| @ ou # | Ouvre les propositions de mention (« @ » : Utilisateur, Rôle ; « # » : Salon) ; les lettres tapées ensuite filtrent | Étape 10 |
| Flèches haut / bas, Entrée ou Tab dans les propositions | Choisir une proposition et insérer le modèle, suivi d'un espace | Étape 10 |
| Espace ou Échap dans les propositions | Les ferme sans ajouter d'espace ; l'écriture reprend | Étape 10 |
| Échap ou Entrée dans la fenêtre de lien | Ferme la fenêtre / insère ou modifie le lien | Étape 14 |

### Panneau de droite (texte Discord)

| Raccourci | Effet | Depuis |
|---|---|---|
| Ctrl+Z | Annuler | Étape 8 |
| Ctrl+Y ou Ctrl+Maj+Z | Rétablir | Étape 8 |

Sur Mac, Ctrl est remplacé par Cmd.

---

## Journal des décisions

*(Claude Code ajoute ici, avec la date, chaque décision prise en cours de route : choix techniques, écarts avec les règles, questions tranchées par l'utilisateur.)*

| Date | Étape | Décision | Pourquoi |
|---|---|---|---|
| 2026-11-13 | 0 | Stack : TypeScript + React + Vite, TipTap à gauche, CodeMirror 6 à droite, Vitest (option A) | Choix de l'utilisateur ; la plus documentée, TipTap encode les règles d'imbrication |
| 2026-11-13 | 0 | TipTap et CodeMirror installés seulement à l'étape 8 | Pas de dépendance inutile pendant les étapes du cœur (1 à 7) |
| 2026-11-13 | 0 | « Lint » = contrôle des types TypeScript (`tsc`), pas d'ESLint pour l'instant | Moins de dépendances ; ESLint pourra être ajouté si besoin |
| 2026-11-13 | 0 | Fichier de tests renommé `docs/tests-discord/tests-discord.md` | Nom attendu par la ROADMAP et par le fichier lui-même |
| 2026-11-13 | 1 | Pas de filtrage des balises autour des émojis ou des mentions | Décision de l'utilisateur : plus court quand l'émoji est au milieu d'un texte stylé, effet des titres sur les émojis, cas rare |
| 2026-11-13 | 1 | Tests A9 à A16 ajoutés (styles imbriqués, code en ligne dans gras/spoiler, code contenant un accent grave) | Passés par l'utilisateur dans Discord, tous corrects |
| 2026-11-13 | 1 | Une ligne = un paragraphe ; les styles sont refermés à chaque fin de ligne | Styles sur plusieurs lignes non testés |
| 2026-11-13 | 1 | Le style qui dure le plus longtemps est placé à l'extérieur ; à durée égale, ordre fixe §2.1 | Évite de couper un style en deux ; formes testées en A9 à A13 |
| 2026-11-13 | 1 | Code en ligne : seuls gras et spoiler permis ; pas de code vide, multiligne, ni avec accent grave en bord ou doublé | Seuls cas testés (A14 à A16) |
| 2026-11-13 | 1 | Début de ligne précédé d'espaces (`  - x`) : échappé aussi ; `<http` échappé | Prudence (sous-listes et liens non testés dans ce cas) |
| 2026-11-13 | 1 | **Remplace** la fermeture à chaque ligne : un style continue sur la ligne suivante sans être refermé ; il est refermé avant une ligne vide | Testé par l'utilisateur (A17) ; économise des caractères. Ligne vide non testée |
| 2026-11-13 | 1 | Tests A17 à A26 et C18 ajoutés (plusieurs lignes, espaces au bord, styles au milieu d'un mot, paire de `~~` entre lignes) | Passés par l'utilisateur dans Discord |
| 2026-11-13 | 1 | Les espaces au bord d'un italique (début et fin) sont sortis de l'italique à l'écriture | A18 : espace perdu avant la fermeture ; A29 : `* ` en début de ligne est une puce |
| 2026-11-13 | 1 | **Remplace** la fermeture avant une ligne vide : un style traverse aussi les lignes vides | Testé par l'utilisateur (A27) ; tests A27 à A29 ajoutés |
| 2026-11-13 | — | Exemples nommés `NOM.txt` (message brut) et `NOM.md` (rendu attendu, ligne par ligne) | Choix de l'utilisateur, aussi clair que le format prévu |
| 2026-11-13 | — | Série X ajoutée au cahier (X1 à X7) : constats tirés des exemples réels | Comportements observés par l'utilisateur dans Discord |
| 2026-11-13 | — | E7 corrigé : l'italique ANSI (code `3`) est appliqué ; il entre dans les styles ANSI de l'appli (étape 4) | Vérifié par l'utilisateur ; contradiction révélée par les exemples `couleurs` et `cellule_des_huit` |
| 2026-11-13 | — | X8 ajouté (`classic_format_complement`) : code en ligne en italique et en barré permis | Observé par l'utilisateur dans Discord |
| 2026-11-13 | — | Nouveau statut « Généralisé ». Code en ligne et bloc de code = entité unique : tous les styles de texte autour ; la mise en page s'applique au code en ligne, pas au bloc (§5, §10) | Décision de l'utilisateur, sans tester toute la combinatoire |
| 2026-11-13 | — | Pas de modification de code hors étape : l'adaptation au code « entité unique » est reportée aux étapes 2 (styles autour du code en ligne, remplacement du test de refus) et 3 (blocs de code et mise en page) | Décision de l'utilisateur |
| 2026-11-13 | 2 | Lecture « à la manière de Discord » : règles essayées dans un ordre fixe, pour `*` et `_` la plus longue l'emporte ; codée sans bibliothèque | Choix de l'utilisateur (option A) ; reproduit A1, A3, A5, A13 |
| 2026-11-13 | 2 | « Morceau brut » : ce que le document ne sait pas encore représenter (titres, puces, citations, blocs de code, mentions, liens, adresses) ou dont la lecture est douteuse est réécrit tel quel | S12 ; choix prudent : la sortie reste identique à l'entrée |
| 2026-11-13 | 2 | A18 : la lecture perd l'espace avant la fermeture d'un italique `*`, comme Discord ; espaces au bord d'un italique considérés équivalents à l'aller-retour | Décision de l'utilisateur |
| 2026-11-13 | 2 | Tests A30, A31, C19 à C22 ajoutés | Passés par l'utilisateur dans Discord |
| 2026-11-13 | 2 | Styles de texte permis autour du code en ligne ; test de refus de l'étape 1 remplacé par X8 | Prévu par la ROADMAP (accord de l'utilisateur) |
| 2026-11-13 | 2 | Code en ligne reconnu seulement sous les formes écrites par l'appli (1 accent grave, ou 2 si le contenu en contient un), sans espace au bord ni saut de ligne ; sinon brut | Formes non testées |
| 2026-11-13 | 2 | L'espace invisible `U+200B` seul entre deux morceaux est retiré à la lecture (l'écriture le remet si besoin) ; ailleurs il est conservé | Aller-retour stable de Z1 à Z3 |
| 2026-11-13 | 2 | Marqueurs de début de ligne reconnus aussi juste après des balises ouvrantes (`~~- a`) | X7 |
| 2026-11-13 | 2 | `*` d'italique juste après « : » : `U+200B` inséré entre les deux (option B) ; retiré à la lecture | Décision de l'utilisateur (X4) ; forme non testée, gras après « : » non traité |
| 2026-11-13 | 2 | Tests A32 à A34, X9, X10 ajoutés ; code en ligne sur deux lignes gardé brut (le modèle ne le représente pas encore) | Passés par l'utilisateur dans Discord |
| 2026-11-13 | 2 | Test de l'étape 1 « `**# x**` sans échappement » **remplacé** par A34 : un marqueur de début de ligne est échappé même derrière une balise ouvrante | A34 (titre constaté) ; accord de l'utilisateur |
| 2026-11-13 | 2 | A35 : `**Note :**` correct, aucun caractère invisible pour le gras | Testé par l'utilisateur |
| 2026-11-13 | 2 | Étape validée par l'utilisateur | — |
| 2026-11-13 | 2 | Pas de textes supplémentaires : validation sur les 8 exemples de `examples/` | L'utilisateur a déjà fourni ses textes complexes |
| 2026-11-13 | 2 | `\` suivi de tout caractère autre qu'une lettre non accentuée, un chiffre ou un espace : l'antislash disparaît | C17, C19 ; reste « Documenté » pour les autres symboles |
| 2026-11-13 | 3 | Modèle « lignes étiquetées » (citation, liste, titre/sous-texte) + bloc de code à part (option A) ; 6 tests de l'étape 2 qui attendaient du brut remplacés par la structure | Choix de l'utilisateur (questions 1 et 2) |
| 2026-11-13 | 3 | Nouvelles règles « Généralisé » : 2 espaces par sous-niveau, ligne vide = nouvelle liste, ligne vide gardée dans un bloc, spoiler collé à l'ouverture d'un bloc, style continué sur un titre | Réponses de l'utilisateur, sans message de test |
| 2026-11-13 | 3 | Bloc de code dans une puce non pris en charge (D13 relu brut) en attendant de lever la contradiction avec D13 | Réponse de l'utilisateur à éclaircir |
| 2026-11-13 | 3 | Convention §2.4 : un style sur plusieurs lignes ne reste ouvert que s'il commence en début de ligne (balise avant le marqueur) ou dans une ligne sans marqueur, et finit en fin de ligne ou dans une ligne sans marqueur ; sinon refermé et rouvert | Prudence : seules ces formes sont testées (A34, X1, X2, X7, X10) |
| 2026-11-13 | 3 | Formes non testées gardées brutes à la lecture et refusées à l'écriture : sous-texte dans une citation, citation dans une puce, titre de niveau 4+, `>>>`, indentation impaire ou niveau sauté, ligne vide dans un bloc cité, bloc avec texte sur la ligne d'ouverture ou de fermeture | Règle 2 (ne pas inventer) |
| 2026-11-13 | 3 | Une sous-liste recommence à chaque nouveau parent (type et numéros propres) ; une liste est interrompue par toute autre ligne et par l'entrée ou la sortie d'une citation | Non testé : forme habituelle du markdown, à confirmer |
| 2026-11-13 | 3 | Les puces lues avec `* ` sont réécrites avec `- ` ; les numéros réécrits successifs (`3. 7. 2.` → `3. 4. 5.`) | Conventions §3 ; même rendu |
| 2026-11-13 | 3 | Étape validée par l'utilisateur : sorties collées dans Discord (numéros 3-4-5, puce imposée par le premier élément, liste qui repart à 1 après une ligne vide, liste à 2 niveaux en citation, bloc sans lignes vides, bloc `js` sous spoiler, gras continué sur un titre), toutes correctes | — |
| 2026-11-13 | 3 | Restent ouverts : bloc de code dans une puce (contradiction avec D13), numérotation des sous-listes sous deux parents (`docs/discord-rules.md` §14, points 12 à 14) | À trancher par l'utilisateur |
| 2026-11-13 | 3 | G5 : chaque sous-liste repart de son propre numéro (déjà le comportement de l'appli) | Testé par l'utilisateur |
| 2026-11-13 | 3 | G6 à G8 : pas de bloc de code dans une puce (avec langage et ligne vide, ou ouvert sur la ligne de la puce) ; bloc non indenté après une puce = bloc hors de la liste. D13 gardé, marqué contradictoire, à repasser à l'identique. Code inchangé (déjà refusé) | Testé par l'utilisateur |
| 2026-11-13 | 3 | G9 à G11 : D13 confirmé ; c'est la ligne vide qui casse un bloc dans une puce, le langage est sans effet. Bloc dans une puce de niveau 1 autorisé, sans ligne vide : prévu en rattrapage à l'étape 4, avec suites aux étapes 6 et 9 | Décision de l'utilisateur ; niveaux 2+, éléments numérotés et listes citées non testés |
| 2026-11-13 | 4 | Lecture ANSI : un bloc n'est lu en couleurs que si tous ses codes sont testés ; sinon il reste brut (option A) | Choix de l'utilisateur ; aucune couleur ne peut « déborder » à la réécriture |
| 2026-11-13 | 4 | Couleurs au choix `38;2;R;G;B` utilisables comme couleur de texte (écriture comprise) ; leur choix dans l'interface est à prévoir à l'étape 9 | Décision de l'utilisateur : ne pas restreindre ce que l'appli sait lire |
| 2026-11-13 | 4 | E14 passé : un `0` dans une balise efface les balises précédentes, le reste de la balise s'applique (règle générale tirée de `31;0` et `3;0`) ; fond au choix `48;2` utilisable ; `ANSI` = `ansi` ; bloc `ansi` coloré permis dans une citation et sous une puce ; la liste continue après un bloc sous une puce (sous-puce, `1.` lu en puce), un texte en sort. Tests « en attendant E14 » remplacés par les tests E14a à E14g | Résultats de l'utilisateur |
| 2026-11-13 | 4 | Étape validée par l'utilisateur : V1 à V5 collés dans Discord (couleurs, fonds, couleurs et fond au choix, exemples `couleurs` et `cellule_des_huit` réécrits, bloc coloré cité, blocs sous une puce), tous corrects | — |
| 2026-11-13 | 4 | Un saut de ligne au bord d'un passage coloré est rangé hors du passage ; entre deux passages identiques, il les relie en un seul (un seul reset) | Un même rendu n'a qu'une forme dans le document (aller-retour stable) |
| 2026-11-13 | 4 | Codes sans effet (`2`, `7`, `<ESC>[m`) retirés à la réécriture ; un bloc `ansi` où rien n'est coloré est réécrit sans balises | Même rendu (E12, E13, X3) |
| 2026-11-13 | 4 | Test D13 « conservé brut » remplacé par `D13_G9_bloc_sous_une_puce_lu_comme_un_bloc` | Prévu par la ROADMAP (accord de l'utilisateur) |
| 2026-11-13 | 4 | `3;0` (italique constaté), `0` après d'autres codes, fond `48;2`, `ANSI` en majuscules, `ansi` dans une citation, suite d'un bloc dans une puce : test E14 préparé ; non interprétés en attendant | Choix de l'utilisateur (questions 2 et 3, option a) |
| 2026-11-13 | 5 | Styles autour d'une mention écrits tels quels (convention §1), pas de refus dans le modèle | Choix de l'utilisateur (Q1, option A) ; la ROADMAP disait « aucun style appliqué » |
| 2026-11-13 | 5 | H3 : styles visibles sur un horodatage ; M7 : mention active dans un sous-texte et un titre. Aucune restriction de placement pour mentions et horodatages hors code | Testé par l'utilisateur |
| 2026-11-13 | 5 | Mentions d'utilisateur et de rôle codées sur la base « Documenté », sans test supplémentaire | Décision de l'utilisateur (Q3) |
| 2026-11-13 | 5 | Tests C15, « mentions, émojis, horodatages conservés » et aller-retour `brut` remplacés : mention et horodatage lus, l'émoji personnalisé reste brut | Accord de l'utilisateur (Q4) |
| 2026-11-13 | 5 | Lecture : identifiant en chiffres ou modèle de la bonne sorte ; secondes sans zéro inutile ; sinon brut. Horodatage en millisecondes collé gardé tel quel (lu en secondes, comme Discord) | Formes non testées gardées brutes (S12) ; même rendu |
| 2026-11-13 | 5 | Avertissement des modèles : recherche de `ID_UTILISATEUR`, `ID_ROLE`, `ID_SALON` dans tout le texte final, bloc de code compris | Règle §7 suivie à la lettre |
| 2026-11-13 | 5 | Date → horodatage : arrondi vers le bas à la seconde ; dates avant 1970 refusées | Nombres négatifs non testés |
| 2026-11-13 | 5 | Aperçu lisible de la date reporté à l'étape 10 | Hors de l'étape ; validé par l'utilisateur |
| 2026-11-13 | 5 | Étape validée par l'utilisateur : sorties collées dans Discord (modèles bruts, gras autour d'une mention, mention sous spoiler, horodatage en gras, mention en sous-texte, 3 dates connues), toutes correctes. L'avertissement des modèles est affiché par l'appli, pas par Discord | — |
| 2026-11-13 | 5 | `:nom:` écrit comme texte à gauche : à échapper, sans générer l'émoji. Forme d'échappement à tester (I4 proposé, §14 point 16) ; codée seulement après le test | Décision de l'utilisateur ; règle 2 (forme non testée) |
| 2026-11-13 | 5 (rattrapage) | I4 : l'antislash n'empêche pas la conversion (`\:star:` donne ⭐). I5 : `U+200B` après le premier « : » l'empêche, sans rien de visible ; l'italique après « : » est confirmé | Testé par l'utilisateur |
| 2026-11-13 | 5 (rattrapage) | Toute forme `:mot:` (lettres, chiffres, `_`, `+`, `-`) est échappée, « 12:30:45 » compris ; un `:nom:` ou `\:nom:` collé reste brut (l'émoji reste dans Discord) | Choix de l'utilisateur (choix 1 A, choix 2 A) |
| 2026-11-13 | 5 (rattrapage) | Pas d'espace invisible juste après `<`, `<a`, `<t` : le chevron échappé suffit | Test C15 de l'étape 1 inchangé |
| 2026-11-13 | 5 (rattrapage) | Test « mentions, émojis, horodatages conservés » : `:star:` attendu brut au lieu de texte | Conséquence directe du choix 2 A |
| 2026-11-13 | 5 (rattrapage) | Bibliothèque d'émojis standards demandée par l'utilisateur, pour afficher les `:nom:` à gauche ; choix en attente | Décision de l'utilisateur |
| 2026-11-13 | 5 (rattrapage) | I4 relu : `:star\:` et `\:star\:` affichent « :star: » sans émoji ni antislash visible | Constaté par l'utilisateur |
| 2026-11-13 | 5 (rattrapage) | **Remplace** l'espace invisible : un `:nom:` écrit comme texte est échappé par un antislash devant le dernier deux-points (`:star\:`) ; aucun caractère invisible | Demande de l'utilisateur |
| 2026-11-13 | 5 (rattrapage) | **Remplace** « 12:30:45 compris » : un nombre seul n'est pas un code (heures intactes), sauf `:100:` et `:1234:`, émojis connus, échappés | Demande de l'utilisateur ; exceptions ajoutées par Claude (prudence) |
| 2026-11-13 | 5 (rattrapage) | Tests I5 du rattrapage remplacés par les tests I4 de l'antislash | Règle changée par l'utilisateur |
| 2026-11-13 | 5 (rattrapage) | Bibliothèque **emojibase** (option A, légère) ; sélecteur d'émojis construit par l'appli, prévu à l'étape 10 | Choix de l'utilisateur |
| 2026-11-13 | 5 (rattrapage) | Rattrapage validé par l'utilisateur : `Mes :star\: à 12:30:45, :+1\: et :100\:` collé dans Discord, aucun émoji ni antislash visible. Étape 5 conclue | — |
| 2026-11-13 | 6 | D15 : spoiler ouvert avant un titre et refermé après une citation : permis (case « ? » levée) ; émoji standard dans du code : permis (Q2, option A). L'appli écrivait et relisait déjà cette forme | Testé par l'utilisateur |
| 2026-11-13 | 6 | Une option est jugée en essayant la modification sur le document, puis `validate` ; `validate` reconstruit chaque élément avec les constructeurs : chaque règle n'est écrite qu'une fois | Pas de seconde copie de la matrice à tenir à jour |
| 2026-11-13 | 6 | Changer le type d'un élément de liste change toute sa sous-liste (D3) ; niveau + / − emmène les sous-éléments ; retirer une puce ou une citation ne touche que la ligne (grisé si des sous-éléments resteraient sans parent) | Décidé par Claude ; les gestes exacts de l'éditeur seront fixés à l'étape 9 |
| 2026-11-13 | 6 | Dans un code en ligne, les styles restent actifs (ils entourent tout le code, X8) ; mention, horodatage et bloc de code grisés | Matrice §10 et « entité unique » §5 |
| 2026-11-13 | 6 | Dans un bloc de code, restent actifs : citation, émoji, ligne vide, langage (bloc non coloré), options ANSI (sans langage ou `ansi`) ; barré ANSI toujours grisé (E13 à confirmer) | S6, S7 lus comme « seules les mises en forme ANSI » |
| 2026-11-13 | 6 | Ligne vide grisée dans une citation (G3), un bloc cité (non testé) et un bloc sous une puce (G11) | Règles existantes |
| 2026-11-13 | 6 | Sur une ligne vide, les mises en page (titre, puce, citation) sont jugées avec un contenu provisoire | Le modèle refuse un titre vide, mais l'utilisateur doit pouvoir choisir le titre avant d'écrire |
| 2026-11-13 | 6 | Les liens n'apparaissent pas dans la barre d'outils | Hors périmètre (SPEC §9) |
| 2026-11-13 | 6 | E15 : E13 confirmé par l'utilisateur (`9` barre, `91` et `38;5;196` colorent). **Remplace** « barré ANSI toujours grisé » : le barré ANSI (code `9`) est lu, écrit après les autres styles (`1;3;4;9`) et proposé dans les blocs `ansi`. `91` et `38;5;196` restent non utilisés (bloc collé gardé tel quel) | Testé par l'utilisateur ; §6 |
| 2026-11-13 | 6 | Bloc de code sous une sous-puce : permis, indenté comme le texte de la puce (2 × niveau espaces) ; autre indentation lue brute. Sous un élément numéroté ou dans une liste citée : toujours grisé | Décision de l'utilisateur (« si ça fonctionne avec une puce, ça fonctionnera avec une sous-puce ») ; indentation choisie par Claude d'après « 2 espaces par sous-niveau » |
| 2026-11-13 | 6 | Tests changés : `9` retiré des codes non testés (E13), bloc sous une sous-puce retiré des placements refusés | Conséquence des deux décisions de l'utilisateur |
| 2026-11-13 | 6 | Sommaire du cahier recompté : 156 tests (86 confirmés, 16 écarts, 54 constats) ; séries E et G mises à jour | Demande de l'utilisateur |
| 2026-11-13 | 6 | Étape validée par l'utilisateur (tableau « contexte → options » relu) | — |
| 2026-11-13 | — | Statut « Documenté » considéré comme vérifié : codé comme une règle testée, sans message de test (légende de `docs/discord-rules.md`, règle 2 de `CLAUDE.md`) | Décision de l'utilisateur |
| 2026-11-13 | 7 | Compteur : longueur UTF-16 du texte final tel quel (balises, `U+200B`, codes ANSI compris) ; dépassement si longueur > limite ; restants négatifs en dépassement ; le texte n'est jamais modifié | §9, §12, K1 à K10 |
| 2026-11-13 | 7 | Espaces et sauts de ligne en début ou fin de message comptés tels quels (§14 point 17) | Non testé ; choix accepté par l'utilisateur |
| 2026-11-13 | 7 | Étape validée par l'utilisateur (tableau « texte → longueur » relu : lettres, accent, émojis simples, drapeau, teinte, famille, balises, code ANSI, `U+200B`) | — |
| 2026-11-13 | 8 | Gauche : tout le document est affiché ; texte des lignes modifiable ; blocs de code, mentions, horodatages et syntaxe inconnue en pastilles non modifiables (supprimables), modifiables à droite | Choix de l'utilisateur (Q1, option A) |
| 2026-11-13 | 8 | Entrée : la nouvelle ligne garde la mise en page (citation, liste, titre) ; Entrée sur une ligne vide mise en page retire une couche (liste, puis titre/sous-texte, puis citation) sans créer de ligne | Demande de l'utilisateur ; ordre des couches choisi par Claude |
| 2026-11-13 | 8 | 6 boutons de style (gras, italique, souligné, barré, spoiler, code) sans grisage, raccourcis Ctrl+B, I, U, Maj+S, E | Choix de l'utilisateur (Q2, option A) ; Maj+S et E ajoutés par Claude |
| 2026-11-13 | 8 | Synchronisation : chaque panneau ne réagit qu'aux frappes de l'utilisateur ; la droite n'est pas réécrite quand on y écrit ; une modification à gauche réécrit la droite à la manière de l'appli (seule la partie changée est remplacée) | S13, sans boucle |
| 2026-11-13 | 8 | Ligne mise en page laissée vide à gauche : écrite comme une ligne vide ; listes réparées (niveau sauté, type du premier, numéro de départ) ; titre dans une puce retiré ; code en ligne impossible redevient du texte | Forme valide la plus proche (le modèle refuse les autres) |
| 2026-11-13 | 8 | Pastilles affichées avec la syntaxe Discord (`<@ID_UTILISATEUR>`, `<t:…>`) ; aperçu lisible à l'étape 10, couleurs ANSI à gauche à l'étape 9 | Hors de l'étape |
| 2026-11-13 | 8 | Dépendances : `@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands` ; schéma de l'éditeur écrit par l'appli (pas de « starter kit ») | Moins de dépendances, schéma calqué sur le document |
| 2026-11-13 | 8 | Étape validée par l'utilisateur (écriture à gauche, saisie et collage à droite, copie vers Discord) ; section « Raccourcis clavier » ajoutée à cette roadmap, à tenir à jour | Demande de l'utilisateur |
| 2026-11-13 | 9 | Palette ANSI de l'éditeur : palette répandue dans la communauté, statut « À tester » (§6) ; écart de teinte accepté. 8 couleurs et 8 fonds prédéfinis, plus couleur et fond au choix | Choix de l'utilisateur (1A) |
| 2026-11-13 | 9 | Langage : champ libre avec suggestions filtrées pendant la frappe (liste §5 + `ansi`) | Choix de l'utilisateur (2A) |
| 2026-11-13 | 9 | Entrée dans un bloc : sur une ligne vide en fin de bloc, sortie (puce suivante sous une puce) ; au milieu d'un bloc sous une puce ou cité, rien ; lignes vides retirées à l'écriture dans ces blocs | Choix de l'utilisateur (3A) ; G11 |
| 2026-11-13 | 9 | Blocs de code modifiables à gauche (remplace les pastilles de l'étape 8) ; un bloc laissé vide n'est pas écrit à droite | Nécessaire pour S3, S4 |
| 2026-11-13 | 9 | Ctrl+B, I, U, Maj+S dans un bloc : styles ANSI ; Tab / Maj+Tab : niveau + / − ; Retour arrière dans un bloc vide : ligne ; bloc `ansi` affiché sur fond sombre (Discord ordinateur) | Décidé par Claude |
| 2026-11-13 | 9 | Bloc inséré à la place d'une ligne vide sans mise en page, sinon après la ligne du curseur (sous la puce si c'est une puce) ; une liste ajoutée commence au niveau 1 | Décidé par Claude |
| 2026-11-14 | 9 | Test « bloc de puce dont la puce a été supprimée » : seule la description du bloc dans l'éditeur change (texte et attributs au lieu de la pastille), résultat attendu inchangé | Accord de l'utilisateur |
| 2026-11-14 | 9 | Retour arrière sur un élément de liste vide : quitte la liste (citation et titre gardés) | Demande de l'utilisateur ; « citation et titre gardés » décidé par Claude |
| 2026-11-14 | 9 | E16 passé : `90` à `97`, `100` à `107`, `38;5;N`, `48;5;N` appliqués. **Remplace** « `91` et `38;5;196` restent non utilisés » (étape 6) : ces codes sont lus, affichés, écrits et proposés (rangée claire et panneau « 256 » dans la barre) | Demande de l'utilisateur ; testé (E16) |
| 2026-11-14 | 9 | Tests changés : `91` retiré des couleurs refusées ; `91`, `38;5;196`, `1;95`, `48;5;1` retirés des codes qui gardent le bloc brut (remplacés par `98`, `108`, `38;5;256`, `38;5`, `48;5;01`) | Conséquence de la règle changée par l'utilisateur |
| 2026-11-14 | 9 | Teintes des codes clairs et des 256 couleurs : valeurs habituelles des terminaux (À tester, §6) | Décidé par Claude ; écart de teinte accepté par l'utilisateur |
| 2026-11-14 | 9 | Étape validée par l'utilisateur (scénarios S3 à S7 et S11 rejoués, codes ANSI étendus) | — |
| 2026-11-14 | 10 | Noms `:nom:` : liste GitHub d'emojibase (pas de liste « Discord » dans emojibase) ; `:flag_fr:` et quelques autres noms Discord restent en texte à gauche | Choix de l'utilisateur (Q1, option A, solution de repli) |
| 2026-11-14 | 10 | Recherche du sélecteur en français (noms et mots-clés emojibase) et avec les codes anglais | Choix de l'utilisateur (Q2, option A) |
| 2026-11-14 | 10 | Date et heure : calendrier intégré au navigateur, aucune dépendance de plus | Choix de l'utilisateur (Q3, option A) |
| 2026-11-14 | 10 | Un clic sur un horodatage à gauche rouvre la fenêtre pour le modifier ; SPEC.md (S8c, §4) mis à jour | Choix de l'utilisateur (Q4, option B) |
| 2026-11-14 | 10 | Dépendance : `emojibase-data` (données seules) ; liste chargée à la première ouverture du sélecteur ou au premier `:nom:` collé, dans des fichiers à part | Décidé à l'étape 5 ; chargement à la demande décidé par Claude |
| 2026-11-14 | 10 | Sélecteur : pas de choix de teinte de peau, aucun filtre sur les émojis récents, catégorie « composants » masquée ; il se ferme après un choix ; classement : nom exact, code exact, mot-clé exact, début de nom, le reste | Décidé par Claude |
| 2026-11-14 | 10 | Horodatage : style « Par défaut (comme f) », sans lettre, proposé d'abord ; date proposée = maintenant, à la minute ; heure avec secondes ; aperçu dans le fuseau de l'ordinateur ; seuils de « R » choisis par l'appli (À tester) | Décidé par Claude |
| 2026-11-14 | 10 | Mentions : boutons « @ Utilisateur », « @ Rôle », « # Salon » ; pastille gardée sous la forme Discord ; avertissement sous le panneau de droite, avec la façon d'obtenir l'identifiant (§7) | Décidé par Claude |
| 2026-11-14 | 10 | Propositions de mention en tapant « @ » ou « # » à gauche ; Espace les ferme sans ajouter d'espace ; SPEC.md (S8, §4) mis à jour | Demande de l'utilisateur |
| 2026-11-14 | 10 | Propositions : filtrées par les lettres tapées après « @ » (sans accents : « ro » trouve « Rôle ») ; fermées par Échap, un caractère autre qu'une lettre ou un déplacement du curseur ; pas d'ouverture là où les mentions sont grisées (code) ; aucune dépendance ajoutée | Décidé par Claude |
| 2026-11-14 | 10 | Un espace est ajouté après un modèle choisi dans les propositions (pas après les boutons de la barre) | Demande de l'utilisateur ; « pas après les boutons » décidé par Claude |
| 2026-11-14 | 10 | Étape validée par l'utilisateur (mentions et propositions @ #, sélecteur d'émojis, `:nom:` affichés, horodatage avec calendrier et modification par clic) | — |
| 2026-11-14 | 10 | Configuration « app-verif » ajoutée à `.claude/launch.json` (port de secours pour les vérifications de Claude) | Le port 5173 était pris par une autre session |
| 2026-11-14 | 11 | Compteur sous le panneau de droite (1A) ; limite 2000 à chaque ouverture, non mémorisée (2A) ; deux aspects seulement, normal et dépassement en rouge (3A) | Choix de l'utilisateur |
| 2026-11-14 | 11 | Affichage « longueur / limite · N restants » ou « N de trop », nombres au format français ; barre pleine (100 %) dès la limite atteinte et au-delà ; rouge seulement au-delà de la limite (2000 pile accepté, K1) ; bulle d'aide « avec / sans Nitro » sur les boutons | Décidé par Claude |
| 2026-11-14 | 11 | Calcul de la barre dans le cœur (`progressRatio`, tests à part) ; l'éditeur de gauche n'est pas redessiné à chaque frappe pour le compteur | Décidé par Claude |
| 2026-11-14 | 11 | Étape validée par l'utilisateur (compteur, bascule 2000 / 4000, dépassement sans coupure) | — |
| 2026-11-14 | 12 | Tests « rendu attendu » par exemple (`tests/core/examples.test.ts`), une vérification par ligne des fichiers `.md` | S15 : les tests ne vérifiaient que l'absence de perte |
| 2026-11-14 | 12 | X7 (`ODJ`, ligne 4) : messages de test G12 à G18 avant de coder (1A) ; test de la ligne 4 mis en attente (`it.skip`) | Choix de l'utilisateur ; cause inconnue |
| 2026-11-14 | 12 | `:*` collé lu comme l'émoticône (brut) : ne ferme pas un italique ; `:**` non concerné (A35) ; message malformé réécrit `\*Membres de la cellule :*`, même rendu (2A, §9) | Choix de l'utilisateur ; règle X4 |
| 2026-11-14 | 12 | `:*` tapé comme texte écrit `:\*` (échappement habituel de `*`) ; effet à vérifier (I6, §14 point 19) | Décidé par Claude, non testé |
| 2026-11-14 | 12 | Renvoi de la ROADMAP vers §14 corrigé (point 7, pas 8) | Accord de l'utilisateur |
| 2026-11-14 | 12 | Tests G12 à G27, I6, Z7, Z8 passés et notés dans le cahier (176 tests) ; Copier et copie depuis Discord gardent `<ESC>` et `U+200B` | Résultats de l'utilisateur |
| 2026-11-14 | 12 | Règle X7 (§3) : pas de sous-texte dans une puce sous une ligne stylée (balise hors du texte d'une puce) sans ligne vide entre les deux. Option A : « Sous-texte » grisé, styles de texte grisés sur une ligne sans puce au-dessus d'une telle puce | Choix de l'utilisateur (A) |
| 2026-11-14 | 12 | Lecture X7 : « -# » lu comme du texte, réécrit `- \-# ` (C12) ; écriture : dans un groupe avec une puce en sous-texte, les styles sont refermés à chaque ligne (forme G14) | Décidé par Claude : garder le même rendu quelle que soit la réécriture |
| 2026-11-14 | 12 | Généralisé : titre, citation ou bloc stylés au-dessus comptent comme ligne stylée ; puce en sous-texte rendue invalide à gauche (ligne vide supprimée…) redevient une puce normale | Décidé par Claude, prudence ; non testé |
| 2026-11-14 | 12 | Test `ODJ` ligne 4 réactivé ; tests X7 écrits ce jour ajustés (« -# » en texte au lieu de brut) avant validation | Conséquence du choix de lecture ci-dessus |
| 2026-11-14 | 12 | Étape validée par l'utilisateur (ODJ collé, sous-texte grisé, puces barrées + sous-texte dans Discord, réécriture `\-# `) ; pas de nouveaux exemples, les 8 actuels suffisent | — |
| 2026-11-14 | 12b | Nouvelle étape : coloration syntaxique des blocs de code à gauche, avec Highlight.js (option A) ; SPEC §4 complété | Demande de l'utilisateur |
| 2026-11-14 | 12b | Dépendance `highlight.js` 11 (tous les langages, fichier à part chargé au premier bloc avec un langage, 1A) ; fond sombre (2A) ; version et teintes de Discord non exactes : accepté | Choix de l'utilisateur |
| 2026-11-14 | 12b | Fond sombre pour tout bloc avec un langage, connu ou non ; bloc sans langage inchangé (fond clair) ; palette de teintes choisie par Claude (À tester, à l'œil) | Décidé par Claude |
| 2026-11-14 | 12b | Étape validée par l'utilisateur (blocs `JS`, `js`, `py`, `css`, langage inconnu, `ansi`, comparaison avec Discord) | — |
| 2026-11-14 | 13 | Guide : page `guide.html` du site, lien « Guide d'utilisation » dans l'en-tête (1A) ; pas de mise en ligne pour l'instant (2C) | Choix de l'utilisateur |
| 2026-11-14 | 13 | Tests G28, G29, I7, J5 ajoutés au cahier (180 tests) ; X10 marqué contradictoire avec J5, gardé. Palette ANSI actuelle jugée suffisante (§14 point 8 clos) ; combinatoire des lignes vides en citation non poursuivie | Résultats et décisions de l'utilisateur |
| 2026-11-14 | 13 | Sous-texte permis dans une citation (G29), lu et écrit `> -# ` ; aussi dans une liste citée (`> - -# `) | G29 ; liste citée : généralisé par Claude |
| 2026-11-14 | 13 | Ligne `> ` vide permise seulement en première ligne d'une citation suivie d'une ligne citée non vide (G28) ; ailleurs brute à la lecture, ligne vide à gauche. Constructeur à part (`emptyQuoteLine`) : citer une ligne vide reste refusé, le test G3 est inchangé | G28 ; G3 laissé de côté à la demande de l'utilisateur ; constructeur décidé par Claude |
| 2026-11-14 | 13 | Émoticônes `:)` `:(` `:D` `:P` `;)` `<3` `:o` : non protégées, gardées brutes à la lecture, affichées en émoji à gauche ; tapées à gauche, elles deviennent une pastille émoji dès qu'un espace suit ou que le curseur quitte la fin de ligne. Seule la forme testée (entourée d'espaces, hors code) est reconnue ; `:*` collé s'affiche aussi 😗 | Choix de l'utilisateur (alignement sur I7) ; forme reconnue, moment de conversion et 😗 décidés par Claude |
| 2026-11-14 | 13 | Lignes vides du début et de la fin retirées à l'écriture (J5) | Choix de l'utilisateur |
| 2026-11-14 | 13 | J5 précisé : lignes vides du début et de la fin supprimées à l'envoi ; message trop long refusé s'il commence par des lignes vides. X10 n'est plus contradictoire. Convention inchangée (non écrites), guide corrigé | Précision de l'utilisateur |
| 2026-11-14 | 13 | G30 (capture de l'auteur) : `>` seul au milieu d'une citation = ligne citée vide ; G3 marqué contredit, test G3 remplacé par G30. Ligne citée vide permise partout dans une citation si du texte cité suit (plusieurs de suite : généralisé ; dernière ligne : ligne vide ordinaire). Écrite `> ` en première ligne, `>` au milieu ; `>` et `> ` lus pareil ; une ligne de texte réduite à `>` est échappée `\>` | G30 et accord de l'utilisateur ; formes d'écriture et généralisation décidées par Claude |
| 2026-11-14 | 13 | Tests remplacés : « sous-texte cité refusé / grisé » → G29 ; X10 et « puce laissée vide » sans ligne vide au bord ; aller-retour des exemples comparé sans lignes vides au bord | Accord de l'utilisateur (G3 exclu) |
| 2026-11-14 | 13 | Étape validée par l'utilisateur (citations G28 et G30, sous-texte cité, smileys, lignes vides au bord, guide, scénarios S1 à S15). Première version terminée ; mise en ligne reportée | — |
| 2026-11-14 | — | Partie 3 (deuxième version) : liens masqués, découpage (cœur puis interface), brouillons, aperçu façon Discord. Restent hors périmètre : mise en ligne (possible sur demande), mobile, comptes, partage, envoi direct, émojis personnalisés. `SPEC.md` §9 mis à jour | Choix de l'utilisateur |
| 2026-11-14 | — | Ordre : du plus simple au plus gros (liens, découpage, brouillons, aperçu) ; points ouverts de `docs/discord-rules.md` §14 laissés tels quels, testés seulement si une étape en a besoin | Choix de l'utilisateur |
| 2026-11-14 | — | Contenu des étapes 14 à 17 (tests Discord d'abord, cœur avant interface, scénarios S16+ écrits au début de l'étape, questions à trancher) | Proposé par Claude ; à valider étape par étape |
| 2026-11-14 | 14 | Interface : bulle au survol du lien (adresse, boutons « Modifier » et « Ouvrir ») (option B) ; case « sans aperçu » (adresse écrite `<…>`) ; le champ « adresse » accepte toutes les adresses, pas seulement `http(s)://` | Choix de l'utilisateur ; formes d'adresse reconnues par Discord à vérifier (L7) |
| 2026-11-14 | 14 | Série L (L1 à L10) préparée dans `docs/tests-discord/tests-liens.md` ; `<adresse>` seul non testé (Documenté) | Proposé par Claude |
| 2026-11-14 | 14 | Série L passée (12 tests, cahier : 193 tests), règles inscrites en §4. Protocoles acceptés dans le champ : `https://`, `http://`, `mailto:`, `tel:`, `discord://` seulement ; tout autre refusé | Résultats de l'utilisateur (L7 : « à ne pas autoriser ») ; protocoles non testés refusés par Claude (prudence) |
| 2026-11-14 | 14 | Style à cheval sur le bord d'un lien (L3) : à l'écriture, il est refermé au bord du lien et rouvert dedans (formes L1, L2) | Décidé par Claude : seules formes testées |
| 2026-11-14 | 14 | Lien avec titre (`"info"`, L9) : gardé brut, pas de titre dans l'appli | Décidé par Claude : hors SPEC |
| 2026-11-14 | 14 | Tests complémentaires L11 (émoji, `:nom:`, horodatage, mention dans le texte) et L12 (`\)`, `%20`, `[` seul) préparés | Points restés ouverts après L9, L6, L5 |
| 2026-11-14 | 14 | L11, L12 passés (cahier : 195 tests). Dans le texte d'un lien : horodatage permis ; émoji, `:nom:`, mentions interdits ; `[` seul impossible. Adresse : espace écrit `%20`, `)` non appariée écrite `%29` | Résultats de l'utilisateur ; `%29` plutôt que `\)` décidé par Claude (adresse ouverte avec `\)` non relevée) |
| 2026-11-14 | 14 | Scénarios S16 à S19 écrits dans `SPEC.md` §6 | Accord de l'utilisateur (réponse « Option A ») |
| 2026-11-14 | 14 | Émoji, mention ou `[` seul dans le texte d'un lien : il sort du lien, qui est coupé en deux morceaux de même adresse (option A) | Choix de l'utilisateur |
| 2026-11-14 | 14 | Modèle : le lien est porté par chaque morceau de son texte (texte, code en ligne, horodatage), comme un style ; deux morceaux voisins de même adresse forment un seul lien. Règles des liens dans `src/core/links.ts`, partagées par le cœur et l'éditeur | Décidé par Claude ; même logique que les styles, et l'éditeur (TipTap) traite le lien comme une marque |
| 2026-11-14 | 14 | Écriture : les styles qui couvrent tout le texte du lien sont écrits autour (`**[a](…)**` plutôt que `[**a**](…)`, même rendu, L1, L2) ; `]` seul écrit `\]` ; `[` jamais échappé dans le texte d'un lien | Décidé par Claude, formes testées |
| 2026-11-14 | 14 | Généralisés par prudence : adresse dans le texte du lien (tout `xxx://`) → pas de lien ; code en ligne contenant un crochet → hors du lien ; caractères `<`, `>`, `\` refusés dans une adresse ; protocole en minuscules seulement | Décidé par Claude, non testés |
| 2026-11-14 | 14 | Lecture : un lien n'est lu que sous les formes testées ; sinon le morceau `[…](…)` reste brut (titre, espace, `\)`, `\[`, protocole refusé, émoji…) | S12 |
| 2026-11-14 | 14 | Test `C16_lien_masque_brut` (étape 2) remplacé par `C16_lien_masque_lu_et_crochet_echappe` | Prévu par la ROADMAP ; accord de l'utilisateur |
| 2026-11-14 | 14 | Étape validée par l'utilisateur | — |
| 2026-11-14 | 14 | Interface : bouton « 🔗 Lien » ; avec le curseur dans un lien, il ouvre la modification de ce lien ; la frappe juste après un lien ne le prolonge pas ; « Ouvrir » ouvre un nouvel onglet ; lien à gauche en bleu souligné | Décidé par Claude |
| 2026-11-14 | 15a | Élément plus long que la limite à lui seul : coupé au caractère près (jamais au milieu d'un émoji) ; un lien coupé devient deux liens de même adresse ; une adresse seule plus longue que la limite : le lien devient du texte simple (1A) | Choix de l'utilisateur |
| 2026-11-14 | 15a | Coupe à l'intérieur d'un bloc de code permise seulement si le bloc ne tient pas seul dans un message ; refermé puis rouvert avec le même langage, entre deux lignes si possible (2A) | Choix de l'utilisateur |
| 2026-11-14 | 15a | N1 : un message qui commence par `3.` numérote à partir de 3 ; la liste coupée reprend sa numérotation. Test retiré de la série N à passer | Essai de l'utilisateur |
| 2026-11-14 | 15a | Scénarios S20 à S24 écrits dans `SPEC.md` §6 ; série N (N2 à N7) préparée dans `docs/tests-discord/tests-decoupage.md` et `N4-ansi-coupe.txt` | Proposé par Claude ; à valider |
| 2026-11-14 | 15a | Série N passée (cahier : 202 tests). N2 : sous-liste en tête de message décalée par Discord → option A (couper avant un élément de premier niveau ; si forcé, la sous-liste remonte d'un niveau). N7 : espaces du début retirés → l'espace d'une coupe entre mots n'est écrit nulle part | Résultats et choix de l'utilisateur |
| 2026-11-14 | 15a | `split(document, limite)` dans `src/core/split.ts` : coupe le document, chaque morceau écrit par `serialize` ; à préférence égale, la coupe la plus loin qui tient (même si un message reste court) | Décidé par Claude |
| 2026-11-14 | 15a | Ligne coupée : la suite garde puce, numéro, titre ou citation (un numéro peut apparaître dans les deux messages) ; bloc de puce en tête de message écrit hors de la liste ; ligne citée vide en fin de message retirée ; morceau brut coupé en tout dernier recours ; coupe entre deux mots d'un lien avant la coupe au caractère près | Décidé par Claude |
| 2026-11-14 | 15a | Étape validée par l'utilisateur : V1 à V7 de `docs/tests-discord/validation-etape-15a.txt` collés dans Discord (spoiler en gras, liste et sous-listes, bloc `js`, ANSI, citation, lien, exemples à la vraie limite 2000), tous corrects | — |
| 2026-11-14 | 15b | Présentation : un cadre par message sous le panneau droit, affichés d'office dès que le texte dépasse la limite, sans bouton « Découper » (1A) ; « ✓ Copié » gardé jusqu'à la modification du texte ou de la limite, nouveau clic = nouvelle copie (Q2) ; messages écrits à la manière de l'appli, même rendu (Q3) | Choix de l'utilisateur |
| 2026-11-14 | 15b | Scénarios S25, S26 écrits dans `SPEC.md` §6 ; §3 et §10 mis à jour | Réponses de l'utilisateur |
| 2026-11-14 | 15b | Le découpage porte sur le document (texte de droite relu), seulement en dépassement du texte de droite ; phrase d'introduction au-dessus des cadres ; caractères invisibles montrés par un point rouge (copie intacte) ; cadres et texte défilent séparément ; copie partagée avec le panneau droit (`src/ui/clipboard.ts`) | Décidé par Claude |
| 2026-11-14 | 15b | Lenteur du découpage sur une très longue ligne : laissée telle quelle, notée dans « Mises à jour possibles plus tard » | Décision de l'utilisateur : cas très rare |
| 2026-11-14 | 15b | Avertissement des modèles de mention aussi dans le cadre de chaque message qui en contient un (S26) ; celui sous le panneau droit est gardé | Demande de l'utilisateur ; « gardé » décidé par Claude |
| 2026-11-14 | 15b | Étape validée par l'utilisateur (cadres des messages découpés, copie, « ✓ Copié », avertissement de mention par cadre, collage dans Discord) | — |
| 2026-11-14 | 16 | Un seul brouillon (1A ; plusieurs brouillons nommés notés dans « Mises à jour possibles plus tard ») ; enregistrement automatique (2A) ; limite 2000 / 4000 gardée (3A), ce qui **remplace** « non mémorisée » (étape 11) | Choix de l'utilisateur |
| 2026-11-14 | 16 | On enregistre le texte de droite tel quel, pas le document (rien n'est perdu, forme du document libre de changer) ; mémoire du navigateur (`localStorage`) ; brouillon relu à l'ouverture comme un texte collé à droite | Décidé par Claude |
| 2026-11-14 | 16 | Enregistrement 0,5 s après la dernière modification, et tout de suite à la fermeture de la page ; « ✓ Brouillon enregistré » près du compteur, masqué si le navigateur refuse ; brouillon illisible ou mémoire bloquée : texte vide, limite 2000, aucun message (S30) ; historique « Annuler » et position du curseur non gardés | Décidé par Claude |
| 2026-11-14 | 16 | Étape validée par l'utilisateur (texte et limite retrouvés après fermeture et réouverture de la page) | — |
| 2026-11-14 | 17 | Aperçu sous les deux panneaux, sur toute la largeur : panneaux un peu moins hauts que l'écran, la page défile pour voir tout l'aperçu (mélange des options proposées) ; nom « Vous », rond coloré, heure (Q2 B) ; aperçu de chaque message découpé (Q3 A). Scénarios S31 à S34 | Choix de l'utilisateur |
| 2026-11-14 | 17 | Bouton « Masquer l'aperçu » (panneaux à pleine hauteur), aperçu affiché à chaque ouverture, non mémorisé | Décidé par Claude, accepté dans S31 |
| 2026-11-14 | 17 | Cœur `previewOf` : lignes vides du bord retirées (J5), citations voisines sous une seule barre, numéros et type de liste (G1, D3), morceaux d'un même lien réunis, spoilers voisins (même sur plusieurs lignes) révélés d'un seul clic | Décidé par Claude, d'après les règles existantes |
| 2026-11-14 | 17 | Affichage : teintes, tailles, polices, puces par niveau (•, ◦, ▪) reproduites à l'œil (écart accepté, comme l'ANSI) ; mention en pastille avec modèle ou identifiant ; `:nom:` et émoticônes en émoji ; syntaxe inconnue en texte ; pas de vignette de lien ; messages découpés sans nom, heure au survol | Décidé par Claude ; apparence, pas règle de formatage |
| 2026-11-14 | 17 | Cadres des messages découpés réduits à leur en-tête ; un clic en déroule un et réduit le message complet ; un clic sur le message complet revient. Scénario S35 | Demande de l'utilisateur (gagner de la place) |
| 2026-11-14 | 17 | Un seul message déroulé à la fois ; second clic sur un message déroulé = retour au message complet ; « Copier » et avertissement visibles cadre réduit ; compteur gardé sous le message complet réduit ; titre « Message complet » quand il y a découpage ; texte déroulé qui défile dans son cadre (tous les titres restent visibles) | Décidé par Claude |
| 2026-11-14 | 17 | Étape validée par l'utilisateur (aperçu comparé à Discord, messages découpés réductibles) | — |
| 2026-11-14 | — | Partie 4 : interface en anglais avec le français toujours disponible (étape 18), puis mise en ligne sur GitHub Pages (étape 19), dépôt rendu public par l'utilisateur après l'étape 18. La mise en ligne quitte « Toujours hors périmètre » ; `SPEC.md` §7 et §9 mis à jour | Choix de l'utilisateur |
| 2026-11-14 | — | Contenu des étapes 18 et 19 (questions à trancher, vérification de ce qui devient public avant d'ouvrir le dépôt) | Proposé par Claude ; à valider étape par étape |
| 2026-11-14 | 18 | Langue au premier lancement : celle du navigateur (français si `fr…`, anglais sinon), puis choix gardé dans le navigateur (1A) ; horodatages dans la langue de l'interface (3A) ; recherche d'émojis dans les deux langues, noms affichés dans celle de l'interface (4B) ; un guide par langue (5A) ; textes écrits par l'appli, sans bibliothèque (6A) | Choix de l'utilisateur |
| 2026-11-14 | 18 | Modèles de mention en anglais dans les deux langues : `ID_USER`, `ID_ROLE`, `ID_CHANNEL` (2B) ; anciens `ID_UTILISATEUR`, `ID_SALON` toujours lus et réécrits tels quels, avec l'avertissement. Test I1 remplacé, test « l'avertissement disparaît » ajusté (mot remplacé) | Choix et accord de l'utilisateur ; garder les anciens tels quels décidé par Claude (aucun texte existant modifié) |
| 2026-11-14 | 18 | Raisons de grisage et de refus : un nom par raison dans le cœur (`src/core/reasons.ts`), texte dans chaque langue dans `src/ui/i18n/` ; message français du cœur inchangé (option A) | Choix de l'utilisateur |
| 2026-11-14 | 18 | Bouton « FR \| EN » en haut à droite de l'en-tête, même aspect que 2000 / 4000 ; chaque bouton nommé dans sa langue (« Interface en français », « Interface in English ») | Décidé par Claude |
| 2026-11-14 | 18 | Suivent aussi la langue : format des nombres (« 2 000 » / « 2,000 »), heure de l'aperçu, vérification d'orthographe de l'éditeur de gauche, langue de la page | Décidé par Claude |
| 2026-11-14 | 18 | Anglais : formes de l'anglais américain pour l'aperçu des horodatages (À tester, §8) ; « Ctrl+Shift+S », « H1 H2 H3 », bouton « Save » dans les fenêtres de modification | Décidé par Claude |
| 2026-11-14 | 18 | Propositions @ # : « ro », « util », « sal » (français) et « role », « us », « chan » (anglais) marchent dans les deux langues | Décidé par Claude, comme la recherche d'émojis (4B) |
| 2026-11-14 | 18 | Noms des couleurs ANSI retirés de `ansiPalette.ts`, placés dans les textes ; pastilles de l'éditeur redessinées au changement de langue | Un seul endroit pour les textes (ROADMAP) |
| 2026-11-14 | 18 | Étape validée par l'utilisateur (passage FR ↔ EN dans toute l'appli, texte de droite identique, langue gardée, guides) | — |
| 2026-11-14 | 19 | Dépôt rendu public tel quel, historique compris (1A) ; mise à jour automatique du site à chaque envoi sur `main`, après les tests (2A) ; `README.md` court en français et en anglais (3A). Scénarios S40 à S43 | Choix de l'utilisateur |
| 2026-11-14 | 19 | Licence PolyForm Noncommercial 1.0.0 (réutilisable, non commerciale), au nom de Benjamin Moro, dans `LICENSE.md` (texte officiel, version 1.0.0) | Choix de l'utilisateur |
| 2026-11-14 | 19 | Adresse de base `/discord-formatter/` pour la version construite et `npm run preview` seulement ; `npm run dev` reste sur http://localhost:5173/ ; configuration « site-verif » ajoutée à `.claude/launch.json` | Décidé par Claude : rien ne change pour l'usage local |
| 2026-11-14 | 19 | Mise en ligne par GitHub Actions (`.github/workflows/pages.yml`), Node « LTS », aussi lançable à la main depuis l'onglet Actions | Décidé par Claude |
| 2026-11-14 | 19 | Émojis chargés dès l'ouverture de la page ; une pastille `:nom:` déjà affichée se redessine en émoji quand ils sont chargés (le premier `:star:` collé restait en texte) | Demande de l'utilisateur ; correction de la cause décidée par Claude |
| 2026-11-14 | 19 | Étape validée par l'utilisateur (site public ouvert, écriture, copie vers Discord, brouillon retrouvé, langue, guide) | — |

---

## Prompt de démarrage (étape 0)

À coller dans Claude Code, depuis le dossier du projet :

> Lis l'étape 0 de `ROADMAP.md` et la section 7 de `SPEC.md` (`CLAUDE.md` est déjà chargé). Nous commençons l'étape 0. Je n'ai aucune connaissance en développement : explique-moi tout en français simple. En mode plan, propose-moi 2 ou 3 stacks techniques adaptées aux contraintes de `SPEC.md` (section 7), avec avantages et inconvénients sans jargon et ta recommandation. N'écris aucun code avant que j'aie choisi.

## Prompt type pour les étapes suivantes

> Lis l'étape N de `ROADMAP.md` et son journal des décisions, puis uniquement les sections de `docs/discord-rules.md`, les scénarios de `SPEC.md` et les séries de `docs/cahier-de-tests.md` utiles à cette étape. En mode plan, dis-moi ce que tu vas faire. N'implémente qu'après mon accord.