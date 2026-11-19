package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Acceptation ou contre-proposition d'un chauffeur (BF-24). */
@Entity
@Table(name = "offre")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Offre {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "course_id") private Course course;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "chauffeur_id") private Utilisateur chauffeur;
  @Column(nullable = false) private Integer tour;
  @Column(nullable = false) private Long prix;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TypeOffre type;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) @Builder.Default private StatutOffre statut = StatutOffre.EN_ATTENTE;
  @Column(name = "distance_prise_en_charge_km") private Double distancePriseEnChargeKm;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
