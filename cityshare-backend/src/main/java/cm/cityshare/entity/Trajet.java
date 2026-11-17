package cm.cityshare.entity;

import cm.cityshare.enums.StatutTrajet;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trajet")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trajet {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "conducteur_id", nullable = false)
  private Conducteur conducteur;

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
  @Column(name = "date_heure", nullable = false)
  private LocalDateTime dateHeure;
  @Column(name = "nb_places_total", nullable = false)
  private Integer nbPlacesTotal;
  @Column(name = "nb_places_dispo", nullable = false)
  private Integer nbPlacesDispo;
  @Column(name = "prix_par_place", nullable = false)
  private Double prixParPlace;
  @Column(name = "accepte_colis")
  private Boolean accepteColis = false;
  @Column(name = "autorise_arrets")
  private Boolean autoriseArrets = false;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @Builder.Default
  private StatutTrajet statut = StatutTrajet.ACTIF;

  @Column(name = "created_at")
  @Builder.Default
  private LocalDateTime createdAt = LocalDateTime.now();

  @OneToMany(mappedBy = "trajet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @OrderBy("ordre ASC")
  @Builder.Default
  private List<ArretIntermediaire> arrets = new ArrayList<>();

  @OneToMany(mappedBy = "trajet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
  @JsonIgnore
  @Builder.Default
  private List<Reservation> reservations = new ArrayList<>();
}
