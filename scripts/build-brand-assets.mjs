/**
 * Fabrique les déclinaisons du logo à partir de l'original.
 *
 *   npm run brand:build
 *
 * Source : assets/brand/logo-original.jpg (fourni par Atlantique Export)
 * Sorties : public/brand/*.png
 *
 * Pourquoi un script plutôt que des fichiers retouchés à la main : le jour où
 * le logo change, une seule commande régénère toutes les déclinaisons, et le
 * découpage reste vérifiable au lieu d'être un geste perdu dans un logiciel.
 *
 * Ce qui est produit :
 *   logo-wordmark.png   ATLANTIQUE EXPORT + emblème, sans la signature.
 *                       Pour l'en-tête, où la signature serait illisible.
 *   logo-full.png       Le logo complet avec « Des goûts qui voyagent… ».
 *   logo-mark.png       L'emblème seul (disque, baobab, avion), carré.
 *                       Pour la favicone et les icônes d'application.
 *   *-reverse.png       Les mêmes, avec le vert foncé remplacé par du crème,
 *                       pour les fonds vert forêt de l'en-tête et du pied de
 *                       page — sans quoi le mot EXPORT y disparaîtrait.
 *
 * Le fond blanc devient transparent par remplissage depuis les bords : le
 * blanc INTÉRIEUR (le feuillage du baobab) est ainsi préservé, alors qu'un
 * simple « tout blanc devient transparent » l'aurait troué.
 */

import { PNG } from "pngjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));

const CREAM = [253, 248, 240]; // --color-cream-50
const DISC_ORANGE = [243, 145, 0]; // orange exact du logo
const WHITE_THRESHOLD = 235;

// L'original est un JPEG : on passe par sips, présent sur toute machine macOS.
const sourceJpg = path("assets/brand/logo-original.jpg");
const sourcePng = path("assets/brand/.logo-original.png");
execFileSync("sips", ["-s", "format", "png", sourceJpg, "--out", sourcePng], {
  stdio: "ignore",
});

const source = PNG.sync.read(readFileSync(sourcePng));
const { width: W, height: H, data } = source;

const px = (x, y) => {
  const i = (W * y + x) << 2;
  return [data[i], data[i + 1], data[i + 2]];
};
const isWhite = (x, y) => {
  const [r, g, b] = px(x, y);
  return r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD;
};

/* --- 1. Fond : remplissage depuis les bords ------------------------------- */

const background = new Uint8Array(W * H);
const queue = [];
for (let x = 0; x < W; x++) {
  for (const y of [0, H - 1]) if (isWhite(x, y)) queue.push(W * y + x);
}
for (let y = 0; y < H; y++) {
  for (const x of [0, W - 1]) if (isWhite(x, y)) queue.push(W * y + x);
}
while (queue.length > 0) {
  const index = queue.pop();
  if (background[index]) continue;
  background[index] = 1;
  const x = index % W;
  const y = (index - x) / W;
  if (x > 0 && isWhite(x - 1, y) && !background[index - 1]) queue.push(index - 1);
  if (x < W - 1 && isWhite(x + 1, y) && !background[index + 1]) queue.push(index + 1);
  if (y > 0 && isWhite(x, y - 1) && !background[index - W]) queue.push(index - W);
  if (y < H - 1 && isWhite(x, y + 1) && !background[index + W]) queue.push(index + W);
}

/* --- 2. Découpe --------------------------------------------------------- */

/** Le vert de la marque est sombre et verdâtre ; l'orange est clair et rouge. */
const isBrandGreen = ([r, g, b]) => g >= r && r < 140 && b < 140;

function bounds(predicate) {
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!predicate(x, y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, x1, y0, y1 };
}

const hasInk = (x, y) => !background[W * y + x];

// Bandes horizontales entièrement vides : elles séparent le mot-symbole de la
// signature. On coupe à la dernière avant le bas.
const emptyRows = [];
for (let y = 0; y < H; y++) {
  let inked = false;
  for (let x = 0; x < W && !inked; x++) if (hasInk(x, y)) inked = true;
  if (!inked) emptyRows.push(y);
}

const full = bounds(hasInk);
const separators = emptyRows.filter((y) => y > full.y0 + 40 && y < full.y1 - 20);
const taglineCut = separators.length > 0 ? Math.max(...separators) : full.y1;

// L'emblème : le disque orange, cherché sous le mot ATLANTIQUE.
const isDiscOrange = (x, y) => {
  if (y < H * 0.38) return false;
  const [r, g, b] = px(x, y);
  return r > 200 && g > 100 && g < 190 && b < 90;
};
const disc = bounds(isDiscOrange);

/* --- 3. Fabrication ------------------------------------------------------ */

function crop(
  { x0, x1, y0, y1 },
  {
    reverse = false,
    pad = 0,
    square = false,
    ellipseMask = false,
    greenToOrange = false,
  } = {},
) {
  let left = x0 - pad;
  let top = y0 - pad;
  let width = x1 - x0 + 1 + pad * 2;
  let height = y1 - y0 + 1 + pad * 2;

  // L'emblème est encastré dans le mot EXPORT et frôle la signature : un
  // découpage rectangulaire happe le « T » d'ATLANTIQUE et un bout de texte.
  // Le masque elliptique ne retient que le disque lui-même.
  const mask = ellipseMask
    ? {
        cx: (x1 + x0) / 2,
        cy: (y1 + y0) / 2,
        rx: (x1 - x0 + 1) / 2 + 2,
        ry: (y1 - y0 + 1) / 2 + 2,
      }
    : null;

  if (square) {
    const side = Math.max(width, height);
    left -= Math.round((side - width) / 2);
    top -= Math.round((side - height) / 2);
    width = side;
    height = side;
  }

  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = left + x;
      const sy = top + y;
      const target = (width * y + x) << 2;

      if (sx < 0 || sy < 0 || sx >= W || sy >= H || background[W * sy + sx]) {
        out.data[target + 3] = 0;
        continue;
      }

      if (mask) {
        const dx = (sx - mask.cx) / mask.rx;
        const dy = (sy - mask.cy) / mask.ry;
        if (dx * dx + dy * dy > 1) {
          out.data[target + 3] = 0;
          continue;
        }
      }

      const colour = px(sx, sy);
      let mapped = colour;

      if (greenToOrange) {
        // Sur l'emblème isolé, le trait vert qui traverse le disque appartient
        // au lockup complet, pas à l'emblème : laissé tel quel, il disparaît
        // sur un fond vert forêt et le disque paraît mordu.
        //
        // L'emblème ne doit contenir que deux couleurs. Tout ce qui n'est ni
        // le blanc du feuillage ni l'orange du disque est donc comblé en
        // orange — y compris les pixels intermédiaires du lissage, qui
        // laisseraient sinon un liseré sombre le long de l'ancien trait.
        const [r, g, b] = colour;
        const isFoliageWhite = Math.min(r, g, b) > 200;
        const isDisc = r > 180 && g > 80 && g < 205 && b < 120;
        if (!isFoliageWhite && !isDisc) mapped = DISC_ORANGE;
      } else if (reverse && isBrandGreen(colour)) {
        mapped = CREAM;
      }
      out.data[target] = mapped[0];
      out.data[target + 1] = mapped[1];
      out.data[target + 2] = mapped[2];
      out.data[target + 3] = 255;
    }
  }
  return out;
}

mkdirSync(path("public/brand"), { recursive: true });

const outputs = [
  ["logo-full.png", { ...full }, {}],
  ["logo-full-reverse.png", { ...full }, { reverse: true }],
  ["logo-wordmark.png", { ...full, y1: taglineCut }, {}],
  ["logo-wordmark-reverse.png", { ...full, y1: taglineCut }, { reverse: true }],
  ["logo-mark.png", disc, { square: true, pad: 10, ellipseMask: true, greenToOrange: true }],
];

/** Réduction par moyenne de zone : un simple échantillonnage produirait des
 *  bords crénelés sur un logo à aplats. */
function downscale(source, targetWidth) {
  const ratio = source.width / targetWidth;
  const targetHeight = Math.round(source.height / ratio);
  const out = new PNG({ width: targetWidth, height: targetHeight });

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx0 = Math.floor(x * ratio);
      const sy0 = Math.floor(y * ratio);
      const sx1 = Math.min(source.width, Math.ceil((x + 1) * ratio));
      const sy1 = Math.min(source.height, Math.ceil((y + 1) * ratio));

      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (source.width * sy + sx) << 2;
          const alpha = source.data[i + 3] / 255;
          r += source.data[i] * alpha;
          g += source.data[i + 1] * alpha;
          b += source.data[i + 2] * alpha;
          a += source.data[i + 3];
          n += 1;
        }
      }
      const target = (targetWidth * y + x) << 2;
      const coverage = a / (n * 255) || 0;
      out.data[target] = coverage > 0 ? Math.round(r / n / coverage) : 0;
      out.data[target + 1] = coverage > 0 ? Math.round(g / n / coverage) : 0;
      out.data[target + 2] = coverage > 0 ? Math.round(b / n / coverage) : 0;
      out.data[target + 3] = Math.round(a / n);
    }
  }
  return out;
}

/* --- 4. Écriture --------------------------------------------------------- */

// Le remplissage depuis les bords produit une transparence binaire, donc des
// contours crénelés à pleine résolution. Rééchantillonner à une largeur
// raisonnable lisse ces bords ET divise le poids des fichiers par cinq. La
// largeur d'affichage maximale est d'environ 250 px : 900 px couvre
// largement les écrans à haute densité.
const MAX_WIDTH = 900;

console.log("\nFabrication des déclinaisons du logo\n");
const built = {};
for (const [name, box, options] of outputs) {
  const cropped = crop(box, options);
  const image =
    cropped.width > MAX_WIDTH ? downscale(cropped, MAX_WIDTH) : cropped;
  built[name] = image;
  writeFileSync(path(`public/brand/${name}`), PNG.sync.write(image));
  console.log(`  ✓ ${name.padEnd(28)} ${image.width}×${image.height}`);
}

/* --- 4. Image de partage (Open Graph) ------------------------------------ */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const og = new PNG({ width: OG_WIDTH, height: OG_HEIGHT });
for (let i = 0; i < og.data.length; i += 4) {
  og.data[i] = CREAM[0];
  og.data[i + 1] = CREAM[1];
  og.data[i + 2] = CREAM[2];
  og.data[i + 3] = 255;
}

const logo = downscale(built["logo-full.png"], Math.round(OG_WIDTH * 0.66));
const offsetX = Math.round((OG_WIDTH - logo.width) / 2);
const offsetY = Math.round((OG_HEIGHT - logo.height) / 2);
for (let y = 0; y < logo.height; y++) {
  for (let x = 0; x < logo.width; x++) {
    const s = (logo.width * y + x) << 2;
    const alpha = logo.data[s + 3] / 255;
    if (alpha === 0) continue;
    const t = (OG_WIDTH * (offsetY + y) + offsetX + x) << 2;
    for (let c = 0; c < 3; c++) {
      og.data[t + c] = Math.round(logo.data[s + c] * alpha + og.data[t + c] * (1 - alpha));
    }
  }
}
writeFileSync(path("public/brand/og-image.png"), PNG.sync.write(og));
console.log(`  ✓ ${"og-image.png".padEnd(28)} ${OG_WIDTH}×${OG_HEIGHT}`);

// Icônes de l'application : Next.js les reprend depuis src/app/.
// L'emblème est repris à sa taille native (346 px) : l'agrandir ne créerait
// aucun détail, seulement du poids.
const mark = built["logo-mark.png"];
writeFileSync(path("src/app/icon.png"), PNG.sync.write(mark));
writeFileSync(path("src/app/apple-icon.png"), PNG.sync.write(downscale(mark, 180)));
console.log(`  ✓ ${"src/app/icon.png".padEnd(28)} ${mark.width}×${mark.height}`);
console.log(`  ✓ ${"src/app/apple-icon.png".padEnd(28)} 180×180`);
console.log(`\n  Signature détectée à partir de y=${taglineCut + 1}`);
console.log(`  Emblème : ${disc.x1 - disc.x0 + 1}×${disc.y1 - disc.y0 + 1} px\n`);
