package cm.cityshare.repository;

import cm.cityshare.entity.Colis;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ColisRepository extends JpaRepository<Colis, Long> {
  @Query("""
    SELECT c FROM Colis c
    WHERE LOWER(c.villeDepart) LIKE LOWER(CONCAT('%', :depart, '%'))
    AND LOWER(c.villeArrivee) LIKE LOWER(CONCAT('%', :arrivee, '%'))
    AND c.statut = cm.cityshare.enums.StatutColis.EN_ATTENTE
    """)
  List<Colis> findMatchingColis(@Param("depart") String depart, @Param("arrivee") String arrivee);

  @Query("""
    SELECT c FROM Colis c
    WHERE c.expediteur.id = :expediteurId
    ORDER BY c.createdAt DESC
    """)
  List<Colis> findByExpediteurId(@Param("expediteurId") Long id);

  @Query("""
    SELECT c FROM Colis c
    WHERE c.conducteur.id = :conducteurId
    ORDER BY c.createdAt DESC
    """)
  List<Colis> findByConducteurId(@Param("conducteurId") Long id);
}
