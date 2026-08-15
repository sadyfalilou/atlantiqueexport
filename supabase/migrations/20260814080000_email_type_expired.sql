-- Ajoute le type de courriel « commande expirée ».
--
-- Une commande impayée est annulée au bout de 24 heures. Sans ce courriel, le
-- client passait commande, recevait les instructions de virement, puis plus
-- rien : sa commande disparaissait en silence. Le motif étant clair — le
-- virement n'est pas arrivé — le message peut être écrit sans supposition.
--
-- Aucune valeur d'énumération ne peut servir dans la transaction qui l'ajoute ;
-- elle est donc posée seule, et utilisée par le code applicatif ensuite.

alter type public.email_type add value if not exists 'order_expired';
