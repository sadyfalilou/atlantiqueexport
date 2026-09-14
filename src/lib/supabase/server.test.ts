// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le branchement réel : le module de nouvelle tentative a ses propres tests,
 * mais rien ne prouverait sinon que supabase-js passe bien par lui, ni que les
 * lectures du catalogue arrivent en GET — la condition pour être retentées.
 */

vi.mock("server-only", () => ({}));

function stubSupabase(statuses: number[]) {
  const methods: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      methods.push((init?.method ?? "GET").toUpperCase());
      const status = statuses.shift() ?? 200;
      return new Response(status === 200 ? JSON.stringify([{ id: "p1" }]) : "Gateway Timeout", {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return methods;
}

describe("createCatalogClient", () => {
  // Avant CHAQUE test : `unstubAllEnvs` les efface après chacun, et un client
  // sans adresse refuse de se construire.
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retente une lecture du catalogue après un Gateway Timeout", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const methods = stubSupabase([504, 200]);
    const { createCatalogClient } = await import("./server");

    const { data, error } = await createCatalogClient().from("products").select("id");

    expect(error).toBeNull();
    expect(data).toEqual([{ id: "p1" }]);
    expect(methods).toEqual(["GET", "GET"]);
  });

  it("ne retente pas la recherche, qui passe par un appel RPC", async () => {
    const methods = stubSupabase([504, 200]);
    const { createCatalogClient } = await import("./server");

    const { error } = await createCatalogClient().rpc("search_products", { p_query: "bissap" });

    expect(error).not.toBeNull();
    expect(methods).toEqual(["POST"]);
  });
});
