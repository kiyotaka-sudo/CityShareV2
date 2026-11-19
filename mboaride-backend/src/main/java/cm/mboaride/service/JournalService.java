package cm.mboaride.service;

import cm.mboaride.entity.JournalAdmin;
import cm.mboaride.repository.JournalAdminRepository;
import cm.mboaride.repository.UtilisateurRepository;
import cm.mboaride.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Journalisation des actions d'administration (BNF-06). */
@Service
@RequiredArgsConstructor
public class JournalService {
  private final JournalAdminRepository repository;
  private final UtilisateurRepository utilisateurRepository;

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void tracer(String action, String cibleType, Long cibleId, String details) {
    Long adminId = null;
    String adminNom = "système";
    if (SecurityContextHolder.getContext().getAuthentication() != null
        && SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof AuthUser auth) {
      adminId = auth.id();
      adminNom = utilisateurRepository.findById(auth.id()).map(u -> u.getNomComplet()).orElse("?");
    }
    String ip = null;
    if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
      HttpServletRequest req = attrs.getRequest();
      String forwarded = req.getHeader("X-Forwarded-For");
      ip = forwarded != null ? forwarded.split(",")[0].trim() : req.getRemoteAddr();
    }
    repository.save(JournalAdmin.builder().adminId(adminId).adminNom(adminNom).action(action)
        .cibleType(cibleType).cibleId(cibleId).details(details).ip(ip).build());
  }
}
