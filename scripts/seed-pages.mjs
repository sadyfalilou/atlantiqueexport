#!/usr/bin/env node
/**
 * Pages institutionnelles et politiques.
 *
 * Deux règles ont gouverné la rédaction.
 *
 * 1. **Rien n'est inventé.** Zones, frais, seuils, moyens de paiement et
 *    modes de réception sont repris de la configuration réelle. Tout ce que
 *    seule l'entreprise peut fournir — raison sociale, NEQ, adresse, numéro
 *    de téléphone, délais commerciaux — porte la mention « [à confirmer] »,
 *    visible sur la page. Mieux vaut un trou signalé qu'une valeur plausible.
 *
 * 2. **Les textes juridiques sont des brouillons, et le disent.** Ils portent
 *    `is_draft_legal`, ce qui affiche un encadré d'avertissement en tête de
 *    page et les retire de l'indexation. Ce sont des points de départ pour
 *    une relecture professionnelle, pas des documents opposables.
 *
 * Relançable sans risque : chaque page est insérée ou mise à jour par son
 * slug.
 *
 *   node scripts/seed-pages.mjs
 */

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = env.SUPABASE_SECRET_KEY;
if (!URL_BASE || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.");
  process.exit(1);
}

const CONFIRMER = "**[à confirmer]**";
const TO_CONFIRM = "**[to confirm]**";

const pages = [
  /* ---------------------------------------------------------------- */
  /* Politiques — brouillons juridiques                                */
  /* ---------------------------------------------------------------- */
  {
    slug: "politiques/confidentialite",
    is_draft_legal: true,
    title_fr: "Politique de confidentialité",
    title_en: "Privacy policy",
    body_fr: `Atlantique Export recueille des renseignements personnels pour traiter vos commandes. Cette page explique lesquels, pourquoi, et ce que vous pouvez exiger.

## Ce que nous recueillons

- **Pour une commande** : nom, adresse courriel, numéro de téléphone, et adresse de livraison lorsque vous choisissez la livraison.
- **Pour l'infolettre** : votre adresse courriel et la langue choisie, rien d'autre.
- **En naviguant** : un identifiant de panier, rangé dans un témoin de connexion, qui ne contient ni votre nom ni aucune donnée personnelle.

Nous ne recueillons **aucune donnée de paiement**. Le virement Interac se fait depuis le site de votre banque ; nous ne voyons ni vos identifiants ni votre numéro de compte.

## Pourquoi

Vos coordonnées servent à préparer, encaisser et livrer votre commande, et à vous écrire à chacune de ses étapes. L'adresse d'infolettre sert uniquement à vous envoyer l'infolettre.

Nous n'utilisons vos renseignements à aucune autre fin, et **nous ne les vendons ni ne les échangeons avec personne**.

## Qui y a accès

- L'équipe d'Atlantique Export, pour traiter votre commande.
- Nos prestataires techniques, strictement pour ce qu'ils exécutent : l'hébergement du site, la base de données et l'envoi des courriels. Ils agissent pour notre compte et n'ont pas le droit d'utiliser vos données à leurs propres fins.

Certains de ces prestataires conservent des données **hors du Québec** ${CONFIRMER}. La liste précise et les pays concernés doivent être vérifiés avant publication.

## Combien de temps

Les commandes et leurs pièces comptables sont conservées ${CONFIRMER} ans, durée à valider avec vos obligations fiscales. Une adresse d'infolettre est effacée dès que vous vous désabonnez.

## Vos droits

Vous pouvez demander à consulter les renseignements que nous détenons sur vous, les faire corriger, ou en demander la suppression. Écrivez à [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com) ; nous répondons dans les 30 jours.

## Responsable de la protection des renseignements personnels

${CONFIRMER} — la loi québécoise impose de nommer une personne responsable et de publier ses coordonnées.

## Questions

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
    body_en: `Atlantique Export collects personal information in order to process your orders. This page explains what, why, and what you can require of us.

## What we collect

- **For an order**: name, email address, phone number, and a delivery address when you choose delivery.
- **For the newsletter**: your email address and chosen language, nothing else.
- **While browsing**: a cart identifier, stored in a session cookie, which contains neither your name nor any personal data.

We collect **no payment data**. The Interac transfer happens on your bank's own site; we never see your credentials or account number.

## Why

Your details are used to prepare, collect payment for and deliver your order, and to write to you at each of its steps. A newsletter address is used only to send the newsletter.

We use your information for no other purpose, and **we neither sell nor trade it with anyone**.

## Who has access

- The Atlantique Export team, to handle your order.
- Our technical providers, strictly for what they perform: hosting, the database and email delivery. They act on our behalf and may not use your data for their own purposes.

Some of these providers store data **outside Quebec** ${TO_CONFIRM}. The exact list and countries must be verified before publication.

## How long

Orders and their accounting records are kept for ${TO_CONFIRM} years, a duration to validate against your tax obligations. A newsletter address is erased as soon as you unsubscribe.

## Your rights

You may ask to see the information we hold about you, have it corrected, or ask for its deletion. Write to [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com); we answer within 30 days.

## Privacy officer

${TO_CONFIRM} — Quebec law requires naming a person in charge and publishing their contact details.

## Questions

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
  },

  {
    slug: "politiques/conditions-de-vente",
    is_draft_legal: true,
    title_fr: "Conditions de vente",
    title_en: "Terms of sale",
    body_fr: `Ces conditions s'appliquent à toute commande passée sur atlantiqueexport.com.

## Qui vend

Atlantique Export, ${CONFIRMER} — raison sociale exacte, numéro d'entreprise du Québec et adresse du siège.

## Prix

Les prix sont en **dollars canadiens**. Le prix retenu est celui affiché au moment où vous validez votre commande.

**Les taxes ne sont pas encore calculées automatiquement** ${CONFIRMER}. Dès l'inscription de l'entreprise aux fichiers de la TPS et de la TVQ, la taxe applicable devra figurer sur chaque facture.

## Commander

1. Vous constituez votre panier et choisissez un mode de réception.
2. Vous validez votre commande et recevez un courriel de confirmation portant son numéro.
3. Vous envoyez le virement Interac.
4. Nous confirmons la réception du paiement, puis préparons la commande.

Une commande n'est **ferme qu'une fois le paiement reçu**. Le stock est réservé pour vous pendant **24 heures** ; passé ce délai sans virement, la réservation est libérée et la commande annulée.

## Paiement

Le **virement Interac** est le seul moyen de paiement accepté pour l'instant. Le paiement par carte viendra plus tard.

Les instructions vous sont envoyées par courriel : le montant exact, l'adresse de destination, et le numéro de commande à inscrire dans le message du virement. **Nous ne vous demanderons jamais de payer en cliquant sur un lien.**

## Disponibilité

Nos produits sont importés et parfois en quantité limitée. S'il s'avère qu'un article n'est pas disponible après votre commande, nous vous prévenons et vous remboursons la part correspondante.

## Réception

Voir [la page Livraison et ramassage](/livraison) pour les zones, les frais et les créneaux.

Il vous appartient de fournir une adresse exacte et d'être joignable pendant le créneau choisi. Une livraison manquée peut entraîner des frais de nouvelle présentation ${CONFIRMER}.

## Chaîne du froid

Les produits surgelés et réfrigérés ne sont proposés que pour les modes de réception qui préservent leur température. Le site écarte automatiquement les modes incompatibles avec le contenu de votre panier, et vous en donne le motif.

Une fois la commande remise, il vous revient de ranger sans tarder les produits réfrigérés et surgelés.

## Annulation et remboursement

Voir [la politique de remboursement](/politiques/remboursement).

## Droit applicable

Lois du Québec et du Canada ${CONFIRMER}.

## Nous joindre

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
    body_en: `These terms apply to every order placed on atlantiqueexport.com.

## Who sells

Atlantique Export, ${TO_CONFIRM} — exact legal name, Quebec business number and head office address.

## Prices

Prices are in **Canadian dollars**. The price that applies is the one shown when you confirm your order.

**Taxes are not yet calculated automatically** ${TO_CONFIRM}. As soon as the business is registered for GST and QST, the applicable tax must appear on every invoice.

## Ordering

1. You fill your cart and choose a fulfillment method.
2. You confirm your order and receive a confirmation email carrying its number.
3. You send the Interac transfer.
4. We confirm receipt of payment, then prepare the order.

An order is **firm only once payment is received**. Stock is held for you for **24 hours**; without a transfer by then, the hold is released and the order cancelled.

## Payment

**Interac e-Transfer** is the only accepted payment method for now. Card payment will come later.

Instructions are emailed to you: the exact amount, the destination address, and the order number to write in the transfer message. **We will never ask you to pay by clicking a link.**

## Availability

Our products are imported and sometimes in limited quantity. If an item turns out to be unavailable after your order, we tell you and refund the corresponding part.

## Fulfillment

See [the Delivery and pickup page](/livraison) for zones, fees and time slots.

It is your responsibility to provide an exact address and to be reachable during the chosen slot. A missed delivery may incur a re-delivery fee ${TO_CONFIRM}.

## Cold chain

Frozen and chilled products are offered only for fulfillment methods that preserve their temperature. The site automatically rules out methods incompatible with your cart, and tells you why.

Once the order is handed over, it is up to you to store chilled and frozen products promptly.

## Cancellation and refunds

See [the refund policy](/politiques/remboursement).

## Governing law

Laws of Quebec and Canada ${TO_CONFIRM}.

## Contact

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
  },

  {
    slug: "politiques/remboursement",
    is_draft_legal: true,
    title_fr: "Politique de remboursement",
    title_en: "Refund policy",
    body_fr: `## Denrées alimentaires

Nous vendons des produits alimentaires. Pour des raisons d'hygiène et de sécurité, **un produit alimentaire remis ne peut être ni repris ni échangé**, sauf dans les cas ci-dessous.

Ce n'est pas une clause de confort : nous n'avons aucun moyen de vérifier comment un aliment a été conservé une fois sorti de nos mains.

## Ce que nous remboursons ou remplaçons

- Un article **manquant** dans votre commande.
- Un article **abîmé, périmé ou impropre** à la consommation à la remise.
- Un article **erroné**, différent de ce que vous aviez commandé.
- Une commande **annulée avant préparation**.

Écrivez-nous dans les ${CONFIRMER} heures suivant la réception, avec le numéro de commande et une photographie du produit concerné. Nous remboursons ou remplaçons, à votre choix.

## Annuler une commande

Tant que le virement n'a pas été encaissé, écrivez-nous : la commande est annulée sans frais et le stock libéré.

Une fois la commande **préparée**, elle ne peut plus être annulée ${CONFIRMER}.

## Comment le remboursement est versé

Par virement Interac vers l'adresse courriel utilisée pour la commande, sous ${CONFIRMER} jours ouvrables.

## Livraison manquée

Si personne n'est présent au créneau choisi, nous vous contactons. Une seconde présentation peut être facturée ${CONFIRMER}. Les produits réfrigérés ou surgelés qui ne peuvent plus être garantis ne sont pas remboursés dans ce cas.

## Nous joindre

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
    body_en: `## Food products

We sell food. For hygiene and safety reasons, **a food product that has been handed over cannot be returned or exchanged**, except in the cases below.

This is not a convenience clause: we have no way of verifying how a food item was stored once it left our hands.

## What we refund or replace

- An item **missing** from your order.
- An item **damaged, expired or unfit** for consumption on handover.
- A **wrong** item, different from what you ordered.
- An order **cancelled before preparation**.

Write to us within ${TO_CONFIRM} hours of receipt, with the order number and a photograph of the item. We refund or replace, as you prefer.

## Cancelling an order

As long as the transfer has not been collected, write to us: the order is cancelled at no cost and the stock released.

Once the order has been **prepared**, it can no longer be cancelled ${TO_CONFIRM}.

## How refunds are paid

By Interac e-Transfer to the email address used for the order, within ${TO_CONFIRM} business days.

## Missed delivery

If nobody is present during the chosen slot, we contact you. A second attempt may be charged ${TO_CONFIRM}. Chilled or frozen products that can no longer be guaranteed are not refunded in that case.

## Contact

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
  },

  {
    slug: "politiques/expedition",
    is_draft_legal: true,
    title_fr: "Politique d'expédition",
    title_en: "Shipping policy",
    body_fr: `## Où nous livrons

**Au Canada uniquement.** Nous n'expédions pas à l'international.

La livraison à domicile couvre deux zones, déterminées par votre **code postal** :

- **Île de Montréal** — préfixes H1, H2, H3, H4, H8 et H9. Frais de 7,99 $, offerts dès 75 $ d'achat. Commande minimale de 25 $.
- **Laval, Rive-Sud et Rive-Nord** — préfixes H7, J3, J4, J5, J6 et J7. Frais de 12,99 $, offerts dès 120 $ d'achat. Commande minimale de 40 $.

En dehors de ces préfixes, la livraison n'est pas proposée ; le ramassage reste possible.

## Produits surgelés

Les produits **surgelés ne sont pas livrés hors de l'île de Montréal**, et ne sont jamais expédiés par la poste. Le trajet ne permet pas de garantir la chaîne du froid.

Le site applique cette règle automatiquement : si votre panier contient un produit surgelé, les modes de réception incompatibles sont écartés et le motif vous est indiqué.

## Délais

Vous choisissez un **créneau** parmi ceux proposés sur les 14 jours à venir. Chaque créneau a une capacité limitée ; un créneau complet n'est plus offert.

La commande n'est préparée qu'**après réception du virement**. Un virement envoyé tardivement peut donc faire manquer le créneau choisi.

## Ramassage

Un point de ramassage est disponible à Montréal. **Son adresse exacte et ses heures d'ouverture vous sont communiquées par courriel à la confirmation de votre commande** ${CONFIRMER}.

## Nous joindre

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
    body_en: `## Where we deliver

**Within Canada only.** We do not ship internationally.

Home delivery covers two zones, determined by your **postal code**:

- **Island of Montréal** — prefixes H1, H2, H3, H4, H8 and H9. Fee of $7.99, free from $75. Minimum order $25.
- **Laval, South Shore and North Shore** — prefixes H7, J3, J4, J5, J6 and J7. Fee of $12.99, free from $120. Minimum order $40.

Outside these prefixes, delivery is not offered; pickup remains available.

## Frozen products

Frozen products are **not delivered off the island of Montréal**, and are never sent by post. The journey does not allow the cold chain to be guaranteed.

The site applies this rule automatically: if your cart holds a frozen item, incompatible fulfillment methods are ruled out and the reason is shown.

## Timing

You choose a **time slot** among those offered over the next 14 days. Each slot has limited capacity; a full slot is no longer offered.

An order is prepared only **after the transfer is received**. A transfer sent late may therefore miss the chosen slot.

## Pickup

A pickup point is available in Montréal. **Its exact address and opening hours are emailed to you when your order is confirmed** ${TO_CONFIRM}.

## Contact

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
  },

  {
    slug: "politiques/temoins",
    is_draft_legal: true,
    title_fr: "Politique sur les témoins",
    title_en: "Cookie policy",
    body_fr: `Un « témoin » (ou *cookie*) est un petit fichier déposé par un site dans votre navigateur.

## Ce que nous déposons

**Uniquement des témoins nécessaires au fonctionnement du site.** Il n'y en a que deux :

- **Le panier** — un identifiant aléatoire qui relie votre navigateur à votre panier. Il ne contient ni votre nom, ni votre adresse, ni aucun montant, et le JavaScript de la page ne peut pas le lire.
- **Le suivi de commande** — un jeton qui vous permet de consulter une commande passée sans compte. Sans lui, connaître un numéro de commande suffirait à voir celle d'un autre.

## Ce que nous ne déposons pas

- Aucun témoin **publicitaire**.
- Aucun témoin de **réseau social**.
- Aucun outil de **mesure d'audience** tiers ${CONFIRMER}.

C'est la raison pour laquelle ce site **ne vous demande pas votre consentement** par une bannière : les témoins strictement nécessaires au service que vous demandez en sont dispensés. Si un outil de mesure était ajouté un jour, une bannière deviendrait nécessaire et cette page devrait être revue.

## Les refuser

Votre navigateur permet de bloquer les témoins. Sachez toutefois que sans eux, **le panier et le suivi de commande cessent de fonctionner** : le site n'aura aucun moyen de relier vos actions entre elles.

## Nous joindre

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
    body_en: `A cookie is a small file placed by a website in your browser.

## What we place

**Only cookies necessary for the site to work.** There are just two:

- **The cart** — a random identifier linking your browser to your cart. It holds neither your name, nor your address, nor any amount, and the page's JavaScript cannot read it.
- **Order tracking** — a token letting you view an order placed without an account. Without it, knowing an order number would be enough to see someone else's.

## What we do not place

- No **advertising** cookies.
- No **social network** cookies.
- No third-party **analytics** ${TO_CONFIRM}.

This is why the site **does not ask for your consent** through a banner: cookies strictly necessary to the service you requested are exempt. Should an analytics tool ever be added, a banner would become necessary and this page would need revisiting.

## Refusing them

Your browser can block cookies. Be aware, however, that without them **the cart and order tracking stop working**: the site will have no way to connect your actions together.

## Contact

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)`,
  },

  {
    slug: "politiques/accessibilite",
    is_draft_legal: true,
    title_fr: "Accessibilité",
    title_en: "Accessibility",
    body_fr: `Ce site est conçu pour être utilisable par tout le monde, y compris avec un lecteur d'écran, au clavier seul, ou avec une vision réduite.

## Ce qui est en place

- **Navigation au clavier** sur l'ensemble du site, avec un anneau de mise au point visible sur chaque élément actif et un lien « Aller au contenu principal » en tête de page.
- **Contrastes mesurés.** Chaque couleur de texte a été vérifiée sur son fond ; l'orange de la marque, insuffisant sur blanc, n'est jamais employé pour du texte.
- **Filtres et tri fonctionnels sans JavaScript** : chaque filtre est un lien, chaque tri un formulaire.
- **Textes de remplacement** sur les images de produits, saisis dans les deux langues.
- **Animations désactivées** si votre système annonce une préférence de réduction des animations.
- **Site entièrement bilingue**, français et anglais, la langue de chaque page étant déclarée au navigateur.

## Ce qui reste à faire

- Un audit complet par une personne qualifiée ${CONFIRMER}.
- La vérification du parcours de commande avec un lecteur d'écran réel.

## Un obstacle ?

Si une page vous résiste, écrivez-nous à [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com) en décrivant ce que vous tentiez de faire. Nous corrigeons, et nous vous répondons.`,
    body_en: `This site is built to be usable by everyone, including with a screen reader, by keyboard alone, or with reduced vision.

## What is in place

- **Keyboard navigation** throughout, with a visible focus ring on every interactive element and a "Skip to main content" link at the top of each page.
- **Measured contrast.** Every text colour has been checked against its background; the brand orange, insufficient on white, is never used for text.
- **Filters and sorting work without JavaScript**: each filter is a link, each sort a form.
- **Alternative text** on product images, written in both languages.
- **Animations disabled** if your system signals a reduced-motion preference.
- **Fully bilingual site**, French and English, with each page's language declared to the browser.

## What remains

- A full audit by a qualified professional ${TO_CONFIRM}.
- Testing the checkout journey with a real screen reader.

## Hit an obstacle?

If a page resists you, write to [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com) describing what you were trying to do. We fix it, and we answer you.`,
  },

  /* ---------------------------------------------------------------- */
  /* Pages institutionnelles — pas des textes juridiques               */
  /* ---------------------------------------------------------------- */
  {
    slug: "livraison",
    is_draft_legal: false,
    title_fr: "Livraison et ramassage",
    title_en: "Delivery and pickup",
    body_fr: `Deux façons de recevoir votre commande : la livraison à domicile, ou le ramassage à Montréal.

## Livraison à domicile

La zone est déterminée par votre **code postal**, jamais choisie dans le formulaire.

### Île de Montréal
Préfixes H1, H2, H3, H4, H8, H9.

- Frais : **7,99 $**
- **Offerts dès 75 $** d'achat
- Commande minimale : 25 $
- Tous les produits, y compris les surgelés

### Laval, Rive-Sud et Rive-Nord
Préfixes H7, J3, J4, J5, J6, J7.

- Frais : **12,99 $**
- **Offerts dès 120 $** d'achat
- Commande minimale : 40 $
- **Pas de surgelés** — le trajet ne permet pas de garantir la chaîne du froid

## Ramassage à Montréal

Sans frais, quel que soit le montant. L'adresse exacte et les heures d'ouverture vous sont envoyées par courriel à la confirmation de votre commande ${CONFIRMER}.

## Créneaux

Vous choisissez un créneau parmi ceux offerts sur les **14 jours à venir**. Chaque créneau accueille un nombre limité de commandes ; complet, il disparaît de la liste.

## Chaîne du froid

Si votre panier contient un produit réfrigéré ou surgelé, le site écarte automatiquement les modes de réception qui ne conviennent pas, **et vous dit pourquoi**. Vous ne pouvez pas choisir un mode qui abîmerait votre commande.

Pensez à un sac isotherme si votre trajet de retour depuis le point de ramassage est long.

## Quand votre commande part

Une commande n'est préparée qu'**après réception du virement Interac**. Envoyez-le sans tarder pour ne pas manquer le créneau que vous avez choisi.

Vous recevez un courriel à chaque étape : confirmation, paiement reçu, préparation, mise à disposition, puis livraison.`,
    body_en: `Two ways to receive your order: home delivery, or pickup in Montréal.

## Home delivery

The zone is determined by your **postal code**, never chosen in the form.

### Island of Montréal
Prefixes H1, H2, H3, H4, H8, H9.

- Fee: **$7.99**
- **Free from $75**
- Minimum order: $25
- All products, frozen included

### Laval, South Shore and North Shore
Prefixes H7, J3, J4, J5, J6, J7.

- Fee: **$12.99**
- **Free from $120**
- Minimum order: $40
- **No frozen products** — the journey cannot guarantee the cold chain

## Pickup in Montréal

Free, whatever the amount. The exact address and opening hours are emailed to you when your order is confirmed ${TO_CONFIRM}.

## Time slots

You choose a slot among those offered over the **next 14 days**. Each slot takes a limited number of orders; once full, it disappears from the list.

## Cold chain

If your cart holds a chilled or frozen item, the site automatically rules out unsuitable fulfillment methods **and tells you why**. You cannot choose a method that would spoil your order.

Bring an insulated bag if your trip home from the pickup point is long.

## When your order leaves

An order is prepared only **after the Interac transfer is received**. Send it promptly so you do not miss your chosen slot.

You receive an email at every step: confirmation, payment received, preparation, readiness, then delivery.`,
  },

  {
    slug: "faq",
    is_draft_legal: false,
    title_fr: "Questions fréquentes",
    title_en: "Frequently asked questions",
    body_fr: `## Faut-il créer un compte pour commander ?

Non. La commande se passe sans compte. Un lien de suivi vous permet de consulter votre commande ensuite. Les comptes clients viendront plus tard.

## Comment se fait le paiement ?

Par **virement Interac**, seul moyen accepté pour l'instant. Après votre commande, vous recevez un courriel avec le montant exact, l'adresse de destination et le numéro de commande à inscrire dans le message du virement.

Le paiement par carte viendra plus tard.

## Le virement est-il sécuritaire ?

Vous le faites depuis le site ou l'application de votre banque, jamais depuis un lien reçu par courriel. **Nous ne vous demanderons jamais de payer en cliquant sur un lien**, ni de communiquer un mot de passe ou un numéro de carte.

## Combien de temps ai-je pour payer ?

**24 heures.** Passé ce délai, le stock réservé pour vous est remis en vente et la commande est annulée. Vous pouvez toujours en passer une nouvelle.

## Livrez-vous chez moi ?

Cela dépend de votre code postal. Voir [la page Livraison et ramassage](/livraison) pour les deux zones couvertes.

## Pourquoi ne puis-je pas faire livrer un produit surgelé ?

Hors de l'île de Montréal, le trajet ne permet pas de garantir la chaîne du froid. Le site vous propose alors le ramassage, ou vous invite à retirer l'article surgelé de votre panier.

## Que se passe-t-il si un article manque ?

Nous vous prévenons et vous remboursons la part correspondante. Voir [la politique de remboursement](/politiques/remboursement).

## Comment suivre ma commande ?

Vous recevez un courriel à chaque étape : confirmation, paiement reçu, préparation, mise à disposition, puis livraison. Le lien qu'ils contiennent mène à votre commande.

## Je n'ai pas reçu mes courriels

Vérifiez d'abord vos indésirables. Les courriels partent quelques minutes après l'action, pas instantanément. Si rien n'arrive, écrivez-nous à [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com).

## Vendez-vous aux restaurants et aux épiceries ?

Écrivez-nous à [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com). Les comptes professionnels ne sont pas encore ouverts en ligne, mais nous répondons à chaque demande.`,
    body_en: `## Do I need an account to order?

No. Ordering works without an account. A tracking link lets you view your order afterwards. Customer accounts will come later.

## How do I pay?

By **Interac e-Transfer**, the only accepted method for now. After your order, you receive an email with the exact amount, the destination address and the order number to write in the transfer message.

Card payment will come later.

## Is the transfer safe?

You make it from your bank's own site or app, never from a link received by email. **We will never ask you to pay by clicking a link**, nor for a password or card number.

## How long do I have to pay?

**24 hours.** After that, the stock held for you goes back on sale and the order is cancelled. You can always place a new one.

## Do you deliver to my address?

It depends on your postal code. See [the Delivery and pickup page](/livraison) for the two zones covered.

## Why can't I have a frozen product delivered?

Off the island of Montréal, the journey cannot guarantee the cold chain. The site then offers pickup, or invites you to remove the frozen item from your cart.

## What if an item is missing?

We tell you and refund the corresponding part. See [the refund policy](/politiques/remboursement).

## How do I track my order?

You receive an email at every step: confirmation, payment received, preparation, readiness, then delivery. The link they carry leads to your order.

## I did not receive my emails

Check your spam folder first. Emails leave a few minutes after the action, not instantly. If nothing arrives, write to [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com).

## Do you sell to restaurants and grocers?

Write to [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com). Business accounts are not yet open online, but we answer every request.`,
  },

  {
    slug: "contact",
    is_draft_legal: false,
    title_fr: "Nous joindre",
    title_en: "Contact us",
    body_fr: `## Par courriel

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)

C'est le moyen le plus sûr de nous atteindre, et nous répondons à chaque message.

## Sur Instagram

[@atlantique_export_](https://www.instagram.com/atlantique_export_/) — les arrivages et les coulisses, au jour le jour.

## Pour une commande en cours

Indiquez votre **numéro de commande** (de la forme AE-2026-00042) : il nous permet de retrouver votre dossier immédiatement.

## Téléphone et adresse

${CONFIRMER}

## Restaurants, épiceries et revendeurs

Écrivez-nous à la même adresse en précisant votre établissement et les produits qui vous intéressent.`,
    body_en: `## By email

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com)

It is the surest way to reach us, and we answer every message.

## On Instagram

[@atlantique_export_](https://www.instagram.com/atlantique_export_/) — arrivals and behind the scenes, day by day.

## About a current order

Include your **order number** (in the form AE-2026-00042): it lets us find your file immediately.

## Phone and address

${TO_CONFIRM}

## Restaurants, grocers and resellers

Write to the same address, mentioning your establishment and the products you are interested in.`,
  },

  {
    slug: "a-propos",
    is_draft_legal: false,
    title_fr: "À propos",
    title_en: "About",
    body_fr: `Atlantique Export est une épicerie afroalimentaire en ligne, établie à **Montréal**.

Nous importons et distribuons des produits du **Sénégal et d'Afrique de l'Ouest** : céréales et féculents, poudres naturelles, épices et condiments, thés et boissons, collations, et produits surgelés.

## Notre promesse

Des goûts qui voyagent, une hospitalité qui reste.

## Ce que nous vendons

Le catalogue rassemble aujourd'hui plus de quarante références. Chaque produit indique son origine, ses allergènes déclarés et ses conditions de conservation. Les poissons, fruits et légumes viendront s'y ajouter.

## Comment nous joindre

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com) · [@atlantique_export_](https://www.instagram.com/atlantique_export_/)

## Notre histoire

${CONFIRMER} — cette section attend votre texte : fondation, parcours, ce qui vous a décidés. Nous préférons une page incomplète à une histoire inventée.`,
    body_en: `Atlantique Export is an online African food grocery, based in **Montréal**.

We import and distribute products from **Senegal and West Africa**: grains and starches, natural powders, spices and condiments, teas and drinks, snacks, and frozen goods.

## Our promise

Tastes that travel, hospitality that stays.

## What we sell

The catalogue today gathers more than forty references. Each product states its origin, its declared allergens and its storage conditions. Fish, fruit and vegetables will join them.

## Reaching us

[info@atlantiqueexport.com](mailto:info@atlantiqueexport.com) · [@atlantique_export_](https://www.instagram.com/atlantique_export_/)

## Our story

${TO_CONFIRM} — this section awaits your words: how it started, the path, what convinced you. We prefer an incomplete page to an invented story.`,
  },

  {
    slug: "pro",
    is_draft_legal: false,
    title_fr: "Comptes professionnels",
    title_en: "Business accounts",
    body_fr: `Restaurants, épiceries, traiteurs et revendeurs : nous proposons des tarifs de gros et des formats adaptés.

## Ce qui existe aujourd'hui

Les comptes professionnels **ne sont pas encore ouverts en ligne**. La demande se fait par courriel, et nous traitons chaque dossier à la main.

## Faire une demande

Écrivez à [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com) en indiquant :

- le nom et l'adresse de votre établissement
- votre numéro d'entreprise
- les produits et les volumes qui vous intéressent
- une personne à joindre

Nous revenons vers vous avec une grille tarifaire et les modalités de livraison.

## Ce qui viendra

Un espace professionnel en ligne, avec vos prix, vos commandes récurrentes et vos factures. ${CONFIRMER}`,
    body_en: `Restaurants, grocers, caterers and resellers: we offer wholesale pricing and suitable formats.

## What exists today

Business accounts are **not yet open online**. Requests go through email, and we handle each file by hand.

## Making a request

Write to [info@atlantiqueexport.com](mailto:info@atlantiqueexport.com) stating:

- the name and address of your establishment
- your business number
- the products and volumes you are interested in
- a contact person

We come back to you with a price list and delivery terms.

## What is coming

An online business area, with your prices, your recurring orders and your invoices. ${TO_CONFIRM}`,
  },
];

/* -------------------------------------------------------------------------- */

async function upsert(page) {
  const response = await fetch(`${URL_BASE}/rest/v1/pages?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ ...page, is_published: true, updated_at: new Date().toISOString() }]),
  });

  if (!response.ok) {
    throw new Error(`${page.slug} : ${response.status} ${await response.text()}`);
  }
}

let legal = 0;
for (const page of pages) {
  await upsert(page);
  if (page.is_draft_legal) legal += 1;
  console.log(`  ✓ ${page.slug}${page.is_draft_legal ? "  (brouillon juridique)" : ""}`);
}

console.log(`\n${pages.length} pages publiées, dont ${legal} brouillons juridiques.`);
console.log("Les mentions « [à confirmer] » attendent vos informations.");
