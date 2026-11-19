package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Alerte SOS ou anomalie détectée pendant une course (BF-43, BF-46). */
@Entity
@Table(name = "alerte_sos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlerteSos {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "declencheur_id") private Utilisateur declencheur;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private Course course;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 25) private TypeAlerte type;
  private Double latitude;
  private Double longitude;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) @Builder.Default private StatutAlerte statut = StatutAlerte.ACTIVE;
  @Column(columnDefinition = "TEXT") private String notes;
  @Column(name = "traite_par") private Long traitePar;
  @Column(name = "contacts_notifies", nullable = false) @Builder.Default private Integer contactsNotifies = 0;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
  @Column(name = "resolue_at") private LocalDateTime resolueAt;
}
