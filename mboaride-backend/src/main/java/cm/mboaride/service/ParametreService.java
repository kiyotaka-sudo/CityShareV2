package cm.mboaride.service;

import cm.mboaride.entity.Parametre;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.ParametreRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Paramètres métier modifiables depuis le back-office, mis en cache mémoire. */
@Service
@RequiredArgsConstructor
public class ParametreService {
  public static final String ALPHA = "negociation.alpha";
  public static final String BETA = "negociation.beta";
  public static final String DELAI_OFFRES = "negociation.delai_secondes";
  public static final String MAX_RELANCES = "negociation.max_relances";
  public static final String COMMISSION_PCT = "commission.pourcentage";
  public static final String FRAIS_FIXE_RAMASSAGE = "commission.ramassage_frais_fixe";
  public static final String NUIT_PCT = "majoration.nuit_pct";
  public static final String NUIT_DEBUT = "majoration.nuit_debut";
  public static final String NUIT_FIN = "majoration.nuit_fin";
  public static final String POINTE_PCT = "majoration.pointe_pct";
  public static final String POINTE_PLAGES = "majoration.pointe_plages";
  public static final String PLUIE_PCT = "majoration.pluie_pct";
  public static final String METEO_AUTO = "meteo.auto";
  public static final String PLUIE_MANUELLE = "meteo.pluie_manuelle";
  public static final String SURGE_ACTIF = "surge.actif";
  public static final String SURGE_PAS = "surge.pas_pct";
  public static final String SURGE_MAX = "surge.max_pct";
  public static final String ANNULATION_DELAI = "annulation.delai_gratuit_min";
  public static final String ANNULATION_FRAIS = "annulation.frais";
  public static final String SEUIL_SUSPENSION = "notation.seuil_suspension";
  public static final String MIN_NOTES = "notation.min_notes";
  public static final String RAYON_RECHERCHE = "recherche.rayon_km";
  public static final String ANGLE_RAMASSAGE = "ramassage.angle_max";
  public static final String SOLDE_MIN_CHAUFFEUR = "chauffeur.solde_minimum";
  public static final String ANOMALIE_ARRET = "anomalie.arret_minutes";
  public static final String ANOMALIE_DEVIATION = "anomalie.deviation_km";
  public static final String FOURNISSEUR_PAIEMENT = "paiement.fournisseur";
  public static final String BONUS_PARRAIN = "parrainage.bonus_parrain";
  public static final String REDUCTION_FILLEUL = "parrainage.reduction_filleul";
  public static final String PLANIF_AVANCE = "course.planification_avance_min";
  public static final String MOTO_DISTANCE = "moto.distance_recommandee_km";
  public static final String RAPPEL_DOCUMENTS = "documents.rappel_jours";
  public static final String CONSERVATION_POSITIONS = "donnees.conservation_positions_jours";

  private final ParametreRepository repository;
  private final Map<String, String> cache = new ConcurrentHashMap<>();

  public String texte(String cle) {
    return cache.computeIfAbsent(cle, k -> repository.findById(k).map(Parametre::getValeur)
        .orElseThrow(() -> new IllegalStateException("Paramètre manquant : " + k)));
  }

  public double decimal(String cle) {
    return Double.parseDouble(texte(cle));
  }

  public long entier(String cle) {
    return Long.parseLong(texte(cle).trim());
  }

  public boolean booleen(String cle) {
    return Boolean.parseBoolean(texte(cle).trim());
  }

  public LocalTime heure(String cle) {
    return LocalTime.parse(texte(cle).trim());
  }

  public List<Parametre> tous() {
    return repository.findAll().stream().sorted((a, b) -> a.getCle().compareTo(b.getCle())).toList();
  }

  @Transactional
  public Parametre modifier(String cle, String valeur) {
    Parametre p = repository.findById(cle).orElseThrow(() -> ApiException.notFound("parametre.introuvable"));
    valider(cle, valeur);
    p.setValeur(valeur.trim());
    p.setUpdatedAt(LocalDateTime.now());
    cache.remove(cle);
    return repository.save(p);
  }

  private void valider(String cle, String valeur) {
    if (valeur == null || valeur.isBlank()) {
      throw ApiException.badRequest("parametre.invalide", cle);
    }
    try {
      String v = valeur.trim();
      if (cle.endsWith("_debut") || cle.endsWith("_fin")) {
        LocalTime.parse(v);
      } else if (cle.equals(POINTE_PLAGES)) {
        for (String plage : v.split(",")) {
          String[] bornes = plage.trim().split("-");
          LocalTime.parse(bornes[0].trim());
          LocalTime.parse(bornes[1].trim());
        }
      } else if (cle.equals(FOURNISSEUR_PAIEMENT)) {
        if (!List.of("MONETBIL", "CAMPAY", "SIMULATION").contains(v)) {
          throw new IllegalArgumentException();
        }
      } else if (cle.startsWith("meteo.") || cle.equals(SURGE_ACTIF)) {
        if (!v.equals("true") && !v.equals("false")) {
          throw new IllegalArgumentException();
        }
      } else {
        double d = Double.parseDouble(v);
        if ((cle.equals(ALPHA) || cle.equals(BETA)) && (d < 0 || d > 1)) {
          throw new IllegalArgumentException();
        }
      }
    } catch (RuntimeException ex) {
      throw ApiException.badRequest("parametre.invalide", cle);
    }
  }

  /** Vrai si l'heure courante appartient à l'une des plages « HH:mm-HH:mm » (gère le passage de minuit). */
  public static boolean dansPlage(LocalTime t, LocalTime debut, LocalTime fin) {
    if (debut.equals(fin)) {
      return false;
    }
    return debut.isBefore(fin) ? !t.isBefore(debut) && t.isBefore(fin) : !t.isBefore(debut) || t.isBefore(fin);
  }

  public void viderCache() {
    cache.clear();
  }
}
