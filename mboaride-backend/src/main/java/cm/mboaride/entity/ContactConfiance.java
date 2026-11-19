package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Contact de confiance prévenu en cas de SOS (BF-02, BF-43). */
@Entity
@Table(name = "contact_confiance")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContactConfiance {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "utilisateur_id") private Utilisateur utilisateur;
  @Column(nullable = false, length = 100) private String nom;
  @Column(nullable = false, length = 20) private String telephone;
}
