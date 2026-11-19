-- =====================================================================
--  Mboa Ride — schéma initial (PostgreSQL 15+, converti depuis la version MySQL)
--  Montants en FCFA entiers (BIGINT), coordonnées en DOUBLE PRECISION (WGS84)
-- =====================================================================

CREATE TABLE utilisateur (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  mot_de_passe VARCHAR(255) NULL,
  role VARCHAR(20) NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF',
  genre VARCHAR(1) NULL,
  langue VARCHAR(5) NOT NULL DEFAULT 'fr',
  photo_url VARCHAR(500) NULL,
  push_token VARCHAR(255) NULL,
  note_moyenne DOUBLE PRECISION NOT NULL DEFAULT 0,
  nb_notes INT NOT NULL DEFAULT 0,
  solde BIGINT NOT NULL DEFAULT 0,
  code_parrainage VARCHAR(12) NULL,
  parrain_id BIGINT NULL,
  parrainage_recompense BOOLEAN NOT NULL DEFAULT FALSE,
  consentement_at TIMESTAMP(6) NULL,
  date_inscription TIMESTAMP(6) NOT NULL,
  derniere_connexion TIMESTAMP(6) NULL,
  supprime_at TIMESTAMP(6) NULL,
  CONSTRAINT uk_utilisateur_telephone UNIQUE (telephone),
  CONSTRAINT uk_utilisateur_email UNIQUE (email),
  CONSTRAINT uk_utilisateur_parrainage UNIQUE (code_parrainage),
  CONSTRAINT fk_utilisateur_parrain FOREIGN KEY (parrain_id) REFERENCES utilisateur(id)
);

CREATE INDEX idx_utilisateur_role ON utilisateur(role, statut);

CREATE TABLE contact_confiance (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL,
  nom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  CONSTRAINT fk_contact_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE TABLE lieu_favori (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL,
  libelle VARCHAR(80) NOT NULL,
  type VARCHAR(20) NOT NULL,
  adresse VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  CONSTRAINT fk_lieu_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE TABLE vehicule (
  id BIGSERIAL PRIMARY KEY,
  proprietaire_id BIGINT NOT NULL,
  type_vehicule VARCHAR(10) NOT NULL,
  marque VARCHAR(60) NOT NULL,
  modele VARCHAR(60) NULL,
  couleur VARCHAR(40) NULL,
  immatriculation VARCHAR(20) NOT NULL,
  nb_places INT NOT NULL DEFAULT 4,
  photo_url VARCHAR(500) NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT uk_vehicule_immatriculation UNIQUE (immatriculation),
  CONSTRAINT fk_vehicule_proprietaire FOREIGN KEY (proprietaire_id) REFERENCES utilisateur(id)
);

CREATE TABLE chauffeur (
  utilisateur_id BIGINT PRIMARY KEY,
  vehicule_id BIGINT NULL,
  type_service VARCHAR(10) NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT FALSE,
  mode_ramassage BOOLEAN NOT NULL DEFAULT FALSE,
  places_libres INT NOT NULL DEFAULT 0,
  direction_libelle VARCHAR(150) NULL,
  direction_lat DOUBLE PRECISION NULL,
  direction_lng DOUBLE PRECISION NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  position_at TIMESTAMP(6) NULL,
  casque_disponible BOOLEAN NOT NULL DEFAULT FALSE,
  valide_at TIMESTAMP(6) NULL,
  valide_par BIGINT NULL,
  CONSTRAINT fk_chauffeur_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_chauffeur_vehicule FOREIGN KEY (vehicule_id) REFERENCES vehicule(id)
);

CREATE INDEX idx_chauffeur_dispo ON chauffeur(disponible, type_service);

CREATE TABLE document_chauffeur (
  id BIGSERIAL PRIMARY KEY,
  chauffeur_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  fichier VARCHAR(255) NOT NULL,
  nom_original VARCHAR(255) NULL,
  content_type VARCHAR(100) NULL,
  date_expiration DATE NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
  motif_rejet VARCHAR(255) NULL,
  rappel_envoye BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(6) NOT NULL,
  verifie_at TIMESTAMP(6) NULL,
  CONSTRAINT fk_document_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES chauffeur(utilisateur_id)
);

CREATE TABLE zone (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  ville VARCHAR(60) NOT NULL,
  centre_lat DOUBLE PRECISION NOT NULL,
  centre_lng DOUBLE PRECISION NOT NULL,
  rayon_km DOUBLE PRECISION NOT NULL,
  majoration_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  moto_active BOOLEAN NOT NULL DEFAULT TRUE,
  moto_interdit_debut TIME NULL,
  moto_interdit_fin TIME NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE tarif (
  id BIGSERIAL PRIMARY KEY,
  type_service VARCHAR(12) NOT NULL,
  prise_en_charge BIGINT NOT NULL,
  prix_km BIGINT NOT NULL,
  prix_minute BIGINT NOT NULL,
  prix_minimum BIGINT NOT NULL,
  prix_place BIGINT NOT NULL DEFAULT 0,
  distance_incluse_km DOUBLE PRECISION NOT NULL DEFAULT 0,
  supplement_km BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP(6) NULL,
  CONSTRAINT uk_tarif_type UNIQUE (type_service)
);

CREATE TABLE parametre (
  cle VARCHAR(80) PRIMARY KEY,
  valeur VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP(6) NULL
);

CREATE TABLE repere (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  description VARCHAR(255) NULL,
  categorie VARCHAR(20) NOT NULL,
  ville VARCHAR(60) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'VALIDE',
  propose_par BIGINT NULL,
  nb_utilisations INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_repere_utilisateur FOREIGN KEY (propose_par) REFERENCES utilisateur(id) ON DELETE SET NULL
);

CREATE INDEX idx_repere_statut ON repere(statut, ville);

CREATE TABLE code_promo (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL,
  description VARCHAR(255) NULL,
  type_reduction VARCHAR(15) NOT NULL,
  valeur BIGINT NOT NULL,
  reduction_max BIGINT NULL,
  date_debut TIMESTAMP(6) NULL,
  date_fin TIMESTAMP(6) NULL,
  utilisations_max INT NULL,
  utilisations INT NOT NULL DEFAULT 0,
  une_fois_par_utilisateur BOOLEAN NOT NULL DEFAULT TRUE,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT uk_code_promo UNIQUE (code)
);

CREATE TABLE course (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(20) NOT NULL,
  client_id BIGINT NOT NULL,
  chauffeur_id BIGINT NULL,
  vehicule_id BIGINT NULL,
  type_service VARCHAR(12) NOT NULL,
  statut VARCHAR(20) NOT NULL,
  nb_places INT NOT NULL DEFAULT 1,
  depart_adresse VARCHAR(255) NOT NULL,
  depart_repere VARCHAR(255) NULL,
  depart_lat DOUBLE PRECISION NOT NULL,
  depart_lng DOUBLE PRECISION NOT NULL,
  arrivee_adresse VARCHAR(255) NOT NULL,
  arrivee_lat DOUBLE PRECISION NOT NULL,
  arrivee_lng DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  duree_min DOUBLE PRECISION NOT NULL,
  prix_reference BIGINT NOT NULL,
  prix_min BIGINT NOT NULL,
  prix_max BIGINT NOT NULL,
  prix_propose BIGINT NOT NULL,
  prix_final BIGINT NULL,
  reduction BIGINT NOT NULL DEFAULT 0,
  code_promo_id BIGINT NULL,
  commission BIGINT NULL,
  gain_chauffeur BIGINT NULL,
  majorations VARCHAR(255) NULL,
  mode_paiement VARCHAR(20) NOT NULL,
  statut_paiement VARCHAR(20) NOT NULL DEFAULT 'NON_PAYE',
  mboa_lady BOOLEAN NOT NULL DEFAULT FALSE,
  casque_confirme BOOLEAN NOT NULL DEFAULT FALSE,
  code_verification VARCHAR(4) NOT NULL,
  token_partage VARCHAR(40) NOT NULL,
  zone_id BIGINT NULL,
  tour_negociation INT NOT NULL DEFAULT 1,
  offres_expire_at TIMESTAMP(6) NULL,
  date_planifiee TIMESTAMP(6) NULL,
  created_at TIMESTAMP(6) NOT NULL,
  acceptee_at TIMESTAMP(6) NULL,
  arrive_at TIMESTAMP(6) NULL,
  debut_at TIMESTAMP(6) NULL,
  fin_at TIMESTAMP(6) NULL,
  annulee_at TIMESTAMP(6) NULL,
  annulee_par VARCHAR(12) NULL,
  motif_annulation VARCHAR(255) NULL,
  frais_annulation BIGINT NOT NULL DEFAULT 0,
  anomalie_signalee BOOLEAN NOT NULL DEFAULT FALSE,
  dernier_mouvement_at TIMESTAMP(6) NULL,
  CONSTRAINT uk_course_reference UNIQUE (reference),
  CONSTRAINT uk_course_partage UNIQUE (token_partage),
  CONSTRAINT fk_course_client FOREIGN KEY (client_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_course_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_course_vehicule FOREIGN KEY (vehicule_id) REFERENCES vehicule(id),
  CONSTRAINT fk_course_promo FOREIGN KEY (code_promo_id) REFERENCES code_promo(id),
  CONSTRAINT fk_course_zone FOREIGN KEY (zone_id) REFERENCES zone(id)
);

CREATE INDEX idx_course_statut ON course(statut, type_service);
CREATE INDEX idx_course_client ON course(client_id, created_at);
CREATE INDEX idx_course_chauffeur ON course(chauffeur_id, created_at);
CREATE INDEX idx_course_created ON course(created_at);

CREATE TABLE offre (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL,
  chauffeur_id BIGINT NOT NULL,
  tour INT NOT NULL,
  prix BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  statut VARCHAR(15) NOT NULL,
  distance_prise_en_charge_km DOUBLE PRECISION NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT uk_offre_tour UNIQUE (course_id, chauffeur_id, tour),
  CONSTRAINT fk_offre_course FOREIGN KEY (course_id) REFERENCES course(id),
  CONSTRAINT fk_offre_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES utilisateur(id)
);

CREATE TABLE course_ignoree (
  course_id BIGINT NOT NULL,
  chauffeur_id BIGINT NOT NULL,
  PRIMARY KEY (course_id, chauffeur_id),
  CONSTRAINT fk_ignoree_course FOREIGN KEY (course_id) REFERENCES course(id),
  CONSTRAINT fk_ignoree_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES utilisateur(id)
);

CREATE TABLE course_position (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_position_course FOREIGN KEY (course_id) REFERENCES course(id)
);

CREATE INDEX idx_position_course ON course_position(course_id, created_at);

CREATE TABLE paiement (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NULL,
  utilisateur_id BIGINT NOT NULL,
  type VARCHAR(15) NOT NULL,
  montant BIGINT NOT NULL,
  mode VARCHAR(20) NOT NULL,
  fournisseur VARCHAR(15) NOT NULL,
  reference VARCHAR(60) NOT NULL,
  reference_externe VARCHAR(100) NULL,
  telephone VARCHAR(20) NULL,
  statut VARCHAR(15) NOT NULL,
  payment_url VARCHAR(500) NULL,
  message VARCHAR(255) NULL,
  created_at TIMESTAMP(6) NOT NULL,
  updated_at TIMESTAMP(6) NULL,
  CONSTRAINT uk_paiement_reference UNIQUE (reference),
  CONSTRAINT fk_paiement_course FOREIGN KEY (course_id) REFERENCES course(id),
  CONSTRAINT fk_paiement_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id)
);

CREATE INDEX idx_paiement_statut ON paiement(statut, created_at);

CREATE TABLE transaction_portefeuille (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL,
  type VARCHAR(25) NOT NULL,
  montant BIGINT NOT NULL,
  solde_apres BIGINT NOT NULL,
  course_id BIGINT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_transaction_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_transaction_course FOREIGN KEY (course_id) REFERENCES course(id)
);

CREATE INDEX idx_transaction_utilisateur ON transaction_portefeuille(utilisateur_id, created_at);

CREATE TABLE retrait (
  id BIGSERIAL PRIMARY KEY,
  chauffeur_id BIGINT NOT NULL,
  montant BIGINT NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  operateur VARCHAR(20) NOT NULL,
  fournisseur VARCHAR(15) NULL,
  statut VARCHAR(15) NOT NULL,
  reference VARCHAR(60) NOT NULL,
  reference_externe VARCHAR(100) NULL,
  message VARCHAR(255) NULL,
  traite_par BIGINT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  traite_at TIMESTAMP(6) NULL,
  CONSTRAINT uk_retrait_reference UNIQUE (reference),
  CONSTRAINT fk_retrait_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES utilisateur(id)
);

CREATE TABLE notation (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL,
  auteur_id BIGINT NOT NULL,
  cible_id BIGINT NOT NULL,
  note INT NOT NULL,
  commentaire VARCHAR(500) NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT uk_notation UNIQUE (course_id, auteur_id),
  CONSTRAINT fk_notation_course FOREIGN KEY (course_id) REFERENCES course(id),
  CONSTRAINT fk_notation_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_notation_cible FOREIGN KEY (cible_id) REFERENCES utilisateur(id)
);

CREATE TABLE reclamation (
  id BIGSERIAL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL,
  course_id BIGINT NULL,
  auteur_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  statut VARCHAR(15) NOT NULL,
  reponse TEXT NULL,
  traite_par BIGINT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  updated_at TIMESTAMP(6) NULL,
  CONSTRAINT uk_reclamation_numero UNIQUE (numero),
  CONSTRAINT fk_reclamation_course FOREIGN KEY (course_id) REFERENCES course(id),
  CONSTRAINT fk_reclamation_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateur(id)
);

CREATE TABLE alerte_sos (
  id BIGSERIAL PRIMARY KEY,
  declencheur_id BIGINT NULL,
  course_id BIGINT NULL,
  type VARCHAR(25) NOT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  statut VARCHAR(15) NOT NULL,
  notes TEXT NULL,
  traite_par BIGINT NULL,
  contacts_notifies INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(6) NOT NULL,
  resolue_at TIMESTAMP(6) NULL,
  CONSTRAINT fk_sos_declencheur FOREIGN KEY (declencheur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_sos_course FOREIGN KEY (course_id) REFERENCES course(id)
);

CREATE INDEX idx_sos_statut ON alerte_sos(statut, created_at);

CREATE TABLE message (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL,
  expediteur_id BIGINT NOT NULL,
  contenu VARCHAR(1000) NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_message_course FOREIGN KEY (course_id) REFERENCES course(id),
  CONSTRAINT fk_message_expediteur FOREIGN KEY (expediteur_id) REFERENCES utilisateur(id)
);

CREATE INDEX idx_message_course ON message(course_id, created_at);

CREATE TABLE notification (
  id BIGSERIAL PRIMARY KEY,
  utilisateur_id BIGINT NOT NULL,
  titre VARCHAR(150) NOT NULL,
  corps VARCHAR(500) NOT NULL,
  type VARCHAR(30) NOT NULL,
  canal VARCHAR(10) NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  course_id BIGINT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_notification_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id)
);

CREATE INDEX idx_notification_utilisateur ON notification(utilisateur_id, created_at);

CREATE TABLE campagne_notification (
  id BIGSERIAL PRIMARY KEY,
  titre VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  cible VARCHAR(15) NOT NULL,
  avec_sms BOOLEAN NOT NULL DEFAULT FALSE,
  nb_destinataires INT NOT NULL DEFAULT 0,
  envoye_par BIGINT NULL,
  created_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE utilisation_promo (
  id BIGSERIAL PRIMARY KEY,
  code_promo_id BIGINT NOT NULL,
  utilisateur_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  CONSTRAINT fk_utilisation_promo FOREIGN KEY (code_promo_id) REFERENCES code_promo(id),
  CONSTRAINT fk_utilisation_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_utilisation_course FOREIGN KEY (course_id) REFERENCES course(id)
);

CREATE TABLE otp_code (
  id BIGSERIAL PRIMARY KEY,
  telephone VARCHAR(20) NOT NULL,
  code_hash VARCHAR(100) NOT NULL,
  expire_at TIMESTAMP(6) NOT NULL,
  tentatives INT NOT NULL DEFAULT 0,
  utilise BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_otp_telephone ON otp_code(telephone, created_at);

CREATE TABLE journal_admin (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT NULL,
  admin_nom VARCHAR(200) NULL,
  action VARCHAR(60) NOT NULL,
  cible_type VARCHAR(40) NULL,
  cible_id BIGINT NULL,
  details TEXT NULL,
  ip VARCHAR(60) NULL,
  created_at TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_journal_created ON journal_admin(created_at);

-- =====================================================================
--  Données de référence
-- =====================================================================

-- Tarifs de base (FCFA) — modifiables dans le back-office (BF-25)
INSERT INTO tarif (type_service, prise_en_charge, prix_km, prix_minute, prix_minimum, prix_place, distance_incluse_km, supplement_km, updated_at) VALUES
 ('DEPOT',     500, 250, 25, 1500,   0, 0, 0,  NOW()),
 ('RAMASSAGE',   0,   0,  0,  350, 350, 6, 50, NOW()),
 ('MOTO',      150, 100, 10,  300,   0, 0, 0,  NOW());

INSERT INTO parametre (cle, valeur, description, updated_at) VALUES
 ('negociation.alpha', '0.15', 'Coefficient α : baisse maximale autorisée (15 %)', NOW()),
 ('negociation.beta', '0.30', 'Coefficient β : hausse maximale autorisée (30 %)', NOW()),
 ('negociation.delai_secondes', '60', 'Délai de choix des offres par le client (secondes)', NOW()),
 ('negociation.max_relances', '3', 'Nombre de relances au prix de référence avant expiration', NOW()),
 ('commission.pourcentage', '15', 'Commission plateforme sur les courses dépôt et moto (%)', NOW()),
 ('commission.ramassage_frais_fixe', '25', 'Frais fixes par place réservée en ramassage (FCFA)', NOW()),
 ('majoration.nuit_pct', '20', 'Majoration de nuit (%)', NOW()),
 ('majoration.nuit_debut', '22:00', 'Début de la plage de nuit', NOW()),
 ('majoration.nuit_fin', '05:30', 'Fin de la plage de nuit', NOW()),
 ('majoration.pointe_pct', '15', 'Majoration aux heures de pointe (%)', NOW()),
 ('majoration.pointe_plages', '06:30-08:30,16:30-19:30', 'Plages des heures de pointe', NOW()),
 ('majoration.pluie_pct', '10', 'Majoration en cas de pluie (%)', NOW()),
 ('meteo.auto', 'true', 'Détection automatique de la pluie (Open-Meteo)', NOW()),
 ('meteo.pluie_manuelle', 'false', 'Forcer la majoration pluie', NOW()),
 ('surge.actif', 'true', 'Majoration selon le rapport demande / offre', NOW()),
 ('surge.pas_pct', '10', 'Majoration par unité de déséquilibre demande/offre (%)', NOW()),
 ('surge.max_pct', '50', 'Majoration demande/offre maximale (%)', NOW()),
 ('annulation.delai_gratuit_min', '3', 'Délai d''annulation gratuite après acceptation (minutes)', NOW()),
 ('annulation.frais', '500', 'Frais d''annulation au-delà du délai (FCFA)', NOW()),
 ('notation.seuil_suspension', '3.0', 'Note moyenne en dessous de laquelle un chauffeur est suspendu', NOW()),
 ('notation.min_notes', '5', 'Nombre minimal de notes avant suspension automatique', NOW()),
 ('recherche.rayon_km', '5', 'Rayon de recherche des chauffeurs (km)', NOW()),
 ('ramassage.angle_max', '45', 'Écart de direction maximal en ramassage (degrés)', NOW()),
 ('chauffeur.solde_minimum', '-5000', 'Solde minimal du portefeuille chauffeur pour être disponible (FCFA)', NOW()),
 ('anomalie.arret_minutes', '10', 'Durée d''arrêt prolongé déclenchant une alerte (minutes)', NOW()),
 ('anomalie.deviation_km', '2', 'Allongement toléré du trajet avant alerte de déviation (km)', NOW()),
 ('paiement.fournisseur', 'SIMULATION', 'Agrégateur Mobile Money actif : MONETBIL, CAMPAY ou SIMULATION', NOW()),
 ('parrainage.bonus_parrain', '500', 'Bonus crédité au parrain après la 1re course du filleul (FCFA)', NOW()),
 ('parrainage.reduction_filleul', '500', 'Réduction sur la 1re course du filleul (FCFA)', NOW()),
 ('course.planification_avance_min', '15', 'Minutes avant l''heure prévue où une course planifiée est lancée', NOW()),
 ('moto.distance_recommandee_km', '5', 'Distance en dessous de laquelle la moto est recommandée (km)', NOW()),
 ('documents.rappel_jours', '15', 'Rappel avant expiration des documents (jours)', NOW()),
 ('donnees.conservation_positions_jours', '90', 'Durée de conservation des traces GPS (jours)', NOW());

-- Zones de service des villes pilotes (BF-60)
INSERT INTO zone (nom, ville, centre_lat, centre_lng, rayon_km, majoration_pct, moto_active, moto_interdit_debut, moto_interdit_fin, active) VALUES
 ('Yaoundé centre', 'Yaoundé', 3.8667, 11.5167, 4, 0, FALSE, NULL, NULL, TRUE),
 ('Yaoundé', 'Yaoundé', 3.8480, 11.5021, 15, 0, TRUE, '22:00:00', '05:00:00', TRUE),
 ('Aéroport de Nsimalen', 'Yaoundé', 3.7226, 11.5533, 3, 15, TRUE, NULL, NULL, TRUE),
 ('Douala', 'Douala', 4.0511, 9.7679, 18, 0, TRUE, NULL, NULL, TRUE),
 ('Aéroport de Douala', 'Douala', 4.0061, 9.7195, 2.5, 15, TRUE, NULL, NULL, TRUE);

-- Repères populaires validés (BF-34)
INSERT INTO repere (nom, description, categorie, ville, latitude, longitude, statut, created_at) VALUES
 ('Carrefour Bastos', 'Rond-point de Bastos', 'CARREFOUR', 'Yaoundé', 3.8960, 11.5090, 'VALIDE', NOW()),
 ('Poste Centrale', 'Place de la Poste centrale', 'CARREFOUR', 'Yaoundé', 3.8667, 11.5167, 'VALIDE', NOW()),
 ('Carrefour Warda', NULL, 'CARREFOUR', 'Yaoundé', 3.8717, 11.5139, 'VALIDE', NOW()),
 ('Carrefour Mvan', NULL, 'CARREFOUR', 'Yaoundé', 3.8247, 11.5194, 'VALIDE', NOW()),
 ('Carrefour Biyem-Assi', NULL, 'CARREFOUR', 'Yaoundé', 3.8380, 11.4860, 'VALIDE', NOW()),
 ('Carrefour Emana', NULL, 'CARREFOUR', 'Yaoundé', 3.9150, 11.5210, 'VALIDE', NOW()),
 ('Carrefour Obili', NULL, 'CARREFOUR', 'Yaoundé', 3.8590, 11.4980, 'VALIDE', NOW()),
 ('Carrefour Essos', NULL, 'CARREFOUR', 'Yaoundé', 3.8740, 11.5350, 'VALIDE', NOW()),
 ('Marché Mokolo', NULL, 'MARCHE', 'Yaoundé', 3.8770, 11.5010, 'VALIDE', NOW()),
 ('Marché Central', NULL, 'MARCHE', 'Yaoundé', 3.8650, 11.5180, 'VALIDE', NOW()),
 ('Marché Mfoundi', NULL, 'MARCHE', 'Yaoundé', 3.8610, 11.5250, 'VALIDE', NOW()),
 ('Université de Yaoundé I', 'Campus de Ngoa-Ekellé', 'ECOLE', 'Yaoundé', 3.8590, 11.4990, 'VALIDE', NOW()),
 ('École Polytechnique', 'ENSP Yaoundé', 'ECOLE', 'Yaoundé', 3.8630, 11.4980, 'VALIDE', NOW()),
 ('Cathédrale Notre-Dame des Victoires', NULL, 'EGLISE', 'Yaoundé', 3.8650, 11.5150, 'VALIDE', NOW()),
 ('Basilique Marie-Reine-des-Apôtres', 'Mvolyé', 'EGLISE', 'Yaoundé', 3.8440, 11.5030, 'VALIDE', NOW()),
 ('Hôpital Central', NULL, 'HOPITAL', 'Yaoundé', 3.8730, 11.5090, 'VALIDE', NOW()),
 ('Stade Ahmadou Ahidjo', 'Mfandena', 'AUTRE', 'Yaoundé', 3.8850, 11.5390, 'VALIDE', NOW()),
 ('Gare voyageurs de Yaoundé', NULL, 'GARE', 'Yaoundé', 3.8690, 11.5240, 'VALIDE', NOW()),
 ('Aéroport international de Nsimalen', NULL, 'GARE', 'Yaoundé', 3.7226, 11.5533, 'VALIDE', NOW()),
 ('Rond-point Deido', NULL, 'CARREFOUR', 'Douala', 4.0640, 9.7090, 'VALIDE', NOW()),
 ('Carrefour Ndokoti', NULL, 'CARREFOUR', 'Douala', 4.0470, 9.7400, 'VALIDE', NOW()),
 ('Akwa — Boulevard de la Liberté', NULL, 'CARREFOUR', 'Douala', 4.0480, 9.6980, 'VALIDE', NOW()),
 ('Marché Sandaga', NULL, 'MARCHE', 'Douala', 4.0520, 9.7010, 'VALIDE', NOW()),
 ('Marché Central de Douala', NULL, 'MARCHE', 'Douala', 4.0490, 9.7050, 'VALIDE', NOW()),
 ('Université de Douala', 'Campus de Ndong-Bong', 'ECOLE', 'Douala', 4.0560, 9.7330, 'VALIDE', NOW()),
 ('Cathédrale Saints-Pierre-et-Paul', 'Bonadibong', 'EGLISE', 'Douala', 4.0410, 9.6960, 'VALIDE', NOW()),
 ('Hôpital Laquintinie', NULL, 'HOPITAL', 'Douala', 4.0560, 9.7040, 'VALIDE', NOW()),
 ('Aéroport international de Douala', NULL, 'GARE', 'Douala', 4.0061, 9.7195, 'VALIDE', NOW());
