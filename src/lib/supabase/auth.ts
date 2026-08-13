import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Session Supabase côté serveur.
 *
 * Le client lit et écrit les cookies de session ; c'est lui qui sait QUI est
 * connecté. Les données de l'administration sont ensuite lues avec la clé de
 * service — mais seulement après que le rôle a été vérifié ici. L'ordre
 * compte : on identifie, on autorise, puis on lit.
 */
export async function createSessionClient() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options);
            }
          } catch {
            // Next.js interdit d'écrire un cookie pendant le rendu d'une page.
            // Le rafraîchissement de session se fera alors depuis une Server
            // Action ou un Route Handler ; ignorer ici est sans conséquence.
          }
        },
      },
    },
  );
}

export type StaffRole =
  | "super_admin"
  | "manager"
  | "picker"
  | "driver"
  | "support";

export interface StaffMember {
  userId: string;
  email: string;
  roles: StaffRole[];
}

/**
 * Personne connectée ET membre du personnel, ou `null`.
 *
 * La vérification se fait en base à chaque appel : retirer un rôle prend effet
 * immédiatement, sans attendre l'expiration d'une session.
 */
export async function getStaffMember(): Promise<StaffMember | null> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (data ?? []).map((row) => (row as { role: StaffRole }).role);
  if (roles.length === 0) return null;

  return { userId: user.id, email: user.email ?? "", roles };
}

export function hasRole(member: StaffMember, ...roles: StaffRole[]): boolean {
  return member.roles.some((role) => roles.includes(role));
}

/**
 * Journalise une action d'administration. Appelé notamment à la validation
 * d'un virement Interac : il faut pouvoir dire qui a constaté quel
 * encaissement, et quand.
 */
export async function logAdminAction(
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  diff?: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    diff: diff ?? null,
  });
}
