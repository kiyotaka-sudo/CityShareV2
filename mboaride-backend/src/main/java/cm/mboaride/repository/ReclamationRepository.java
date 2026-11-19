package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ReclamationRepository extends JpaRepository<Reclamation, Long> {
  List<Reclamation> findByAuteurIdOrderByCreatedAtDesc(Long auteurId);
  @Query("select r from Reclamation r join fetch r.auteur left join fetch r.course order by r.createdAt desc")
  List<Reclamation> findAllDetail();
  long countByStatutIn(Collection<StatutReclamation> statuts);
}
