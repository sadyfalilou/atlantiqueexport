// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createRetryingFetch } from "./retrying-fetch";

const URL_PRODUITS = "https://exemple.supabase.co/rest/v1/products?select=*";

function setup(responses: Array<number | Error>) {
  const calls: Array<{ method: string }> = [];
  const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ method: init?.method ?? "GET" });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return new Response("{}", { status: next ?? 200 });
  }) as unknown as typeof fetch;
  const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
  const onRetry = vi.fn();
  const retrying = createRetryingFetch({ fetchImpl, sleep, onRetry });
  return { retrying, calls, sleep, onRetry };
}

describe("createRetryingFetch", () => {
  it("retente une lecture après un Gateway Timeout, et rend la réponse suivante", async () => {
    const { retrying, calls, onRetry } = setup([504, 200]);
    const response = await retrying(URL_PRODUITS);
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 2, attempts: 3, reason: "HTTP 504" }),
    );
  });

  it("retente 502 et 503 aussi", async () => {
    const { retrying, calls } = setup([502, 503, 200]);
    expect((await retrying(URL_PRODUITS)).status).toBe(200);
    expect(calls).toHaveLength(3);
  });

  it("abandonne après trois essais et rend la dernière erreur telle quelle", async () => {
    // L'appelant doit toujours voir l'échec : le build s'arrête plutôt que de
    // publier un catalogue vide.
    const { retrying, calls } = setup([504, 504, 504, 200]);
    expect((await retrying(URL_PRODUITS)).status).toBe(504);
    expect(calls).toHaveLength(3);
  });

  it("espace les tentatives de plus en plus", async () => {
    const { retrying, sleep } = setup([504, 504, 200]);
    await retrying(URL_PRODUITS);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([300, 600]);
  });

  it("retente après une coupure réseau", async () => {
    const { retrying, calls } = setup([new TypeError("fetch failed"), 200]);
    expect((await retrying(URL_PRODUITS)).status).toBe(200);
    expect(calls).toHaveLength(2);
  });

  it("ne retente jamais une écriture", async () => {
    // Rejouer un POST dont on ignore s'il a abouti risquerait de le faire deux fois.
    const { retrying, calls } = setup([504, 200]);
    const response = await retrying(URL_PRODUITS, { method: "POST", body: "{}" });
    expect(response.status).toBe(504);
    expect(calls).toHaveLength(1);
  });

  it("ne retente pas les erreurs qui ne s'arrangent pas en réessayant", async () => {
    for (const status of [500, 404, 401]) {
      const { retrying, calls } = setup([status, 200]);
      expect((await retrying(URL_PRODUITS)).status).toBe(status);
      expect(calls).toHaveLength(1);
    }
  });

  it("ne retente pas une requête annulée par l'appelant", async () => {
    const controller = new AbortController();
    controller.abort();
    const { retrying, calls } = setup([new DOMException("aborted", "AbortError"), 200]);
    await expect(retrying(URL_PRODUITS, { signal: controller.signal })).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });

  it("rend immédiatement une réponse réussie, sans attendre", async () => {
    const { retrying, calls, sleep } = setup([200]);
    expect((await retrying(URL_PRODUITS)).status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
