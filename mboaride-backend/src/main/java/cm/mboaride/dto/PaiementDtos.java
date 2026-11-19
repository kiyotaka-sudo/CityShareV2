package cm.mboaride.dto;

import cm.mboaride.enums.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/** DTO des paiements, du portefeuille et des retraits. */
public final class PaiementDtos {
  private PaiementDtos() {}

  public record PaiementDto(Long id, String reference, TypePaiement type, Long courseId, Long montant, ModePaiement mode,
      FournisseurPaiement fournisseur, StatutPaiement statut, String paymentUrl, String message, LocalDateTime createdAt) {}

  public record InitPaiement(@Pattern(regexp = "MTN_MOMO|ORANGE_MONEY") String mode, String telephone) {}

  public record Recharge(@NotNull @Min(100) @Max(500000) Long montant, @NotNull @Pattern(regexp = "MTN_MOMO|ORANGE_MONEY") String mode,
      String telephone) {}

  public record TransactionDto(Long id, TypeTransaction type, Long montant, Long soldeApres, String description,
      Long courseId, LocalDateTime createdAt) {}

  public record PortefeuilleDto(Long solde, java.util.List<TransactionDto> transactions) {}

  public record DemandeRetrait(@NotNull @Min(500) Long montant, @NotBlank String telephone, @NotNull Operateur operateur) {}

  public record RetraitDto(Long id, Long chauffeurId, String chauffeurNom, Long montant, String telephone, Operateur operateur,
      FournisseurPaiement fournisseur, StatutRetrait statut, String reference, String message, LocalDateTime createdAt,
      LocalDateTime traiteAt) {}
}
