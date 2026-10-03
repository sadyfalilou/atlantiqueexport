-- Courriel d'invitation du personnel.
--
-- Envoyé quand l'écran Équipe crée un compte : la personne n'a pas encore de
-- mot de passe, et le lien qu'il porte est le seul chemin pour en choisir un.
-- Aucun mot de passe n'est jamais fabriqué ni transmis.
alter type public.email_type add value if not exists 'staff_invite';
