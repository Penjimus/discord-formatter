# Tests Discord : liens masqués (étape 14, série L)

Ces tests servent à l'étape 14 (liens masqués `[texte](adresse)`). Ils complètent C16, C21 et C22 (`docs/discord-rules.md` §4).

## Mode d'emploi

- Même salon de test que d'habitude.
- Chaque bloc ci-dessous est **un message** : copie-le avec le bouton « Copier » et colle-le dans Discord sans rien retaper.
- Pour chaque ligne, regarde : le lien est-il **cliquable** ? Le **texte** a-t-il le bon style ? Des **symboles** (`[`, `]`, `(`, `)`, `*`, `\`…) restent-ils visibles ?
- Survole ou clique le lien (sans confirmer l'ouverture) : l'adresse affichée par Discord est-elle la bonne ?
- Une ligne « attendu » donne l'hypothèse de départ, ou la question posée. Ton constat prime.
- Ordinateur d'abord ; précise « mobile » si c'est différent.

## Comment me rapporter les résultats

Une ligne par test, en citant la ligne concernée quand le message en a plusieurs, par exemple :

> L1 : tout OK / L2 : ligne `code` cassée, je vois les accents graves / L7 : `exemple.com` pas cliquable

---

**L1** : styles **autour** du lien. Attendu : chaque lien est cliquable et porte le style ; le spoiler cache le lien.

````text
**[gras](https://exemple.com)**
*[italique étoile](https://exemple.com)*
_[italique tiret](https://exemple.com)_
__[souligné](https://exemple.com)__
~~[barré](https://exemple.com)~~
||[spoiler](https://exemple.com)||
***__~~[tout](https://exemple.com)~~__***
````

**L2** : styles **dans** le texte du lien. Question : le style s'applique-t-il, et le lien reste-t-il cliquable ?

````text
[**gras**](https://exemple.com)
[*italique étoile*](https://exemple.com)
[_italique tiret_](https://exemple.com)
[__souligné__](https://exemple.com)
[~~barré~~](https://exemple.com)
[||spoiler||](https://exemple.com)
[`code`](https://exemple.com)
[début **milieu** fin](https://exemple.com)
````

**L3** : style qui commence ou finit **à côté** du lien. Question : rendu de chaque ligne ?

````text
**avant [lien](https://exemple.com) après**
**gras [lien** suite](https://exemple.com)
[lien **suite](https://exemple.com) gras**
````

**L4** : lien dans une mise en page. Attendu : chaque lien est cliquable, la mise en page est respectée.

````text
- [puce](https://exemple.com)
  - [sous-puce](https://exemple.com)
1. [numéro](https://exemple.com)
> [citation](https://exemple.com)
> - [puce citée](https://exemple.com)
-# [sous-texte](https://exemple.com)
> -# [sous-texte cité](https://exemple.com)
````

**L5** : crochets dans le **texte** du lien. Question : où commence et finit le lien ? Quels symboles restent visibles ?

````text
[a [b] c](https://exemple.com)
[d \] e](https://exemple.com)
[f \[ g](https://exemple.com)
[h ] i](https://exemple.com)
````

**L6** : symboles dans l'**adresse**. Question : le lien est-il cliquable, et quelle adresse Discord affiche-t-il au survol ?

````text
[a](https://exemple.com/a_(b))
[b](https://exemple.com/a\)b)
[c](https://exemple.com/a%29b)
[d](https://exemple.com/a b)
[e](https://exemple.com/_x_*y*~~z~~)
````

**L7** : adresses qui ne commencent **pas** par `https://`. Question : lesquelles deviennent un lien cliquable ?

````text
[a](http://exemple.com)
[b](exemple.com)
[c](www.exemple.com)
[d](mailto:test@exemple.com)
[e](ftp://exemple.com)
[f](steam://run/440)
[g](tel:+33100000000)
[h](discord://-/channels/@me)
````

**L8a** : lien masqué vers un vrai site. Attendu : un aperçu (carte sous le message) apparaît.

````text
[Wikipédia](https://fr.wikipedia.org/wiki/Discord)
````

**L8b** : même lien, adresse entre chevrons. Attendu : le lien est cliquable, **sans** aperçu.

````text
[Wikipédia](<https://fr.wikipedia.org/wiki/Discord>)
````

**L8c** : chevrons et style ensemble. Attendu : lien en gras, sans aperçu.

````text
**[Wikipédia](<https://fr.wikipedia.org/wiki/Discord>)**
````

**L9** : contenus particuliers. Question : rendu de chaque ligne ?

````text
mot[collé](https://exemple.com)mot
[😀 :star: <t:1735689600:f>](https://exemple.com)
[https://autre.com](https://exemple.com)
[](https://exemple.com)
[ ](https://exemple.com)
[titre](https://exemple.com "info")
````

**L10** : formes **presque** des liens (pour savoir quand échapper `[`). Question : lesquelles restent du texte ordinaire, symboles visibles ?

````text
[a](b)
[a] (https://exemple.com)
[a]\(https://exemple.com)
[a]
(https://exemple.com)
````

---

## Tests complémentaires (après les résultats de L1 à L10)

**L11** : en L9, la ligne `[😀 :star: <t:…>](…)` n'était pas un lien. Lequel des éléments l'empêche ? Question : quelles lignes sont cliquables ?

````text
[😀](https://exemple.com)
[texte 😀](https://exemple.com)
[:star:](https://exemple.com)
[<t:1735689600:f>](https://exemple.com)
[<@&123>](https://exemple.com)
[<#123>](https://exemple.com)
````

**L12** : détails d'adresse et de crochet.
- Ligne 1 : survole ou clique le lien (sans confirmer) : l'adresse affichée contient-elle l'antislash (`a\)b`) ou non (`a)b`) ?
- Ligne 2 : un espace écrit `%20` donne-t-il un lien cliquable ?
- Ligne 3 : un `[` seul, **sans** antislash, dans le texte : le lien se forme-t-il ?

````text
[b](https://exemple.com/a\)b)
[d](https://exemple.com/a%20b)
[f [ g](https://exemple.com)
````
