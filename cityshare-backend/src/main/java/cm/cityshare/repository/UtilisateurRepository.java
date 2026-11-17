package cm.cityshare.repository;

import cm.cityshare.entity.Utilisateur;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
  Optional<Utilisateur> findByTelephone(String telephone);
  boolean existsByTelephone(String telephone);
  boolean existsByEmail(String email);
}
