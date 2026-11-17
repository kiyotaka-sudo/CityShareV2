package cm.cityshare.entity;

import cm.cityshare.enums.StatutReservation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "reservation")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "trajet_id", nullable = false)
  private Trajet trajet;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "passager_id", nullable = false)
  private Passager passager;

  @Column(name = "nb_places", nullable = false)
  @Builder.Default
  private Integer nbPlaces = 1;
  @Column(name = "prix_total", nullable = false)
  private Double prixTotal;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  @Builder.Default
  private StatutReservation statut = StatutReservation.EN_ATTENTE;

  @Column(name = "date_reservation")
  @Builder.Default
  private LocalDateTime dateReservation = LocalDateTime.now();
  @Column(name = "qr_code_token", unique = true, nullable = false)
  private String qrCodeToken;
  @Column(name = "qr_code_scanne")
  @Builder.Default
  private Boolean qrCodeScanne = false;
  @Column(name = "arrivee_confirmee")
  @Builder.Default
  private Boolean arriveeConfirmee = false;
  @Column(name = "dead_man_switch_deadline")
  private LocalDateTime deadManSwitchDeadline;
}
