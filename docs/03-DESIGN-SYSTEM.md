# Étape 3 — Design system

_Dernière mise à jour : 11 août 2026_

Intention : **marché africain contemporain et premium**. Chaleureux sans être folklorique, épuré
sans être froid. La photographie porte l'émotion ; l'interface s'efface pour la servir.

Les jetons ci-dessous sont la source de vérité et sont déclarés dans `src/app/globals.css` via la
directive `@theme` de Tailwind CSS 4. Aucune couleur ne doit être écrite en dur dans un composant.

## 3.1 Couleurs

Tous les ratios de contraste indiqués ont été **calculés**, pas estimés. La cible est WCAG 2.2 AA
(4,5:1 pour le texte courant, 3:1 pour les composants d'interface et le texte large).

### Crème — arrière-plans

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `cream-50` | `#FDF8F0` | Fond de page par défaut |
| `cream-100` | `#F7EFE2` | Sections alternées, survol discret |
| `cream-200` | `#EFE6D8` | Séparateurs, fonds de zones |
| `cream-300` | `#E3D7C4` | Bordures décoratives |

### Vert forêt — navigation, titres, confiance

**`forest-800` est le vert exact du logo**, relevé sur le fichier fourni par Atlantique Export
(`#145130`, couleur dominante à 84 000 pixels). Avec du blanc il donne 9,34:1 : la barre de
navigation porte donc la couleur de la marque sans le moindre compromis de lisibilité. Les autres
degrés en dérivent.

| Jeton | Valeur | Contraste | Usage |
| --- | --- | --- | --- |
| `forest-900` | `#0B3A22` | 12,09:1 sur crème (AAA) | Texte principal, titres, pied de page |
| `forest-800` | `#145130` | 8,83:1 sur crème · 9,34:1 avec blanc | **Vert du logo** — barre de navigation |
| `forest-700` | `#1A6A3E` | — | Survols, bordures actives |
| `forest-600` | `#2D7A54` | — | Illustrations, icônes décoratives |
| `forest-50` | `#EAF2ED` | — | Fond de badge « confiance » |

### Orange mangue — appels à l'action et promotions

**`mango-500` est l'orange exact du logo** (`#F39100`).

⚠️ **Règle stricte, issue du calcul.** Le blanc sur l'orange de la marque ne donne que **2,37:1**
et échoue nettement. L'orange du logo ne porte donc **que du texte vert foncé**. Pour un bouton à
texte blanc, il faut descendre jusqu'à `mango-700`.

| Jeton | Valeur | Contraste | Usage autorisé |
| --- | --- | --- | --- |
| `mango-500` | `#F39100` | 5,39:1 avec `forest-900` | **Orange du logo** — badges, pastilles, **texte foncé obligatoire** |
| `mango-600` | `#E8760D` | — | Décoratif uniquement, **jamais de texte blanc dessus** |
| `mango-700` | `#C2540A` | 4,60:1 avec blanc (AA) | **Fond des boutons d'action principaux** |
| `mango-800` | `#A8460A` | 5,60:1 sur crème (AA) | Texte orange, liens promotionnels, survol de bouton |

### Bleu océan — poissons et produits de la mer

| Jeton | Valeur | Contraste | Usage |
| --- | --- | --- | --- |
| `ocean-700` | `#14607A` | 7,04:1 avec blanc (AAA) · 6,66:1 sur crème | Badges surgelé/frais, univers marin |
| `ocean-50` | `#E8F1F5` | — | Fond de badge température |

### Or — détails premium

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `gold-400` | `#F7C948` | Aplats décoratifs (texte `forest-900` dessus : 9,35:1) |
| `gold-700` | `#8A6D1F` | 4,63:1 sur crème — texte doré, mentions « sélection » |

L'or est un accent de finition : filets, séparateurs, mention d'une sélection. Jamais un aplat
dominant, jamais un bouton.

### Neutres et états

| Jeton | Valeur | Contraste | Usage |
| --- | --- | --- | --- |
| `ink` | `#0F2E22` | 13,85:1 | Texte principal |
| `muted` | `#6B5D50` | 6,01:1 sur crème (AA) | Texte secondaire, métadonnées |
| `border` | `#E3D7C4` | — | Bordures décoratives (cartes, séparateurs) |
| `border-strong` | `#8C7B66` | 3,86:1 sur crème (AA pour composants) | **Bordures de champs de formulaire** |
| `success` | `#166534` | 6,74:1 | En stock, confirmation |
| `warning` | `#A8460A` | 5,60:1 | Stock limité, action requise |
| `danger` | `#B42318` | 6,22:1 | Épuisé, erreur |
| `surface` | `#FFFFFF` | — | Cartes et zones de contenu |

### Répartition visuelle recommandée

Environ **70 % crème et blanc**, 20 % vert forêt, 8 % orange mangue, 2 % or et bleu océan. C'est ce
déséquilibre volontaire qui fait respirer la page et qui donne du poids aux boutons d'action.

## 3.2 Typographie

| Rôle | Police | Justification |
| --- | --- | --- |
| Titres et affichage | **Fraunces** (variable, serif) | Serif chaleureuse et éditoriale — c'est elle qui éloigne le site du « thème Shopify générique » |
| Interface et texte courant | **Inter** (variable, sans) | Excellente lisibilité aux petites tailles, chiffres tabulaires pour les prix |

Chargées via `next/font/google` : pas de requête vers un domaine tiers, pas de décalage de mise en
page au chargement.

| Échelle | Taille mobile / desktop | Graisse | Usage |
| --- | --- | --- | --- |
| `display` | 36 / 56 px | Fraunces 600 | Titre de la bannière d'accueil |
| `h1` | 28 / 40 px | Fraunces 600 | Titre de page |
| `h2` | 22 / 30 px | Fraunces 600 | Titre de section |
| `h3` | 18 / 22 px | Inter 600 | Sous-titre, nom de produit |
| `body` | 16 px | Inter 400 | Texte courant — jamais en dessous de 16 px |
| `small` | 14 px | Inter 400 | Métadonnées, mentions légales |
| `price` | 18 / 22 px | Inter 700, `tabular-nums` | Prix — les chiffres restent alignés d'une carte à l'autre |
| `label` | 12 px | Inter 600, `uppercase`, `tracking-wide` | Badges, étiquettes |

Longueur de ligne limitée à 68 caractères sur le texte long. Interlignage 1,6 pour le corps, 1,15
pour les titres.

## 3.3 Espacements, rayons, ombres

**Espacements** — échelle de base 4 px : `1 = 4px`, `2 = 8px`, `3 = 12px`, `4 = 16px`, `6 = 24px`,
`8 = 32px`, `12 = 48px`, `16 = 64px`, `24 = 96px`.
Rythme vertical des sections : 48 px sur mobile, 96 px à partir de `lg`.
Gouttière de page : 16 px sur mobile, 24 px sur tablette, 32 px au-delà. Largeur de contenu
maximale : 1280 px.

**Rayons** — `sm 6px` (badges, champs), `md 10px` (boutons), `lg 16px` (cartes),
`xl 24px` (blocs et bannières), `full` (pastilles et puces de filtre).

**Ombres** — teintées de brun chaud plutôt que de gris neutre, pour rester dans l'ambiance crème.
`sm : 0 1px 2px rgba(61,45,30,.06)` · `md : 0 4px 12px rgba(61,45,30,.08)` ·
`lg : 0 12px 32px rgba(61,45,30,.10)`. Au-delà, on n'utilise pas d'ombre : on utilise une bordure.

## 3.4 Composants

### Boutons

| Variante | Fond | Texte | Emploi |
| --- | --- | --- | --- |
| `primary` | `mango-700` | blanc | Ajouter au panier, payer — un seul par écran |
| `secondary` | `forest-800` | blanc | Actions de navigation importantes |
| `outline` | transparent, bordure `forest-800` | `forest-800` | Actions secondaires |
| `ghost` | transparent | `forest-800` | Actions tertiaires, barres d'outils |
| `danger` | `danger` | blanc | Suppression, annulation |

Hauteurs : `sm 36px`, `md 44px`, `lg 52px`. **La cible tactile ne descend jamais sous 44 × 44 px**,
y compris pour les boutons d'incrément de quantité. Le focus se matérialise par un anneau de 2 px
en `forest-700` avec 2 px de décalage — visible sur crème comme sur blanc. Un bouton en cours de
soumission affiche un indicateur et se désactive : jamais de double envoi de commande.

### Cartes produit

Fond blanc, rayon `lg`, ombre `sm` montant à `md` au survol, image en ratio 4:5. Contenu, dans
l'ordre : image, badges (température et état de stock), marque, nom sur deux lignes maximum, format,
prix accompagné du prix à l'unité de mesure (« 12,99 $ · 25,98 $/kg »), bouton d'ajout.
La carte entière est cliquable, mais le bouton d'ajout reste une cible distincte — pas de lien
imbriqué dans un lien.

### Badges

| Badge | Couleurs |
| --- | --- |
| Ambiant | `cream-200` / `forest-900` |
| Frais | `forest-50` / `forest-800` |
| Réfrigéré | `ocean-50` / `ocean-700` |
| Surgelé | `ocean-700` / blanc |
| En stock | `forest-50` / `success` |
| Stock limité | `#FDF0E2` / `warning` |
| Épuisé | `cream-200` / `muted` |
| En arrivage · Précommande | `gold-400` / `forest-900` |
| Promotion | `mango-700` / blanc |
| Nouveau | `forest-800` / blanc |

Chaque badge porte un texte : **la couleur n'est jamais le seul véhicule de l'information**.

### Formulaires

Champs à hauteur 48 px, bordure `border-strong` (3:1 garanti), rayon `sm`, fond blanc.
Étiquette visible au-dessus du champ — jamais de simple texte indicatif en guise d'étiquette.
Message d'aide sous le champ, message d'erreur en `danger` accompagné d'une icône et relié au
champ par `aria-describedby`. Les erreurs disent quoi faire : « Entrez un code postal montréalais,
par exemple H2X 1Y4 », pas « Champ invalide ».

### Navigation

Bandeau d'annonce optionnel en `forest-900`, barre principale en `forest-800` avec logo, recherche,
sélecteur de langue, compte et panier avec compteur.
Le **méga-menu Boutique** s'ouvre au survol sur desktop, au clic au clavier, et se ferme avec
`Échap` ; ses colonnes sont générées depuis la table `categories`.
Sur mobile : un tiroir latéral, plus une **barre inférieure fixe** à quatre entrées — Accueil,
Boutique, Recherche, Panier — pour que le panier reste toujours à un doigt.

### États interactifs

Survol : assombrissement d'un cran et élévation de l'ombre.
Focus : anneau 2 px `forest-700`, décalage 2 px, jamais supprimé.
Actif : légère compression (`scale .98`), 120 ms.
Désactivé : opacité 50 %, curseur interdit, et **toujours une explication textuelle** de la raison.
Chargement : squelettes reprenant la forme réelle du contenu, pas un rond qui tourne.
Vide : icône, phrase explicative, action de sortie — c'est notamment le traitement de la section
avis tant qu'aucun avis authentique n'existe.

### Mouvement

Transitions de 150 à 250 ms, courbe `ease-out`. Seuls la couleur, l'ombre, l'opacité et la
translation sont animés. `prefers-reduced-motion` désactive tout mouvement non essentiel.

## 3.4 bis Le logo

L'original est versionné dans `assets/brand/logo-original.jpg`. Les déclinaisons sont **fabriquées
par script** (`npm run brand:build`) et ne se retouchent jamais à la main : le jour où le logo
change, une commande régénère tout et le découpage reste vérifiable.

| Fichier | Contenu | Où |
| --- | --- | --- |
| `logo-wordmark.png` | ATLANTIQUE EXPORT + emblème, sans la signature | Tiroir mobile |
| `logo-wordmark-reverse.png` | Idem, vert foncé remplacé par du crème | **En-tête** |
| `logo-full.png` | Logo complet avec la signature | Fonds clairs |
| `logo-full-reverse.png` | Idem, en version claire | **Pied de page** |
| `logo-mark.png` | L'emblème seul, carré | Favicone, icône d'application, bannière d'accueil |
| `og-image.png` | 1200 × 630, logo centré sur crème | Partage sur les réseaux |

Trois décisions à connaître avant d'y toucher.

**La déclinaison claire est indispensable.** Le mot EXPORT est en vert foncé ; posé tel quel sur la
barre de navigation, il disparaîtrait purement et simplement. Le script remplace donc ce vert par
du crème, en conservant l'orange et le feuillage blanc du baobab.

**Le fond blanc devient transparent par remplissage depuis les bords**, et non par un simple « tout
blanc devient transparent » : le feuillage du baobab est blanc lui aussi, et aurait été troué.

**L'emblème est détouré par un masque elliptique.** Il est encastré dans le O d'EXPORT et frôle la
signature ; un découpage rectangulaire happait le T d'ATLANTIQUE et un bout de texte.

La signature « Des goûts qui voyagent, une hospitalité qui reste » n'apparaît pas dans l'en-tête :
à cette hauteur elle serait illisible. Elle est réservée au pied de page et aux grands formats.

## 3.5 Photographie et motifs

Photographies grand format, lumière naturelle, arrière-plans crème ou bois, produits présentés en
situation. En l'absence de vraie photo, un placeholder affiche l'initiale de la catégorie sur un
aplat crème avec un liseré doré et la mention « Photo à venir » — élégant, honnêtement identifiable,
et remplaçable en changeant une seule ligne en base.

Les motifs inspirés du textile ouest-africain sont réduits à des filets fins et des séparateurs,
en or ou en vert, à moins de 10 % d'opacité. Jamais en fond de page, jamais derrière du texte.

## 3.6 Points de rupture

`sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`.
Conception mobile d'abord, testée dès **320 px** de large. Grille produit : 2 colonnes sur mobile,
3 sur tablette, 4 sur desktop.
