package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, Long>, JpaSpecificationExecutor<Course> {
  Optional<Course> findByTokenPartage(String token);

  Page<Course> findByClientIdOrderByCreatedAtDesc(Long clientId, Pageable pageable);
  Page<Course> findByChauffeurIdOrderByCreatedAtDesc(Long chauffeurId, Pageable pageable);

  List<Course> findByClientIdAndStatutIn(Long clientId, Collection<StatutCourse> statuts);
  List<Course> findByChauffeurIdAndStatutIn(Long chauffeurId, Collection<StatutCourse> statuts);
  List<Course> findByStatut(StatutCourse statut);
  List<Course> findByStatutIn(Collection<StatutCourse> statuts);
  long countByStatutIn(Collection<StatutCourse> statuts);

  @Query("select c from Course c where c.statut = cm.mboaride.enums.StatutCourse.RECHERCHE and c.offresExpireAt < :now")
  List<Course> findRecherchesExpirees(@Param("now") LocalDateTime now);

  @Query("select c from Course c where c.statut = cm.mboaride.enums.StatutCourse.PLANIFIEE and c.datePlanifiee <= :limite")
  List<Course> findPlanifieesALancer(@Param("limite") LocalDateTime limite);

  @Query("select c from Course c where c.createdAt >= :debut and c.createdAt < :fin")
  List<Course> findCreeesEntre(@Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

  @Query("select c from Course c where c.chauffeur.id = :chauffeurId and c.statut = cm.mboaride.enums.StatutCourse.TERMINEE and c.finAt >= :debut and c.finAt < :fin")
  List<Course> findTermineesChauffeur(@Param("chauffeurId") Long chauffeurId, @Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

  @Query("select c from Course c where c.chauffeur.id in :chauffeurIds and c.statut = cm.mboaride.enums.StatutCourse.TERMINEE and c.finAt >= :debut")
  List<Course> findTermineesChauffeurs(@Param("chauffeurIds") Collection<Long> chauffeurIds, @Param("debut") LocalDateTime debut);

  @Query("select c from Course c where c.createdAt >= :depuis and c.statut <> cm.mboaride.enums.StatutCourse.PLANIFIEE")
  List<Course> findDemandesDepuis(@Param("depuis") LocalDateTime depuis);

  long countByClientIdAndStatut(Long clientId, StatutCourse statut);
}
