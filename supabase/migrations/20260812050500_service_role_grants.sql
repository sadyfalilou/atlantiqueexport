-- =============================================================================
-- Privilèges du rôle serveur.
--
-- Le projet ayant été créé avec « Automatically expose new tables » désactivé,
-- Supabase n'accorde plus rien par défaut aux rôles de l'API — y compris à
-- `service_role`, ce qui n'était pas évident. Constaté à l'essai : la clé
-- secrète recevait « 42501 permission denied » sur la moindre lecture, sur
-- toute écriture et sur chaque appel de fonction.
--
-- `service_role` est l'identité de confiance du serveur : elle contourne déjà
-- les politiques RLS, et c'est donc le GRANT qui constitue sa seule barrière.
-- On lui ouvre l'ensemble du schéma public, une fois pour toutes.
--
-- Les rôles `anon` et `authenticated`, eux, restent volontairement limités aux
-- privilèges accordés table par table dans les migrations précédentes.
-- =============================================================================

grant usage on schema public to service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute       on all functions  in schema public to service_role;

-- Sans cette partie, chaque nouvelle table créée par une future migration
-- serait de nouveau inaccessible au serveur, et il faudrait y penser à chaque
-- fois. Les migrations s'exécutent sous le rôle `postgres`, d'où le FOR ROLE.
alter default privileges for role postgres in schema public
  grant all privileges on tables to service_role;

alter default privileges for role postgres in schema public
  grant all privileges on sequences to service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
