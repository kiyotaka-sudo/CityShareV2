package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface AlerteSosRepository extends JpaRepository<AlerteSos, Long> {
  @Query("select a from AlerteSos a left join fetch a.declencheur left join fetch a.course order by a.createdAt desc")
  List<AlerteSos> findAllDetail();
  long countByStatutIn(Collection<StatutAlerte> statuts);
  List<AlerteSos> findByCourseIdAndStatutIn(Long courseId, Collection<StatutAlerte> statuts);
}
