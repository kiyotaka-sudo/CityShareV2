package cm.mboaride.repository;

import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long>, JpaSpecificationExecutor<Utilisateur> {
  Optional<Utilisateur> findByTelephone(String telephone);
  Optional<Utilisateur> findByEmailIgnoreCase(String email);
  Optional<Utilisateur> findByCodeParrainage(String code);
  boolean existsByTelephone(String telephone);
  boolean existsByCodeParrainage(String code);
  long countByRoleAndStatut(Role role, StatutCompte statut);
  long countByRole(Role role);
  long countByDateInscriptionAfter(LocalDateTime date);
  List<Utilisateur> findByRoleInAndStatut(Collection<Role> roles, StatutCompte statut);
  List<Utilisateur> findByRoleIn(Collection<Role> roles);

  /** Verrou en écriture pour les opérations de portefeuille (pas de double débit concurrent). */
  @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from Utilisateur u where u.id = :id")
  Optional<Utilisateur> verrouiller(@Param("id") Long id);
}
