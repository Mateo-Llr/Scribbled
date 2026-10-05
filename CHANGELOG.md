# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Les dates sont à compléter.

## [0.9.0]
### Ajouté
- Importation et exportation de personnages complets au format JSON depuis le sélecteur de personnages.
- Métadonnées Open Graph et carte de partage avec le logo Scribbled sur une page lignée.
- Sauvegarde locale de plusieurs personnages nommés, sélection du personnage par défaut et restauration au chargement.
- Réinitialisation vers un personnage vierge sans effacer les sauvegardes existantes.
- Aperçu dessiné de chaque personnage dans la liste de sélection.
### Modifié
- Libellés des actions de sélection et de sauvegarde de personnage clarifiés.
- La palette, le sélecteur de couleur et la pipette conservent l'outil de dessin actif.
- Le trou annoncé par « Une plateforme ! » reste visible sous un pont court au niveau du sol, traversable avec ↓ + Espace.

## [0.8.0]
### Ajouté
- Bordures latérales aux blocs de sol (creux et trous bien visibles), sans trait entre deux sols contigus ni sur le bord des zones.
- Plateforme d'arrivée dans la zone au-dessus du ressort perché, avec un trou dessous et un message expliquant ↓ + saut.
- **Saut à hauteur variable** : appui bref = petit saut (~60 px), appui long = grand saut (~165 px).
### Modifié
- Passage vers le haut : élan minimal garanti pour toujours arriver au-dessus de la plateforme d'arrivée.

## [0.7.0]
### Ajouté
- Sols remplis en hachures crayonnées : marron (sol), bleu (glace), vert (ressort), rouge (pointes).
### Modifié
- Monde plus haut (660 au lieu de 600) pour donner de l'épaisseur au sol.
### Corrigé
- Une phrase de voix off ne se réécrit plus quand elle est déjà en cours d'affichage (zone de déclenchement plus tolérante, reprise sans redémarrage).

## [0.6.0]
### Modifié
- Texte de voix off en police pixel, blanc avec contour sombre, avec effet boil.
### Ajouté
- Mots-clés colorés (rouge, bleu, vert, orange, jaune, rose, lavande).

## [0.5.0]
### Ajouté
- Plateformes mouvantes qui portent le joueur.
- Ennemis patrouilleurs écrasables.
- Lance-flammes cycliques.
- Quatre nouvelles zones (plateformes mouvantes, ennemis, flammes, salle secrète) ; la fin du jeu est déplacée.
- Fermeture symétrique de certains bords de zone (`nl`, `nr`, `nu`).
### Corrigé
- Détection des pointes en chute rapide.

## [0.4.0]
### Corrigé
- Zone des pointes inaccessible (mur trop haut) : ajout de marches.
- Raccourci vers la zone du dessus depuis la page de départ : plafond fermé.
- Raccourci via la zone de glace vers la tour finale et plateformes de saut contradictoires supprimés.
- Retour impossible vers la droite dans la zone de glace : sortie rouverte.

## [0.3.0]
### Ajouté
- Le jeu se déroule sur la feuille en plein écran, plus dans un cadre.
- Monde en zones avec transitions horizontales et verticales.
- Traits colorés à effets : glace, ressort, pointes ; murs.
- Voix off déclenchée par des « ? » violets.
- Respawn au dernier point d'entrée de zone.

## [0.2.0]
### Ajouté
- Points d'articulation par pièce.
- Animation de marche par pièce (Balancier A/B, Rebond).
- Mode jeu de plateformes (marche, course, saut, descente de plateforme).
- Boutons tactiles.
### Corrigé
- Impossible de déplacer une pièce vide : la zone de sélection couvre toute la pièce choisie.

## [0.1.0]
### Ajouté
- Feuille de cahier avec boil lines.
- Éditeur de pièces 128×128 (crayon, gomme, palette, annulation).
- Placement libre : taille, rotation, miroir, calques.
