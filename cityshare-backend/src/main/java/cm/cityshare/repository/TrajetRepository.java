package cm.cityshare.repository;

import cm.cityshare.entity.Trajet;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrajetRepository extends JpaRepository<Trajet, Long> {
  @Query("""
    SELECT t FROM Trajet t
    WHERE LOWER(t.villeDepart) LIKE LOWER(CONCAT('%', :depart, '%'))
    AND LOWER(t.villeArrivee) LIKE LOWER(CONCAT('%', :arrivee, '%'))
    AND t.statut = cm.cityshare.enums.StatutTrajet.ACTIF
    AND t.nbPlacesDispo >= :places
    AND FUNCTION('date', t.dateHeure) = :date
    ORDER BY t.dateHeure ASC
    """)
  List<Trajet> findByRoute(@Param("depart") String depart, @Param("arrivee") String arrivee, @Param("places") Integer places, @Param("date") LocalDate date);

  @Query("""
    SELECT t FROM Trajet t
    WHERE t.statut = cm.cityshare.enums.StatutTrajet.ACTIF
    AND FUNCTION('date', t.dateHeure) = CURRENT_DATE
    ORDER BY t.dateHeure ASC
    """)
  List<Trajet> findAllActifs();

  @Query("""
    SELECT t FROM Trajet t
    WHERE t.conducteur.id = :conducteurId
    ORDER BY t.dateHeure DESC
    """)
  List<Trajet> findByConducteurId(@Param("conducteurId") Long id);
}
