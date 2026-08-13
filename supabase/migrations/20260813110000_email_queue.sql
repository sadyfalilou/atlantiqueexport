-- =============================================================================
-- File d'envoi de courriels transactionnels via Resend.
--
-- Chaque courriel (bienvenue, confirmation de commande, paiement, etc.) est
-- enregistré dans cette table avant d'être envoyé. En cas d'échec, les
-- relances sont orchestrées par une tâche côté serveur qui consulte cette
-- table.
-- =============================================================================

create type public.email_type as enum (
  'welcome',                    -- Bienvenue lors de l'inscription
  'order_confirmation',         -- Confirmation de commande reçue
  'interac_pending',           -- Attente virement Interac
  'payment_confirmed',         -- Paiement confirmé
  'order_preparing',           -- Commande en préparation
  'ready_for_pickup',          -- Prêt pour ramassage
  'in_delivery',               -- En livraison
  'order_delivered',           -- Livrée
  'preorder_confirmation',     -- Précommande confirmée
  'arrival_available',         -- Arrivage disponible
  'back_in_stock',            -- Retour en stock
  'password_reset'             -- Réinitialisation de mot de passe
);

create type public.email_status as enum ('pending', 'sent', 'failed', 'bounced');

create table public.email_queue (
  id                    uuid primary key default gen_random_uuid(),
  email_type            public.email_type not null,
  recipient_email       text not null,
  recipient_name        text,
  locale                text not null default 'fr' check (locale in ('fr', 'en')),
  subject               text not null,
  html_body             text not null,
  context_data          jsonb,  -- Données de contexte (numéro de commande, prix, etc.)
  status                public.email_status not null default 'pending',
  resend_message_id     text,   -- ID retourné par Resend
  resend_error          text,   -- Dernier message d'erreur de Resend
  attempts              integer not null default 0,
  max_attempts          integer not null default 5,
  next_retry_at         timestamptz,
  last_attempted_at     timestamptz,
  sent_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index email_queue_status_next_retry on public.email_queue (status, next_retry_at)
  where status in ('pending', 'failed');
create index email_queue_recipient on public.email_queue (recipient_email);
create index email_queue_created_at on public.email_queue (created_at desc);

create trigger email_queue_touch_updated_at
  before update on public.email_queue
  for each row execute function public.touch_updated_at();

-- Fonction pour mettre en queue un courriel : insère en base et retourne l'ID.
-- Utilisée dans les Server Actions lors d'une commande, d'une réinitialisation, etc.
create function public.enqueue_email(
  p_email_type public.email_type,
  p_recipient_email text,
  p_subject text,
  p_html_body text,
  p_recipient_name text default null,
  p_locale text default 'fr',
  p_context_data jsonb default null
)
returns uuid as $$
declare
  v_id uuid;
begin
  insert into public.email_queue (
    email_type, recipient_email, recipient_name, locale, subject, html_body, context_data
  ) values (
    p_email_type, p_recipient_email, p_recipient_name, p_locale, p_subject, p_html_body, p_context_data
  )
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;

-- RLS : personne n'a accès par défaut à cette table (elle est gérée côté serveur).
alter table public.email_queue enable row level security;

-- Pas de politique RLS pour l'instant : l'accès est réservé à la clé de service
-- (côté serveur). Si on ajoute plus tard une interface d'administration pour
-- consulter l'historique d'envoi, on créerait ici une politique pour staff_admin.
