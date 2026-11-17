CREATE TABLE IF NOT EXISTS paiement (
  id BIGSERIAL PRIMARY KEY,
  reservation_id BIGINT NOT NULL REFERENCES reservation(id),
  montant DOUBLE PRECISION NOT NULL,
  devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
  payment_ref VARCHAR(100) NOT NULL UNIQUE,
  monetbil_transaction_id VARCHAR(100),
  operateur VARCHAR(50),
  statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  payment_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_paiement_reservation ON paiement(reservation_id);
