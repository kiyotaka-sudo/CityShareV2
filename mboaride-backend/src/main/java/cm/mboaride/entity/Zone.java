package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Zone de service avec majoration et règles moto (BF-31, BF-60). */
@Entity
@Table(name = "zone")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Zone {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, length = 100) private String nom;
  @Column(nullable = false, length = 60) private String ville;
  @Column(name = "centre_lat", nullable = false) private Double centreLat;
  @Column(name = "centre_lng", nullable = false) private Double centreLng;
  @Column(name = "rayon_km", nullable = false) private Double rayonKm;
  @Column(name = "majoration_pct", nullable = false) @Builder.Default private Double majorationPct = 0.0;
  @Column(name = "moto_active", nullable = false) @Builder.Default private Boolean motoActive = true;
  @Column(name = "moto_interdit_debut") private LocalTime motoInterditDebut;
  @Column(name = "moto_interdit_fin") private LocalTime motoInterditFin;
  @Column(nullable = false) @Builder.Default private Boolean active = true;
}
