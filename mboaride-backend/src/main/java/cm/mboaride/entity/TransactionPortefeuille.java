package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Mouvement du portefeuille d'un utilisateur (montant signé). */
@Entity
@Table(name = "transaction_portefeuille")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransactionPortefeuille {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "utilisateur_id") private Utilisateur utilisateur;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 25) private TypeTransaction type;
  @Column(nullable = false) private Long montant;
  @Column(name = "solde_apres", nullable = false) private Long soldeApres;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private Course course;
  private String description;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
