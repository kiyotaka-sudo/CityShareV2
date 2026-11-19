package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Note mutuelle client/chauffeur après une course (BF-49). */
@Entity
@Table(name = "notation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notation {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "course_id") private Course course;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "auteur_id") private Utilisateur auteur;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cible_id") private Utilisateur cible;
  @Column(nullable = false) private Integer note;
  @Column(length = 500) private String commentaire;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
