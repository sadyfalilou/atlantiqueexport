# Atlantique Export

Site e-commerce de l'épicerie afroalimentaire **Atlantique Export** (Montréal) : produits
alimentaires du Sénégal et d'autres pays africains, pour les particuliers, les restaurants et les
revendeurs au Canada.

> « Les saveurs d'Afrique, fraîches et authentiques. »

**État actuel : lot 1 terminé.** Le design system, la structure bilingue et la page d'accueil sont
en place et fonctionnels. Le catalogue affiché provient d'un jeu de **données de démonstration**
(prix fictifs) en attendant la base Supabase du lot 2. Un bandeau le signale sur le site.

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/01-AUDIT.md](docs/01-AUDIT.md) | Audit de départ, environnement, risques, hypothèses, éléments à fournir |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | Architecture technique, routes, modèle de données, sécurité, phases |
| [docs/03-DESIGN-SYSTEM.md](docs/03-DESIGN-SYSTEM.md) | Couleurs (contrastes calculés), typographie, composants, états |
| [docs/04-PLAN.md](docs/04-PLAN.md) | Plan d'implémentation par lots, avec l'état d'avancement |

## Démarrer

Prérequis : **Node.js 20.9 ou plus** (testé avec Node 26) et npm.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Le lot 1 fonctionne sans aucune clé : le catalogue de démonstration est local. Les variables
deviennent nécessaires à partir du lot 2 (Supabase), du lot 8 (Stripe) et du lot 12 (Resend).
Chaque variable est documentée dans [.env.example](.env.example).

```bash
npm run dev
```

Le site est servi sur <http://localhost:3000> et redirige vers `/fr`. La version anglaise est sur
`/en`.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript en mode strict, sans émission |
| `npm test` | Tests unitaires (Vitest) |
| `npm run check` | Lint + typecheck + tests, à lancer avant chaque commit |

## Pile technique

| Domaine | Choix | Version |
| --- | --- | --- |
| Framework | Next.js, App Router | 16.3 |
| Langage | TypeScript strict | 5.x |
| Styles | Tailwind CSS 4 (configuration en CSS, pas de `tailwind.config.js`) | 4.x |
| Bilinguisme | next-intl, routage `/fr` et `/en` | 4.x |
| Base de données, auth, stockage | Supabase (PostgreSQL) | à brancher au lot 2 |
| Paiements | Stripe (carte, Apple Pay, Google Pay) + virement Interac | lot 8 |
| Courriels | Resend | lot 12 |
| Formulaires | React Hook Form + Zod | — |
| Tests | Vitest (unitaires), Playwright (bout en bout) | — |
| Hébergement | Vercel | lot 15 |

⚠️ Next.js 16 et Tailwind 4 s'écartent nettement des versions décrites dans la plupart des
tutoriels en ligne. La documentation qui fait foi est celle embarquée dans
`node_modules/next/dist/docs/`. À noter : le fichier `middleware.ts` s'appelle désormais
`proxy.ts` (voir [src/proxy.ts](src/proxy.ts)).

## Organisation du code

```
messages/            Libellés d'interface (fr.json, en.json)
docs/                Audit, architecture, design system, plan
src/
├── app/
│   ├── [locale]/    Pages publiques bilingues
│   ├── actions/     Server Actions (validation Zod)
│   └── globals.css  Jetons de design — source de vérité des couleurs
├── components/
│   ├── ui/          Primitives (Button, Badge, Container, Section)
│   ├── layout/      En-tête, méga-menu, navigation mobile, pied de page
│   ├── product/     Carte produit, affichage des prix
│   ├── home/        Sections de la page d'accueil
│   └── shared/      États vides, placeholders, icônes
├── data/            ⚠️ Catalogue de démonstration — prix fictifs
├── i18n/            Configuration next-intl
├── lib/
│   ├── catalog/     Accès au catalogue (sera branché sur Supabase)
│   ├── validation/  Schémas Zod partagés client/serveur
│   ├── fulfillment.ts  Compatibilité chaîne du froid ↔ mode de réception
│   ├── types.ts     Types du domaine, calqués sur le schéma PostgreSQL
│   └── utils.ts     Formatage des prix, des poids et des dates
└── proxy.ts         Redirection et normalisation des URL localisées
```

## Règles à respecter en contribuant

1. **Les montants sont des entiers en cents.** Jamais de flottants pour de l'argent.
2. **Le serveur recalcule tous les prix.** Le panier ne transporte que des identifiants de variante
   et des quantités.
3. **Aucune couleur codée en dur.** Les jetons de `globals.css` font foi ; les contrastes y sont
   documentés et ont été calculés.
4. **Aucun contenu inventé.** Pas de faux avis, pas de faux chiffres, pas d'allégation santé. Les
   données de démonstration sont signalées comme telles.
5. **Rien n'est « terminé » sans avoir été exécuté.** `npm run check` doit passer, et le rendu doit
   être vérifié de 320 px aux grands écrans.
6. **Aucun secret dans Git.** `.env.local` reste local ; `.env.example` ne contient que des
   descriptions.

## Prochaine étape

Lot 2 — schéma PostgreSQL, migrations Supabase, politiques RLS, fonctions de réservation de stock
et remplacement des données de démonstration par le vrai catalogue. Le détail est dans
[docs/04-PLAN.md](docs/04-PLAN.md).
