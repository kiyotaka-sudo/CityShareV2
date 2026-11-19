package cm.mboaride.service;

import cm.mboaride.config.AppProperties;
import cm.mboaride.dto.CourseDtos.*;
import cm.mboaride.entity.*;
import cm.mboaride.enums.Role;
import cm.mboaride.enums.TypeService;
import cm.mboaride.repository.ChauffeurRepository;
import cm.mboaride.repository.NotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Conversion des courses en DTO selon la personne qui consulte (confidentialité des données). */
@Component
@RequiredArgsConstructor
public class CourseMapper {
  private final AppProperties props;
  private final PositionService positions;
  private final ChauffeurRepository chauffeurRepository;
  private final NotationRepository notationRepository;

  public CourseDto toDto(Course c, Long viewerId, Role viewerRole) {
    boolean estClient = c.getClient().getId().equals(viewerId);
    boolean estChauffeur = c.getChauffeur() != null && c.getChauffeur().getId().equals(viewerId);
    boolean admin = viewerRole == Role.ADMIN || viewerRole == Role.SUPPORT;
    // Les numéros ne sont communiqués que pendant la course (BF-12), jamais dans l'historique
    boolean contactVisible = c.isActive() || admin;
    PersonneDto client = new PersonneDto(c.getClient().getId(), c.getClient().getPrenom(),
        estClient || admin ? c.getClient().getNom() : initiale(c.getClient().getNom()), c.getClient().getPhotoUrl(),
        arrondi(c.getClient().getNoteMoyenne()), c.getClient().getNbNotes(),
        (estChauffeur && contactVisible) || admin || estClient ? c.getClient().getTelephone() : null);
    ChauffeurPublicDto chauffeur = c.getChauffeur() == null ? null
        : chauffeurPublic(c.getChauffeur(), c.getVehicule(), (estClient && contactVisible) || admin || estChauffeur, c.isActive());
    Boolean dejaNote = viewerId == null ? null : notationRepository.existsByCourseIdAndAuteurId(c.getId(), viewerId);
    return new CourseDto(c.getId(), c.getReference(), c.getTypeService(), c.getStatut(), c.getNbPlaces(),
        new PointDto(c.getDepartLat(), c.getDepartLng(), c.getDepartAdresse(), c.getDepartRepere()),
        new PointDto(c.getArriveeLat(), c.getArriveeLng(), c.getArriveeAdresse(), null),
        arrondi(c.getDistanceKm()), Math.ceil(c.getDureeMin()),
        c.getPrixReference(), c.getPrixMin(), c.getPrixMax(), c.getPrixPropose(), c.getPrixFinal(), c.getReduction(),
        c.getMontantAPayer(),
        estChauffeur || admin ? c.getCommission() : null, estChauffeur || admin ? c.getGainChauffeur() : null,
        c.getMajorations(), c.getModePaiement(), c.getStatutPaiement(), c.getMboaLady(), c.getCasqueConfirme(),
        estClient || admin ? c.getCodeVerification() : null,
        estClient ? lienPartage(c) : null,
        c.getTourNegociation(), c.getOffresExpireAt(), c.getDatePlanifiee(), c.getCreatedAt(), c.getAccepteeAt(),
        c.getArriveAt(), c.getDebutAt(), c.getFinAt(), c.getAnnuleeAt(), c.getAnnuleePar(), c.getMotifAnnulation(),
        c.getFraisAnnulation(), client, chauffeur, dejaNote, c.getTypeService() != TypeService.RAMASSAGE);
  }

  public ChauffeurPublicDto chauffeurPublic(Utilisateur u, Vehicule v, boolean avecTelephone, boolean avecPosition) {
    Double lat = null;
    Double lng = null;
    if (avecPosition) {
      var pos = positions.position(u.getId()).or(() -> chauffeurRepository.findById(u.getId()).flatMap(positions::position));
      if (pos.isPresent()) {
        lat = pos.get().lat();
        lng = pos.get().lng();
      }
    }
    return new ChauffeurPublicDto(u.getId(), u.getPrenom(), initiale(u.getNom()), u.getPhotoUrl(),
        arrondi(u.getNoteMoyenne()), u.getNbNotes(), avecTelephone ? u.getTelephone() : null, u.getGenre(),
        v == null ? null : ProfilService.vehiculeDto(v), lat, lng);
  }

  public String lienPartage(Course c) {
    return props.publicUrl() + "/suivi/" + c.getTokenPartage();
  }

  private static String initiale(String nom) {
    return nom == null || nom.isBlank() ? "" : nom.substring(0, 1).toUpperCase() + ".";
  }

  static Double arrondi(Double v) {
    return v == null ? null : Math.round(v * 10) / 10.0;
  }
}
