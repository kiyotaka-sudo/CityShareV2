package cm.mboaride.entity;

import cm.mboaride.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.*;

/** Compte utilisateur : client, chauffeur, propriétaire, support ou administrateur. */
@Entity
@Table(name = "utilisateur")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Utilisateur {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, length = 100) private String nom;
  @Column(nullable = false, length = 100) private String prenom;
  @Column(nullable = false, unique = true, length = 20) private String telephone;
  @Column(unique = true, length = 150) private String email;
  @Column(name = "mot_de_passe") private String motDePasse;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role role;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private StatutCompte statut = StatutCompte.ACTIF;
  @Column(length = 1) private String genre;
  @Column(nullable = false, length = 5) @Builder.Default private String langue = "fr";
  @Column(name = "photo_url", length = 500) private String photoUrl;
  @Column(name = "push_token") private String pushToken;
  @Column(name = "note_moyenne", nullable = false) @Builder.Default private Double noteMoyenne = 0.0;
  @Column(name = "nb_notes", nullable = false) @Builder.Default private Integer nbNotes = 0;
  @Column(nullable = false) @Builder.Default private Long solde = 0L;
  @Column(name = "code_parrainage", unique = true, length = 12) private String codeParrainage;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "parrain_id") private Utilisateur parrain;
  @Column(name = "parrainage_recompense", nullable = false) @Builder.Default private Boolean parrainageRecompense = false;
  @Column(name = "consentement_at") private LocalDateTime consentementAt;
  @Column(name = "date_inscription", nullable = false) @Builder.Default private LocalDateTime dateInscription = LocalDateTime.now();
  @Column(name = "derniere_connexion") private LocalDateTime derniereConnexion;
  @Column(name = "supprime_at") private LocalDateTime supprimeAt;

  public String getNomComplet() {
    return (prenom + " " + nom).trim();
  }

  public boolean isChauffeur() {
    return role == Role.CHAUFFEUR;
  }
}
