package cm.mboaride.service;

import cm.mboaride.dto.UserDtos.*;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.*;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.util.Telephones;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Profil, contacts de confiance, lieux favoris, notifications et droits sur les données (BF-02, BF-05, BF-35). */
@Service
@RequiredArgsConstructor
public class ProfilService {
  private static final EnumSet<TypeDocument> DOCUMENTS_OBLIGATOIRES =
      EnumSet.of(TypeDocument.CNI, TypeDocument.PERMIS, TypeDocument.CARTE_GRISE, TypeDocument.ASSURANCE);

  private final UtilisateurRepository utilisateurRepository;
  private final ChauffeurRepository chauffeurRepository;
  private final VehiculeRepository vehiculeRepository;
  private final DocumentChauffeurRepository documentRepository;
  private final ContactConfianceRepository contactRepository;
  private final LieuFavoriRepository lieuRepository;
  private final NotificationRepository notificationRepository;
  private final CourseRepository courseRepository;
  private final TransactionPortefeuilleRepository transactionRepository;
  private final StockageService stockage;
  private final CurrentUser currentUser;

  // ------------------------------------------------------------------ mapping

  @Transactional(readOnly = true)
  public UtilisateurDto toDto(Utilisateur u) {
    ChauffeurInfo info = null;
    if (u.getRole() == Role.CHAUFFEUR) {
      info = chauffeurRepository.findById(u.getId()).map(this::chauffeurInfo).orElse(null);
    }
    boolean proprietaire = u.getRole() == Role.PROPRIETAIRE
        || (u.getRole() == Role.CHAUFFEUR && !vehiculeRepository.findByProprietaireIdOrderByCreatedAtDesc(u.getId()).isEmpty());
    return new UtilisateurDto(u.getId(), u.getNom(), u.getPrenom(), u.getTelephone(), u.getEmail(), u.getRole(),
        u.getStatut(), u.getGenre(), u.getLangue(), u.getPhotoUrl(), arrondi(u.getNoteMoyenne()), u.getNbNotes(),
        u.getSolde(), u.getCodeParrainage(), u.getDateInscription(), proprietaire, info);
  }

  public ChauffeurInfo chauffeurInfo(Chauffeur c) {
    return new ChauffeurInfo(c.getTypeService(), c.getDisponible(), c.getModeRamassage(), c.getPlacesLibres(),
        c.getDirectionLibelle(), c.getDirectionLat(), c.getDirectionLng(), c.getCasqueDisponible(),
        c.getLatitude(), c.getLongitude(), c.getVehicule() == null ? null : vehiculeDto(c.getVehicule()),
        documentsAJour(c.getId()));
  }

  public static VehiculeDto vehiculeDto(Vehicule v) {
    return new VehiculeDto(v.getId(), v.getTypeVehicule(), v.getMarque(), v.getModele(), v.getCouleur(),
        v.getImmatriculation(), v.getNbPlaces(), v.getPhotoUrl(), v.getActif(), v.getProprietaire().getId(),
        v.getProprietaire().getNomComplet());
  }

  /** Les quatre pièces réglementaires sont validées et non expirées. */
  public boolean documentsAJour(Long chauffeurId) {
    List<DocumentChauffeur> docs = documentRepository.findByChauffeurIdOrderByCreatedAtDesc(chauffeurId);
    LocalDate aujourdhui = LocalDate.now();
    return DOCUMENTS_OBLIGATOIRES.stream().allMatch(type -> docs.stream()
        .anyMatch(d -> d.getType() == type && d.getStatut() == StatutDocument.VALIDE
            && (d.getDateExpiration() == null || !d.getDateExpiration().isBefore(aujourdhui))));
  }

  private static Double arrondi(Double note) {
    return note == null ? 0.0 : Math.round(note * 10) / 10.0;
  }

  // ------------------------------------------------------------------ profil

  @Transactional(readOnly = true)
  public UtilisateurDto moi() {
    return toDto(currentUser.get());
  }

  @Transactional
  public UtilisateurDto modifier(ProfilUpdate req) {
    Utilisateur u = currentUser.get();
    if (req.nom() != null) u.setNom(req.nom().trim());
    if (req.prenom() != null) u.setPrenom(req.prenom().trim());
    if (req.langue() != null) u.setLangue(req.langue());
    if (req.genre() != null && u.getRole() == Role.CLIENT) u.setGenre(req.genre());
    if (req.email() != null) {
      String email = req.email().isBlank() ? null : req.email().trim().toLowerCase();
      if (email != null) {
        utilisateurRepository.findByEmailIgnoreCase(email).filter(o -> !o.getId().equals(u.getId()))
            .ifPresent(o -> { throw ApiException.conflict("profil.email_utilise"); });
      }
      u.setEmail(email);
    }
    return toDto(u);
  }

  @Transactional
  public UtilisateurDto changerPhoto(MultipartFile fichier) {
    Utilisateur u = currentUser.get();
    String ancienne = u.getPhotoUrl();
    u.setPhotoUrl(stockage.enregistrerPhoto(fichier, "profils"));
    stockage.supprimer(ancienne);
    return toDto(u);
  }

  @Transactional
  public void enregistrerPushToken(String token) {
    currentUser.get().setPushToken(token);
  }

  // ------------------------------------------------------------------ contacts de confiance

  @Transactional(readOnly = true)
  public List<ContactDto> contacts() {
    return contactRepository.findByUtilisateurId(currentUser.id()).stream()
        .map(c -> new ContactDto(c.getId(), c.getNom(), c.getTelephone())).toList();
  }

  @Transactional
  public ContactDto ajouterContact(ContactDto req) {
    Long userId = currentUser.id();
    if (contactRepository.findByUserIdCount(userId) >= 5) {
      throw ApiException.badRequest("contact.max");
    }
    ContactConfiance c = contactRepository.save(ContactConfiance.builder().utilisateur(currentUser.get())
        .nom(req.nom().trim()).telephone(Telephones.normaliser(req.telephone())).build());
    return new ContactDto(c.getId(), c.getNom(), c.getTelephone());
  }

  @Transactional
  public void supprimerContact(Long id) {
    ContactConfiance c = contactRepository.findById(id).filter(x -> x.getUtilisateur().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    contactRepository.delete(c);
  }

  // ------------------------------------------------------------------ lieux favoris

  @Transactional(readOnly = true)
  public List<LieuDto> lieux() {
    return lieuRepository.findByUtilisateurIdOrderByLibelle(currentUser.id()).stream().map(ProfilService::lieuDto).toList();
  }

  @Transactional
  public LieuDto enregistrerLieu(LieuDto req) {
    Utilisateur u = currentUser.get();
    LieuFavori lieu = req.id() == null ? new LieuFavori()
        : lieuRepository.findById(req.id()).filter(l -> l.getUtilisateur().getId().equals(u.getId()))
            .orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    lieu.setUtilisateur(u);
    lieu.setLibelle(req.libelle().trim());
    lieu.setType(req.type());
    lieu.setAdresse(req.adresse().trim());
    lieu.setLatitude(req.latitude());
    lieu.setLongitude(req.longitude());
    return lieuDto(lieuRepository.save(lieu));
  }

  @Transactional
  public void supprimerLieu(Long id) {
    LieuFavori l = lieuRepository.findById(id).filter(x -> x.getUtilisateur().getId().equals(currentUser.id()))
        .orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    lieuRepository.delete(l);
  }

  private static LieuDto lieuDto(LieuFavori l) {
    return new LieuDto(l.getId(), l.getLibelle(), l.getType(), l.getAdresse(), l.getLatitude(), l.getLongitude());
  }

  // ------------------------------------------------------------------ notifications

  @Transactional(readOnly = true)
  public List<NotificationDto> notifications() {
    return notificationRepository.findByUtilisateurIdOrderByCreatedAtDesc(currentUser.id(), PageRequest.of(0, 50))
        .map(n -> new NotificationDto(n.getId(), n.getTitre(), n.getCorps(), n.getType(), n.getLu(), n.getCourseId(), n.getCreatedAt()))
        .getContent();
  }

  @Transactional
  public void marquerNotificationsLues() {
    notificationRepository.marquerToutesLues(currentUser.id());
  }

  // ------------------------------------------------------------------ données personnelles (loi 2024/017)

  @Transactional(readOnly = true)
  public ExportDonnees exporter() {
    Utilisateur u = currentUser.get();
    List<Object> courses = new ArrayList<>();
    courseRepository.findByClientIdOrderByCreatedAtDesc(u.getId(), PageRequest.of(0, 1000)).forEach(c -> courses.add(Map.of(
        "reference", c.getReference(), "date", c.getCreatedAt().toString(), "service", c.getTypeService().name(),
        "depart", c.getDepartAdresse(), "arrivee", c.getArriveeAdresse(), "statut", c.getStatut().name(),
        "prix", c.getMontantAPayer())));
    List<Object> transactions = new ArrayList<>();
    transactionRepository.findByUtilisateurIdOrderByCreatedAtDesc(u.getId(), PageRequest.of(0, 1000)).forEach(t -> transactions.add(Map.of(
        "date", t.getCreatedAt().toString(), "type", t.getType().name(), "montant", t.getMontant(), "solde", t.getSoldeApres())));
    return new ExportDonnees(toDto(u), contacts(), lieux(), courses, transactions, LocalDateTime.now());
  }

  /** Effacement du compte : les données personnelles sont anonymisées, l'historique comptable est conservé. */
  @Transactional
  public void supprimerCompte() {
    Utilisateur u = currentUser.get();
    var actives = EnumSet.of(StatutCourse.RECHERCHE, StatutCourse.ACCEPTEE, StatutCourse.CHAUFFEUR_ARRIVE, StatutCourse.EN_COURS);
    if (!courseRepository.findByClientIdAndStatutIn(u.getId(), actives).isEmpty()
        || !courseRepository.findByChauffeurIdAndStatutIn(u.getId(), actives).isEmpty()) {
      throw ApiException.badRequest("compte.course_en_cours");
    }
    if (u.getSolde() > 0) {
      throw ApiException.badRequest("compte.solde_positif", u.getSolde());
    }
    anonymiser(u);
  }

  public void anonymiser(Utilisateur u) {
    contactRepository.deleteByUtilisateurId(u.getId());
    lieuRepository.deleteByUtilisateurId(u.getId());
    stockage.supprimer(u.getPhotoUrl());
    chauffeurRepository.findById(u.getId()).ifPresent(c -> {
      c.setDisponible(false);
      c.setLatitude(null);
      c.setLongitude(null);
    });
    u.setNom("Compte");
    u.setPrenom("supprimé");
    u.setTelephone("DEL-" + u.getId());
    u.setEmail(null);
    u.setPhotoUrl(null);
    u.setPushToken(null);
    u.setMotDePasse(null);
    u.setCodeParrainage(null);
    u.setStatut(StatutCompte.SUPPRIME);
    u.setSupprimeAt(LocalDateTime.now());
  }
}
