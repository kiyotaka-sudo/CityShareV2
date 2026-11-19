package cm.mboaride.service;

import cm.mboaride.dto.ChauffeurDtos.*;
import cm.mboaride.dto.CourseDtos.DemandeChauffeurDto;
import cm.mboaride.dto.UserDtos.UtilisateurDto;
import cm.mboaride.dto.UserDtos.VehiculeDto;
import cm.mboaride.entity.*;
import cm.mboaride.enums.*;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.*;
import cm.mboaride.security.CurrentUser;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Espace chauffeur (section 5.11) et suivi de flotte du propriétaire (BF-57). */
@Service
@RequiredArgsConstructor
public class ChauffeurService {
  private final ChauffeurRepository chauffeurRepository;
  private final VehiculeRepository vehiculeRepository;
  private final CourseRepository courseRepository;
  private final DocumentChauffeurRepository documentRepository;
  private final DispatchService dispatch;
  private final PositionService positions;
  private final ParametreService parametres;
  private final ProfilService profilService;
  private final CurrentUser currentUser;

  Chauffeur moi() {
    return chauffeurRepository.findById(currentUser.id()).orElseThrow(() -> ApiException.forbidden("chauffeur.profil_absent"));
  }

  /** Passage disponible / indisponible en un geste (BF-53), avec les contrôles réglementaires. */
  @Transactional
  public UtilisateurDto disponibilite(Disponibilite req) {
    Chauffeur ch = moi();
    Utilisateur u = ch.getUtilisateur();
    if (Boolean.TRUE.equals(req.disponible())) {
      if (u.getStatut() == StatutCompte.INACTIF) {
        throw ApiException.forbidden("chauffeur.en_attente_validation"); // BF-04
      }
      if (u.getStatut() != StatutCompte.ACTIF) {
        throw ApiException.forbidden("chauffeur.compte_inactif");
      }
      if (ch.getVehicule() == null || !ch.getVehicule().getActif()) {
        throw ApiException.badRequest("chauffeur.sans_vehicule");
      }
      if (!profilService.documentsAJour(ch.getId())) {
        throw ApiException.badRequest("chauffeur.documents_invalides");
      }
      if (u.getSolde() < parametres.entier(ParametreService.SOLDE_MIN_CHAUFFEUR)) {
        throw ApiException.badRequest("chauffeur.solde_insuffisant", u.getSolde()); // commissions espèces impayées
      }
      if (req.lat() != null && req.lng() != null) {
        positions.mettreAJour(ch, req.lat(), req.lng());
      }
      ch.setDisponible(true);
    } else {
      ch.setDisponible(false);
      ch.setModeRamassage(false);
    }
    return profilService.toDto(u);
  }

  /** Mode ramassage : places libres et direction générale (BF-16). */
  @Transactional
  public UtilisateurDto modeRamassage(ModeRamassage req) {
    Chauffeur ch = moi();
    if (ch.isMoto()) {
      throw ApiException.badRequest("ramassage.taxi_uniquement");
    }
    if (Boolean.TRUE.equals(req.actif())) {
      int capacite = ch.getVehicule() == null ? 4 : ch.getVehicule().getNbPlaces();
      if (req.placesLibres() == null || req.placesLibres() < 1 || req.placesLibres() > capacite) {
        throw ApiException.badRequest("ramassage.places_invalides", capacite);
      }
      if (req.directionLat() == null || req.directionLng() == null) {
        throw ApiException.badRequest("ramassage.direction_requise");
      }
      if (dispatch.aUneCourseActive(ch.getId()) && !ch.getModeRamassage()) {
        throw ApiException.badRequest("ramassage.course_privee_en_cours");
      }
      ch.setModeRamassage(true);
      ch.setPlacesLibres(req.placesLibres());
      ch.setDirectionLibelle(req.directionLibelle());
      ch.setDirectionLat(req.directionLat());
      ch.setDirectionLng(req.directionLng());
    } else {
      ch.setModeRamassage(false);
    }
    return profilService.toDto(ch.getUtilisateur());
  }

  @Transactional
  public UtilisateurDto ajusterPlaces(int places) {
    Chauffeur ch = moi();
    int capacite = ch.getVehicule() == null ? 4 : ch.getVehicule().getNbPlaces();
    ch.setPlacesLibres(Math.max(0, Math.min(capacite, places)));
    return profilService.toDto(ch.getUtilisateur());
  }

  @Transactional
  public UtilisateurDto casque(boolean disponible) {
    Chauffeur ch = moi();
    ch.setCasqueDisponible(disponible);
    return profilService.toDto(ch.getUtilisateur());
  }

  /** Demandes reçues : prix proposé, distance de prise en charge, destination (BF-54). */
  @Transactional(readOnly = true)
  public List<DemandeChauffeurDto> demandes() {
    return dispatch.demandesPour(moi());
  }

  // ------------------------------------------------------------------ gains (BF-55)

  @Transactional(readOnly = true)
  public Gains gains() {
    Long id = currentUser.id();
    LocalDate aujourdhui = LocalDate.now();
    LocalDateTime debutJour = aujourdhui.atStartOfDay();
    LocalDateTime debutSemaine = aujourdhui.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
    LocalDateTime debutMois = aujourdhui.withDayOfMonth(1).atStartOfDay();
    LocalDateTime debut30 = aujourdhui.minusDays(29).atStartOfDay();
    LocalDateTime debutPlusAncien = debutMois.isBefore(debut30) ? debutMois : debut30;
    List<Course> courses = courseRepository.findTermineesChauffeur(id, debutPlusAncien, LocalDateTime.now().plusMinutes(1));

    Map<LocalDate, List<Course>> parJour = courses.stream().collect(Collectors.groupingBy(c -> c.getFinAt().toLocalDate()));
    List<GainJour> jours = new ArrayList<>();
    for (int i = 29; i >= 0; i--) {
      LocalDate j = aujourdhui.minusDays(i);
      List<Course> cs = parJour.getOrDefault(j, List.of());
      jours.add(new GainJour(j, cs.size(), cs.stream().mapToLong(c -> nz(c.getGainChauffeur())).sum()));
    }
    long solde = moi().getUtilisateur().getSolde();
    return new Gains(periode("JOUR", debutJour, courses), periode("SEMAINE", debutSemaine, courses),
        periode("MOIS", debutMois, courses), jours, solde);
  }

  static GainsPeriode periode(String nom, LocalDateTime debut, List<Course> courses) {
    List<Course> cs = courses.stream().filter(c -> !c.getFinAt().isBefore(debut)).toList();
    return new GainsPeriode(nom, debut, cs.size(),
        cs.stream().mapToLong(c -> nz(c.getPrixFinal())).sum(),
        cs.stream().mapToLong(c -> nz(c.getCommission())).sum(),
        cs.stream().mapToLong(c -> nz(c.getGainChauffeur())).sum(),
        cs.stream().filter(c -> c.getModePaiement() == ModePaiement.ESPECES).mapToLong(Course::getMontantAPayer).sum());
  }

  private static long nz(Long v) {
    return v == null ? 0 : v;
  }

  // ------------------------------------------------------------------ zones de forte demande (BF-56)

  /** Agrégation des demandes de la dernière heure sur une grille d'environ 1 km. */
  @Transactional(readOnly = true)
  public List<PointChaud> zonesDemande() {
    Map<String, int[]> cellules = new HashMap<>();
    Map<String, double[]> centres = new HashMap<>();
    for (Course c : courseRepository.findDemandesDepuis(LocalDateTime.now().minusHours(1))) {
      double lat = Math.round(c.getDepartLat() * 100) / 100.0;
      double lng = Math.round(c.getDepartLng() * 100) / 100.0;
      String cle = lat + "," + lng;
      cellules.computeIfAbsent(cle, k -> new int[1])[0]++;
      centres.putIfAbsent(cle, new double[] {lat, lng});
    }
    return cellules.entrySet().stream()
        .map(e -> new PointChaud(centres.get(e.getKey())[0], centres.get(e.getKey())[1], e.getValue()[0]))
        .sorted(Comparator.comparingInt(PointChaud::demandes).reversed())
        .limit(60)
        .toList();
  }

  // ------------------------------------------------------------------ documents (BF-06)

  @Transactional(readOnly = true)
  public List<DocumentDto> documents() {
    return documentRepository.findByChauffeurIdOrderByCreatedAtDesc(currentUser.id()).stream()
        .map(d -> documentDto(d, (int) parametres.entier(ParametreService.RAPPEL_DOCUMENTS))).toList();
  }

  public static DocumentDto documentDto(DocumentChauffeur d, int joursRappel) {
    LocalDate today = LocalDate.now();
    boolean expire = d.getDateExpiration() != null && d.getDateExpiration().isBefore(today);
    boolean bientot = d.getDateExpiration() != null && !expire && !d.getDateExpiration().isAfter(today.plusDays(joursRappel));
    return new DocumentDto(d.getId(), d.getType(), d.getNomOriginal(), d.getDateExpiration(), d.getStatut(), d.getMotifRejet(),
        d.getCreatedAt(), bientot, expire);
  }

  // ------------------------------------------------------------------ flotte du propriétaire (BF-57)

  @Transactional(readOnly = true)
  public Flotte flotte() {
    Long proprietaireId = currentUser.id();
    List<VehiculeDto> vehicules = vehiculeRepository.findByProprietaireIdOrderByCreatedAtDesc(proprietaireId).stream()
        .map(ProfilService::vehiculeDto).toList();
    List<Chauffeur> chauffeurs = chauffeurRepository.findByProprietaire(proprietaireId);
    LocalDateTime debutSemaine = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
    LocalDateTime debutJour = LocalDate.now().atStartOfDay();
    List<Long> ids = chauffeurs.stream().map(Chauffeur::getId).toList();
    List<Course> courses = ids.isEmpty() ? List.of() : courseRepository.findTermineesChauffeurs(ids, debutSemaine);
    List<ChauffeurFlotte> liste = chauffeurs.stream().map(ch -> {
      List<Course> cs = courses.stream().filter(c -> c.getChauffeur().getId().equals(ch.getId())).toList();
      var pos = positions.position(ch).orElse(null);
      Utilisateur u = ch.getUtilisateur();
      return new ChauffeurFlotte(u.getId(), u.getNomComplet(), u.getTelephone(), u.getPhotoUrl(), u.getStatut(),
          ch.getDisponible(), CourseMapper.arrondi(u.getNoteMoyenne()),
          ch.getVehicule() == null ? null : ProfilService.vehiculeDto(ch.getVehicule()),
          (int) cs.stream().filter(c -> !c.getFinAt().isBefore(debutJour)).count(),
          cs.stream().mapToLong(c -> nz(c.getGainChauffeur())).sum(), cs.size(),
          pos == null ? null : pos.lat(), pos == null ? null : pos.lng());
    }).toList();
    return new Flotte(vehicules, liste, liste.stream().mapToLong(ChauffeurFlotte::gainsSemaine).sum(),
        liste.stream().mapToInt(ChauffeurFlotte::coursesSemaine).sum());
  }
}
