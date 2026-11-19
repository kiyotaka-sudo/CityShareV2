package cm.mboaride.dto;

import cm.mboaride.enums.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/** DTO sécurité, réclamations et repères. */
public final class SupportDtos {
  private SupportDtos() {}

  public record SosRequest(Long courseId, Double lat, Double lng) {}

  public record AlerteDto(Long id, TypeAlerte type, StatutAlerte statut, Double lat, Double lng, Long courseId,
      String courseReference, Long declencheurId, String declencheurNom, String declencheurTelephone, String chauffeurNom,
      String chauffeurTelephone, String immatriculation, String notes, Integer contactsNotifies, LocalDateTime createdAt,
      LocalDateTime resolueAt, String lienSuivi) {}

  public record PartageDto(String lien, String message) {}

  public record ReclamationRequest(Long courseId, @NotNull TypeReclamation type, @NotBlank @Size(max = 2000) String description) {}

  public record ReclamationDto(Long id, String numero, Long courseId, String courseReference, TypeReclamation type,
      String description, StatutReclamation statut, String reponse, Long auteurId, String auteurNom, String auteurTelephone,
      LocalDateTime createdAt, LocalDateTime updatedAt) {}

  public record RepereDto(Long id, String nom, String description, CategorieRepere categorie, String ville, Double lat,
      Double lng, StatutRepere statut, Integer nbUtilisations, String proposePar, LocalDateTime createdAt) {}

  public record PropositionRepere(@NotBlank @Size(max = 150) String nom, @Size(max = 255) String description,
      @NotNull CategorieRepere categorie, @NotBlank @Size(max = 60) String ville, @NotNull Double lat, @NotNull Double lng) {}
}
