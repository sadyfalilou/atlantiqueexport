-- =============================================================================
-- Arrivages, réservations et alertes de retour en stock.
--
-- Le modèle commercial d'Atlantique Export repose sur des arrivages : le madd
-- et les mangues n'existent que par vagues. Le client doit pouvoir réserver
-- avant que la marchandise n'arrive.
-- =============================================================================

create table public.shipments (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  title_fr             text not null,
  title_en             text not null,
  notes_fr             text,
  notes_en             text,
  origin_country       text,
  status               public.shipment_status not null default 'announced',
  eta_date             date,
  reservation_deadline date,
  hero_image_url       text,
  is_published         boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger shipments_touch_updated_at
  before update on public.shipments
  for each row execute function public.touch_updated_at();

create table public.shipment_items (
  id                uuid primary key default gen_random_uuid(),
  shipment_id       uuid not null references public.shipments (id) on delete cascade,
  variant_id        uuid not null references public.product_variants (id) on delete cascade,
  planned_quantity  integer not null check (planned_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  -- Place encore réservable, exposée telle quelle au client.
  remaining_quantity integer generated always as (planned_quantity - reserved_quantity) stored,
  deposit_cents     integer not null default 0 check (deposit_cents >= 0),
  unit_price_cents  integer check (unit_price_cents is null or unit_price_cents >= 0),
  created_at        timestamptz not null default now(),
  unique (shipment_id, variant_id),
  -- On ne réserve pas plus que la quantité annoncée.
  constraint shipment_items_reserved_within_planned
    check (reserved_quantity <= planned_quantity)
);

create index shipment_items_shipment_idx on public.shipment_items (shipment_id);

create table public.reservations (
  id               uuid primary key default gen_random_uuid(),
  shipment_item_id uuid not null references public.shipment_items (id) on delete cascade,
  user_id          uuid references auth.users (id) on delete set null,
  email            text not null,
  phone            text,
  locale           text not null default 'fr' check (locale in ('fr', 'en')),
  quantity         integer not null check (quantity > 0),
  deposit_payment_id uuid references public.payments (id) on delete set null,
  status           text not null default 'pending'
    check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled', 'expired')),
  notified_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index reservations_item_idx  on public.reservations (shipment_item_id);
create index reservations_user_idx  on public.reservations (user_id) where user_id is not null;
create index reservations_email_idx on public.reservations (lower(email));

create trigger reservations_touch_updated_at
  before update on public.reservations
  for each row execute function public.touch_updated_at();

-- Réserve une quantité sur un arrivage. Même garantie que pour le stock :
-- verrou de ligne, puis contrainte qui refuse le dépassement.
create or replace function public.reserve_shipment_quantity(
  p_shipment_item_id uuid,
  p_quantity         integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
  v_deadline  date;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité réservée doit être strictement positive'
      using errcode = '22023';
  end if;

  select si.planned_quantity - si.reserved_quantity, s.reservation_deadline
    into v_remaining, v_deadline
  from public.shipment_items si
  join public.shipments s on s.id = si.shipment_id
  where si.id = p_shipment_item_id
  for update of si;

  if not found then
    raise exception 'Ligne d''arrivage inconnue : %', p_shipment_item_id
      using errcode = 'P0002';
  end if;

  if v_deadline is not null and v_deadline < current_date then
    raise exception 'La date limite de réservation est dépassée'
      using errcode = 'P0001';
  end if;

  if v_remaining < p_quantity then
    raise exception 'Quantité insuffisante sur cet arrivage : % demandé(s), % restant(s)',
      p_quantity, v_remaining using errcode = 'P0001';
  end if;

  update public.shipment_items
  set reserved_quantity = reserved_quantity + p_quantity
  where id = p_shipment_item_id;

  return v_remaining - p_quantity;
end;
$$;

-- --- Alertes de retour en stock ----------------------------------------------

create table public.stock_alerts (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  email       text not null,
  locale      text not null default 'fr' check (locale in ('fr', 'en')),
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  -- Une même adresse ne s'inscrit qu'une fois par variante.
  unique (variant_id, email)
);

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.shipments      enable row level security;
alter table public.shipment_items enable row level security;
alter table public.reservations   enable row level security;
alter table public.stock_alerts   enable row level security;

create policy shipments_public_read on public.shipments
  for select to anon, authenticated using (is_published);

create policy shipment_items_public_read on public.shipment_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.shipments s
    where s.id = shipment_id and s.is_published
  ));

-- Un client voit ses propres réservations. Les réservations sans compte
-- passent par le serveur, qui vérifie l'adresse courriel.
create policy reservations_select_own on public.reservations
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- --- Privilèges --------------------------------------------------------------

grant select on public.shipments    to anon, authenticated;
grant select on public.reservations to authenticated;

-- `reserved_quantity` reste interne ; le client voit ce qui reste, pas le
-- détail du carnet de réservations.
grant select (
  id, shipment_id, variant_id, planned_quantity, remaining_quantity,
  deposit_cents, unit_price_cents, created_at
) on public.shipment_items to anon, authenticated;

-- Aucun GRANT sur stock_alerts : les inscriptions passent par le serveur,
-- sans quoi n'importe qui pourrait lire les adresses courriel des autres.

revoke execute on function public.reserve_shipment_quantity(uuid, integer) from public;
