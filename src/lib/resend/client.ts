import "server-only";
import { Resend } from "resend";

// Validations de configuration au démarrage
if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY manquante. Vérifier .env.local");
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error("RESEND_FROM_EMAIL manquante. Vérifier .env.local");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
export const RESEND_REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO_EMAIL || RESEND_FROM_EMAIL;
