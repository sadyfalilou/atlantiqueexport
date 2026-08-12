-- =============================================================================
-- Stock : lots, niveaux, mouvements, et les fonctions qui empêchent la survente.
--
-- C'est la partie la plus critique du schéma. Deux clients qui achètent le
-- dernier article au même instant ne doivent jamais aboutir à deux commandes
-- honorables une seule fois. La garantie est portée par PostgreSQL — verrou de
-- ligne plus contrainte — et non par le code applicatif, qui perdrait la course.
-- =============================================================================

-- --- Lots --------------------------------------------------------------------
-- Traçabilité indispensable pour des denrées périssables : savoir quel lot
-- expire quand, et d'où il vient.

create table public.inventory_lots (
  id                uuid primary key default gen_random_uuid(),
  variant_id        uuid not null references public.product_variants (id) on delete cascade,
  lot_code          text,
  received_at       date not null default current_date,
  expires_at        date,
  quantity_received integer not null check (quantity_received >= 0),
  quantity_on_hand  integer not null check (quantity_on_hand >= 0),
  unit_cost_cents   integer check (unit_cost_cents is null or unit_cost_cents >= 0),
  origin_country    text,
  notes             text,
  created_at        timestamptz not null default now(),
  constraint lots_on_hand_within_received
    check (quantity_on_hand <= quantity_received)
);

create index inventory_lots_variant_idx on public.inventory_lots (variant_id);
create index inventory_lots_expiry_idx  on public.inventory_lots (expires_at)
  where expires_at is not null;

-- --- Niveaux de stock --------------------------------------------------------
-- Une ligne par variante, lue à chaque affichage de produit.

create table public.stock_levels (
  variant_id          uuid primary key references public.product_variants (id) on delete cascade,
  quantity_on_hand    integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved   integer not null default 0 check (quantity_reserved >= 0),
  -- Colonne calculée : impossible de la désynchroniser du reste.
  quantity_available  integer generated always as (quantity_on_hand - quantity_reserved) stored,
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at          timestamptz not null default now(),
  -- LA contrainte anti-survente : on ne peut pas réserver plus qu'on ne détient.
  -- Une transaction qui tenterait de la violer échoue, au lieu de vendre du
  -- stock inexistant.
  constraint stock_reserved_within_on_hand
    check (quantity_reserved <= quantity_on_hand)
);

-- Toute variante créée obtient immédiatement sa ligne de stock, pour qu'aucune
-- lecture ne tombe sur une absence de ligne.
create or replace function public.ensure_stock_level()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.stock_levels (variant_id)
  values (new.id)
  on conflict (variant_id) do nothing;
  return new;
end;
$$;

create trigger product_variants_ensure_stock_level
  after insert on public.product_variants
  for each row execute function public.ensure_stock_level();

-- --- Registre des mouvements -------------------------------------------------
-- En ajout seul : on n'efface ni ne modifie jamais une ligne, c'est ce qui
-- rend l'historique auditable.

create table public.stock_movements (
  id            uuid primary key default gen_random_uuid(),
  variant_id    uuid not null references public.product_variants (id) on delete cascade,
  lot_id        uuid references public.inventory_lots (id) on delete set null,
  movement_type public.movement_type not null,
  quantity_delta integer not null,
  -- La contrainte de clé étrangère vers les commandes est ajoutée par la
  -- migration suivante, une fois la table `orders` créée.
  order_id      uuid,
  actor_id      uuid references auth.users (id) on delete set null,
  reason        text,
  created_at    timestamptz not null default now()
);

create index stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);
create index stock_movements_order_idx   on public.stock_movements (order_id)
  where order_id is not null;

-- =============================================================================
-- Fonctions de réservation
--
-- Toutes en SECURITY DEFINER : elles doivent pouvoir écrire dans des tables
-- qu'aucun rôle client n'a le droit de modifier directement.
-- =============================================================================

-- Réserve du stock pour une commande en cours.
--
-- Le `for update` verrouille la ligne : deux acheteurs simultanés sont
-- sérialisés, le second voit l'état laissé par le premier et échoue proprement
-- si le stock ne suffit plus.
create or replace function public.reserve_stock(
  p_variant_id uuid,
  p_quantity   integer,
  p_order_id   uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_available integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité à réserver doit être strictement positive'
      using errcode = '22023';
  end if;

  select quantity_on_hand - quantity_reserved
    into v_available
  from public.stock_levels
  where variant_id = p_variant_id
  for update;

  if not found then
    raise exception 'Variante inconnue : %', p_variant_id using errcode = 'P0002';
  end if;

  if v_available < p_quantity then
    raise exception 'Stock insuffisant : % demandé(s), % disponible(s)',
      p_quantity, v_available using errcode = 'P0001';
  end if;

  update public.stock_levels
  set quantity_reserved = quantity_reserved + p_quantity,
      updated_at = now()
  where variant_id = p_variant_id;

  insert into public.stock_movements (variant_id, movement_type, quantity_delta, order_id, actor_id)
  values (p_variant_id, 'reservation', -p_quantity, p_order_id, auth.uid());

  return v_available - p_quantity;
end;
$$;

-- Libère une réservation : commande annulée, ou virement Interac jamais reçu.
create or replace function public.release_stock(
  p_variant_id uuid,
  p_quantity   integer,
  p_order_id   uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reserved integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité à libérer doit être strictement positive'
      using errcode = '22023';
  end if;

  select quantity_reserved into v_reserved
  from public.stock_levels
  where variant_id = p_variant_id
  for update;

  if not found then
    raise exception 'Variante inconnue : %', p_variant_id using errcode = 'P0002';
  end if;

  -- On ne descend jamais sous zéro, même si l'appelant se trompe.
  update public.stock_levels
  set quantity_reserved = greatest(0, quantity_reserved - p_quantity),
      updated_at = now()
  where variant_id = p_variant_id;

  insert into public.stock_movements (variant_id, movement_type, quantity_delta, order_id, actor_id)
  values (p_variant_id, 'release', p_quantity, p_order_id, auth.uid());
end;
$$;

-- Concrétise la vente : la marchandise quitte l'entrepôt, la réservation
-- correspondante disparaît en même temps.
create or replace function public.consume_stock(
  p_variant_id uuid,
  p_quantity   integer,
  p_order_id   uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité vendue doit être strictement positive'
      using errcode = '22023';
  end if;

  update public.stock_levels
  set quantity_on_hand  = quantity_on_hand - p_quantity,
      quantity_reserved = greatest(0, quantity_reserved - p_quantity),
      updated_at = now()
  where variant_id = p_variant_id;

  if not found then
    raise exception 'Variante inconnue : %', p_variant_id using errcode = 'P0002';
  end if;

  insert into public.stock_movements (variant_id, movement_type, quantity_delta, order_id, actor_id)
  values (p_variant_id, 'sale', -p_quantity, p_order_id, auth.uid());
end;
$$;

-- Réception de marchandise : crée le lot et augmente le stock disponible.
create or replace function public.receive_stock(
  p_variant_id  uuid,
  p_quantity    integer,
  p_lot_code    text default null,
  p_expires_at  date default null,
  p_unit_cost_cents integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lot_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité reçue doit être strictement positive'
      using errcode = '22023';
  end if;

  insert into public.inventory_lots (
    variant_id, lot_code, expires_at, quantity_received, quantity_on_hand, unit_cost_cents
  )
  values (p_variant_id, p_lot_code, p_expires_at, p_quantity, p_quantity, p_unit_cost_cents)
  returning id into v_lot_id;

  insert into public.stock_levels (variant_id, quantity_on_hand)
  values (p_variant_id, p_quantity)
  on conflict (variant_id) do update
    set quantity_on_hand = public.stock_levels.quantity_on_hand + excluded.quantity_on_hand,
        updated_at = now();

  insert into public.stock_movements (variant_id, lot_id, movement_type, quantity_delta, actor_id)
  values (p_variant_id, v_lot_id, 'reception', p_quantity, auth.uid());

  return v_lot_id;
end;
$$;

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.inventory_lots   enable row level security;
alter table public.stock_levels     enable row level security;
alter table public.stock_movements  enable row level security;

-- La disponibilité est une information publique : elle s'affiche sur la fiche
-- produit. Le détail (quantité détenue, quantité réservée) ne l'est pas.
create policy stock_levels_public_read on public.stock_levels
  for select to anon, authenticated using (true);

create policy inventory_lots_staff_read on public.inventory_lots
  for select to authenticated
  using (public.has_staff_role(array['super_admin', 'manager', 'picker']::public.staff_role[]));

create policy stock_movements_staff_read on public.stock_movements
  for select to authenticated
  using (public.has_staff_role(array['super_admin', 'manager']::public.staff_role[]));

-- --- Privilèges --------------------------------------------------------------

-- Seule la quantité disponible et le seuil d'alerte sont lisibles publiquement.
-- `quantity_on_hand` et `quantity_reserved` restent internes.
grant select (variant_id, quantity_available, low_stock_threshold)
  on public.stock_levels to anon, authenticated;

-- Aucun GRANT sur inventory_lots ni stock_movements : tables internes,
-- accessibles au personnel via la clé secrète côté serveur.

-- PostgreSQL accorde EXECUTE à PUBLIC par défaut sur toute fonction. Ces
-- fonctions modifient le stock : on retire ce droit, elles ne seront appelées
-- que côté serveur, avec la clé secrète.
revoke execute on function public.reserve_stock(uuid, integer, uuid) from public;
revoke execute on function public.release_stock(uuid, integer, uuid) from public;
revoke execute on function public.consume_stock(uuid, integer, uuid) from public;
revoke execute on function public.receive_stock(uuid, integer, text, date, integer) from public;
