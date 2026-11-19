package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Trace de l'utilisation d'un code promo. */
@Entity
@Table(name = "utilisation_promo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UtilisationPromo {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(name = "code_promo_id", nullable = false) private Long codePromoId;
  @Column(name = "utilisateur_id", nullable = false) private Long utilisateurId;
  @Column(name = "course_id", nullable = false) private Long courseId;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
