import type { Coord } from './geo';

export type TypeVehiculeCarte = 'TAXI' | 'RAMASSAGE' | 'MOTO';

/** Véhicule à animer : la carte le fait glisser de sa position affichée vers cette position cible. */
export interface VehiculeCarte extends Coord {
  id: string;
  type: TypeVehiculeCarte;
  /** Cap fourni par le serveur ; sinon il est déduit du déplacement. */
  cap?: number;
}

export type TypePoint = 'depart' | 'arrivee' | 'moi';

export interface PointCarte extends Coord {
  id: string;
  type: TypePoint;
  libelle?: string;
}

export interface ZoneChaude extends Coord {
  intensite: number;
}

export interface CarteProps {
  vehicules?: VehiculeCarte[];
  points?: PointCarte[];
  /** Itinéraire complet ; si un véhicule est suivi, la partie parcourue est grisée. */
  trace?: Coord[];
  zonesChaudes?: ZoneChaude[];
  centre?: Coord;
  zoom?: number;
  /** Recadre la caméra sur les points et l'itinéraire quand ils changent. */
  ajuster?: boolean;
  /** Identifiant du véhicule que la caméra suit. */
  suivre?: string;
  /** Le véhicule suivi glisse le long de l'itinéraire au lieu de couper en ligne droite. */
  aimanterSurTrace?: boolean;
  /** L'itinéraire se dessine progressivement quand il change (réservation). */
  animerTrace?: boolean;
  /** Recentrage demandé par le bouton « Ma position » (la clé change à chaque appui). */
  recentrage?: Coord & { cle: number };
  /** Point bleu « vous êtes ici », indépendant du cadrage automatique sur le trajet. */
  maPosition?: Coord;
  /** Point autour duquel pulse le radar de recherche d'un chauffeur. */
  radar?: Coord;
  /** Style sombre : true, false ou 'auto' (19 h - 6 h). */
  nuit?: boolean | 'auto';
  /** Marge intérieure (en px) pour ne pas cacher le trajet sous un panneau. */
  marges?: { haut?: number; bas?: number; gauche?: number; droite?: number };
  onPress?: (c: Coord) => void;
}

export const DUREE_ANIMATION_MS = 5000;

/** Listes vides partagées : une valeur par défaut `[]` recréée à chaque rendu relancerait les effets en boucle. */
export const AUCUN_VEHICULE: VehiculeCarte[] = [];
export const AUCUN_POINT: PointCarte[] = [];

export function estNuit(nuit: CarteProps['nuit']): boolean {
  if (nuit === 'auto') {
    const h = new Date().getHours();
    return h >= 19 || h < 6;
  }
  return !!nuit;
}
