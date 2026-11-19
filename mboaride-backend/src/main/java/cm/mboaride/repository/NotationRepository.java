package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface NotationRepository extends JpaRepository<Notation, Long> {
  boolean existsByCourseIdAndAuteurId(Long courseId, Long auteurId);
  List<Notation> findByCourseId(Long courseId);
  List<Notation> findTop20ByCibleIdOrderByCreatedAtDesc(Long cibleId);
}
