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
@Table(name = "alerte_sos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlerteSOS {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "declencheur_id", nullable = false)
  private Utilisateur declencheur;
  private Double latitude;
  private Double longitude;
  @Column(name = "adresse_approx", length = 300)
  private String adresseApprox;
  @Column(name = "contact_notifie")
  @Builder.Default
  private Boolean contactNotifie = false;
  @Column(name = "date_alerte")
  @Builder.Default
  private LocalDateTime dateAlerte = LocalDateTime.now();
  @Column(length = 50)
  private String type;
}
