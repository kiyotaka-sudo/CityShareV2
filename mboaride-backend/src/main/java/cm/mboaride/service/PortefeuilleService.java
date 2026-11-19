package cm.mboaride.service;

import cm.mboaride.dto.PaiementDtos.*;
import cm.mboaride.entity.Course;
import cm.mboaride.entity.TransactionPortefeuille;
import cm.mboaride.entity.Utilisateur;
import cm.mboaride.enums.TypeTransaction;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.TransactionPortefeuilleRepository;
import cm.mboaride.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Portefeuille MboaRide : solde, crédits et débits tracés (BF-41, BF-42). */
@Service
@RequiredArgsConstructor
public class PortefeuilleService {
  private final UtilisateurRepository utilisateurRepository;
  private final TransactionPortefeuilleRepository transactionRepository;

  /**
   * Applique un mouvement signé au portefeuille, sous verrou.
   * @param autoriserNegatif vrai pour les commissions et frais (le chauffeur peut devenir débiteur)
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Utilisateur mouvement(Long userId, TypeTransaction type, long montant, Course course, String description,
      boolean autoriserNegatif) {
    if (montant == 0) {
      return utilisateurRepository.findById(userId).orElseThrow();
    }
    Utilisateur u = utilisateurRepository.verrouiller(userId).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    long nouveau = u.getSolde() + montant;
    if (nouveau < 0 && montant < 0 && !autoriserNegatif) {
      throw ApiException.badRequest("portefeuille.solde_insuffisant", u.getSolde());
    }
    u.setSolde(nouveau);
    transactionRepository.save(TransactionPortefeuille.builder().utilisateur(u).type(type).montant(montant)
        .soldeApres(nouveau).course(course).description(description).build());
    return u;
  }

  @Transactional(readOnly = true)
  public PortefeuilleDto consulter(Long userId, int page) {
    Utilisateur u = utilisateurRepository.findById(userId).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    var transactions = transactionRepository.findByUtilisateurIdOrderByCreatedAtDesc(userId, PageRequest.of(page, 30))
        .map(PortefeuilleService::toDto).getContent();
    return new PortefeuilleDto(u.getSolde(), transactions);
  }

  public static TransactionDto toDto(TransactionPortefeuille t) {
    return new TransactionDto(t.getId(), t.getType(), t.getMontant(), t.getSoldeApres(), t.getDescription(),
        t.getCourse() == null ? null : t.getCourse().getId(), t.getCreatedAt());
  }
}
