package cm.mboaride.service;

import cm.mboaride.dto.CourseDtos.EstimationService;
import cm.mboaride.dto.CourseDtos.Majoration;
import cm.mboaride.entity.Tarif;
import cm.mboaride.entity.Zone;
import cm.mboaride.enums.TypeService;
import cm.mboaride.exception.ApiException;
import cm.mboaride.repository.TarifRepository;
import cm.mboaride.service.carto.MeteoService;
import cm.mboaride.util.Montants;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Calcul du prix de référence (section 5.5 du cahier des charges) :
 * P_ref = prise en charge + distance × tarif/km + durée × tarif/min, modulé par la zone, l'heure (nuit, pointe),
 * la météo et le rapport demande/offre. La fourchette négociable est [P_ref × (1 − α) ; P_ref × (1 + β)].
 * En ramassage, le prix d'une place est fixé par l'administration (tarif officiel + supplément kilométrique).
 */
@Service
@RequiredArgsConstructor
public class TarificationService {
  private final TarifRepository tarifRepository;
  private final ParametreService parametres;
  private final ZoneService zoneService;
  private final MeteoService meteoService;

  /** Résultat brut du calcul pour un service. */
  public record Prix(long prixReference, long prixMin, long prixMax, long prixParPlace, List<Majoration> majorations) {}

  /** Contexte de calcul : position de départ, heure, déséquilibre demande/offre observé. */
  public record Contexte(double lat, double lng, LocalTime heure, int demandes, int chauffeurs) {}

  public Prix calculer(TypeService type, double distanceKm, double dureeMin, int nbPlaces, Contexte ctx) {
    Tarif tarif = tarifRepository.findByTypeService(type).orElseThrow(() -> ApiException.notFound("tarif.introuvable"));
    if (type == TypeService.RAMASSAGE) {
      long place = prixPlaceRamassage(tarif, distanceKm);
      long total = place * Math.max(1, nbPlaces);
      return new Prix(total, total, total, place, List.of());
    }
    List<Majoration> majorations = majorations(ctx);
    double totalPct = majorations.stream().mapToDouble(Majoration::pct).sum();
    long ref = prixReference(tarif, distanceKm, dureeMin, totalPct);
    double alpha = parametres.decimal(ParametreService.ALPHA);
    double beta = parametres.decimal(ParametreService.BETA);
    long[] bornes = fourchette(ref, alpha, beta);
    return new Prix(ref, bornes[0], bornes[1], ref, majorations);
  }

  /** Formule du prix de référence, arrondie à 50 FCFA, jamais sous le minimum de perception. */
  public static long prixReference(Tarif tarif, double distanceKm, double dureeMin, double majorationPct) {
    double base = tarif.getPriseEnCharge() + distanceKm * tarif.getPrixKm() + dureeMin * tarif.getPrixMinute();
    base = base * (1 + majorationPct / 100.0);
    return Montants.arrondir50(Math.max(base, tarif.getPrixMinimum()));
  }

  /** Bornes [min ; max] de la négociation encadrée. */
  public static long[] fourchette(long prixReference, double alpha, double beta) {
    long min = Math.max(50, Montants.arrondir50(prixReference * (1 - alpha)));
    long max = Montants.arrondir50(prixReference * (1 + beta));
    return new long[] {min, Math.max(min, max)};
  }

  /** Prix officiel d'une place en ramassage, majoré au-delà de la distance incluse (BF-18). */
  public static long prixPlaceRamassage(Tarif tarif, double distanceKm) {
    double supplement = Math.max(0, distanceKm - tarif.getDistanceIncluseKm()) * tarif.getSupplementKm();
    return Montants.arrondir25(tarif.getPrixPlace() + supplement);
  }

  /** Une proposition du client ou une contre-proposition doit rester dans la fourchette (BF-23). */
  public static boolean dansFourchette(long prix, long min, long max) {
    return prix >= min && prix <= max;
  }

  List<Majoration> majorations(Contexte ctx) {
    List<Majoration> liste = new ArrayList<>();
    Zone zone = zoneService.zonePrincipale(ctx.lat(), ctx.lng()).orElse(null);
    if (zone != null && zone.getMajorationPct() > 0) {
      liste.add(new Majoration("ZONE", zone.getNom(), zone.getMajorationPct()));
    }
    LocalTime t = ctx.heure();
    if (ParametreService.dansPlage(t, parametres.heure(ParametreService.NUIT_DEBUT), parametres.heure(ParametreService.NUIT_FIN))) {
      liste.add(new Majoration("NUIT", "Nuit", parametres.decimal(ParametreService.NUIT_PCT)));
    } else if (heureDePointe(t)) {
      liste.add(new Majoration("POINTE", "Heure de pointe", parametres.decimal(ParametreService.POINTE_PCT)));
    }
    boolean pluie = parametres.booleen(ParametreService.PLUIE_MANUELLE)
        || (parametres.booleen(ParametreService.METEO_AUTO) && meteoService.ilPleut(ctx.lat(), ctx.lng()));
    if (pluie) {
      liste.add(new Majoration("PLUIE", "Pluie", parametres.decimal(ParametreService.PLUIE_PCT)));
    }
    double surge = surge(ctx.demandes(), ctx.chauffeurs());
    if (surge > 0) {
      liste.add(new Majoration("DEMANDE", "Forte demande", surge));
    }
    return liste;
  }

  /** Majoration demande/offre : + pas % par demande en excès par chauffeur disponible, plafonnée. */
  double surge(int demandes, int chauffeurs) {
    if (!parametres.booleen(ParametreService.SURGE_ACTIF) || demandes <= 0) {
      return 0;
    }
    double ratio = demandes / (double) Math.max(1, chauffeurs);
    if (ratio <= 1) {
      return 0;
    }
    double pct = (ratio - 1) * parametres.decimal(ParametreService.SURGE_PAS);
    return Math.min(Math.round(pct), parametres.decimal(ParametreService.SURGE_MAX));
  }

  private boolean heureDePointe(LocalTime t) {
    for (String plage : parametres.texte(ParametreService.POINTE_PLAGES).split(",")) {
      String[] bornes = plage.trim().split("-");
      if (bornes.length == 2 && ParametreService.dansPlage(t, LocalTime.parse(bornes[0].trim()), LocalTime.parse(bornes[1].trim()))) {
        return true;
      }
    }
    return false;
  }

  /** Construit l'estimation d'un service pour l'écran de réservation (BF-09). */
  public EstimationService estimation(TypeService type, double distanceKm, double dureeMin, int nbPlaces, Contexte ctx,
      long reduction, int chauffeursProches) {
    String motif = zoneService.motifIndisponibilite(type, ctx.lat(), ctx.lng(), ctx.heure()).orElse(null);
    Prix prix = calculer(type, distanceKm, type == TypeService.MOTO ? dureeMin * 0.8 : dureeMin,
        type == TypeService.RAMASSAGE ? nbPlaces : 1, ctx);
    boolean recommande = type == TypeService.MOTO && motif == null
        && distanceKm <= parametres.decimal(ParametreService.MOTO_DISTANCE);
    return new EstimationService(type, motif == null, motif, recommande, type != TypeService.RAMASSAGE,
        prix.prixReference(), prix.prixMin(), prix.prixMax(), prix.prixParPlace(),
        type == TypeService.RAMASSAGE ? nbPlaces : (type == TypeService.MOTO ? 1 : nbPlaces),
        prix.majorations(), Math.min(reduction, prix.prixReference()), chauffeursProches);
  }
}
