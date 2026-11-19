export type Role = 'CLIENT' | 'CHAUFFEUR' | 'PROPRIETAIRE' | 'SUPPORT' | 'ADMIN';
export type StatutCompte = 'ACTIF' | 'INACTIF' | 'SUSPENDU' | 'SUPPRIME';
export type TypeService = 'DEPOT' | 'RAMASSAGE' | 'MOTO';
export type TypeVehicule = 'TAXI' | 'MOTO';
export type ModePaiement = 'ESPECES' | 'MTN_MOMO' | 'ORANGE_MONEY' | 'PORTEFEUILLE';
export type StatutCourse = 'PLANIFIEE' | 'RECHERCHE' | 'ACCEPTEE' | 'CHAUFFEUR_ARRIVE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'EXPIREE';
export type StatutPaiementCourse = 'NON_PAYE' | 'EN_ATTENTE' | 'PAYE' | 'ECHEC';

export interface Point { lat: number; lng: number; adresse: string; repere?: string | null }

export interface Vehicule {
  id: number; typeVehicule: TypeVehicule; marque: string; modele?: string; couleur?: string;
  immatriculation: string; nbPlaces: number; photoUrl?: string; actif: boolean; proprietaireId: number; proprietaireNom: string;
}

export interface ChauffeurInfo {
  typeService: TypeVehicule; disponible: boolean; modeRamassage: boolean; placesLibres: number;
  directionLibelle?: string; directionLat?: number; directionLng?: number; casqueDisponible: boolean;
  latitude?: number; longitude?: number; vehicule?: Vehicule; documentsAJour: boolean;
}

export interface Utilisateur {
  id: number; nom: string; prenom: string; telephone: string; email?: string; role: Role; statut: StatutCompte;
  genre?: 'H' | 'F'; langue: 'fr' | 'en'; photoUrl?: string; noteMoyenne: number; nbNotes: number; solde: number;
  codeParrainage?: string; dateInscription: string; estProprietaire: boolean; chauffeur?: ChauffeurInfo;
}

export interface Majoration { code: string; libelle: string; pct: number }

export interface EstimationService {
  typeService: TypeService; disponible: boolean; motifIndisponible?: string; recommande: boolean; negociable: boolean;
  prixReference: number; prixMin: number; prixMax: number; prixParPlace: number; nbPlaces: number;
  majorations: Majoration[]; reduction: number; chauffeursProches: number;
}

export interface Estimation {
  distanceKm: number; dureeMin: number; distanceEstimee: boolean; zone?: string; services: EstimationService[]; messagePromo?: string;
}

export interface Personne { id: number; prenom: string; nom: string; photoUrl?: string; noteMoyenne: number; nbNotes: number; telephone?: string }

export interface ChauffeurPublic extends Personne { genre?: string; vehicule?: Vehicule; lat?: number; lng?: number }

export interface Course {
  id: number; reference: string; typeService: TypeService; statut: StatutCourse; nbPlaces: number;
  depart: Point; arrivee: Point; distanceKm: number; dureeMin: number;
  prixReference: number; prixMin: number; prixMax: number; prixPropose: number; prixFinal?: number; reduction: number;
  montantAPayer: number; commission?: number; gainChauffeur?: number; majorations?: string;
  modePaiement: ModePaiement; statutPaiement: StatutPaiementCourse; mboaLady: boolean; casqueConfirme: boolean;
  codeVerification?: string; lienPartage?: string; tourNegociation: number; offresExpireAt?: string; datePlanifiee?: string;
  createdAt: string; accepteeAt?: string; arriveAt?: string; debutAt?: string; finAt?: string; annuleeAt?: string;
  annuleePar?: string; motifAnnulation?: string; fraisAnnulation: number;
  client: Personne; chauffeur?: ChauffeurPublic; dejaNote?: boolean; negociable: boolean;
}

export interface Offre {
  id: number; courseId: number; chauffeur: ChauffeurPublic; prix: number; type: 'ACCEPTATION' | 'CONTRE_PROPOSITION';
  statut: string; distancePriseEnChargeKm: number; etaMin: number; createdAt: string;
}

export interface DemandeChauffeur {
  courseId: number; reference: string; typeService: TypeService; nbPlaces: number; depart: Point; arrivee: Point;
  distanceKm: number; dureeMin: number; prixPropose: number; prixMin: number; prixMax: number; distancePriseEnChargeKm: number;
  clientPrenom: string; clientNote: number; modePaiement: ModePaiement; offresExpireAt?: string; tour: number;
  dejaRepondu: boolean; negociable: boolean; datePlanifiee?: string;
}

export interface Paiement {
  id: number; reference: string; type: 'COURSE' | 'RECHARGE'; courseId?: number; montant: number; mode: ModePaiement;
  fournisseur: string; statut: 'EN_ATTENTE' | 'REUSSI' | 'ECHOUE'; paymentUrl?: string; message?: string; createdAt: string;
}

export interface Transaction { id: number; type: string; montant: number; soldeApres: number; description?: string; courseId?: number; createdAt: string }

export interface Repere { id: number; nom: string; description?: string; categorie: string; ville: string; lat: number; lng: number }

export interface Lieu { id?: number; libelle: string; type: 'MAISON' | 'TRAVAIL' | 'CAMPUS' | 'AUTRE'; adresse: string; latitude: number; longitude: number }

export interface Contact { id?: number; nom: string; telephone: string }

export interface Message { id: number; courseId: number; expediteurId: number; expediteurPrenom: string; contenu: string; lu: boolean; createdAt: string }

export interface Reclamation {
  id: number; numero: string; courseId?: number; courseReference?: string; type: string; description: string;
  statut: string; reponse?: string; createdAt: string; updatedAt?: string;
}

export interface NotificationApp { id: number; titre: string; corps: string; type: string; lu: boolean; courseId?: number; createdAt: string }

export interface GainsPeriode { periode: string; nbCourses: number; chiffreAffaires: number; commissions: number; gainsNets: number; especesEncaissees: number }

export interface Gains { jour: GainsPeriode; semaine: GainsPeriode; mois: GainsPeriode; derniersJours: { jour: string; nbCourses: number; gainsNets: number }[]; solde: number }

export interface DocumentChauffeur { id: number; type: string; nomOriginal?: string; dateExpiration?: string; statut: string; motifRejet?: string; expireBientot: boolean; expire: boolean }

export interface ChauffeurFlotte {
  id: number; nomComplet: string; telephone: string; photoUrl?: string; statut: StatutCompte; disponible: boolean; noteMoyenne: number;
  vehicule?: Vehicule; coursesAujourdhui: number; gainsSemaine: number; coursesSemaine: number; lat?: number; lng?: number;
}

export interface Flotte { vehicules: Vehicule[]; chauffeurs: ChauffeurFlotte[]; gainsSemaine: number; coursesSemaine: number }

export interface Retrait { id: number; montant: number; telephone: string; operateur: 'MTN' | 'ORANGE'; statut: string; reference: string; message?: string; createdAt: string }
