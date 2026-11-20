-- =====================================================================
--  MboaRide — 1. LES VUES (tables virtuelles)
--  Base : mboa_ride (MariaDB 10.4 / MySQL 8, XAMPP) — à exécuter dans phpMyAdmin (onglet SQL)
--  Une vue ne stocke rien : la requête SELECT est réexécutée à chaque consultation.
-- =====================================================================
USE mboa_ride;

-- 1.1 Simplification : une course avec son client, son chauffeur et son véhicule (évite 3 jointures à chaque fois)
CREATE OR REPLACE VIEW vue_courses_detaillees AS
SELECT c.id                                      AS course_id,
       c.reference,
       c.type_service,
       c.statut,
       CONCAT(cl.prenom, ' ', cl.nom)            AS client,
       CONCAT(ch.prenom, ' ', ch.nom)            AS chauffeur,
       v.immatriculation,
       c.depart_adresse,
       c.arrivee_adresse,
       c.distance_km,
       c.prix_reference,
       COALESCE(c.prix_final, c.prix_propose)    AS prix_convenu,
       COALESCE(c.prix_final, c.prix_propose) - c.reduction AS montant_client,
       c.commission,
       c.gain_chauffeur,
       c.mode_paiement,
       c.statut_paiement,
       c.created_at,
       c.fin_at
FROM course c
JOIN utilisateur cl      ON cl.id = c.client_id
LEFT JOIN utilisateur ch ON ch.id = c.chauffeur_id
LEFT JOIN vehicule v     ON v.id  = c.vehicule_id;

-- 1.2 Sécurité : les utilisateurs SANS mot de passe, jeton de notification ni téléphone complet
CREATE OR REPLACE VIEW vue_utilisateurs_publics AS
SELECT id,
       prenom,
       nom,
       CONCAT(LEFT(telephone, 7), '****', RIGHT(telephone, 2)) AS telephone_masque,
       role,
       statut,
       ROUND(note_moyenne, 2) AS note_moyenne,
       nb_notes,
       date_inscription
FROM utilisateur
WHERE supprime_at IS NULL;

-- 1.3 Classement des chauffeurs : note, nombre de courses terminées, gains et commissions
CREATE OR REPLACE VIEW vue_classement_chauffeurs AS
SELECT u.id                                   AS chauffeur_id,
       CONCAT(u.prenom, ' ', u.nom)           AS chauffeur,
       ch.type_service,
       ROUND(u.note_moyenne, 2)               AS note_moyenne,
       u.nb_notes,
       COUNT(c.id)                            AS courses_terminees,
       COALESCE(SUM(c.gain_chauffeur), 0)     AS gains_fcfa,
       COALESCE(SUM(c.commission), 0)         AS commissions_fcfa
FROM chauffeur ch
JOIN utilisateur u  ON u.id = ch.utilisateur_id
LEFT JOIN course c  ON c.chauffeur_id = u.id AND c.statut = 'TERMINEE'
GROUP BY u.id, u.prenom, u.nom, ch.type_service, u.note_moyenne, u.nb_notes;

-- 1.4 Chiffre d'affaires par jour (tableau de bord du back-office)
CREATE OR REPLACE VIEW vue_chiffre_affaires_journalier AS
SELECT DATE(fin_at)                         AS jour,
       COUNT(*)                             AS nb_courses,
       SUM(COALESCE(prix_final, prix_propose)) AS montant_courses_fcfa,
       SUM(COALESCE(commission, 0))         AS commissions_fcfa,
       SUM(COALESCE(gain_chauffeur, 0))     AS gains_chauffeurs_fcfa
FROM course
WHERE statut = 'TERMINEE'
GROUP BY DATE(fin_at);

-- 1.5 Courses en cours (ce que le support surveille en temps réel)
CREATE OR REPLACE VIEW vue_courses_en_cours AS
SELECT course_id, reference, type_service, statut, client, chauffeur, immatriculation, depart_adresse, arrivee_adresse, created_at
FROM vue_courses_detaillees
WHERE statut IN ('RECHERCHE', 'ACCEPTEE', 'CHAUFFEUR_ARRIVE', 'EN_COURS');

-- Utilisation : comme une table
-- SELECT * FROM vue_courses_detaillees ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM vue_classement_chauffeurs ORDER BY gains_fcfa DESC;
-- Suppression : DROP VIEW IF EXISTS vue_courses_en_cours;
