package cm.cityshare.service;

import cm.cityshare.dto.request.SendMessageRequest;
import cm.cityshare.dto.response.MessageResponse;
import cm.cityshare.entity.Message;
import cm.cityshare.entity.Utilisateur;
import cm.cityshare.exception.ResourceNotFoundException;
import cm.cityshare.repository.MessageRepository;
import cm.cityshare.repository.UtilisateurRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessagerieService {
  private final MessageRepository messageRepository;
  private final UtilisateurRepository utilisateurRepository;
  private final AuthService authService;
  private final SimpMessagingTemplate messagingTemplate;

  @Transactional
  public MessageResponse sendMessage(SendMessageRequest request) {
    return toResponse(persistMessage(request.getDestinataireId(), request.getContenu()));
  }

  public MessageResponse handleMessage(Map<String, Object> payload) {
    Long destinataireId = Long.valueOf(String.valueOf(payload.get("destinataireId")));
    String contenu = String.valueOf(payload.get("contenu"));
    return toResponse(persistMessage(destinataireId, contenu));
  }

  public List<MessageResponse> conversation(Long otherUserId) {
    String convId = conversationId(authService.currentUser().getId(), otherUserId);
    return messageRepository.findByConversationId(convId).stream().map(this::toResponse).toList();
  }

  private Message persistMessage(Long destinataireId, String contenu) {
    Utilisateur expediteur = authService.currentUser();
    Utilisateur destinataire = utilisateurRepository.findById(destinataireId)
        .orElseThrow(() -> new ResourceNotFoundException("Destinataire introuvable"));
    Message message = Message.builder()
        .expediteur(expediteur)
        .destinataire(destinataire)
        .contenu(contenu)
        .conversationId(conversationId(expediteur.getId(), destinataireId))
        .build();
    Message saved = messageRepository.save(message);
    pushToUser(destinataire.getTelephone(), saved);
    pushToUser(expediteur.getTelephone(), saved);
    return saved;
  }

  private void pushToUser(String telephone, Message message) {
    sendToUser(telephone, message);
    sendToUser(String.valueOf(message.getDestinataire().getId()), message);
  }

  private void sendToUser(String user, Message message) {
    messagingTemplate.convertAndSendToUser(user, "/queue/messages", toResponse(message));
  }

  private MessageResponse toResponse(Message message) {
    return MessageResponse.builder()
        .id(message.getId())
        .expediteurId(message.getExpediteur().getId())
        .destinataireId(message.getDestinataire().getId())
        .contenu(message.getContenu())
        .dateEnvoi(message.getDateEnvoi())
        .conversationId(message.getConversationId())
        .build();
  }

  private String conversationId(Long a, Long b) {
    return Math.min(a, b) + "-" + Math.max(a, b);
  }
}
