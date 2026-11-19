package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, Long> {
  @Query("select m from Message m join fetch m.expediteur where m.course.id = :courseId order by m.createdAt asc")
  List<Message> findByCourse(@Param("courseId") Long courseId);
}
