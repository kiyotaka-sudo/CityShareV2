CREATE TABLE utilisateur (
  id BIGSERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  dtype VARCHAR(31) NOT NULL,
  photo_url TEXT,
  note_moyenne DOUBLE PRECISION DEFAULT 0.0,
  statut VARCHAR(20) DEFAULT 'ACTIF',
  date_inscription TIMESTAMP DEFAULT NOW(),
  fcm_token VARCHAR(500),
  preferred_lang VARCHAR(5) DEFAULT 'fr'
);

CREATE TABLE conducteur (
  id BIGINT PRIMARY KEY REFERENCES utilisateur(id),
  permis_conduire VARCHAR(100),
  carte_grise VARCHAR(100),
  vehicule_marque VARCHAR(100),
  vehicule_immatriculation VARCHAR(50),
  vehicule_photo_url VARCHAR(500),
  verifie BOOLEAN DEFAULT FALSE
);

CREATE TABLE passager (
  id BIGINT PRIMARY KEY REFERENCES utilisateur(id),
  contact_urgence_nom VARCHAR(100),
  contact_urgence_tel VARCHAR(20)
);

CREATE TABLE expediteur (
  id BIGINT PRIMARY KEY REFERENCES utilisateur(id),
  type_expediteur VARCHAR(50),
  raison_sociale VARCHAR(200)
);

CREATE TABLE trajet (
  id BIGSERIAL PRIMARY KEY,
  conducteur_id BIGINT NOT NULL REFERENCES conducteur(id),
  ville_depart VARCHAR(100) NOT NULL,
  ville_arrivee VARCHAR(100) NOT NULL,
  lat_depart DOUBLE PRECISION,
  lng_depart DOUBLE PRECISION,
  lat_arrivee DOUBLE PRECISION,
  lng_arrivee DOUBLE PRECISION,
  date_heure TIMESTAMP NOT NULL,
  nb_places_total INTEGER NOT NULL,
  nb_places_dispo INTEGER NOT NULL,
  prix_par_place DOUBLE PRECISION NOT NULL,
  accepte_colis BOOLEAN DEFAULT FALSE,
  autorise_arrets BOOLEAN DEFAULT FALSE,
  statut VARCHAR(20) DEFAULT 'ACTIF',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE arret_intermediaire (
  id BIGSERIAL PRIMARY KEY,
  trajet_id BIGINT NOT NULL REFERENCES trajet(id),
  ville VARCHAR(100) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ordre INTEGER NOT NULL,
  heure_passage TIME
);

CREATE TABLE reservation (
  id BIGSERIAL PRIMARY KEY,
  trajet_id BIGINT NOT NULL REFERENCES trajet(id),
  passager_id BIGINT NOT NULL REFERENCES passager(id),
  nb_places INTEGER NOT NULL DEFAULT 1,
  prix_total DOUBLE PRECISION NOT NULL,
  statut VARCHAR(30) DEFAULT 'EN_ATTENTE',
  date_reservation TIMESTAMP DEFAULT NOW(),
  qr_code_token VARCHAR(255) UNIQUE NOT NULL,
  qr_code_scanne BOOLEAN DEFAULT FALSE,
  arrivee_confirmee BOOLEAN DEFAULT FALSE,
  dead_man_switch_deadline TIMESTAMP
);

CREATE TABLE colis (
  id BIGSERIAL PRIMARY KEY,
  expediteur_id BIGINT NOT NULL REFERENCES expediteur(id),
  conducteur_id BIGINT REFERENCES conducteur(id),
  trajet_id BIGINT REFERENCES trajet(id),
  description TEXT NOT NULL,
  poids VARCHAR(20) NOT NULL,
  ville_depart VARCHAR(100) NOT NULL,
  ville_arrivee VARCHAR(100) NOT NULL,
  lat_depart DOUBLE PRECISION,
  lng_depart DOUBLE PRECISION,
  lat_arrivee DOUBLE PRECISION,
  lng_arrivee DOUBLE PRECISION,
  prix_livraison DOUBLE PRECISION,
  statut VARCHAR(30) DEFAULT 'EN_ATTENTE',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notation (
  id BIGSERIAL PRIMARY KEY,
  noteur_id BIGINT NOT NULL REFERENCES utilisateur(id),
  note_id BIGINT NOT NULL REFERENCES utilisateur(id),
  reservation_id BIGINT REFERENCES reservation(id),
  colis_id BIGINT REFERENCES colis(id),
  note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  criteres JSONB,
  date_notation TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alerte_sos (
  id BIGSERIAL PRIMARY KEY,
  declencheur_id BIGINT NOT NULL REFERENCES utilisateur(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  adresse_approx VARCHAR(300),
  contact_notifie BOOLEAN DEFAULT FALSE,
  date_alerte TIMESTAMP DEFAULT NOW(),
  type VARCHAR(50)
);

CREATE TABLE message (
  id BIGSERIAL PRIMARY KEY,
  expediteur_id BIGINT NOT NULL REFERENCES utilisateur(id),
  destinataire_id BIGINT NOT NULL REFERENCES utilisateur(id),
  contenu TEXT NOT NULL,
  date_envoi TIMESTAMP DEFAULT NOW(),
  lu BOOLEAN DEFAULT FALSE,
  conversation_id VARCHAR(100) NOT NULL
);

CREATE INDEX idx_trajet_depart_arrivee ON trajet(ville_depart, ville_arrivee);
CREATE INDEX idx_trajet_date ON trajet(date_heure);
CREATE INDEX idx_reservation_passager ON reservation(passager_id);
CREATE INDEX idx_reservation_trajet ON reservation(trajet_id);
CREATE INDEX idx_message_conversation ON message(conversation_id);
