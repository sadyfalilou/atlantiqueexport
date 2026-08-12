# Guide de test

_Dernière mise à jour : 12 août 2026 — état : lot 1 terminé, lot 2 en cours_

## 1. Démarrer le site

Le site tourne sur votre machine, pas en ligne. Il n'est pas encore déployé.

Une seule fois, pour installer les dépendances :

```bash
npm install
```

Puis, à chaque fois que vous voulez voir le site :

```bash
npm run dev
```

Ouvrez ensuite <http://localhost:3000>. Vous êtes redirigé vers `/fr`. Pour arrêter le serveur,
revenez au terminal et faites `Ctrl` + `C`.

## 2. Ce qui existe, et ce qui n'existe pas encore

C'est le point le plus important avant de commencer : la plupart des liens mènent volontairement
à une page « Cette page n'est pas encore en ligne ». Ce n'est pas un bogue.

| Fonctionne aujourd'hui | Pas encore construit |
| --- | --- |
| Page d'accueil complète | Boutique, catégories, fiches produit |
| Bascule français / anglais | Recherche |
| Méga-menu Boutique | Panier et commande |
| Navigation mobile et barre inférieure | **Création de compte et connexion** (lot 7) |
| Pied de page | **Espace administrateur** (lot 9) |
| Page « pas encore en ligne » | Recettes, arrivages, pages institutionnelles |

**Il n'y a donc pas encore de connexion.** L'icône de personnage dans l'en-tête mène à la page
« pas encore en ligne ». L'authentification arrive au lot 7, l'administration au lot 9.

**Les produits affichés ne sont pas encore ceux de la base.** L'accueil montre toujours le jeu de
démonstration, avec des prix fictifs — un bandeau le rappelle en haut de page. Les 42 produits
Sonagoo sont bien en base, mais non publiés faute de prix canadiens, et l'accueil n'y est pas
encore branché. Cette bascule est la prochaine étape du lot 2.

## 3. Parcours à tester

Cochez au fur et à mesure ; ce qui cloche m'intéresse, même si ça vous paraît mineur.

### 3.1 Page d'accueil sur ordinateur

- [ ] La bannière s'affiche avec le bon titre et les deux boutons
- [ ] Les quinze sections se suivent sans trou ni chevauchement
- [ ] Les prix sont alignés d'une carte à l'autre, avec le prix au kilo en dessous
- [ ] La section « Avis des clients » est vide et l'explique — c'est voulu, nous n'affichons aucun
      faux témoignage
- [ ] « Prochain arrivage du Sénégal » montre deux barres de progression et les bonnes dates
      (18 septembre 2026 pour l'arrivée, 5 septembre pour la limite de réservation)

### 3.2 Bilinguisme

- [ ] Cliquez sur `EN` dans l'en-tête : tout le texte passe en anglais
- [ ] Vous restez sur la même page, vous n'êtes pas renvoyé à l'accueil
- [ ] Les prix passent au format anglais (`$12.99` au lieu de `12,99 $`)
- [ ] Repassez en `FR` : rien ne casse
- [ ] Cherchez du texte resté en français dans la version anglaise, ou l'inverse

### 3.3 Méga-menu

- [ ] Survolez « Boutique » : le menu s'ouvre avec les douze catégories sur trois colonnes
- [ ] Cliquez sur « Boutique » alors que le menu est déjà ouvert : **il doit rester ouvert**
- [ ] La touche `Échap` le ferme
- [ ] Un clic à l'extérieur le ferme
- [ ] Au clavier : `Tab` jusqu'à « Boutique », `Entrée` pour ouvrir, `Tab` pour parcourir les
      catégories

### 3.4 Téléphone

Le plus simple est de réduire la fenêtre de votre navigateur jusqu'à ce qu'elle soit très étroite.

- [ ] À 320 px de large, **aucune barre de défilement horizontale** ne doit apparaître
- [ ] Le menu devient un bouton hamburger, qui ouvre un tiroir latéral
- [ ] Une barre fixe en bas montre Accueil, Boutique, Rechercher, Panier
- [ ] Les cartes produit passent sur deux colonnes
- [ ] Tous les boutons se touchent facilement au doigt, sans viser

### 3.5 Liens non construits

- [ ] Cliquez sur « Faire mes courses » : vous arrivez sur « Cette page n'est pas encore en ligne »
- [ ] L'en-tête et le pied de page restent affichés — ce n'est pas la page d'erreur brute du serveur
- [ ] Le bouton « Retour à l'accueil » fonctionne

### 3.6 Infolettre

- [ ] Entrez une adresse invalide, par exemple `abc` : un message explique quoi corriger
- [ ] Entrez une adresse valide : le message précise que l'infolettre n'est pas encore active et
      que les inscriptions seront enregistrées à l'ouverture de la boutique

**Rien n'est enregistré pour l'instant, et le message le dit.** L'enregistrement réel viendra avec
les courriels transactionnels.

### 3.7 Accessibilité

- [ ] Appuyez sur `Tab` dès l'ouverture de la page : un lien « Aller au contenu principal » apparaît
- [ ] Continuez au `Tab` : chaque élément actif est entouré d'un anneau vert bien visible
- [ ] Aucun élément ne se laisse traverser sans qu'on voie où l'on se trouve
- [ ] Si vous avez activé « Réduire les animations » dans les réglages de votre système, plus rien
      ne bouge au survol

## 4. Vérifier la base de données

Ces commandes interrogent votre projet Supabase réel. Elles n'affichent jamais vos clés.

```bash
npm run check:supabase
```

Contrôle que la configuration est complète et que le projet répond.

```bash
npm run smoke:security
```

Vérifie, avec la seule clé publique, que le catalogue est lisible et que les prix de gros, les
quantités détenues, les commandes, les paiements, les adresses et la liste d'infolettre sont bien
refusés. Vingt-quatre contrôles doivent passer.

```bash
npm run smoke:stock
```

Démontre qu'une réservation dépassant le stock est refusée. Ce script crée puis supprime des
données de test dans votre base.

## 5. Vérifier le code

```bash
npm run check
```

Lance le linter, la vérification TypeScript et les tests unitaires. À faire passer avant chaque
commit.

## 6. Me signaler un problème

Le plus utile, dans l'ordre : sur quelle page, à quelle largeur d'écran ou sur quel appareil, ce
que vous attendiez, ce qui s'est produit. Une capture d'écran vaut souvent mieux qu'un paragraphe.

Si le terminal affiche une erreur, copiez-la en entier. Et si quelque chose vous paraît laid,
lourd ou confus, dites-le : c'est aussi un défaut, même sans message d'erreur.
