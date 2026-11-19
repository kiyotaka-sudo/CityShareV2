package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface RetraitRepository extends JpaRepository<Retrait, Long> {
  List<Retrait> findByChauffeurIdOrderByCreatedAtDesc(Long chauffeurId);
  @Query("select r from Retrait r join fetch r.chauffeur order by r.createdAt desc")
  List<Retrait> findAllWithChauffeur();
  long countByStatut(StatutRetrait statut);
}
