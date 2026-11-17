package cm.cityshare.repository;

import cm.cityshare.entity.Notation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotationRepository extends JpaRepository<Notation, Long> {
  @Query("SELECT AVG(n.noteValeur) FROM Notation n WHERE n.note.id = :userId")
  Double calculateAverageByUserId(@Param("userId") Long userId);

  @Query("""
    SELECT n FROM Notation n
    WHERE n.note.id = :userId
    ORDER BY n.dateNotation DESC
    """)
  List<Notation> findByUserId(@Param("userId") Long userId);
}
