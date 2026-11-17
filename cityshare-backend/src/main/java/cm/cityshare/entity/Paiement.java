package cm.cityshare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "paiement")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paiement {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_id", nullable = false)
  private Reservation reservation;

  @Column(nullable = false)
  private Double montant;

  @Builder.Default
  @Column(nullable = false, length = 10)
  private String devise = "XAF";

  @Column(name = "payment_ref", nullable = false, unique = true, length = 100)
  private String paymentRef;

  @Column(name = "monetbil_transaction_id", length = 100)
  private String monetbilTransactionId;

  @Column(length = 50)
  private String operateur;

  @Builder.Default
  @Column(nullable = false, length = 30)
  private String statut = "EN_ATTENTE";

  @Column(name = "payment_url", columnDefinition = "TEXT")
  private String paymentUrl;

  @Column(name = "created_at")
  @Builder.Default
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at")
  @Builder.Default
  private LocalDateTime updatedAt = LocalDateTime.now();
}
