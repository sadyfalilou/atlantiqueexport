/**
 * `fetch` qui retente les lectures quand Supabase a un hoquet.
 *
 * Le 14 septembre 2026, un déploiement de production a échoué sur un seul
 * « Gateway Timeout » renvoyé par Supabase pendant la prégénération des fiches
 * produits. La même requête, mesurée juste après, répondait en 130 ms : c'était
 * un incident passager, et il avait suffi à bloquer toute la mise en ligne.
 *
 * Deux limites, volontaires :
 *
 * 1. **Seules les lectures sont retentées** (GET et HEAD). Rejouer une écriture
 *    dont on ignore si elle a abouti risquerait de la faire deux fois. La règle
 *    tient à la méthode HTTP, pas à l'appelant : aucun oubli possible.
 * 2. **Seules les erreurs passagères** : 502, 503, 504 et les coupures réseau.
 *    Une 500, une 404 ou un refus de droits ne s'arrangent pas en réessayant ;
 *    les retenter ne ferait que retarder l'erreur.
 *
 * Si la dernière tentative échoue encore, la réponse est rendue telle quelle :
 * l'appelant voit l'erreur comme avant, et le build échoue toujours plutôt que
 * de publier un catalogue vide.
 */

const TRANSIENT_STATUSES = new Set([502, 503, 504]);

export interface RetryingFetchOptions {
  /** Nombre total d'essais, premier compris. */
  attempts?: number;
  /** Délai avant la deuxième tentative ; il double ensuite. */
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (details: { attempt: number; attempts: number; reason: string; url: string }) => void;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  return method.toUpperCase();
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function createRetryingFetch({
  attempts = 3,
  baseDelayMs = 300,
  // Résolu à chaque appel, pas figé au chargement : Next remplace le `fetch`
  // global pour gérer son cache de données, et capturer l'original ici le
  // contournerait sans bruit.
  fetchImpl = (input, init) => fetch(input, init),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onRetry = ({ attempt, attempts: total, reason, url }) => {
    // Visible dans les journaux de build : un succès obtenu à la deuxième
    // tentative doit rester une information, pas passer inaperçu.
    const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    console.warn(`Supabase : ${reason} sur ${path}, nouvelle tentative ${attempt}/${total}`);
  },
}: RetryingFetchOptions = {}): typeof fetch {
  return async (input, init) => {
    const method = methodOf(input, init);
    if (method !== "GET" && method !== "HEAD") return fetchImpl(input, init);

    for (let attempt = 1; ; attempt += 1) {
      let reason: string;

      try {
        const response = await fetchImpl(input, init);
        if (!TRANSIENT_STATUSES.has(response.status) || attempt >= attempts) return response;
        reason = `HTTP ${response.status}`;
        // La réponse écartée doit être consommée, sinon la connexion reste
        // retenue le temps que le ramasse-miettes s'en occupe.
        await response.body?.cancel();
      } catch (error) {
        // Une annulation voulue par l'appelant n'est pas un incident réseau.
        if (init?.signal?.aborted || attempt >= attempts) throw error;
        reason = error instanceof Error ? error.message : "erreur réseau";
      }

      onRetry({ attempt: attempt + 1, attempts, reason, url: urlOf(input) });
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  };
}
