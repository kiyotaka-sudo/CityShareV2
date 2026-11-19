package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Profil d'exploitation d'un chauffeur de taxi ou conducteur de moto-taxi. */
@Entity
@Table(name = "chauffeur")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Chauffeur {
  @Id
  @Column(name = "utilisateur_id")
  private Long id;
  @MapsId
  @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "utilisateur_id") private Utilisateur utilisateur;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "vehicule_id") private Vehicule vehicule;
  @Enumerated(EnumType.STRING) @Column(name = "type_service", nullable = false, length = 10) private TypeVehicule typeService;
  @Column(nullable = false) @Builder.Default private Boolean disponible = false;
  @Column(name = "mode_ramassage", nullable = false) @Builder.Default private Boolean modeRamassage = false;
  @Column(name = "places_libres", nullable = false) @Builder.Default private Integer placesLibres = 0;
  @Column(name = "direction_libelle", length = 150) private String directionLibelle;
  @Column(name = "direction_lat") private Double directionLat;
  @Column(name = "direction_lng") private Double directionLng;
  private Double latitude;
  private Double longitude;
  @Column(name = "position_at") private LocalDateTime positionAt;
  @Column(name = "casque_disponible", nullable = false) @Builder.Default private Boolean casqueDisponible = false;
  @Column(name = "valide_at") private LocalDateTime valideAt;
  @Column(name = "valide_par") private Long validePar;

  public boolean isMoto() {
    return typeService == TypeVehicule.MOTO;
  }
}
