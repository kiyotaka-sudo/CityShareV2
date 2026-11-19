package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CourseIgnoreeRepository extends JpaRepository<CourseIgnoree, CourseIgnoreeId> {
  @Query("select i.courseId from CourseIgnoree i where i.chauffeurId = :chauffeurId")
  Set<Long> findCourseIdsByChauffeur(@Param("chauffeurId") Long chauffeurId);
}
