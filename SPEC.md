# SPEC.md — Discord Formatter

> Ce document décrit **ce que l'application doit faire** (le quoi), pas comment la coder (le comment).
> Les choix techniques sont laissés à Claude Code, sous les contraintes de la section 7.
> **Les règles de formatage Discord ne sont définies qu'à un seul endroit : `docs/discord-rules.md`.** Ce document n'y répète rien. En cas de doute sur une règle, demander : ne rien inventer.

---

## 1. Objectif

Une application web qui permet de rédiger un message Discord avec un traitement de texte visuel (gras, couleurs, etc.) et d'obtenir automatiquement le texte formaté prêt à être collé dans Discord. Et inversement : coller un message Discord formaté et le voir s'afficher visuellement.

## 2. Utilisateur cible

Une personne non technique qui rédige régulièrement des messages Discord longs ou élaborés (annonces, règlements, présentations de serveur) et veut les composer visuellement plutôt qu'à coups de symboles.

## 3. Vue d'ensemble de l'interface

Deux panneaux côte à côte :

| Panneau gauche | Panneau droit |
|---|---|
| **Éditeur visuel** (traitement de texte) avec barre d'outils | **Message Discord** : le texte brut formaté, tel qu'il sera collé dans Discord |

- Écrire ou modifier à gauche met à jour la droite immédiatement.
- Écrire, coller ou modifier à droite met à jour la gauche immédiatement.
- Un bouton « Copier » sur le panneau droit copie le texte formaté dans le presse-papiers.
- Le panneau droit affiche le texte brut (pas un aperçu stylé) : c'est ce qui est collé dans Discord.
- Un **compteur de caractères** est visible en permanence et porte sur le texte du panneau droit (ce que Discord comptera réellement).
- Un **bouton à deux positions (2000 / 4000)** permet de choisir la limite selon l'abonnement Nitro de l'utilisateur.
- Une **barre de progression** montre le nombre de caractères restants. Elle change d'aspect en cas de dépassement.
- **L'écriture reste libre** : l'appli ne bloque, ne tronque et ne coupe jamais le texte, même au-delà de la limite. Au-delà, les messages découpés s'affichent à part, sous le panneau droit (S25, S26), sans toucher au texte.

## 4. Fonctionnalités à supporter

La **syntaxe exacte, les combinaisons autorisées et les incompatibilités** de chaque format sont définies dans `docs/discord-rules.md`. Ci-dessous, uniquement ce que l'interface doit proposer.

**Mise en forme du texte** : gras, italique, souligné, barré, spoiler, code en ligne.

**Structure** : titres, sous-texte, citation simple, sur une ou plusieurs lignes, sans imbrication (Discord ne supporte pas les citations imbriquées), listes à puces et numérotées, **listes à plusieurs niveaux** (limites précises dans `docs/discord-rules.md`).

**Blocs de code** : Un champ texte (vide par défaut) permet de spécifier le langage. Si le langage est vide et qu'une couleur est ajouté, le bloc est converti en bloc ANSI. Si un langage est spécifié, il n'est pas possible de colorer le texte. Dans l'éditeur de gauche, un bloc avec un langage est affiché avec la **coloration syntaxique** de ce langage, comme Discord (Highlight.js) ; le texte envoyé à Discord n'en est pas modifié (ajouté le 14/11/2026, étape 12b).

**Couleurs ANSI** : couleur du texte, couleur de fond, et styles autorisés dans ce mode. L'appli doit produire un texte qui se colle correctement dans Discord (voir la note sur le caractère invisible dans `docs/discord-rules.md`).

**Éléments Discord dédiés** : des **boutons dédiés** pour insérer des mentions, des émojis et des horodatages.
- **Mentions d'utilisateur, de rôle et de salon** : le bouton insère un **modèle** (sans identifiant réel). L'utilisateur le complète directement dans Discord. Le modèle peut aussi s'insérer en tapant « @ » ou « # » dans l'éditeur visuel, puis en choisissant parmi les propositions. Quand un tel modèle est présent dans le message, l'interface affiche un **avertissement discret** rappelant qu'il faut le compléter sur Discord.
- **Émojis** : émojis **standards uniquement** (pas d'émojis personnalisés de serveur), choisis via un sélecteur.
- **Horodatages** : l'utilisateur choisit la date et l'heure **via un calendrier**, puis le **style d'affichage** parmi ceux proposés par Discord (voir `docs/discord-rules.md`). L'appli insère l'horodatage correspondant. Un horodatage déjà inséré peut être modifié en le cliquant dans l'éditeur visuel.

**Compatibilité** : la barre d'outils **grise** les options impossibles dans le contexte courant (selon `docs/discord-rules.md`). L'utilisateur ne peut jamais construire un message que Discord rendrait de travers.

## 5. Gestion des règles

- `docs/discord-rules.md` est la **seule source de vérité** sur le rendu Discord. Il est rempli à partir de **tests réels** dans un serveur Discord, pas de suppositions.
- Si l'appli et ce fichier se contredisent, c'est le fichier qui a raison.
- Toute règle découverte ou corrigée en cours de projet est ajoutée à ce fichier **avant** d'être codée.

## 6. Comportements attendus (scénarios)

Chaque scénario est un critère de réussite. Les résultats exacts dépendent de `docs/discord-rules.md`.

### De gauche à droite
- **S1** — J'écris « bonjour » et je le mets en gras → à droite : le texte avec la syntaxe gras de Discord.
- **S2** — Je cumule plusieurs styles sur un mot (ex. gras + italique) → à droite : la combinaison correcte.
- **S3** — Je crée un bloc de code, je choisis un langage dans la liste filtrable et j'écris dedans → à droite : le bloc avec le bon langage.
- **S4** — Je crée un bloc en mode ANSI et je colore un mot → à droite : le bloc ANSI avec les codes couleur corrects, correctement refermés.
- **S5** — Je crée une liste à puces à plusieurs niveaux → à droite : l'indentation correcte.
- **S6** — Le curseur est dans un bloc de code classique → les options incompatibles sont grisées.
- **S7** — Le curseur est dans un bloc ANSI → seules les options ANSI sont actives.
- **S8** — J'insère une mention d'utilisateur, de rôle ou de salon avec le bouton dédié → à droite : le modèle correspondant, et un avertissement discret indique qu'il faut le compléter sur Discord. L'avertissement disparaît quand il n'y a plus de modèle à compléter. Dans l'éditeur visuel, taper « @ » propose « Utilisateur » ou « Rôle », et taper « # » propose « Salon » ; choisir une proposition insère le modèle. La touche Espace ferme les propositions sans ajouter d'espace, et l'écriture reprend normalement.
- **S8b** — J'insère un émoji standard avec le sélecteur → il apparaît dans le message, à gauche comme à droite.
- **S8c** — J'insère un horodatage : je choisis une date et une heure dans le calendrier, puis un style → à droite : l'horodatage Discord correspondant ; à gauche, un aperçu lisible de la date dans le style choisi. Un clic sur l'horodatage, à gauche, rouvre le calendrier pour changer sa date, son heure ou son style.
- **S9** — Je tape du texte → le compteur et la barre de progression se mettent à jour selon la limite choisie.
- **S9b** — Je bascule la limite de 2000 à 4000 (et inversement) → la barre de progression se recalcule, le texte n'est pas modifié.
- **S9c** — Je dépasse la limite → je peux continuer à écrire librement ; la barre signale le dépassement, rien n'est coupé.

### De droite à gauche
- **S10** — Je colle un message avec du markdown simple → à gauche : le rendu visuel correspondant.
- **S11** — Je colle un message Discord contenant un bloc ANSI coloré → à gauche : les couleurs s'affichent comme dans Discord.
- **S12** — Je colle un message avec une syntaxe non reconnue → elle reste en texte brut, **rien n'est perdu ni supprimé**.
- **S13** — Je tape directement à droite → la gauche se met à jour sans perdre la position du curseur ni provoquer de boucle.

### Fidélité
- **S14** — Aller-retour : un texte écrit à gauche, copié à droite, puis recollé à droite donne **exactement le même résultat visuel** à gauche.
- **S15** — Les messages de référence du dossier `examples/` (messages Discord réels fournis par moi, avec le rendu attendu) sont tous traités correctement.

### Liens masqués (étape 14)
- **S16** — Je sélectionne du texte, je clique « Lien », je saisis une adresse (et je coche éventuellement « sans aperçu ») → à droite : `[texte](adresse)` ou `[texte](<adresse>)` ; à gauche : le texte s'affiche comme un lien. Sans sélection, la fenêtre demande aussi le texte. Une adresse dont le début n'est pas permis (`docs/discord-rules.md` §4) est refusée avec un message ; un espace dans l'adresse est écrit `%20`.
- **S17** — Je survole un lien à gauche → une bulle affiche son adresse, avec « Modifier » (adresse, case « sans aperçu », retirer le lien) et « Ouvrir » (dans un nouvel onglet). Le texte du lien se modifie directement dans l'éditeur, avec ses styles. Un émoji, une mention ou un `[` seul placé dans le texte d'un lien en sort : il reste à sa place, non cliquable, et le lien est coupé en deux morceaux de même adresse.
- **S18** — Je colle à droite un `[texte](adresse)` → à gauche : le lien, modifiable. Une forme de lien non reconnue reste en texte brut (S12).
- **S19** — Le curseur est dans du code en ligne ou un bloc de code → le bouton « Lien » est grisé.

### Découpage en plusieurs messages (étape 15a : cœur ; affichage à l'étape 15b)
- **S20** — Mon texte dépasse la limite choisie (2000 ou 4000) → il est découpé en plusieurs messages, chacun sous la limite, **balises ajoutées comprises**. La coupe est la plus naturelle possible : entre blocs, puis entre lignes, puis entre phrases, puis entre mots.
- **S21** — Un style, un spoiler, une citation, un bloc de code ou un passage ANSI à cheval sur une coupe est refermé à la fin du message et rouvert au début du suivant (un bloc garde son langage). Chaque message s'affiche correctement seul, sans ligne vide au début ni à la fin.
- **S22** — Une liste numérotée coupée continue sa numérotation dans le message suivant (il commence par exemple par `3.`).
- **S23** — Un élément plus long que la limite à lui seul est coupé quand même : un mot ou une ligne de code au caractère près, sans jamais couper un émoji en deux ; un bloc de code trop long entre deux lignes si possible ; un lien en deux liens de même adresse. Un lien dont l'adresse seule dépasse la limite devient du texte simple.
- **S24** — Les messages relus et mis bout à bout redonnent mon texte d'origine : **rien n'est perdu**.

### Découpage dans l'interface (étape 15b)
- **S25** — Dès que mon texte dépasse la limite choisie, un cadre par message apparaît sous le panneau de droite, l'un en dessous de l'autre, dans l'ordre d'envoi (N messages → N cadres). Le texte de droite n'est jamais modifié. Si je continue d'écrire ou si je change de limite, les cadres se mettent à jour ; repassé sous la limite, ils disparaissent.
- **S26** — Chaque cadre affiche son numéro, son propre compteur et son bouton « Copier ». Un message copié reste marqué « Copié » jusqu'à la prochaine modification du texte (ou de la limite) ; un nouveau clic le copie à nouveau. Un message qui contient un modèle de mention à compléter (S8) porte l'avertissement dans son propre cadre.

### Brouillon (étape 16)
- **S27** — J'écris (à gauche ou à droite), je ferme la page puis je la rouvre → je retrouve mon texte, à droite exactement tel qu'il était (syntaxe non reconnue et caractères invisibles compris), à gauche son rendu visuel. Un seul brouillon, enregistré automatiquement peu après chaque modification et à la fermeture de la page, **dans le navigateur seulement**.
- **S28** — Une petite mention près du compteur indique que le brouillon est enregistré. Pour commencer un autre texte, j'efface le texte : le brouillon devient vide.
- **S29** — Je choisis la limite 4000, je ferme et je rouvre la page → la limite est toujours 4000.
- **S30** — Le navigateur refuse la sauvegarde (mémoire bloquée ou pleine) ou le brouillon est illisible → l'appli fonctionne normalement, en partant d'un texte vide, sans message d'erreur.

### Aperçu façon Discord (étape 17)
- **S31** — Sous les deux panneaux, sur toute leur largeur, un aperçu montre mon message comme Discord l'affichera sur ordinateur (thème sombre) : une ligne avec un rond coloré, le nom « Vous » et l'heure, puis le contenu mis en forme (styles, titres, sous-texte, listes, citations, blocs de code colorés, couleurs ANSI, liens, mentions, émojis, horodatages). Il est en lecture seule et se met à jour pendant que j'écris, à gauche comme à droite. Les panneaux sont un peu moins hauts que l'écran : on lit le début de l'aperçu sans rien faire, et on fait défiler la page pour le voir en entier. Un bouton le masque ou le réaffiche ; masqué, les panneaux reprennent toute la hauteur.
- **S32** — L'aperçu est un affichage : il ne modifie jamais le document, le texte de droite, le compteur ni le brouillon.
- **S33** — Un spoiler est caché dans l'aperçu ; un clic le révèle, comme dans Discord. Un lien s'ouvre dans un nouvel onglet. Une mention s'affiche en pastille avec son modèle (« @ID_USER ») ou son identifiant. Une syntaxe non reconnue s'affiche telle quelle, en texte simple.
- **S34** — Mon texte dépasse la limite choisie → l'aperçu montre les messages découpés (S25) l'un sous l'autre, comme envoyés à la suite dans Discord, avec le nom et l'heure sur le premier seulement.
- **S35** — Mon texte dépasse la limite → les cadres des messages découpés (S25) sont réduits à leur en-tête (numéro, compteur, « Copier », avertissement éventuel). Un clic sur l'en-tête d'un message le déroule et réduit le message complet (seuls son en-tête et le compteur restent) ; les autres messages restent réduits en dessous. Un clic sur l'en-tête du message complet le déroule à nouveau et réduit les messages découpés. Un seul message est déroulé à la fois.

### Interface en anglais (étape 18)
- **S36** — Un bouton « FR | EN » dans l'en-tête change la langue de toute l'interface d'un clic : barre d'outils, bulles d'aide, fenêtres, propositions @ #, avertissements, compteur, messages découpés, aperçu, mention « brouillon enregistré ». Mon texte, ma limite, le brouillon et l'aperçu ne sont pas touchés ; il ne reste aucun texte de l'autre langue.
- **S37** — Au tout premier lancement, l'interface est en français si mon navigateur est en français, en anglais sinon. Mon choix de langue est ensuite gardé dans le navigateur, d'une ouverture à l'autre (comme la limite, S29).
- **S38** — Le texte de droite est exactement le même dans les deux langues. Les modèles de mention sont en anglais dans les deux langues (`<@ID_USER>`, `<@&ID_ROLE>`, `<#ID_CHANNEL>`) ; un texte qui contient encore les anciens modèles (`ID_UTILISATEUR`, `ID_SALON`) les garde tels quels, avec l'avertissement. Les horodatages, à gauche et dans l'aperçu, s'affichent dans la langue de l'interface, comme Discord les affiche dans la langue de chaque lecteur ; les nombres du compteur aussi.
- **S39** — Le sélecteur d'émojis trouve un émoji par son nom en français comme en anglais, quelle que soit la langue ; il affiche les noms dans la langue de l'interface. Le lien « Guide » de l'en-tête ouvre le guide dans la langue choisie ; chaque guide propose un lien vers l'autre langue.

### Mise en ligne (étape 19)
- **S40** — J'ouvre l'adresse publique `https://penjimus.github.io/discord-formatter/` : l'appli fonctionne comme en local (écriture des deux côtés, barre d'outils, émojis, coloration des blocs, compteur, découpage, aperçu, copie), et le lien « Guide » ouvre le guide dans la langue choisie, qui ramène à l'appli.
- **S41** — Sur le site, mon brouillon, ma limite et ma langue sont gardés dans **mon** navigateur, d'une ouverture à l'autre ; ils ne sont envoyés nulle part et aucun autre visiteur ne les voit. Ce que j'ai écrit dans l'appli lancée en local n'apparaît pas sur le site (deux adresses, deux mémoires séparées).
- **S42** — Quand j'envoie une nouvelle version sur GitHub, le site se met à jour tout seul en quelques minutes, seulement si tous les tests passent ; sinon l'ancienne version reste en ligne.
- **S43** — La page du dépôt sur GitHub présente l'appli en français et en anglais (ce qu'elle fait, lien vers le site, rien n'est envoyé ailleurs) et indique sa licence.

## 7. Contraintes techniques

Exprimées en langage simple. Le choix précis des technologies est laissé à Claude Code, qui doit **proposer 2-3 options avec leurs compromis et une recommandation, puis attendre ma décision**.

- Application qui tourne **dans le navigateur uniquement** : pas de serveur, pas de compte, pas de base de données. Les messages ne quittent jamais l'ordinateur de l'utilisateur.
- Technologies **courantes et bien documentées**, pas de choix exotiques.
- Lancement local avec **une seule commande**.
- Mise en ligne gratuite possible plus tard (GitHub Pages, Netlify, etc.).
- **Une seule structure de données interne** (le « document ») est la source de vérité. Les deux panneaux en sont deux vues : le panneau gauche l'affiche visuellement, le panneau droit le convertit en texte Discord. Aucune conversion directe gauche ↔ droite.
- Le cœur du formatage (lire un texte Discord, produire un texte Discord, vérifier la validité) est **indépendant de l'interface** et couvert par des tests automatiques tirés de `docs/discord-rules.md`.
- Le modèle de document doit **permettre le découpage futur en plusieurs messages** (section 9) sans être refait.
- Interface en **français et en anglais**, au choix (étape 18, S36 à S39). Le texte produit pour Discord ne dépend pas de la langue.
- Utilisable sur ordinateur en priorité ; le mobile n'est pas un objectif de la première version.

## 8. Critères d'acceptation globaux

Une étape n'est terminée que si :
1. Les tests automatiques passent, y compris ceux des étapes précédentes.
2. Claude m'indique **précisément quoi essayer dans l'appli** pour constater le résultat, et ça fonctionne.
3. Aucune fonctionnalité hors de ce document n'a été ajoutée.
4. Tout ce que Claude a décidé seul est signalé dans un compte rendu en français simple.

## 9. Deuxième version et hors périmètre

### Prévu pour la deuxième version (`ROADMAP.md`, partie 3)

Ces fonctions entrent dans le périmètre, **une étape à la fois**, dans l'ordre de la ROADMAP. Leurs scénarios (S16, S17…) sont ajoutés en §6 au début de chaque étape.

- **Liens masqués** `[texte](url)`.
- **Découpage en plusieurs messages** quand le texte dépasse la limite choisie (2000 ou 4000) : proposer une coupe cohérente (entre blocs, paragraphes, puis phrases), et **refermer puis rouvrir les balises** (gras, bloc de code, ANSI, citation, etc.) qui se trouveraient à cheval sur une coupure, pour que chaque message soit bien formaté, utilisable seul et sous la limite, balises ajoutées comprises.
- **Sauvegarde de brouillons**, dans le navigateur seulement.
- **Aperçu « façon Discord »** (thème sombre, etc.).

### Prévu ensuite (`ROADMAP.md`, partie 4)

Même fonctionnement : une étape à la fois, scénarios ajoutés en §6 au début de chaque étape.

- **Interface en anglais**, le français restant disponible (étape 18). Le texte produit pour Discord ne dépend pas de la langue de l'interface.
- **Mise en ligne sur GitHub Pages** (étape 19), après que j'aurai rendu le dépôt public.

### Hors périmètre

À ne **pas** implémenter, mais à ne pas rendre impossible :

- Émojis personnalisés de serveur (si collés dans le texte, ils sont conservés tels quels, comme toute syntaxe non reconnue).
- Comptes, partage en ligne.
- Version mobile.
- Envoi direct vers Discord (webhooks, bots).

## 10. Décisions prises et points ouverts

### Décidé
| Sujet | Décision |
|---|---|
| Liens masqués | Étape 14 : bouton « Lien », bulle au survol (adresse, Modifier, Ouvrir), case « sans aperçu », protocoles permis selon `docs/discord-rules.md` §4 |
| Mentions (utilisateur, rôle, salon) | Bouton insérant un modèle, complété sur Discord ; avertissement discret dans l'interface |
| Émojis | Standards uniquement |
| Horodatages | Calendrier + choix du style d'affichage |
| Langage des blocs de code | Liste filtrable ; le mode ANSI en fait partie |
| Citations | Sur une ou plusieurs lignes, sans imbrication |
| Listes | Plusieurs niveaux (limites dans `docs/discord-rules.md`) |
| Compteur de caractères | Dès la première version ; un compteur par message découpé (étape 15b) |
| Limite de caractères | Bouton 2000 / 4000 choisi par l'utilisateur |
| Dépassement | Écriture libre, barre de progression ; messages découpés affichés en cadres sous le panneau droit (étape 15b) |
| Brouillon | Étape 16 : un seul, enregistré automatiquement dans le navigateur (texte de droite et limite) ; plusieurs brouillons nommés : évolution possible plus tard |
| Aperçu façon Discord | Étape 17 : sous les deux panneaux, sur toute la largeur, la page défile ; « Vous », rond coloré et heure ; messages découpés l'un sous l'autre ; bouton pour le masquer |

### À préciser
Aucun point ouvert pour l'instant.

## 11. Fichiers de référence du projet

| Fichier | Rôle |
|---|---|
| `SPEC.md` | Ce document : ce que l'appli doit faire |
| `docs/discord-rules.md` | **Seule source** des règles de formatage Discord, vérifiées par test réel |
| `CLAUDE.md` | Règles de conduite et choix techniques pour Claude Code |
| `ROADMAP.md` | Étapes et avancement |
| `examples/` | Messages Discord réels et rendus attendus |