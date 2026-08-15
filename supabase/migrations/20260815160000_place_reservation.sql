-- Réservation sur un arrivage, en une seule transaction.
--
-- `reserve_shipment_quantity` existait déjà et fait le plus dur : verrou de
-- ligne, refus après la date limite, refus de dépassement. Mais elle ne fait
-- QUE décrémenter le disponible. Appelée seule depuis l'application, suivie
-- d'une insertion séparée, un échec de l'insertion laisserait de la
-- marchandise réservée pour une réservation qui n'existe pas — et personne
-- pour la réclamer.
--
-- Les deux opérations sont donc réunies ici, comme `place_order` réunit stock,
-- créneau et commande. La moindre exception annule l'ensemble.
--
-- Sans acompte : la réservation naît `pending` et vaut engagement moral, pas
-- paiement. Rien à encaisser, donc rien à rembourser si l'arrivage est annulé.
-- Le champ `deposit_payment_id` reste dans la table pour le jour où un acompte
-- sera exigé.

create or replace function public.place_reservation(
  p_shipment_item_id uuid,
  p_quantity         integer,
  p_email            text,
  p_phone            text,
  p_locale           text,
  p_user_id          uuid default null
)
returns table (reservation_id uuid, remaining integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
  v_id        uuid;
  v_published boolean;
begin
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'Adresse courriel invalide' using errcode = '22023';
  end if;

  -- Un arrivage non publié n'est pas réservable : sans cette vérification,
  -- l'identifiant d'une ligne encore en préparation, deviné ou récupéré,
  -- suffirait à réserver sur un arrivage que personne n'est censé voir.
  select s.is_published into v_published
  from public.shipment_items si
  join public.shipments s on s.id = si.shipment_id
  where si.id = p_shipment_item_id;

  if not found then
    raise exception 'Ligne d''arrivage inconnue' using errcode = 'P0002';
  end if;

  if not coalesce(v_published, false) then
    raise exception 'Cet arrivage n''est pas ouvert aux réservations'
      using errcode = 'P0001';
  end if;

  -- Lève si la date limite est passée ou la quantité insuffisante. La
  -- transaction entière est alors annulée.
  v_remaining := public.reserve_shipment_quantity(p_shipment_item_id, p_quantity);

  insert into public.reservations (
    shipment_item_id, user_id, email, phone, locale, quantity, status
  )
  values (
    p_shipment_item_id, p_user_id, lower(trim(p_email)),
    nullif(trim(p_phone), ''), p_locale, p_quantity, 'pending'
  )
  returning id into v_id;

  return query select v_id, v_remaining;
end;
$$;

-- Appelée uniquement côté serveur, avec la clé de service : la réservation
-- passe par une action qui valide la saisie et envoie la confirmation.
revoke execute on function public.place_reservation(
  uuid, integer, text, text, text, uuid
) from public;

grant execute on function public.place_reservation(
  uuid, integer, text, text, text, uuid
) to service_role;
