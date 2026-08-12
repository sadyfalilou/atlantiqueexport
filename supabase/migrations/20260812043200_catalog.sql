-- =============================================================================
-- Catalogue : catégories, marques, fournisseurs, produits, variantes, images
-- et options de préparation.
--
-- Le prix et le stock vivent sur la VARIANTE, jamais sur le produit : un même
-- produit se vend en sachet de 200 g et en caisse de 10 kg, à des prix sans
-- rapport entre eux.
-- =============================================================================

-- --- Catégories --------------------------------------------------------------

create table public.categories (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name_fr           text not null,
  name_en           text not null,
  description_fr    text,
  description_en    text,
  parent_id         uuid references public.categories (id) on delete set null,
  image_url         text,
  position          integer not null default 0,
  is_active         boolean not null default true,
  show_in_mega_menu boolean not null default true,
  -- Entrée de navigation pointant vers une route dédiée (Nouveautés,
  -- Promotions) plutôt que vers une vraie catégorie de produits.
  is_virtual        boolean not null default false,
  href              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint categories_virtual_needs_href
    check (not is_virtual or href is not null)
);

create index categories_parent_idx   on public.categories (parent_id);
create index categories_position_idx on public.categories (position);

create trigger categories_touch_updated_at
  before update on public.categories
  for each row execute function public.touch_updated_at();

-- --- Marques -----------------------------------------------------------------

create table public.brands (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  description_fr text,
  description_en text,
  logo_url       text,
  origin_country text,
  is_partner     boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger brands_touch_updated_at
  before update on public.brands
  for each row execute function public.touch_updated_at();

-- --- Fournisseurs ------------------------------------------------------------
-- Usage strictement interne : jamais exposé publiquement, aucun GRANT à anon.

create table public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  country        text,
  contact_name   text,
  contact_email  text,
  contact_phone  text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger suppliers_touch_updated_at
  before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- --- Produits ----------------------------------------------------------------

create table public.products (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  name_fr                text not null,
  name_en                text not null,
  short_description_fr   text,
  short_description_en   text,
  description_fr         text,
  description_en         text,
  category_id            uuid references public.categories (id) on delete set null,
  brand_id               uuid references public.brands (id) on delete set null,
  supplier_id            uuid references public.suppliers (id) on delete set null,
  origin_country         text,
  temperature_class      public.temperature_class not null default 'ambient',
  -- Non exploité au MVP : le calcul des taxes est reporté.
  tax_class              public.tax_class not null default 'zero_rated',
  -- Statut éditorial. La disponibilité réelle sera calculée à partir des
  -- niveaux de stock, dans la migration consacrée à l'inventaire.
  availability_status    public.stock_status not null default 'in_stock',
  ingredients_fr         text,
  ingredients_en         text,
  allergens              text[] not null default '{}',
  nutrition              jsonb,
  storage_fr             text,
  storage_en             text,
  preparation_fr         text,
  preparation_en         text,
  tags                   text[] not null default '{}',
  is_featured            boolean not null default false,
  is_new                 boolean not null default false,
  is_wholesale_only      boolean not null default false,
  has_preparation_options boolean not null default false,
  -- Un produit n'est visible du public que si published_at est renseignée.
  published_at           timestamptz,
  seo                    jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index products_category_idx  on public.products (category_id);
create index products_brand_idx     on public.products (brand_id);
create index products_published_idx on public.products (published_at);
create index products_temp_idx      on public.products (temperature_class);
create index products_tags_idx      on public.products using gin (tags);

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- --- Images produit ----------------------------------------------------------

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_fr       text,
  alt_en       text,
  position     integer not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, position);

-- --- Variantes ---------------------------------------------------------------
-- Le prix et le stock vivent ici.

create table public.product_variants (
  id                     uuid primary key default gen_random_uuid(),
  product_id             uuid not null references public.products (id) on delete cascade,
  sku                    text not null unique,
  barcode                text,
  label_fr               text not null,
  label_en               text not null,
  sale_unit              public.sale_unit not null default 'unit',
  net_weight_g           integer check (net_weight_g is null or net_weight_g > 0),

  -- Produit dont le prix dépend du poids réel (poisson entier, par exemple).
  -- Au MVP le client est facturé au poids haut de la tranche, donc le montant
  -- est définitif à l'achat ; les colonnes de poids réel arrivent en phase 2.
  is_variable_weight     boolean not null default false,
  min_weight_g           integer,
  max_weight_g           integer,
  price_per_kg_cents     integer check (price_per_kg_cents is null or price_per_kg_cents >= 0),

  -- Montants en cents CAD, jamais en flottants.
  retail_price_cents     integer not null check (retail_price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= 0),
  wholesale_price_cents  integer check (wholesale_price_cents is null or wholesale_price_cents >= 0),

  min_qty                integer not null default 1 check (min_qty >= 1),
  step_qty               integer not null default 1 check (step_qty >= 1),
  position               integer not null default 0,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Une variante au poids doit porter une tranche cohérente et un prix au kilo.
  constraint variants_variable_weight_complete check (
    not is_variable_weight
    or (min_weight_g is not null
        and max_weight_g is not null
        and price_per_kg_cents is not null
        and min_weight_g > 0
        and max_weight_g >= min_weight_g)
  ),
  -- Un prix barré doit être supérieur au prix de vente, sinon la « promotion »
  -- est un mensonge.
  constraint variants_compare_at_is_higher check (
    compare_at_price_cents is null
    or compare_at_price_cents > retail_price_cents
  )
);

create index product_variants_product_idx on public.product_variants (product_id, position);

create trigger product_variants_touch_updated_at
  before update on public.product_variants
  for each row execute function public.touch_updated_at();

-- --- Options de préparation --------------------------------------------------
-- Table de référence, puis activation produit par produit avec son propre
-- supplément de prix et son temps de préparation.

create table public.preparation_options (
  id        uuid primary key default gen_random_uuid(),
  code      text not null unique,
  label_fr  text not null,
  label_en  text not null,
  position  integer not null default 0
);

create table public.product_preparation_options (
  product_id       uuid not null references public.products (id) on delete cascade,
  option_id        uuid not null references public.preparation_options (id) on delete cascade,
  price_delta_cents integer not null default 0,
  prep_time_minutes integer not null default 0 check (prep_time_minutes >= 0),
  is_default       boolean not null default false,
  is_active        boolean not null default true,
  primary key (product_id, option_id)
);

-- --- Produits associés -------------------------------------------------------

create table public.related_products (
  product_id    uuid not null references public.products (id) on delete cascade,
  related_id    uuid not null references public.products (id) on delete cascade,
  relation_type text not null default 'complementary',
  position      integer not null default 0,
  primary key (product_id, related_id, relation_type),
  constraint related_products_not_self check (product_id <> related_id)
);

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.categories                  enable row level security;
alter table public.brands                      enable row level security;
alter table public.suppliers                   enable row level security;
alter table public.products                    enable row level security;
alter table public.product_images              enable row level security;
alter table public.product_variants            enable row level security;
alter table public.preparation_options         enable row level security;
alter table public.product_preparation_options enable row level security;
alter table public.related_products            enable row level security;

-- Lecture publique du catalogue actif et publié uniquement. Un produit non
-- publié n'existe pas pour un visiteur, même s'il connaît son identifiant.
create policy categories_public_read on public.categories
  for select to anon, authenticated using (is_active);

create policy brands_public_read on public.brands
  for select to anon, authenticated using (is_active);

create policy products_public_read on public.products
  for select to anon, authenticated
  using (published_at is not null and published_at <= now());

create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id
      and p.published_at is not null
      and p.published_at <= now()
  ));

create policy product_variants_public_read on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.products p
    where p.id = product_id
      and p.published_at is not null
      and p.published_at <= now()
  ));

create policy preparation_options_public_read on public.preparation_options
  for select to anon, authenticated using (true);

create policy product_preparation_options_public_read on public.product_preparation_options
  for select to anon, authenticated using (is_active);

create policy related_products_public_read on public.related_products
  for select to anon, authenticated using (true);

-- Les fournisseurs restent invisibles du public : aucune politique pour anon,
-- et aucun GRANT plus bas.
create policy suppliers_staff_read on public.suppliers
  for select to authenticated
  using (public.has_staff_role(array['super_admin', 'manager']::public.staff_role[]));

-- =============================================================================
-- Privilèges
--
-- « Automatically expose new tables » étant désactivé à la création du projet,
-- rien n'est lisible tant qu'on ne l'accorde pas ici, table par table.
-- =============================================================================

grant select on public.categories                  to anon, authenticated;
grant select on public.brands                      to anon, authenticated;
grant select on public.products                    to anon, authenticated;
grant select on public.product_images              to anon, authenticated;
grant select on public.preparation_options         to anon, authenticated;
grant select on public.product_preparation_options to anon, authenticated;
grant select on public.related_products            to anon, authenticated;

-- Sur les variantes, le privilège est accordé COLONNE PAR COLONNE, et
-- `wholesale_price_cents` en est délibérément exclu. Le tarif professionnel
-- devient ainsi invisible au niveau de PostgreSQL, et pas seulement masqué
-- par le code : même une requête forgée à la main ne peut pas le lire.
-- Il sera servi, aux seuls comptes professionnels approuvés, par un chemin
-- dédié lors du lot consacré aux clients professionnels.
grant select (
  id, product_id, sku, barcode, label_fr, label_en, sale_unit, net_weight_g,
  is_variable_weight, min_weight_g, max_weight_g, price_per_kg_cents,
  retail_price_cents, compare_at_price_cents,
  min_qty, step_qty, position, is_active, created_at, updated_at
) on public.product_variants to anon, authenticated;

-- Aucun GRANT sur public.suppliers : table interne.
