-- =============================================================================
-- Fondations : types énumérés, fonctions d'aide, comptes et rôles.
--
-- Tout ce qui suit dans les autres migrations en dépend.
--
-- Deux conventions valables pour l'ensemble du schéma :
--   1. Les montants sont des entiers en cents CAD. Jamais de flottant.
--   2. Le projet a été créé avec « Automatically expose new tables » désactivé :
--      aucune table n'est lisible par l'API tant qu'un GRANT explicite ne
--      l'autorise pas. C'est voulu — refus par défaut.
-- =============================================================================

-- --- Types énumérés ----------------------------------------------------------

-- Détermine les modes de réception possibles (voir la table de compatibilité
-- dans docs/02-ARCHITECTURE.md).
create type public.temperature_class as enum (
  'ambient', 'fresh', 'refrigerated', 'frozen'
);

-- Non exploité au MVP : le calcul des taxes est reporté. La colonne existe
-- pour que le classement puisse être saisi dès maintenant.
create type public.tax_class as enum ('zero_rated', 'standard');

create type public.stock_status as enum (
  'in_stock', 'low_stock', 'out_of_stock', 'coming_soon', 'preorder', 'incoming'
);

create type public.sale_unit as enum (
  'unit', 'bag', 'pack', 'kg', 'lb', 'case', 'carton'
);

create type public.fulfillment_method as enum (
  'pickup', 'local_delivery', 'shipping'
);

create type public.order_status as enum (
  'new', 'pending_payment', 'paid', 'confirmed', 'preparing',
  'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed',
  'cancelled', 'refunded'
);

create type public.payment_status as enum (
  'pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed'
);

-- 'stripe' est déclaré dès maintenant bien que le paiement par carte soit
-- reporté en phase 2 : ajouter une valeur à un enum plus tard est trivial,
-- mais autant éviter une migration supplémentaire.
create type public.payment_provider as enum ('stripe', 'interac', 'manual');

create type public.payment_type as enum ('full', 'deposit', 'balance', 'refund');

create type public.shipment_status as enum (
  'announced', 'reservations_open', 'in_transit', 'arrived', 'preparing',
  'available', 'completed', 'delayed', 'cancelled'
);

create type public.movement_type as enum (
  'reception', 'sale', 'reservation', 'release', 'return', 'loss',
  'adjustment', 'transfer'
);

create type public.staff_role as enum (
  'super_admin', 'manager', 'picker', 'driver', 'support'
);

create type public.customer_type as enum ('individual', 'business');

create type public.business_account_status as enum (
  'pending', 'approved', 'rejected'
);

-- --- Fonctions d'aide --------------------------------------------------------

-- Tient `updated_at` à jour sans que le code applicatif ait à y penser.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- Rôles du personnel ------------------------------------------------------

create table public.staff_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.staff_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.staff_roles is
  'Rôles internes. Une personne peut en cumuler plusieurs.';

-- SECURITY DEFINER est indispensable : la fonction doit pouvoir lire
-- staff_roles alors que les politiques RLS des autres tables l'interrogent.
-- Sans cela, toute politique qui l'appelle boucle sur elle-même.
-- Le search_path est figé pour éviter le détournement par une table homonyme.
create or replace function public.has_staff_role(required public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff_roles
    where user_id = auth.uid()
      and role = any(required)
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.staff_roles where user_id = auth.uid());
$$;

-- --- Profils clients ---------------------------------------------------------

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text,
  phone            text,
  locale           text not null default 'fr' check (locale in ('fr', 'en')),
  customer_type    public.customer_type not null default 'individual',
  marketing_opt_in boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Crée le profil dès l'inscription, pour qu'aucun compte ne se retrouve
-- sans ligne correspondante.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'fr')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Sécurité au niveau des lignes -------------------------------------------

alter table public.staff_roles enable row level security;
alter table public.profiles    enable row level security;

-- Chacun voit ses propres rôles ; seul un super administrateur les modifie.
create policy staff_roles_select_self on public.staff_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role(array['super_admin']::public.staff_role[]));

create policy staff_roles_manage on public.staff_roles
  for all to authenticated
  using (public.has_staff_role(array['super_admin']::public.staff_role[]))
  with check (public.has_staff_role(array['super_admin']::public.staff_role[]));

-- Un client ne voit et ne modifie que son propre profil.
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- --- Privilèges --------------------------------------------------------------
-- Rien n'est accordé au rôle « anon » : ces tables ne concernent que des
-- personnes authentifiées. La clé secrète, elle, contourne RLS et n'a pas
-- besoin de GRANT.

grant select          on public.staff_roles to authenticated;
grant select, update  on public.profiles    to authenticated;
