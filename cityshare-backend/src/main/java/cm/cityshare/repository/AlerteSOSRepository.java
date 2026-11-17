package cm.cityshare.repository;

import cm.cityshare.entity.AlerteSOS;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlerteSOSRepository extends JpaRepository<AlerteSOS, Long> {
  @Query("SELECT a FROM AlerteSOS a WHERE a.declencheur.id = :userId ORDER BY a.dateAlerte DESC")
  List<AlerteSOS> findByDeclencheurId(@Param("userId") Long userId);
}
