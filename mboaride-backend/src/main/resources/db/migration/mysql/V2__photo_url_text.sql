-- Équivalent MySQL de la migration PostgreSQL V2 (photo_url est déjà en TEXT dans V1).
ALTER TABLE utilisateur MODIFY COLUMN photo_url TEXT;
