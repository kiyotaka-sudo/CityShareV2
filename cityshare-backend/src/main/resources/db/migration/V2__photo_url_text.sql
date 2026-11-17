-- Nécessite que l'utilisateur JDBC (cityshare_user) soit propriétaire des tables.
-- Si échec : psql -U postgres -d cityshare -f scripts/fix-db-ownership.sql
ALTER TABLE utilisateur ALTER COLUMN photo_url TYPE TEXT;
