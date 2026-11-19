package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CoursePositionRepository extends JpaRepository<CoursePosition, Long> {
  List<CoursePosition> findByCourseIdOrderByCreatedAtAsc(Long courseId);
  Optional<CoursePosition> findTopByCourseIdOrderByCreatedAtDesc(Long courseId);

  @Modifying
  @Query("delete from CoursePosition p where p.createdAt < :avant")
  int purgerAvant(@Param("avant") LocalDateTime avant);
}
