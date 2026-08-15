-- Frais d'expédition postale.
--
-- `place_order` n'ajoutait de frais que pour la livraison locale. L'expédition
-- par la poste, proposée dès qu'un panier ne contient que de l'ambiant, partait
-- donc sans un sou de frais de port — un trou de recette invisible, puisque
-- rien nulle part ne permettait même d'en saisir un.
--
-- Le tarif vit dans `site_settings` et non dans `delivery_zones` : les zones
-- décrivent des secteurs de livraison locale, avec leurs codes postaux et leurs
-- tournées. L'expédition ne connaît pas de secteur — c'est un tarif unique pour
-- tout le Canada, et le ranger dans une zone fictive aurait obligé chaque
-- lecture de zone à l'écarter.

alter table public.site_settings
  add column shipping_fee_cents integer not null default 0
    check (shipping_fee_cents >= 0),
  add column shipping_free_threshold_cents integer
    check (shipping_free_threshold_cents is null or shipping_free_threshold_cents >= 0);

comment on column public.site_settings.shipping_fee_cents is
  'Frais d''expédition postale, tarif unique. Zéro signifie « offerte », pas « non configurée ».';

comment on column public.site_settings.shipping_free_threshold_cents is
  'Montant à partir duquel l''expédition est offerte. NULL = jamais offerte.';
