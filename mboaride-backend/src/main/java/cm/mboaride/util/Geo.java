package cm.mboaride.util;

/** Calculs géographiques (distance orthodromique, cap). */
public final class Geo {
  private static final double RAYON_TERRE_KM = 6371.0;

  private Geo() {}

  /** Distance à vol d'oiseau en kilomètres (formule de haversine). */
  public static double distanceKm(double lat1, double lng1, double lat2, double lng2) {
    double dLat = Math.toRadians(lat2 - lat1);
    double dLng = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return RAYON_TERRE_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Cap (0-360°) du point 1 vers le point 2. */
  public static double cap(double lat1, double lng1, double lat2, double lng2) {
    double phi1 = Math.toRadians(lat1);
    double phi2 = Math.toRadians(lat2);
    double dLng = Math.toRadians(lng2 - lng1);
    double y = Math.sin(dLng) * Math.cos(phi2);
    double x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
    return (Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  /** Plus petit écart angulaire entre deux caps (0-180°). */
  public static double ecartAngulaire(double cap1, double cap2) {
    double diff = Math.abs(cap1 - cap2) % 360;
    return diff > 180 ? 360 - diff : diff;
  }
}
