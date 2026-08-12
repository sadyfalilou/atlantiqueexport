-- =============================================================================
-- Contenu éditorial, clients professionnels et journal d'audit.
-- =============================================================================

-- --- Adresses ----------------------------------------------------------------

create table public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  label        text,
  full_name    text not null,
  line1        text not null,
  line2        text,
  city         text not null,
  province     text not null,
  postal_code  text not null,
  -- Livraison au Canada uniquement pour le moment.
  country      text not null default 'CA' check (country = 'CA'),
  phone        text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id);

create trigger addresses_touch_updated_at
  before update on public.addresses
  for each row execute function public.touch_updated_at();

-- --- Comptes professionnels --------------------------------------------------

create table public.business_accounts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null unique references public.profiles (id) on delete cascade,
  company_name    text not null,
  business_number text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  billing_address jsonb,
  status          public.business_account_status not null default 'pending',
  price_tier      text not null default 'standard',
  approved_by     uuid references auth.users (id) on delete set null,
  approved_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger business_accounts_touch_updated_at
  before update on public.business_accounts
  for each row execute function public.touch_updated_at();

-- Un compte professionnel n'ouvre droit aux tarifs de gros qu'une fois
-- approuvé. La vérification vit ici, pas dans l'interface.
create or replace function public.has_approved_business_account()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.business_accounts
    where profile_id = auth.uid() and status = 'approved'
  );
$$;

-- --- Recettes ----------------------------------------------------------------

create table public.recipes (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title_fr          text not null,
  title_en          text not null,
  description_fr    text,
  description_en    text,
  body_fr           text,
  body_en           text,
  image_url         text,
  prep_time_minutes integer check (prep_time_minutes is null or prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes is null or cook_time_minutes >= 0),
  servings          integer check (servings is null or servings > 0),
  ingredients       jsonb not null default '[]',
  steps             jsonb not null default '[]',
  is_published      boolean not null default false,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.touch_updated_at();

create table public.recipe_products (
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  position   integer not null default 0,
  primary key (recipe_id, product_id)
);

create table public.product_recipes (
  product_id uuid not null references public.products (id) on delete cascade,
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  position   integer not null default 0,
  primary key (product_id, recipe_id)
);

-- --- Pages institutionnelles -------------------------------------------------
-- Les textes juridiques sont administrables : ils devront être remplacés par
-- des versions validées avant la mise en vente réelle.

create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title_fr     text not null,
  title_en     text not null,
  body_fr      text,
  body_en      text,
  -- Marque un brouillon non validé juridiquement, affiché comme tel.
  is_draft_legal boolean not null default false,
  is_published boolean not null default false,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create trigger pages_touch_updated_at
  before update on public.pages
  for each row execute function public.touch_updated_at();

-- --- Libellés d'interface ----------------------------------------------------
-- Permet de corriger un texte sans redéployer.

create table public.ui_translations (
  key        text primary key,
  value_fr   text not null,
  value_en   text not null,
  updated_at timestamptz not null default now()
);

create trigger ui_translations_touch_updated_at
  before update on public.ui_translations
  for each row execute function public.touch_updated_at();

-- --- Infolettre --------------------------------------------------------------

create table public.newsletter_subscribers (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  locale         text not null default 'fr' check (locale in ('fr', 'en')),
  confirmed_at   timestamptz,
  unsubscribed_at timestamptz,
  source         text,
  created_at     timestamptz not null default now()
);

-- --- Avis --------------------------------------------------------------------
-- Modérés, et jamais semés avec de faux contenus : la section reste vide tant
-- qu'aucun avis authentique n'a été publié.

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  order_id     uuid references public.orders (id) on delete set null,
  rating       integer not null check (rating between 1 and 5),
  title        text,
  body         text,
  status       text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at   timestamptz not null default now()
);

create index reviews_product_idx on public.reviews (product_id, status);

-- --- Journal d'audit administrateur ------------------------------------------
-- Trace notamment la validation manuelle des virements Interac : qui a
-- confirmé quel encaissement, et quand.

create table public.admin_audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references auth.users (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  diff       jsonb,
  ip         inet,
  created_at timestamptz not null default now()
);

create index admin_audit_log_entity_idx on public.admin_audit_log (entity, entity_id);
create index admin_audit_log_actor_idx  on public.admin_audit_log (actor_id, created_at desc);

-- =============================================================================
-- Sécurité
-- =============================================================================

alter table public.addresses              enable row level security;
alter table public.business_accounts      enable row level security;
alter table public.recipes                enable row level security;
alter table public.recipe_products        enable row level security;
alter table public.product_recipes        enable row level security;
alter table public.pages                  enable row level security;
alter table public.ui_translations        enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.reviews                enable row level security;
alter table public.admin_audit_log        enable row level security;

create policy addresses_own on public.addresses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy business_accounts_own on public.business_accounts
  for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());

create policy recipes_public_read on public.recipes
  for select to anon, authenticated using (is_published);

create policy recipe_products_public_read on public.recipe_products
  for select to anon, authenticated using (true);

create policy product_recipes_public_read on public.product_recipes
  for select to anon, authenticated using (true);

create policy pages_public_read on public.pages
  for select to anon, authenticated using (is_published);

create policy ui_translations_public_read on public.ui_translations
  for select to anon, authenticated using (true);

-- Seuls les avis approuvés sont visibles.
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_staff());

-- Le journal d'audit ne se lit que par un super administrateur, et ne se
-- modifie jamais depuis l'API.
create policy admin_audit_log_read on public.admin_audit_log
  for select to authenticated
  using (public.has_staff_role(array['super_admin']::public.staff_role[]));

-- --- Privilèges --------------------------------------------------------------

grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.business_accounts      to authenticated;
grant select on public.recipes                to anon, authenticated;
grant select on public.recipe_products        to anon, authenticated;
grant select on public.product_recipes        to anon, authenticated;
grant select on public.pages                  to anon, authenticated;
grant select on public.ui_translations        to anon, authenticated;
grant select on public.admin_audit_log        to authenticated;

-- Sur les avis, l'identifiant de l'auteur n'est pas publié : on affiche un
-- prénom depuis le profil, pas une clé permettant de recouper les commandes.
grant select (id, product_id, rating, title, body, status, created_at)
  on public.reviews to anon, authenticated;

-- Aucun GRANT sur newsletter_subscribers : la liste d'adresses ne doit jamais
-- être lisible depuis le navigateur. Les inscriptions passent par le serveur.
