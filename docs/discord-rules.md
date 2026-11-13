# Règles de formatage Discord

Ce fichier est la **seule source de vérité** sur le rendu Discord pour l'application (voir `SPEC.md`, section 5). Si l'appli et ce fichier se contredisent, c'est ce fichier qui a raison. Toute règle découverte ou corrigée est ajoutée ici **avant** d'être codée.

Il distingue deux sortes de contenu :
- **Règles Discord** : ce que Discord fait réellement.
- **Conventions de l'application** : des choix de l'appli (par exemple l'ordre des balises) pour que les messages soient toujours générés de la même façon. Elles sont repérées par la mention *Convention*.

## Légende des statuts

| Statut | Signification |
|---|---|
| **Testé** | Vérifié par l'auteur dans Discord le 13/11/2026, sur ordinateur et sur mobile sauf mention contraire. Le numéro du test est indiqué entre parenthèses : le message envoyé, le résultat attendu et le résultat constaté sont dans `docs/cahier-de-tests.md` |
| **Documenté** | Connu ou documenté, mais pas encore testé par l'auteur |
| **À tester** | Hypothèse ou point incertain : ne pas coder tant que ce n'est pas confirmé |
| **Généralisé** | Règle posée par l'auteur à partir de quelques tests, sans tester toute la combinatoire : elle se code comme une règle testée. Les tests qui la fondent sont indiqués entre parenthèses |

---

## 1. Formatage de texte basique

| Style | Syntaxe | Statut |
|---|---|---|
| Italique | `*texte*` ou `_texte_` | Testé (A2, A6, C3) |
| Gras | `**texte**` | Testé (A1, A2) |
| Souligné | `__texte__` | Testé (A5, B2) |
| Barré | `~~texte~~` | Documenté |
| Spoiler (masqué, clic pour révéler) | `\|\|texte\|\|` | Testé (I3) |

### Combinaisons (liste non exhaustive)

| Combinaison | Syntaxe | Statut |
|---|---|---|
| Gras + italique | `***texte***` | Testé (A8) |
| Souligné + italique | `__*texte*__` | Documenté |
| Souligné + gras | `__**texte**__` | Documenté |
| Souligné + gras + italique | `__***texte***__` | Testé (A8) |
| Barré + souligné + gras + italique | `~~__***texte***__~~` | Documenté |
| Spoiler + barré + souligné + gras + italique | `\|\|~~__***texte***__~~\|\|` | Testé (A8) |

### Styles imbriqués (un style à l'intérieur d'un autre)

Quand un style ne couvre qu'une partie d'un autre, les délimiteurs peuvent se toucher (`***`) **du même côté** (tous en ouverture ou tous en fermeture) : c'est correct. Seule la rencontre d'une **fermeture et d'une ouverture** pose problème (section 2.3).

| Écriture | Résultat | Statut |
|---|---|---|
| `**a *b***` | a gras, b gras + italique | Testé (A9) |
| `***a* b**` | a gras + italique, b gras | Testé (A10) |
| `**a _b_**` | a gras, b gras + italique | Testé (A11) |
| `*a **b***` | a italique, b italique + gras | Testé (A12) |
| `***a** b*` | a italique + gras, b italique | Testé (A13) |
| `` **x `code` y** `` | code en ligne à l'intérieur d'un gras : rendu correct | Testé (A14) |
| `` \|\|`code`\|\| `` | code en ligne caché par un spoiler : rendu correct | Testé (A15, X8) |
| `` *`code`* `` / `` ~~`code`~~ `` | code en ligne en italique / barré : rendu correct | Testé (X8) |
| ``` ``a`b`` ``` | code en ligne contenant un accent grave, délimité par deux accents graves : affiche a`b | Testé (A16) |

### Délimiteurs et mots

| Règle | Statut |
|---|---|
| Un `_` à l'intérieur d'un mot n'ouvre pas d'italique : `mon_fichier_final` s'affiche tel quel | Testé (B1, C4) |
| Un `*` à l'intérieur d'un mot ouvre bien un italique : `a*b*c` met le b en italique | Testé (C3) |
| `__init__.py` : « init » est souligné | Testé (B2) |
| Un `_` d'**ouverture** collé à une lettre ouvre bien un italique : `suite_mot_ fin` met « mot » en italique | Testé (A30) |
| Un `_` de **fermeture** suivi d'une lettre ou d'un chiffre ne ferme pas : `mon_fichier_final` reste littéral | Testé (B1) |
| `_mot_suite` (fermeture collée à une lettre) : reste littéral, sans mise en forme | Testé (A32) |
| `a **** b` : un astérisque d'italique de chaque côté de `**` ; affiche `a ** b`, les `**` en italique | Testé (A31) |
| Souligné, gras, barré et spoiler à l'intérieur d'un mot (`a__b__c`, `a**b**c`, `a~~b~~c`, `a\|\|b\|\|c`) : le b est mis en forme | Testé (A23 à A26) |

### Espaces au bord d'un style

| Règle | Statut |
|---|---|
| Un espace juste avant la fermeture d'un gras, souligné, barré ou spoiler est **conservé** (`**a **b` affiche « a b », a en gras) | Testé (A19 à A22) |
| Un espace juste avant la fermeture d'un **italique** est **perdu** : `*a *b` affiche « ab » (a en italique) | Testé (A18) |
| Un espace juste après l'ouverture d'un style ne gêne pas : `** a**` met a en gras | Testé (A28) |
| En début de ligne, `* ` est une **puce** : `* a*` s'affiche comme la puce « a* », pas comme un italique | Testé (A29) |

*Convention* : l'appli sort de l'italique les espaces placés à ses bords (`*a* b` au lieu de `*a *b`). Un espace en italique est invisible : le rendu est identique, l'espace n'est plus perdu (A18) et `* ` ne peut pas être pris pour une puce (A29).

### Styles sur plusieurs lignes

| Règle | Statut |
|---|---|
| Un style peut couvrir plusieurs lignes : `**a ↵ b**` met a et b en gras | Testé (A17) |
| Deux symboles situés sur des lignes différentes forment une paire : `~~` non échappé sur deux lignes fait apparaître un barré (ligne vide visible) | Testé (C18) |
| Un style traverse aussi une **ligne vide** : `**a ↵ ↵ b**` met a et b en gras | Testé (A27) |

*Convention* : un style qui continue d'une ligne à la suivante, même après des lignes vides, n'est pas refermé en fin de ligne (économie de caractères).

Pour annuler un formatage et afficher les symboles bruts, placer un antislash devant le caractère (ex. `\*pas en italique\*`).

### Émojis, mentions et styles
- Gras, italique, souligné et barré **n'ont aucun effet visible** sur un émoji. Seul le spoiler le cache. Statut : Testé (I3).
- Même constat pour une **mention** (utilisateur, rôle, salon) : gras, italique et autres styles n'ont aucun effet. Le spoiler la cache tout en la laissant active (la personne est bien mentionnée). Statut : Testé.
- Styles sur un horodatage : À tester.

*Convention* (décidée par l'auteur le 13/11/2026) : l'appli **ne filtre pas** les balises autour des émojis ou des mentions. Si l'utilisateur a mis un émoji en gras, la balise est écrite telle quelle. Raisons : `**toto 😀 tata**` est plus court que `**toto** 😀 **tata**`, les titres (`#`, `##`, `-#`) ont un effet sur les émojis, et le cas est trop rare pour justifier une règle de plus.

---

## 2. Conventions de sortie de l'application

*Convention* : pour que deux textes identiques produisent toujours exactement le même message (et pour que l'aller-retour gauche → droite → gauche soit stable), l'appli applique toujours les règles suivantes.

### 2.1 Ordre fixe des balises

Du plus extérieur au plus intérieur :

**Spoiler > Barré > Souligné > Gras > Italique**

Exemple : `||~~__***texte***__~~||`.

### 2.2 Délimiteur de l'italique

Par défaut, l'italique s'écrit avec `*`. Les puces de liste utilisent `-` (jamais `*`, pour éviter toute confusion avec l'italique).

### 2.3 Cas particulier : collision de délimiteurs

Quand deux segments se suivent directement, on peut obtenir **trois caractères identiques d'affilée**, que Discord interprète mal. Les cas ci-dessous ont été testés.

| Segments | Écriture | Résultat constaté | Statut |
|---|---|---|---|
| Gras puis italique | `**1***2*` | **Cassé** : 1 en gras, puis `*2*` affiché tel quel (A1) | Testé |
| Gras puis italique | `**1**_2_` | Correct : 1 gras, 2 italique (A2) | Testé |
| Italique puis gras | `*1***2**` | **Cassé** : 1 en italique, puis `**2**` affiché tel quel (A3) | Testé |
| Italique puis gras | `_1_**2**` | Correct (A4) | Testé |
| Souligné puis italique avec `_` | `__1___2_` | **Cassé** : 1 souligné, les `_` autour de 2 restent visibles (A5) | Testé |
| Souligné puis italique avec `*` | `__1__*2*` | Correct (A6) | Testé |
| Gras puis italique, séparés par un espace | `**1** *2*` | Correct (A7) | Testé |

**Règle** : l'italique s'écrit avec `*`. À chaque frontière entre deux segments, si ce délimiteur produit `***` (italique voisin d'un gras), l'italique de ce segment utilise `_` à la place. Si `_` produisait `___` (italique voisin d'un souligné), il utilise `*`.

**Limite de la règle** : `_` ne fonctionne pas collé à une lettre (B1). Le remplacement par `_` n'est donc valable que si le caractère juste avant le segment italique et le caractère juste après ne sont ni une lettre ni un chiffre.

**Cas résiduels** (aucun des deux délimiteurs ne convient) :
1. Un segment en italique seul coincé entre un souligné d'un côté et un gras de l'autre.
2. Un italique en collision avec un gras voisin ET collé à une lettre (mise en forme au milieu d'un mot).

**Solution : insérer un caractère invisible (espace de largeur nulle, `U+200B`) à la frontière.** Testé (Z1 à Z3) :

| Écriture | Résultat constaté | Statut |
|---|---|---|
| `**1**<U+200B>*2*` | 1 gras, 2 italique | Testé (Z1) |
| `__1__*2*<U+200B>**3**` | 1 souligné, 2 italique, 3 gras | Testé (Z2) |
| `__1__<U+200B>*2*<U+200B>**3**` | 1 souligné, 2 italique, 3 gras | Testé (Z3) |

Le caractère invisible compte pour 1 caractère dans la limite (voir section 12).

*Convention* : à chaque frontière en collision, l'appli choisit dans cet ordre : (1) `_` à la place de `*` si c'est permis (aucun caractère de plus) ; (2) sinon le caractère invisible `U+200B`.

Ces cas doivent figurer dans les tests automatiques de l'appli.

---

## 3. Titres, listes et citations

### Titres et sous-texte
L'espace après le `#` est obligatoire. Le symbole doit être en début de ligne.

| Élément | Syntaxe | Statut |
|---|---|---|
| Titre niveau 1 | `# Titre` | Testé (D1) |
| Titre niveau 2 | `## Titre` | Testé (D1) |
| Titre niveau 3 | `### Titre` | Testé (D1) |
| Sous-texte (petit, gris) | `-# Texte` | Testé (D2) |
| Gras, italique, souligné, barré, spoiler, horodatage et lien à l'intérieur d'un titre ou d'un sous-texte | permis | Testé (D1, D2) |
| Titre à l'intérieur d'une puce de liste | **non rendu** | Testé (D14) |
| Sous-texte à l'intérieur d'une puce (`- -# texte`) | permis, `-#` invisible (mais voir l'exception X7 dans « Listes ») | Testé (X6) |
| Mention à l'intérieur d'un titre | permis, la taille du texte de la mention s'adapte au titre | Testé |
| Titre à l'intérieur d'une citation | permis | Testé (D12) |
| Balise ouvrante placée **avant** le marqueur : `**# x**` donne un titre en gras ; `~~- a` une puce barrée ; `~~> a` une citation barrée. Le marqueur reste donc interprété derrière des balises ouvrantes (et doit alors être échappé s'il est du texte) | Testé (A34, X7, X10) |

### Listes

| Élément | Règle | Statut |
|---|---|---|
| Puce | `- Élément` (ou `* Élément`) | Documenté (`* ` : Testé, A29) |
| Sous-niveau | 2 espaces d'indentation par niveau | Documenté |
| **Profondeur maximale : 11 niveaux** (le 12e n'est pas interprété) | | Testé |
| Liste numérotée | `1. Élément` | Testé (G1, G2) |
| Un sous-niveau peut avoir un type différent de son parent (puce sous un numéro, ou l'inverse) | permis | Testé |
| **À un même niveau, tous les éléments prennent le type du premier** (puce ou numéro). Une ligne `1. ` placée après une puce du même niveau s'affiche comme puce, et inversement | | Testé (D3) |
| Numérotation : le premier numéro donne le départ, les suivants s'incrémentent. `1. 1. 1.` s'affiche 1-2-3 ; `3. 7. 2.` s'affiche 3-4-5 | | Testé (G1, G2) |
| Citation à l'intérieur d'une puce | permis (sur mobile, la puce n'apparaît pas devant la citation, mais le message reste lisible) | Testé (D14) |
| Bloc de code à l'intérieur d'une puce | permis | Testé (D13) |
| Liste à l'intérieur d'une citation | permis | Testé (D11) |
| Mention à l'intérieur d'une puce | permis | Testé |
| Un barré peut englober plusieurs puces (`~~- a ↵ - b~~`) : les puces restent des puces, barrées | permis | Testé (X7) |
| **Anomalie** : juste après des puces englobées dans un barré, une puce `- -# texte` affiche `-#` tel quel (sous-texte non appliqué), alors que la même puce sans barré au-dessus fonctionne (X6). Cause inconnue | | Constaté (X7) |

*Conventions* :
- L'appli écrit les puces avec `-`.
- Les listes numérotées sont écrites avec des **numéros successifs réels** (1., 2., 3., ...), en commençant par le numéro de départ choisi.
- **Une liste est soit à puces, soit numérotée, par niveau.** Deux listes de types différents au même niveau ne peuvent pas se suivre directement : il faut les séparer par un autre élément.

### Citations
**L'appli n'utilise que `> `** (chevron suivi d'un espace), répété au début de **chaque ligne** citée. Elle ne génère pas `>>>`.

| Point | Statut |
|---|---|
| `> texte` : citation (espace obligatoire après `>`) | Documenté |
| Citation sur plusieurs lignes : `> ` au début de chaque ligne | Testé (D4) |
| Un texte placé sur la ligne juste après une citation d'une ligne sort de la citation | Testé (G4) |
| Bloc de code, liste et titre à l'intérieur d'une citation : permis | Testé (D10, D11, D12) |
| **Une ligne `>` seule s'affiche telle quelle (le `>` est visible)** : elle ne peut pas servir de ligne vide dans une citation | Testé (G3) |
| Façon d'écrire une ligne vide dans une citation (essais : `> _ _`, `> ` + caractère invisible) | À tester |
| Mention à l'intérieur d'une citation : permis | Testé |
| Un message composé uniquement de `> ` est refusé (message vide) | Testé |
| Citation imbriquée : non supportée par Discord | Documenté |
| Un barré peut englober une citation sur plusieurs lignes, et le texte qui suit (`~~ ↵ > a ↵ > b ↵ c~~`) | Testé (X1) |
| `>>> texte` : tout ce qui suit est cité. **Non généré par l'appli** | Documenté |

*Convention* : si un message collé contient `>>>`, il est conservé en texte brut.

---

## 4. Liens (prévus pour une version future)

| Syntaxe | Effet | Statut |
|---|---|---|
| `[Texte](https://exemple.com)` | Lien masqué : le texte est cliquable, l'adresse est cachée. Fonctionne dans un message d'utilisateur | Testé (C16) |
| `<https://exemple.com>` | Lien affiché sans aperçu (embed) | Documenté |
| `https://exemple.com/_a_` | Adresse écrite telle quelle : devient un lien, les symboles qu'elle contient ne sont **pas** interprétés | Testé (C21) |
| `**https://exemple.com**` | Un style autour d'une adresse s'applique au lien | Testé (C22) |
| Fin d'une adresse : elle s'arrête au premier espace ou `<`, sans le signe de ponctuation final (`.`, `,`, `:`, `;`, `"`, `'`, `)`, `]`) | Documenté |

---

## 5. Blocs de code

### Le code est une entité unique

Un code en ligne et un bloc de code (y compris `ansi`) forment chacun **un bloc indivisible** : rien n'est mis en forme à l'intérieur, mais on peut le mettre en forme **de l'extérieur**, en entier.

| Règle | Statut |
|---|---|
| **Styles de texte** (gras, italique, souligné, barré, spoiler) placés autour d'un **code en ligne** : le style s'applique à tout le code | Généralisé (A14, A15, X8) |
| **Styles de texte** placés autour d'un **bloc de code** : le style s'applique à tout le bloc | Généralisé (X2 pour le spoiler et le barré qui l'englobent) |
| **Mise en page** (titre, sous-texte, puce, citation) appliquée à une ligne qui contient un **code en ligne** : le code en prend l'effet (taille du titre, etc.) | Généralisé |
| **Mise en page** appliquée à un **bloc de code** : **aucun effet**, un bloc ne peut pas être dans un titre ou un sous-texte (la puce et la citation restent permises : D10, D13) | Généralisé |
| Un style ne peut **jamais** couvrir seulement une partie du code | Testé (D6, D7, X8) |

*Convention* : l'appli autorise tous les styles de texte autour d'un code en ligne ou d'un bloc de code, sans tester chaque combinaison.

### Code en ligne
`` `texte` `` (un accent grave de chaque côté). Le markdown n'y est pas interprété. Statut : Testé (D6).

- Des balises placées **à l'intérieur** du code en ligne restent visibles et ne sont pas appliquées (`` `~~a~~ ou *b*` ``). Statut : Testé (D6, X8).
- Un code en ligne qui contient un accent grave s'écrit entre **deux** accents graves : ``` ``a`b`` ```. Statut : Testé (A16).
- Un code en ligne peut s'étendre sur **deux lignes** : `` `a ↵ b` `` donne un seul code sur deux lignes. Statut : Testé (A33). L'appli ne permet pas encore de le construire : à la lecture, il est conservé brut (réécrit tel quel).
- Code en ligne commençant ou finissant par un accent grave, ou contenant deux accents graves d'affilée : À tester (l'appli ne permet pas de le construire pour l'instant).

### Bloc de code
````text
```
Texte brut
sur plusieurs lignes.
```
````

### Avec langage
Le nom du langage est placé juste après les trois premiers accents graves (coloration par Highlight.js). Exemples courants : `js`, `py`, `html`, `css`, `json`, `c`, `cpp`, `cs`, `php`, `sql`, `bash`, `yaml`, `xml`, `md`. Le langage est un champ de texte libre dans l'appli.

### Règles de contenu

| Règle | Statut |
|---|---|
| Dans un bloc de code ou du code en ligne, **rien n'est interprété** : ni gras, italique, souligné, barré, spoiler, lien, ni horodatage, ni mention | Testé (D6, D7, D8, I2) |
| Un bloc `ansi` sans code ANSI s'affiche comme un bloc normal | Testé (D9) |
| Les **couleurs ANSI n'existent que dans un bloc `ansi`** | Documenté |
| Un langage inconnu est ignoré : le bloc s'affiche normalement | Testé (F1) |
| Le nom du langage est insensible à la casse (`JS` colore comme `js`) | Testé (F2) |
| **Si le contenu commence sur la même ligne que les ```` ``` ```` d'ouverture, le nom du langage n'est pas interprété et s'affiche dans le texte** | Testé (F3) |
| **Les lignes vides au début et à la fin d'un bloc ne sont pas conservées** | Testé (F4) |
| **Trois accents graves dans un bloc cassent le bloc** (les trois derniers sont lus comme une ouverture) | Testé (F5) |
| **Contournement : un espace de largeur nulle (`U+200B`) inséré entre le premier et le deuxième accent grave garde le bloc entier** (les trois accents graves font alors partie du contenu) | Testé (Z4) |
| Les blocs de code ne s'imbriquent pas | Documenté |
| Lignes vides au milieu d'un bloc | À tester |

*Convention* : l'appli met toujours **un saut de ligne** juste après les ```` ``` ```` d'ouverture (et après le langage), normalise le contenu du bloc en supprimant les lignes vides de début et de fin, et, si le contenu contient trois accents graves d'affilée, insère un espace de largeur nulle (`U+200B`) après le premier.

### Règle de l'application : langage et couleur
- Le champ « langage » est **vide par défaut**.
- Si le langage est vide et qu'une couleur est appliquée, le bloc devient un bloc **`ansi`**.
- Si un langage est spécifié (autre qu'`ansi`), **la couleur est impossible** : les options de couleur sont grisées.

---

## 6. Couleurs ANSI

Les couleurs ANSI ne fonctionnent que dans un bloc de code de langage `ansi`. Tests E1 à E13 effectués.

### Rendu selon la plateforme

| Plateforme | Constat | Statut |
|---|---|---|
| Ordinateur | Couleurs, fonds, gras, souligné et italique s'affichent | Testé (E1 à E5, E7) |
| Mobile | **Rien n'est coloré ni stylé.** Les balises sont **masquées** : le texte reste propre et lisible, sans mise en forme | Testé (E1 à E5, E7, E13) |

L'application ne doit donc pas considérer un rendu sans couleur sur mobile comme une erreur de format.

### Structure d'une balise
La séquence commence par le caractère d'échappement ASCII `U+001B` (écrit `\u001b` ou `\x1b`, représenté ici par `<ESC>`), suivi de `[`, de codes séparés par `;`, et se termine par `m`.

> **Note technique** : ce caractère ne se tape pas au clavier dans Discord. Il faut le copier-coller. L'appli doit donc produire le **vrai caractère** dans le texte de sortie et dans le bouton « Copier ». Le copier-coller de ce caractère depuis un fichier texte vers Discord a été vérifié (série E). Reste à vérifier avec le bouton « Copier » de l'appli une fois construite.

*Convention* : l'appli écrit toujours les codes dans cet ordre : **styles (croissants), puis fond, puis texte**.

Format : `<ESC>[{STYLES};{FOND};{TEXTE}m` suivi du texte, puis `<ESC>[0m`.

Exemple : `<ESC>[1;4;45;37mTexte<ESC>[0m` (gras, souligné, fond indigo, texte blanc).

| Point | Statut |
|---|---|
| L'ordre des codes est libre côté Discord (`1;31` = `31;1`, `45;37` = `37;45`). L'ordre ci-dessus est une convention de l'appli | Testé (E4) |
| Plusieurs styles dans une même balise (`1;4`) ou dans des balises séparées : les deux fonctionnent | Testé (E3) |
| **Persistance** : la mise en forme continue sur les lignes suivantes jusqu'au prochain reset | Testé (E6) |
| `<ESC>[0m` réinitialise la mise en forme | Testé (E12) |
| **`<ESC>[m` (sans code) ne réinitialise PAS** : le texte reste coloré. Ne jamais l'utiliser | Testé (E12) |
| Le markdown n'est pas interprété dans un bloc `ansi` : le texte est coloré, mais les symboles markdown restent visibles | Testé (E8) |
| Codes ANSI hors de tout bloc de code : sans effet | Testé (E11) |
| Codes ANSI dans un bloc **sans langage** : ignorés, la séquence reste visible | Testé (E9) |
| Codes ANSI dans un bloc **`js`** : ignorés (séquence visible), la coloration du langage s'applique (les chiffres sont colorés) | Testé (E10) |
| Le caractère `<ESC>` compte pour 1 caractère dans la limite | Testé (K9, K10) |

*Conventions* :
- Chaque passage coloré ou stylé est refermé par `<ESC>[0m`. Un passage peut s'étendre sur plusieurs lignes (persistance).
- L'appli n'écrit jamais de code ANSI en dehors d'un bloc `ansi`.
- Le reset est toujours `<ESC>[0m`.

### Codes acceptés

**Styles**

| Code | Effet | Statut |
|---|---|---|
| `0` | Réinitialise tout | Testé (E12) |
| `1` | Gras | Testé (E3) |
| `4` | Souligné | Testé (E3) |
| `3` | Italique : **appliqué** sur ordinateur (première lecture de E7 erronée, corrigée par l'auteur ; confirmé par les exemples `couleurs` et `cellule_des_huit`) | Testé (E7) |
| `2` | Atténué : sans effet | Testé (E13) |
| `7` | Inversé : sans effet | Testé (E13) |
| `9` | Barré | Apparemment appliqué sur ordinateur, **à confirmer** (E13) |

**Couleurs de texte**

| Code | Couleur |
|---|---|
| `30` | Gris foncé |
| `31` | Rouge |
| `32` | Vert |
| `33` | Jaune |
| `34` | Bleu |
| `35` | Rose |
| `36` | Cyan |
| `37` | Blanc |

**Couleurs de fond**

| Code | Couleur de fond |
|---|---|
| `40` | Bleu nuit foncé |
| `41` | Orange / rouge brique |
| `42` | Gris marbré |
| `43` | Gris turquoise |
| `44` | Gris clair |
| `45` | Indigo |
| `46` | Gris très clair |
| `47` | Blanc |

Statut de ces deux tableaux : codes Testés (E1, E2). Les noms des teintes sont indicatifs.

**Codes hors liste de départ, appliqués sur ordinateur d'après E13** : `91` (rouge clair, donc probablement `90` à `97`) et `38;5;196` (mode 256 couleurs). Statut : À confirmer. Non utilisés dans la première version.

**Couleurs « au choix » `38;2;R;G;B`** (rouge, vert, bleu de 0 à 255, ex. `38;2;255;218;6` pour un jaune doré) : **appliquées sur ordinateur**. Statut : Testé (X3). Non proposées par l'appli dans la première version, mais **conservées telles quelles** si elles sont collées (S12).

Code `2` combiné à d'autres (`2;1;2`) : sans effet, le reste s'applique (ici le gras). Statut : Testé (X3).

### Exemple
````ansi
```ansi
<ESC>[1;31mTexte en gras et rouge<ESC>[0m
<ESC>[4;32mTexte souligné et vert<ESC>[0m
<ESC>[1;45;37mTexte blanc en gras sur fond indigo<ESC>[0m
```
````

---

## 7. Mentions et modèles

Une mention repose sur un identifiant numérique, que l'appli ne peut pas connaître. Les boutons dédiés insèrent donc un **modèle** que l'utilisateur complète directement dans Discord. L'interface affiche un avertissement discret tant qu'un modèle reste présent dans le message.

*Convention* : modèles insérés par les boutons.

| Bouton | Modèle inséré | Syntaxe Discord finale | Statut de la syntaxe |
|---|---|---|---|
| Mention d'utilisateur | `<@ID_UTILISATEUR>` | `<@123456789012345678>` | Documenté |
| Mention de rôle | `<@&ID_ROLE>` | `<@&123456789012345678>` | Documenté |
| Lien vers un salon | `<#ID_SALON>` | `<#123456789012345678>` | Testé (I2, pour le salon) |

L'avertissement se déclenche dès que le texte contient `ID_UTILISATEUR`, `ID_ROLE` ou `ID_SALON`, et disparaît quand plus aucun ne subsiste.

Pour obtenir un identifiant dans Discord : Paramètres utilisateur > Avancés > activer le « Mode développeur », puis clic droit > Copier l'identifiant. L'utilisateur peut aussi, dans Discord, mentionner le salon directement à la place du modèle.

| Point | Statut |
|---|---|
| Les trois modèles restent du texte brut tant qu'ils ne sont pas complétés | Testé (I1) |
| Une mention est interprétée en dehors d'un bloc ou d'une ligne de code, et reste en texte brut (identifiant visible) dans un bloc ou une ligne de code | Testé (I2) |
| `\<@&123>` reste littéral (antislash devant `<`) | Testé (C15) |
| `@everyone` et `@here` sont du texte simple (sans identifiant) | Documenté |
| `<#ID>` appliqué à une **catégorie** : **ne fonctionne pas** (non utilisé) | Testé |
| Mention dans un titre, une puce, une citation ou un spoiler : elle fonctionne. Dans un spoiler, elle reste active (la personne est mentionnée) alors que le texte est caché | Testé |
| Gras, italique et autres styles appliqués à une mention : aucun effet | Testé |
| Mention dans un sous-texte (`-#`) | À tester |

### Syntaxes Discord hors périmètre de l'appli
Si elles sont collées dans un message, elles sont conservées en texte brut.

| Syntaxe | Effet | Statut |
|---|---|---|
| `<:nom:ID>` / `<a:nom:ID>` | Émoji personnalisé statique / animé | Documenté |
| `</commande:ID>` | Commande slash cliquable | Documenté |
| `<id:customize>`, `<id:browse>`, `<id:guide>`, `<id:home>` | Liens de navigation de serveur | Documenté |

---

## 8. Horodatages

Un horodatage affiche une date ou une heure adaptée au fuseau horaire et à la langue de chaque lecteur.

Format : `<t:TIMESTAMP:STYLE>`, où `TIMESTAMP` est un **nombre de secondes** depuis le 1er janvier 1970 UTC. Exemple : `1735689600` = 1er janvier 2025 à 00h00 UTC.

L'appli convertit la date et l'heure choisies dans le calendrier en timestamp, et insère le style choisi.

| Lettre | Style | Exemple (affichage français) | Statut |
|---|---|---|---|
| *(aucune)* | Identique à `f` | 1 janvier 2025 01:00 | Testé (H1) |
| `t` | Heure courte | 01:00 | Testé (H1) |
| `T` | Heure avec secondes | 01:00:00 | Testé (H1) |
| `d` | Date courte | 01/01/2025 | Testé (H1) |
| `D` | Date longue | 1 janvier 2025 | Testé (H1) |
| `f` | Date longue + heure courte | 1 janvier 2025 01:00 | Testé (H1) |
| `F` | Date complète avec jour + heure | mercredi 1 janvier 2025 01:00 | Testé (H1) |
| `s` | Date courte + heure courte | 01/01/2025, 01:00 | Testé (H1) |
| `S` | Date courte + heure avec secondes | 01/01/2025, 01:00:00 | Testé (H1) |
| `R` | Temps relatif | dans 2 mois / il y a 5 minutes | Testé (H1) |

Les lettres sont sensibles à la casse (`t` et `T` sont différents).

| Point | Statut |
|---|---|
| Un timestamp en **millisecondes** n'est pas rejeté : il est lu comme des secondes et affiche une date absurde (ex. « 25 octobre 56971 »). **L'appli doit toujours écrire des secondes** | Testé (H2) |
| Un horodatage dans un bloc ou une ligne de code reste en texte brut | Testé (D6, D7, D8) |
| Un horodatage dans un titre, un sous-texte, une liste, une citation ou un spoiler est interprété | Testé (D1 à D5) |

---

## 9. Émojis

- L'appli n'utilise que des **émojis standards**, insérés sous forme de **caractère Unicode** (pas de code `:nom:`). Statut : Convention.
- **Comptage** : Discord compte les caractères en **unités UTF-16** (équivalent de la « longueur » d'une chaîne en JavaScript) :

| Émoji | Valeur constatée | Statut |
|---|---|---|
| 😀 (émoji simple) | **2** caractères | Testé (K3, K4) |
| 🇫🇷 (drapeau) | **4** caractères | Testé (K5, K6) |
| 👍🏽 (pouce avec teinte de peau) | **4** caractères | Testé (K7, K8) |

Une valeur de 3 caractères par émoji, notée plus tôt, était erronée.

*Convention* : le compteur de l'appli utilise la longueur UTF-16 du texte final (même principe que Discord).
- Gras, italique, souligné et barré n'ont aucun effet visible sur un émoji (voir section 1).

### Conversions automatiques faites par Discord à l'envoi

| Point | Statut |
|---|---|
| Un code `:nom:` (ex. `:star:`) est converti en émoji (⭐) | Testé (X2) |
| **L'émoticône `:*` est convertie en émoji 😗.** Conséquence : un italique qui se termine par « : » (`*texte :*`) est cassé, le `*` de fermeture est avalé | Testé (X4) |
| Autres émoticônes converties (`:)`, `:(`, `:D`, `:P`, `;)`, `<3`…) : lesquelles ? | À tester |
| Cette conversion dépend-elle d'une option de Discord (« convertir automatiquement les émoticônes », paramètres Texte et images) ? | À tester |
| La conversion a-t-elle lieu aussi quand le texte est **collé** (et non tapé) ? | À tester |

*Convention* (décidée par l'auteur le 13/11/2026) : quand l'appli écrit un `*` d'italique juste après un « : », elle insère entre les deux l'espace de largeur nulle `U+200B` (`*texte :<U+200B>*`), pour que `:*` ne soit pas converti. Forme non encore testée dans Discord. Le gras après « : » n'a pas ce problème : `**Note :**` s'affiche correctement (A35), rien n'est inséré.

---

## 10. Matrice de compatibilité

Légende : ✓ permis, ✗ impossible, ? à tester. Les cases sont **testées** (D1 à D9, I2, mentions, E1 à E13). Les styles sur une mention n'ont aucun effet visible (section 1). Le sous-texte n'a pas été testé avec une mention.

| Contenant | Gras, italique, souligné, barré | Spoiler | Horodatage | Lien | Mention | Couleur ANSI |
|---|---|---|---|---|---|---|
| Texte normal | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Titre (`#`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Sous-texte (`-#`) | ✓ | ✓ | ✓ | ✓ | ? | ✗ |
| Liste | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Citation (`>`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Spoiler (`\|\|`) | ✓ | — | ✓ | ✓ | ✓ | ✗ |
| Code en ligne | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Bloc de code avec langage | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Bloc `ansi` | ✗ (sauf gras, souligné et italique ANSI ; barré ANSI à confirmer) | ✗ | ✗ | ✗ | ✗ | ✓ |

### Imbrications de contenants

| Imbrication | Résultat | Statut |
|---|---|---|
| Bloc de code dans une citation | ✓ | Testé (D10) |
| Liste dans une citation | ✓ | Testé (D11) |
| Titre dans une citation | ✓ | Testé (D12) |
| Bloc de code dans une puce | ✓ | Testé (D13) |
| Citation dans une puce | ✓ (mobile : puce absente devant la citation, lisible) | Testé (D14) |
| **Titre dans une puce** | **✗** | Testé (D14) |
| Titre, liste ou citation dans un spoiler | ? | À tester |
| Spoiler autour d'un bloc de code (y compris `ansi`) : tout le bloc est caché | ✓ | Testé (X2) |
| Sous-texte dans une puce | ✓ | Testé (X6) |
| Barré autour d'une citation ou de puces | ✓ | Testé (X1, X7) |
| Styles de texte autour d'un code en ligne ou d'un bloc de code (§5, « entité unique ») | ✓ | Généralisé (A14, A15, X2, X8) |
| Code en ligne dans un titre, un sous-texte, une puce ou une citation | ✓ | Généralisé |
| Bloc de code dans un titre ou un sous-texte | ✗ | Généralisé |

---

## 11. Échappement

Quand un texte ordinaire contient un symbole que Discord interpréterait, l'appli le fait précéder d'un antislash.

**Principe constaté** : un symbole sans partenaire, ou entouré d'espaces, reste littéral. Il n'y a donc **pas besoin d'échapper** un symbole isolé. En revanche, dès qu'il pourrait ouvrir ou fermer une mise en forme avec un partenaire, il faut l'échapper.

| Symbole | Cas constaté | Échapper ? | Statut |
|---|---|---|---|
| `*` | `2 * 3 * 4` reste littéral (espaces des deux côtés) | non | Testé (C1) |
| `*` | `a*b*c` met b en italique | **oui** | Testé (C3) |
| `*` | `2 \* 3 \* 4` s'affiche « 2 * 3 * 4 » | (forme échappée correcte) | Testé (C2) |
| `_` | `a_b_c` reste littéral (dans un mot) | non | Testé (C4, B1) |
| `_` | `__init__.py` : « init » souligné ; `a\_b\_c` s'affiche « a_b_c » | **oui** aux frontières de mots | Testé (B2, C5) |
| `~` | `a ~ b ~ c` reste littéral | non | Testé (C6) |
| `~~` | `a ~~ b` (sans fermeture) reste littéral | non, sauf si une paire est possible | Testé (C7) |
| `\|` | `a \| b \| c` reste littéral | non | Testé (C8) |
| `\|\|` | `a \|\| b` (sans fermeture) reste littéral | non, sauf si une paire est possible | Testé (C9) |
| `` ` `` | accent grave seul reste littéral | non, sauf si une paire est possible | Testé (C10) |
| `#` | `#sans-espace` reste littéral ; `\# pas un titre` s'affiche en texte | **oui** si suivi d'un espace en début de ligne | Testé (C11) |
| `-` | `-sans espace` reste littéral ; `\- pas une puce` et `\-# ...` s'affichent en texte | **oui** si suivi d'un espace (ou `-#`) en début de ligne | Testé (C12) |
| `1.` | `1.sans espace` reste littéral ; `1\. pas une liste` s'affiche en texte ; **`2020. une année` devient une liste** | **oui** : tout nombre suivi de `. ` en début de ligne | Testé (C13) |
| `>` | `>sans espace` reste littéral ; `\> pas une citation` s'affiche en texte | **oui** si suivi d'un espace en début de ligne | Testé (C14) |
| `<` | `a < b > c` et `<texte>` restent littéraux ; `\<@&123>` reste littéral | non, sauf motif de mention, d'émoji ou d'horodatage | Testé (C15) |
| `[` | `[a](url)` devient un lien ; `\[a](url)` reste littéral | **oui** pour un crochet suivi d'une parenthèse (version future) | Testé (C16) |
| `\` | `\a` s'affiche tel quel avec l'antislash ; `\\` s'affiche `\` ; `\_` s'affiche `_` | **oui** : un antislash littéral est toujours écrit `\\` | Testé (C17) |
| `\` + autre symbole | `\! \: \é \( \)` s'affiche « ! : é ( ) » : l'antislash disparaît | (lecture) | Testé (C19) |
| `\` + n'importe quel caractère autre qu'une lettre non accentuée, un chiffre ou un espace | l'antislash disparaît (généralisation de C17 et C19) | (lecture) | Documenté |
| `\|\|\|\|` | `a \|\|\|\| b` reste littéral (pas de spoiler vide) | non, sauf si une paire est possible | Testé (C20) |

Dans un bloc de code, rien n'est échappé.

| Point | Statut |
|---|---|
| Un symbole peut former une paire avec un autre situé sur une autre ligne du même message | **Oui** : Testé (A17, C18) |
| Un astérisque en début de ligne, suivi d'un espace, est une puce : il est donc échappé | Testé (A29) |

*Convention* : puisque les paires se forment entre lignes, l'appli échappe tout symbole qui pourrait former une paire **n'importe où dans le message**, quitte à échapper un peu trop.

---

## 12. Limites

| Point | Statut |
|---|---|
| Limite d'un message : 2000 caractères (4000 avec Nitro). Choix par bouton dans l'appli, voir `SPEC.md` | Documenté |
| Un message de 2000 caractères est accepté (K1) ; **2001 est refusé**, sans conversion automatique en fichier (K2) | Testé |
| Le comptage se fait en **unités UTF-16** (voir section 9) | Testé (K3 à K8) |
| `<ESC>` compte pour **1** caractère (K9 : 1999 + 1 = accepté ; K10 : 2000 + 1 = refusé). Un code ANSI complet comme `<ESC>[1;31m` compte donc pour 7 caractères | Testé |
| Les balises (`**`, ```` ``` ````, etc.) sont comptées comme du texte ordinaire | Documenté |
| Le caractère invisible `U+200B` compte pour 1 caractère | Documenté (UTF-16) |

---

## 13. Astuces et caractères spéciaux

| Astuce | Détail | Statut |
|---|---|---|
| Ligne vide visible | `_ _` (tiret bas, espace, tiret bas) sur une ligne seule | Testé (J1, J3) |
| Message composé uniquement de `_ _` ou de `** **` | Accepté par Discord | Testé (J3, J4) |
| **Lignes vides ordinaires** | **Conservées** : trois lignes vides consécutives apparaissent toutes. `_ _` n'est donc pas nécessaire pour sauter des lignes au milieu d'un message | Testé (J2) |
| Ligne vide au **début** d'un message | Non affichée | Testé (X10) |
| Lignes vides à la fin d'un message | Peut-être supprimées | À tester |
| Caractère Braille vide `⠀` (U+2800) | Donne une ligne vide visible entre deux lignes (Z5) ; un message composé uniquement de ce caractère est accepté (Z6) | Testé |
| Ligne horizontale | Non supportée (`---` ne fonctionne pas). On utilise des caractères Unicode : `▬▬▬▬▬▬▬▬` ou `────────` | Documenté |

---

## 14. Points restant à tester

1. **Confirmer E13** : le code `9` (barré) et les couleurs `91` et `38;5;196` sont-ils réellement appliqués sur ordinateur (couleur ou barré visible), ou simplement ignorés ?
2. ~~Italique `_` collé à une lettre d'un seul côté ; code en ligne sur deux lignes~~ : tranchés (A30, A32, A33). Gras après « : » tranché (A35, sans problème). Reste : la forme `*texte :<U+200B>*` s'affiche-t-elle bien en italique ?
3. Écrire une ligne vide dans une citation (`> _ _`, `> ` + caractère invisible `U+200B` ou Braille).
4. Lignes vides au début ou à la fin d'un message ; lignes vides au milieu d'un bloc de code.
5. Mention dans un sous-texte (`-#`) ; styles sur un horodatage.
6. Titre, liste ou citation dans un spoiler.
7. Une fois l'appli construite : le bouton « Copier » conserve-t-il le caractère `<ESC>` et les caractères invisibles `U+200B` ?
8. **Palette exacte des couleurs ANSI** : relever les couleurs réellement rendues par Discord (captures d'écran des tests E1 et E2, thème sombre et thème clair), pour que l'éditeur de gauche reproduise fidèlement le rendu. Les noms de teintes ci-dessus sont indicatifs.
9. **Émoticônes converties en émojis** (§9) : liste des émoticônes concernées, rôle de l'option de Discord, cas du texte collé.
10. ~~Italique ANSI (code `3`)~~ : tranché le 13/11/2026, l'italique est appliqué (E7 corrigé, §6).
11. Anomalie X7 : pourquoi une puce `- -# ` après des puces barrées n'affiche pas le sous-texte.