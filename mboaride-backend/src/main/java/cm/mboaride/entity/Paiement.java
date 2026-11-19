package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Transaction de paiement (course ou recharge du portefeuille). */
@Entity
@Table(name = "paiement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Paiement {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private Course course;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "utilisateur_id") private Utilisateur utilisateur;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) private TypePaiement type;
  @Column(nullable = false) private Long montant;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ModePaiement mode;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) private FournisseurPaiement fournisseur;
  @Column(nullable = false, unique = true, length = 60) private String reference;
  @Column(name = "reference_externe", length = 100) private String referenceExterne;
  @Column(length = 20) private String telephone;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) @Builder.Default private StatutPaiement statut = StatutPaiement.EN_ATTENTE;
  @Column(name = "payment_url", length = 500) private String paymentUrl;
  private String message;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
  @Column(name = "updated_at") private LocalDateTime updatedAt;
}
