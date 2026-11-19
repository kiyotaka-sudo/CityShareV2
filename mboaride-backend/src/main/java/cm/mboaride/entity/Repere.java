package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Repère local (carrefour, marché, école…) — BF-33, BF-34. */
@Entity
@Table(name = "repere")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Repere {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, length = 150) private String nom;
  private String description;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private CategorieRepere categorie;
  @Column(nullable = false, length = 60) private String ville;
  @Column(nullable = false) private Double latitude;
  @Column(nullable = false) private Double longitude;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private StatutRepere statut = StatutRepere.PROPOSE;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "propose_par") private Utilisateur proposePar;
  @Column(name = "nb_utilisations", nullable = false) @Builder.Default private Integer nbUtilisations = 0;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
