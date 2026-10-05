# Cahier des charges — Carnet à persos

## 1. Contexte et objectif
Créer un site web interactif permettant de **dessiner un personnage en pixel art** pièce par pièce, de l'assembler librement, puis de **le jouer dans un platformer** dont le décor est tracé sur une feuille de cahier. Le site doit donner l'impression d'une **feuille d'écriture dessinée à la main**.

## 2. Public et usage
- Public : joueurs et créateurs occasionnels, desktop et mobile.
- Usage : sessions courtes, ludiques, sans compte ni installation.

## 3. Direction artistique
| Exigence | Détail |
|---|---|
| Support | Feuille de cahier : lignes bleues, marge rouge, fond crème |
| Pixel | Pièces en 128×128 px, rendu `image-rendering: pixelated`, légèrement « basse qualité » |
| Boil lines | Contours qui tremblent en continu (filtre SVG bruit + déplacement, graine changée ~8 fois/s) |
| Interface | Bordures et boutons aux coins irréguliers, police manuscrite |
| Texte du jeu | Police pixel, blanc avec contour sombre, mots-clés colorés, même effet boil |
| Sols | Hachures crayonnées colorées (marron, bleu, vert, rouge selon le type) |

## 4. Exigences fonctionnelles

### 4.1 Éditeur de pièces
- **EF-01** Plusieurs pièces, chacune sur une grille 128×128 px ; création de pièces supplémentaires.
- **EF-02** Outils : crayon, gomme, taille de pinceau, palette, sélecteur de couleur.
- **EF-03** Annulation (≥ 25 niveaux) et remise à zéro d'une pièce.
- **EF-04** Dessin continu sans trou (interpolation entre deux points de pointeur) ; compatible souris et tactile.

### 4.2 Assemblage
- **EF-05** Déplacement libre de chaque pièce, y compris vide ou transparente à l'endroit cliqué.
- **EF-06** Taille, rotation, miroir, ordre des calques, suppression.
- **EF-07** Ajustement au pixel au clavier (Maj = ×10).
- **EF-08** Point d'articulation par pièce, réglable dans l'éditeur ou sur la feuille ; rotation et échelle autour de ce point ; déplacer le pivot ne déplace pas le dessin.
- **EF-09** Sélection au pixel près (zones transparentes ignorées), ordre de priorité par calque.

### 4.3 Animation du personnage
- **EF-10** Réglage par pièce : Fixe, Balancier A, Balancier B, Rebond.
- **EF-11** Animation active à la marche, amortie à l'arrêt et en l'air.
- **EF-12** Le personnage se retourne selon la direction ; sa taille en jeu s'adapte automatiquement (réglable).

### 4.4 Mode jeu
- **EF-13** Bascule édition ↔ jeu ; en jeu, la feuille occupe tout l'écran.
- **EF-14** Contrôles : marcher, courir, sauter (hauteur variable), descendre d'une plateforme ; compatibles clavier AZERTY/QWERTY et boutons tactiles.
- **EF-15** Monde découpé en zones ; passage automatique aux bords horizontaux et verticaux ; bords sans voisin ou fermés = mur invisible.
- **EF-16** Mise à l'échelle du monde pour s'adapter à l'écran (ratio conservé).
- **EF-17** Mort : retour au dernier point d'entrée de zone.

### 4.5 Éléments de niveau
- **EF-18** Plateformes à sens unique (noir), glace (bleu), ressort (vert), pointes (rouge), murs.
- **EF-19** Plateformes mouvantes qui transportent le joueur.
- **EF-20** Ennemis patrouilleurs : écrasables par le dessus, mortels autrement.
- **EF-21** Lance-flammes cycliques : avertissement, flamme pleine (non franchissable en sautant), pause.
- **EF-22** Voix off : texte déclenché par proximité, saisi lettre par lettre, sans redémarrer si la même phrase est déjà affichée.
- **EF-23** Cohérence de niveau : aucun raccourci contournant les mécaniques, aucune zone inaccessible, passages dans les deux sens, plateforme d'arrivée après un passage vers le haut.
- **EF-24** Lisibilité : sols pleins hachurés avec bordures latérales aux creux et aux trous.

## 5. Exigences non fonctionnelles
- **ENF-01** Site statique, sans framework, sans build, sans dépendance JavaScript externe.
- **ENF-02** Navigateurs modernes (Chrome, Edge, Firefox, Safari récents) ; nécessite les filtres SVG, les lookbehind et propriétés Unicode des regex.
- **ENF-03** Fluidité visée : 60 images/s en jeu.
- **ENF-04** Interface responsive (mobile : colonnes empilées, boutons tactiles).
- **ENF-05** Tolérance aux encoches mobiles (`safe-area-inset`).
- **ENF-06** Seule ressource externe : Google Fonts (Patrick Hand, Pixelify Sans) avec polices de repli.
- **ENF-07** Aucune donnée personnelle collectée ni stockée.

## 6. Architecture
- `index.html` : structure, filtres SVG (`#boil` pour la feuille, `#boilL` allégé pour l'éditeur et la voix off).
- `css/style.css` : papier, panneaux, mode jeu (`body.play`).
- `js/game.js` : état des pièces, éditeur, placement, moteur de jeu, données de niveaux (`Z`).
- Modèle d'une pièce : `{ name, c (canvas), sc (canvas affiché), x, y, s, r, f, px, py, anim, undo }`.
- Moteur : boucle `requestAnimationFrame`, pas de temps plafonné à 33 ms, gravité 1900 px/s², saut -790, ressort -1150, course 400 / marche 230.

## 7. Critères d'acceptation
1. Je peux dessiner une pièce, la placer, régler son pivot et la voir tourner autour.
2. Le personnage marche avec bras et jambes qui balancent.
3. Je peux traverser tout le niveau du départ à la zone finale en utilisant toutes les mécaniques.
4. Chaque trou ou creux est visible grâce aux bordures latérales.
5. Un texte ne se réécrit jamais quand il est déjà en cours d'affichage.
6. Un appui bref donne un petit saut, un appui long un grand saut.

## 8. Évolutions envisagées
- Sauvegarde locale et export/import du personnage (PNG, JSON).
- Éditeur de niveaux intégré.
- Sons et musique.
- Nouveaux éléments : plateformes qui s'effondrent, ennemis sauteurs, clés et portes, collectibles, chronomètre.
- Pièces multiples du même type (animation image par image).
- Caméra défilante au lieu des zones fixes.
