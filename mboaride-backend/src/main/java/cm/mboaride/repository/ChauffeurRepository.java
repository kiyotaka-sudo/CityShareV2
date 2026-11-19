package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ChauffeurRepository extends JpaRepository<Chauffeur, Long> {
  @Query("select c from Chauffeur c join fetch c.utilisateur u left join fetch c.vehicule v where c.disponible = true and u.statut = cm.mboaride.enums.StatutCompte.ACTIF")
  List<Chauffeur> findDisponibles();

  @Query("select c from Chauffeur c join fetch c.utilisateur u left join fetch c.vehicule v where v.proprietaire.id = :proprietaireId")
  List<Chauffeur> findByProprietaire(@Param("proprietaireId") Long proprietaireId);

  @Query("select c from Chauffeur c join fetch c.utilisateur u left join fetch c.vehicule v order by u.dateInscription desc")
  List<Chauffeur> findAllWithUtilisateur();

  long countByDisponibleTrue();

  @Query("select c from Chauffeur c join fetch c.utilisateur u where c.disponible = true and c.positionAt < :avant")
  List<Chauffeur> findDisponiblesInactifsDepuis(@Param("avant") LocalDateTime avant);
}
