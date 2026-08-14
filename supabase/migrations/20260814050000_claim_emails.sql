-- Réservation des courriels avant envoi.
--
-- Le traitement lisait les courriels en attente, puis les envoyait un à un.
-- Entre la lecture et l'envoi, rien n'empêchait un second traitement de lire
-- exactement la même liste : deux appels simultanés — deux ordonnanceurs, ou
-- une exécution qui traîne pendant que la suivante démarre — envoyaient donc
-- le même courriel deux fois au client.
--
-- La correction tient en un mot de PostgreSQL : `for update skip locked`.
-- Chaque appel verrouille les lignes qu'il prend et **saute** celles qu'un
-- autre appel tient déjà, au lieu d'attendre son tour pour refaire le même
-- travail. C'est le motif habituel des files de traitement.
--
-- La réservation est portée par une colonne dédiée plutôt que par un nouveau
-- statut : PostgreSQL interdit d'utiliser une valeur d'énumération dans la
-- transaction qui l'ajoute, et surtout « réservé » n'est pas un état du
-- courriel — c'est un état du traitement. Les deux méritent d'être distincts.

alter table public.email_queue
  add column if not exists claimed_at timestamptz;

comment on column public.email_queue.claimed_at is
  'Instant où un traitement a pris ce courriel en charge. Remis à NULL une fois conclu, envoyé ou échoué.';

-- Un courriel réservé depuis plus de dix minutes est considéré comme
-- abandonné : le processus qui l'avait pris a été interrompu — redémarrage,
-- expiration de la fonction serverless — sans jamais conclure. On le remet en
-- circulation plutôt que de le laisser bloqué pour toujours.
create or replace function public.claim_emails(p_limit integer default 25)
returns setof public.email_queue
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.email_queue as q
     set claimed_at = now(),
         last_attempted_at = now()
   where q.id in (
     select id
       from public.email_queue
      where status in ('pending', 'failed')
        and (next_retry_at is null or next_retry_at <= now())
        and attempts < max_attempts
        and (claimed_at is null or claimed_at < now() - interval '10 minutes')
      order by created_at
      limit p_limit
      for update skip locked
   )
  returning q.*;
$$;

revoke execute on function public.claim_emails(integer) from public;
grant execute on function public.claim_emails(integer) to service_role;
