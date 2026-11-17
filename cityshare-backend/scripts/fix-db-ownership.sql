-- À exécuter UNE FOIS en tant que superutilisateur PostgreSQL (souvent "postgres") :
--   psql -U postgres -d cityshare -f scripts/fix-db-ownership.sql
--
-- Corrige : "ERROR: must be owner of table utilisateur" lors de Flyway V2

ALTER DATABASE cityshare OWNER TO cityshare_user;

ALTER SCHEMA public OWNER TO cityshare_user;

ALTER TABLE IF EXISTS utilisateur OWNER TO cityshare_user;
ALTER TABLE IF EXISTS conducteur OWNER TO cityshare_user;
ALTER TABLE IF EXISTS passager OWNER TO cityshare_user;
ALTER TABLE IF EXISTS expediteur OWNER TO cityshare_user;
ALTER TABLE IF EXISTS trajet OWNER TO cityshare_user;
ALTER TABLE IF EXISTS arret_intermediaire OWNER TO cityshare_user;
ALTER TABLE IF EXISTS reservation OWNER TO cityshare_user;
ALTER TABLE IF EXISTS colis OWNER TO cityshare_user;
ALTER TABLE IF EXISTS notation OWNER TO cityshare_user;
ALTER TABLE IF EXISTS alerte_sos OWNER TO cityshare_user;
ALTER TABLE IF EXISTS message OWNER TO cityshare_user;

ALTER TABLE utilisateur ALTER COLUMN photo_url TYPE TEXT;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cityshare_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cityshare_user;
