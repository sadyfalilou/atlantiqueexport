-- Annote l'annulation au lieu de la journaliser deux fois.
--
-- La version précédente insérait sa propre ligne dans `order_events`. Or le
-- déclencheur `log_order_status_change`, posé au lot 2, écrit déjà toute
-- transition de statut : chaque commande expirée se retrouvait donc avec deux
-- entrées « pending_payment → cancelled », dont une sans motif. Vérifié en
-- comptant les lignes après une expiration réelle : trois au lieu de deux.
--
-- On met donc à jour la ligne que le déclencheur vient de créer.

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

    -- Le déclencheur `log_order_status_change` vient d'écrire la transition
    -- au journal. On ANNOTE sa ligne plutôt que d'en ajouter une seconde :
    -- deux entrées identiques feraient croire à deux annulations. La note
    -- porte le motif, sans lequel « annulée » n'apprend rien à qui relira le
    -- dossier dans six mois.
    update public.order_events
       set note = format(
             'Virement non reçu dans le délai de %s h — %s unité(s) remise(s) en vente',
             p_hours, v_units)
     where id = (
       select e.id
         from public.order_events e
        where e.order_id = v_order.id
        order by e.created_at desc
        limit 1
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
