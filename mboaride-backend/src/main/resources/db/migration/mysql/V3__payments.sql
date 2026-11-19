CREATE TABLE IF NOT EXISTS paiement (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reservation_id BIGINT NOT NULL,
  montant DOUBLE NOT NULL,
  devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
  payment_ref VARCHAR(100) NOT NULL UNIQUE,
  monetbil_transaction_id VARCHAR(100),
  operateur VARCHAR(50),
  statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
  payment_url TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_paiement_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_paiement_reservation ON paiement(reservation_id);
