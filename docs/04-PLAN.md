# Étape 4 — Plan d'implémentation

_Dernière mise à jour : 15 août 2026 (soir)_

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
- ✅ **Administration des zones, des points de ramassage et des créneaux**
  (`/admin/livraison`, détaillée au lot 9)
- ✅ **Frais d'expédition postale** : montant fixe pour tout le Canada, avec seuil de
  gratuité optionnel, rangé dans `site_settings` et appliqué par `place_order`. Le tarif
  ne vit pas dans une zone : les zones décrivent des secteurs de livraison locale avec
  leurs codes postaux, ce que l'expédition ne connaît pas. Le montant minimum de commande
  ne s'y applique pas non plus — il existe pour qu'une tournée vaille le déplacement, ce
  qui n'a pas de sens pour un colis remis à un transporteur.
- ⬜ Jours bloqués

**Le défaut qui a motivé ce lot.** L'expédition était facturée **zéro** : les frais des
zones ne s'appliquaient qu'à la livraison locale, alors que l'expédition est proposée dès
qu'un panier ne contient que de l'ambiant. Chaque colis partait sans frais de port, et
aucun écran ne permettait même d'en saisir un. Signalé plutôt que corrigé d'office —
mettre un prix sur un envoi est une décision commerciale — puis tranché : montant fixe.

⚠️ **Adresse, horaires, tarifs et seuils sont PROVISOIRES.** Ce que le script pose est marqué
comme tel — le point de ramassage s'intitule « adresse à confirmer ». Les préfixes de codes
postaux, eux, sont exacts : H1 à H9 pour l'île de Montréal, J pour les couronnes.

## Lot 7 — Authentification et espace client 🚧

- ✅ **Inscription, connexion, déconnexion** par courriel et mot de passe
- ✅ **Réinitialisation du mot de passe**, envoyée par **Resend avec le gabarit de la
  marque** et non par le service intégré de Supabase, dont le débit est limité et
  l'expéditeur étranger au domaine. Le lien est fabriqué côté serveur
  (`auth.admin.generateLink`) puis mis en file. Cela branche enfin le modèle
  `password_reset`, écrit au lot 12 et sans appelant depuis.
- ✅ **Espace client** `/compte` : historique des commandes, avec leur état traduit
- ✅ **Le panier de l'invité est rattaché au compte à la connexion.** Sans cela, quelqu'un
  qui remplit son panier puis se connecte pour payer le verrait se vider — au pire moment.
- ✅ **Aucun message ne révèle si une adresse est connue**, ni à l'inscription, ni à la
  connexion, ni à la réinitialisation. Répondre « cette adresse n'existe pas » ferait du
  formulaire un annuaire de la clientèle.
- ✅ **Commande sans compte inchangée** : le compte apporte l'historique, pas le droit
  d'acheter.
- ✅ **Profil modifiable** : nom, téléphone, langue des courriels, consentement à
  l'infolettre. L'adresse courriel n'y est pas modifiable — elle sert d'identifiant.
- ✅ **Adresses enregistrées** : ajout, suppression, adresse par défaut. Une seule à la
  fois : l'ancienne est retirée avant que la nouvelle soit posée, sinon deux se
  disputeraient la place au paiement. Le code postal est rangé en majuscules, la zone de
  livraison se déduisant de son préfixe.
- ✅ **Demande de compte professionnel**, en statut `pending`. `business_accounts`
  n'accorde au client qu'un droit de **lecture** : personne ne peut s'octroyer un tarif de
  gros en insérant sa propre ligne. La demande passe par le serveur, et l'administration
  tranche.
- ✅ **La commande est rattachée au compte** quand une session est ouverte.
- ✅ **Reçu en PDF**, `/commande/{numéro}/recu`, dans les deux langues. Même contrôle
  d'accès que la page de confirmation : porteur du jeton ou compte propriétaire.
- ✅ **Recommander** une commande passée : les articles encore en vente sont remis au
  panier, et le panier indique combien ont été écartés. Le **SKU** sert de pivot — il est
  figé dans la commande et survit à un changement de libellé ou de prix.

### Le document s'appelle « Reçu », pas « Facture »

Au Québec, une facture émise par une entreprise inscrite doit porter ses numéros de TPS et
de TVQ ainsi que les montants perçus. Tant que le calcul des taxes est reporté et que ces
numéros restent des « [à confirmer] », intituler ce document « Facture » induirait en
erreur un client qui voudrait le passer en dépense — le PDF le dit d'ailleurs en toutes
lettres. **Le titre bascule tout seul** en « Facture » dès que le montant de taxe cesse
d'être nul : il suffira de le passer à la route.

**Écueil rencontré.** Les premiers PDF étaient corrompus — `Bad FCHECK in flate stream`,
illisibles par tout lecteur. La cause n'était pas le document mais l'environnement du
test : `vitest` tourne sous `jsdom`, dont les polyfills abîment la sortie binaire de
`@react-pdf/renderer`. Un `// @vitest-environment node` a suffi. Le serveur Next tourne
déjà en Node, donc la route n'a jamais été touchée — mais sans vérification par un vrai
lecteur PDF, le défaut serait passé pour un succès.

### ⚠️ Défaut trouvé et corrigé (14 août 2026)

`place_order` ne renseignait **jamais** `orders.user_id`, alors que la politique
`orders_select_own` filtre précisément là-dessus. Un client connecté n'aurait donc vu
**aucune** de ses commandes — l'historique aurait été vide pour tout le monde, en
permanence. Le défaut est resté invisible tant que l'espace client n'existait pas, et ma
vérification de la veille — « un compte neuf voit zéro commande » — validait l'isolation
sans distinguer ce cas.

Deux enseignements, gardés ici parce qu'ils se reproduiront :

1. **Ne pas réécrire de mémoire une fonction critique.** J'avais commencé par retranscrire
   `place_order` : la copie perdait `book_delivery_slot`, changeait les codes d'erreur et
   déplaçait la vérification du montant minimum. La migration finale est **générée depuis
   le fichier d'origine** par remplacement de chaînes, et son diff ne montre que les quatre
   lignes voulues.
2. **`create or replace` ne remplace pas si la signature change.** Ajouter un paramètre,
   même avec une valeur par défaut, crée une SECONDE fonction. Les deux ont coexisté et
   PostgREST a refusé de choisir (`PGRST203`) : plus aucune commande ne passait. C'est
   `npm run smoke:order` qui l'a signalé aussitôt — l'ancienne signature est maintenant
   supprimée, et les 14 assertions repassent.

**Isolation vérifiée avec deux comptes réels.** Le profil et les adresses s'écrivent avec
la session du client, jamais avec la clé de service : les politiques `profiles_update_self`
et `addresses_own` font la garde en base, si bien qu'aucun filtre applicatif ne peut être
oublié. Mesuré :

- B ne voit aucune adresse de A
- B ne peut pas insérer une adresse au nom de A — refus PostgreSQL 42501
- B ne peut pas modifier le profil de A — zéro ligne touchée
- personne ne peut s'insérer un compte professionnel « approuvé » — refus 42501

**Les commandes sont lues avec la session du client, pas avec la clé de service.** La
politique `orders_select_own` fait le tri en base.

### ⚠️ Défaut trouvé et corrigé (15 août 2026) — deux fuites entre comptes

Le paragraphe ci-dessus disait, jusqu'à aujourd'hui : « le serveur n'a aucun filtre à
écrire, donc aucun moyen de se tromper ». **C'était faux, et c'est ce raisonnement qui a
produit le défaut.**

Deux politiques ne se contentent pas d'isoler les clients : elles ouvrent aussi la table
au personnel.

```sql
orders_select_own          using (user_id    = auth.uid() or public.is_staff())
business_accounts_own      using (profile_id = auth.uid() or public.is_staff())
```

Les deux lectures correspondantes s'en remettaient à RLS sans écrire de filtre. Pour un
client ordinaire, l'isolation tenait. Pour un membre du personnel, la politique s'ouvrait
et la requête rendait **la ligne de quelqu'un d'autre** :

- `/compte/professionnel` affichait la demande d'un autre client — nom de
  l'établissement, numéro d'entreprise, téléphone, produits et volumes ;
- `/compte` affichait **toutes les commandes de la boutique** comme si elles étaient les
  siennes.

Constaté à l'usage : « la page compte professionnel applique les mêmes infos pour deux
comptes différents ». Confirmé en base — une seule demande existe, un seul compte du
personnel existe, et il n'a pas de demande à lui.

Les deux lectures filtrent désormais explicitement sur l'identifiant de la personne
connectée. La règle à retenir, écrite dans les deux fichiers :

> Ne se reposer sur RLS pour désigner « la ligne de la personne connectée » que si la
> politique ne fait **que** cela. Ici, seule `addresses_own` remplit cette condition.

**Pourquoi la vérification précédente n'a rien vu.** « Un compte neuf voit zéro commande »
était vrai, et le restera : le compte de test n'était pas membre du personnel. La
condition qui déclenche le défaut était absente de l'épreuve.

⚠️ **La confirmation d'inscription passe encore par Supabase.** Son service intégré est
limité à quelques envois par heure et n'utilise pas le domaine d'Atlantique Export. À
faire avant l'ouverture : configurer Resend comme serveur SMTP de Supabase, dans
Authentication → Emails. La réinitialisation, elle, passe déjà par Resend.

### ⚠️ Défaut trouvé et corrigé (15 août 2026)

**Le lien de confirmation d'inscription renvoyait sur `localhost`.** `signUp` était appelé
sans `emailRedirectTo` : faute de destination, Supabase fabrique le lien à partir du
« Site URL » de son tableau de bord, resté sur l'adresse de développement. La
réinitialisation passait déjà `redirectTo` ; l'inscription fait désormais pareil.

Le correctif de code ne suffisait pas : Supabase **valide** la destination contre sa liste
blanche et retombe silencieusement sur le Site URL si elle n'y figure pas. Les deux
réglages du tableau de bord — Site URL et Redirect URLs — ont été faits en même temps.

**Écueil rencontré.** `/auth/callback` était réécrit en `/fr/auth/callback` par le
middleware de langue : chaque lien de réinitialisation aurait fini sur une page
introuvable. Le chemin `auth` est désormais exclu du `matcher`. La destination de retour
est par ailleurs contrainte aux chemins internes — sans quoi `?next=https://…` aurait fait
de ce lien, signé par le domaine et arrivé dans un vrai courriel, un tremplin vers un site
tiers.

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
- ✅ **Expiration automatique des réservations non payées**, après 24 heures :
  `expire_unpaid_orders` rend le stock, libère le créneau, passe la commande en
  « annulée » et annote le journal du motif. Route `/api/cron/expirer-commandes`,
  appelée une fois par heure.

**Une promesse écrite que le code ne tenait pas.** Les conditions de vente annoncent au
client : « Le stock est réservé pour vous pendant 24 heures ; passé ce délai sans virement,
la réservation est libérée et la commande annulée. » `release_stock` et
`release_delivery_slot` existaient depuis le lot 2 — mais **rien ne les appelait**, hors le
script de fumée. Une commande jamais payée gardait son stock réservé indéfiniment, et ce
stock devenait invendable sans que personne ne s'en aperçoive.

**Vérifié sur une vraie commande** : une commande récente est ignorée ; vieillie de 30 h,
elle est annulée, ses 2 unités reviennent en vente, le registre montre `reservation -2`
puis `release +2`, et un second passage ne la retraite pas.

**Écueil rencontré.** La première version insérait sa propre ligne au journal des
commandes. Or le déclencheur `log_order_status_change`, posé au lot 2, enregistre déjà
toute transition : chaque commande expirée se retrouvait avec **deux** entrées identiques,
dont une sans motif. La fonction annote désormais la ligne du déclencheur au lieu d'en
ajouter une.
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
- ✅ **Photographies de produits** : bucket Supabase `produits`, public en lecture et fermé
  en écriture à tout le monde sauf au serveur. Téléversement depuis la fiche produit, choix
  de la photo principale, suppression. La photo apparaît alors dans la boutique, sur la
  fiche et dans le panier ; sans photo, le substitut à l'initiale reste.
- ✅ **Création d'un produit** : `/admin/produits/nouveau`. Le produit et son premier format
  sont créés ensemble — un produit sans format n'a ni prix ni stock, donc rien à vendre.
  Créé **non publié** : c'est vous qui décidez quand il paraît.
- ✅ **Reprise d'un produit existant** : nom, accroche, description et conservation dans les
  deux langues, catégorie, marque, origine, température de transport, allergènes, mise en
  avant. **L'adresse (`slug`) reste figée** : déjà indexée et partagée dans des liens, la
  changer transformerait chacun d'eux en page introuvable.
- ✅ **Formats d'un produit existant** : ajout, retrait de la vente, suppression.
  Retirer de la vente est le geste habituel — le format disparaît du site et des paniers
  en gardant son historique. La suppression n'est acceptée que pour un format **jamais
  commandé et sans mouvement de stock** : au-delà, elle effacerait le registre.
- ✅ **Catégories** (`/admin/categories`) : nom et description dans les deux langues,
  position, visibilité, présence au méga-menu. Le nombre de produits rangés est affiché
  avant toute modification. Les rayons calculés — Nouveautés, Promotions — sont montrés
  à part et non modifiables : ils ne contiennent aucun produit rangé.
- ✅ **Marques** (`/admin/marques`) : nom, origine, descriptions, visibilité, partenariat.
- ✅ **Mouvements de stock** (`/admin/stocks`) : réception avec lot et date de péremption,
  ajustement de comptage dans les deux sens, perte, retour. Le registre des quarante
  derniers mouvements est affiché en dessous, ventes comprises.
- ✅ **Arrivages** (`/admin/arrivages`) : création, dates d'arrivée et de fin de
  réservation, étape de la marchandise, notes bilingues, manifeste des formats annoncés
  avec quantité et acompte, mise en ligne. Publier sans les deux dates est refusé — la
  page d'accueil les annonce. Retirer un format déjà réservé est refusé aussi : la
  suppression en cascade effacerait les réservations des clients, acompte compris.
- ✅ **Demandes de compte professionnel** (`/admin/demandes-pro`) : la demande écrite par
  le client — dont les produits et volumes qui l'intéressent — avec approbation, refus et
  retour en attente. Approuver applique le tarif de gros — voir le lot 16.
- ✅ **Ce qui se vend le mieux** : classement des formats les plus commandés sur trente
  jours, commandes payées seulement. Agrégé **par SKU et non par produit** — le rapport
  entre le 1 kg et le 250 g est ce qui décide des réapprovisionnements, un total par
  produit ne dirait rien d'utile.
- ✅ **Publication depuis les listes** : une bascule partagée pour les produits, les
  recettes et les arrivages, avec les garde-fous déjà posés côté serveur. Retirer un
  produit du site est un geste urgent — une rupture de stock — qui ne doit pas coûter deux
  écrans.
- ✅ **Livraison** (`/admin/livraison`) : frais, seuil de gratuité, montant minimum et
  codes postaux desservis, zone par zone. Les montants sont relus par `place_order` à
  chaque commande, si bien qu'une modification ne touche jamais une commande déjà passée —
  la page le dit, avec le nombre de commandes déjà livrées dans la zone. Un seuil de
  gratuité inférieur au minimum de commande est refusé : il serait inatteignable, et
  l'affichage mentirait au client. Les températures acceptées ne s'y modifient pas —
  retirer le surgelé d'une zone retire des produits de la vente et mérite son propre écran.
- ✅ **Création de zones de livraison.** Une zone naît **inactive** : ses codes postaux
  pourraient chevaucher ceux d'une autre et changer les frais de clients existants dès la
  création. Un préfixe déjà desservi ailleurs est d'ailleurs refusé, en nommant la zone
  qui le porte — sinon la correspondance retiendrait la première trouvée et le client
  paierait un tarif au hasard entre les deux.
- ✅ **Seuil d'alerte de stock modifiable**, dans la ligne du tableau. Le seuil n'est pas
  une quantité : le régler ne bouge rien à l'inventaire, il dit seulement à partir de quand
  le tableau de bord s'inquiète. D'où un champ direct, là où toute vraie quantité passe par
  un mouvement daté et motivé.
- ✅ **Navigation regroupée** : onze destinations à plat débordaient sur deux lignes et ne
  disaient jamais où l'on se trouve. Elles sont réparties en Catalogue, Logistique et
  Contenu, la section courante est marquée, et les deux gestes du quotidien — commandes et
  demandes en attente — restent au premier niveau.
- ✅ **Les tuiles « aujourd'hui » du tableau de bord mènent aux commandes concernées.**
  « Ramassages aujourd'hui » et « Livraisons aujourd'hui » affichaient un nombre sans
  moyen de savoir lequel. La date est recalculée côté serveur, jamais reçue du lien.
- ✅ **Points de ramassage** : nom, adresse, horaires en texte libre, consignes bilingues.
  Une pastille « adresse à renseigner » s'allume tant que l'adresse posée par le script de
  semis n'a pas été remplacée — sans quoi le client reçoit une promesse creuse à la
  confirmation de sa commande.
- ✅ **Créneaux** : ouverture par plage de dates, un créneau par jour, deux mois au
  maximum. Les créneaux déjà ouverts au même horaire sont **laissés intacts** : en changer
  la capacité ou l'heure déplacerait les rendez-vous des clients qui les ont pris. Un
  créneau se ferme sans se supprimer, pour la même raison.
- ⬜ Promotions, rapports

### ⚠️ Deux défauts trouvés et corrigés (15 août 2026)

1. **« Commandes à préparer » comptait ce que la liste ne montrait pas.** Le compteur du
   tableau de bord couvrait `confirmed` **et** `preparing`, le lien ne filtrait que
   `confirmed`. Dès qu'une commande était prise en charge, elle restait comptée et
   devenait introuvable — signalé à l'usage, sur une vraie commande.
2. **Les deux cases d'une catégorie faisaient la même chose.** « Visible sur le site » et
   « Dans le méga-menu » avaient un effet identique, parce qu'aucune page n'appelait
   `getCategories` : les huit surfaces passaient toutes par la liste du menu. La boutique,
   l'accueil et les filtres reviennent à la liste générale ; le drapeau du menu ne commande
   plus que l'en-tête et le pied de page, et la case s'appelle « Dans les menus ».

Le second est le plus instructif : les deux fonctions existaient et faisaient chacune ce
qu'il fallait. Le défaut n'était pas dans une fonction mais dans le **choix de l'appelant**,
répété huit fois. C'est invisible à la relecture d'un fichier, et visible en une seconde à
l'usage.

**Aucune quantité ne s'écrit à la main.** Tout passe par `record_stock_movement`, une
fonction SQL qui, dans une seule transaction :

1. **verrouille la ligne de stock** — deux corrections simultanées se suivraient sinon sur
   un même total lu avant écriture, et la seconde écraserait la première ;
2. **refuse de descendre sous les quantités déjà réservées** pour des commandes en cours,
   avec un message lisible plutôt qu'une violation de contrainte ;
3. **refuse les types non saisissables** — vente, réservation et libération sont écrites par
   la transaction de commande ; les accepter ici laisserait fabriquer des ventes qui n'ont
   jamais eu lieu ;
4. **écrit le registre avec l'identité de l'auteur.** `receive_stock` l'attribuait à
   `auth.uid()`, nul avec la clé de service : chaque réception aurait été anonyme.

**Vérifié contre la base réelle** — réception, perte et ajustement acceptés ; mouvement
nul, retrait excessif et type `sale` refusés avec le bon message ; total revenu à sa
valeur de départ et écritures de test retirées du registre.

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

## Lot 11 — Arrivages et précommandes 🚧

- ✅ **Administration des arrivages** — détaillée au lot 9
- ✅ **Page publique `/arrivages`** : les arrivages publiés, leurs dates, leurs formats
  annoncés et ce qu'il reste à réserver. Rendue **dynamiquement** et non mise en cache —
  les quantités bougent à chaque réservation, une page en cache annoncerait des places
  déjà prises. Les trois liens qui y menaient depuis l'en-tête, le pied de page et
  l'accueil aboutissent enfin.
- ✅ **Réservation sans acompte.** Le client réserve sa quantité, reçoit la confirmation
  `preorder_confirmation` — écrite au lot 12 et sans appelant depuis — et vous le prévenez
  à l'arrivée. Rien à encaisser, donc rien à rembourser si l'arrivage tombe à l'eau. Le
  champ `deposit_payment_id` reste en base pour le jour où un acompte sera exigé.
- ✅ **`place_reservation`, en une seule transaction.** `reserve_shipment_quantity`
  existait et faisait le plus dur — verrou de ligne, refus après la date limite, refus de
  dépassement — mais elle ne fait QUE décrémenter. Appelée seule, suivie d'une insertion
  séparée, un échec de l'insertion aurait laissé de la marchandise réservée pour une
  réservation inexistante, et personne pour la réclamer. La fonction refuse par ailleurs
  de réserver sur un arrivage non publié : sans quoi l'identifiant d'une ligne encore en
  préparation suffirait à réserver sur un arrivage que personne n'est censé voir.
- ✅ **Carnet de réservations dans l'administration** : qui a réservé quoi, avec l'adresse
  cliquable. Sans lui, la colonne « Réservé » donnait un nombre sans savoir à qui écrire.
- ⬜ Alertes d'arrivage (`arrival_available` est écrit, toujours sans appelant)
- ⬜ Conversion en stock à réception
- **Vérification** : end-to-end de réservation, notification à la mise à disposition

### ⚠️ Défaut trouvé et corrigé (15 août 2026)

`getOpenShipments` passait `variant_id` là où un **slug de produit** était attendu, et la
section d'accueil cherchait ensuite le produit par ce slug. Le premier arrivage créé aurait
donc affiché des UUID à la place des noms de produits. La jointure corrige l'affichage et
supprime au passage une requête par ligne. Le défaut était invisible : la table étant vide,
la boucle ne s'exécutait jamais.

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
- ✅ Cron **externe** toutes les 5 minutes, chez **cron-job.org**. Deux ordonnanceurs ont
  été écartés en chemin : celui de Vercel, qu'un plan hobby limite à une fois par jour ;
  et GitHub Actions, qui n'a produit **aucune exécution planifiée en une heure quarante-cinq**
  alors qu'il était réglé sur 5 minutes — GitHub traite ces tâches « au mieux ».
  Le workflow du dépôt reste en filet de sécurité, à la demi-heure.
- ✅ **La file est réservée avant envoi** (`claim_emails`, avec `for update skip locked`).
  Le traitement lisait puis envoyait en deux temps : deux ordonnanceurs simultanés
  envoyaient donc le même courriel deux fois. Vérifié — deux réservations lancées en
  parallèle ne se chevauchent sur aucun courriel. Une réservation abandonnée est reprise
  au bout de dix minutes.
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
- ✅ **Treizième modèle : commande annulée faute de virement.** Mis en file par la tâche
  d'expiration, une fois le stock déjà rendu. Il dit trois choses et rien de plus :
  **aucun montant n'a été prélevé** — c'est la première inquiétude de qui lit « annulée » ;
  **une porte de sortie si le virement a bien été envoyé**, tardivement ou sans le numéro
  de commande dans le message ; et de quoi recommencer, sans reproche.
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

## Lot 13 — Contenu éditorial et pages institutionnelles 🚧

- ✅ **Onze pages institutionnelles**, servies depuis la table `pages` par la route
  attrape-tout : ajouter une page ne demande plus de code, seulement une ligne en base.
  La politique RLS n'expose que les pages publiées, donc un brouillon reste introuvable
  même si son adresse est devinée.
- ✅ **Six brouillons juridiques** — confidentialité, conditions de vente, remboursement,
  expédition, témoins, accessibilité. Chacun porte `is_draft_legal`, ce qui affiche un
  encadré « à faire valider » en tête de page **et les retire de l'indexation** : un texte
  non relu n'a pas à être cité par un moteur de recherche comme la position de l'entreprise.
- ✅ **Cinq pages factuelles** — livraison, FAQ, contact, à propos, comptes professionnels.
  Zones, frais, seuils et règles de chaîne du froid sont repris de la configuration réelle.
- ✅ **18 mentions « [à confirmer] »** marquent ce que seule l'entreprise peut fournir :
  raison sociale, NEQ, adresse, téléphone, délais de remboursement, pays d'hébergement des
  données. Un trou signalé vaut mieux qu'une valeur plausible.
- ⬜ `/nos-producteurs` — délibérément non écrite. Le seul fournisseur connu est Sonagoo,
  dont la marque a été **volontairement masquée** du site au lot 2 ; inventer des portraits
  de producteurs serait contraire à la règle du projet.
- ✅ **Pages de recettes** : liste et fiche, avec ingrédients, étapes numérotées, durées
  et portions. Les données structurées `Recipe` ne sont émises **que si la recette est
  écrite** — déclarer une recette sans ingrédients ni étapes ferait remonter une fiche
  vide dans les moteurs de recherche, au nom d'Atlantique Export.
- ✅ **Création d'une recette** : deux titres suffisent, le reste s'écrit sur l'écran
  suivant. Elle naît non publiée, et ne peut pas être publiée sans étape.
- ✅ **Éditeur de recettes** (`/admin/recettes`) : une ligne par ingrédient ou par étape,
  les deux langues séparées par une barre verticale. Sans barre, le même texte sert
  partout — « 1 litre d'eau » n'a pas besoin d'être traduit.
- ✅ **Une recette sans étape ne peut pas être publiée**, l'action le refuse.

⚠️ **Les six recettes sont des coquilles vides** : titre, accroche, durées et portions,
mais `ingredients: []` et `steps: []`. Le site les affiche avec la mention « recette en
cours de rédaction » plutôt que d'ouvrir une page qui n'apprend rien. **Rien n'a été
inventé** : des quantités et des étapes fabriquées pour des produits alimentaires
n'auraient pas leur place ici. Elles attendent votre texte dans `/admin/recettes`.

- ⬜ « Ajouter les ingrédients au panier » — le champ `variantSku` est prévu sur chaque
  ligne d'ingrédient, il reste à le relier au catalogue
- ✅ **Administration des pages** (`/admin/pages`) : titre et texte dans les deux langues,
  publication, création. Le tableau compte les mentions « à confirmer » restantes et les
  annonce en tête — 36 aujourd'hui, deux langues confondues.
- ✅ **La mention « brouillon juridique » est réservée au super administrateur.** Un
  gestionnaire corrige librement un texte ; seul un super administrateur peut retirer
  l'encadré d'avertissement, parce que le retirer déclare que le texte a été relu et
  engage l'entreprise. Un avertissement le rappelle au moment de décocher la case.
- ✅ **L'adresse d'une page est figée après création**, comme celle d'un produit ou d'une
  catégorie : elle vit dans des liens déjà partagés et indexés.
- **Vérification** : les 11 pages rendues dans les deux langues, sans reste de balisage ;
  audit d'accessibilité encore à faire

**Le corps des pages n'est jamais injecté en HTML.** Il est écrit dans un Markdown pauvre
et converti en composants React. Un `dangerouslySetInnerHTML` sur du contenu venu de la base
laisserait quiconque obtiendrait un accès en écriture exécuter du script chez chaque
visiteur ; la conversion en éléments React ferme la porte par construction, et les liens
sont filtrés pour écarter `javascript:`.

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

## Lot 16 — Tarif professionnel 🚧

- ✅ **Le tarif de gros s'applique au panier et à la commande.** Un compte professionnel
  approuvé voit ses prix dans le panier et au paiement, avec le prix public barré et le
  montant de la remise. La commande, le reçu et les courriels suivent d'eux-mêmes : ils
  lisent les montants figés dans `order_items`.
- ✅ **Le montant facturé est établi par `place_order`**, pas par l'application. Le panier
  affiche, la base facture. Les deux partagent la même règle, écrite une fois en TypeScript
  (`effectiveUnitPrice`) et une fois en SQL, et l'une renvoie explicitement à l'autre.
- ✅ **Deux règles protectrices, testées** : un format sans tarif de gros se vend au prix
  public — un oubli de saisie ne retire rien de la vente ; et le professionnel ne paie
  **jamais** plus qu'un client de détail, même si une promotion descend le prix public sous
  le tarif négocié.
- ⬜ **Le catalogue affiche les prix publics à tout le monde**, y compris au professionnel
  connecté. C'est un choix, pas un oubli : la boutique, la fiche produit et l'accueil sont
  mis en cache cinq minutes et **partagés entre tous les visiteurs**. Y afficher un prix
  par personne demande de rendre ces pages dynamiques — plus lentes pour tous — et fait
  peser le risque de servir un prix de gros à un client de détail depuis le cache. À
  reprendre avec un encart dynamique le jour où cela vaut le coût.
- ⬜ `is_wholesale_only` ne filtre toujours rien : un produit réservé au gros serait visible
  de tous. Aucun n'est marqué ainsi aujourd'hui.
- ⬜ Minimum de commande professionnel, conditions de paiement, prix négociés par client
- **Vérifié contre la base réelle** — migration appliquée, `npm run smoke:order` étendu à
  cinq cas et porté à **21 épreuves, 0 échec** :
  - professionnel approuvé : 2 × 700 = 1400 cents, le tarif de gros est bien facturé
  - sans compte : 2 × 1000 = 2000 cents, prix public
  - promotion sous le tarif négocié : 2 × 500 = 1000 cents — le professionnel paie le prix
    public, jamais davantage
  - format sans tarif saisi : prix public, et surtout **aucun refus de commande**
  - demande refusée : aucun tarif ouvert
  - compte de test et données supprimés en fin d'épreuve

  Ces cas restent dans `smoke-order.mjs` : la règle est écrite à deux endroits, c'est
  l'épreuve qui garantit qu'ils continuent de dire la même chose.

⚠️ **Les prix de gros en base sont des données de démonstration**, comme les prix publics :
la boutique porte encore le bandeau « mode démonstration ». Les 86 formats ont un tarif à
environ −22 %, qui n'a été négocié avec personne. À revoir avant d'approuver un client.

---

## Ordre de priorité si le temps manque

Les lots 2 à 8 constituent le **minimum commercialisable** : sans eux, on ne peut pas vendre. Le
lot 9 (administration) est indispensable pour exploiter le site au quotidien. Les lots 11 à 14
peuvent être livrés après une première mise en ligne, dans cet ordre : courriels, arrivages,
recettes, PWA.
