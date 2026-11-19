package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Lieu favori du client : maison, travail, campus (BF-35). */
@Entity
@Table(name = "lieu_favori")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LieuFavori {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "utilisateur_id") private Utilisateur utilisateur;
  @Column(nullable = false, length = 80) private String libelle;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TypeLieu type;
  @Column(nullable = false) private String adresse;
  @Column(nullable = false) private Double latitude;
  @Column(nullable = false) private Double longitude;
}
