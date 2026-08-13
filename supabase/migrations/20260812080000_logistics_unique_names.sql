-- =============================================================================
-- Unicité des noms logistiques.
--
-- Deux zones de livraison ou deux points de ramassage portant le même nom
-- n'auraient aucun sens : l'équipe ne saurait plus lequel elle modifie, et un
-- réimport créerait des doublons silencieux au lieu de mettre à jour.
-- =============================================================================

alter table public.delivery_zones
  add constraint delivery_zones_name_unique unique (name);

alter table public.pickup_locations
  add constraint pickup_locations_name_unique unique (name);
