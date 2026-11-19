package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Grille tarifaire par type de service (BF-25). */
@Entity
@Table(name = "tarif")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tarif {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Enumerated(EnumType.STRING) @Column(name = "type_service", nullable = false, unique = true, length = 12) private TypeService typeService;
  @Column(name = "prise_en_charge", nullable = false) private Long priseEnCharge;
  @Column(name = "prix_km", nullable = false) private Long prixKm;
  @Column(name = "prix_minute", nullable = false) private Long prixMinute;
  @Column(name = "prix_minimum", nullable = false) private Long prixMinimum;
  @Column(name = "prix_place", nullable = false) @Builder.Default private Long prixPlace = 0L;
  @Column(name = "distance_incluse_km", nullable = false) @Builder.Default private Double distanceIncluseKm = 0.0;
  @Column(name = "supplement_km", nullable = false) @Builder.Default private Long supplementKm = 0L;
  @Column(name = "updated_at") private LocalDateTime updatedAt;
}
