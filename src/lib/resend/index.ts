import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, RESEND_FROM_EMAIL, RESEND_REPLY_TO_EMAIL } from "./client";
import { generateEmailContent, type EmailType } from "./render";

interface QueueEmailOptions {
  type: EmailType;
  recipientEmail: string;
  recipientName?: string;
  locale?: "fr" | "en";
  data: Record<string, unknown>;
}

export type { EmailType };

/**
 * Met un courriel en queue pour envoi.
 * Retourne l'ID du courriel en base (pour tracking).
 */
export async function queueEmail({
  type,
  recipientEmail,
  recipientName,
  locale = "fr",
  data,
}: QueueEmailOptions): Promise<string | null> {
  const db = createAdminClient();

  // Génère le HTML du template
  const { subject, html } = await generateEmailContent(type, locale, data);

  // Insère en base via la fonction SQL
  const { data: result, error } = await db.rpc("enqueue_email", {
    p_email_type: type,
    p_recipient_email: recipientEmail,
    p_subject: subject,
    p_html_body: html,
    p_recipient_name: recipientName || null,
    p_locale: locale,
    p_context_data: data,
  });

  if (error) {
    console.error(`Erreur lors de la mise en queue d'un email ${type}:`, error);
    return null;
  }

  return result as string;
}

/**
 * Traite la queue de courriels : envoie les courriels en attente,
 * gère les relances en cas d'échec.
 * Appelée par un cron côté serveur (route handler ou tâche planifiée).
 */
export async function processEmailQueue() {
  const db = createAdminClient();

  // `claim_emails` ne se contente pas de lire : elle **réserve** les courriels
  // qu'elle rend, en une seule écriture atomique. Un second traitement lancé
  // au même moment saute les lignes déjà tenues au lieu de renvoyer les mêmes
  // courriels. Lire puis envoyer, en deux temps, laissait deux ordonnanceurs
  // simultanés écrire deux fois au même client.
  const { data: emails, error } = await db.rpc("claim_emails", { p_limit: 25 });

  if (error) {
    console.error("Erreur lors de la réservation des courriels :", error);
    return;
  }

  if (!emails || emails.length === 0) {
    return; // Rien à envoyer
  }

  for (const email of emails) {
    await sendSingleEmail(db, email);
  }
}

/**
 * Envoie un seul courriel et met à jour son statut en base.
 */
async function sendSingleEmail(
  db: ReturnType<typeof createAdminClient>,
  email: {
    id: string;
    recipient_email: string;
    subject: string;
    html_body: string;
    attempts: number;
    next_retry_at: string | null;
    last_attempted_at: string | null;
    status: string;
    resend_error: string | null;
  },
) {
  try {
    const result = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: email.recipient_email,
      replyTo: RESEND_REPLY_TO_EMAIL,
      subject: email.subject,
      html: email.html_body,
    });

    if (result.error) {
      // Échec : programme la prochaine relance
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + 5 * (email.attempts + 1)); // Backoff exponentiel

      await db
        .from("email_queue")
        .update({
          status: "failed",
          resend_error: result.error.message,
          attempts: email.attempts + 1,
          next_retry_at: nextRetry.toISOString(),
          last_attempted_at: new Date().toISOString(),
          // Relâche la réservation : sans cela, le courriel resterait tenu
          // jusqu'à l'expiration de dix minutes et sa relance serait retardée
          // d'autant.
          claimed_at: null,
        })
        .eq("id", email.id);

      console.warn(`Email ${email.id} échoué : ${result.error.message}`);
    } else {
      // Succès
      await db
        .from("email_queue")
        .update({
          status: "sent",
          resend_message_id: result.data?.id || null,
          sent_at: new Date().toISOString(),
          last_attempted_at: new Date().toISOString(),
          claimed_at: null,
        })
        .eq("id", email.id);

      console.log(`Email ${email.id} envoyé : ${result.data?.id}`);
    }
  } catch (err) {
    console.error(`Erreur lors de l'envoi de l'email ${email.id}:`, err);

    // Mets à jour le statut en base
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + 5 * (email.attempts + 1));

    await db
      .from("email_queue")
      .update({
        status: "failed",
        resend_error: String(err),
        attempts: email.attempts + 1,
        next_retry_at: nextRetry.toISOString(),
        last_attempted_at: new Date().toISOString(),
        claimed_at: null,
      })
      .eq("id", email.id);
  }
}
