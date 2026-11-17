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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "notation")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "noteur_id", nullable = false)
  private Utilisateur noteur;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "note_id", nullable = false)
  private Utilisateur note;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_id")
  private Reservation reservation;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "colis_id")
  private Colis colis;

  @Column(name = "note", nullable = false)
  @Min(1)
  @Max(5)
  private Integer noteValeur;
  @Column(columnDefinition = "TEXT")
  private String commentaire;
  @Column(columnDefinition = "jsonb")
  @JdbcTypeCode(SqlTypes.JSON)
  private String criteres;
  @Column(name = "date_notation")
  @Builder.Default
  private LocalDateTime dateNotation = LocalDateTime.now();
}
