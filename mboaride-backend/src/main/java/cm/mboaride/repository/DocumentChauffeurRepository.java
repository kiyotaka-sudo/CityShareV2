package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface DocumentChauffeurRepository extends JpaRepository<DocumentChauffeur, Long> {
  List<DocumentChauffeur> findByChauffeurIdOrderByCreatedAtDesc(Long chauffeurId);
  long countByStatut(StatutDocument statut);

  @Query("select d from DocumentChauffeur d join fetch d.chauffeur c join fetch c.utilisateur where d.dateExpiration is not null and d.dateExpiration <= :limite and d.rappelEnvoye = false and d.statut = cm.mboaride.enums.StatutDocument.VALIDE")
  List<DocumentChauffeur> findExpirantAvant(@Param("limite") LocalDate limite);
}
