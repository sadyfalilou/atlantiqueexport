import type { ReactNode } from "react";

/**
 * Rend le corps d'une page institutionnelle.
 *
 * Le texte est stocké en Markdown volontairement pauvre — titres, listes,
 * paragraphes, gras et liens — et converti ici en composants React, **jamais
 * injecté en HTML**. Un `dangerouslySetInnerHTML` sur du contenu venu de la
 * base ouvrirait une faille : quiconque obtiendrait un accès en écriture aux
 * pages pourrait exécuter du script chez chaque visiteur. Convertir en
 * éléments React ferme la porte par construction.
 */

/** `**gras**` et `[texte](adresse)` — le reste est rendu tel quel. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));

    if (match[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${index}`} className="font-semibold text-forest-900">
          {match[1]}
        </strong>,
      );
    } else {
      const href = match[3];
      // Seuls les liens internes, les adresses http(s) et les courriels sont
      // acceptés : `javascript:` dans un lien serait exécutable au clic.
      const safe = /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : "#";
      nodes.push(
        <a
          key={`${keyPrefix}-a${index}`}
          href={safe}
          className="text-forest-800 underline underline-offset-2 hover:text-forest-900"
          {...(safe.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {match[2]}
        </a>,
      );
    }

    last = match.index + match[0].length;
    index += 1;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Prose({ body }: { body: string }) {
  const blocks = body.trim().split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        const key = `b${index}`;
        const lines = block.split("\n");

        // Un titre ne prend QUE sa propre ligne. Sans cette découpe, un
        // sous-titre suivi d'une phrase sans ligne vide entre les deux
        // avalait la phrase et l'affichait en gros caractères — et exiger
        // d'un rédacteur qu'il y pense serait un piège à répétition.
        if (block.startsWith("## ") || block.startsWith("### ")) {
          const level = block.startsWith("### ") ? 3 : 2;
          const heading = lines[0].slice(level === 3 ? 4 : 3);
          const rest = lines.slice(1).join("\n").trim();

          return (
            <div key={key} className="flex flex-col gap-3">
              {level === 3 ? (
                <h3 className="mt-2 font-semibold text-forest-900">
                  {inline(heading, key)}
                </h3>
              ) : (
                <h2 className="mt-4 font-display text-xl font-semibold text-forest-900 lg:text-2xl">
                  {inline(heading, key)}
                </h2>
              )}
              {rest ? <Prose body={rest} /> : null}
            </div>
          );
        }

        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={key} className="flex list-disc flex-col gap-2 pl-5 text-muted">
              {lines.map((line, i) => (
                <li key={`${key}-${i}`}>{inline(line.slice(2), `${key}-${i}`)}</li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => /^\d+\.\s/.test(line))) {
          return (
            <ol key={key} className="flex list-decimal flex-col gap-2 pl-5 text-muted">
              {lines.map((line, i) => (
                <li key={`${key}-${i}`}>
                  {inline(line.replace(/^\d+\.\s/, ""), `${key}-${i}`)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={key} className="text-muted">
            {inline(block, key)}
          </p>
        );
      })}
    </div>
  );
}
