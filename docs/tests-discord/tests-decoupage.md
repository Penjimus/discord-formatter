# Tests Discord : découpage en plusieurs messages (étape 15a, série N)

Ces tests servent à l'étape 15a : vérifier qu'un message qui **commence** ou **finit** au milieu de quelque chose (liste, bloc, citation, spoiler, couleurs) s'affiche bien seul.

N1 (liste qui commence par `3.`) est déjà tranché par l'auteur : la numérotation part de 3, puis 4, 5…

## Mode d'emploi

- Même salon de test que d'habitude.
- Chaque bloc ci-dessous est **un message** : copie-le et colle-le dans Discord sans rien retaper. Quand un test a deux messages (« message a », « message b »), envoie-les **l'un après l'autre**.
- **N4 (couleurs) n'est pas dans ce fichier** : il contient un caractère invisible. Ouvre `N4-ansi-coupe.txt` dans le Bloc-notes, copie le message a, envoie-le, puis le message b.
- Une ligne « attendu » donne l'hypothèse de départ, ou la question posée. Ton constat prime.
- Ordinateur d'abord ; précise « mobile » si c'est différent.

## Comment me rapporter les résultats

Une ligne par test, par exemple :

> N2 : ligne 1 sous-puce, ligne 2 texte normal / N3 : tout OK / N7 : l'espace disparaît

---

**N2** : message qui commence par une **sous-liste**, sans élément parent au-dessus (cas d'une liste coupée juste avant une sous-puce). Question : pour chaque message, Discord affiche-t-il une sous-puce (décalée), une puce normale, ou le texte tel quel avec ses espaces ?

Message a (sous-puce) :

````text
  - sous-élément x
  - sous-élément y
- élément suivant
````

Message b (sous-liste numérotée) :

````text
  2. sous-élément deux
  3. sous-élément trois
3. élément trois
````

**N3** : bloc de code `js` coupé en deux messages. Attendu : deux blocs colorés normaux, le second commence à `const b`.

Message a :

````text
```js
const a = 1;
```
````

Message b :

````text
```js
const b = 2;
```
````

**N5** : citation coupée en deux messages. Attendu : deux citations normales, chacune avec sa barre à gauche.

Message a :

````text
> première partie de la citation
> deuxième ligne
````

Message b :

````text
> troisième ligne
> fin de la citation
````

**N6** : spoiler et gras coupés en deux messages. Attendu : chaque message a son propre spoiler (à cliquer séparément) ; « fin » est en gras.

Message a :

````text
||**début du secret**||
````

Message b :

````text
||**fin du secret**||
````

**N7** : message qui **commence par des espaces** (cas d'une coupe au milieu d'une phrase). Question : les espaces du début sont-ils visibles (texte décalé vers la droite) ou retirés ?

````text
   trois espaces avant ce texte
````
