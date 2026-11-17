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
@Table(name = "message")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "expediteur_id", nullable = false)
  private Utilisateur expediteur;
  @ManyToOne(fetch = FetchType.EAGER)
  @JoinColumn(name = "destinataire_id", nullable = false)
  private Utilisateur destinataire;
  @Column(nullable = false, columnDefinition = "TEXT")
  private String contenu;
  @Column(name = "date_envoi")
  @Builder.Default
  private LocalDateTime dateEnvoi = LocalDateTime.now();
  @Column(nullable = false)
  @Builder.Default
  private Boolean lu = false;
  @Column(name = "conversation_id", nullable = false, length = 100)
  private String conversationId;
}
