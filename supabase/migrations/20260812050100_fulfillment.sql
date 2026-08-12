-- =============================================================================
-- Logistique : ramassage, zones de livraison, créneaux, jours bloqués.
--
-- Ces règles sont administrables depuis la base, pas codées dans l'interface :
-- changer un tarif ou ouvrir un créneau ne doit pas demander un redéploiement.
--
-- Créée avant les commandes, qui s'y réfèrent.
-- =============================================================================

-- --- Points de ramassage -----------------------------------------------------

create table public.pickup_locations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  address         jsonb not null,
  opening_hours   jsonb,
  instructions_fr text,
  instructions_en text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger pickup_locations_touch_updated_at
  before update on public.pickup_locations
  for each row execute function public.touch_updated_at();

-- --- Zones de livraison ------------------------------------------------------

create table public.delivery_zones (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  -- Préfixes de codes postaux, ex. {'H1A','H2X'}. La correspondance se fait
  -- sur les trois premiers caractères, sans espace ni casse.
  postal_prefixes             text[] not null default '{}',
  fee_cents                   integer not null default 0 check (fee_cents >= 0),
  free_shipping_threshold_cents integer check (free_shipping_threshold_cents is null or free_shipping_threshold_cents >= 0),
  min_order_cents             integer not null default 0 check (min_order_cents >= 0),
  -- Températures acceptées dans cette zone. Une zone lointaine peut refuser
  -- le surgelé même en livraison locale.
  allowed_temperature_classes public.temperature_class[] not null
    default '{ambient,fresh,refrigerated,frozen}',
  position                    integer not null default 0,
  is_active                   boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index delivery_zones_prefixes_idx on public.delivery_zones using gin (postal_prefixes);

create trigger delivery_zones_touch_updated_at
  before update on public.delivery_zones
  for each row execute function public.touch_updated_at();

-- --- Créneaux ----------------------------------------------------------------

create table public.delivery_slots (
  id           uuid primary key default gen_random_uuid(),
  -- NULL = créneau de ramassage, rattaché à un point plutôt qu'à une zone.
  zone_id      uuid references public.delivery_zones (id) on delete cascade,
  pickup_location_id uuid references public.pickup_locations (id) on delete cascade,
  method       public.fulfillment_method not null,
  slot_date    date not null,
  start_time   time not null,
  end_time     time not null,
  capacity     integer not null check (capacity > 0),
  booked_count integer not null default 0 check (booked_count >= 0),
  -- Exposée au client pour qu'il sache s'il reste de la place, sans lui
  -- révéler le dimensionnement des tournées.
  remaining_capacity integer generated always as (capacity - booked_count) stored,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),

  constraint slots_end_after_start check (end_time > start_time),
  -- La capacité d'un créneau est garantie par la base, pas par l'interface :
  -- deux réservations simultanées sur la dernière place ne peuvent pas passer.
  constraint slots_capacity_not_exceeded check (booked_count <= capacity),
  -- Un créneau appartient soit à une zone de livraison, soit à un point de
  -- ramassage, jamais aux deux.
  constraint slots_belong_to_one_target check (
    (zone_id is not null and pickup_location_id is null)
    or (zone_id is null and pickup_location_id is not null)
  )
);

create index delivery_slots_date_idx on public.delivery_slots (slot_date, method)
  where is_active;

-- Réserve une place dans un créneau. Même principe que pour le stock : verrou
-- de ligne, puis contrainte qui fait échouer la transaction en cas de dépassement.
create or replace function public.book_delivery_slot(p_slot_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity integer;
  v_booked   integer;
begin
  select capacity, booked_count into v_capacity, v_booked
  from public.delivery_slots
  where id = p_slot_id and is_active
  for update;

  if not found then
    raise exception 'Créneau inconnu ou fermé : %', p_slot_id using errcode = 'P0002';
  end if;

  if v_booked >= v_capacity then
    raise exception 'Créneau complet' using errcode = 'P0001';
  end if;

  update public.delivery_slots
  set booked_count = booked_count + 1
  where id = p_slot_id;

  return v_capacity - v_booked - 1;
end;
$$;

create or replace function public.release_delivery_slot(p_slot_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.delivery_slots
  set booked_count = greatest(0, booked_count - 1)
  where id = p_slot_id;
end;
$$;

-- --- Jours bloqués -----------------------------------------------------------

create table public.blocked_days (
  blocked_date date primary key,
  reason       text,
  applies_to   public.fulfillment_method[] not null
    default '{pickup,local_delivery,shipping}',
  created_at   timestamptz not null default now()
);

-- --- Règles d'expédition postale ---------------------------------------------
-- Livraison au Canada uniquement, et réservée aux produits ambiants
-- (voir la matrice de compatibilité dans docs/02-ARCHITECTURE.md).

create table public.shipping_rules (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  provinces             text[] not null default '{AB,BC,MB,NB,NL,NS,NT,NU,ON,PE,QC,SK,YT}',
  max_weight_g          integer check (max_weight_g is null or max_weight_g > 0),
  base_fee_cents        integer not null default 0 check (base_fee_cents >= 0),
  free_threshold_cents  integer check (free_threshold_cents is null or free_threshold_cents >= 0),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger shipping_rules_touch_updated_at
  before update on public.shipping_rules
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.pickup_locations enable row level security;
alter table public.delivery_zones   enable row level security;
alter table public.delivery_slots   enable row level security;
alter table public.blocked_days     enable row level security;
alter table public.shipping_rules   enable row level security;

-- Le client doit voir les options de réception pour choisir au paiement.
create policy pickup_locations_public_read on public.pickup_locations
  for select to anon, authenticated using (is_active);

create policy delivery_zones_public_read on public.delivery_zones
  for select to anon, authenticated using (is_active);

create policy delivery_slots_public_read on public.delivery_slots
  for select to anon, authenticated
  using (is_active and slot_date >= current_date);

create policy blocked_days_public_read on public.blocked_days
  for select to anon, authenticated using (true);

create policy shipping_rules_public_read on public.shipping_rules
  for select to anon, authenticated using (is_active);

-- --- Privilèges --------------------------------------------------------------

grant select on public.pickup_locations to anon, authenticated;
grant select on public.delivery_zones   to anon, authenticated;
grant select on public.blocked_days     to anon, authenticated;
grant select on public.shipping_rules   to anon, authenticated;

-- Sur les créneaux, `capacity` et `booked_count` restent internes ; seule la
-- place restante est publiée.
grant select (
  id, zone_id, pickup_location_id, method, slot_date, start_time, end_time,
  remaining_capacity, is_active
) on public.delivery_slots to anon, authenticated;

revoke execute on function public.book_delivery_slot(uuid) from public;
revoke execute on function public.release_delivery_slot(uuid) from public;
