-- Schéma initial MboaRide — version MySQL / MariaDB

CREATE TABLE utilisateur (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  dtype VARCHAR(31) NOT NULL,
  photo_url TEXT,
  note_moyenne DOUBLE DEFAULT 0.0,
  statut VARCHAR(20) DEFAULT 'ACTIF',
  date_inscription DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  fcm_token VARCHAR(500),
  preferred_lang VARCHAR(5) DEFAULT 'fr'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE conducteur (
  id BIGINT PRIMARY KEY,
  permis_conduire VARCHAR(100),
  carte_grise VARCHAR(100),
  vehicule_marque VARCHAR(100),
  vehicule_immatriculation VARCHAR(50),
  vehicule_photo_url VARCHAR(500),
  verifie BIT(1) DEFAULT 0,
  CONSTRAINT fk_conducteur_utilisateur FOREIGN KEY (id) REFERENCES utilisateur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE passager (
  id BIGINT PRIMARY KEY,
  contact_urgence_nom VARCHAR(100),
  contact_urgence_tel VARCHAR(20),
  CONSTRAINT fk_passager_utilisateur FOREIGN KEY (id) REFERENCES utilisateur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE expediteur (
  id BIGINT PRIMARY KEY,
  type_expediteur VARCHAR(50),
  raison_sociale VARCHAR(200),
  CONSTRAINT fk_expediteur_utilisateur FOREIGN KEY (id) REFERENCES utilisateur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE trajet (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conducteur_id BIGINT NOT NULL,
  ville_depart VARCHAR(100) NOT NULL,
  ville_arrivee VARCHAR(100) NOT NULL,
  lat_depart DOUBLE,
  lng_depart DOUBLE,
  lat_arrivee DOUBLE,
  lng_arrivee DOUBLE,
  date_heure DATETIME(6) NOT NULL,
  nb_places_total INT NOT NULL,
  nb_places_dispo INT NOT NULL,
  prix_par_place DOUBLE NOT NULL,
  accepte_colis BIT(1) DEFAULT 0,
  autorise_arrets BIT(1) DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'ACTIF',
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_trajet_conducteur FOREIGN KEY (conducteur_id) REFERENCES conducteur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE arret_intermediaire (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trajet_id BIGINT NOT NULL,
  ville VARCHAR(100) NOT NULL,
  latitude DOUBLE,
  longitude DOUBLE,
  ordre INT NOT NULL,
  heure_passage TIME,
  CONSTRAINT fk_arret_trajet FOREIGN KEY (trajet_id) REFERENCES trajet(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reservation (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trajet_id BIGINT NOT NULL,
  passager_id BIGINT NOT NULL,
  nb_places INT NOT NULL DEFAULT 1,
  prix_total DOUBLE NOT NULL,
  statut VARCHAR(30) DEFAULT 'EN_ATTENTE',
  date_reservation DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  qr_code_token VARCHAR(255) NOT NULL UNIQUE,
  qr_code_scanne BIT(1) DEFAULT 0,
  arrivee_confirmee BIT(1) DEFAULT 0,
  dead_man_switch_deadline DATETIME(6),
  CONSTRAINT fk_reservation_trajet FOREIGN KEY (trajet_id) REFERENCES trajet(id),
  CONSTRAINT fk_reservation_passager FOREIGN KEY (passager_id) REFERENCES passager(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE colis (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  expediteur_id BIGINT NOT NULL,
  conducteur_id BIGINT,
  trajet_id BIGINT,
  description TEXT NOT NULL,
  poids VARCHAR(20) NOT NULL,
  ville_depart VARCHAR(100) NOT NULL,
  ville_arrivee VARCHAR(100) NOT NULL,
  lat_depart DOUBLE,
  lng_depart DOUBLE,
  lat_arrivee DOUBLE,
  lng_arrivee DOUBLE,
  prix_livraison DOUBLE,
  statut VARCHAR(30) DEFAULT 'EN_ATTENTE',
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_colis_expediteur FOREIGN KEY (expediteur_id) REFERENCES expediteur(id),
  CONSTRAINT fk_colis_conducteur FOREIGN KEY (conducteur_id) REFERENCES conducteur(id),
  CONSTRAINT fk_colis_trajet FOREIGN KEY (trajet_id) REFERENCES trajet(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notation (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  noteur_id BIGINT NOT NULL,
  note_id BIGINT NOT NULL,
  reservation_id BIGINT,
  colis_id BIGINT,
  note INT NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  criteres JSON,
  date_notation DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_notation_noteur FOREIGN KEY (noteur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_notation_note FOREIGN KEY (note_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_notation_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id),
  CONSTRAINT fk_notation_colis FOREIGN KEY (colis_id) REFERENCES colis(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE alerte_sos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  declencheur_id BIGINT NOT NULL,
  latitude DOUBLE,
  longitude DOUBLE,
  adresse_approx VARCHAR(300),
  contact_notifie BIT(1) DEFAULT 0,
  date_alerte DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  type VARCHAR(50),
  CONSTRAINT fk_sos_utilisateur FOREIGN KEY (declencheur_id) REFERENCES utilisateur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE message (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  expediteur_id BIGINT NOT NULL,
  destinataire_id BIGINT NOT NULL,
  contenu TEXT NOT NULL,
  date_envoi DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  lu BIT(1) DEFAULT 0,
  conversation_id VARCHAR(100) NOT NULL,
  CONSTRAINT fk_message_expediteur FOREIGN KEY (expediteur_id) REFERENCES utilisateur(id),
  CONSTRAINT fk_message_destinataire FOREIGN KEY (destinataire_id) REFERENCES utilisateur(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_trajet_depart_arrivee ON trajet(ville_depart, ville_arrivee);
CREATE INDEX idx_trajet_date ON trajet(date_heure);
CREATE INDEX idx_reservation_passager ON reservation(passager_id);
CREATE INDEX idx_reservation_trajet ON reservation(trajet_id);
CREATE INDEX idx_message_conversation ON message(conversation_id);
