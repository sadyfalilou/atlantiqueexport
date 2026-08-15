-- Libère les commandes impayées passé le délai.
--
-- Les conditions de vente promettent au client : « Le stock est réservé pour
-- vous pendant 24 heures ; passé ce délai sans virement, la réservation est
-- libérée et la commande annulée. » Rien ne le faisait. `release_stock` et
-- `release_delivery_slot` existaient depuis le lot 2, mais aucun appelant :
-- une commande jamais payée gardait son stock réservé indéfiniment, et ce
-- stock devenait invendable sans que personne ne s'en aperçoive.
--
-- La fonction est **idempotente et sûre à rejouer** : elle ne touche que les
-- commandes encore `pending_payment` et dont la date dépasse le délai. La
-- passer toutes les heures ou toutes les cinq minutes revient au même.

create or replace function public.expire_unpaid_orders(p_hours integer default 24)
returns table (order_id uuid, order_number text, released_units integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order   record;
  v_line    record;
  v_units   integer;
begin
  if p_hours is null or p_hours < 1 then
    raise exception 'Le délai doit valoir au moins une heure' using errcode = '22023';
  end if;

  for v_order in
    select o.id, o.order_number, o.slot_id
      from public.orders o
     where o.payment_status = 'pending'
       and o.status = 'pending_payment'
       and o.placed_at < now() - make_interval(hours => p_hours)
     -- Verrouille la ligne : si deux exécutions du cron se chevauchent, la
     -- seconde saute les commandes déjà prises par la première au lieu de
     -- libérer le stock une deuxième fois.
     for update skip locked
  loop
    v_units := 0;

    -- Rendre le stock, ligne par ligne. `release_stock` écrit elle-même au
    -- registre des mouvements : l'écart reste explicable des mois plus tard.
    for v_line in
      select oi.variant_id, oi.quantity
        from public.order_items oi
       where oi.order_id = v_order.id
         and oi.variant_id is not null
    loop
      perform public.release_stock(v_line.variant_id, v_line.quantity, v_order.id);
      v_units := v_units + v_line.quantity;
    end loop;

    -- Rendre la place du créneau, sans quoi une commande morte continuerait
    -- d'occuper une tournée et d'empêcher un vrai client de la réserver.
    if v_order.slot_id is not null then
      perform public.release_delivery_slot(v_order.slot_id);
    end if;

    update public.orders
       set status = 'cancelled',
           updated_at = now()
     where id = v_order.id;

    -- Le journal d'événements garde la trace, sans auteur : personne n'a
    -- cliqué, c'est le délai qui a tranché.
    insert into public.order_events (order_id, from_status, to_status, note)
    values (
      v_order.id,
      'pending_payment',
      'cancelled',
      format('Virement non reçu dans le délai de %s h — %s unité(s) remise(s) en vente',
             p_hours, v_units)
    );

    order_id := v_order.id;
    order_number := v_order.order_number;
    released_units := v_units;
    return next;
  end loop;
end;
$$;

revoke execute on function public.expire_unpaid_orders(integer) from public;
grant execute on function public.expire_unpaid_orders(integer) to service_role;
