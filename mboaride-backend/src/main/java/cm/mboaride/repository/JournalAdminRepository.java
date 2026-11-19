package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface JournalAdminRepository extends JpaRepository<JournalAdmin, Long> {
  Page<JournalAdmin> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
