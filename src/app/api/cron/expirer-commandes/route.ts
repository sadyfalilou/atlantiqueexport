import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueOrderExpiredEmail } from "@/lib/resend/order-emails";

/**
 * Libère les commandes impayées passé le délai annoncé au client.
 *
 * Les conditions de vente promettent 24 heures de réservation, puis
 * l'annulation. Sans cette route, la promesse n'était tenue par personne : le
 * stock d'une commande jamais payée restait bloqué indéfiniment, invendable.
 *
 * Appelée par cron-job.org, avec le même secret que la file de courriels.
 * Une fois par heure suffit : le délai se compte en heures, pas en minutes.
 *
 * L'opération est idempotente — la fonction SQL verrouille les lignes qu'elle
 * traite et saute celles qu'une autre exécution tient déjà. Deux appels
 * simultanés ne libèrent donc jamais deux fois le même stock.
 */
const DELAI_HEURES = 24;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET absent : la route d'expiration refuse de servir.");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc("expire_unpaid_orders", {
      p_hours: DELAI_HEURES,
    });

    if (error) throw new Error(error.message);

    const expirees = (data ?? []) as Array<{
      order_id: string;
      order_number: string;
      released_units: number;
    }>;

    // Prévenir le client, une fois le stock déjà rendu. Une commande annulée
    // en silence laisse quelqu'un attendre une livraison qui ne viendra pas.
    for (const commande of expirees) {
      await queueOrderExpiredEmail(commande.order_id, DELAI_HEURES);
    }

    // Journalisé même quand rien n'expire : lire « 0 commande » dans les
    // journaux prouve que la tâche tourne, là où le silence ne prouve rien.
    console.log(
      `Expiration des commandes : ${expirees.length} annulée(s)`,
      expirees.map((o) => `${o.order_number} (${o.released_units} u.)`).join(", "),
    );

    return NextResponse.json({
      success: true,
      expired: expirees.length,
      orders: expirees.map((o) => o.order_number),
    });
  } catch (err) {
    console.error("Expiration des commandes échouée :", err);
    return NextResponse.json(
      { error: "Failed to expire orders", details: String(err) },
      { status: 500 },
    );
  }
}
