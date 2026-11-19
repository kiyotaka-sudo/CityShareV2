package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Véhicule rattaché à un propriétaire (BF-57). */
@Entity
@Table(name = "vehicule")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicule {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "proprietaire_id") private Utilisateur proprietaire;
  @Enumerated(EnumType.STRING) @Column(name = "type_vehicule", nullable = false, length = 10) private TypeVehicule typeVehicule;
  @Column(nullable = false, length = 60) private String marque;
  @Column(length = 60) private String modele;
  @Column(length = 40) private String couleur;
  @Column(nullable = false, unique = true, length = 20) private String immatriculation;
  @Column(name = "nb_places", nullable = false) @Builder.Default private Integer nbPlaces = 4;
  @Column(name = "photo_url", length = 500) private String photoUrl;
  @Column(nullable = false) @Builder.Default private Boolean actif = true;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();

  public String getLibelle() {
    return (marque + " " + (modele == null ? "" : modele)).trim();
  }
}
