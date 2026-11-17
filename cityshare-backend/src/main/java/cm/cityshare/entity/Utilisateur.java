package cm.cityshare.entity;

import cm.cityshare.enums.RoleEnum;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "utilisateur")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "dtype")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utilisateur {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 100)
  private String nom;

  @Column(nullable = false, length = 100)
  private String prenom;

  @Column(unique = true, nullable = false, length = 20)
  private String telephone;

  @Column(unique = true, length = 150)
  private String email;

  @Column(name = "mot_de_passe", nullable = false)
  private String motDePasse;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private RoleEnum role;

  @Column(name = "photo_url", columnDefinition = "TEXT")
  private String photoUrl;

  @Column(name = "note_moyenne")
  private Double noteMoyenne = 0.0;

  @Column(length = 20)
  private String statut = "ACTIF";

  @Column(name = "date_inscription")
  private LocalDateTime dateInscription = LocalDateTime.now();

  @Column(name = "fcm_token", length = 500)
  private String fcmToken;

  @Column(name = "preferred_lang", length = 5)
  private String preferredLang = "fr";
}
