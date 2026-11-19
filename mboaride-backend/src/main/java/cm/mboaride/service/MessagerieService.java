package cm.mboaride.service;

import cm.mboaride.dto.CourseDtos.MessageDto;
import cm.mboaride.entity.Course;
import cm.mboaride.entity.Message;
import cm.mboaride.entity.Utilisateur;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.CourseRepository;
import cm.mboaride.repository.MessageRepository;
import cm.mboaride.security.CurrentUser;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Messagerie client / chauffeur liée à une course (BF-12). */
@Service
@RequiredArgsConstructor
public class MessagerieService {
  private final MessageRepository messageRepository;
  private final CourseRepository courseRepository;
  private final RealtimeService realtime;
  private final NotificationService notifications;
  private final CurrentUser currentUser;

  @Transactional
  public List<MessageDto> messages(Long courseId) {
    Course c = course(courseId);
    Long moi = currentUser.id();
    List<Message> messages = messageRepository.findByCourse(c.getId());
    messages.stream().filter(m -> !m.getExpediteur().getId().equals(moi)).forEach(m -> m.setLu(true));
    return messages.stream().map(MessagerieService::toDto).toList();
  }

  @Transactional
  public MessageDto envoyer(Long courseId, String contenu) {
    Course c = course(courseId);
    if (!c.isActive()) {
      throw ApiException.badRequest("message.course_terminee");
    }
    Utilisateur moi = currentUser.get();
    Message m = messageRepository.save(Message.builder().course(c).expediteur(moi).contenu(contenu.trim()).build());
    MessageDto dto = toDto(m);
    Long destinataire = c.getClient().getId().equals(moi.getId()) ? c.getChauffeur().getId() : c.getClient().getId();
    realtime.envoyer(destinataire, RealtimeService.FILE_MESSAGES, "MESSAGE", dto);
    realtime.envoyer(moi.getId(), RealtimeService.FILE_MESSAGES, "MESSAGE", dto);
    notifications.notifier(destinataire, "message", c.getId(), false, moi.getPrenom(),
        contenu.length() > 80 ? contenu.substring(0, 80) + "…" : contenu);
    return dto;
  }

  private Course course(Long courseId) {
    Long moi = currentUser.id();
    return courseRepository.findById(courseId)
        .filter(c -> c.getChauffeur() != null && (c.getClient().getId().equals(moi) || c.getChauffeur().getId().equals(moi)))
        .orElseThrow(() -> ApiException.notFound("course.introuvable"));
  }

  static MessageDto toDto(Message m) {
    return new MessageDto(m.getId(), m.getCourse().getId(), m.getExpediteur().getId(), m.getExpediteur().getPrenom(),
        m.getContenu(), m.getLu(), m.getCreatedAt());
  }
}
