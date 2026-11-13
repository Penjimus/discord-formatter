# CLAUDE.md : Discord Formatter

Application web : un éditeur visuel (gauche) et le texte Discord formaté (droite), synchronisés en permanence.

## Qui est l'utilisateur

Une personne **sans connaissance en développement web**. Elle connaît très bien Discord et valide le résultat en l'essayant, pas en lisant le code.

- Tu t'adresses à elle **en français, en langage simple**, sans jargon. Si un terme technique est inévitable, explique-le en une phrase.
- Tu l'aides à installer ce qui manque et tu lui dis exactement quelle commande lancer.
- Quand une décision technique est nécessaire, tu proposes **2 ou 3 options** avec avantages et inconvénients sans jargon, une recommandation, puis **tu attends sa réponse**.

## Fichiers de référence (à lire **par sections**, voir « Économie de contexte »)

| Fichier | Contenu | Autorité |
|---|---|---|
| `SPEC.md` | Ce que l'appli doit faire, scénarios S1 à S15, hors périmètre | Périmètre fonctionnel |
| `docs/discord-rules.md` | Règles de rendu Discord vérifiées par test réel, conventions de sortie | **Seule source** des règles de formatage |
| `docs/cahier-de-tests.md` | Les tests Discord réalisés par l'utilisateur (A1, D4, I3…) : message envoyé, attendu, observé | Preuve de chaque règle « Testé (ID) » ; source des cas de test automatiques |
| `ROADMAP.md` | Étapes et avancement | Où en est-on |
| `examples/` | Messages Discord réels et rendus attendus | Fixtures de test |

Si deux fichiers se contredisent : `docs/discord-rules.md` l'emporte pour le formatage, `SPEC.md` pour le périmètre. Signale la contradiction à l'utilisateur, ne la tranche pas seul.

## Règles de conduite (non négociables)

1. **N'ajoute aucune fonctionnalité qui n'est pas dans `SPEC.md`.** Ce qui est en « Hors périmètre » ne se code pas, mais ne doit pas être rendu impossible.
2. **N'invente jamais une règle Discord.** Une règle absente de `docs/discord-rules.md`, ou marquée « À tester » ou « Documenté », n'est pas une règle sûre : tu **demandes** à l'utilisateur, ou tu lui proposes un message de test à passer dans Discord. Une règle « Documenté » peut être codée en la signalant comme non vérifiée.
3. **Règle découverte ou corrigée = d'abord dans `docs/discord-rules.md`, ensuite dans le code.**
4. **Ne modifie jamais un test existant pour le faire passer.** Si un test te semble faux, explique pourquoi à l'utilisateur et attends sa décision.
5. **Une étape à la fois.** Une étape n'est terminée que si : les tests passent (y compris ceux des étapes précédentes), tu as dit à l'utilisateur **précisément quoi essayer dans l'appli** pour le constater, et il a validé.
6. **Pas d'amélioration non demandée** : pas de refactorisation large, pas de changement de technologie, pas de nouvelle dépendance sans en parler.
7. **Signale tout ce que tu as décidé seul**, même petit, dans le compte rendu de fin de session.
8. **En cas de doute, demande.** Une question courte coûte moins cher qu'un faux départ.

## Architecture

### Principe central
Une **structure de données unique** (le « document ») est la source de vérité. Les deux panneaux en sont des vues :

```
Panneau gauche  ◄─  Document  ─►  Panneau droit
(éditeur visuel)   (modèle)       (texte Discord)
        parse(texte) → Document      serialize(Document) → texte
```

**Aucune conversion directe gauche ↔ droite.** Tout passe par le document.

### Cœur du formatage (`core`, indépendant de l'interface)
- Fonctions pures, sans dépendance à l'interface ni au navigateur : `parse` (texte Discord → document), `serialize` (document → texte Discord), `validate` (le document respecte-t-il les règles ?), et plus tard `split` (découpage en messages).
- **Le modèle encode les contraintes** : un document invalide ne doit pas pouvoir se construire. La barre d'outils grise les options impossibles dans le contexte courant, d'après la matrice de `docs/discord-rules.md` (section 10).
- **Parseur tolérant** : toute syntaxe non reconnue est conservée en **texte brut**. Rien n'est jamais perdu ni supprimé (voir S12 du SPEC).
- **Aller-retour stable** : `serialize(parse(texte))` doit redonner un résultat équivalent, et un document écrit à gauche, sérialisé, puis relu, doit donner le même document (S14). C'est un test automatique obligatoire.
- **Prévoir le découpage** : le modèle doit permettre de couper sur la structure (blocs, paragraphes, phrases) et de refermer/rouvrir les balises à chaque frontière. Ne l'implémente pas maintenant, mais ne fais rien qui l'empêche.

### Synchronisation des deux panneaux
Une modification d'un côté met à jour le document, qui met à jour l'autre côté. **Évite les boucles** (un panneau qui réagit à sa propre mise à jour) et **ne perds pas la position du curseur** (S13).

### Points d'attention venus des tests Discord
Ces règles sont détaillées dans `docs/discord-rules.md` ; les erreurs ci-dessous sont les plus faciles à commettre :

- **Collisions de balises** : `**1***2*` est cassé. À chaque frontière, choisir `_` pour l'italique si c'est permis, sinon insérer un espace de largeur nulle `U+200B` (section 2.3).
- **Ordre des balises** (convention de sortie) : Spoiler > Barré > Souligné > Gras > Italique, du plus extérieur au plus intérieur.
- **Compteur de caractères** : longueur en **unités UTF-16** (équivalent de `string.length` en JavaScript), pas en caractères visibles. Une limite 2000/4000, choisie par l'utilisateur, **sans jamais bloquer l'écriture**.
- **Horodatages** : toujours en **secondes**, jamais en millisecondes.
- **ANSI** : seulement dans un bloc de langage `ansi` ; reset toujours `<ESC>[0m` (jamais `<ESC>[m`) ; ordre des codes : styles, fond, texte ; aucun italique.
- **Blocs de code** : rien n'y est interprété ; lignes vides de début et de fin supprimées ; trois accents graves dans le contenu → insérer `U+200B` après le premier.
- **Listes** : à un même niveau, tout prend le type du premier élément ; maximum 11 niveaux ; pas de titre dans une puce.
- **Citations** : uniquement `> ` sur chaque ligne ; jamais de `>>>` généré.
- **Échappement** : n'échapper que ce qui serait réellement interprété (section 11).

### Caractères invisibles dans le code source
L'appli manipule des caractères **invisibles** : `U+001B` (ESC, pour l'ANSI) et `U+200B` (espace de largeur nulle). Dans le code source et les tests, **écris-les toujours sous forme d'échappements** (`\u001b`, `​`), jamais comme caractères littéraux : un caractère invisible dans un fichier est impossible à relire, et certains outils le suppriment sans prévenir. Crée des constantes nommées (par exemple `ESC`, `ZERO_WIDTH_SPACE`).

## Technologies

**Choisies à l'étape 0 (option A).** Contraintes (détail dans `SPEC.md`, section 7) :

- application qui tourne **dans le navigateur uniquement** : pas de serveur, pas de compte, pas de base de données ;
- technologies **courantes et bien documentées**, pas de choix exotiques ;
- lancement local avec **une seule commande**, mise en ligne gratuite possible plus tard ;
- interface en **français** ;
- ordinateur d'abord (mobile hors périmètre de la première version).

**Procédure** : propose 2 ou 3 options à l'utilisateur (voir « Qui est l'utilisateur »), attends sa décision, puis **inscris ici** le choix et ses raisons, pour qu'il ne soit pas remis en cause d'une session à l'autre.

> Choix retenu : **TypeScript + React + Vite** (option A, choisie par l'utilisateur le 2026-11-13).
> Raisons : la combinaison la plus répandue et la plus documentée ; TipTap (ProseMirror) sait interdire les imbrications invalides, ce qui correspond à « un document invalide ne doit pas pouvoir se construire » ; site statique publiable gratuitement (GitHub Pages).
> Éditeur visuel (gauche) : **TipTap** (sur ProseMirror), installé à l'étape 8. Il reste une **vue** du document central de `src/core`, jamais la source de vérité.
> Éditeur de texte (droite) : **CodeMirror 6**, installé à l'étape 8.
> Outil de tests : **Vitest**, environnement Node pour le cœur.

### Plan des fichiers
- `src/core/` : cœur du formatage, fonctions pures, **aucun import de React ni du navigateur**.
- `src/core/characters.ts` : constantes des caractères invisibles (`ESC`, `ZERO_WIDTH_SPACE`).
- `src/ui/` : interface React.
- `tests/core/` : tests automatiques du cœur (`*.test.ts`), nommés d'après les ID du cahier.
- `docs/tests-discord/` : messages de test d'origine à coller dans Discord.

## Commandes

- Lancer l'appli en local : `npm run dev` (ouvre le navigateur sur http://localhost:5173)
- Lancer les tests : `npm test`
- Vérification du code (lint) : `npm run lint` (contrôle des types TypeScript)
- Construire la version à mettre en ligne : `npm run build` (dossier `dist/`)

## Tests

- **Le cœur est couvert par des tests automatiques dès le départ**, écrits **avant** l'implémentation quand c'est possible.
- Les cas de test viennent de `docs/discord-rules.md` : chaque règle « Testé » donne au moins un test, et la série de tests Discord de l'utilisateur (A à K) fournit des cas concrets (entrée → sortie attendue).
- Tests obligatoires : aller-retour (S14), syntaxe inconnue conservée (S12), collisions de balises, échappement, comptage UTF-16, tous les messages de `examples/` (S15).
- Les tests ne se modifient pas pour passer (règle 4).

## Économie de contexte

Les fichiers de référence sont volumineux (`docs/discord-rules.md` et `docs/cahier-de-tests.md` pèsent chacun plus de 25 Ko). Les lire en entier à chaque session gaspille du contexte.

- `CLAUDE.md` est chargé automatiquement : ne le relis pas.
- `ROADMAP.md` : lis **l'étape en cours** et le « Journal des décisions », pas tout le fichier.
- `SPEC.md` : lis uniquement les sections et scénarios (S1 à S15) concernés par l'étape.
- `docs/discord-rules.md` : lis uniquement les sections citées par l'étape (par exemple §2.3 et §11 pour l'étape 1). Cherche une règle avec une recherche ciblée plutôt qu'en relisant le fichier.
- `docs/cahier-de-tests.md` : lis uniquement les séries de l'étape (A, B, C pour l'étape 1, etc.). Ne le lis jamais en entier.
- Ne lance pas d'exploration générale du projet : le plan de fichiers est dans ce document et dans la stack retenue.
- Affiche des résultats de tests **courts** (échecs seulement, pas la liste de tous les tests qui passent).
- Ne recopie pas de longs extraits des fichiers de référence dans tes réponses ou dans le code : cite la section.
- N'utilise pas de sous-agents sans raison : chacun repart de zéro et recharge du contexte.

## Déroulement d'une session

1. Lis l'étape en cours dans `ROADMAP.md`, puis seulement les parties utiles des autres fichiers (voir « Économie de contexte »).
2. **Mode plan d'abord** pour toute étape non triviale : explique ce que tu vas faire, attends l'accord de l'utilisateur.
3. Travaille **uniquement** sur l'étape en cours de `ROADMAP.md`.
4. Lance les tests. Ne conclus pas tant qu'ils ne passent pas.
5. **Commit git** à la fin de chaque étape validée, avec un message clair en français.
6. Mets à jour `ROADMAP.md` (étape cochée, notes utiles) et, si tu as appris quelque chose, `docs/discord-rules.md` ou ce fichier.
7. Termine par un **compte rendu en français simple** :
   - ce qui a été fait ;
   - **quoi essayer dans l'appli** pour le constater (actions précises, résultat attendu) ;
   - ce que tu as décidé seul ;
   - ce qui reste, et les questions en suspens.

## Conventions de code (par défaut, à modifier par l'utilisateur)

- Identifiants du code (variables, fonctions, fichiers) en **anglais** ; textes de l'interface et messages à l'utilisateur en **français** ; commentaires courts, en français.
- Code simple et lisible plutôt que malin. Une fonction = une responsabilité.
- Pas de dépendance ajoutée sans l'expliquer à l'utilisateur.