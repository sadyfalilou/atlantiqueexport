-- Photographies de produits.
--
-- La table `product_images` existait depuis la migration `catalog`, avec sa
-- politique de lecture publique et son privilège `select`. Il lui manquait
-- l'essentiel : un endroit où ranger les fichiers. Cette migration crée ce
-- bucket et ses règles d'accès.
--
-- Le bucket est **public en lecture**. C'est voulu : une photo de produit est
-- destinée à être vue de tous, et la servir derrière une URL signée qui expire
-- casserait la mise en cache des images par le navigateur et par Vercel, pour
-- protéger une information qui n'a rien de confidentiel.
--
-- L'écriture, elle, n'est ouverte à personne : ni `anon` ni `authenticated` ne
-- reçoivent de politique d'insertion. Seul `service_role`, qui contourne RLS,
-- peut téléverser — c'est-à-dire le serveur, après avoir vérifié le rôle de la
-- personne connectée. Sans cela, n'importe quel visiteur pourrait déposer des
-- fichiers dans votre espace de stockage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produits',
  'produits',
  true,
  -- 5 Mo : largement de quoi loger une photo de catalogue bien exportée, et
  -- assez bas pour qu'un envoi accidentel de fichier brut d'appareil photo
  -- soit refusé plutôt que de gonfler la facture de stockage.
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique des objets du seul bucket `produits`.
drop policy if exists produits_public_read on storage.objects;
create policy produits_public_read on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'produits');

-- --- Écritures dans product_images ------------------------------------------
-- La table n'accordait que `select` au public. Le serveur écrit avec la clé de
-- service, mais les privilèges par défaut de `service_role` ont été rétablis
-- table par table (voir la migration `service_role_grants`) : on les pose donc
-- explicitement ici aussi, pour que rien ne dépende de l'ordre des migrations.
grant select, insert, update, delete on public.product_images to service_role;

-- Une seule photo principale par produit. Sans cette contrainte, deux clics
-- successifs sur « définir comme principale » laisseraient deux lignes à vrai,
-- et la fiche produit afficherait l'une ou l'autre au hasard des tris.
create unique index if not exists product_images_one_primary
  on public.product_images (product_id)
  where is_primary;
