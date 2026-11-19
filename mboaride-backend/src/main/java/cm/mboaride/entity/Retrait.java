package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Retrait des gains d'un chauffeur vers Mobile Money (BF-41). */
@Entity
@Table(name = "retrait")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Retrait {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "chauffeur_id") private Utilisateur chauffeur;
  @Column(nullable = false) private Long montant;
  @Column(nullable = false, length = 20) private String telephone;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Operateur operateur;
  @Enumerated(EnumType.STRING) @Column(length = 15) private FournisseurPaiement fournisseur;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) @Builder.Default private StatutRetrait statut = StatutRetrait.EN_ATTENTE;
  @Column(nullable = false, unique = true, length = 60) private String reference;
  @Column(name = "reference_externe", length = 100) private String referenceExterne;
  private String message;
  @Column(name = "traite_par") private Long traitePar;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
  @Column(name = "traite_at") private LocalDateTime traiteAt;
}
