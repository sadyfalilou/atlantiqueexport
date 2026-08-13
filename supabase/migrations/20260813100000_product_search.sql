-- =============================================================================
-- Recherche produit.
--
-- Deux exigences propres à ce catalogue :
--
-- 1. **Les accents ne doivent pas compter.** Chercher « cafe », « thiere » ou
--    « cereales » doit trouver « Café », « Thiéré » et « Céréales ». Personne
--    ne tape les accents dans un champ de recherche.
--
-- 2. **Les fragments doivent passer.** Les noms sont wolof pour beaucoup —
--    thiakry, ngalakh, mbaxal — et s'écrivent de plusieurs façons. Un index
--    trigramme tolère l'approximation, là où une recherche plein texte
--    classique exigerait le mot exact.
--
-- La colonne cherchable est tenue par un DÉCLENCHEUR et non par une colonne
-- générée : PostgreSQL exige qu'une expression générée soit immuable, ce que
-- `unaccent` n'est pas — elle dépend d'un dictionnaire qui peut changer. Le
-- déclencheur contourne la contrainte sans rien perdre, puisque la valeur est
-- recalculée à chaque écriture.
-- =============================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

alter table public.products
  add column if not exists search_text text;

comment on column public.products.search_text is
  'Champs cherchables, sans accent et en minuscules. Tenue par déclencheur : ne jamais la renseigner à la main.';

create or replace function public.refresh_product_search_text()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.search_text := lower(
    extensions.unaccent(
      coalesce(new.name_fr, '') || ' ' ||
      coalesce(new.name_en, '') || ' ' ||
      coalesce(new.short_description_fr, '') || ' ' ||
      coalesce(new.short_description_en, '') || ' ' ||
      array_to_string(coalesce(new.tags, '{}'), ' ')
    )
  );
  return new;
end;
$$;

create trigger products_refresh_search_text
  before insert or update of name_fr, name_en, short_description_fr,
                             short_description_en, tags
  on public.products
  for each row execute function public.refresh_product_search_text();

-- Remplissage des lignes déjà en base.
update public.products set name_fr = name_fr;

create index if not exists products_search_trgm_idx
  on public.products using gin (search_text extensions.gin_trgm_ops);

-- La recherche est exposée par une fonction plutôt que par un filtre libre :
-- l'appelant fournit un terme, pas un fragment de requête, et la normalisation
-- se fait ici, au même endroit que l'indexation. Les deux ne peuvent donc pas
-- diverger.
create or replace function public.search_products(p_query text, p_limit integer default 24)
returns setof public.products
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with needle as (
    select lower(extensions.unaccent(coalesce(p_query, ''))) as term
  )
  select p.*
  from public.products p, needle n
  where p.published_at is not null
    and p.published_at <= now()
    and n.term <> ''
    and p.search_text like '%' || n.term || '%'
  order by
    -- Une correspondance en début de nom passe devant : chercher « thia » doit
    -- proposer « Thiakry » avant un produit qui ne le mentionne qu'en
    -- description.
    (p.search_text like n.term || '%') desc,
    p.is_featured desc,
    p.name_fr
  limit least(greatest(coalesce(p_limit, 24), 1), 100);
$$;

grant execute on function public.search_products(text, integer) to anon, authenticated;
