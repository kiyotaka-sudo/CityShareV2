package cm.mboaride.dto;

import cm.mboaride.enums.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

/** DTO des comptes, de l'authentification et du profil. */
public final class UserDtos {
  private UserDtos() {}

  public record OtpDemande(@NotBlank String telephone) {}

  public record OtpDemandeReponse(boolean envoye, int expireDansSecondes, boolean nouveauCompte, String codeDev) {}

  public record OtpVerification(
      @NotBlank String telephone,
      @NotBlank @Size(min = 6, max = 6) String code,
      @Size(max = 100) String nom,
      @Size(max = 100) String prenom,
      @Pattern(regexp = "fr|en") String langue,
      @Size(max = 12) String codeParrainage,
      Boolean consentement) {}

  public record AdminLogin(@NotBlank String identifiant, @NotBlank String motDePasse) {}

  public record AuthReponse(String token, UtilisateurDto utilisateur) {}

  public record VehiculeDto(Long id, TypeVehicule typeVehicule, String marque, String modele, String couleur,
      String immatriculation, Integer nbPlaces, String photoUrl, Boolean actif, Long proprietaireId, String proprietaireNom) {}

  public record ChauffeurInfo(TypeVehicule typeService, Boolean disponible, Boolean modeRamassage, Integer placesLibres,
      String directionLibelle, Double directionLat, Double directionLng, Boolean casqueDisponible,
      Double latitude, Double longitude, VehiculeDto vehicule, boolean documentsAJour) {}

  public record UtilisateurDto(Long id, String nom, String prenom, String telephone, String email, Role role,
      StatutCompte statut, String genre, String langue, String photoUrl, Double noteMoyenne, Integer nbNotes,
      Long solde, String codeParrainage, LocalDateTime dateInscription, boolean estProprietaire, ChauffeurInfo chauffeur) {}

  public record ProfilUpdate(@Size(min = 1, max = 100) String nom, @Size(min = 1, max = 100) String prenom,
      @Email String email, @Pattern(regexp = "fr|en") String langue, @Pattern(regexp = "H|F") String genre) {}

  public record PushTokenUpdate(@NotBlank String token) {}

  public record ContactDto(Long id, @NotBlank @Size(max = 100) String nom, @NotBlank String telephone) {}

  public record LieuDto(Long id, @NotBlank @Size(max = 80) String libelle, @NotNull TypeLieu type,
      @NotBlank String adresse, @NotNull Double latitude, @NotNull Double longitude) {}

  public record NotificationDto(Long id, String titre, String corps, String type, Boolean lu, Long courseId, LocalDateTime createdAt) {}

  /** Export des données personnelles (droit d'accès, loi n° 2024/017). */
  public record ExportDonnees(UtilisateurDto profil, List<ContactDto> contacts, List<LieuDto> lieux,
      List<Object> courses, List<Object> transactions, LocalDateTime exporteLe) {}
}
