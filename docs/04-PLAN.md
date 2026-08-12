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

## Lot 2 — Base de données et données de démonstration ⬜

- Migrations Supabase : catalogue, stock, panier, commandes, logistique, arrivages, contenu, rôles
- Politiques RLS sur chaque table, refus par défaut
- Fonctions SQL : `reserve_stock`, `release_stock`, `has_staff_role`, génération du numéro de commande
- Seed du catalogue de départ (poudres, cocktails, céréales, collations, thés, plats, fruits) avec
  **prix de démonstration explicitement marqués**
- Types TypeScript générés depuis le schéma
- **Vérification** : migrations rejouables à neuf, tests SQL sur la réservation concurrente

## Lot 3 — Catalogue, recherche et filtres ⬜

- Page boutique et pages catégories, rendues côté serveur
- Filtres : catégorie, marque, origine, prix, format, disponibilité, température, promotion,
  nouveauté, vente en gros — état porté par l'URL, donc partageable et indexable
- Tris : popularité, nouveautés, prix croissant/décroissant, promotions
- Feuille de filtres plein écran sur mobile
- Recherche instantanée avec suggestions (`/api/recherche`, anti-rebond)
- **Vérification** : chaque filtre testé unitairement, parcours de recherche en end-to-end

## Lot 4 — Fiche produit ⬜

- Galerie, sélecteur de format, options de préparation du poisson, prix à l'unité de mesure
- États de stock, alerte de retour en stock, bouton de réservation si arrivage
- Onglets description / ingrédients / allergènes / nutrition / conservation
- Produits complémentaires et recettes associées
- Données structurées `Product` + fil d'Ariane
- **Vérification** : test end-to-end du choix de format et d'option de préparation

## Lot 5 — Panier et règles logistiques ⬜

- Panier serveur avec cookie `httpOnly`, fusion à la connexion
- Tiroir panier et page panier, modification des quantités, suppression
- **Calcul des modes de réception compatibles** selon les températures présentes, avec explication
  en clair lorsqu'un mode est écarté
- Recalcul systématique des prix côté serveur
- **Vérification** : tests unitaires sur la matrice de compatibilité, end-to-end d'ajout au panier

## Lot 6 — Livraison, ramassage et créneaux ⬜

- Sélection du mode, validation du code postal par zone, calcul des frais et du seuil de gratuité
- Calendrier des créneaux avec capacité restante, jours bloqués
- Administration des zones, créneaux et règles
- **Vérification** : test de réservation concurrente d'un créneau à capacité 1

## Lot 7 — Authentification et espace client ⬜

- Supabase Auth : courriel/mot de passe et lien magique, réinitialisation
- **Commande invité autorisée** avec suivi par jeton
- Espace client : commandes, détails, suivi, factures PDF, recommander, adresses, profil
- Demande de compte professionnel avec validation manuelle
- **Vérification** : end-to-end connexion, commande invité, recommande

## Lot 8 — Paiement et commandes ⬜

- Tunnel de commande en une page, quatre sections, validation Zod partagée
- **Interac** : commande en attente, instructions à l'écran et par courriel, validation manuelle
  par un administrateur, journalisée dans le journal d'audit
- **Paiement au ramassage** pour les commandes récupérées sur place
- Machine à états des commandes avec journal d'événements
- Réservation de stock à la commande, avec expiration et libération automatique si le virement
  n'arrive pas dans le délai imparti
- ~~Stripe, Apple Pay, Google Pay~~ → reporté en phase 2 (voir les décisions de cadrage)
- **Vérification** : test de double soumission, expiration d'une réservation non payée

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
