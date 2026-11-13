# Tests Discord : messages à coller

Ces tests transforment les « À tester » de `docs/discord-rules.md` en règles vérifiées.

## Mode d'emploi

- Utilise un **serveur privé** et un salon de test.
- Chaque bloc ci-dessous est **un message**. Copie le contenu du bloc (le bouton « Copier » du bloc le fait pour toi) et colle-le dans Discord sans rien retaper. Les sauts de ligne sont conservés au collage.
- Regarde le rendu sur **ordinateur et sur mobile** et note les différences.
- Les tests avec **caractères invisibles** (ANSI, espace de largeur nulle) et les **tests de longueur** sont dans `tests-discord-speciaux.txt`. Ne les passe pas par ce fichier-ci : les caractères invisibles risquent de se perdre.
- Une ligne « attendu » donne l'hypothèse de départ, pas une certitude. Ton constat prime.

## Ordre conseillé

1. **Priorité haute** : série A (collisions), C1 à C5 (échappement), D1 à D9 (matrice), puis E1 à E6 dans le fichier `.txt` (ANSI).
2. **Ensuite** : le reste des séries C, D, puis F, G.
3. **En dernier** : H, I, J, et les tests de longueur du fichier `.txt`.

## Comment me rapporter les résultats

Une ligne par test suffit, par exemple :

> A1 : cassé, je vois les astérisques / A2 : OK / C9 : spoiler vide, rien d'affiché / D1 : titre OK, spoiler ignoré

Une capture d'écran est utile quand le rendu est surprenant. Précise « mobile » quand le résultat diffère de l'ordinateur.


---

## Série A : Collisions de délimiteurs (section 2.3)

Ces tests décident de la règle de collision. Note pour chaque message ce que tu vois (style correct, astérisques ou tirets bas visibles, etc.).

**A1** : attendu : cassé : ni gras ni italique correct, ou symboles visibles

````text
**1***2*
````

**A2** : attendu : 1 en gras, 2 en italique

````text
**1**_2_
````

**A3** : attendu : cassé

````text
*1***2**
````

**A4** : attendu : 1 en italique, 2 en gras

````text
_1_**2**
````

**A5** : attendu : cassé

````text
__1___2_
````

**A6** : attendu : 1 souligné, 2 italique

````text
__1__*2*
````

**A7** : attendu : témoin : 1 gras, 2 italique (avec espace)

````text
**1** *2*
````

**A8** : attendu : chaque ligne rend tous les styles cumulés (a : gras+italique, b : +souligné, c : +barré+spoiler)

````text
a) ***texte***
b) __***texte***__
c) ||~~__***texte***__~~||
````


---

## Série B : Tiret bas collé à des lettres

**B1** : attendu : à observer : « fichier » ou « final » passent-ils en italique ?

````text
le fichier mon_fichier_final.txt est prêt
````

**B2** : attendu : à observer : `__init__` devient-il souligné ?

````text
snake_case_name et __init__.py
````


---

## Série C : Échappement (section 11)

Pour chaque message, note : le texte est-il affiché tel quel (OK) ou transformé ? Les messages « escaped » doivent s'afficher sans antislash.

**C1** : attendu : astérisques isolés entourés d'espaces : littéraux ?

````text
2 * 3 * 4
````

**C2** : attendu : doit afficher « 2 * 3 * 4 »

````text
2 \* 3 \* 4
````

**C3** : attendu : témoin : b en italique ?

````text
a*b*c
````

**C4** : attendu : tirets bas dans un mot : littéraux ?

````text
a_b_c
````

**C5** : attendu : doit afficher « a_b_c »

````text
a\_b\_c
````

**C6** : attendu : tildes simples : littéraux ?

````text
a ~ b ~ c
````

**C7** : attendu : deux tildes sans fermeture : littéraux ?

````text
a ~~ b
````

**C8** : attendu : barres simples : littérales ?

````text
a | b | c
````

**C9** : attendu : deux barres sans fermeture : spoiler ou littéral ?

````text
a || b
````

**C10** : attendu : accent grave seul : littéral ?

````text
a ` b
````

**C11** : attendu : ligne 1 : titre ou texte ? ; lignes 2 et 3 : doivent être du texte

````text
#sans-espace
\# pas un titre
\## pas un titre non plus
````

**C12** : attendu : ligne 1 : puce ou texte ? ; lignes 2 et 3 : texte

````text
-sans espace
\- pas une puce
\-# pas un sous-texte
````

**C13** : attendu : ligne 1 : liste ou texte ? ; ligne 2 : texte ; ligne 3 : liste ?

````text
1.sans espace
1\. pas une liste
2020. une année
````

**C14** : attendu : ligne 1 : citation ou texte ? ; ligne 2 : texte

````text
>sans espace
\> pas une citation
````

**C15** : attendu : ligne 1 et 2 : texte ; ligne 3 : mention de rôle « fantôme » ; ligne 4 : doit rester littérale

````text
a < b > c
<texte>
<@&123>
\<@&123>
````

**C16** : attendu : ligne 1 : lien ? ; ligne 2 : littéral ; ligne 3 : lien sans aperçu

````text
[a](https://exemple.com)
\[a](https://exemple.com)
<https://exemple.com>
````

**C17** : attendu : à observer : l'antislash devant une lettre est-il affiché ?

````text
antislash : \a et \\ et \_
````


---

## Série D : Matrice de compatibilité (section 10)

Chaque message met le même contenu de test dans un contenant différent. Contenu de test : gras, italique, souligné, barré, spoiler, horodatage, lien. Note, pour chaque style, s'il est rendu ou affiché brut.

**D1** : attendu : titres niveaux 1 à 3

````text
# **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
## **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
### **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
````

**D2** : attendu : sous-texte

````text
-# **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
````

**D3** : attendu : liste à puces, sous-niveau, liste numérotée

````text
- **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
  - **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
1. **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
````

**D4** : attendu : citation sur deux lignes

````text
> **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
> **gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
````

**D5** : attendu : tout à l'intérieur d'un spoiler

````text
||**gras** *italique* __souligné__ ~~barré~~ <t:1735689600:f> [lien](https://exemple.com)||
````

**D6** : attendu : code en ligne : tout brut attendu

````text
`**gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)`
````

**D7** : attendu : bloc de code sans langage : tout brut attendu

````text
```
**gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
```
````

**D8** : attendu : bloc de code avec langage js : tout brut attendu

````text
```js
**gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
```
````

**D9** : attendu : bloc ansi sans code ESC : tout brut attendu

````text
```ansi
**gras** *italique* __souligné__ ~~barré~~ ||spoiler|| <t:1735689600:f> [lien](https://exemple.com)
```
````

**D10** : attendu : bloc de code dans une citation

````text
> citation
> ```
> bloc dans la citation
> ```
````

**D11** : attendu : liste dans une citation

````text
> - puce 1
>   - puce 2
> - puce 3
````

**D12** : attendu : titre dans une citation

````text
> # titre dans une citation
> texte
````

**D13** : attendu : bloc de code dans une puce

````text
- puce
  ```
  bloc dans une puce
  ```
- puce suivante
````

**D14** : attendu : titre dans une puce ; citation dans une puce

````text
- # titre dans une puce
- > citation dans une puce
````


---

## Série F : Blocs de code (section 5)

**F1** : attendu : langage inconnu : bloc normal ? le mot est-il affiché ou masqué ?

````text
```zzzinconnu
texte du bloc
```
````

**F2** : attendu : langage en majuscules : coloration ?

````text
```JS
const a = 1;
```
````

**F3** : attendu : contenu sur la même ligne que l'ouverture (ligne 1 sans langage, ligne 2 avec js)

````text
```texte sur la même ligne```
```js console.log(1)```
````

**F4** : attendu : lignes vides au début et à la fin du bloc : conservées ?

````text
```

ligne au milieu

```
````

**F5** : attendu : trois accents graves dans un bloc, sans contournement : le bloc se casse-t-il ?

````text
```
avant ``` après
```
````


---

## Série G : Listes et citations (section 3)

**G1** : attendu : numérotation : affichée 1-2-3 ou 1-1-1 ?

````text
1. a
1. b
1. c
````

**G2** : attendu : numérotation avec numéros désordonnés : affichés tels quels ou recalculés ?

````text
3. a
7. b
2. c
````

**G3** : attendu : ligne « > » seule : la citation continue-t-elle ?

````text
> a
>
> b
````

**G4** : attendu : texte juste après une citation d'une ligne : sort-il de la citation ?

````text
> a
b
````


---

## Série H : Horodatages (section 8)

**H1** : attendu : affichage des neuf styles + « aucun ». Note surtout s et S.

````text
aucun : <t:1735689600>
t : <t:1735689600:t>
T : <t:1735689600:T>
d : <t:1735689600:d>
D : <t:1735689600:D>
f : <t:1735689600:f>
F : <t:1735689600:F>
s : <t:1735689600:s>
S : <t:1735689600:S>
R : <t:1735689600:R>
````

**H2** : attendu : timestamp en millisecondes : date invalide attendue

````text
<t:1735689600000:f>
````


---

## Série I : Mentions et émojis (sections 7 et 9)

Pour I2, remplace ID_SALON_REEL par l'identifiant d'un vrai salon de ton serveur (clic droit sur le salon > Copier l'identifiant, mode développeur activé). N'utilise pas de mention de membre ou de rôle réelle pour ne notifier personne.

**I1** : attendu : les trois modèles restent du texte brut

````text
<@ID_UTILISATEUR> <@&ID_ROLE> <#ID_SALON>
````

**I2** : attendu : ligne 1 : lien de salon ; ligne 2 : brut dans le code en ligne ; lignes suivantes : brut dans le bloc ?

````text
Hors code : <#ID_SALON_REEL>
Code en ligne : `<#ID_SALON_REEL>`
```
Bloc : <#ID_SALON_REEL>
```
````

**I3** : attendu : émojis dans les styles : tous rendus normalement ?

````text
**😀** *😀* __😀__ ~~😀~~ ||😀||
````


---

## Série J : Lignes vides (section 13)

**J1** : attendu : deux lignes vides visibles entre « ligne 1 » et « ligne 4 » ?

````text
ligne 1
_ _
_ _
ligne 4
````

**J2** : attendu : lignes vides ordinaires : réduites ? (colle le message tel quel, 3 lignes vides)

````text
ligne 1



ligne 5
````

**J3** : attendu : message composé uniquement de « _ _ » : accepté ?

````text
_ _
````

**J4** : attendu : message composé uniquement de « ** ** » : accepté ?

````text
** **
````