import type { CSSProperties, ReactNode } from "react";

/**
 * Socle commun à tous les courriels d'Atlantique Export.
 *
 * Trois contraintes dictent tout ce fichier, et aucune n'est négociable :
 *
 * 1. **Tout est en tableaux.** Outlook rend le HTML avec le moteur de Word,
 *    qui ignore `flex`, `grid` et la plupart des positionnements. Un
 *    `display: flex` ne « dégrade » pas : il empile les colonnes les unes
 *    sous les autres. Les gabarits d'origine s'en servaient pour aligner les
 *    totaux — le sous-total et le montant se retrouvaient sur deux lignes.
 * 2. **Tous les styles sont en ligne.** Gmail retire les feuilles de style.
 * 3. **Les polices de la marque ne sont pas installées chez le destinataire.**
 *    Fraunces et Inter sont donc remplacées par des piles génériques : un
 *    serif pour les titres, la police système pour le texte.
 *
 * La palette est celle de `globals.css`, avec ses contrastes déjà mesurés.
 * En particulier l'orange du logo (#f39100) ne donne que 2,37:1 avec du
 * blanc : les boutons descendent donc à mango-700 (#c2540a, 4,60:1).
 */

const C = {
  page: "#f7efe2", // cream-100 — fond de la page
  surface: "#ffffff",
  panel: "#fdf8f0", // cream-50 — encadrés
  line: "#e3d7c4", // cream-300 — filets
  forest: "#145130", // vert du logo
  forestDark: "#0b3a22", // bandeau d'en-tête
  mango: "#f39100", // orange du logo — décor seulement
  cta: "#c2540a", // mango-700 — seul orange qui porte du texte blanc
  ink: "#0f2e22",
  muted: "#6b5d50",
  danger: "#b42318",
} as const;

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', Times, serif";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://atlantiqueexport.com"
  );
}

const reset: CSSProperties = { margin: 0, padding: 0 };

/* -------------------------------------------------------------------------- */
/* Blocs réutilisables                                                         */
/* -------------------------------------------------------------------------- */

export function Text({
  children,
  size = 15,
  color = C.ink,
  bold = false,
  align = "left",
  top = 0,
  bottom = 16,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  top?: number;
  bottom?: number;
}) {
  return (
    <p
      style={{
        ...reset,
        marginTop: `${top}px`,
        marginBottom: `${bottom}px`,
        fontFamily: SANS,
        fontSize: `${size}px`,
        lineHeight: 1.65,
        color,
        fontWeight: bold ? 700 : 400,
        textAlign: align,
      }}
    >
      {children}
    </p>
  );
}

export function Heading({
  children,
  top = 32,
}: {
  children: ReactNode;
  top?: number;
}) {
  return (
    <h2
      style={{
        ...reset,
        marginTop: `${top}px`,
        marginBottom: "12px",
        fontFamily: SERIF,
        fontSize: "19px",
        lineHeight: 1.3,
        color: C.forestDark,
        fontWeight: 700,
      }}
    >
      {children}
    </h2>
  );
}

/** Encadré crème, pour isoler une information sans l'enfermer dans une image. */
export function Panel({
  children,
  accent,
}: {
  children: ReactNode;
  /** Filet coloré à gauche, pour une information à ne pas manquer. */
  accent?: string;
}) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ borderCollapse: "collapse", marginBottom: "20px" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: C.panel,
              border: `1px solid ${C.line}`,
              borderLeft: accent
                ? `4px solid ${accent}`
                : `1px solid ${C.line}`,
              borderRadius: "8px",
              padding: "18px 20px",
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Ligne « libellé à gauche, valeur à droite ».
 *
 * C'est ici que le `display: flex` d'origine cassait : deux cellules d'un
 * tableau tiennent sur une ligne partout, y compris dans Outlook.
 */
export function InfoRow({
  label,
  value,
  strong = false,
  total = false,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  total?: boolean;
}) {
  const cell: CSSProperties = {
    fontFamily: SANS,
    fontSize: total ? "17px" : "15px",
    lineHeight: 1.5,
    color: total ? C.forestDark : C.ink,
    padding: total ? "12px 0 0" : "5px 0",
    borderTop: total ? `2px solid ${C.line}` : undefined,
  };

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td style={{ ...cell, color: total ? C.forestDark : C.muted }}>
            {label}
          </td>
          <td
            style={{
              ...cell,
              textAlign: "right",
              fontWeight: strong || total ? 700 : 400,
              whiteSpace: "nowrap",
              paddingLeft: "12px",
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Bouton d'appel à l'action, construit en tableau pour survivre à Outlook. */
export function Button({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      align="center"
      style={{ borderCollapse: "collapse", margin: "28px auto" }}
    >
      <tbody>
        <tr>
          <td style={{ backgroundColor: C.cta, borderRadius: "8px" }}>
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: "13px 30px",
                fontFamily: SANS,
                fontSize: "15px",
                fontWeight: 700,
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "8px",
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function Divider({ space = 28 }: { space?: number }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              borderTop: `1px solid ${C.line}`,
              fontSize: 0,
              lineHeight: 0,
              height: 0,
              paddingTop: `${space}px`,
            }}
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* -------------------------------------------------------------------------- */
/* Enveloppe                                                                   */
/* -------------------------------------------------------------------------- */

export function EmailLayout({
  title,
  preview,
  locale,
  children,
}: {
  title: string;
  /** Ligne d'aperçu affichée par la boîte de réception à côté de l'objet. */
  preview: string;
  locale: "fr" | "en";
  children: ReactNode;
}) {
  const t =
    locale === "fr"
      ? {
          tagline: "Des goûts qui voyagent, une hospitalité qui reste",
          questions: "Une question ? Écrivez-nous à",
          shop: "Voir la boutique",
          rights: "Tous droits réservés.",
          city: "Montréal, Québec",
        }
      : {
          tagline: "Tastes that travel, hospitality that stays",
          questions: "A question? Write to us at",
          shop: "Visit the shop",
          rights: "All rights reserved.",
          city: "Montréal, Quebec",
        };

  const site = siteUrl();

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        {/* Sans cette balise, un téléphone suppose une page de 980 px et
            réduit tout le courriel à l'échelle : le texte devient illisible
            là où la plupart des gens le lisent. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <title>{title}</title>
      </head>
      <body style={{ ...reset, backgroundColor: C.page, width: "100%" }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{
            ...reset,
            backgroundColor: C.page,
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 12px" }}>
                {/* Texte d'aperçu : lu par la boîte de réception, invisible à l'ouverture. */}
                <div
                  style={{
                    display: "none",
                    overflow: "hidden",
                    lineHeight: "1px",
                    opacity: 0,
                    maxHeight: 0,
                    maxWidth: 0,
                  }}
                >
                  {preview}
                </div>

                {/* `width="100%"` avec `max-width`, jamais `width="600"` :
                    l'attribut HTML impose une largeur intrinsèque que le
                    moteur de tableaux fait respecter au conteneur, si bien
                    que `max-width` n'a plus rien à contraindre et que le
                    courriel déborde sur un téléphone. Contrepartie assumée :
                    Outlook ignore `max-width` et affiche donc le courriel sur
                    toute la largeur du volet de lecture — large, mais lisible,
                    là où l'autre défaut coupait le total à l'écran. */}
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    {/* --- En-tête : logo sur le vert de la marque --- */}
                    <tr>
                      <td
                        align="center"
                        style={{
                          backgroundColor: C.forestDark,
                          padding: "28px 24px 24px",
                          borderRadius: "12px 12px 0 0",
                        }}
                      >
                        <a href={site} style={{ textDecoration: "none" }}>
                          {/* `next/image` n'a pas de sens ici : ce HTML est lu par
                          une boîte de courriel, hors de toute page Next.
                          Et c'est le mot-symbole, pas le logo complet : la
                          signature qu'il porte devient illisible à cette
                          taille, et le pied de page la reprend en toutes
                          lettres. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${site}/brand/logo-wordmark-reverse.png`}
                            width="260"
                            height="72"
                            alt="Atlantique Export"
                            style={{
                              display: "block",
                              width: "260px",
                              maxWidth: "100%",
                              height: "auto",
                              border: 0,
                            }}
                          />
                        </a>
                      </td>
                    </tr>
                    {/* Filet orange : la seule place où l'orange du logo est lisible. */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: C.mango,
                          height: "4px",
                          fontSize: 0,
                          lineHeight: 0,
                        }}
                      >
                        &nbsp;
                      </td>
                    </tr>

                    {/* --- Corps --- */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: C.surface,
                          padding: "36px 32px 32px",
                        }}
                      >
                        <h1
                          style={{
                            ...reset,
                            marginBottom: "20px",
                            fontFamily: SERIF,
                            fontSize: "26px",
                            lineHeight: 1.25,
                            color: C.forestDark,
                            fontWeight: 700,
                          }}
                        >
                          {title}
                        </h1>
                        {children}
                      </td>
                    </tr>

                    {/* --- Pied --- */}
                    <tr>
                      <td
                        align="center"
                        style={{
                          backgroundColor: C.panel,
                          borderTop: `1px solid ${C.line}`,
                          borderRadius: "0 0 12px 12px",
                          padding: "26px 32px 30px",
                        }}
                      >
                        <p
                          style={{
                            ...reset,
                            marginBottom: "14px",
                            fontFamily: SERIF,
                            fontSize: "14px",
                            fontStyle: "italic",
                            color: C.forest,
                          }}
                        >
                          {t.tagline}
                        </p>
                        <p
                          style={{
                            ...reset,
                            marginBottom: "12px",
                            fontFamily: SANS,
                            fontSize: "13px",
                            lineHeight: 1.6,
                            color: C.muted,
                          }}
                        >
                          {t.questions}{" "}
                          <a
                            href="mailto:info@atlantiqueexport.com"
                            style={{
                              color: C.cta,
                              textDecoration: "underline",
                            }}
                          >
                            info@atlantiqueexport.com
                          </a>
                        </p>
                        <p
                          style={{
                            ...reset,
                            fontFamily: SANS,
                            fontSize: "12px",
                            lineHeight: 1.6,
                            color: C.muted,
                          }}
                        >
                          Atlantique Export · {t.city}
                          <br />© {new Date().getFullYear()} Atlantique Export.{" "}
                          {t.rights}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export { C as emailColors, SANS as emailSans, SERIF as emailSerif };
