package cm.mboaride.dto;

import cm.mboaride.enums.TypeVehicule;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

/**
 * Formulaire multipart d'inscription d'un chauffeur par l'administration (BF-03) :
 * identité, véhicule (nouveau ou existant) et pièces justificatives.
 */
public record CreationChauffeurForm(
    @NotBlank @Size(max = 100) String nom,
    @NotBlank @Size(max = 100) String prenom,
    @NotBlank String telephone,
    @Email String email,
    @Pattern(regexp = "H|F") String genre,
    @NotNull TypeVehicule typeService,
    Boolean casqueDisponible,
    Long vehiculeId,
    @Size(max = 60) String marque,
    @Size(max = 60) String modele,
    @Size(max = 40) String couleur,
    @Size(max = 20) String immatriculation,
    @Min(1) @Max(8) Integer nbPlaces,
    String proprietaireTelephone,
    MultipartFile photo,
    MultipartFile cni,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cniExpiration,
    MultipartFile permis,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate permisExpiration,
    MultipartFile carteGrise,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate carteGriseExpiration,
    MultipartFile assurance,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate assuranceExpiration,
    MultipartFile photoVehicule,
    MultipartFile selfie) {}
