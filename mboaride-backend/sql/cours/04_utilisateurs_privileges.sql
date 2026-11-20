-- =====================================================================
--  MboaRide — 4. UTILISATEURS, RÔLES ET PRIVILÈGES (DCL : GRANT / REVOKE)
--  Principe du moindre privilège : chaque compte n'accède qu'à ce dont il a besoin.
--  Syntaxe MariaDB 10.4 (XAMPP). Sous MySQL 8 : SET DEFAULT ROLE ALL TO 'compte'@'localhost'.
--  Mots de passe de DÉMONSTRATION, à changer hors cours.
-- =====================================================================

-- Nettoyage (le script peut être rejoué)
DROP USER IF EXISTS 'mboa_admin_bd'@'localhost', 'mboa_backend'@'localhost', 'mboa_support'@'localhost',
                    'mboa_analyste'@'localhost', 'mboa_auditeur'@'localhost';
DROP ROLE IF EXISTS role_support, role_analyste, role_auditeur;

-- ---------------------------------------------------------------------
-- 4.1 Rôles : un ensemble de privilèges réutilisable
-- ---------------------------------------------------------------------
CREATE ROLE role_support;
GRANT SELECT ON mboa_ride.vue_courses_detaillees TO role_support;
GRANT SELECT ON mboa_ride.vue_courses_en_cours  TO role_support;
GRANT SELECT ON mboa_ride.vue_utilisateurs_publics TO role_support;
GRANT SELECT, UPDATE (statut, reponse, traite_par, updated_at) ON mboa_ride.reclamation TO role_support;
GRANT SELECT, UPDATE (statut, notes, traite_par, resolue_at)   ON mboa_ride.alerte_sos  TO role_support;

CREATE ROLE role_analyste;
GRANT SELECT ON mboa_ride.vue_classement_chauffeurs       TO role_analyste;
GRANT SELECT ON mboa_ride.vue_chiffre_affaires_journalier TO role_analyste;
GRANT EXECUTE ON PROCEDURE mboa_ride.ps_chiffre_affaires_periode TO role_analyste;
GRANT EXECUTE ON PROCEDURE mboa_ride.ps_stats_chauffeur          TO role_analyste;

CREATE ROLE role_auditeur;
GRANT SELECT ON mboa_ride.historique_statut_course TO role_auditeur;
GRANT SELECT ON mboa_ride.historique_solde         TO role_auditeur;
GRANT SELECT ON mboa_ride.journal_admin            TO role_auditeur;

-- ---------------------------------------------------------------------
-- 4.2 Comptes
-- ---------------------------------------------------------------------
-- Administrateur de la base : tous les droits, et peut les transmettre (WITH GRANT OPTION)
CREATE USER 'mboa_admin_bd'@'localhost' IDENTIFIED BY 'AdminBD2026!';
GRANT ALL PRIVILEGES ON mboa_ride.* TO 'mboa_admin_bd'@'localhost' WITH GRANT OPTION;

-- Compte du backend Spring Boot : lit et écrit les données, appelle les procédures, mais ne peut
-- ni supprimer une table (DROP) ni gérer les comptes : une faille dans l'API ne détruit pas la base.
CREATE USER 'mboa_backend'@'localhost' IDENTIFIED BY 'Backend2026!';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON mboa_ride.* TO 'mboa_backend'@'localhost';

-- Agent du support : uniquement via le rôle (lecture des vues, traitement des réclamations et SOS)
CREATE USER 'mboa_support'@'localhost' IDENTIFIED BY 'Support2026!';
GRANT role_support TO 'mboa_support'@'localhost';
SET DEFAULT ROLE role_support FOR 'mboa_support'@'localhost';

-- Analyste : statistiques seulement, aucune donnée personnelle
CREATE USER 'mboa_analyste'@'localhost' IDENTIFIED BY 'Analyste2026!';
GRANT role_analyste TO 'mboa_analyste'@'localhost';
SET DEFAULT ROLE role_analyste FOR 'mboa_analyste'@'localhost';

-- Auditeur : lecture des journaux d'audit remplis par les déclencheurs
CREATE USER 'mboa_auditeur'@'localhost' IDENTIFIED BY 'Auditeur2026!';
GRANT role_auditeur TO 'mboa_auditeur'@'localhost';
SET DEFAULT ROLE role_auditeur FOR 'mboa_auditeur'@'localhost';

FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------
-- 4.3 Consultation et révocation
-- ---------------------------------------------------------------------
SHOW GRANTS FOR 'mboa_support'@'localhost';
SHOW GRANTS FOR role_support;

-- Exemple de révocation : le support ne peut plus modifier les alertes SOS
-- REVOKE UPDATE (statut, notes, traite_par, resolue_at) ON mboa_ride.alerte_sos FROM role_support;
-- Retirer un rôle : REVOKE role_analyste FROM 'mboa_analyste'@'localhost';
