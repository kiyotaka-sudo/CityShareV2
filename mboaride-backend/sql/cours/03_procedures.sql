-- =====================================================================
--  MboaRide — 3. LES PROCÉDURES STOCKÉES
--  Code SQL précompilé et stocké dans le serveur, appelé avec CALL. Paramètres IN, OUT, INOUT.
-- =====================================================================
USE mboa_ride;

DROP PROCEDURE IF EXISTS ps_stats_chauffeur;
DROP PROCEDURE IF EXISTS ps_recalculer_note;
DROP PROCEDURE IF EXISTS ps_chiffre_affaires_periode;
DROP PROCEDURE IF EXISTS ps_historique_client;

DELIMITER //

-- 3.1 Paramètres IN et OUT : statistiques d'un chauffeur
CREATE PROCEDURE ps_stats_chauffeur(
  IN  p_chauffeur_id BIGINT,
  OUT p_nb_courses   INT,
  OUT p_gains        BIGINT,
  OUT p_note         DECIMAL(3,2)
)
BEGIN
  SELECT COUNT(*), COALESCE(SUM(gain_chauffeur), 0)
    INTO p_nb_courses, p_gains
  FROM course
  WHERE chauffeur_id = p_chauffeur_id AND statut = 'TERMINEE';

  SELECT note_moyenne INTO p_note FROM utilisateur WHERE id = p_chauffeur_id;
END //

-- 3.2 Mise à jour : recalcule la note moyenne d'un utilisateur à partir de la table notation
CREATE PROCEDURE ps_recalculer_note(IN p_utilisateur_id BIGINT)
BEGIN
  DECLARE v_moyenne DOUBLE;
  DECLARE v_nombre INT;

  SELECT AVG(note), COUNT(*) INTO v_moyenne, v_nombre
  FROM notation
  WHERE cible_id = p_utilisateur_id;

  UPDATE utilisateur
  SET note_moyenne = ROUND(COALESCE(v_moyenne, 0), 2),
      nb_notes     = v_nombre
  WHERE id = p_utilisateur_id;

  SELECT id, prenom, note_moyenne, nb_notes FROM utilisateur WHERE id = p_utilisateur_id;
END //

-- 3.3 Rapport avec structure de contrôle (IF) : chiffre d'affaires par service sur une période
CREATE PROCEDURE ps_chiffre_affaires_periode(IN p_debut DATE, IN p_fin DATE)
BEGIN
  IF p_fin < p_debut THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Erreur : la date de fin precede la date de debut.';
  END IF;

  SELECT type_service,
         COUNT(*)                                 AS nb_courses,
         SUM(COALESCE(prix_final, prix_propose))  AS montant_fcfa,
         SUM(COALESCE(commission, 0))             AS commission_mboaride_fcfa
  FROM course
  WHERE statut = 'TERMINEE'
    AND DATE(fin_at) BETWEEN p_debut AND p_fin
  GROUP BY type_service
  ORDER BY montant_fcfa DESC;
END //

-- 3.4 Recherche : historique des courses d'un client à partir de son numéro de téléphone
CREATE PROCEDURE ps_historique_client(IN p_telephone VARCHAR(20))
BEGIN
  SELECT v.reference, v.statut, v.depart_adresse, v.arrivee_adresse, v.montant_client, v.created_at
  FROM vue_courses_detaillees v
  JOIN course c ON c.id = v.course_id
  JOIN utilisateur u ON u.id = c.client_id
  WHERE u.telephone LIKE CONCAT('%', p_telephone)
  ORDER BY v.created_at DESC;
END //

DELIMITER ;

-- Appels :
-- CALL ps_stats_chauffeur(6, @nb, @gains, @note);  SELECT @nb AS courses, @gains AS gains, @note AS note;
-- CALL ps_recalculer_note(6);
-- CALL ps_chiffre_affaires_periode('2026-11-01', '2026-11-30');
-- CALL ps_historique_client('690000001');
