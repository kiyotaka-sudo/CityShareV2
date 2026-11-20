-- =====================================================================
--  MboaRide — 5. DÉMONSTRATION (à exécuter bloc par bloc dans phpMyAdmin devant le professeur)
--  Les modifications sont faites dans des transactions annulées (ROLLBACK) : la base reste intacte.
-- =====================================================================
USE mboa_ride;

-- ---------- VUES ----------
SELECT * FROM vue_courses_detaillees ORDER BY created_at DESC LIMIT 5;
SELECT * FROM vue_classement_chauffeurs ORDER BY gains_fcfa DESC;
SELECT * FROM vue_chiffre_affaires_journalier ORDER BY jour DESC;
SELECT * FROM vue_utilisateurs_publics;          -- pas de mot de passe, téléphone masqué

-- ---------- DÉCLENCHEUR : contrôle d'intégrité ----------
-- Doit échouer avec « Erreur : une note doit etre comprise entre 1 et 5. »
-- INSERT INTO notation (course_id, auteur_id, cible_id, note, created_at) VALUES (1, 3, 6, 9, NOW());

-- ---------- DÉCLENCHEUR : audit du solde ----------
START TRANSACTION;
  UPDATE utilisateur SET solde = solde + 2500 WHERE telephone LIKE '%690000001';   -- recharge de 2 500 FCFA
  SELECT * FROM historique_solde ORDER BY id DESC LIMIT 1;                      -- ligne ajoutée par le trigger
ROLLBACK;

-- ---------- DÉCLENCHEUR : audit des statuts de course ----------
-- Rempli automatiquement quand l'application fait avancer une course (commander → accepter → démarrer → terminer)
SELECT h.*, c.reference FROM historique_statut_course h JOIN course c ON c.id = h.course_id ORDER BY h.id DESC LIMIT 10;

-- ---------- PROCÉDURES ----------
CALL ps_stats_chauffeur(6, @nb, @gains, @note);
SELECT @nb AS courses_terminees, @gains AS gains_fcfa, @note AS note_moyenne;

CALL ps_chiffre_affaires_periode('2026-11-01', '2026-11-30');
CALL ps_historique_client('690000001');

START TRANSACTION;
  CALL ps_recalculer_note(6);
ROLLBACK;

-- ---------- PRIVILÈGES ----------
SHOW GRANTS FOR 'mboa_backend'@'localhost';
SHOW GRANTS FOR 'mboa_support'@'localhost';
SHOW GRANTS FOR role_support;
SELECT user, host, default_role FROM mysql.user WHERE user LIKE 'mboa%';
-- Pour tester un compte : phpMyAdmin → Déconnexion → se connecter avec mboa_support / Support2026!
--   SELECT * FROM mboa_ride.vue_courses_en_cours;   -- autorisé
--   SELECT * FROM mboa_ride.utilisateur;            -- refusé : « SELECT command denied »
