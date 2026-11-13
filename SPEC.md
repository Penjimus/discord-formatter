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
- **L'écriture reste libre** : l'appli ne bloque, ne tronque et ne coupe jamais le texte, même au-delà de la limite. Le découpage automatique est prévu pour une version future (section 9).

## 4. Fonctionnalités à supporter

La **syntaxe exacte, les combinaisons autorisées et les incompatibilités** de chaque format sont définies dans `docs/discord-rules.md`. Ci-dessous, uniquement ce que l'interface doit proposer.

**Mise en forme du texte** : gras, italique, souligné, barré, spoiler, code en ligne.

**Structure** : titres, sous-texte, citation simple, sur une ou plusieurs lignes, sans imbrication (Discord ne supporte pas les citations imbriquées), listes à puces et numérotées, **listes à plusieurs niveaux** (limites précises dans `docs/discord-rules.md`).

**Blocs de code** : Un champ texte (vide par défaut) permet de spécifier le langage. Si le langage est vide et qu'une couleur est ajouté, le bloc est converti en bloc ANSI. Si un langage est spécifié, il n'est pas possible de colorer le texte.

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

## 7. Contraintes techniques

Exprimées en langage simple. Le choix précis des technologies est laissé à Claude Code, qui doit **proposer 2-3 options avec leurs compromis et une recommandation, puis attendre ma décision**.

- Application qui tourne **dans le navigateur uniquement** : pas de serveur, pas de compte, pas de base de données. Les messages ne quittent jamais l'ordinateur de l'utilisateur.
- Technologies **courantes et bien documentées**, pas de choix exotiques.
- Lancement local avec **une seule commande**.
- Mise en ligne gratuite possible plus tard (GitHub Pages, Netlify, etc.).
- **Une seule structure de données interne** (le « document ») est la source de vérité. Les deux panneaux en sont deux vues : le panneau gauche l'affiche visuellement, le panneau droit le convertit en texte Discord. Aucune conversion directe gauche ↔ droite.
- Le cœur du formatage (lire un texte Discord, produire un texte Discord, vérifier la validité) est **indépendant de l'interface** et couvert par des tests automatiques tirés de `docs/discord-rules.md`.
- Le modèle de document doit **permettre le découpage futur en plusieurs messages** (section 9) sans être refait.
- Interface en **français**.
- Utilisable sur ordinateur en priorité ; le mobile n'est pas un objectif de la première version.

## 8. Critères d'acceptation globaux

Une étape n'est terminée que si :
1. Les tests automatiques passent, y compris ceux des étapes précédentes.
2. Claude m'indique **précisément quoi essayer dans l'appli** pour constater le résultat, et ça fonctionne.
3. Aucune fonctionnalité hors de ce document n'a été ajoutée.
4. Tout ce que Claude a décidé seul est signalé dans un compte rendu en français simple.

## 9. Hors périmètre (première version)

À ne **pas** implémenter maintenant, mais à ne pas rendre impossible :

- **Découpage en plusieurs messages** quand le texte dépasse la limite choisie (2000 ou 4000). Futur comportement : proposer une coupe cohérente (entre blocs, paragraphes, puis phrases), et **refermer puis rouvrir les balises** (gras, bloc de code, ANSI, citation, etc.) qui se trouveraient à cheval sur une coupure, pour que chaque message soit bien formaté, utilisable seul et sous la limite, balises ajoutées comprises.
- **Liens masqués** `[texte](url)` : prévus pour une version future.
- Émojis personnalisés de serveur (si collés dans le texte, ils sont conservés tels quels, comme toute syntaxe non reconnue).
- Sauvegarde de brouillons, comptes, partage en ligne.
- Aperçu « fac-similé de Discord » (thème sombre, avatar, etc.).
- Version mobile.
- Envoi direct vers Discord (webhooks, bots).

## 10. Décisions prises et points ouverts

### Décidé
| Sujet | Décision |
|---|---|
| Liens masqués | Version future |
| Mentions (utilisateur, rôle, salon) | Bouton insérant un modèle, complété sur Discord ; avertissement discret dans l'interface |
| Émojis | Standards uniquement |
| Horodatages | Calendrier + choix du style d'affichage |
| Langage des blocs de code | Liste filtrable ; le mode ANSI en fait partie |
| Citations | Sur une ou plusieurs lignes, sans imbrication |
| Listes | Plusieurs niveaux (limites dans `docs/discord-rules.md`) |
| Compteur de caractères | Dès la première version, sans découpage |
| Limite de caractères | Bouton 2000 / 4000 choisi par l'utilisateur |
| Dépassement | Écriture libre, barre de progression ; découpage en version future |

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