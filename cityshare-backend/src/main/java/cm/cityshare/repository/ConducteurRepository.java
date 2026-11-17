package cm.cityshare.repository;

import cm.cityshare.entity.Conducteur;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConducteurRepository extends JpaRepository<Conducteur, Long> {
}
