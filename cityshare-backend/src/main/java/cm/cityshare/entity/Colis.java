package cm.cityshare.entity;

import cm.cityshare.enums.ColisPoidsEnum;
import cm.cityshare.enums.StatutColis;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "colis")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Colis {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "expediteur_id", nullable = false)
  private Expediteur expediteur;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "conducteur_id")
  private Conducteur conducteur;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "trajet_id")
  private Trajet trajet;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String description;
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ColisPoidsEnum poids;
  @Column(name = "ville_depart", nullable = false)
  private String villeDepart;
  @Column(name = "ville_arrivee", nullable = false)
  private String villeArrivee;
  @Column(name = "lat_depart")
  private Double latDepart;
  @Column(name = "lng_depart")
  private Double lngDepart;
  @Column(name = "lat_arrivee")
  private Double latArrivee;
  @Column(name = "lng_arrivee")
  private Double lngArrivee;
  @Column(name = "prix_livraison")
  private Double prixLivraison;
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  @Builder.Default
  private StatutColis statut = StatutColis.EN_ATTENTE;
  @Column(name = "created_at")
  @Builder.Default
  private LocalDateTime createdAt = LocalDateTime.now();
}
