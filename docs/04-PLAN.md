# Étape 4 — Plan d'implémentation

_Dernière mise à jour : 11 août 2026_

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
- ⬜ Recherche instantanée avec suggestions (`/api/recherche`, anti-rebond)
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

⚠️ **`INTERAC_RECIPIENT_EMAIL` doit rester vide** tant que l'adresse réelle n'est pas connue.
Elle s'affiche telle quelle au client comme destination de son virement. Tant qu'elle est vide,
la page affiche « adresse à confirmer » — ce qui vaut infiniment mieux qu'une adresse d'exemple
vers laquelle quelqu'un enverrait de l'argent.

## Lot 9 — Administration ⬜

- Layout `/admin` protégé côté serveur, rôles et journal d'audit
- Tableau de bord : chiffre d'affaires, commandes du jour, paiements en attente, préparations,
  ramassages, livraisons, stocks faibles, expirations proches, prochains arrivages, meilleures ventes
- Gestion : produits, variantes, catégories, marques, fournisseurs, images
- Gestion : commandes, paiements, validation Interac, remboursements
- **Vérification** : test d'accès refusé pour chaque rôle non autorisé

## Lot 10 — Stocks ⬜

- Lots, dates d'expiration, mouvements, ajustements, pertes, alertes de seuil
- Historique complet et traçable
- **Vérification** : test de concurrence sur la survente, cohérence du registre de mouvements

## Lot 11 — Arrivages et précommandes ⬜

- Page publique des arrivages, détail, statuts, quantités réservables
- Réservation avec acompte optionnel, alertes d'arrivage
- Administration des arrivages et conversion en stock à réception
- **Vérification** : end-to-end de réservation, notification à la mise à disposition

## Lot 12 — Courriels transactionnels ⬜

- Douze modèles bilingues via Resend (bienvenue, confirmation, Interac en attente, paiement
  confirmé, préparation, prêt pour ramassage, en livraison, livrée, précommande, arrivage
  disponible, retour en stock, réinitialisation)
- File d'envoi avec relance en cas d'échec
- **Vérification** : rendu de chaque modèle dans les deux langues, envoi réel en test

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
