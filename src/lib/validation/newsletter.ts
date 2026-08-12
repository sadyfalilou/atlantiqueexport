import { z } from "zod";

/**
 * Schéma partagé entre le client et le serveur. La validation côté client
 * est un confort d'ergonomie ; celle du serveur fait foi.
 */
export const newsletterSchema = z.object({
  email: z.email().max(254),
  locale: z.enum(["fr", "en"]).default("fr"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
