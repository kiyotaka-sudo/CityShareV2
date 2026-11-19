package cm.mboaride.service;

import cm.mboaride.dto.SupportDtos.*;
import cm.mboaride.entity.Course;
import cm.mboaride.entity.Reclamation;
import cm.mboaride.enums.StatutReclamation;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.CourseRepository;
import cm.mboaride.repository.ReclamationRepository;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.util.Codes;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.EnumSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Signalement d'incidents avec numéro de suivi et statut (BF-51, BF-52, BF-61). */
@Service
@RequiredArgsConstructor
public class ReclamationService {
  private final ReclamationRepository repository;
  private final CourseRepository courseRepository;
  private final NotificationService notifications;
  private final CurrentUser currentUser;

  @Transactional
  public ReclamationDto creer(ReclamationRequest req) {
    var auteur = currentUser.get();
    Course course = null;
    if (req.courseId() != null) {
      course = courseRepository.findById(req.courseId())
          .filter(c -> c.getClient().getId().equals(auteur.getId()) || (c.getChauffeur() != null && c.getChauffeur().getId().equals(auteur.getId())))
          .orElseThrow(() -> ApiException.notFound("course.introuvable"));
    }
    Reclamation r = repository.save(Reclamation.builder().numero("TMP-" + Codes.alphanum(12)).course(course).auteur(auteur)
        .type(req.type()).description(req.description().trim()).build());
    r.setNumero(String.format("REC-%d-%05d", Year.now().getValue(), r.getId()));
    notifications.notifier(auteur.getId(), "reclamation_creee", course == null ? null : course.getId(), false, r.getNumero());
    return toDto(r);
  }

  @Transactional(readOnly = true)
  public List<ReclamationDto> mesReclamations() {
    return repository.findByAuteurIdOrderByCreatedAtDesc(currentUser.id()).stream().map(ReclamationService::toDto).toList();
  }

  @Transactional(readOnly = true)
  public List<ReclamationDto> toutes() {
    return repository.findAllDetail().stream().map(ReclamationService::toDto).toList();
  }

  @Transactional
  public ReclamationDto traiter(Long id, StatutReclamation statut, String reponse) {
    Reclamation r = repository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    r.setStatut(statut);
    if (reponse != null && !reponse.isBlank()) {
      r.setReponse(reponse.trim());
    }
    r.setTraitePar(currentUser.id());
    r.setUpdatedAt(LocalDateTime.now());
    notifications.notifier(r.getAuteur().getId(), "reclamation_maj", r.getCourse() == null ? null : r.getCourse().getId(),
        true, r.getNumero(), statut.name());
    return toDto(r);
  }

  public long ouvertes() {
    return repository.countByStatutIn(EnumSet.of(StatutReclamation.OUVERTE, StatutReclamation.EN_COURS));
  }

  static ReclamationDto toDto(Reclamation r) {
    return new ReclamationDto(r.getId(), r.getNumero(), r.getCourse() == null ? null : r.getCourse().getId(),
        r.getCourse() == null ? null : r.getCourse().getReference(), r.getType(), r.getDescription(), r.getStatut(),
        r.getReponse(), r.getAuteur().getId(), r.getAuteur().getNomComplet(), r.getAuteur().getTelephone(),
        r.getCreatedAt(), r.getUpdatedAt());
  }
}
