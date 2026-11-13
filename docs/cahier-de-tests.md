# Cahier de tests Discord

Ce cahier relie chaque nom de test cité dans `docs/discord-rules.md` (A1, D4, I3, etc.) au **message réellement envoyé**, au **résultat attendu** et au **résultat constaté** par l'auteur dans Discord.

C'est la pièce justificative des règles : quand `discord-rules.md` indique « Testé (D14) », la preuve est ici.

## Comment lire ce cahier

- **Message envoyé** : le texte exact collé dans Discord. `↵` marque un saut de ligne. `<ESC>` est le caractère invisible `U+001B`, `<U+200B>` l'espace de largeur nulle, `<U+2800>` le braille vide. `⟦CONTENU⟧` abrège la chaîne de test de la série D :
  `**gras** *italique* __souligné__ ~~barré~~ \|\|spoiler\|\| <t:1735689600:f> [lien](https://exemple.com)`
- **Attendu** : l'hypothèse de départ, ou la question posée, telle qu'elle figurait dans la série de tests.
- **Observé** : ce que l'auteur a constaté. Sauf mention « mobile », le résultat est le même sur ordinateur et sur téléphone.
- **Verdict** :
  - ✅ **Confirmé** : le résultat correspond à l'hypothèse de départ.
  - ⚠️ **Écart** : le résultat contredit ou complète l'hypothèse de départ. Ce sont les tests les plus instructifs : voir la liste récapitulative en fin de document.
  - ℹ️ **Constat** : le test posait une question ouverte, sans hypothèse tranchée ; le résultat est un fait établi.
- **Règle** : la section de `docs/discord-rules.md` qui s'appuie sur ce test.

## Où sont les messages d'origine

| Séries | Fichier à coller dans Discord |
|---|---|
| A, B, C, D, F, G, H, I, J | `tests-discord.md` (un bloc par message) |
| E, K, Z (caractères invisibles et longueurs) | `tests-discord-speciaux.txt` (à ouvrir dans un éditeur de texte simple) |
| I5 (caractère invisible dans un code `:nom:`) | `test-I5.txt` (à ouvrir dans un éditeur de texte simple) |
| M | Essais libres de l'auteur, sans fichier de départ : leurs identifiants M1 à M6 ont été créés pour ce cahier |
| X | Messages réels du dossier `examples/` (`NOM.txt`) |

## Sommaire

| Série | Sujet | Tests | Règles concernées |
|---|---|---|---|
| [A](#série-a) | Collisions, styles imbriqués, espaces au bord, plusieurs lignes | A1 à A35 (35) | §1, §2.3, §5 |
| [B](#série-b) | Tiret bas collé à des lettres | B1 à B2 (2) | §1, §2.3 |
| [C](#série-c) | Échappement | C1 à C22 (22) | §11, §4 |
| [D](#série-d) | Matrice de compatibilité | D1 à D14 (14) | §3, §5, §10 |
| [E](#série-e) | Couleurs ANSI | E1 à E13 (13) | §6 |
| [F](#série-f) | Blocs de code | F1 à F5 (5) | §5 |
| [G](#série-g) | Listes et citations | G1 à G4 (4) | §3 |
| [H](#série-h) | Horodatages | H1 à H3 (3) | §1, §8 |
| [I](#série-i) | Mentions et émojis | I1 à I5 (5) | §1, §7, §9, §11 |
| [J](#série-j) | Lignes vides | J1 à J4 (4) | §13 |
| [K](#série-k) | Longueur et comptage | K1 à K10 (10) | §9, §12 |
| [Z](#série-z) | Caractères invisibles | Z1 à Z6 (6) | §2.3, §5, §13 |
| [M](#série-m) | Essais complémentaires (mentions et citation vide) | M1 à M7 (7) | §1, §3, §7 |
| [X](#série-x) | Constats tirés des exemples réels | X1 à X10 (10) | §1, §3, §6, §9, §10 |

**Total : 135 tests** (✅ 77 confirmés, ⚠️ 11 écarts, ℹ️ 47 constats).

---

## Série A

### Collisions de délimiteurs

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **A1** | `**1***2*` | cassé : ni gras ni italique correct, ou symboles visibles | ✅ Cassé : « 1 » en gras, mais `*2*` reste visible avec ses astérisques | §2.3 |
| **A2** | `**1**_2_` | 1 en gras, 2 en italique | ✅ Correct : 1 gras, 2 italique | §2.3 |
| **A3** | `*1***2**` | cassé | ✅ Cassé : « 1 » en italique, mais `**2**` reste visible | §2.3 |
| **A4** | `_1_**2**` | 1 en italique, 2 en gras | ✅ Correct : 1 italique, 2 gras | §2.3 |
| **A5** | `__1___2_` | cassé | ✅ Cassé : « 1 » souligné, les `_` autour de 2 restent visibles | §2.3 |
| **A6** | `__1__*2*` | 1 souligné, 2 italique | ✅ Correct : 1 souligné, 2 italique | §2.3 |
| **A7** | `**1** *2*` | témoin : 1 gras, 2 italique (avec espace) | ✅ Correct | §2.3 |
| **A8** | `a) ***texte*** ↵ b) __***texte***__ ↵ c) \|\|~~__***texte***__~~\|\|` | chaque ligne rend tous les styles cumulés (a : gras+italique, b : +souligné, c : +barré+spoiler) | ✅ Les trois lignes rendent tous les styles cumulés correctement | §1 (combinaisons) |
| **A9** | `**a *b***` | a gras, b gras + italique | ✅ Correct | §1 (styles imbriqués) |
| **A10** | `***a* b**` | a gras + italique, b gras | ✅ Correct | §1 (styles imbriqués) |
| **A11** | `**a _b_**` | a gras, b gras + italique | ✅ Correct | §1 (styles imbriqués) |
| **A12** | `*a **b***` | a italique, b italique + gras | ✅ Correct | §1 (styles imbriqués) |
| **A13** | `***a** b*` | a italique + gras, b italique | ✅ Correct | §1 (styles imbriqués) |
| **A14** | `` **x `code` y** `` | code en ligne dans un gras | ✅ Correct | §1, §5 |
| **A15** | `` \|\|`code`\|\| `` | code en ligne dans un spoiler | ✅ Correct | §1, §5 |
| **A16** | ``` ``a`b`` ``` | code en ligne contenant un accent grave : affiche a`b | ✅ Correct | §5 |

| **A17** | `**a ↵ b**` | le gras couvre-t-il les deux lignes ? | ℹ️ Oui : a et b en gras | §1 (plusieurs lignes) |
| **A18** | `*a *b` | espace avant la fermeture d'un italique | ⚠️ Italique appliqué, mais l'espace est perdu : « ab » | §1 (espaces au bord) |
| **A19** | `**a **b` | espace avant la fermeture d'un gras | ✅ Gras appliqué, espace conservé | §1 (espaces au bord) |
| **A20** | `__a __b` | idem, souligné | ✅ Souligné appliqué, espace conservé | §1 (espaces au bord) |
| **A21** | `~~a ~~b` | idem, barré | ✅ Barré appliqué, espace conservé | §1 (espaces au bord) |
| **A22** | `\|\|a \|\|b` | idem, spoiler | ✅ Spoiler appliqué, espace conservé | §1 (espaces au bord) |
| **A23** | `a__b__c` | souligné au milieu d'un mot | ✅ b souligné | §1 (délimiteurs et mots) |
| **A24** | `a**b**c` | gras au milieu d'un mot | ✅ b en gras | §1 (délimiteurs et mots) |
| **A25** | `a~~b~~c` | barré au milieu d'un mot | ✅ b barré | §1 (délimiteurs et mots) |
| **A26** | `a\|\|b\|\|c` | spoiler au milieu d'un mot | ✅ b caché | §1 (délimiteurs et mots) |

| **A27** | `**a ↵ ↵ b**` | le gras traverse-t-il une ligne vide ? | ℹ️ Oui : a et b en gras | §1 (plusieurs lignes) |
| **A28** | `** a**` | espace juste après l'ouverture d'un gras | ℹ️ Sans effet gênant : a en gras | §1 (espaces au bord) |
| **A29** | `* a*` | espace juste après l'ouverture d'un italique | ℹ️ Lu comme une **puce** « a* » (`* ` en début de ligne est un marqueur de liste) | §1 (espaces au bord), §3, §11 |

| **A30** | `suite_mot_ fin` | `_` d'ouverture collé à une lettre : italique ? | ℹ️ Oui : « mot » en italique, les `_` disparaissent (« suitemot fin ») | §1 (délimiteurs et mots) |
| **A31** | `a **** b` | quatre astérisques : gras vide, italique ou littéral ? | ℹ️ Affiche `a ** b` : les deux astérisques du milieu sont en italique | §1 |

| **A32** | `_mot_suite` | fermeture `_` collée à une lettre : italique ? | ℹ️ Non : affiché tel quel, sans mise en forme | §1 (délimiteurs et mots) |
| **A33** | `` `a ↵ b` `` | code en ligne sur deux lignes : code ou texte ? | ℹ️ Code : il s'étend sur les deux lignes | §5 |
| **A34** | `**# x**` | marqueur de titre derrière une balise ouvrante : titre ou texte ? | ⚠️ Titre (en gras) : l'étape 1 supposait du texte | §3, §11 |

| **A35** | `**Note :**` | gras qui finit par « : » : cassé comme l'italique (X4) ? | ✅ Non : gras correct, pas d'émoji | §9 |

*A9 à A29 : envoyés par l'auteur le 13/11/2026 pendant l'étape 1, un message par ligne (sauf A17 et A27, sur plusieurs lignes). A30 à A35 : envoyés pendant l'étape 2.*

## Série B

### Tiret bas collé à des lettres

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **B1** | `le fichier mon_fichier_final.txt est prêt` | à observer : « fichier » ou « final » passent-ils en italique ? | ℹ️ Pas d'italique : les `_` restent visibles | §1 (délimiteurs et mots), §2.3 |
| **B2** | `snake_case_name et __init__.py` | à observer : `__init__` devient-il souligné ? | ℹ️ « init » est souligné | §1 (délimiteurs et mots), §11 |

## Série C

### Échappement

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **C1** | `2 * 3 * 4` | astérisques isolés entourés d'espaces : littéraux ? | ✅ Littéral, affiché tel quel | §11 |
| **C2** | `2 \* 3 \* 4` | doit afficher « 2 * 3 * 4 » | ✅ Affiche « 2 * 3 * 4 » | §11 |
| **C3** | `a*b*c` | témoin : b en italique ? | ✅ Le b est en italique | §11 |
| **C4** | `a_b_c` | tirets bas dans un mot : littéraux ? | ℹ️ Littéral : `a_b_c` affiché tel quel (cas déjà couvert par B1) | §11 |
| **C5** | `a\_b\_c` | doit afficher « a_b_c » | ✅ Affiche « a_b_c » | §11 |
| **C6** | `a ~ b ~ c` | tildes simples : littéraux ? | ✅ Littéral | §11 |
| **C7** | `a ~~ b` | deux tildes sans fermeture : littéraux ? | ✅ Littéral (tildes visibles) | §11 |
| **C8** | `a \| b \| c` | barres simples : littérales ? | ✅ Littéral (barres visibles) | §11 |
| **C9** | `a \|\| b` | deux barres sans fermeture : spoiler ou littéral ? | ℹ️ Littéral (barres visibles) : pas de spoiler | §11 |
| **C10** | `` a ` b `` | accent grave seul : littéral ? | ✅ Littéral (accent grave visible) | §11 |
| **C11** | `#sans-espace ↵ \# pas un titre ↵ \## pas un titre non plus` | ligne 1 : titre ou texte ? ; lignes 2 et 3 : doivent être du texte | ℹ️ Aucun titre : les trois lignes sont du texte | §11 |
| **C12** | `-sans espace ↵ \- pas une puce ↵ \-# pas un sous-texte` | ligne 1 : puce ou texte ? ; lignes 2 et 3 : texte | ℹ️ Aucune puce : les trois lignes sont du texte | §11 |
| **C13** | `1.sans espace ↵ 1\. pas une liste ↵ 2020. une année` | ligne 1 : liste ou texte ? ; ligne 2 : texte ; ligne 3 : liste ? | ℹ️ Ligne 1 : texte ; ligne 2 : texte ; ligne 3 (`2020. …`) : **liste** | §11 |
| **C14** | `>sans espace ↵ \> pas une citation` | ligne 1 : citation ou texte ? ; ligne 2 : texte | ℹ️ Ligne 1 : texte ; ligne 2 : texte | §11 |
| **C15** | `a < b > c ↵ <texte> ↵ <@&123> ↵ \<@&123>` | ligne 1 et 2 : texte ; ligne 3 : mention de rôle « fantôme » ; ligne 4 : doit rester littérale | ✅ Conforme : les lignes 1 et 2 restent du texte, la ligne 4 reste littérale | §11 |
| **C16** | `[a](https://exemple.com) ↵ \[a](https://exemple.com) ↵ <https://exemple.com>` | ligne 1 : lien ? ; ligne 2 : littéral ; ligne 3 : lien sans aperçu | ✅ Le lien est masqué dans le texte (ligne 1) | §4, §11 |
| **C17** | `antislash : \a et \\ et \_` | à observer : l'antislash devant une lettre est-il affiché ? | ✅ L'antislash devant une lettre est affiché ; devant `\` et `_` il est masqué | §11 |
| **C18** | `a ~~ b ↵ c ~~ d` (non échappé) | deux `~~` sur des lignes différentes forment-ils une paire ? | ℹ️ Oui : une mise en forme apparaît (ligne vide visible). L'échappement est nécessaire | §11 |
| **C19** | `\! \: \é \( \)` | l'antislash devant d'autres symboles est-il affiché ? | ℹ️ Non : affiche « ! : é ( ) » | §11 |
| **C20** | `a \|\|\|\| b` | quatre barres : spoiler vide ou littéral ? | ℹ️ Littéral : affiché tel quel | §11 |
| **C21** | `https://exemple.com/_a_` | les `_` d'une adresse sont-ils interprétés ? | ℹ️ Non : `_a_` reste visible dans le lien | §4 |
| **C22** | `**https://exemple.com**` | un gras autour d'une adresse s'applique-t-il ? | ℹ️ Oui : le lien est en gras | §4 |

*C19 à C22 : envoyés par l'auteur pendant l'étape 2, un message par test.*

## Série D

### Matrice de compatibilité

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **D1** | `# ⟦CONTENU⟧ ↵ ## ⟦CONTENU⟧ ↵ ### ⟦CONTENU⟧` | titres niveaux 1 à 3 | ✅ Tous les styles, l'horodatage et le lien sont rendus correctement dans les trois niveaux de titre | §3 (titres), §10 |
| **D2** | `-# ⟦CONTENU⟧` | sous-texte | ✅ Tout est rendu correctement | §3 (titres), §10 |
| **D3** | `- ⟦CONTENU⟧ ↵   - ⟦CONTENU⟧ ↵ 1. ⟦CONTENU⟧` | liste à puces, sous-niveau, liste numérotée | ⚠️ Bien formaté, **mais** à un même niveau tous les éléments prennent le type du premier : une ligne numérotée après une puce s'affiche en puce, et inversement. Une sous-puce numérotée sous une puce n'est pas adaptée | §3 (listes) |
| **D4** | `> ⟦CONTENU⟧ ↵ > ⟦CONTENU⟧` | citation sur deux lignes | ✅ Citation correctement formatée | §3 (citations), §10 |
| **D5** | `\|\|**gras** *italique* __souligné__ ~~barré~~ <t:1735689600:f> [lien](https://exemple.com)\|\|` | tout à l'intérieur d'un spoiler | ✅ Tout est rendu correctement sous le spoiler | §10 |
| **D6** | `` `⟦CONTENU⟧` `` | code en ligne : tout brut attendu | ✅ Tout reste brut | §5, §10 |
| **D7** | ```` ``` ↵ ⟦CONTENU⟧ ↵ ``` ```` | bloc de code sans langage : tout brut attendu | ✅ Tout reste brut | §5, §10 |
| **D8** | ```` ```js ↵ ⟦CONTENU⟧ ↵ ``` ```` | bloc de code avec langage js : tout brut attendu | ✅ Tout reste brut | §5, §10 |
| **D9** | ```` ```ansi ↵ ⟦CONTENU⟧ ↵ ``` ```` | bloc ansi sans code ESC : tout brut attendu | ✅ Résultat identique à D7 | §5 |
| **D10** | ```` > citation ↵ > ``` ↵ > bloc dans la citation ↵ > ``` ```` | bloc de code dans une citation | ✅ Bloc de code correctement affiché dans la citation | §3 (citations), §10 |
| **D11** | `> - puce 1 ↵ >   - puce 2 ↵ > - puce 3` | liste dans une citation | ✅ Liste correctement formatée dans la citation | §3 (citations), §10 |
| **D12** | `> # titre dans une citation ↵ > texte` | titre dans une citation | ✅ Titre correctement formaté dans la citation | §3 (citations), §10 |
| **D13** | ```` - puce ↵   ``` ↵   bloc dans une puce ↵   ``` ↵ - puce suivante ```` | bloc de code dans une puce | ✅ Bloc de code correctement affiché entre deux puces | §3 (listes), §10 |
| **D14** | `- # titre dans une puce ↵ - > citation dans une puce` | titre dans une puce ; citation dans une puce | ⚠️ Citation dans une puce : OK (sur mobile, la puce n'apparaît pas devant la citation, message lisible). **Titre dans une puce : non rendu** | §3 (listes), §10 |

## Série E

### Couleurs ANSI

*Source : tests-discord-speciaux.txt.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **E1** | bloc `ansi` de 8 lignes : `<ESC>[NNm` + « NN couleur » + `<ESC>[0m`, avec NN de 30 à 37 | huit couleurs de texte (30 à 37), la ligne affiche son code | ✅ Les 8 couleurs s'affichent sur ordinateur. Sur mobile : couleurs invisibles, balises masquées (texte propre) | §6 |
| **E2** | bloc `ansi` de 8 lignes : `<ESC>[NNm` + « NN fond » + `<ESC>[0m`, avec NN de 40 à 47 | huit couleurs de fond (40 à 47), la ligne affiche son code | ✅ Les 8 fonds s'affichent sur ordinateur. Sur mobile : idem E1 | §6 |
| **E3** | ```` ```ansi ↵ <ESC>[1mgras<ESC>[0m ↵ <ESC>[4msouligné<ESC>[0m ↵ <ESC>[1;4mgras et souligné (1;4)<ESC>[0m ↵ <ESC>[1m<ESC>[4mgras et souligné (balises séparées)<ESC>[0m ↵ ``` ```` | gras ; souligné ; gras+souligné dans une seule balise (1;4) ; gras puis souligné en balises séparées | ✅ Gras, souligné, `1;4` et balises successives fonctionnent sur ordinateur. Sur mobile : formats invisibles, balises masquées | §6 |
| **E4** | ```` ```ansi ↵ <ESC>[1;31mstyle puis texte<ESC>[0m ↵ <ESC>[31;1mtexte puis style<ESC>[0m ↵ <ESC>[45;37mfond puis texte<ESC>[0m ↵ <ESC>[37;45mtexte puis fond<ESC>[0m ↵ ``` ```` | ordre libre : lignes 1 et 2 identiques ? lignes 3 et 4 identiques ? | ✅ L'ordre des codes est libre : les lignes 1-2 et 3-4 sont identiques. Mobile : idem E3 | §6 |
| **E5** | ```` ```ansi ↵ <ESC>[1;4;45;37mordre de l'appli<ESC>[0m ↵ ``` ```` | ordre retenu par l'appli : styles, fond, texte (gras, souligné, fond indigo, texte blanc) | ✅ Gras, souligné, fond indigo, texte blanc : correct. Mobile : idem E3 | §6 |
| **E6** | ```` ```ansi ↵ <ESC>[31mligne 1 rouge sans reset ↵ ligne 2 sans aucun code ↵ <ESC>[0mligne 3 après reset ↵ ``` ```` | persistance : la couleur rouge continue-t-elle sur la ligne 2 (sans code) ? et sur la ligne 3 après reset ? | ℹ️ La couleur continue sur la ligne 2 (sans code) jusqu'au reset | §6 |
| **E7** | ```` ```ansi ↵ <ESC>[3mtexte avec code 3<ESC>[0m ↵ ``` ```` | italique ANSI (code 3) : ignoré attendu | ⚠️ **Corrigé par l'auteur le 13/11/2026** : l'italique est **appliqué** sur ordinateur (la première lecture « aucun italique » était erronée ; les exemples `couleurs` et `cellule_des_huit` l'ont révélé). Mobile : balises masquées | §6 |
| **E8** | ```` ```ansi ↵ <ESC>[31m**gras** *italique* __souligné__<ESC>[0m ↵ ``` ```` | markdown dans un bloc ansi coloré : tout reste brut | ℹ️ Le texte est coloré mais les symboles markdown restent visibles (pas de formatage) | §6 |
| **E9** | ```` ``` ↵ <ESC>[31mrouge<ESC>[0m ↵ ``` ```` | codes ANSI dans un bloc SANS langage : brut, ignorés, ou colorés ? | ✅ Codes ignorés : les séquences restent visibles dans le message | §6 |
| **E10** | ```` ```js ↵ <ESC>[31mrouge<ESC>[0m ↵ ``` ```` | codes ANSI dans un bloc de langage js : brut, ignorés, ou colorés ? | ℹ️ Codes ignorés (séquences visibles) ; la coloration du langage js s'applique (les chiffres sont colorés) | §6 |
| **E11** | `<ESC>[31mrouge hors bloc<ESC>[0m` | codes ANSI hors de tout bloc de code : que voit-on ? | ℹ️ Formatage ANSI non appliqué hors d'un bloc | §6 |
| **E12** | ```` ```ansi ↵ <ESC>[31mrouge<ESC>[0m normal ↵ <ESC>[31mrouge<ESC>[m normal (reset vide) ↵ <ESC>[0;31mrouge (0;31)<ESC>[0m normal ↵ ``` ```` | variantes de reset : 0 ; vide ; 0 avec couleur (0;31) | ⚠️ `<ESC>[m` (reset vide) **ne réinitialise pas** : « normal (reset vide) » reste rouge ; les deux autres « normal » sont blancs | §6 |
| **E13** | ```` ```ansi ↵ <ESC>[91mcode 91<ESC>[0m ↵ <ESC>[38;5;196mcode 38;5;196<ESC>[0m ↵ <ESC>[9mcode 9<ESC>[0m ↵ <ESC>[7mcode 7<ESC>[0m ↵ <ESC>[2mcode 2<ESC>[0m ↵ ``` ```` | codes non listés dans les règles : clairs 91, 256 couleurs 38;5;196, barré 9, inversé 7, atténué 2 : ignorés ? | ℹ️ `91`, `38;5;196` et `9` : l'auteur note « OK » (appliqués sur ordinateur, effet exact à confirmer). `7` et `2` : sans effet. Mobile : balises masquées, texte non formaté | §6 |
| **E14a** | ```` ```ansi ↵ <ESC>[31;0mligne 1 : 31;0<ESC>[0m ↵ <ESC>[1;31mgras rouge <ESC>[3;0msuite après 3;0<ESC>[0m ↵ <ESC>[48;2;120;40;160mfond au choix violet (48;2)<ESC>[0m ↵ ``` ```` | `0` après d'autres codes ; fond au choix | ℹ️ Ligne 1 rouge ; « suite » en italique, ni gras ni rouge ; fond violet affiché (13/11/2026) | §6 |
| **E14b** | ```` ```ANSI ↵ <ESC>[31mrouge<ESC>[0m ↵ ``` ```` | langage en majuscules | ✅ Rouge : le langage `ANSI` est reconnu | §6 |
| **E14c** | ```` > ```ansi ↵ > <ESC>[31mrouge ligne 1 ↵ > rouge ligne 2<ESC>[0m ↵ > ``` ```` | bloc ansi dans une citation | ✅ Les deux lignes rouges, dans la citation | §6, §10 |
| **E14d** | ```` - puce ↵   ```ansi ↵   <ESC>[31mrouge ligne 1 ↵   rouge ligne 2<ESC>[0m ↵   ``` ↵ - puce suivante ```` | bloc ansi dans une puce | ✅ Bloc indenté sous la puce, deux lignes rouges | §3, §6 |
| **E14e** | ```` - puce ↵   ``` ↵   bloc ↵   ``` ↵   - sous-puce ```` | sous-puce après un bloc dans une puce | ✅ Sous-puce affichée | §3 (listes) |
| **E14f** | ```` - puce ↵   ``` ↵   bloc ↵   ``` ↵ 1. numéro ```` | élément numéroté après un bloc dans une puce | ℹ️ « 1. » s'affiche en puce : la liste continue après le bloc | §3 (listes) |
| **E14g** | ```` - puce ↵   ``` ↵   bloc ↵   ``` ↵ texte ```` | texte après un bloc dans une puce | ✅ Texte hors de la liste | §3 (listes) |

## Série F

### Blocs de code

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **F1** | ```` ```zzzinconnu ↵ texte du bloc ↵ ``` ```` | langage inconnu : bloc normal ? le mot est-il affiché ou masqué ? | ℹ️ Bloc de code normal, langage ignoré | §5 |
| **F2** | ```` ```JS ↵ const a = 1; ↵ ``` ```` | langage en majuscules : coloration ? | ℹ️ Coloration appliquée : le nom du langage est insensible à la casse | §5 |
| **F3** | ```` ```texte sur la même ligne``` ↵ ```js console.log(1)``` ```` | contenu sur la même ligne que l'ouverture (ligne 1 sans langage, ligne 2 avec js) | ℹ️ Le « js » est visible dans le contenu (le langage n'est pas interprété) | §5 |
| **F4** | ```` ``` ↵  ↵ ligne au milieu ↵  ↵ ``` ```` | lignes vides au début et à la fin du bloc : conservées ? | ℹ️ Les lignes vides de début et de fin ne sont pas conservées | §5 |
| **F5** | ```` ``` ↵ avant ``` après ↵ ``` ```` | trois accents graves dans un bloc, sans contournement : le bloc se casse-t-il ? | ✅ Le bloc est cassé : les trois derniers accents graves sont lus comme une ouverture de bloc | §5 |

## Série G

### Listes et citations

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **G1** | `1. a ↵ 1. b ↵ 1. c` | numérotation : affichée 1-2-3 ou 1-1-1 ? | ℹ️ Affiché 1, 2, 3 | §3 (listes) |
| **G2** | `3. a ↵ 7. b ↵ 2. c` | numérotation avec numéros désordonnés : affichés tels quels ou recalculés ? | ℹ️ Affiché 3, 4, 5 (le premier numéro donne le départ) | §3 (listes) |
| **G3** | `> a ↵ > ↵ > b` | ligne « > » seule : la citation continue-t-elle ? | ℹ️ La citation ne continue pas : le caractère `>` seul est visible | §3 (citations) |
| **G4** | `> a ↵ b` | texte juste après une citation d'une ligne : sort-il de la citation ? | ℹ️ Le texte « b » est en dehors de la citation | §3 (citations) |
| **G5** | `1. a ↵   1. x ↵ 2. b ↵   1. y` | sous-listes sous deux parents : y numéroté 1 ou 2 ? | ℹ️ y s'affiche avec le numéro 1 : chaque sous-liste repart de son propre numéro (testé le 13/11/2026) | §3 (listes) |
| **G6** | ```` - puce ↵   ```js ↵   ligne 1 ↵  ↵   ligne 3 ↵   ``` ↵ - puce suivante ```` | bloc avec langage et ligne vide, indenté sous une puce | ⚠️ Pas de bloc de code : le texte reste dans la puce (« puce```js »…), la ligne vide apparaît ; « puce suivante » reste une puce. Contredit D13 (sans langage ni ligne vide) | §3 (listes), §5 |
| **G7** | ```` - ```js ↵ ligne 1 ↵ ``` ↵ - puce suivante ```` | bloc ouvert sur la ligne de la puce | ⚠️ Pas de bloc ; les puces restent des puces | §3 (listes), §5 |
| **G8** | ```` - puce ↵ ```js ↵ ligne 1 ↵ ``` ↵ - puce suivante ```` | bloc non indenté juste après une puce | ℹ️ Vrai bloc, coloration correcte, mais affiché hors de la liste (non aligné avec les puces) | §3 (listes), §5 |
| **G9** | D13 repassé à l'identique (13/11/2026) | lever la contradiction D13 / G6 | ✅ Bloc affiché sous la puce, au-dessus de « puce suivante » : D13 confirmé. G6 échoue donc à cause du langage, de la ligne vide, ou des deux | §3 (listes), §5 |
| **G10** | ```` - puce ↵   ```js ↵   ligne 1 ↵   ``` ↵ - puce suivante ```` | bloc avec langage, sans ligne vide, sous une puce | ✅ Bloc affiché sous la puce : le langage n'a aucun effet sur le placement | §3 (listes), §5 |
| **G11** | ```` - puce ↵   ``` ↵   ligne 1 ↵  ↵   ligne 3 ↵   ``` ↵ - puce suivante ```` | bloc sans langage, avec ligne vide, sous une puce | ⚠️ Pas de bloc : **la ligne vide casse le bloc dans la liste** | §3 (listes), §5 |

## Série H

### Horodatages

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **H1** | `aucun : <t:1735689600> ↵ t : <t:1735689600:t> ↵ T : <t:1735689600:T> ↵ d : <t:1735689600:d> ↵ D : <t:1735689600:D> ↵ f : <t:1735689600:f> ↵ F : <t:1735689600:F> ↵ s : <t:1735689600:s> ↵ S : <t:1735689600:S> ↵ R : <t:1735689600:R>` | affichage des neuf styles + « aucun ». Note surtout s et S. | ✅ Tous les styles s'affichent ; l'absence de lettre équivaut à `f` | §8 |
| **H2** | `<t:1735689600000:f>` | timestamp en millisecondes : date invalide attendue | ⚠️ Le timestamp en millisecondes n'est pas rejeté : il donne une date valide mais absurde (25 octobre 56971 à 2:00) | §8 |
| **H3** | `**<t:1735689600:f>** *<t:1735689600:f>* __<t:1735689600:f>__ ~~<t:1735689600:f>~~` | styles sur un horodatage : appliqués ou sans effet ? | ℹ️ Les styles sont appliqués sur l'horodatage | §1, §8 |

## Série I

### Mentions et émojis

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **I1** | `<@ID_UTILISATEUR> <@&ID_ROLE> <#ID_SALON>` | les trois modèles restent du texte brut | ✅ Les trois modèles restent du texte brut | §7 |
| **I2** | ```` Hors code : <#ID_SALON_REEL> ↵ Code en ligne : `<#ID_SALON_REEL>` ↵ ``` ↵ Bloc : <#ID_SALON_REEL> ↵ ``` ```` | ligne 1 : lien de salon ; ligne 2 : brut dans le code en ligne ; lignes suivantes : brut dans le bloc ? | ℹ️ L'identifiant fictif n'est pas interprété et s'affiche en texte brut. Conclusion rapportée par l'auteur : une mention n'est active qu'en dehors d'un bloc ou d'une ligne de code | §7 |
| **I3** | `**😀** *😀* __😀__ ~~😀~~ \|\|😀\|\|` | émojis dans les styles : tous rendus normalement ? | ⚠️ Les émojis sont tous identiques (gras, italique, souligné, barré sans effet visible). Le spoiler cache l'émoji | §1, §9 |
| **I4** | `\:star: ↵ :star\: ↵ \:star\:` | quelle forme empêche la conversion de `:star:` en émoji ? | ⚠️ Ligne 1 : l'étoile ⭐, sans antislash visible (correction de l'auteur ; première lecture « `\` puis ⭐ » erronée). Lignes 2 et 3 : pas d'émoji, affichent « :star: », antislashs invisibles (deuxième relecture de l'auteur ; la première, « antislashs visibles », était erronée). L'antislash échappe un code `:nom:` s'il est placé devant le **dernier** deux-points | §9, §11 |
| **I5** | `test-I5.txt` : `A : :<U+200B>star: ↵ B : :star<U+200B>: ↵ C : *Membres :<U+200B>*` | l'espace invisible empêche-t-il la conversion en émoji ? « Membres : » en italique ? | ✅ A et B : « :star: » sans étoile, aucun caractère parasite visible. C : « Membres : » en italique | §9 |

## Série J

### Lignes vides

*Source : tests-discord.md.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **J1** | `ligne 1 ↵ _ _ ↵ _ _ ↵ ligne 4` | deux lignes vides visibles entre « ligne 1 » et « ligne 4 » ? | ✅ Deux lignes vides visibles | §13 |
| **J2** | `ligne 1 ↵  ↵  ↵  ↵ ligne 5` | lignes vides ordinaires : réduites ? (colle le message tel quel, 3 lignes vides) | ⚠️ Les lignes vides **ne sont pas réduites** : les trois lignes vides apparaissent | §13 |
| **J3** | `_ _` | message composé uniquement de « _ _ » : accepté ? | ✅ Message accepté | §13 |
| **J4** | `** **` | message composé uniquement de « ** ** » : accepté ? | ✅ Message accepté | §13 |

## Série K

### Longueur et comptage

*Source : tests-discord-speciaux.txt.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **K1** | 2000 × `a` | 2000 caractères « a » : accepté (limite sans Nitro) | ✅ Accepté | §12 |
| **K2** | 2001 × `a` | 2001 caractères « a » : refusé ou converti en fichier ? | ✅ Refusé, sans conversion en fichier | §12 |
| **K3** | 666 × 😀 | 666 émojis 😀 (3 chacun = 1998) : accepté | ⚠️ Accepté : 😀 compte pour **2** (666 × 2 = 1332), et non 3 | §9, §12 |
| **K4** | 667 × 😀 | 667 émojis 😀 (3 chacun = 2001) : refusé | ⚠️ **Accepté** (667 × 2 = 1334), alors qu'on attendait un refus à 3 par émoji | §9, §12 |
| **K5** | 500 × 🇫🇷 | 500 drapeaux 🇫🇷 : accepté si un drapeau compte 4 | ✅ Accepté : un drapeau compte pour 4 | §9, §12 |
| **K6** | 501 × 🇫🇷 | 501 drapeaux 🇫🇷 : refusé si un drapeau compte 4 | ✅ Refusé (cohérent avec 4 par drapeau) | §9, §12 |
| **K7** | 500 × 👍🏽 | 500 pouces avec teinte de peau 👍🏽 : accepté si chacun compte 4 | ✅ Accepté : un pouce teinté compte pour 4 | §9, §12 |
| **K8** | 501 × 👍🏽 | 501 pouces avec teinte de peau 👍🏽 : refusé si chacun compte 4 | ✅ Refusé (cohérent avec 4 par émoji teinté) | §9, §12 |
| **K9** | 1999 × `a` + `<ESC>` | 1999 « a » + caractère ANSI (1 caractère) = 2000 : accepté | ✅ Accepté : `<ESC>` compte pour 1 | §6, §12 |
| **K10** | 2000 × `a` + `<ESC>` | 2000 « a » + caractère ANSI = 2001 : refusé (si le caractère ANSI est conservé et compté) | ✅ Refusé : `<ESC>` compte pour 1 | §6, §12 |

## Série Z

### Caractères invisibles

*Source : tests-discord-speciaux.txt.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **Z1** | `**1**<U+200B>*2*` | collision : gras puis italique séparés par un caractère invisible. 1 gras et 2 italique ? | ✅ 1 en gras, 2 en italique, sans problème | §2.3 |
| **Z2** | `__1__*2*<U+200B>**3**` | cas résiduel : souligné, italique, gras. 1 souligné, 2 italique, 3 gras ? | ✅ 1 souligné, 2 italique, 3 gras | §2.3 |
| **Z3** | `__1__<U+200B>*2*<U+200B>**3**` | cas résiduel avec le caractère invisible des deux côtés | ✅ 1 souligné, 2 italique, 3 gras | §2.3 |
| **Z4** | ```` ``` ↵ avant `<U+200B>`` après ↵ ``` ```` | trois accents graves dans un bloc, avec un caractère invisible au milieu : le bloc reste entier ? | ✅ Le bloc reste entier : les trois accents graves du milieu font partie du contenu | §5 |
| **Z5** | `ligne 1 ↵ <U+2800> ↵ ligne 3` | ligne vide « braille » : message de 3 lignes, la ligne 2 est vide visuellement ? | ✅ La ligne 2 est vide et visible | §13 |
| **Z6** | `<U+2800>` | message composé uniquement d'un caractère braille vide : accepté ? | ✅ Message accepté | §13 |

## Série M

### Essais complémentaires (mentions et citation vide)

*Source : essais libres de l'auteur.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **M1** | *forme type, essai libre* : message composé uniquement de `> ` (citation vide) | à observer : accepté ou refusé ? | ℹ️ Refusé : traité comme un message vide | §3 (citations) |
| **M2** | *forme type, essai libre* : mention (utilisateur ou salon) à l'intérieur d'un spoiler | à observer : mention active ou non ? | ℹ️ La mention fonctionne et le texte reste caché | §7 |
| **M3** | *forme type, essai libre* : styles (gras, italique, etc.) appliqués à une mention | à observer | ℹ️ Aucun effet visible | §1, §7 |
| **M4** | *forme type, essai libre* : mention à l'intérieur d'un titre | à observer | ℹ️ Possible ; la taille du texte de la mention s'adapte au titre | §3 (titres), §7 |
| **M5** | *forme type, essai libre* : mention à l'intérieur d'une citation | à observer | ℹ️ Possible | §3 (citations), §7 |
| **M6** | *forme type, essai libre* : mention à l'intérieur d'une liste | à observer | ℹ️ Possible | §3 (listes), §7 |
| **M7** | *forme type, essai libre* : `-# <#ID>` (mention de salon dans un sous-texte), et mention dans un titre | à observer : mention active ou non ? | ℹ️ La mention fonctionne dans un sous-texte (et dans un titre) | §3 (titres), §7 |

---

## Série X

### Constats tirés des exemples réels

*Source : messages de `examples/`, envoyés par l'auteur dans Discord le 13/11/2026. Le message complet et la description ligne par ligne sont dans `examples/NOM.txt` et `examples/NOM.md`.*

| Test | Message envoyé | Attendu | Observé | Règle |
|---|---|---|---|---|
| **X1** | `citation` : `~~ ↵ > … ↵ > … ↵ Date limite : <t:1735689600:F>~~` | à observer | ℹ️ Le barré couvre la citation (2 lignes) et l'horodatage | §3 (citations), §10 |
| **X2** | `couleurs` : puces `* `, `*:star: préférées*:star:`, puis `\|\| ~~…~~ ↵ ```ansi … ```\|\|` | à observer | ℹ️ `* ` donne des puces ; `:star:` devient l'émoji ⭐ ; le spoiler cache tout le bloc de code ANSI qu'il entoure | §3, §9, §10 |
| **X3** | `cellule_des_huit` : `<ESC>[2;1;2m…`, `<ESC>[38;2;255;218;6m…` | à observer | ℹ️ `2;1;2` donne du gras (le 2 est sans effet) ; les couleurs `38;2;R;G;B` sont appliquées sur ordinateur (jaunes de teintes différentes) | §6 |
| **X4** | `cellule_des_huit_malforme` : `*Membres de la cellule :*` | à observer | ⚠️ `:*` est converti en émoji 😗 : le `*` de fermeture disparaît, l'italique n'est pas appliqué et le `*` d'ouverture reste visible | §9 |
| **X5** | `hello_world` : `**Hello W**__**o**rl**d**__**!**` | à observer | ℹ️ Gras et souligné qui se chevauchent : tout est correct | §1 |
| **X6** | `ODJ2` : `- -# Note : …` (dernière puce d'une liste) | à observer | ℹ️ Sous-texte appliqué dans la puce, `-#` invisible | §3 |
| **X7** | `ODJ` : `~~- a ↵ - b~~ ↵ - -# Note : …` | à observer | ℹ️ Les deux puces sont barrées ; dans la puce suivante, `-#` reste **visible** et le sous-texte n'est pas appliqué (contrairement à X6) | §3 |
| **X8** | `classic_format_complement` : ``*`…`*``, ``~~`…`~~``, `` `… ~~…~~ ou *…*` ``, ``\|\|`…`\|\|`` | à observer | ℹ️ Le code en ligne prend l'italique, le barré et le spoiler qui l'entourent ; les balises placées dans le code restent visibles, non appliquées | §1, §5 |
| **X9** | `hello_world` réécrit par l'appli : `**Hello W__o__**__rl**d**__**!**` | même rendu que X5 | ✅ Correct | §1 |
| **X10** | `citation` réécrit par l'appli : `↵ ~~> … ↵ > … ↵ Date limite : <t:1735689600:F>~~` (ligne vide en premier) | même rendu que X1 | ✅ Bien formaté ; la ligne vide du début n'est **pas affichée** | §3, §13 |

---

## Les écarts : ce que les tests ont corrigé

Ces tests ont contredit ou nuancé une hypothèse de départ. Ils sont la raison d'être de plusieurs conventions de l'application.

| Test | Ce qu'on croyait | Ce qui a été constaté |
|---|---|---|
| **X4** | `:*` est du texte ordinaire | Discord convertit l'émoticône `:*` en émoji 😗, ce qui casse un italique terminé par « : » |
| **A34** | Derrière une balise ouvrante, `# ` n'est plus en début de ligne | `**# x**` donne bien un **titre** : le marqueur doit être échappé même derrière une balise |
| **A18** | Un espace avant la fermeture d'un style est conservé | Vrai pour gras, souligné, barré et spoiler, mais **pas pour l'italique** : `*a *b` affiche « ab » |
| **D3** | Une liste peut mélanger puces et numéros au même niveau | Bien formaté, **mais** à un même niveau tous les éléments prennent le type du premier : une ligne numérotée après une puce s'affiche en puce, et inversement. Une sous-puce numérotée sous une puce n'est pas adaptée |
| **D14** | Un titre est permis partout où le texte l'est | Citation dans une puce : OK (sur mobile, la puce n'apparaît pas devant la citation, message lisible). **Titre dans une puce : non rendu** |
| **E7** | Le code ANSI `3` (italique) est ignoré | L'italique ANSI est **appliqué** sur ordinateur (première lecture du test erronée, corrigée par l'auteur) |
| **E12** | `<ESC>[m` est équivalent à `<ESC>[0m` | `<ESC>[m` (reset vide) **ne réinitialise pas** : « normal (reset vide) » reste rouge ; les deux autres « normal » sont blancs |
| **H2** | Un timestamp invalide est rejeté | Le timestamp en millisecondes n'est pas rejeté : il donne une date valide mais absurde (25 octobre 56971 à 2:00) |
| **I3** | Gras, italique, etc. s'appliquent à un émoji | Les émojis sont tous identiques (gras, italique, souligné, barré sans effet visible). Le spoiler cache l'émoji |
| **I4** | Un antislash devant `:` disparaît (C19) et empêche la conversion en émoji | Devant `:star:`, l'antislash disparaît mais l'étoile est **quand même générée** ; devant le dernier deux-points (`:star\:`), il empêche l'émoji |
| **J2** | Discord réduit les lignes vides consécutives | Les lignes vides **ne sont pas réduites** : les trois lignes vides apparaissent |
| **K3** | Un émoji compte pour 3 caractères | Accepté : 😀 compte pour **2** (666 × 2 = 1332), et non 3 |
| **K4** | 667 émojis (3 chacun) dépassent la limite de 2000 | **Accepté** (667 × 2 = 1334), alors qu'on attendait un refus à 3 par émoji |

---

## Utilisation par Claude Code

- Chaque règle « Testé (ID) » de `docs/discord-rules.md` doit avoir **au moins un test automatique** qui porte cet identifiant dans son nom (par exemple `A1_gras_puis_italique_sans_espace`), pour que le lien reste visible dans le code.
- La colonne « Message envoyé » donne l'**entrée** du test ; la colonne « Observé » donne la **sortie attendue** de l'appli quand elle doit reproduire ce que Discord fait.
- Pour les tests ANSI, l'affichage sur mobile (balises masquées, aucune couleur) n'est pas un échec de format.
- Ce cahier ne se modifie qu'avec l'accord de l'auteur : une nouvelle observation dans Discord s'ajoute comme **nouveau test** (identifiant suivant de la série), sans effacer l'ancien.

## Tests encore à passer

La liste à jour est la section 14 de `docs/discord-rules.md`. Quand l'un de ces tests est passé, il est ajouté ici avec son identifiant.