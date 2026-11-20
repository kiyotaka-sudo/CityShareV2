-- =====================================================================
--  MboaRide — 6. VOIR LES REQUÊTES SQL REÇUES PAR LA BASE (journal général de MariaDB)
--  Chaque requête envoyée par le backend (compte mboa_backend) est enregistrée dans la table mysql.general_log,
--  consultable en direct dans phpMyAdmin. À couper après la démonstration : ce journal grossit très vite.
-- =====================================================================

-- Activer : le journal est écrit dans une table (et non un fichier)
SET GLOBAL log_output = 'TABLE';
SET GLOBAL general_log = 'ON';
TRUNCATE TABLE mysql.general_log;

-- Pendant la démonstration : faire une action dans l'application, puis exécuter cette requête
SELECT event_time                       AS heure,
       SUBSTRING_INDEX(user_host, '[', 1) AS compte,
       thread_id                        AS connexion,
       command_type                     AS type,
       LEFT(CONVERT(argument USING utf8mb4), 400) AS requete_sql
FROM mysql.general_log
WHERE user_host LIKE 'mboa_backend%'
  AND command_type IN ('Query', 'Execute', 'Prepare')
  AND argument NOT LIKE 'SET %'
  AND argument NOT LIKE 'SELECT 1%'
ORDER BY event_time DESC
LIMIT 50;

-- Nombre de requêtes par type d'instruction pendant la démonstration
SELECT UPPER(SUBSTRING_INDEX(TRIM(CONVERT(argument USING utf8mb4)), ' ', 1)) AS instruction, COUNT(*) AS nombre
FROM mysql.general_log
WHERE user_host LIKE 'mboa_backend%' AND command_type IN ('Query', 'Execute')
GROUP BY instruction
ORDER BY nombre DESC;

-- Désactiver après la démonstration
-- SET GLOBAL general_log = 'OFF';
-- TRUNCATE TABLE mysql.general_log;
