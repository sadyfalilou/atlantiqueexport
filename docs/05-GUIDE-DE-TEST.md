# Guide de test

_Dernière mise à jour : 13 août 2026 — état : site déployé, courriels transactionnels en service_

## 1. Où tester

**Le site est en ligne** : <https://atlantiqueexport.vercel.app>. Chaque `git push` sur `main`
y déclenche un déploiement automatique.

Les deux endroits partagent **la même base Supabase**. Une commande passée en local apparaît
donc dans l'administration en ligne, et inversement. C'est pratique, mais cela veut dire qu'un
test n'est jamais « pour rire » : il crée une vraie commande et envoie de vrais courriels.

Testez en ligne ce qui concerne les courriels et le cron, en local le reste.

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
| Page d'accueil complète | Paiement en ligne par carte |
| Boutique avec filtres et tri | Alertes de stock et d'arrivage (lots 10 et 11) |
| Pages de catégorie | **Création de compte et connexion** (lot 7) |
| **Courriels : commande, Interac, et les 4 étapes de suivi** | |
| Fiches produit avec choix du format | Gestion des produits et des prix en ligne |
| Panier : ajout, quantités, retrait | Recettes, arrivages, pages institutionnelles |
| Commande complète avec Interac | Comptes clients |
| **Administration : commandes, encaissements, stocks** | |
| Nouveautés et Promotions | |
| Bascule français / anglais, méga-menu, navigation mobile | |

**Il n'y a pas encore de compte CLIENT.** L'icône de personnage dans l'en-tête mène à la page
« pas encore en ligne » ; commander se fait sans compte, avec un suivi par lien.

**L'administration, elle, existe** : <http://localhost:3000/admin>. Pour y accéder, créez d'abord
votre utilisateur dans Supabase — Authentication → Users → Add user — puis lancez
`npm run grant:admin -- votre@courriel.ca`.

**Les produits affichés viennent de votre base Supabase** : les 42 références Sonagoo plus la
pulpe de madd. En revanche, **les prix et les stocks sont fictifs** — un bandeau le rappelle en
haut de page, et la fiche produit le répète sous le prix. Ils seront remplacés par vos vraies
valeurs.

## 3. Parcours à tester

Cochez au fur et à mesure ; ce qui cloche m'intéresse, même si ça vous paraît mineur.

### 3.1 Page d'accueil sur ordinateur

- [ ] La bannière s'affiche avec le bon titre et les deux boutons
- [ ] Les quinze sections se suivent sans trou ni chevauchement
- [ ] Les prix sont alignés d'une carte à l'autre, avec le prix au kilo en dessous
- [ ] La section « Avis des clients » est vide et l'explique — c'est voulu, nous n'affichons aucun
      faux témoignage
- [ ] « Prochain arrivage du Sénégal » affiche un état vide : aucun arrivage n'est encore
      enregistré en base, et nous n'en inventons pas

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

### 3.5 Boutique et fiches produit

- [ ] Depuis l'accueil, « Faire mes courses » ouvre la boutique et ses 43 produits
- [ ] Cochez une catégorie dans la colonne de gauche : la liste se réduit et **l'URL change**
- [ ] Copiez cette URL dans un nouvel onglet : vous retrouvez exactement les mêmes filtres
- [ ] Le bouton « précédent » du navigateur défait le dernier filtre
- [ ] Cochez « En promotion » : il ne reste que trois produits
- [ ] Changez le tri pour « Prix croissant » : les prix montent bien de haut en bas
- [ ] Saisissez 25 au minimum de prix, puis « Appliquer » : les produits dont **un format** coûte
      25 $ ou plus apparaissent, même si leur petit format est moins cher
- [ ] « Tout effacer » remet la liste complète

Sur une fiche produit :

- [ ] Cliquez sur un produit : le fil d'Ariane montre Boutique → catégorie → produit
- [ ] Changez de format : le prix et le prix au kilo changent aussitôt
- [ ] Le bouton « Ajouter au panier » fonctionne (voir la section Panier ci-dessous)
- [ ] La mention « Prix de démonstration, non définitif » apparaît sous le prix

Sur téléphone :

- [ ] Le bouton « Filtres » ouvre un tiroir latéral ; `Échap` le referme
- [ ] Aucune barre de défilement horizontale n'apparaît

### 3.6 Panier

- [ ] Sur une fiche produit, réglez la quantité puis « Ajouter au panier » : un message confirme
      et **la pastille de l'en-tête s'incrémente**
- [ ] Le bouton « + » se bloque à la quantité disponible en stock
- [ ] Ouvrez le panier : le sous-total correspond à la somme des lignes
- [ ] Modifiez une quantité puis « Mettre à jour » : le total suit
- [ ] « Retirer » enlève la ligne et recalcule le total

Le test le plus intéressant, celui de la chaîne du froid :

- [ ] Ajoutez la **pulpe de madd congelée** au panier
- [ ] Dans « Modes de réception possibles », « Expédition au Canada » est **barré**, avec le motif :
      votre panier contient un produit surgelé
- [ ] Retirez la pulpe : l'expédition redevient disponible aussitôt

### 3.7 Commande

- [ ] Depuis le panier, « Passer la commande » ouvre le tunnel
- [ ] Seuls les modes compatibles avec votre panier sont proposés
- [ ] En livraison locale, saisissez `H2X 1Y4` : la zone et les frais s'affichent
- [ ] Saisissez un code postal hors zone, par exemple `K1A 0A6` : un message l'explique
- [ ] Choisissez un créneau, remplissez vos coordonnées, validez
- [ ] La page de confirmation affiche le numéro de commande, le montant exact et le numéro
      à inscrire en message pour le virement
- [ ] Le panier est vidé et la pastille revient à zéro

Deux vérifications qui comptent :

- [ ] Rechargez la page de confirmation : elle s'affiche encore
- [ ] Essayez un autre numéro de commande, par exemple `AE-2026-00001` : vous obtenez une page
      introuvable. Connaître le numéro ne suffit pas à voir la commande d'autrui

### 3.8 Administration

- [ ] Ouvrez <http://localhost:3000/admin> sans être connecté : vous êtes renvoyé vers la
      page de connexion
- [ ] Connectez-vous : le tableau de bord signale les virements à valider
- [ ] Ouvrez une commande en attente, puis « J'ai reçu le virement »
- [ ] La commande passe en « Confirmée » et « Encaissé »
- [ ] Le tableau de bord met à jour le montant encaissé
- [ ] **Cliquez une seconde fois** sur le même bouton d'avancement : rien ne se passe, et
      surtout aucun deuxième courriel ne part au client

Saisie des prix :

- [ ] Ouvrez « Produits » : un bandeau indique combien de formats attendent un vrai prix
- [ ] Ouvrez un produit, saisissez un prix avec une virgule — par exemple `18,50` — puis
      enregistrez
- [ ] La mention « prix de démonstration » disparaît pour ce format, et le compteur décroît
- [ ] Sur le site public, la fiche affiche le nouveau prix sans la mention provisoire
- [ ] Essayez un prix barré inférieur au prix de vente : il est refusé avec une explication

### 3.9 Recherche

- [ ] Cliquez sur la loupe dans l'en-tête
- [ ] Tapez `cafe` **sans accent** : « Café Touba » apparaît
- [ ] Tapez `thia` : les quatre thiakry sortent, celui qui s'appelle exactement
      « Thiakry » en premier
- [ ] Tapez `baobab` : la poudre de bouye sort, car le mot est dans sa description
- [ ] Tapez `zzzz` : un état vide propose de parcourir la boutique
- [ ] L'adresse contient votre terme : elle se partage telle quelle

### 3.10 Liens non construits

- [ ] Cliquez sur l'icône de compte, ou sur « Recettes » : vous arrivez sur « Cette page n'est
      pas encore en ligne »
- [ ] L'en-tête et le pied de page restent affichés — ce n'est pas la page d'erreur brute du serveur
- [ ] Le bouton « Retour à l'accueil » fonctionne

### 3.11 Infolettre

- [ ] Entrez une adresse invalide, par exemple `abc` : un message explique quoi corriger
- [ ] Entrez une adresse valide : le message confirme l'inscription et annonce un courriel
- [ ] Vous recevez le courriel de bienvenue (au prochain passage du cron, voir §5)
- [ ] Réinscrivez **la même adresse** : le message est identique, et aucun second courriel ne
      part. C'est voulu — répondre « vous êtes déjà inscrit » révélerait quelles adresses le sont

### 3.12 Accessibilité

- [ ] Appuyez sur `Tab` dès l'ouverture de la page : un lien « Aller au contenu principal » apparaît
- [ ] Continuez au `Tab` : chaque élément actif est entouré d'un anneau vert bien visible
- [ ] Aucun élément ne se laisse traverser sans qu'on voie où l'on se trouve
- [ ] Si vous avez activé « Réduire les animations » dans les réglages de votre système, plus rien
      ne bouge au survol

### 3.13 Le parcours complet des courriels

C'est le test le plus utile aujourd'hui, et le seul qui traverse tout le système. Comptez
vingt minutes, et gardez votre boîte de réception ouverte à côté.

**Avant de commencer**, sachez comment un courriel voyage : une action ne l'envoie pas, elle le
**met en file d'attente** en base. Un cron GitHub Actions vide cette file **toutes les cinq
minutes**. Un courriel qui n'arrive pas dans la seconde n'est donc pas un bogue — voyez §5 pour
le déclencher à la main sans attendre.

### Étape 1 — Passer commande

- [ ] Sur <https://atlantiqueexport.vercel.app>, ajoutez deux ou trois produits au panier
- [ ] Passez commande avec **votre vraie adresse courriel**
- [ ] Notez le numéro affiché, par exemple `AE-2026-00009`

Deux courriels doivent arriver :

- [ ] **« Votre commande est confirmée »** — vérifiez que **tous les articles y figurent**, avec
      le sous-total, les frais et le total. C'était le défaut le plus grave : la liste partait vide
- [ ] **« Finalisez votre commande par virement Interac »** — l'adresse affichée doit être
      **exportatlantique@gmail.com**, le montant doit correspondre au total, et le numéro de
      commande doit apparaître comme message à inscrire
- [ ] Aucune section « question de sécurité » : le dépôt automatique est activé
- [ ] Ouvrez-les **sur votre téléphone** : rien ne doit dépasser sur le côté ni être coupé

### Étape 2 — Encaisser le virement

- [ ] Faites un vrai virement de test, ou passez directement à la validation
- [ ] Dans `/admin`, ouvrez la commande et cliquez « J'ai reçu le virement »
- [ ] Vous recevez **« Votre paiement est confirmé »**, qui cite le numéro de commande

### Étape 3 — Faire avancer la commande

Faites passer la commande d'un statut au suivant, en attendant le courriel à chaque fois :

- [ ] « En préparation » → **« Votre commande est en préparation »**
- [ ] « Prête » → **« Votre commande vous attend »**, avec le point de ramassage et le créneau
- [ ] « En livraison » → **« Votre commande est en route »**
- [ ] « Livrée » → **« Votre commande a été livrée »**

### Étape 4 — Le piège à vérifier

- [ ] Revenez sur la commande et **recliquez** sur un statut déjà atteint
- [ ] **Aucun second courriel ne doit partir.** C'est garanti en base, pas dans le navigateur :
      la commande n'est mise à jour que si son statut change réellement

### Ce qui doit être vrai à la fin

Une commande, huit courriels reçus, aucun doublon, et chaque montant identique à celui de la
page de confirmation.

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

## 5. Piloter la file d'attente des courriels

Un courriel mis en file part au prochain passage du cron, **dans les cinq minutes**. Pour ne pas
attendre pendant un test :

1. Ouvrez <https://github.com/sadyfalilou/atlantiqueexport/actions>
2. Choisissez « Traiter la queue de courriels » dans la colonne de gauche
3. Bouton **« Run workflow »** → la file est vidée en une dizaine de secondes

Une exécution verte qui affiche `{"success":true,"message":"Email queue processed"}` a bien
fait son travail — y compris quand la file était vide.

**Si les courriels cessent d'arriver**, regardez dans cet ordre :

| Symptôme | Cause probable |
| --- | --- |
| Le workflow échoue en `401` | `CRON_SECRET` diffère entre Vercel et les secrets GitHub |
| Le workflow ne se déclenche plus seul | GitHub désactive les tâches planifiées après 60 jours sans activité sur le dépôt |
| Le workflow est vert mais rien n'arrive | Regardez la colonne `resend_error` de la table `email_queue` |

**Voir les modèles sans rien envoyer :**

```bash
npm run emails:preview
```

Rend les douze modèles dans les deux langues. Ouvrez ensuite
<http://localhost:3000/_apercus-courriels/index.html> avec `npm run dev`. Rien n'est envoyé,
rien n'est écrit en base : c'est le bon outil pour juger une formulation ou une mise en page.

## 6. Vérifier le code

```bash
npm run check
```

Lance le linter, la vérification TypeScript et les tests unitaires. À faire passer avant chaque
commit.

## 7. Un désagrément connu du mode développement

S'il vous arrive de voir un libellé brut à l'écran — `search.title` au lieu de « Rechercher » —
c'est que le serveur de développement garde une copie périmée des fichiers de traduction.
Arrêtez-le avec `Ctrl` + `C` et relancez `npm run dev`. Cela n'affecte que le développement,
jamais un site déployé.

## 8. Me signaler un problème

Le plus utile, dans l'ordre : sur quelle page, à quelle largeur d'écran ou sur quel appareil, ce
que vous attendiez, ce qui s'est produit. Une capture d'écran vaut souvent mieux qu'un paragraphe.

Si le terminal affiche une erreur, copiez-la en entier. Et si quelque chose vous paraît laid,
lourd ou confus, dites-le : c'est aussi un défaut, même sans message d'erreur.
