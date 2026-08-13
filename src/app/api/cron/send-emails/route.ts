import { NextRequest, NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/resend";

/**
 * Route de traitement de la queue de courriels.
 *
 * Appelée toutes les 5 minutes par un service de cron externe (cron-job.org,
 * GitHub Actions…), qui doit présenter l'en-tête :
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Le cron de Vercel n'est pas utilisé : le plan hobby ne l'autorise qu'une
 * fois par jour, ce qui ferait attendre une confirmation de commande jusqu'au
 * lendemain.
 *
 * En développement :
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        http://localhost:3000/api/cron/send-emails
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Sans secret configuré la route reste fermée, jamais ouverte : n'importe
  // qui pourrait sinon la marteler et épuiser le quota d'envoi Resend.
  if (!secret) {
    console.error("CRON_SECRET absent : la route de cron refuse de servir.");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processEmailQueue();
    return NextResponse.json({ success: true, message: "Email queue processed" });
  } catch (err) {
    console.error("Error processing email queue:", err);
    return NextResponse.json(
      { error: "Failed to process email queue", details: String(err) },
      { status: 500 },
    );
  }
}
