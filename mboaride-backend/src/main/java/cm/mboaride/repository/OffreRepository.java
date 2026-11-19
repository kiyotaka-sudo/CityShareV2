package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface OffreRepository extends JpaRepository<Offre, Long> {
  @Query("select o from Offre o join fetch o.chauffeur where o.course.id = :courseId and o.tour = :tour and o.statut = cm.mboaride.enums.StatutOffre.EN_ATTENTE order by o.prix asc")
  List<Offre> findEnAttente(@Param("courseId") Long courseId, @Param("tour") Integer tour);

  boolean existsByCourseIdAndChauffeurIdAndTour(Long courseId, Long chauffeurId, Integer tour);
  List<Offre> findByCourseId(Long courseId);
  List<Offre> findByChauffeurIdAndStatut(Long chauffeurId, StatutOffre statut);
}
