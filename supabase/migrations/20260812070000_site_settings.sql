-- =============================================================================
-- Réglages du site, et assouplissement du garde-fou sur les prix provisoires.
--
-- Atlantique Export souhaite voir le catalogue en ligne avec des prix de
-- démonstration, les prix réels devant être fixés plus tard. Le garde-fou posé
-- précédemment interdisait purement et simplement de publier un produit dont
-- une variante n'avait pas de prix ferme.
--
-- Plutôt que de le supprimer — auquel cas plus rien n'empêcherait un jour de
-- vendre au prix inventé — il devient débrayable par un réglage. Il suffira de
-- basculer `allow_provisional_prices` à faux avant l'ouverture réelle pour que
-- toute publication d'un produit non chiffré échoue de nouveau.
-- =============================================================================

create table public.site_settings (
  -- Table à ligne unique : la contrainte sur la clé primaire interdit d'en
  -- créer une seconde et donc d'avoir deux configurations contradictoires.
  id                       boolean primary key default true check (id),
  allow_provisional_prices boolean not null default false,
  updated_at               timestamptz not null default now()
);

comment on column public.site_settings.allow_provisional_prices is
  'Vrai pendant le développement : autorise la publication de produits aux prix de démonstration. DOIT repasser à faux avant la première vente réelle.';

create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- Phase de développement : les prix de démonstration sont autorisés.
insert into public.site_settings (id, allow_provisional_prices)
values (true, true);

create or replace function public.forbid_publishing_provisional_prices()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean;
  v_count   integer;
begin
  if new.published_at is null then
    return new;
  end if;

  select allow_provisional_prices into v_allowed from public.site_settings limit 1;
  if coalesce(v_allowed, false) then
    return new;
  end if;

  select count(*) into v_count
  from public.product_variants
  where product_id = new.id
    and is_active
    and price_is_provisional;

  if v_count > 0 then
    raise exception
      'Impossible de publier « % » : % variante(s) active(s) sans prix de vente défini.',
      new.slug, v_count
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.site_settings enable row level security;

-- Le réglage est lisible publiquement : l'interface s'en sert pour signaler
-- au visiteur que les prix affichés sont provisoires.
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);

grant select on public.site_settings to anon, authenticated;
