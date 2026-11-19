package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface PaiementRepository extends JpaRepository<Paiement, Long> {
  Optional<Paiement> findByReference(String reference);
  Optional<Paiement> findByReferenceExterne(String referenceExterne);
  Optional<Paiement> findTopByCourseIdOrderByCreatedAtDesc(Long courseId);
  List<Paiement> findByStatutAndCreatedAtBefore(StatutPaiement statut, LocalDateTime avant);
  Page<Paiement> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
