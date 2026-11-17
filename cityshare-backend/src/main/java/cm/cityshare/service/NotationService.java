package cm.cityshare.service;

import cm.cityshare.dto.request.NotationRequest;
import cm.cityshare.entity.Notation;
import cm.cityshare.entity.Utilisateur;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.repository.NotationRepository;
import cm.cityshare.repository.UtilisateurRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotationService {
  private final NotationRepository notationRepository;
  private final UtilisateurRepository utilisateurRepository;
  private final AuthService authService;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Transactional
  public Notation create(NotationRequest request) {
    Utilisateur note = utilisateurRepository.findById(request.getNoteId()).orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
    String criteres = "[]";
    try {
      criteres = objectMapper.writeValueAsString(request.getCriteres() == null ? List.of() : request.getCriteres());
    } catch (Exception ignored) {
    }
    Notation notation = Notation.builder()
        .noteur(authService.currentUser())
        .note(note)
        .noteValeur(request.getNote())
        .commentaire(request.getCommentaire())
        .criteres(criteres)
        .build();
    Notation saved = notationRepository.save(notation);
    Double avg = notationRepository.calculateAverageByUserId(note.getId());
    note.setNoteMoyenne(avg == null ? 0.0 : avg);
    utilisateurRepository.save(note);
    return saved;
  }

  public List<Notation> byUser(Long userId) {
    return notationRepository.findByUserId(userId);
  }
}
