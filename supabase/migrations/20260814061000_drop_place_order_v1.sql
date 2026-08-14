-- Retire l'ancienne signature de `place_order`.
--
-- `create or replace function` ne remplace que si la signature est identique.
-- Ajouter un paramètre, même avec une valeur par défaut, crée donc une SECONDE
-- fonction. Les deux coexistaient, et PostgREST refusait de choisir :
--
--   PGRST203 — Could not choose the best candidate function between:
--   place_order(… p_guest_token) et place_order(… p_guest_token, p_user_id)
--
-- Conséquence : plus aucune commande ne pouvait être passée. Le script de
-- fumée l'a signalé immédiatement — c'est exactement ce pour quoi il existe.
--
-- On supprime l'ancienne version. La nouvelle porte un paramètre par défaut,
-- donc les appels à onze arguments continuent de fonctionner.

drop function if exists public.place_order(
  uuid, text, text, text, public.fulfillment_method, uuid, uuid, uuid, jsonb, text, text
);
