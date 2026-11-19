package cm.mboaride.service.admin;

import cm.mboaride.dto.AdminDtos.*;
import cm.mboaride.dto.ChauffeurDtos.DocumentDto;
import cm.mboaride.dto.CreationChauffeurForm;
import cm.mboaride.dto.UserDtos.VehiculeDto;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.*;
import cm.mboaride.service.*;
import cm.mboaride.util.Telephones;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Inscription et vérification des chauffeurs par l'administration (BF-03, BF-04, BF-59),
 * gestion des véhicules et des propriétaires (BF-57).
 */
@Service
@RequiredArgsConstructor
public class AdminChauffeurService {
  private final UtilisateurRepository utilisateurRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final VehiculeRepository vehiculeRepository;
  private final DocumentChauffeurRepository documentRepository;
  private final StockageService stockage;
  private final ProfilService profilService;
  private final AuthService authService;
  private final ParametreService parametres;
  private final JournalService journal;
  private final NotificationService notifications;
  private final SmsService smsService;
  private final PositionService positions;

  // ------------------------------------------------------------------ inscription

  @Transactional
  public ChauffeurAdminDto creer(CreationChauffeurForm f) {
    String telephone = Telephones.normaliser(f.telephone());
    Utilisateur u = utilisateurRepository.findByTelephone(telephone).orElse(null);
    if (u != null && u.getRole() != Role.CLIENT) {
      throw ApiException.conflict("chauffeur.telephone_utilise");
    }
    exigerFichier(f.cni(), "CNI");
    exigerFichier(f.permis(), "permis");
    exigerFichier(f.carteGrise(), "carte grise");
    exigerFichier(f.assurance(), "assurance");
    exigerFichier(f.photoVehicule(), "photo du véhicule");
    exigerFichier(f.selfie(), "selfie");
    if (f.email() != null && !f.email().isBlank()) {
      utilisateurRepository.findByEmailIgnoreCase(f.email().trim())
          .filter(o -> u == null || !o.getId().equals(u.getId()))
          .ifPresent(o -> { throw ApiException.conflict("profil.email_utilise"); });
    }

    Utilisateur user = u != null ? u : Utilisateur.builder().telephone(telephone).codeParrainage(authService.nouveauCodeParrainage())
        .consentementAt(LocalDateTime.now()).build();
    user.setNom(f.nom().trim());
    user.setPrenom(f.prenom().trim());
    user.setEmail(f.email() == null || f.email().isBlank() ? user.getEmail() : f.email().trim().toLowerCase());
    user.setGenre(f.genre());
    user.setRole(Role.CHAUFFEUR);
    user.setStatut(StatutCompte.INACTIF); // BF-04 : inactif tant que les documents ne sont pas validés
    if (f.photo() != null && !f.photo().isEmpty()) {
      user.setPhotoUrl(stockage.enregistrerPhoto(f.photo(), "profils"));
    }
    user = utilisateurRepository.save(user);

    Vehicule vehicule = vehiculePour(f, user);
    Chauffeur ch = Chauffeur.builder().utilisateur(user).vehicule(vehicule).typeService(f.typeService())
        .casqueDisponible(Boolean.TRUE.equals(f.casqueDisponible())).build();
    ch = chauffeurRepository.save(ch);

    ajouterDocument(ch, TypeDocument.CNI, f.cni(), f.cniExpiration());
    ajouterDocument(ch, TypeDocument.PERMIS, f.permis(), f.permisExpiration());
    ajouterDocument(ch, TypeDocument.CARTE_GRISE, f.carteGrise(), f.carteGriseExpiration());
    ajouterDocument(ch, TypeDocument.ASSURANCE, f.assurance(), f.assuranceExpiration());
    ajouterDocument(ch, TypeDocument.PHOTO_VEHICULE, f.photoVehicule(), null);
    ajouterDocument(ch, TypeDocument.SELFIE, f.selfie(), null);
    if (vehicule.getPhotoUrl() == null) {
      vehicule.setPhotoUrl(stockage.enregistrerPhoto(f.photoVehicule(), "vehicules"));
    }
    journal.tracer("CREATION_CHAUFFEUR", "UTILISATEUR", user.getId(), user.getNomComplet() + " — " + telephone);
    return detail(user.getId());
  }

  private Vehicule vehiculePour(CreationChauffeurForm f, Utilisateur chauffeur) {
    if (f.vehiculeId() != null) {
      Vehicule v = vehiculeRepository.findById(f.vehiculeId()).orElseThrow(() -> ApiException.notFound("vehicule.introuvable"));
      if (v.getTypeVehicule() != f.typeService()) {
        throw ApiException.badRequest("vehicule.type_incompatible");
      }
      return v;
    }
    if (f.marque() == null || f.marque().isBlank() || f.immatriculation() == null || f.immatriculation().isBlank()) {
      throw ApiException.badRequest("vehicule.informations_requises");
    }
    String immat = f.immatriculation().trim().toUpperCase();
    if (vehiculeRepository.existsByImmatriculationIgnoreCase(immat)) {
      throw ApiException.conflict("vehicule.immatriculation_utilisee");
    }
    Utilisateur proprietaire = chauffeur;
    if (f.proprietaireTelephone() != null && !f.proprietaireTelephone().isBlank()) {
      proprietaire = utilisateurRepository.findByTelephone(Telephones.normaliser(f.proprietaireTelephone()))
          .filter(p -> p.getRole() == Role.PROPRIETAIRE || p.getRole() == Role.CHAUFFEUR)
          .orElseThrow(() -> ApiException.notFound("proprietaire.introuvable"));
    }
    int places = f.typeService() == TypeVehicule.MOTO ? 1 : (f.nbPlaces() == null ? 4 : f.nbPlaces());
    return vehiculeRepository.save(Vehicule.builder().proprietaire(proprietaire).typeVehicule(f.typeService())
        .marque(f.marque().trim()).modele(f.modele()).couleur(f.couleur()).immatriculation(immat).nbPlaces(places).build());
  }

  private static void exigerFichier(MultipartFile f, String libelle) {
    if (f == null || f.isEmpty()) {
      throw ApiException.badRequest("chauffeur.document_manquant", libelle);
    }
  }

  private DocumentChauffeur ajouterDocument(Chauffeur ch, TypeDocument type, MultipartFile fichier, LocalDate expiration) {
    String chemin = stockage.enregistrerDocument(fichier, ch.getId());
    return documentRepository.save(DocumentChauffeur.builder().chauffeur(ch).type(type).fichier(chemin)
        .nomOriginal(fichier.getOriginalFilename()).contentType(fichier.getContentType()).dateExpiration(expiration).build());
  }

  /** Remplacement ou ajout d'une pièce (renouvellement d'assurance, de permis…). */
  @Transactional
  public ChauffeurAdminDto ajouterPiece(Long chauffeurId, TypeDocument type, MultipartFile fichier, LocalDate expiration) {
    Chauffeur ch = chauffeur(chauffeurId);
    exigerFichier(fichier, type.name());
    ajouterDocument(ch, type, fichier, expiration);
    journal.tracer("AJOUT_DOCUMENT", "UTILISATEUR", chauffeurId, type.name());
    return detail(chauffeurId);
  }

  // ------------------------------------------------------------------ vérification

  @Transactional
  public ChauffeurAdminDto deciderDocument(Long documentId, DecisionDocument req) {
    DocumentChauffeur d = documentRepository.findById(documentId).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    if (req.statut() == StatutDocument.REJETE && (req.motif() == null || req.motif().isBlank())) {
      throw ApiException.badRequest("document.motif_requis");
    }
    d.setStatut(req.statut());
    d.setMotifRejet(req.statut() == StatutDocument.REJETE ? req.motif() : null);
    d.setVerifieAt(LocalDateTime.now());
    if (req.dateExpiration() != null) {
      d.setDateExpiration(req.dateExpiration());
      d.setRappelEnvoye(false);
    }
    journal.tracer("DECISION_DOCUMENT", "DOCUMENT", documentId, d.getType() + " → " + req.statut()
        + (req.motif() == null ? "" : " (" + req.motif() + ")"));
    if (req.statut() == StatutDocument.REJETE) {
      notifications.notifier(d.getChauffeur().getId(), "document_rejete", null, true, d.getType().name(), req.motif());
    }
    return detail(d.getChauffeur().getId());
  }

  /** Activation, suspension ou réactivation d'un compte chauffeur (BF-59). */
  @Transactional
  public ChauffeurAdminDto changerStatut(Long chauffeurId, ChangementStatut req) {
    Chauffeur ch = chauffeur(chauffeurId);
    Utilisateur u = ch.getUtilisateur();
    if (req.statut() == StatutCompte.ACTIF) {
      if (!profilService.documentsAJour(chauffeurId)) {
        throw ApiException.badRequest("chauffeur.documents_invalides");
      }
      if (ch.getVehicule() == null) {
        throw ApiException.badRequest("chauffeur.sans_vehicule");
      }
      boolean premiereActivation = ch.getValideAt() == null;
      u.setStatut(StatutCompte.ACTIF);
      ch.setValideAt(LocalDateTime.now());
      if (premiereActivation) {
        smsService.envoyer(u.getTelephone(), notifications.texte(u, "sms.chauffeur_active", u.getPrenom()));
      } else {
        notifications.notifier(u.getId(), "compte_reactive", null, true);
      }
    } else if (req.statut() == StatutCompte.SUSPENDU) {
      u.setStatut(StatutCompte.SUSPENDU);
      ch.setDisponible(false);
      ch.setModeRamassage(false);
      positions.oublier(chauffeurId);
      notifications.notifier(u.getId(), "compte_suspendu", null, true, req.motif() == null ? "" : req.motif());
    } else {
      throw ApiException.badRequest("statut.invalide");
    }
    journal.tracer("STATUT_CHAUFFEUR", "UTILISATEUR", chauffeurId, req.statut() + (req.motif() == null ? "" : " : " + req.motif()));
    return detail(chauffeurId);
  }

  @Transactional
  public ChauffeurAdminDto affecterVehicule(Long chauffeurId, Long vehiculeId) {
    Chauffeur ch = chauffeur(chauffeurId);
    if (vehiculeId == null) {
      ch.setVehicule(null);
      ch.setDisponible(false);
    } else {
      Vehicule v = vehiculeRepository.findById(vehiculeId).orElseThrow(() -> ApiException.notFound("vehicule.introuvable"));
      if (v.getTypeVehicule() != ch.getTypeService()) {
        throw ApiException.badRequest("vehicule.type_incompatible");
      }
      ch.setVehicule(v);
    }
    journal.tracer("AFFECTATION_VEHICULE", "UTILISATEUR", chauffeurId, String.valueOf(vehiculeId));
    return detail(chauffeurId);
  }

  // ------------------------------------------------------------------ consultation

  @Transactional(readOnly = true)
  public List<ChauffeurAdminDto> liste() {
    return chauffeurRepository.findAllWithUtilisateur().stream().map(ch -> toDto(ch, false)).toList();
  }

  @Transactional(readOnly = true)
  public ChauffeurAdminDto detail(Long id) {
    return toDto(chauffeur(id), true);
  }

  @Transactional(readOnly = true)
  public DocumentChauffeur document(Long documentId) {
    return documentRepository.findById(documentId).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
  }

  public Resource fichier(DocumentChauffeur d) {
    journal.tracer("CONSULTATION_DOCUMENT", "DOCUMENT", d.getId(), d.getType().name());
    return stockage.lire(d.getFichier());
  }

  private ChauffeurAdminDto toDto(Chauffeur ch, boolean avecDocuments) {
    Utilisateur u = ch.getUtilisateur();
    List<DocumentChauffeur> docs = documentRepository.findByChauffeurIdOrderByCreatedAtDesc(ch.getId());
    int rappel = (int) parametres.entier(ParametreService.RAPPEL_DOCUMENTS);
    List<DocumentDto> documents = avecDocuments ? docs.stream().map(d -> ChauffeurService.documentDto(d, rappel)).toList() : null;
    return new ChauffeurAdminDto(u.getId(), u.getNom(), u.getPrenom(), u.getTelephone(), u.getEmail(), u.getGenre(),
        u.getStatut(), ch.getTypeService(), ch.getDisponible(), ch.getModeRamassage(), u.getNoteMoyenne(), u.getNbNotes(),
        u.getSolde(), ch.getVehicule() == null ? null : ProfilService.vehiculeDto(ch.getVehicule()),
        profilService.documentsAJour(ch.getId()), docs.stream().filter(d -> d.getStatut() == StatutDocument.EN_ATTENTE).count(),
        u.getDateInscription(), ch.getValideAt(), u.getPhotoUrl(), documents);
  }

  private Chauffeur chauffeur(Long id) {
    return chauffeurRepository.findById(id).orElseThrow(() -> ApiException.notFound("chauffeur.introuvable"));
  }

  // ------------------------------------------------------------------ véhicules et propriétaires

  @Transactional(readOnly = true)
  public List<VehiculeDto> vehicules() {
    return vehiculeRepository.findAll().stream().map(ProfilService::vehiculeDto).toList();
  }

  @Transactional
  public VehiculeDto creerVehicule(CreationVehicule req) {
    String immat = req.immatriculation().trim().toUpperCase();
    if (vehiculeRepository.existsByImmatriculationIgnoreCase(immat)) {
      throw ApiException.conflict("vehicule.immatriculation_utilisee");
    }
    Utilisateur proprietaire = utilisateurRepository.findByTelephone(Telephones.normaliser(req.proprietaireTelephone()))
        .filter(p -> p.getRole() == Role.PROPRIETAIRE || p.getRole() == Role.CHAUFFEUR)
        .orElseThrow(() -> ApiException.notFound("proprietaire.introuvable"));
    Vehicule v = vehiculeRepository.save(Vehicule.builder().proprietaire(proprietaire).typeVehicule(req.typeVehicule())
        .marque(req.marque().trim()).modele(req.modele()).couleur(req.couleur()).immatriculation(immat)
        .nbPlaces(req.typeVehicule() == TypeVehicule.MOTO ? 1 : (req.nbPlaces() == null ? 4 : req.nbPlaces())).build());
    journal.tracer("CREATION_VEHICULE", "VEHICULE", v.getId(), immat);
    return ProfilService.vehiculeDto(v);
  }

  @Transactional
  public VehiculeDto activerVehicule(Long id, boolean actif) {
    Vehicule v = vehiculeRepository.findById(id).orElseThrow(() -> ApiException.notFound("vehicule.introuvable"));
    v.setActif(actif);
    journal.tracer(actif ? "ACTIVATION_VEHICULE" : "DESACTIVATION_VEHICULE", "VEHICULE", id, v.getImmatriculation());
    return ProfilService.vehiculeDto(v);
  }

  @Transactional
  public UtilisateurAdminDto creerProprietaire(CreationProprietaire req) {
    String telephone = Telephones.normaliser(req.telephone());
    Utilisateur u = utilisateurRepository.findByTelephone(telephone).orElse(null);
    if (u != null && u.getRole() != Role.CLIENT) {
      throw ApiException.conflict("chauffeur.telephone_utilise");
    }
    if (u == null) {
      u = Utilisateur.builder().telephone(telephone).codeParrainage(authService.nouveauCodeParrainage())
          .consentementAt(LocalDateTime.now()).build();
    }
    u.setNom(req.nom().trim());
    u.setPrenom(req.prenom().trim());
    u.setEmail(req.email() == null || req.email().isBlank() ? u.getEmail() : req.email().trim().toLowerCase());
    u.setRole(Role.PROPRIETAIRE);
    u.setStatut(StatutCompte.ACTIF);
    u = utilisateurRepository.save(u);
    journal.tracer("CREATION_PROPRIETAIRE", "UTILISATEUR", u.getId(), u.getNomComplet());
    return new UtilisateurAdminDto(u.getId(), u.getNom(), u.getPrenom(), u.getTelephone(), u.getEmail(), u.getRole(),
        u.getStatut(), u.getNoteMoyenne(), u.getNbNotes(), u.getSolde(), u.getDateInscription(), u.getDerniereConnexion(), 0);
  }
}
