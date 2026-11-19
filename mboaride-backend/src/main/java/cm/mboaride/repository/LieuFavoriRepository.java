package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface LieuFavoriRepository extends JpaRepository<LieuFavori, Long> {
  List<LieuFavori> findByUtilisateurIdOrderByLibelle(Long utilisateurId);
  void deleteByUtilisateurId(Long utilisateurId);
}
