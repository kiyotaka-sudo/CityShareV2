package cm.mboaride.dto;

import cm.mboaride.dto.UserDtos.VehiculeDto;
import cm.mboaride.enums.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

/** DTO de la réservation, de la négociation et du déroulement des courses. */
public final class CourseDtos {
  private CourseDtos() {}

  public record PointDto(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
      @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
      @NotBlank @Size(max = 255) String adresse,
      @Size(max = 255) String repere) {}

  public record EstimationRequest(@NotNull @Valid PointDto depart, @NotNull @Valid PointDto arrivee,
      @Min(1) @Max(4) Integer nbPlaces, @Size(max = 30) String codePromo) {}

  public record Majoration(String code, String libelle, double pct) {}

  public record EstimationService(TypeService typeService, boolean disponible, String motifIndisponible,
      boolean recommande, boolean negociable, long prixReference, long prixMin, long prixMax, long prixParPlace,
      int nbPlaces, List<Majoration> majorations, long reduction, int chauffeursProches) {}

  public record EstimationReponse(double distanceKm, double dureeMin, boolean distanceEstimee, String zone,
      List<EstimationService> services, String messagePromo) {}

  public record DemandeCourse(@NotNull @Valid PointDto depart, @NotNull @Valid PointDto arrivee,
      @NotNull TypeService typeService, @Min(1) @Max(4) Integer nbPlaces, Long prixPropose,
      @NotNull ModePaiement modePaiement, Boolean mboaLady, LocalDateTime datePlanifiee, @Size(max = 30) String codePromo) {}

  public record PersonneDto(Long id, String prenom, String nom, String photoUrl, Double noteMoyenne, Integer nbNotes, String telephone) {}

  public record ChauffeurPublicDto(Long id, String prenom, String nom, String photoUrl, Double noteMoyenne, Integer nbNotes,
      String telephone, String genre, VehiculeDto vehicule, Double lat, Double lng) {}

  public record CourseDto(Long id, String reference, TypeService typeService, StatutCourse statut, Integer nbPlaces,
      PointDto depart, PointDto arrivee, Double distanceKm, Double dureeMin,
      Long prixReference, Long prixMin, Long prixMax, Long prixPropose, Long prixFinal, Long reduction, Long montantAPayer,
      Long commission, Long gainChauffeur, String majorations,
      ModePaiement modePaiement, StatutPaiementCourse statutPaiement, Boolean mboaLady, Boolean casqueConfirme,
      String codeVerification, String lienPartage, Integer tourNegociation, LocalDateTime offresExpireAt,
      LocalDateTime datePlanifiee, LocalDateTime createdAt, LocalDateTime accepteeAt, LocalDateTime arriveAt,
      LocalDateTime debutAt, LocalDateTime finAt, LocalDateTime annuleeAt, String annuleePar, String motifAnnulation,
      Long fraisAnnulation, PersonneDto client, ChauffeurPublicDto chauffeur, Boolean dejaNote, Boolean negociable) {}

  public record OffreDto(Long id, Long courseId, ChauffeurPublicDto chauffeur, Long prix, TypeOffre type,
      StatutOffre statut, Double distancePriseEnChargeKm, Double etaMin, LocalDateTime createdAt) {}

  public record ProposerPrix(@NotNull @Positive Long prix) {}

  public record Annulation(@Size(max = 255) String motif) {}

  public record PositionDto(@NotNull Double lat, @NotNull Double lng) {}

  /** Demande affichée au chauffeur (BF-54). */
  public record DemandeChauffeurDto(Long courseId, String reference, TypeService typeService, Integer nbPlaces,
      PointDto depart, PointDto arrivee, Double distanceKm, Double dureeMin, Long prixPropose, Long prixMin, Long prixMax,
      Double distancePriseEnChargeKm, String clientPrenom, Double clientNote, ModePaiement modePaiement,
      LocalDateTime offresExpireAt, Integer tour, boolean dejaRepondu, boolean negociable, LocalDateTime datePlanifiee) {}

  public record ReponseChauffeur(@NotNull TypeOffre type, @Positive Long prix, Boolean casqueConfirme) {}

  public record Demarrage(@NotBlank @Size(min = 4, max = 4) String code) {}

  public record NotationRequest(@NotNull @Min(1) @Max(5) Integer note, @Size(max = 500) String commentaire) {}

  public record MessageDto(Long id, Long courseId, Long expediteurId, String expediteurPrenom, String contenu, Boolean lu, LocalDateTime createdAt) {}

  public record EnvoiMessage(@NotBlank @Size(max = 1000) String contenu) {}

  public record SuiviPublicDto(String reference, StatutCourse statut, TypeService typeService, PointDto depart, PointDto arrivee,
      String chauffeurPrenom, String vehicule, String immatriculation, String couleur, Double lat, Double lng,
      LocalDateTime positionAt, LocalDateTime debutAt, List<double[]> trace) {}

  public record ItineraireDto(double distanceKm, double dureeMin, boolean estime, List<double[]> trace) {}
}
