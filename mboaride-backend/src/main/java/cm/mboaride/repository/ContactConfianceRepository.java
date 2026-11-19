package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ContactConfianceRepository extends JpaRepository<ContactConfiance, Long> {
  List<ContactConfiance> findByUtilisateurId(Long utilisateurId);
  void deleteByUtilisateurId(Long utilisateurId);

  @Query("select count(c) from ContactConfiance c where c.utilisateur.id = :userId")
  long findByUserIdCount(@Param("userId") Long userId);
}
