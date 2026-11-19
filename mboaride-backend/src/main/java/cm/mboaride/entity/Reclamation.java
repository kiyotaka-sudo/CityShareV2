package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Réclamation avec numéro de suivi (BF-51, BF-52). */
@Entity
@Table(name = "reclamation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reclamation {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, unique = true, length = 20) private String numero;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private Course course;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "auteur_id") private Utilisateur auteur;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TypeReclamation type;
  @Column(nullable = false, columnDefinition = "TEXT") private String description;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) @Builder.Default private StatutReclamation statut = StatutReclamation.OUVERTE;
  @Column(columnDefinition = "TEXT") private String reponse;
  @Column(name = "traite_par") private Long traitePar;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
  @Column(name = "updated_at") private LocalDateTime updatedAt;
}
