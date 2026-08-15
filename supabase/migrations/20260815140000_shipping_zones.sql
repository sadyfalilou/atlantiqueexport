-- Zones d'expédition postale.
--
-- `place_order` n'ajoutait de frais que pour la livraison locale : un colis
-- parti par la poste ne rapportait rien, et rien nulle part ne permettait même
-- d'en saisir le tarif.
--
-- Une table à part, et non des colonnes dans `delivery_zones`, parce que les
-- deux notions ne se recouvrent pas. Une zone de LIVRAISON décrit un secteur
-- de tournée, reconnu au préfixe du code postal, avec un minimum de commande
-- qui existe pour que le déplacement vaille la peine. Une zone d'EXPÉDITION
-- désigne une destination — un pays, parfois quelques provinces ou États — et
-- ne connaît ni tournée ni minimum : un colis remis à un transporteur coûte ce
-- qu'il coûte.

create table public.shipping_zones (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  -- Code ISO à deux lettres : 'CA', 'US'.
  country_code         text not null check (country_code ~ '^[A-Z]{2}$'),
  -- Codes de province ou d'État. Un tableau VIDE signifie « tout le pays »,
  -- ce qui permet une zone générale et des exceptions plus chères par-dessus.
  region_codes         text[] not null default '{}',
  fee_cents            integer not null default 0 check (fee_cents >= 0),
  free_threshold_cents integer check (free_threshold_cents is null or free_threshold_cents >= 0),
  position             integer not null default 0,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index shipping_zones_country_idx on public.shipping_zones (country_code)
  where is_active;

create trigger shipping_zones_touch_updated_at
  before update on public.shipping_zones
  for each row execute function public.touch_updated_at();

comment on table public.shipping_zones is
  'Destinations desservies par la poste et leur tarif. Une adresse sans zone correspondante n''est pas expédiable.';

comment on column public.shipping_zones.region_codes is
  'Provinces ou États couverts. Vide = tout le pays. Une zone régionale l''emporte sur la zone nationale.';

/**
 * La zone qui s'applique à une destination.
 *
 * La zone RÉGIONALE l'emporte sur la nationale : sans cette priorité, une zone
 * « Canada » créée en premier capterait les provinces éloignées auxquelles on
 * voulait précisément appliquer un tarif plus élevé.
 */
create or replace function public.find_shipping_zone(
  p_country text,
  p_region  text
)
returns public.shipping_zones
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select z.*
  from public.shipping_zones z
  where z.is_active
    and z.country_code = upper(trim(coalesce(p_country, '')))
    and (
      z.region_codes = '{}'
      or upper(trim(coalesce(p_region, ''))) = any (z.region_codes)
    )
  order by
    -- Une zone régionale d'abord, la nationale en repli.
    case when z.region_codes = '{}' then 1 else 0 end,
    z.position
  limit 1;
$$;

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.shipping_zones enable row level security;

-- Le tarif est public : le client doit connaître ses frais de port avant de
-- commander, et il n'y a rien de confidentiel dans un prix affiché.
create policy shipping_zones_public_read on public.shipping_zones
  for select to anon, authenticated using (is_active);

grant select on public.shipping_zones to anon, authenticated;

-- =============================================================================
-- Destination de départ
-- =============================================================================

-- Le Canada, au tarif actuel — c'est-à-dire zéro. Rien ne change tant que le
-- tarif n'est pas saisi dans l'administration ; la page le signale en rouge.
insert into public.shipping_zones (name, country_code, fee_cents, position)
values ('Canada', 'CA', 0, 1);
