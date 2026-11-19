package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Code promotionnel (BF-27, BF-63). */
@Entity
@Table(name = "code_promo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CodePromo {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, unique = true, length = 30) private String code;
  private String description;
  @Enumerated(EnumType.STRING) @Column(name = "type_reduction", nullable = false, length = 15) private TypeReduction typeReduction;
  @Column(nullable = false) private Long valeur;
  @Column(name = "reduction_max") private Long reductionMax;
  @Column(name = "date_debut") private LocalDateTime dateDebut;
  @Column(name = "date_fin") private LocalDateTime dateFin;
  @Column(name = "utilisations_max") private Integer utilisationsMax;
  @Column(nullable = false) @Builder.Default private Integer utilisations = 0;
  @Column(name = "une_fois_par_utilisateur", nullable = false) @Builder.Default private Boolean uneFoisParUtilisateur = true;
  @Column(nullable = false) @Builder.Default private Boolean actif = true;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
