package cm.mboaride.dto;

import cm.mboaride.dto.UserDtos.VehiculeDto;
import cm.mboaride.enums.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** DTO de l'espace chauffeur et propriétaire. */
public final class ChauffeurDtos {
  private ChauffeurDtos() {}

  public record Disponibilite(@NotNull Boolean disponible, Double lat, Double lng) {}

  public record ModeRamassage(@NotNull Boolean actif, @Min(0) @Max(8) Integer placesLibres,
      @Size(max = 150) String directionLibelle, Double directionLat, Double directionLng) {}

  public record Places(@NotNull @Min(0) @Max(8) Integer placesLibres) {}

  public record Casque(@NotNull Boolean disponible) {}

  public record GainsPeriode(String periode, LocalDateTime debut, int nbCourses, long chiffreAffaires, long commissions,
      long gainsNets, long especesEncaissees) {}

  public record GainJour(LocalDate jour, int nbCourses, long gainsNets) {}

  public record Gains(GainsPeriode jour, GainsPeriode semaine, GainsPeriode mois, List<GainJour> derniersJours, long solde) {}

  public record PointChaud(double lat, double lng, int demandes) {}

  public record DocumentDto(Long id, TypeDocument type, String nomOriginal, LocalDate dateExpiration, StatutDocument statut,
      String motifRejet, LocalDateTime createdAt, boolean expireBientot, boolean expire) {}

  public record ChauffeurFlotte(Long id, String nomComplet, String telephone, String photoUrl, StatutCompte statut,
      Boolean disponible, Double noteMoyenne, VehiculeDto vehicule, int coursesAujourdhui, long gainsSemaine, int coursesSemaine,
      Double lat, Double lng) {}

  public record Flotte(List<VehiculeDto> vehicules, List<ChauffeurFlotte> chauffeurs, long gainsSemaine, int coursesSemaine) {}
}
