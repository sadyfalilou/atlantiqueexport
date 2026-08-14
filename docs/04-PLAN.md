# Étape 4 — Plan d'implémentation

_Dernière mise à jour : 13 août 2026_

Le plan est découpé en lots courts et vérifiables. Chaque lot se termine par : `npm run lint`,
`npm run typecheck`, les tests concernés, et une vérification du rendu à 320 px et à 1280 px.
Une fonctionnalité n'est cochée que si elle a été exécutée, jamais sur la seule foi du code écrit.

Légende : ✅ terminé · 🚧 en cours · ⬜ à faire

## Décisions de cadrage (11 août 2026)

Trois arbitrages demandés par Atlantique Export, qui réduisent le périmètre du MVP :

1. **Stripe est reporté.** Aucun paiement par carte au lancement. Le MVP s'appuie sur le
   **virement Interac** et le paiement au ramassage. L'intégration Stripe reste conçue dans
   l'architecture et passe en phase 2 ; c'est le blocage le plus lourd qui disparaît, puisqu'il
   n'y a plus de compte marchand à faire activer avant la mise en ligne.
2. **Le calcul des taxes est reporté.** Pas de TPS/TVQ calculée automatiquement pour l'instant.
   Le champ `tax_class` reste dans le schéma mais n'est pas exploité. ⚠️ À revoir impérativement
   avant de vendre réellement : dès que l'entreprise est inscrite aux fichiers de la TPS et de la
   TVQ, la taxe doit figurer sur la facture. C'est une obligation légale, pas une option.
3. **Livraison au Canada uniquement.** Aucune expédition internationale. Les zones, les adresses
   et les provinces se limitent au Canada.

---

## Lot 0 — Fondations ✅

- ✅ Audit du dépôt, architecture, design system, plan (ce document)
- ✅ Scaffold Next.js 16 + TypeScript strict + Tailwind 4 + ESLint
- ✅ Dépendances : next-intl, Supabase, Stripe, Resend, Zod, React Hook Form, Vitest, Playwright
- ✅ `.env.example` documenté, `.gitignore` vérifié
- ✅ Dépôt Git initialisé

## Lot 1 — Design system et coquille du site ✅

- ✅ Jetons de couleur, typographie, espacements dans `globals.css` (`@theme` Tailwind 4)
- ✅ Polices Fraunces + Inter via `next/font`
- ✅ Primitives : `Button`, `Badge`, `Card`, `Input`, `Container`, `Section`
- ✅ Bilinguisme next-intl : routage `[locale]`, messages `fr.json` / `en.json`
- ✅ En-tête, méga-menu Boutique, navigation mobile, barre inférieure, pied de page
- ✅ Page d'accueil complète avec toutes les sections demandées
- **Vérification** : lint, typecheck, build de production, rendu 320 px → 1280 px

## Lot 2 — Base de données et données de démonstration 🚧

Projet Supabase créé en région `ca-central-1`, avec « Automatically expose new tables »
**désactivé** et l'activation automatique de RLS **activée**. Conséquence assumée : aucune table
n'est lisible tant qu'un `GRANT` explicite ne l'autorise pas, table par table.

- ✅ Structure `supabase/` et pipeline de migrations, vérifié contre la base réelle
- ✅ Migration `foundations` : 14 types énumérés, `touch_updated_at`, `has_staff_role`,
  `is_staff`, `staff_roles`, `profiles` et création automatique du profil à l'inscription
- ✅ Migration `catalog` : catégories, marques, fournisseurs, produits, images, variantes,
  options de préparation, produits associés — avec RLS et privilèges
- ✅ Le prix de gros (`wholesale_price_cents`) est exclu des privilèges accordés au public :
  il est refusé par PostgreSQL (erreur 42501), pas seulement masqué par l'interface
- ✅ Stock : lots, niveaux, registre des mouvements, et les fonctions
  `reserve_stock`, `release_stock`, `consume_stock`, `receive_stock`
- ✅ Panier et commandes, paiements, journal d'événements, numérotation `AE-AAAA-NNNNN`
- ✅ Logistique : points de ramassage, zones, créneaux avec capacité garantie, jours bloqués
- ✅ Arrivages, réservations, alertes de retour en stock
- ✅ Contenu : recettes, pages, infolettre, avis modérés, comptes professionnels, journal d'audit
- ✅ Privilèges de `service_role` (voir l'écueil ci-dessous)
- ✅ Import du catalogue Sonagoo : 42 produits, 83 formats, marque et fournisseur.
  **Aucun prix repris du catalogue FCFA** : les variantes portent `price_is_provisional`,
  les produits restent non publiés, et un déclencheur en base refuse de publier un produit
  dont une variante attend son prix. Le fichier `docs/prix-a-definir.csv` liste les 83 formats
  à chiffrer en dollars canadiens.
- ✅ **Le site lit la base.** `src/lib/supabase/server.ts` + réécriture de
  `src/lib/catalog/queries.ts`. Les données de démonstration du front sont supprimées, avec
  elles les poissons qui n'avaient jamais existé au catalogue d'Atlantique Export.
- ✅ Prix et stocks de démonstration, à la demande d'Atlantique Export, pour rendre le site
  présentable en attendant la grille réelle. Voir l'encadré ci-dessous.
- ✅ Pulpe de madd congelée, marque maison, ajoutée au catalogue
- ✅ Six recettes publiées
- ⬜ Import des prix réels depuis `docs/prix-a-definir.csv`
- ⬜ Reste du catalogue : poissons, fruits et légumes (autres fournisseurs, non encore
  disponibles)
- ⬜ Types TypeScript générés depuis le schéma, en remplacement de `src/lib/types.ts`

### ⚠️ À faire impérativement avant la première vente

Prix et stocks actuellement en base sont **fictifs**. Trois gestes, dans cet ordre :

1. saisir les vrais prix, puis passer `product_variants.price_is_provisional` à faux ;
2. passer `site_settings.allow_provisional_prices` à faux — cela réactive le déclencheur qui
   interdit de publier un produit non chiffré, et fait disparaître le bandeau du site ;
3. remettre les stocks à leur valeur réelle : `update public.stock_levels set quantity_on_hand = 0;`

**Écueil rencontré, à retenir.** Désactiver « Automatically expose new tables » retire aussi les
privilèges de `service_role`, et pas seulement ceux de `anon` et `authenticated` — ce que rien
n'annonce. Le serveur recevait « 42501 permission denied » sur la moindre lecture. La migration
`service_role_grants` rétablit ces droits et pose des privilèges par défaut, pour que les futures
tables n'aient pas à y penser.

**Vérifications exécutées contre la base réelle**

- `npm run smoke:stock` — 11 assertions : une réservation qui dépasse le stock est refusée,
  l'état reste intact après le refus, et le registre ne garde aucune trace de l'opération annulée
- `npm run smoke:security` — 24 assertions : le catalogue est lisible, tandis que prix de gros,
  quantités détenues, capacités, fournisseurs, paniers, commandes, paiements, adresses, liste
  d'infolettre et journal d'audit sont refusés par PostgreSQL (erreur 42501)
- ⬜ Reste à faire : rejouer les migrations sur une base vierge

## Lot 3 — Catalogue et filtres 🚧

- ✅ Page boutique et pages catégories, rendues côté serveur
- ✅ Filtres catégorie, température, promotion, nouveauté et fourchette de prix — l'état vit
  dans l'URL, donc partageable, indexable et compatible avec le bouton « précédent »
- ✅ Chaque filtre est un LIEN et le prix un formulaire GET : la page fonctionne sans JavaScript
- ✅ Tris : popularité, nouveautés, prix croissant, prix décroissant, promotions
- ✅ Tiroir de filtres sur mobile, fermé par Échap
- ✅ Pages Nouveautés et Promotions
- ⬜ Filtres marque, origine, format et vente en gros
- ✅ **Recherche produit** : insensible aux accents et à la casse, sur le nom et la
  description, dans les deux langues. Une correspondance en début de nom passe devant.
- ⬜ Suggestions instantanées sous le champ de l'en-tête (anti-rebond)
- **Vérification** : 21 tests unitaires sur les filtres et le tri, plus un contrôle des pages
  rendues (comptages, ordre des prix, traduction)

## Lot 4 — Fiche produit 🚧

- ✅ Sélecteur de format, prix qui suit, prix au kilo, fil d'Ariane
- ✅ Badges de température et d'état de stock, mention du prix provisoire
- ✅ Description, allergènes, origine, conservation
- ✅ Données structurées `Product` — **émises seulement si les prix sont définitifs**, pour ne
  pas alimenter les moteurs de recherche avec des montants de démonstration
- ✅ Le bouton d'ajout au panier est présent mais désactivé, avec une explication écrite : le
  panier n'existe pas encore, et un bouton actif qui ne ferait rien serait un mensonge
- ⬜ Galerie d'images (en attente de photographies)
- ⬜ Options de préparation du poisson, alerte de retour en stock, réservation d'arrivage
- ⬜ Produits complémentaires et recettes associées

## Lot 5 — Panier et règles logistiques 🚧

- ✅ Panier serveur, identifié par un jeton de 32 octets dans un cookie `httpOnly`
- ✅ Page panier : quantités modifiables, retrait, récapitulatif
- ✅ **Modes de réception recalculés à chaque affichage** selon les températures présentes, avec
  le motif écrit en clair lorsqu'un mode est écarté
- ✅ Ajout au panier depuis la fiche produit, avec sélecteur de quantité borné par le stock
- ✅ Pastille de comptage dans l'en-tête
- ⬜ Tiroir panier (le panier est pour l'instant une page)
- ⬜ Fusion du panier invité à la connexion (lot 7)

**Trois garanties, et comment elles sont tenues**

1. **Aucun prix ne transite par le navigateur.** `cart_items` ne retient qu'un identifiant de
   variante et une quantité ; les montants sont relus depuis le catalogue à chaque affichage.
2. **Le panier est inaccessible depuis le client.** Les tables `carts` et `cart_items` n'ont aucun
   privilège public ; tout passe par la clé de service, et le jeton vit dans un cookie `httpOnly`
   que le JavaScript de la page ne peut pas lire.
3. **La pastille de l'en-tête n'est pas rendue côté serveur.** Lire le cookie dans l'en-tête aurait
   rendu dynamiques toutes les pages du site ; elle interroge donc `/api/panier` après affichage.
   L'accueil et les 86 fiches produit restent prégénérés.

**Vérifications exécutées**

- 14 tests unitaires sur le calcul des montants et la compatibilité logistique
- Parcours réel : ajout de 3 cafés puis d'une pulpe de madd, pastille à 4, sous-total 67,96 $
- Retrait de la pulpe : sous-total 50,97 $ et **l'expédition redevient possible**
- Formulaire falsifié à 999 puis à 50 exemplaires : refusé côté serveur dans les deux cas, avec
  deux messages distincts, et le panier en base reste inchangé

## Lot 6 — Livraison, ramassage et créneaux 🚧

- ✅ Point de ramassage, deux zones de livraison, créneaux sur 14 jours glissants
- ✅ Zone déduite du **code postal**, jamais reçue du formulaire — sinon il suffirait de
  désigner la zone la moins chère pour payer moins
- ✅ Frais, seuil de gratuité et montant minimum appliqués dans la transaction
- ✅ Capacité des créneaux garantie par contrainte : un créneau complet n'est plus proposé
- ⬜ Administration des zones et créneaux (lot 9)
- ⬜ Jours bloqués

⚠️ **Adresse, horaires, tarifs et seuils sont PROVISOIRES.** Ce que le script pose est marqué
comme tel — le point de ramassage s'intitule « adresse à confirmer ». Les préfixes de codes
postaux, eux, sont exacts : H1 à H9 pour l'île de Montréal, J pour les couronnes.

## Lot 7 — Authentification et espace client ⬜

- Supabase Auth : courriel/mot de passe et lien magique, réinitialisation
- **Commande invité autorisée** avec suivi par jeton
- Espace client : commandes, détails, suivi, factures PDF, recommander, adresses, profil
- Demande de compte professionnel avec validation manuelle
- **Vérification** : end-to-end connexion, commande invité, recommande

## Lot 8 — Paiement et commandes 🚧

- Tunnel de commande en une page, quatre sections, validation Zod partagée
- **Interac** : commande en attente, instructions à l'écran et par courriel, validation manuelle
  par un administrateur, journalisée dans le journal d'audit
- **Paiement au ramassage** pour les commandes récupérées sur place
- Machine à états des commandes avec journal d'événements
- Réservation de stock à la commande, avec expiration et libération automatique si le virement
  n'arrive pas dans le délai imparti
- ~~Stripe, Apple Pay, Google Pay~~ → reporté en phase 2 (voir les décisions de cadrage)
- ✅ Tunnel de commande en une page, validation Zod côté serveur
- ✅ Commande créée en **une seule transaction PostgreSQL** : réservation du stock, prise de
  créneau, écriture des lignes et vidage du panier réussissent ou échouent ensemble
- ✅ Instructions Interac sur la page de confirmation, avec le numéro à inscrire en message
- ✅ Commande sans compte, consultable par un jeton en cookie `httpOnly`
- ⬜ Validation administrateur des virements (lot 9)
- ⬜ Expiration automatique des réservations non payées
- ⬜ Courriels de confirmation (lot 12)

**Pourquoi une fonction SQL plutôt que plusieurs appels**

Passer commande enchaîne quatre écritures qui doivent toutes réussir ou toutes échouer. Faites
depuis l'application, en autant d'appels HTTP, elles laisseraient du stock réservé pour une
commande inexistante dès qu'une ligne échoue au milieu — et la compensation peut elle-même
échouer. `place_order` fait tout dans une transaction : la moindre exception annule l'ensemble.

**Vérifié** — `npm run smoke:order`, 14 assertions :

- commande valide : total calculé en base, stock réservé, panier vidé, numéro `AE-2026-00001`
- stock insuffisant : refus, **aucune commande fantôme**, aucune réservation résiduelle,
  panier intact
- surgelé par la poste : refusé
- panier vide : refusé

### Virement Interac — adresse réelle en place (13 août 2026)

`INTERAC_RECIPIENT_EMAIL` vaut **exportatlantique@gmail.com**, en local et dans les variables
Vercel (production et prévisualisation). C'est cette adresse que la page de confirmation et le
courriel d'instructions affichent désormais au client comme destination de son virement.

`INTERAC_SECURITY_ANSWER` reste **vide**, et c'est voulu : le dépôt automatique est activé sur
le compte, donc aucune question de sécurité n'est posée. Le courriel supprime alors la section
correspondante au lieu d'annoncer une question qui n'existe pas.

Le garde-fou d'origine tient toujours : si la variable était vidée, la page afficherait de
nouveau « adresse à confirmer » et le courriel dirait de ne rien envoyer, plutôt que d'exposer
une adresse d'exemple vers laquelle quelqu'un enverrait de l'argent.

## Lot 9 — Administration 🚧

- ✅ Connexion par Supabase Auth, protection **côté serveur** dans le layout `(protege)` :
  toute page passe par le garde avant qu'un octet de contenu ne soit rendu
- ✅ Tableau de bord : virements à valider, commandes à préparer, ramassages et livraisons
  du jour, encaissé, stocks faibles
- ✅ Liste des commandes, filtres « à encaisser » et « à préparer »
- ✅ Fiche commande : contenu, client, réception, avancement du statut
- ✅ **Validation d'un virement Interac**, réservée aux rôles `super_admin` et `manager`,
  journalisée dans `admin_audit_log` avec l'identité de son auteur
- ✅ Consultation des stocks
- ✅ **Gestion des prix** : saisie format par format, en dollars, virgule ou point acceptés.
  Enregistrer retire la mention « prix de démonstration » du format concerné.
- ✅ Publication et retrait d'un produit
- ✅ Bascule de la boutique en **mode réel**, refusée tant qu'un format actif porte encore un
  prix de démonstration — passer outre publierait des montants inventés comme s'ils étaient
  réels. Réservée au super administrateur.
- ⬜ Gestion des catégories, marques, descriptions et images
- ⬜ Mouvements de stock (réception, ajustement, perte)
- ⬜ Arrivages, comptes professionnels, promotions, rapports

**Trois précautions**

1. **Les actions revérifient le rôle.** Le garde du layout protège l'affichage ; il ne protège
   pas les Server Actions, appelables directement. Sans ce second contrôle, connaître
   l'identifiant d'une commande suffirait à la déclarer payée.
2. **Le message d'erreur de connexion est identique** pour un compte inexistant et un mot de
   passe erroné — les distinguer révélerait quelles adresses existent.
3. **Le rôle est relu en base à chaque requête.** Retirer un accès prend effet aussitôt, sans
   attendre l'expiration d'une session.

**Vérifié** — avec des comptes temporaires, créés puis supprimés :

- accès sans session : `/admin`, `/admin/commandes` et `/admin/stocks` redirigent vers la
  connexion
- compte **sans rôle** : refusé avec « Ce compte n'a pas accès à l'administration »
- compte `super_admin` : tableau de bord affichant le virement en attente
- validation d'un encaissement : commande passée en `confirmed`/`paid`, ligne de paiement
  créée avec l'identité du valideur, entrée au journal d'audit, historique de statut complété

### Saisir vos vrais prix

`/admin/produits` affiche combien de formats attendent encore un prix. Ouvrez un produit,
saisissez les montants, enregistrez : la mention « démo » disparaît de ce produit et le
compteur décroît. Quand il atteint zéro, un bouton propose de passer la boutique en mode réel,
ce qui retire le bandeau du site et réactive le garde-fou en base.

Un prix barré inférieur ou égal au prix de vente est refusé : la réduction affichée serait
fausse.

### Premier accès

Le script ne crée aucun compte et ne manipule aucun mot de passe. Créez l'utilisateur dans
Supabase — Authentication → Users → Add user — puis accordez-lui son rôle :

```bash
npm run grant:admin -- votre@courriel.ca
```

## Lot 10 — Stocks ⬜

- Lots, dates d'expiration, mouvements, ajustements, pertes, alertes de seuil
- Historique complet et traçable
- **Vérification** : test de concurrence sur la survente, cohérence du registre de mouvements

## Lot 11 — Arrivages et précommandes ⬜

- Page publique des arrivages, détail, statuts, quantités réservables
- Réservation avec acompte optionnel, alertes d'arrivage
- Administration des arrivages et conversion en stock à réception
- **Vérification** : end-to-end de réservation, notification à la mise à disposition

## Lot 12 — Courriels transactionnels 🚧

- ✅ Migration `email_queue` avec statuts et système de relance (backoff exponentiel)
**Trois défauts de rendu corrigés, chacun invisible au typecheck**

1. **`display: flex` pour aligner les totaux.** Outlook rend le HTML avec le moteur de
   Word : le sous-total et son montant se retrouvaient sur deux lignes. Tout est
   maintenant en tableaux.
2. **Aucun `<head>`.** Sans balise de fenêtre d'affichage, un téléphone suppose une page
   de 980 px et réduit le courriel à l'échelle — illisible là où on le lit le plus.
3. **`width="600"` en attribut HTML.** Il impose une largeur intrinsèque que `max-width`
   ne peut plus contraindre : le courriel débordait de l'écran et coupait la colonne des
   totaux. Vérifié à 390 px : plus aucun élément hors cadre.

- ✅ Douze modèles bilingues via Resend, rendus en JSX/React :
  - Bienvenue, confirmation de commande, attente Interac, paiement confirmé, préparation,
    ramassage, livraison, livrée, précommande, arrivage disponible, stock, réinitialisation
- ✅ Client Resend avec validation des clés au démarrage
- ✅ Fonction `queueEmail()` pour mettre un courriel en queue
- ✅ Fonction `processEmailQueue()` pour traiter les courriels avec gestion d'erreurs
- ✅ Route `/api/cron/send-emails`, fermée derrière `CRON_SECRET` : sans le secret elle
  répond 503 plutôt que de laisser n'importe qui vider la queue et épuiser le quota Resend
- ✅ Cron **externe** toutes les 5 minutes (`.github/workflows/traiter-courriels.yml`).
  Le cron de Vercel est écarté : le plan hobby ne l'autorise qu'une fois par jour, une
  confirmation de commande passée à 10 h serait partie le lendemain matin.
- ✅ Intégration dans newsletter (souscription) et commandes
- ✅ **Courriels de statut branchés dans l'administration** : `payment_confirmed` à la
  validation d'un virement, puis `order_preparing`, `ready_for_pickup`, `in_delivery` et
  `order_delivered` au fil de l'avancement. Le courriel de ramassage porte le point, le
  créneau et les consignes, relus en base.
- ✅ **Un changement de statut n'envoie qu'un seul courriel.** L'écriture porte un
  `neq` sur le statut visé : PostgreSQL ne met la ligne à jour que si elle n'y est pas
  déjà, et ne renvoie rien au second appel. Deux clics, ou deux employés simultanés,
  ne déclenchent qu'un envoi — ce qu'un contrôle lu-puis-écrit en JavaScript ne
  garantirait pas.
- ✅ **23 tests de rendu** : les 5 modèles de statut, dans les deux langues, avec et
  sans nom de client
- ✅ **Habillage refait sur la charte** : bandeau vert du logo, filet orange, encadrés
  crème, bouton mango-700 (le seul orange qui porte du texte blanc). Aperçu des douze
  modèles dans les deux langues : `npm run emails:preview`.
- ✅ **Courriel de confirmation complet** : les articles, le sous-total et les frais sont
  relus depuis `order_items`. Ils étaient auparavant vides et remplacés par « À confirmer ».
- ⬜ Intégration des événements de stock et d'arrivage (lots 10 et 11)

**Vérifié — la chaîne complète a envoyé de vrais courriels** (14 août 2026, 01 h 50 UTC)

Deux courriels mis en queue par une commande de test la veille à 20 h 54 sont restés
`pending` cinq heures, faute de cron. La première exécution du workflow GitHub Actions les
a traités : passage à `sent`, `resend_message_id` renseigné pour les deux.

- `order_confirmation` → envoyé à 01:50:45.92
- `interac_pending` → envoyé à 01:50:45.76

Le maillon qui manquait n'était donc ni les modèles ni la queue, mais l'ordonnanceur.

⚠️ **Le nom du client n'est pas stocké pour une commande en ramassage.** `orders` ne le
retient que dans `delivery_address`, absente dans ce cas — le formulaire le collecte puis
le jette. Les modèles saluent donc sans nom (« Bonjour, votre commande… »), ce qui se lit
correctement mais reste un pis-aller. Le vrai correctif demande une colonne
`customer_name` et une reprise de `place_order`.

## Lot 13 — Contenu éditorial et pages institutionnelles ⬜

- Recettes avec « Ajouter les ingrédients au panier », données structurées `Recipe`
- Pages institutionnelles administrables ; **brouillons juridiques marqués « à faire valider »**
- **Vérification** : audit d'accessibilité de chaque page

## Lot 14 — SEO, performance, PWA ⬜

- Métadonnées par page, sitemap, robots, Open Graph, `hreflang`
- Données structurées `Organization`, `Product`, `Breadcrumb`, `Recipe`
- Produit épuisé : page conservée et indexable, jamais de 404 inutile
- Manifeste PWA, service worker, mode hors ligne dégradé, installation sur mobile
- Optimisation des images, chargement différé, budget Lighthouse ≥ 90
- **Vérification** : Lighthouse mobile et desktop, test d'installation PWA

## Lot 15 — Tests et déploiement ⬜

- Tests unitaires : prix, taxes TPS/TVQ, compatibilité logistique, stock, validation
- Tests end-to-end : parcours d'achat carte, parcours Interac, commande invité, réservation
- Vérification d'accessibilité automatisée sur les pages clés
- Déploiement Vercel, variables d'environnement, domaine, webhooks de production
- Documentation d'exploitation pour l'équipe

---

## Ordre de priorité si le temps manque

Les lots 2 à 8 constituent le **minimum commercialisable** : sans eux, on ne peut pas vendre. Le
lot 9 (administration) est indispensable pour exploiter le site au quotidien. Les lots 11 à 14
peuvent être livrés après une première mise en ligne, dans cet ordre : courriels, arrivages,
recettes, PWA.
