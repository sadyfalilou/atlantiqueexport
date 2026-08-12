# Étape 1 — Audit du projet

_Dernière mise à jour : 11 août 2026_

## 1.1 État initial du dépôt

Le dossier `/Users/falilou/Projects/AtlantiqueExport` était **entièrement vide** au démarrage,
à l'exception d'un fichier `.claude/settings.local.json` (permissions de l'outil de développement).

| Vérification | Résultat |
| --- | --- |
| Fichiers source existants | Aucun |
| Dépôt Git | Absent — initialisé pendant cette étape (`git init`) |
| Fichiers d'instructions projet (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`) | Absents à l'origine |
| Code à préserver | Aucun — projet greenfield |
| Risque d'écraser du travail existant | Nul |

**Conclusion :** il n'y a rien à préserver ni à rétro-concevoir. Nous partons d'une page blanche,
ce qui autorise à choisir librement l'architecture sans dette technique.

## 1.2 Environnement de développement constaté

| Outil | Version installée | Commentaire |
| --- | --- | --- |
| Node.js | 26.6.0 | Très récent, largement au-dessus du minimum Next.js 16 (Node 20.9+) |
| npm | 11.18.0 | Gestionnaire retenu (un `package-lock.json` est généré) |
| pnpm | 11.20.0 | Disponible mais non retenu pour rester aligné avec Vercel par défaut |
| Git | 2.55.0 | OK |
| Accès réseau npm | Fonctionnel | Installation des paquets vérifiée |

## 1.3 Versions retenues au moment du scaffold

| Paquet | Version |
| --- | --- |
| Next.js | 16.3.0 (App Router) |
| React | 19.2.8 |
| TypeScript | 5.x (mode `strict` activé) |
| Tailwind CSS | 4.x (configuration par CSS, plus de `tailwind.config.js`) |
| ESLint | 9.x (flat config) |

⚠️ **Point d'attention important.** Next.js 16 et Tailwind CSS 4 introduisent des ruptures par
rapport aux versions largement documentées en ligne (Next 13–15, Tailwind 3). Concrètement :

- Tailwind 4 se configure dans le CSS via `@theme` et `@import "tailwindcss"` — il n'y a plus de
  fichier `tailwind.config.js` à éditer, et la plupart des tutoriels trouvés en ligne sont obsolètes.
- Next.js 16 modifie le modèle de cache et certaines API de routage. Le paquet installe un
  `AGENTS.md` qui pointe vers sa documentation embarquée (`node_modules/next/dist/docs/`) ;
  c'est cette documentation qui fait foi, pas les articles de blog.
- Les composants `shadcn/ui` doivent être ajoutés dans leur variante compatible Tailwind 4.

## 1.4 Ce qui manque et doit être fourni par Atlantique Export

Ces éléments bloquent la mise en production mais **pas** le développement du MVP (des données de
démonstration clairement marquées prennent le relais en attendant).

**Bloquants pour la mise en ligne**

1. **Comptes de service** : Supabase (projet + clés), Resend (domaine `atlantiqueexport.com`
   vérifié), Vercel (offre Pro — l'offre gratuite interdit l'usage commercial), registrar du
   domaine. _Stripe est reporté en phase 2 : voir les décisions de cadrage du plan._
2. **Prix de vente réels en dollars canadiens**, par produit et par format. Le catalogue fournisseur
   en FCFA ne sera pas converti automatiquement (voir §1.5).
3. **Photographies produits**. En leur absence, un placeholder élégant et identifiable est utilisé.
4. **Textes juridiques validés** : conditions de vente, politique de confidentialité (Loi 25 au
   Québec), politique de remboursement et d'expédition. Des brouillons seront fournis, marqués
   comme non validés.
5. **Paramètres logistiques réels** : adresse et horaires du point de ramassage à Montréal, zones de
   livraison par code postal, tarifs, seuil de livraison gratuite, créneaux et capacités.
6. **Coordonnées Interac** : adresse courriel de réception des virements et question/réponse de
   sécurité, ou confirmation du dépôt automatique.

**Décisions métier à trancher**

7. **Statut fiscal des produits.** _Reporté à la demande d'Atlantique Export : aucune taxe n'est
   calculée au MVP._ Le champ `tax_class` reste dans le schéma mais n'est pas exploité. Au Canada,
   la majorité des produits d'épicerie de base est détaxée (TPS/TVQ à 0 %), mais les collations,
   boissons et certains produits préparés sont taxables. ⚠️ Dès que l'entreprise est inscrite aux
   fichiers de la TPS et de la TVQ, la taxe doit apparaître sur la facture : ce point devra être
   repris avec un comptable avant la première vente réelle.
8. **Certifications et permis** : import de denrées alimentaires (ACIA/MAPAQ), chaîne du froid pour
   les produits surgelés, licence SFC. Cela conditionne ce qui peut être expédié hors Montréal.
9. **Allégations santé** : aucune allégation médicale ne sera affichée sur les poudres naturelles
   (bissap, moringa, bouye…) sans validation réglementaire. Les descriptions resteront culinaires.

## 1.5 Hypothèses de travail

Ces hypothèses sont appliquées par défaut et peuvent être corrigées à tout moment.

1. **Marché** : clientèle au Canada, principalement au Québec ; interface en français par défaut,
   anglais disponible. Devise unique CAD.
2. **Montants en cents entiers** (`integer`), jamais en flottants, pour éviter les erreurs d'arrondi.
3. **Prix de démonstration** : toutes les valeurs du jeu de données de départ sont fictives,
   stockées dans les fichiers de seed et signalées comme telles dans l'interface d'administration.
4. **Un seul point de ramassage** à Montréal au lancement ; le modèle en supporte plusieurs.
5. **Le panier vit côté serveur**, identifié par un cookie `httpOnly`. Les prix ne transitent jamais
   depuis le client vers le calcul de la commande.
6. **Produits vendus au poids** : le MVP livre la variante simplifiée par tranches de poids
   (§ architecture) ; le modèle de données prévoit dès maintenant le poids réel et l'ajustement.
7. **Contenu bilingue** : deux colonnes `_fr` / `_en` par champ traduisible, plutôt qu'une table de
   traductions générique. Choix assumé pour deux langues ; à revoir au-delà de trois.

## 1.6 Risques identifiés

| Risque | Impact | Mitigation retenue |
| --- | --- | --- |
| Survente lors de commandes simultanées | Élevé | Réservation de stock en transaction PostgreSQL avec verrou ligne + contrainte `CHECK` empêchant un disponible négatif |
| Manipulation des prix côté client | Élevé | Le panier ne stocke que `variant_id` + quantité ; tout montant est recalculé côté serveur avant paiement |
| Rupture de chaîne du froid sur un envoi postal | Élevé (sanitaire et réputationnel) | Le panier bloque techniquement l'expédition des produits surgelés/frais ; règles portées par la base, pas par l'interface |
| Écart entre montant préautorisé et poids réel | Moyen | MVP par tranches de poids (montant exact connu à l'achat) ; préautorisation Stripe repoussée en phase 2 |
| Webhooks Stripe rejoués ou hors ordre | Moyen | Vérification de signature + table d'événements traités (idempotence) |
| Virement Interac validé à tort | Moyen | Validation manuelle par un administrateur, journalisée dans le journal d'audit |
| Périssables invendus / expirés | Moyen | Suivi par lot avec date d'expiration et alertes dans le tableau de bord |
| Fuite de la clé `service_role` Supabase | Critique | Clé importée uniquement dans des modules marqués `server-only`, jamais préfixée `NEXT_PUBLIC_` |
| Photos produits manquantes au lancement | Faible | Placeholders typés par catégorie, remplaçables sans changer le code |
| Documentation en ligne obsolète (Next 16 / Tailwind 4) | Moyen | S'appuyer sur la documentation embarquée dans `node_modules`, et vérifier par le build |
