-- =============================================================================
-- Panier, commandes et paiements.
--
-- Principe non négociable : le panier ne stocke AUCUN prix. Il ne retient que
-- l'identifiant de variante et la quantité. Tout montant est recalculé côté
-- serveur depuis le catalogue au moment de l'affichage et du paiement, ce qui
-- rend inopérante toute tentative de modifier un prix depuis le navigateur.
--
-- À l'inverse, la COMMANDE fige ses lignes : nom, format et prix y sont copiés,
-- pour qu'une facture reste exacte même si le catalogue change ensuite.
-- =============================================================================

-- --- Panier ------------------------------------------------------------------
-- Piloté exclusivement côté serveur : aucun privilège n'est accordé aux rôles
-- client. Les paniers invités sont identifiés par un jeton en cookie httpOnly,
-- que RLS ne peut pas inspecter — d'où ce choix.

create table public.carts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users (id) on delete cascade,
  token             text not null unique,
  locale            text not null default 'fr' check (locale in ('fr', 'en')),
  fulfillment_method public.fulfillment_method,
  delivery_zone_id  uuid references public.delivery_zones (id) on delete set null,
  slot_id           uuid references public.delivery_slots (id) on delete set null,
  pickup_location_id uuid references public.pickup_locations (id) on delete set null,
  notes             text,
  expires_at        timestamptz not null default now() + interval '30 days',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index carts_user_idx on public.carts (user_id) where user_id is not null;

create trigger carts_touch_updated_at
  before update on public.carts
  for each row execute function public.touch_updated_at();

create table public.cart_items (
  id                    uuid primary key default gen_random_uuid(),
  cart_id               uuid not null references public.carts (id) on delete cascade,
  variant_id            uuid not null references public.product_variants (id) on delete cascade,
  preparation_option_id uuid references public.preparation_options (id) on delete set null,
  quantity              integer not null check (quantity > 0),
  created_at            timestamptz not null default now(),
  -- Une même variante avec la même préparation n'apparaît qu'une fois :
  -- on incrémente la quantité au lieu d'empiler des lignes identiques.
  unique (cart_id, variant_id, preparation_option_id)
);

-- --- Numérotation des commandes ----------------------------------------------

create sequence public.order_number_seq start with 1;

create or replace function public.next_order_number()
returns text
language sql
volatile
as $$
  select 'AE-' || to_char(now() at time zone 'America/Montreal', 'YYYY')
      || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

-- --- Commandes ---------------------------------------------------------------

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique default public.next_order_number(),
  -- La commande sans compte est autorisée : user_id peut rester nul, le suivi
  -- se fait alors par jeton.
  user_id            uuid references auth.users (id) on delete set null,
  guest_token        text,
  customer_type      public.customer_type not null default 'individual',
  email              text not null,
  phone              text,
  locale             text not null default 'fr' check (locale in ('fr', 'en')),

  status             public.order_status not null default 'new',
  payment_status     public.payment_status not null default 'pending',

  fulfillment_method public.fulfillment_method not null,
  pickup_location_id uuid references public.pickup_locations (id) on delete set null,
  delivery_zone_id   uuid references public.delivery_zones (id) on delete set null,
  slot_id            uuid references public.delivery_slots (id) on delete set null,
  delivery_address   jsonb,
  delivery_notes     text,

  -- Montants en cents CAD. Les taxes sont reportées : les colonnes existent,
  -- restent à zéro, et seront alimentées quand l'entreprise sera inscrite aux
  -- fichiers de la TPS et de la TVQ.
  subtotal_cents     integer not null default 0 check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  discount_cents     integer not null default 0 check (discount_cents >= 0),
  tax_gst_cents      integer not null default 0 check (tax_gst_cents >= 0),
  tax_qst_cents      integer not null default 0 check (tax_qst_cents >= 0),
  total_cents        integer not null default 0 check (total_cents >= 0),
  -- Renseignée en phase 2, quand le poids réel remplacera la tranche de poids.
  weight_adjustment_cents integer not null default 0,

  placed_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Une commande sans compte doit porter un jeton de suivi, sinon son auteur
  -- n'aurait aucun moyen de la consulter.
  constraint orders_guest_needs_token
    check (user_id is not null or guest_token is not null),
  -- Une livraison exige une adresse ; un ramassage exige un point.
  constraint orders_delivery_needs_address check (
    fulfillment_method <> 'local_delivery' or delivery_address is not null
  ),
  constraint orders_pickup_needs_location check (
    fulfillment_method <> 'pickup' or pickup_location_id is not null
  )
);

create index orders_user_idx    on public.orders (user_id) where user_id is not null;
create index orders_status_idx  on public.orders (status);
create index orders_placed_idx  on public.orders (placed_at desc);
create index orders_email_idx   on public.orders (lower(email));

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Le registre des mouvements peut maintenant pointer vers les commandes.
alter table public.stock_movements
  add constraint stock_movements_order_fk
  foreign key (order_id) references public.orders (id) on delete set null;

-- --- Lignes de commande ------------------------------------------------------
-- Copies figées : elles survivent à toute modification ultérieure du catalogue.

create table public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id) on delete cascade,
  variant_id            uuid references public.product_variants (id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot          text not null,
  unit_label_snapshot   text not null,
  preparation_snapshot  text,
  quantity              integer not null check (quantity > 0),
  unit_price_cents      integer not null check (unit_price_cents >= 0),
  estimated_weight_g    integer,
  actual_weight_g       integer,
  line_total_cents      integer not null check (line_total_cents >= 0),
  created_at            timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

-- --- Historique des statuts --------------------------------------------------

create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  actor_id    uuid references auth.users (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

-- Chaque changement de statut laisse une trace, sans que le code applicatif
-- ait à y penser.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_events (order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_log_status_change
  after insert or update of status on public.orders
  for each row execute function public.log_order_status_change();

-- --- Paiements ---------------------------------------------------------------
-- Aucune donnée de carte bancaire n'est stockée ici, jamais : seulement des
-- références au fournisseur de paiement.

create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  provider           public.payment_provider not null,
  provider_reference text,
  payment_type       public.payment_type not null default 'full',
  amount_cents       integer not null check (amount_cents >= 0),
  status             public.payment_status not null default 'pending',
  -- Pour Interac : qui a constaté le virement, et quand. La même information
  -- est doublée dans le journal d'audit administrateur.
  confirmed_by       uuid references auth.users (id) on delete set null,
  confirmed_at       timestamptz,
  metadata           jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);

create trigger payments_touch_updated_at
  before update on public.payments
  for each row execute function public.touch_updated_at();

-- Table d'idempotence des webhooks. Le paiement par carte est reporté en
-- phase 2, mais la table est posée dès maintenant : un INSERT en doublon
-- échouera, ce qui empêche de traiter deux fois un événement rejoué.
create table public.payment_webhook_events (
  event_id     text primary key,
  provider     public.payment_provider not null,
  event_type   text not null,
  processed_at timestamptz not null default now()
);

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.carts                 enable row level security;
alter table public.cart_items            enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_events          enable row level security;
alter table public.payments              enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Un client connecté consulte ses commandes, et rien d'autre. Les commandes
-- invitées passent par le serveur, qui vérifie le jeton de suivi.
create policy orders_select_own on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy order_items_select_own on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_staff())
  ));

create policy order_events_select_own on public.order_events
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_staff())
  ));

-- Les paiements ne sont visibles que du personnel : ils portent des références
-- de transaction qui n'ont rien à faire côté client.
create policy payments_staff_read on public.payments
  for select to authenticated
  using (public.has_staff_role(array['super_admin', 'manager', 'support']::public.staff_role[]));

-- --- Privilèges --------------------------------------------------------------
-- Le panier n'a aucun privilège client : il est manipulé uniquement par le
-- serveur, ce qui garantit que les prix ne peuvent pas être soufflés depuis
-- le navigateur.

grant select on public.orders       to authenticated;
grant select on public.order_items  to authenticated;
grant select on public.order_events to authenticated;

-- Aucun GRANT sur carts, cart_items, payments et payment_webhook_events.

revoke execute on function public.next_order_number() from public;
