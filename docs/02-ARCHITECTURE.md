# Étape 2 — Architecture

_Dernière mise à jour : 11 août 2026_

## 2.1 Principes directeurs

Cinq règles gouvernent toutes les décisions techniques du projet.

1. **La base de données est l'autorité.** Prix, stock, taxes et règles logistiques sont calculés
   côté serveur à partir de PostgreSQL. Le navigateur affiche des résultats, il n'en produit jamais.
2. **Rien de sensible ne quitte le serveur.** Les clés Stripe secrètes, la clé `service_role`
   Supabase et les identifiants Resend vivent dans des modules marqués `server-only`.
3. **Le catalogue est administrable.** Aucune catégorie, marque, zone de livraison ou traduction
   d'interface n'est codée en dur dans les composants.
4. **Chaque page fonctionne sans JavaScript client autant que possible.** Rendu serveur par défaut,
   interactivité ajoutée seulement là où elle apporte quelque chose (panier, filtres, recherche).
5. **On ne déclare pas une fonctionnalité terminée sans l'avoir exécutée.** Lint, typecheck, tests
   et vérification visuelle avant de passer à l'étape suivante.

## 2.2 Vue d'ensemble technique

```
Navigateur / PWA
      │
      ▼
Next.js 16 (App Router) sur Vercel
  ├─ Server Components : lecture du catalogue, pages, SEO
  ├─ Server Actions    : panier, formulaires, checkout (validation Zod)
  ├─ Route Handlers    : webhooks Stripe, sitemap, OG images
  └─ Client Components : filtres, recherche, tiroir panier, admin interactif
      │
      ├──────────────► Supabase (PostgreSQL + Auth + Storage)
      │                 RLS activé sur toutes les tables
      ├──────────────► Stripe (PaymentIntents, webhooks signés)
      └──────────────► Resend (courriels transactionnels bilingues)
```

**Pourquoi ce choix.** Next.js sur Vercel donne le rendu serveur et le SEO nécessaires à un
catalogue produit sans infrastructure à administrer. Supabase fournit PostgreSQL — indispensable
pour des transactions de stock fiables — plus l'authentification et le stockage d'images, ce qui
évite trois fournisseurs distincts. Stripe est la référence pour les paiements canadiens et gère
Apple Pay / Google Pay sans code supplémentaire.

**Ce que ce choix n'est pas.** Ce n'est pas une architecture microservices ni un CMS headless
séparé. Pour une épicerie en ligne à lancer rapidement, un monolithe Next.js bien découpé se
maintient à moins de frais et se déploie en une commande.

## 2.3 Arborescence des routes

Toutes les pages publiques sont préfixées par la locale (`/fr/...`, `/en/...`), `fr` étant la
langue par défaut. L'administration reste en français uniquement au lancement.

```
src/app/
├── [locale]/
│   ├── page.tsx                          Accueil
│   ├── boutique/page.tsx                 Catalogue complet + filtres
│   ├── boutique/[category]/page.tsx      Catégorie (et sous-catégories)
│   ├── produit/[slug]/page.tsx           Fiche produit
│   ├── nouveautes/page.tsx
│   ├── promotions/page.tsx
│   ├── arrivages/page.tsx                Liste des prochains arrivages
│   ├── arrivages/[code]/page.tsx         Détail + réservation
│   ├── recettes/page.tsx
│   ├── recettes/[slug]/page.tsx
│   ├── marques/page.tsx
│   ├── marques/[slug]/page.tsx
│   ├── recherche/page.tsx
│   ├── panier/page.tsx
│   ├── commander/page.tsx                Tunnel de commande (une page, 4 sections)
│   ├── commande/[number]/page.tsx        Confirmation + suivi (jeton pour les invités)
│   ├── compte/
│   │   ├── page.tsx                      Tableau de bord client
│   │   ├── commandes/page.tsx
│   │   ├── commandes/[number]/page.tsx
│   │   ├── adresses/page.tsx
│   │   ├── reservations/page.tsx
│   │   └── profil/page.tsx
│   ├── pro/page.tsx                      Présentation + demande de compte professionnel
│   ├── connexion/ · inscription/ · mot-de-passe-oublie/
│   ├── a-propos/ · nos-producteurs/ · contact/ · faq/ · livraison/
│   └── politiques/[slug]/page.tsx        Pages juridiques administrables
│
├── admin/
│   ├── page.tsx                          Tableau de bord opérationnel
│   ├── produits/ · categories/ · marques/ · fournisseurs/
│   ├── stocks/ · lots/ · mouvements/
│   ├── commandes/ · paiements/ · interac/
│   ├── arrivages/ · reservations/
│   ├── clients/ · comptes-pro/
│   ├── promotions/ · codes-promo/
│   ├── livraison/ · creneaux/
│   ├── recettes/ · contenu/ · traductions/
│   └── rapports/
│
├── api/
│   ├── webhooks/stripe/route.ts          Vérification de signature obligatoire
│   ├── recherche/route.ts                Suggestions de recherche (JSON)
│   └── revalidate/route.ts               Invalidation de cache authentifiée
│
├── sitemap.ts · robots.ts · manifest.ts
└── globals.css
```

### Découpage des composants

```
src/components/
├── ui/          Primitives shadcn/ui : Button, Input, Select, Dialog, Sheet, Badge…
├── layout/      Header, MegaMenu, MobileNav, Footer, LocaleSwitcher, AnnouncementBar
├── product/     ProductCard, ProductGallery, VariantPicker, PreparationPicker,
│                PriceDisplay, StockBadge, AddToCartForm, TemperatureBadge
├── catalog/     FilterSidebar, MobileFilterSheet, SortSelect, ProductGrid, Pagination
├── cart/        CartDrawer, CartLineItem, CartSummary, FulfillmentNotice
├── checkout/    FulfillmentSelector, SlotPicker, AddressForm, PaymentMethodPicker
├── shipment/    ShipmentCard, ReservationForm, ShipmentStatusBadge
├── admin/       DataTable, StatCard, StatusSelect, ImageUploader, AuditTrail
└── shared/      EmptyState, Placeholder, Skeletons, Pagination, SeoJsonLd
```

```
src/lib/
├── supabase/    client.ts (navigateur) · server.ts (RSC/actions) · admin.ts (service_role)
├── pricing/     Calcul des lignes, taxes TPS/TVQ, promotions, tarifs pro
├── fulfillment/ Compatibilité température ↔ mode de réception, zones, créneaux
├── inventory/   Réservation, libération, mouvements
├── stripe/      PaymentIntents, webhooks, idempotence
├── email/       Modèles Resend bilingues
├── validation/  Schémas Zod partagés client/serveur
└── i18n/        Configuration next-intl, routing localisé
```

## 2.4 Modèle de données

Toutes les tables sont en `snake_case`, tous les montants en **cents entiers CAD**, tous les
horodatages en `timestamptz`. Les clés primaires sont des `uuid`.

### Catalogue

**`categories`** — hiérarchique et administrable.
`id · slug · name_fr · name_en · description_fr · description_en · parent_id → categories ·
image_url · icon · position · is_active · show_in_mega_menu · seo jsonb`

**`brands`** — `id · slug · name · logo_url · description_fr/en · origin_country · is_active · is_partner`
(Sonagoo est saisie comme marque partenaire, pas codée en dur.)

**`suppliers`** — usage interne uniquement, jamais exposé publiquement.
`id · name · country · contact_name · contact_email · contact_phone · notes`

**`products`** — l'entité éditoriale.
`id · slug · name_fr · name_en · short_description_fr/en · description_fr/en · category_id ·
brand_id · supplier_id · origin_country · temperature_class · tax_class · status ·
ingredients_fr/en · allergens text[] · nutrition jsonb · storage_fr/en · preparation_fr/en ·
is_wholesale_only · is_featured · has_preparation_options · tags text[] · published_at · seo jsonb`

**`product_images`** — `id · product_id · storage_path · alt_fr · alt_en · position · is_primary`

**`product_variants`** — **c'est ici que vivent le prix et le stock.** Un produit a une ou
plusieurs variantes ; chaque variante est une unité vendable.
```
id · product_id · sku (unique) · barcode
label_fr · label_en            ex. « Sachet 250 g », « Caisse de 10 kg »
sale_unit                      unit | bag | pack | kg | lb | case | carton
net_weight_g                   poids fixe, quand il est connu
is_variable_weight             booléen — active la logique « prix au poids »
min_weight_g · max_weight_g    bornes de la tranche, si poids variable
price_per_kg_cents             prix au kilo, si poids variable
retail_price_cents             prix particulier
wholesale_price_cents          prix professionnel (jamais affiché sans compte approuvé)
compare_at_price_cents         prix barré, pour les promotions
min_qty · step_qty             quantités minimales et pas d'incrément (vente en gros)
position · is_active
```

**`preparation_options`** et **`product_preparation_options`** — la découpe du poisson.
Les options (`entier`, `écaillé`, `vidé`, `nettoyé`, `darnes`, `filets`) sont une table de
référence ; leur activation, leur supplément de prix et leur temps de préparation sont définis
**par produit** : `product_id · option_id · price_delta_cents · prep_time_minutes · is_default · is_active`.

**`related_products`** (`product_id · related_id · relation_type`) et
**`product_recipes`** (`product_id · recipe_id`) pour les suggestions croisées.

### Stock

**`inventory_lots`** — traçabilité par lot, indispensable pour des denrées périssables.
`id · variant_id · lot_code · shipment_id · received_at · expires_at · quantity_received ·
quantity_on_hand · unit_cost_cents · origin_country`

**`stock_levels`** — une ligne par variante, agrégat lisible rapidement.
`variant_id (PK) · quantity_on_hand · quantity_reserved · low_stock_threshold`
avec `CHECK (quantity_reserved <= quantity_on_hand)` et
`quantity_available` en colonne générée `on_hand - reserved`.

**`stock_movements`** — registre en ajout seul, jamais modifié ni supprimé.
`id · variant_id · lot_id · movement_type · quantity_delta · order_id · actor_id · reason · created_at`
avec `movement_type ∈ {reception, sale, reservation, release, return, loss, adjustment, transfer}`.

**Prévention de la survente.** La réservation passe par une fonction PostgreSQL
`reserve_stock(variant_id, qty)` exécutée dans la transaction de checkout :
```sql
SELECT ... FROM stock_levels WHERE variant_id = $1 FOR UPDATE;   -- verrou de ligne
UPDATE stock_levels SET quantity_reserved = quantity_reserved + $2 WHERE variant_id = $1;
-- la contrainte CHECK fait échouer la transaction plutôt que de vendre du stock inexistant
```
Deux clients qui achètent le dernier article en même temps sont sérialisés par le verrou : le
second reçoit une erreur explicite, jamais une commande impossible à honorer.

### Panier et commandes

**`carts`** — `id · user_id (nullable) · token (cookie httpOnly) · locale · fulfillment_method ·
delivery_zone_id · slot_id · notes · expires_at`

**`cart_items`** — `id · cart_id · variant_id · quantity · preparation_option_id`
**Le panier ne stocke aucun prix.** Tout est recalculé côté serveur à l'affichage et au paiement.

**`orders`**
```
id · order_number (lisible, ex. AE-2026-00417) · user_id (nullable — commande invité autorisée)
guest_token         jeton de suivi pour les commandes sans compte
customer_type       individual | business
email · phone · locale
status              new | pending_payment | paid | confirmed | preparing |
                    ready_for_pickup | out_for_delivery | delivered | completed |
                    cancelled | refunded
payment_status      pending | authorized | paid | partially_refunded | refunded | failed
fulfillment_method  pickup | local_delivery | shipping
pickup_location_id · delivery_zone_id · slot_id · delivery_address jsonb · delivery_notes
subtotal_cents · delivery_fee_cents · discount_cents
tax_gst_cents · tax_qst_cents
total_estimated_cents · total_final_cents · weight_adjustment_cents
placed_at · created_at
```

**`order_items`** — figés au moment de la commande (« snapshot »), pour qu'une facture reste
exacte même si le catalogue change ensuite.
`id · order_id · variant_id · product_name_snapshot · sku_snapshot · unit_label_snapshot ·
preparation_snapshot · quantity · unit_price_cents · estimated_weight_g · actual_weight_g ·
line_total_cents`

**`order_events`** — historique de statut : `order_id · from_status · to_status · actor_id · note · created_at`

**`payments`** — `id · order_id · provider (stripe | interac | manual) · provider_reference ·
payment_type (full | deposit | balance | refund) · amount_cents · status · confirmed_by ·
confirmed_at · metadata jsonb`

**`stripe_webhook_events`** — `event_id (PK) · type · processed_at`. Un `INSERT` en doublon
échoue, ce qui garantit l'idempotence si Stripe rejoue un événement.

**Aucune donnée de carte bancaire n'est stockée.** Seules les références Stripe le sont.

### Logistique

**`pickup_locations`** — `id · name · address jsonb · opening_hours jsonb · instructions_fr/en · is_active`

**`delivery_zones`** — `id · name · postal_prefixes text[] · fee_cents · free_shipping_threshold_cents ·
min_order_cents · allowed_temperature_classes text[] · is_active`

**`delivery_slots`** — `id · zone_id (null = ramassage) · date · start_time · end_time ·
capacity · booked_count · method · is_active`, avec `CHECK (booked_count <= capacity)` : la capacité
d'un créneau est garantie par la base, pas par l'interface.

**`blocked_days`** — `date · reason · applies_to`

**`shipping_rules`** — expédition postale au Canada, réservée aux produits ambiants.
`id · name · provinces text[] · max_weight_g · base_fee_cents · free_threshold_cents · is_active`

### Compatibilité température ↔ mode de réception

C'est une règle métier centrale, et elle vit dans la base pour rester modifiable sans redéploiement.

| Classe de température | Ramassage | Livraison locale | Expédition postale |
| --- | --- | --- | --- |
| `ambient` (secs, poudres, céréales, thés) | ✅ | ✅ | ✅ |
| `fresh` (fruits, légumes) | ✅ | ✅ | ❌ |
| `refrigerated` (poisson frais) | ✅ | ✅ | ❌ |
| `frozen` (surgelés, pulpe de madd) | ✅ | ✅ | ❌ |

Le panier calcule l'intersection des modes autorisés par toutes les lignes. Si elle est vide ou
réduite, le client voit une explication en clair — « Votre panier contient des produits surgelés :
l'expédition postale n'est pas disponible, choisissez le ramassage ou la livraison à Montréal » —
et non un bouton grisé sans justification. Une commande mixte peut, en phase 2, être scindée en
deux livraisons.

### Arrivages et précommandes

**`shipments`** — `id · code · title_fr/en · origin_country · status · eta_date ·
reservation_deadline · hero_image · notes_fr/en`
avec `status ∈ {announced, reservations_open, in_transit, arrived, preparing, available,
completed, delayed, cancelled}`.

**`shipment_items`** — `id · shipment_id · variant_id · planned_quantity · reserved_quantity ·
deposit_cents · unit_price_cents`

**`reservations`** — `id · shipment_item_id · user_id | email · quantity · deposit_payment_id ·
status · notified_at`

**`stock_alerts`** — alertes de retour en stock : `variant_id · email · locale · created_at · notified_at`

### Clients et accès

**`profiles`** — étend `auth.users` : `id · full_name · phone · locale · customer_type ·
marketing_opt_in · created_at`

**`business_accounts`** — `id · profile_id · company_name · business_number · contact_name ·
contact_email · contact_phone · billing_address jsonb · status (pending | approved | rejected) ·
price_tier · approved_by · approved_at · notes`
**Les tarifs professionnels ne sont servis qu'aux comptes `approved`** — la vérification est faite
côté serveur, jamais par un simple masquage d'affichage.

**`addresses`**, **`quote_requests`**, **`newsletter_subscribers`**, **`reviews`**
(les avis sont en `pending` par défaut et modérés ; aucun avis fictif n'est semé).

**`staff_roles`** — `user_id · role ∈ {super_admin, manager, picker, driver, support}`

**`admin_audit_log`** — `id · actor_id · action · entity · entity_id · diff jsonb · ip · created_at`

### Contenu éditorial

**`recipes`** — `id · slug · title_fr/en · description_fr/en · image_url · prep_time_minutes ·
cook_time_minutes · servings · ingredients jsonb · steps jsonb · is_published · published_at`

**`pages`** — pages institutionnelles administrables : `slug · title_fr/en · body_fr/en · is_published`

**`ui_translations`** — surcharge éditoriale des libellés d'interface, pour corriger un texte sans
redéployer.

## 2.5 Produits vendus au poids

Le besoin : « Tilapia entier surgelé — environ 1,2 à 1,5 kg — 12,99 $/kg ». Le prix exact n'est
connu qu'à la pesée.

**MVP (livré en phase 1) — vente par tranches.** Chaque variante déclare une fourchette
(`min_weight_g`, `max_weight_g`) et un prix au kilo. La fiche affiche « environ 1,2–1,5 kg ·
12,99 $/kg · environ 15,59 $ à 19,49 $ », et le client est facturé au **poids haut de la tranche**,
avec une mention explicite : le montant est connu et définitif au moment de l'achat. C'est la seule
approche qui évite à la fois les surprises de facturation et la complexité d'une capture différée.

**Phase 2 — poids réel.** Le modèle est déjà prêt (`estimated_weight_g`, `actual_weight_g`,
`weight_adjustment_cents`). Le déroulé : préautorisation Stripe sur le montant estimé majoré de
15 % → saisie du poids réel par le préparateur → capture du montant exact (jamais supérieur à
l'autorisation) → courriel d'ajustement au client. On ne le livre pas en MVP parce qu'une capture
différée mal maîtrisée génère des litiges de paiement.

## 2.6 Paiements

**Stripe (carte, Apple Pay, Google Pay).** Le `PaymentIntent` est créé par une Server Action qui
recalcule intégralement le total depuis la base — le montant envoyé par le navigateur n'est jamais
utilisé. La commande n'est confirmée que par le **webhook** signé, pas par le retour de redirection
du navigateur, qui peut être perdu ou falsifié.

**Interac.** Le déroulé exact demandé :
1. Le client choisit Interac au paiement.
2. Une commande `pending_payment` est créée et le stock est **réservé** (avec expiration).
3. Les instructions s'affichent : adresse courriel de destination, montant, numéro de commande à
   inscrire en message.
4. Le même contenu part par courriel via Resend.
5. Un administrateur constate le virement et le valide dans `/admin/interac`.
6. La commande passe en `confirmed` ; le client reçoit la confirmation.

L'action de validation est journalisée dans `admin_audit_log` avec l'identité de l'administrateur.

**Acomptes de précommande** : même mécanique, avec `payment_type = deposit` puis `balance` à
l'arrivée de la marchandise.

## 2.7 Sécurité

- **RLS activée sur chaque table**, avec refus par défaut. Lecture publique uniquement sur le
  catalogue publié, les recettes publiées et les pages ; accès aux commandes restreint à leur
  propriétaire ; accès personnel via une fonction SQL `has_staff_role(...)`.
- **Les routes `/admin` sont protégées côté serveur** dans le layout, pas seulement par le menu.
- **Validation Zod partagée** : le même schéma valide le formulaire côté client et l'entrée côté
  serveur. La validation client est un confort d'ergonomie ; celle du serveur fait foi.
- **Webhooks Stripe** : signature vérifiée avec le corps brut de la requête, puis idempotence par
  `stripe_webhook_events`.
- **Limitation de débit** sur la connexion, l'inscription, le contact et la recherche.
- **Téléversements** : passage par Supabase Storage avec contrôle du type MIME et de la taille,
  jamais servis depuis un domaine tiers non maîtrisé.
- **Journalisation** : aucune donnée personnelle ni secret dans les logs ; le journal d'audit
  administrateur enregistre l'auteur, l'action et le diff.
- **`.env.local` est ignoré par Git**, `.env.example` documente les variables sans valeurs réelles.

## 2.8 Bilinguisme

`next-intl` avec segment de route `[locale]`, français par défaut. Trois niveaux de contenu :

| Type de contenu | Source | Exemple |
| --- | --- | --- |
| Libellés d'interface | Fichiers `messages/fr.json`, `messages/en.json` | « Ajouter au panier » |
| Contenu métier | Colonnes `_fr` / `_en` en base | Nom et description d'un produit |
| Correctifs éditoriaux | Table `ui_translations` | Ajuster un libellé sans redéployer |

Les URL restent identiques entre les langues au MVP (`/fr/boutique` et `/en/boutique`) ; les slugs
traduits (`/en/shop`) sont une amélioration de phase 2. Les balises `hreflang` et les URL
canoniques sont posées dès le départ.

## 2.9 Découpage MVP / phases suivantes

**MVP (phase 1) — un client peut découvrir, commander et payer ; l'équipe peut préparer et livrer.**
Catalogue, recherche et filtres, fiche produit, panier avec règles logistiques, ramassage et
livraison locale avec créneaux, comptes clients, Stripe et Interac, commandes et suivi,
administration des produits/stocks/commandes, courriels transactionnels, arrivages avec alertes,
recettes, pages institutionnelles, PWA, SEO.

**Phase 2 — confort et échelle.**
Poids réel avec préautorisation, comptes professionnels complets (soumissions, factures,
commandes récurrentes), expédition postale au Canada, codes promotionnels avancés, avis clients
modérés, commandes scindées en plusieurs livraisons, slugs traduits, tournées de livraison.

**Phase 3 — croissance.**
Programme de fidélité, abonnements (panier récurrent), application mobile, gestion multi-entrepôt,
intégration comptable, recommandations personnalisées.
