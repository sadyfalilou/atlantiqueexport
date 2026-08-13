import { NextRequest, NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/resend";

/**
 * Route de traitement de la queue de courriels.
 * Appelée toutes les 5 minutes (ou moins) par un service de cron.
 *
 * Vercel Cron Triggers : https://vercel.com/docs/cron-jobs
 * Configuration : vercel.json ou environment variables.
 *
 * En développement, cette route peut être appelée manuellement :
 *   curl http://localhost:3000/api/cron/send-emails
 */
export async function GET(req: NextRequest) {
  // Validation optionnelle du secret (si vous avez un CRON_SECRET)
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // En développement, on laisse passer
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
