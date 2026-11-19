package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
  Page<Notification> findByUtilisateurIdOrderByCreatedAtDesc(Long utilisateurId, Pageable pageable);
  long countByUtilisateurIdAndLuFalse(Long utilisateurId);
  @Modifying
  @Query("update Notification n set n.lu = true where n.utilisateurId = :userId")
  void marquerToutesLues(@Param("userId") Long userId);
}
