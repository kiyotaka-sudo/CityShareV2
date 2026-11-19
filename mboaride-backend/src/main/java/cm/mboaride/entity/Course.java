package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Course de taxi (dépôt ou ramassage) ou de moto-taxi. */
@Entity
@Table(name = "course")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Course {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, unique = true, length = 20) private String reference;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "client_id") private Utilisateur client;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "chauffeur_id") private Utilisateur chauffeur;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "vehicule_id") private Vehicule vehicule;
  @Enumerated(EnumType.STRING) @Column(name = "type_service", nullable = false, length = 12) private TypeService typeService;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private StatutCourse statut;
  @Column(name = "nb_places", nullable = false) @Builder.Default private Integer nbPlaces = 1;
  @Column(name = "depart_adresse", nullable = false) private String departAdresse;
  @Column(name = "depart_repere") private String departRepere;
  @Column(name = "depart_lat", nullable = false) private Double departLat;
  @Column(name = "depart_lng", nullable = false) private Double departLng;
  @Column(name = "arrivee_adresse", nullable = false) private String arriveeAdresse;
  @Column(name = "arrivee_lat", nullable = false) private Double arriveeLat;
  @Column(name = "arrivee_lng", nullable = false) private Double arriveeLng;
  @Column(name = "distance_km", nullable = false) private Double distanceKm;
  @Column(name = "duree_min", nullable = false) private Double dureeMin;
  @Column(name = "prix_reference", nullable = false) private Long prixReference;
  @Column(name = "prix_min", nullable = false) private Long prixMin;
  @Column(name = "prix_max", nullable = false) private Long prixMax;
  @Column(name = "prix_propose", nullable = false) private Long prixPropose;
  @Column(name = "prix_final") private Long prixFinal;
  @Column(nullable = false) @Builder.Default private Long reduction = 0L;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "code_promo_id") private CodePromo codePromo;
  private Long commission;
  @Column(name = "gain_chauffeur") private Long gainChauffeur;
  private String majorations;
  @Enumerated(EnumType.STRING) @Column(name = "mode_paiement", nullable = false, length = 20) private ModePaiement modePaiement;
  @Enumerated(EnumType.STRING) @Column(name = "statut_paiement", nullable = false, length = 20) @Builder.Default private StatutPaiementCourse statutPaiement = StatutPaiementCourse.NON_PAYE;
  @Column(name = "mboa_lady", nullable = false) @Builder.Default private Boolean mboaLady = false;
  @Column(name = "casque_confirme", nullable = false) @Builder.Default private Boolean casqueConfirme = false;
  @Column(name = "code_verification", nullable = false, length = 4) private String codeVerification;
  @Column(name = "token_partage", nullable = false, unique = true, length = 40) private String tokenPartage;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "zone_id") private Zone zone;
  @Column(name = "tour_negociation", nullable = false) @Builder.Default private Integer tourNegociation = 1;
  @Column(name = "offres_expire_at") private LocalDateTime offresExpireAt;
  @Column(name = "date_planifiee") private LocalDateTime datePlanifiee;
  @Column(name = "created_at", nullable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
  @Column(name = "acceptee_at") private LocalDateTime accepteeAt;
  @Column(name = "arrive_at") private LocalDateTime arriveAt;
  @Column(name = "debut_at") private LocalDateTime debutAt;
  @Column(name = "fin_at") private LocalDateTime finAt;
  @Column(name = "annulee_at") private LocalDateTime annuleeAt;
  @Column(name = "annulee_par", length = 12) private String annuleePar;
  @Column(name = "motif_annulation") private String motifAnnulation;
  @Column(name = "frais_annulation", nullable = false) @Builder.Default private Long fraisAnnulation = 0L;
  @Column(name = "anomalie_signalee", nullable = false) @Builder.Default private Boolean anomalieSignalee = false;
  @Column(name = "dernier_mouvement_at") private LocalDateTime dernierMouvementAt;

  /** Montant réellement dû par le client (prix convenu moins la réduction). */
  public long getMontantAPayer() {
    long base = prixFinal != null ? prixFinal : prixPropose;
    return Math.max(0, base - (reduction == null ? 0 : reduction));
  }

  public boolean isActive() {
    return statut == StatutCourse.ACCEPTEE || statut == StatutCourse.CHAUFFEUR_ARRIVE || statut == StatutCourse.EN_COURS;
  }
}
