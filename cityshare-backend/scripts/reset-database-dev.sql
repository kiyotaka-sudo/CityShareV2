-- Réinitialisation complète (DEV uniquement — supprime toutes les données)
-- Exécuter en tant que postgres, hors transaction :
--   psql -U postgres -f scripts/reset-database-dev.sql

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'cityshare' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS cityshare;

CREATE DATABASE cityshare OWNER cityshare_user;

GRANT ALL PRIVILEGES ON DATABASE cityshare TO cityshare_user;
