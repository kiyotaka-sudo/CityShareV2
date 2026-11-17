package cm.cityshare.repository;

import cm.cityshare.entity.Reservation;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
  @Query("""
    SELECT r FROM Reservation r
    WHERE r.passager.id = :passagerId
    ORDER BY r.dateReservation DESC
    """)
  List<Reservation> findByPassagerId(@Param("passagerId") Long id);

  @Query("SELECT r FROM Reservation r WHERE r.qrCodeToken = :token")
  Optional<Reservation> findByQrCodeToken(@Param("token") String token);

  @Query("""
    SELECT r FROM Reservation r
    WHERE r.qrCodeScanne = true
    AND r.arriveeConfirmee = false
    AND r.deadManSwitchDeadline < :now
    """)
  List<Reservation> findExpiredDeadManSwitch(@Param("now") LocalDateTime now);

  @Query("""
    SELECT r FROM Reservation r
    WHERE r.trajet.id = :trajetId
    AND r.statut = cm.cityshare.enums.StatutReservation.CONFIRMEE
    """)
  List<Reservation> findConfirmedByTrajetId(@Param("trajetId") Long trajetId);

  @Query("""
    SELECT r FROM Reservation r
    WHERE r.trajet.conducteur.id = :conducteurId
    AND r.statut IN (cm.cityshare.enums.StatutReservation.CONFIRMEE, cm.cityshare.enums.StatutReservation.VALIDEE)
    ORDER BY r.dateReservation DESC
    """)
  List<Reservation> findBoardingByConducteurId(@Param("conducteurId") Long conducteurId);
}
