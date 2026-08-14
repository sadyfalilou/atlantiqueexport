-- Mouvements de stock saisis depuis l'administration.
--
-- `receive_stock` existait déjà, mais il attribue le mouvement à `auth.uid()`.
-- L'administration écrit avec la clé de service, où `auth.uid()` est nul : le
-- registre aurait enregistré chaque réception sans savoir qui l'avait faite.
-- Or c'est précisément l'intérêt d'un registre. Cette fonction reçoit donc
-- l'auteur en paramètre, après que le serveur a vérifié son rôle.
--
-- Elle couvre les trois gestes du quotidien — réception, ajustement, perte —
-- parce qu'ils partagent les mêmes garde-fous et doivent tous laisser une
-- trace. `receive_stock` reste en place, inchangée, pour les scripts.

create or replace function public.record_stock_movement(
  p_variant_id     uuid,
  -- Positif pour une entrée, négatif pour une sortie. Jamais zéro : un
  -- mouvement nul n'apprend rien et polluerait le registre.
  p_quantity_delta integer,
  p_movement_type  public.movement_type,
  p_actor_id       uuid,
  p_reason         text default null,
  p_lot_code       text default null,
  p_expires_at     date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lot_id      uuid;
  v_movement_id uuid;
  v_on_hand     integer;
  v_reserved    integer;
begin
  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Un mouvement de stock ne peut pas être nul'
      using errcode = '22023';
  end if;

  -- Les autres types du domaine — vente, réservation, libération — sont écrits
  -- par la transaction de commande, jamais à la main. Les accepter ici
  -- laisserait fabriquer un historique de ventes qui n'ont pas eu lieu.
  if p_movement_type not in ('reception', 'adjustment', 'loss', 'return') then
    raise exception 'Type de mouvement non saisissable à la main : %', p_movement_type
      using errcode = '22023';
  end if;

  -- Verrouille la ligne : deux corrections simultanées se suivraient sinon
  -- sur un même total lu avant écriture, et la seconde écraserait la première.
  select quantity_on_hand, quantity_reserved
    into v_on_hand, v_reserved
    from public.stock_levels
   where variant_id = p_variant_id
     for update;

  if not found then
    raise exception 'Aucun stock suivi pour ce format' using errcode = '23503';
  end if;

  if v_on_hand + p_quantity_delta < 0 then
    raise exception 'Retrait de % impossible : il n''y a que % en stock',
      abs(p_quantity_delta), v_on_hand
      using errcode = '23514';
  end if;

  -- LE garde-fou : on ne descend jamais sous ce qui est déjà réservé pour des
  -- commandes en cours. La contrainte de table le refuserait de toute façon,
  -- mais avec un message que personne ne saurait interpréter.
  if v_on_hand + p_quantity_delta < v_reserved then
    raise exception
      'Retrait impossible : % unité(s) sont réservées pour des commandes en cours',
      v_reserved
      using errcode = '23514';
  end if;

  -- Une réception crée son lot, pour garder la traçabilité des dates de
  -- péremption. Un ajustement positif, non : il corrige un comptage, il ne
  -- correspond à aucune arrivée de marchandise.
  if p_movement_type = 'reception' then
    insert into public.inventory_lots (
      variant_id, lot_code, expires_at, quantity_received, quantity_on_hand
    )
    values (p_variant_id, p_lot_code, p_expires_at, p_quantity_delta, p_quantity_delta)
    returning id into v_lot_id;
  end if;

  update public.stock_levels
     set quantity_on_hand = quantity_on_hand + p_quantity_delta,
         updated_at = now()
   where variant_id = p_variant_id;

  insert into public.stock_movements (
    variant_id, lot_id, movement_type, quantity_delta, actor_id, reason
  )
  values (
    p_variant_id, v_lot_id, p_movement_type, p_quantity_delta, p_actor_id,
    nullif(btrim(coalesce(p_reason, '')), '')
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

-- Réservée au serveur : elle écrit dans l'inventaire sans autre contrôle que
-- ses propres garde-fous, et c'est l'application qui vérifie le rôle.
revoke execute on function public.record_stock_movement(
  uuid, integer, public.movement_type, uuid, text, text, date
) from public;
grant execute on function public.record_stock_movement(
  uuid, integer, public.movement_type, uuid, text, text, date
) to service_role;

grant select on public.stock_movements to service_role;
grant select on public.inventory_lots  to service_role;
