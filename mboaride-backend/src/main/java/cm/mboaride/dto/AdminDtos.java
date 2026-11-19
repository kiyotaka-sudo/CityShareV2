package cm.mboaride.dto;

import cm.mboaride.enums.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/** DTO du back-office d'administration. */
public final class AdminDtos {
  private AdminDtos() {}

  public record SerieJour(LocalDate jour, long terminees, long annulees, long chiffreAffaires, long commissions) {}

  public record PointCarte(Long id, String libelle, double lat, double lng, String type, String etat) {}

  public record TableauDeBord(long coursesEnCours, long coursesEnRecherche, long chauffeursConnectes, long chauffeursEnCourse,
      long coursesJour, long chiffreAffairesJour, long commissionsJour, long chiffreAffairesMois, long commissionsMois,
      double tauxAnnulation7j, long alertesActives, long reclamationsOuvertes, long chauffeursEnAttente, long documentsEnAttente,
      long reperesProposes, long retraitsEnAttente, long clientsTotal, long nouveauxClients7j, long chauffeursTotal,
      List<SerieJour> serie14j, Map<String, Long> repartitionServices30j, List<PointCarte> carte, Map<String, Object> paiement,
      String modeSms) {}

  public record ChauffeurAdminDto(Long id, String nom, String prenom, String telephone, String email, String genre,
      StatutCompte statut, TypeVehicule typeService, Boolean disponible, Boolean modeRamassage, Double noteMoyenne, Integer nbNotes,
      Long solde, UserDtos.VehiculeDto vehicule, boolean documentsAJour, long documentsEnAttente, LocalDateTime dateInscription,
      LocalDateTime valideAt, String photoUrl, List<ChauffeurDtos.DocumentDto> documents) {}

  public record CreationVehicule(@NotNull TypeVehicule typeVehicule, @NotBlank @Size(max = 60) String marque,
      @Size(max = 60) String modele, @Size(max = 40) String couleur, @NotBlank @Size(max = 20) String immatriculation,
      @Min(1) @Max(8) Integer nbPlaces, String proprietaireTelephone) {}

  public record DecisionDocument(@NotNull StatutDocument statut, @Size(max = 255) String motif, LocalDate dateExpiration) {}

  public record ChangementStatut(@NotNull StatutCompte statut, @Size(max = 255) String motif) {}

  public record AffectationVehicule(Long vehiculeId) {}

  public record CreationPersonnel(@NotBlank @Size(max = 100) String nom, @NotBlank @Size(max = 100) String prenom,
      @NotBlank String telephone, @NotBlank @Email String email, @NotNull Role role, @NotBlank @Size(min = 8) String motDePasse) {}

  public record CreationProprietaire(@NotBlank @Size(max = 100) String nom, @NotBlank @Size(max = 100) String prenom,
      @NotBlank String telephone, @Email String email) {}

  public record UtilisateurAdminDto(Long id, String nom, String prenom, String telephone, String email, Role role,
      StatutCompte statut, Double noteMoyenne, Integer nbNotes, Long solde, LocalDateTime dateInscription,
      LocalDateTime derniereConnexion, long nbCourses) {}

  public record TarifDto(Long id, TypeService typeService, @NotNull @Min(0) Long priseEnCharge, @NotNull @Min(0) Long prixKm,
      @NotNull @Min(0) Long prixMinute, @NotNull @Min(0) Long prixMinimum, @NotNull @Min(0) Long prixPlace,
      @NotNull @Min(0) Double distanceIncluseKm, @NotNull @Min(0) Long supplementKm, LocalDateTime updatedAt) {}

  public record ParametreDto(String cle, String valeur, String description, LocalDateTime updatedAt) {}

  public record ParametreUpdate(@NotBlank String valeur) {}

  public record ZoneDto(Long id, @NotBlank @Size(max = 100) String nom, @NotBlank @Size(max = 60) String ville,
      @NotNull Double centreLat, @NotNull Double centreLng, @NotNull @Positive Double rayonKm,
      @NotNull @Min(0) @Max(200) Double majorationPct, @NotNull Boolean motoActive, LocalTime motoInterditDebut,
      LocalTime motoInterditFin, @NotNull Boolean active) {}

  public record CodePromoDto(Long id, @NotBlank @Size(max = 30) String code, @Size(max = 255) String description,
      @NotNull TypeReduction typeReduction, @NotNull @Positive Long valeur, Long reductionMax, LocalDateTime dateDebut,
      LocalDateTime dateFin, Integer utilisationsMax, Integer utilisations, @NotNull Boolean uneFoisParUtilisateur,
      @NotNull Boolean actif) {}

  public record CampagneRequest(@NotBlank @Size(max = 150) String titre, @NotBlank @Size(max = 500) String message,
      @NotNull CibleCampagne cible, Boolean avecSms) {}

  public record CampagneDto(Long id, String titre, String message, CibleCampagne cible, Boolean avecSms,
      Integer nbDestinataires, LocalDateTime createdAt) {}

  public record JournalDto(Long id, String adminNom, String action, String cibleType, Long cibleId, String details,
      String ip, LocalDateTime createdAt) {}

  public record CourseAdminDto(Long id, String reference, TypeService typeService, StatutCourse statut, String client,
      String clientTelephone, String chauffeur, String chauffeurTelephone, String immatriculation, String depart, String arrivee,
      Double distanceKm, Long prixReference, Long prixFinal, Long montantAPayer, Long commission, ModePaiement modePaiement,
      StatutPaiementCourse statutPaiement, LocalDateTime createdAt, LocalDateTime finAt, String annuleePar) {}

  public record Traitement(@NotNull String statut, @Size(max = 2000) String commentaire) {}

  public record TraitementRetrait(@NotNull Boolean effectue, @Size(max = 255) String message) {}
}
