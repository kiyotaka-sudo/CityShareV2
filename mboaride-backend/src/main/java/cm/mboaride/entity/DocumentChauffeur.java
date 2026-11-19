package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Pièce justificative d'un chauffeur (BF-03, BF-06). */
@Entity
@Table(name = "document_chauffeur")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentChauffeur {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "chauffeur_id") private Chauffeur chauffeur;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TypeDocument type;
  @Column(nullable = false) private String fichier;
  @Column(name = "nom_original") private String nomOriginal;
  @Column(name = "content_type", length = 100) private String contentType;
  @Column(name = "date_expiration") private LocalDate dateExpiration;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private StatutDocument statut = StatutDocument.EN_ATTENTE;
  @Column(name = "motif_rejet") private String motifRejet;
  @Column(name = "rappel_envoye", nullable = false) @Builder.Default private Boolean rappelEnvoye = false;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
  @Column(name = "verifie_at") private LocalDateTime verifieAt;
}
