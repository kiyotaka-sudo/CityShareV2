export type UserRole = 'CONDUCTEUR' | 'PASSAGER' | 'EXPEDITEUR';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  role: UserRole;
  noteMoyenne: number;
  photoUrl?: string;
  preferredLang?: 'fr' | 'en';
  verifie?: boolean;
  vehiculeMarque?: string;
  vehiculeImmatriculation?: string;
  vehiculePhotoUrl?: string;
  contactUrgenceNom?: string;
  contactUrgenceTel?: string;
  note?: number;
  avatarUrl?: string;
  vehicule?: string;
  plaque?: string;
}

export interface AuthResponse {
  token: string;
  type?: string;
  userId?: number;
  role?: UserRole;
  prenom?: string;
  preferredLang?: 'fr' | 'en';
  user?: User;
}

export interface ArretIntermediaire {
  id: number;
  ville: string;
  ordre: number;
  heurePassage: string;
}

export interface Trajet {
  id: number;
  conducteur: User;
  villeDepart: string;
  villeArrivee: string;
  dateHeure: string;
  nbPlacesDispo: number;
  prixParPlace: number;
  accepteColis: boolean;
  statut: string;
  arrets: ArretIntermediaire[];
  depart?: string;
  arrivee?: string;
  date?: string;
  heure?: string;
  prix?: number;
  placesDisponibles?: number;
  stops?: string[];
}

export interface Reservation {
  id: number;
  trajet: Trajet;
  passager: User;
  nbPlaces: number;
  prixTotal: number;
  statut: string;
  qrCodeToken: string;
  qrCodeScanne?: boolean;
  arriveeConfirmee: boolean;
  qrCode?: string;
}

export interface Colis {
  id: number;
  expediteur?: User;
  conducteur?: User;
  trajet?: Trajet;
  description: string;
  poids: 'LEGER' | 'MOYEN';
  villeDepart: string;
  villeArrivee: string;
  prixLivraison: number;
  statut: string;
  depart?: string;
  arrivee?: string;
  prix?: number;
}

export interface Notation {
  id: number;
  note: number;
  commentaire: string;
  criteres: string;
}

export interface ChatMessage {
  id: number | string;
  expediteurId?: number;
  destinataireId?: number;
  senderId?: string;
  receiverId?: string;
  contenu?: string;
  content?: string;
  dateEnvoi?: string;
  createdAt?: string;
  status?: 'pending' | 'sent' | 'delivered';
}

export interface ErrorResponse {
  messageFr?: string;
  messageEn?: string;
  message_fr?: string;
  message_en?: string;
  status: number;
  timestamp?: string;
}

export type Driver = User;
export type Trip = Trajet;
export type Parcel = Colis;

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Passager: undefined;
  Conducteur: undefined;
  Expediteur: undefined;
  SearchTrip: { depart?: string; arrivee?: string; date?: string } | undefined;
  TripDetail: { trip: Trip };
  Payment: { reservation: Reservation; trip: Trip };
  ReservationConfirm: { reservation?: Reservation; trip?: Trip };
  LiveTracking: { trip?: Trip; reservation?: Reservation; reservationId?: number; peerId?: number };
  SOS: undefined;
  Rating: { trip?: Trip; conducteurId?: number };
  CreateTrip: undefined;
  ValidateTrip: undefined;
  ScanBoarding: undefined;
  ShowBoardingQr: { reservation: Reservation };
  ParcelTracking: { parcel?: Parcel };
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};
