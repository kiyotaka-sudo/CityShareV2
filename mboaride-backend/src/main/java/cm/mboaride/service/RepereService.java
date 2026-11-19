package cm.mboaride.service;

import cm.mboaride.dto.SupportDtos.*;
import cm.mboaride.entity.Repere;
import cm.mboaride.enums.StatutRepere;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.RepereRepository;
import cm.mboaride.security.CurrentUser;
import cm.mboaride.util.Geo;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Base de repères populaires enrichie par les utilisateurs et validée par l'administrateur (BF-34). */
@Service
@RequiredArgsConstructor
public class RepereService {
  private final RepereRepository repository;
  private final CurrentUser currentUser;

  @Transactional(readOnly = true)
  public List<RepereDto> rechercher(String q, String ville, Double lat, Double lng) {
    String terme = q == null || q.isBlank() ? null : q.trim();
    List<Repere> reperes = repository.rechercher(terme, ville == null || ville.isBlank() ? null : ville, PageRequest.of(0, terme == null ? 300 : 30));
    if (lat != null && lng != null) {
      reperes = reperes.stream().sorted(Comparator.comparingDouble(r -> Geo.distanceKm(lat, lng, r.getLatitude(), r.getLongitude()))).toList();
    }
    return reperes.stream().limit(terme == null ? 300 : 30).map(RepereService::toDto).toList();
  }

  @Transactional
  public RepereDto proposer(PropositionRepere req) {
    Repere r = repository.save(Repere.builder().nom(req.nom().trim()).description(req.description()).categorie(req.categorie())
        .ville(req.ville().trim()).latitude(req.lat()).longitude(req.lng()).statut(StatutRepere.PROPOSE)
        .proposePar(currentUser.get()).build());
    return toDto(r);
  }

  @Transactional(readOnly = true)
  public List<RepereDto> tous() {
    return repository.findAllByOrderByVilleAscNomAsc().stream().map(RepereService::toDto).toList();
  }

  @Transactional
  public RepereDto enregistrer(Long id, PropositionRepere req, StatutRepere statut) {
    Repere r = id == null ? Repere.builder().build() : repository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    r.setNom(req.nom().trim());
    r.setDescription(req.description());
    r.setCategorie(req.categorie());
    r.setVille(req.ville().trim());
    r.setLatitude(req.lat());
    r.setLongitude(req.lng());
    r.setStatut(statut == null ? StatutRepere.VALIDE : statut);
    return toDto(repository.save(r));
  }

  @Transactional
  public RepereDto changerStatut(Long id, StatutRepere statut) {
    Repere r = repository.findById(id).orElseThrow(() -> ApiException.notFound("erreur.introuvable"));
    r.setStatut(statut);
    return toDto(r);
  }

  @Transactional
  public void supprimer(Long id) {
    repository.deleteById(id);
  }

  static RepereDto toDto(Repere r) {
    return new RepereDto(r.getId(), r.getNom(), r.getDescription(), r.getCategorie(), r.getVille(), r.getLatitude(),
        r.getLongitude(), r.getStatut(), r.getNbUtilisations(),
        r.getProposePar() == null ? null : r.getProposePar().getNomComplet(), r.getCreatedAt());
  }
}
