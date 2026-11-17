package cm.cityshare.repository;

import cm.cityshare.entity.Paiement;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaiementRepository extends JpaRepository<Paiement, Long> {
  Optional<Paiement> findByPaymentRef(String paymentRef);
  Optional<Paiement> findTopByReservationIdOrderByCreatedAtDesc(Long reservationId);
}
