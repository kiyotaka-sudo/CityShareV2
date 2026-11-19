package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface RepereRepository extends JpaRepository<Repere, Long> {
  @Query("select r from Repere r where r.statut = cm.mboaride.enums.StatutRepere.VALIDE and (:q is null or lower(r.nom) like lower(concat('%', :q, '%')) or lower(r.description) like lower(concat('%', :q, '%'))) and (:ville is null or r.ville = :ville) order by r.nbUtilisations desc, r.nom")
  List<Repere> rechercher(@Param("q") String q, @Param("ville") String ville, Pageable pageable);

  List<Repere> findByStatutOrderByCreatedAtDesc(StatutRepere statut);
  List<Repere> findAllByOrderByVilleAscNomAsc();
  long countByStatut(StatutRepere statut);
}
