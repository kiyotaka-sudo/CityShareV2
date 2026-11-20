-- =====================================================================
--  MboaRide — 2. LES DÉCLENCHEURS (TRIGGERS)
--  Exécutés automatiquement par MariaDB lors d'un INSERT / UPDATE / DELETE.
--  OLD = valeurs avant la modification, NEW = valeurs après.
-- =====================================================================
USE mboa_ride;

-- Tables d'audit remplies uniquement par les déclencheurs
CREATE TABLE IF NOT EXISTS historique_statut_course (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT NOT NULL,
  ancien_statut VARCHAR(20) NULL,
  nouveau_statut VARCHAR(20) NOT NULL,
  date_changement DATETIME(6) NOT NULL,
  CONSTRAINT fk_histo_statut_course FOREIGN KEY (course_id) REFERENCES course(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS historique_solde (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL,
  ancien_solde BIGINT NOT NULL,
  nouveau_solde BIGINT NOT NULL,
  variation BIGINT NOT NULL,
  date_modification DATETIME(6) NOT NULL,
  CONSTRAINT fk_histo_solde_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TRIGGER IF EXISTS trg_notation_verif_note;
DROP TRIGGER IF EXISTS trg_course_historique_creation;
DROP TRIGGER IF EXISTS trg_course_historique_statut;
DROP TRIGGER IF EXISTS trg_utilisateur_historique_solde;

DELIMITER //

-- 2.1 Contrôle d'intégrité (BEFORE INSERT) : une note doit être comprise entre 1 et 5 étoiles
CREATE TRIGGER trg_notation_verif_note
BEFORE INSERT ON notation
FOR EACH ROW
BEGIN
  IF NEW.note < 1 OR NEW.note > 5 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Erreur : une note doit etre comprise entre 1 et 5.';
  END IF;
END //

-- 2.2 Audit (AFTER INSERT) : chaque nouvelle course est journalisée avec son premier statut
CREATE TRIGGER trg_course_historique_creation
AFTER INSERT ON course
FOR EACH ROW
BEGIN
  INSERT INTO historique_statut_course (course_id, ancien_statut, nouveau_statut, date_changement)
  VALUES (NEW.id, NULL, NEW.statut, NOW(6));
END //

-- 2.3 Audit (AFTER UPDATE) : chaque changement de statut d'une course (RECHERCHE -> ACCEPTEE -> EN_COURS -> TERMINEE)
CREATE TRIGGER trg_course_historique_statut
AFTER UPDATE ON course
FOR EACH ROW
BEGIN
  IF NOT (OLD.statut <=> NEW.statut) THEN
    INSERT INTO historique_statut_course (course_id, ancien_statut, nouveau_statut, date_changement)
    VALUES (NEW.id, OLD.statut, NEW.statut, NOW(6));
  END IF;
END //

-- 2.4 Audit (AFTER UPDATE) : toute variation du solde du portefeuille (recharge, paiement, commission, retrait)
CREATE TRIGGER trg_utilisateur_historique_solde
AFTER UPDATE ON utilisateur
FOR EACH ROW
BEGIN
  IF OLD.solde <> NEW.solde THEN
    INSERT INTO historique_solde (utilisateur_id, ancien_solde, nouveau_solde, variation, date_modification)
    VALUES (NEW.id, OLD.solde, NEW.solde, NEW.solde - OLD.solde, NOW(6));
  END IF;
END //

DELIMITER ;

-- Vérification : SHOW TRIGGERS FROM mboa_ride;
