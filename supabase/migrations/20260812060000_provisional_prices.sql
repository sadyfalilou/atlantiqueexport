-- =============================================================================
-- Marquage des prix provisoires.
--
-- Les produits sont importés du catalogue fournisseur avec leurs noms, leurs
-- descriptions et leurs formats, mais SANS prix : le catalogue Sonagoo est
-- libellé en FCFA et les prix de vente canadiens seront fixés séparément.
--
-- Ce drapeau rend la situation explicite au niveau de la donnée plutôt que
-- dans une note de coin de table : tant qu'il est vrai, le prix affiché n'a
-- aucune valeur commerciale. Le déclencheur plus bas empêche de publier un
-- produit dont une variante active n'a pas encore reçu son prix.
-- =============================================================================

alter table public.product_variants
  add column price_is_provisional boolean not null default false;

comment on column public.product_variants.price_is_provisional is
  'Vrai tant qu''un prix de vente canadien n''a pas été fixé. Un produit ne peut pas être publié dans cet état.';

-- Garde-fou : on ne publie pas un produit dont une variante active attend
-- encore son prix. Mieux vaut une erreur à l''enregistrement qu''une commande
-- passée à un prix inventé.
create or replace function public.forbid_publishing_provisional_prices()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  if new.published_at is null then
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

create trigger products_forbid_provisional_publish
  before insert or update of published_at on public.products
  for each row execute function public.forbid_publishing_provisional_prices();

grant select (
  id, product_id, sku, barcode, label_fr, label_en, sale_unit, net_weight_g,
  is_variable_weight, min_weight_g, max_weight_g, price_per_kg_cents,
  retail_price_cents, compare_at_price_cents, price_is_provisional,
  min_qty, step_qty, position, is_active, created_at, updated_at
) on public.product_variants to anon, authenticated;
