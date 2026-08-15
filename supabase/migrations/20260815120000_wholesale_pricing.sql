-- Applique le tarif de gros aux comptes professionnels approuvés.
--
-- Jusqu'ici, `place_order` facturait `retail_price_cents` à tout le monde :
-- approuver une demande professionnelle ne changeait aucun prix. Le tarif
-- existait par format, saisi dans l'administration, mais aucun chemin ne le
-- servait.
--
-- Le choix du prix se fait ICI et nulle part ailleurs. L'application peut
-- afficher ce qu'elle veut : c'est cette fonction qui établit le montant
-- facturé, à partir du compte qui passe la commande.
--
-- Deux règles, toutes deux protectrices du client :
--
-- 1. **Un format sans tarif de gros se vend au prix de détail.** Un oubli de
--    saisie ne doit pas retirer un produit de la vente ni bloquer une commande.
-- 2. **Le professionnel ne paie jamais plus qu'un client de détail.** Si une
--    promotion descend le prix public sous le tarif négocié, c'est le prix
--    public qui s'applique. Sans ce `least`, une promotion ferait payer le
--    grossiste plus cher que le particulier — l'inverse de ce qu'on lui a promis.
--
-- Comme au lot 7, cette migration reprend la fonction d'origine **mot pour
-- mot** : elle est générée depuis le fichier précédent par remplacement de
-- chaînes, et son diff ne montre que les lignes voulues. La signature est
-- inchangée, donc `create or replace` remplace bien la fonction au lieu d'en
-- créer une seconde — l'écueil qui avait fait tomber toutes les commandes.

create or replace function public.place_order(
  p_cart_id            uuid,
  p_email              text,
  p_phone              text,
  p_locale             text,
  p_method             public.fulfillment_method,
  p_pickup_location_id uuid,
  p_zone_id            uuid,
  p_slot_id            uuid,
  p_address            jsonb,
  p_notes              text,
  p_guest_token        text,
  p_user_id            uuid default null
)
returns table (order_id uuid, order_number text, total_cents integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id       uuid;
  v_wholesale      boolean := false;
  v_unit           integer;
  v_order_number   text;
  v_subtotal       integer := 0;
  v_delivery       integer := 0;
  v_total          integer := 0;
  v_zone           public.delivery_zones%rowtype;
  v_slot           public.delivery_slots%rowtype;
  v_line           record;
  v_temperatures   public.temperature_class[];
  v_has_lines      boolean := false;
begin
  -- --- 1. Le panier doit exister et contenir quelque chose ------------------
  if p_cart_id is null then
    raise exception 'Panier introuvable' using errcode = 'P0002';
  end if;

  select array_agg(distinct pr.temperature_class)
    into v_temperatures
  from public.cart_items ci
  join public.product_variants pv on pv.id = ci.variant_id
  join public.products pr on pr.id = pv.product_id
  where ci.cart_id = p_cart_id;

  if v_temperatures is null then
    raise exception 'Le panier est vide' using errcode = 'P0001';
  end if;

  -- --- 2. Le mode de réception doit être compatible -------------------------
  -- Cette vérification existe déjà dans l'interface ; on la refait ici parce
  -- que l'interface peut être contournée, pas la base.
  if p_method = 'shipping' then
    if exists (select 1 from unnest(v_temperatures) t where t <> 'ambient') then
      raise exception 'Expédition impossible : le panier contient des produits à conserver au froid'
        using errcode = 'P0001';
    end if;

  elsif p_method = 'local_delivery' then
    if p_zone_id is null then
      raise exception 'Zone de livraison manquante' using errcode = '22023';
    end if;

    select * into v_zone from public.delivery_zones where id = p_zone_id and is_active;
    if not found then
      raise exception 'Zone de livraison inconnue' using errcode = 'P0002';
    end if;

    if exists (
      select 1 from unnest(v_temperatures) t
      where t <> all (v_zone.allowed_temperature_classes)
    ) then
      raise exception 'Cette zone n''accepte pas certains produits du panier'
        using errcode = 'P0001';
    end if;

  elsif p_method = 'pickup' then
    if p_pickup_location_id is null then
      raise exception 'Point de ramassage manquant' using errcode = '22023';
    end if;
  end if;

  -- --- 3. La commande, d'abord vide ----------------------------------------
  insert into public.orders (
    user_id, guest_token, email, phone, locale, status, payment_status,
    fulfillment_method, pickup_location_id, delivery_zone_id, slot_id,
    delivery_address, delivery_notes, placed_at
  )
  values (
    p_user_id, p_guest_token, lower(trim(p_email)), nullif(trim(p_phone), ''), p_locale,
    'pending_payment', 'pending',
    p_method, p_pickup_location_id, p_zone_id, p_slot_id,
    p_address, nullif(trim(p_notes), ''), now()
  )
  returning id, orders.order_number into v_order_id, v_order_number;

  -- --- 3 bis. Le compte donne-t-il droit au tarif de gros ? -----------------
  -- Lu depuis `p_user_id` et non depuis `auth.uid()` : la fonction est
  -- appelée avec la clé de service, pour laquelle `auth.uid()` est nul. Une
  -- commande sans compte reste au prix de détail.
  if p_user_id is not null then
    select exists (
      select 1 from public.business_accounts
      where profile_id = p_user_id and status = 'approved'
    ) into v_wholesale;
  end if;

  -- --- 4. Les lignes, aux prix relus en base --------------------------------
  -- Le panier ne stocke aucun prix : c'est ici, et seulement ici, que le
  -- montant est établi. Rien de ce que le navigateur a envoyé n'intervient.
  for v_line in
    select ci.variant_id, ci.quantity,
           pv.sku, pv.label_fr, pv.retail_price_cents, pv.wholesale_price_cents,
           pv.net_weight_g,
           pr.name_fr
    from public.cart_items ci
    join public.product_variants pv on pv.id = ci.variant_id
    join public.products pr on pr.id = pv.product_id
    where ci.cart_id = p_cart_id
    order by ci.created_at
  loop
    v_has_lines := true;

    v_unit := case
      when v_wholesale and v_line.wholesale_price_cents is not null
        then least(v_line.wholesale_price_cents, v_line.retail_price_cents)
      else v_line.retail_price_cents
    end;

    -- Lève une exception si le stock ne suffit pas : toute la commande est
    -- alors annulée, réservations comprises.
    perform public.reserve_stock(v_line.variant_id, v_line.quantity, v_order_id);

    insert into public.order_items (
      order_id, variant_id, product_name_snapshot, sku_snapshot,
      unit_label_snapshot, quantity, unit_price_cents, estimated_weight_g,
      line_total_cents
    )
    values (
      v_order_id, v_line.variant_id, v_line.name_fr, v_line.sku,
      v_line.label_fr, v_line.quantity, v_unit,
      v_line.net_weight_g,
      v_unit * v_line.quantity
    );

    v_subtotal := v_subtotal + v_unit * v_line.quantity;
  end loop;

  if not v_has_lines then
    raise exception 'Le panier est vide' using errcode = 'P0001';
  end if;

  -- --- 5. Frais de livraison ------------------------------------------------
  if p_method = 'local_delivery' then
    if v_subtotal < v_zone.min_order_cents then
      raise exception 'Montant minimum de % $ non atteint pour cette zone',
        round(v_zone.min_order_cents / 100.0, 2) using errcode = 'P0001';
    end if;

    if v_zone.free_shipping_threshold_cents is not null
       and v_subtotal >= v_zone.free_shipping_threshold_cents then
      v_delivery := 0;
    else
      v_delivery := v_zone.fee_cents;
    end if;
  end if;

  v_total := v_subtotal + v_delivery;

  -- --- 6. Créneau -----------------------------------------------------------
  if p_slot_id is not null then
    select * into v_slot from public.delivery_slots where id = p_slot_id;
    if not found then
      raise exception 'Créneau inconnu' using errcode = 'P0002';
    end if;
    if v_slot.method <> p_method then
      raise exception 'Ce créneau ne correspond pas au mode choisi' using errcode = 'P0001';
    end if;

    -- Lève une exception si le créneau est complet.
    perform public.book_delivery_slot(p_slot_id);
  end if;

  -- --- 7. Montants et vidage du panier --------------------------------------
  update public.orders
  set subtotal_cents = v_subtotal,
      delivery_fee_cents = v_delivery,
      total_cents = v_total
  where id = v_order_id;

  delete from public.cart_items where cart_id = p_cart_id;

  return query select v_order_id, v_order_number, v_total;
end;
$$;

-- Appelée uniquement côté serveur, avec la clé de service.
revoke execute on function public.place_order(
  uuid, text, text, text, public.fulfillment_method, uuid, uuid, uuid, jsonb, text, text, uuid
) from public;

grant execute on function public.place_order(
  uuid, text, text, text, public.fulfillment_method, uuid, uuid, uuid, jsonb, text, text, uuid
) to service_role;
