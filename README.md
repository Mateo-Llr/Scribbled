# ✎ Scribbled

Un petit site interactif où l'on **dessine son personnage en pixel art** sur une feuille de cahier, puis où on le **fait jouer dans un platformer** dont les niveaux sont tracés directement sur la page. Le projet est jouable sur [GitHub Pages](https://mateo-llr.github.io/Scribbled/).

Tout le rendu est volontairement « brouillon » : pixels bruts (128×128 par pièce) et **boil lines** (les traits tremblent en permanence, comme une animation dessinée à la main).

> Site 100 % statique : HTML + CSS + JavaScript, **aucune dépendance, aucun build**.

## Fonctionnalités

### Éditeur de personnage
- Le personnage est composé de **pièces** (tête, corps, bras, jambes, accessoires…), chacune dessinée sur sa propre grille de **128×128 pixels**.
- **Nouveau** réinitialise l'éditeur aux pièces de départ sans supprimer les sauvegardes. **Sauver par défaut** enregistre le personnage sous un nom dans le navigateur et en fait le personnage chargé au prochain passage. **Choisir par défaut** permet de retrouver une autre sauvegarde.
- Les personnages et leurs pièces, pivots, placements, calques et animations sont stockés localement dans le navigateur. Ils ne sont pas synchronisés entre appareils ; utilisez le même navigateur et ne supprimez pas ses données de site pour les conserver.
- Outils : crayon, gomme, pipette (prélèvement d'une couleur dessinée), seau (remplissage contigu), taille de pinceau (1–12 px), palette + sélecteur de couleur, annulation (25 niveaux), vider la pièce.
- Choisir une couleur dans la palette ou avec la pipette conserve l'outil de dessin sélectionné.
- Placement libre sur la feuille : déplacement à la souris/au doigt, flèches du clavier (Maj = ×10), taille, rotation, miroir, ordre des calques, suppression.
- **Articulations** : chaque pièce a un point pivot (épaule, hanche…) posé avec 📍 ou glissé sur la feuille. Rotation et échelle se font autour de ce point. Les pivots initiaux de la tête, des bras et des jambes sont placés pour faciliter l'assemblage.
- **Animation de marche** par pièce : Fixe, Balancier A, Balancier B (opposé), Rebond.

### Mode jeu (▶ Jouer)
- Le perso se déplace **sur la feuille elle-même** : les plateformes sont des traits dessinés sur le papier.
- Le monde est une grille de **zones** (5×2). En sortant d'un bord de l'écran, on passe à la zone voisine.
- Marche, course, **saut à hauteur variable** (appui long = plus haut), descente à travers une plateforme (↓ + saut).
- Éléments de niveau :

| Élément | Rendu | Effet |
|---|---|---|
| Plateforme | trait noir | traversable par en dessous, on peut en descendre |
| Sol | trait noir + hachures marron | sol plein |
| Glace | trait bleu | le perso glisse |
| Ressort | trait vert | rebond très haut |
| Pointes | zigzag rouge | mort, retour au dernier point d'entrée |
| Mur | trait vertical épais | bloque le passage (on peut monter dessus) |
| Plateforme mouvante | trait orange | va-et-vient, porte le joueur |
| Ennemi | boule griffonnée | à écraser en lui sautant dessus, mortel de côté |
| Lance-flammes | buse au sol | jets périodiques (avertissement → flamme → pause) |
| Voix off | « ? » violet | texte pixel blanc bordé de sombre, mots-clés colorés |

## Contrôles (mode jeu)

| Action | Clavier | Tactile |
|---|---|---|
| Marcher | ← → ou Q D (A D) | ◀ ▶ |
| Courir | Maj | – |
| Sauter | Espace, ↑ ou Z (W) — appui long = plus haut | ⤒ Saut |
| Descendre d'une plateforme | ↓ (ou S) + saut | ▼ puis ⤒ |

## Lancer le projet

Ouvrir `index.html` dans un navigateur suffit. Pour un environnement plus proche de la production :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

### Publier sur GitHub Pages

Le déploiement est automatisé par GitHub Actions : chaque push sur `main` publie
le site, et le workflow peut aussi être lancé manuellement depuis l'onglet
**Actions**. Dans les paramètres du dépôt, vérifier que **Settings → Pages →
Build and deployment** utilise **GitHub Actions**.

Pour ce dépôt, le site est disponible à
<https://mateo-llr.github.io/Scribbled/>.

## Structure du projet

```
.
├── index.html          # page, filtres SVG « boil », structure de l'interface
├── style.css           # papier quadrillé, panneaux, mode jeu plein écran
├── game.js             # éditeur, placement, moteur de jeu, niveaux
├── README.md
├── CAHIER_DES_CHARGES.md
├── CHANGELOG.md
└── .github/workflows/deploy-pages.yml  # déploiement GitHub Pages
```

## Créer ou modifier des niveaux

Les niveaux sont décrits dans l'objet `Z` de `game.js`. Chaque clé `"x,y"` est une zone ; l'origine est en haut à gauche, le départ est en `0,1`. Le monde fait 1000 × 660 unités, le sol est à `G = 580`.

```js
'3,0': {
  p: [['p',0,200,G], ['r',200,800,G], ['p',800,1000,G]],   // [type, x1, x2, y]
  w: [],                                                     // murs : [x, y1, y2]
  m: [[110,330,470,70,0,3.2]],                               // mouvantes : [largeur, x, y, ampX, ampY, période(s)]
  e: [[260,520,G,80]],                                       // ennemis : [x1, x2, y, vitesse]
  f: [[300,G,3,0]],                                          // lance-flammes : [x, y, période(s), décalage(s)]
  t: [[100,G,90,"Texte de la voix off"]],                    // déclencheurs : [x, y, rayon, texte]
  nu:1, nl:1, nr:1                                           // options : plafond / bord gauche / bord droit fermés
}
```

Types de plateformes `p` : `'p'` normale, `'i'` glace, `'b'` ressort, `'r'` pointes. Tout segment posé à `y = G` est rempli en hachuré.

Les mots-clés colorés de la voix off se règlent dans le tableau `KW`.

## Limites connues
- Les sauvegardes sont locales à ce navigateur : pas de synchronisation entre appareils ni d'export/import pour le moment.
- Pas de multijoueur, pas de son.
- Une pièce = une grille de 128×128 ; un seul ensemble de pièces par session.

## Licence
À définir (ex. MIT).
