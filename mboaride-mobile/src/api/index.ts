import { api } from './client';
import type {
  Contact, Course, DemandeChauffeur, DocumentChauffeur, Estimation, Flotte, Gains, Lieu, Message, ModePaiement,
  NotificationApp, Offre, Paiement, Point, Reclamation, Repere, Retrait, Transaction, TypeService, Utilisateur
} from '../types';

const d = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export interface AuthReponse { token: string; utilisateur: Utilisateur }

/** Appels de l'API MboaRide regroupés par domaine. */
export const Api = {
  auth: {
    demanderOtp: (telephone: string) =>
      d<{ envoye: boolean; expireDansSecondes: number; nouveauCompte: boolean; codeDev?: string }>(api.post('/auth/otp/demander', { telephone })),
    verifierOtp: (body: { telephone: string; code: string; nom?: string; prenom?: string; langue?: string; codeParrainage?: string; consentement?: boolean }) =>
      d<AuthReponse>(api.post('/auth/otp/verifier', body)),
    renouveler: () => d<AuthReponse>(api.post('/auth/renouveler'))
  },
  moi: {
    get: () => d<Utilisateur>(api.get('/moi')),
    modifier: (body: Partial<Pick<Utilisateur, 'nom' | 'prenom' | 'email' | 'langue' | 'genre'>>) => d<Utilisateur>(api.put('/moi', body)),
    photo: (uri: string) => {
      const fd = new FormData();
      fd.append('fichier', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
      return d<Utilisateur>(api.post('/moi/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }));
    },
    pushToken: (token: string) => api.put('/moi/push-token', { token }),
    contacts: () => d<Contact[]>(api.get('/moi/contacts')),
    ajouterContact: (c: Contact) => d<Contact>(api.post('/moi/contacts', c)),
    supprimerContact: (id: number) => api.delete(`/moi/contacts/${id}`),
    lieux: () => d<Lieu[]>(api.get('/moi/lieux')),
    enregistrerLieu: (l: Lieu) => d<Lieu>(api.post('/moi/lieux', l)),
    supprimerLieu: (id: number) => api.delete(`/moi/lieux/${id}`),
    notifications: () => d<NotificationApp[]>(api.get('/moi/notifications')),
    notificationsLues: () => api.post('/moi/notifications/lues'),
    exporter: () => d<unknown>(api.get('/moi/export')),
    supprimer: () => api.delete('/moi')
  },
  courses: {
    estimer: (body: { depart: Point; arrivee: Point; nbPlaces: number; codePromo?: string }) => d<Estimation>(api.post('/courses/estimation', body)),
    demander: (body: {
      depart: Point; arrivee: Point; typeService: TypeService; nbPlaces: number; prixPropose?: number; modePaiement: ModePaiement;
      mboaLady?: boolean; datePlanifiee?: string; codePromo?: string;
    }) => d<Course>(api.post('/courses', body)),
    active: () => api.get<Course>('/courses/active').then((r) => (r.status === 204 ? null : r.data)),
    historique: (page = 0) => d<Course[]>(api.get('/courses', { params: { page } })),
    detail: (id: number) => d<Course>(api.get(`/courses/${id}`)),
    offres: (id: number) => d<Offre[]>(api.get(`/courses/${id}/offres`)),
    choisir: (id: number, offreId: number) => d<Course>(api.post(`/courses/${id}/offres/${offreId}/choisir`)),
    annuler: (id: number, motif?: string) => d<Course>(api.post(`/courses/${id}/annuler`, { motif })),
    noter: (id: number, note: number, commentaire?: string) => api.post(`/courses/${id}/noter`, { note, commentaire }),
    messages: (id: number) => d<Message[]>(api.get(`/courses/${id}/messages`)),
    envoyer: (id: number, contenu: string) => d<Message>(api.post(`/courses/${id}/messages`, { contenu })),
    partage: (id: number) => d<{ lien: string; message: string }>(api.get(`/courses/${id}/partage`)),
    recu: (id: number) => d<{ url: string }>(api.get(`/courses/${id}/recu`)),
    paiement: (id: number) => d<Paiement>(api.get(`/courses/${id}/paiement`)),
    payer: (id: number, mode: ModePaiement, telephone?: string) => d<Paiement>(api.post(`/courses/${id}/payer`, { mode, telephone })),
    payerEspeces: (id: number) => api.post(`/courses/${id}/payer-especes`)
  },
  chauffeur: {
    disponibilite: (disponible: boolean, lat?: number, lng?: number) => d<Utilisateur>(api.put('/chauffeur/disponibilite', { disponible, lat, lng })),
    ramassage: (body: { actif: boolean; placesLibres?: number; directionLibelle?: string; directionLat?: number; directionLng?: number }) =>
      d<Utilisateur>(api.put('/chauffeur/ramassage', body)),
    places: (placesLibres: number) => d<Utilisateur>(api.put('/chauffeur/places', { placesLibres })),
    casque: (disponible: boolean) => d<Utilisateur>(api.put('/chauffeur/casque', { disponible })),
    position: (lat: number, lng: number) => api.post('/chauffeur/position', { lat, lng }),
    demandes: () => d<DemandeChauffeur[]>(api.get('/chauffeur/demandes')),
    repondre: (courseId: number, body: { type: 'ACCEPTATION' | 'CONTRE_PROPOSITION'; prix?: number; casqueConfirme?: boolean }) =>
      d<Offre>(api.post(`/chauffeur/demandes/${courseId}/repondre`, body)),
    ignorer: (courseId: number) => api.post(`/chauffeur/demandes/${courseId}/ignorer`),
    coursesActives: () => d<Course[]>(api.get('/chauffeur/courses/actives')),
    arrivee: (id: number) => d<Course>(api.post(`/chauffeur/courses/${id}/arrivee`)),
    demarrer: (id: number, code: string) => d<Course>(api.post(`/chauffeur/courses/${id}/demarrer`, { code })),
    terminer: (id: number) => d<Course>(api.post(`/chauffeur/courses/${id}/terminer`)),
    annuler: (id: number, motif?: string) => api.post(`/chauffeur/courses/${id}/annuler`, { motif }),
    especesRecues: (id: number) => api.post(`/chauffeur/courses/${id}/especes-recues`),
    itineraire: (id: number) => d<{ distanceKm: number; dureeMin: number; trace: [number, number][] }>(api.get(`/chauffeur/courses/${id}/itineraire`)),
    gains: () => d<Gains>(api.get('/chauffeur/gains')),
    zonesDemande: () => d<{ lat: number; lng: number; demandes: number }[]>(api.get('/chauffeur/zones-demande')),
    documents: () => d<DocumentChauffeur[]>(api.get('/chauffeur/documents')),
    flotte: () => d<Flotte>(api.get('/chauffeur/flotte')),
    retirer: (montant: number, telephone: string, operateur: 'MTN' | 'ORANGE') => d<Retrait>(api.post('/chauffeur/retraits', { montant, telephone, operateur })),
    retraits: () => d<Retrait[]>(api.get('/chauffeur/retraits'))
  },
  portefeuille: {
    get: () => d<{ solde: number; transactions: Transaction[] }>(api.get('/portefeuille')),
    recharger: (montant: number, mode: 'MTN_MOMO' | 'ORANGE_MONEY', telephone?: string) =>
      d<Paiement>(api.post('/portefeuille/recharge', { montant, mode, telephone })),
    paiement: (id: number) => d<Paiement>(api.get(`/paiements/${id}`))
  },
  securite: {
    sos: (body: { courseId?: number; lat?: number; lng?: number }) => d<{ id: number }>(api.post('/sos', body)),
    positionSos: (id: number, lat: number, lng: number) => api.put(`/sos/${id}/position`, { lat, lng })
  },
  reclamations: {
    liste: () => d<Reclamation[]>(api.get('/reclamations')),
    creer: (body: { courseId?: number; type: string; description: string }) => d<Reclamation>(api.post('/reclamations', body))
  },
  reperes: {
    rechercher: (q?: string, lat?: number, lng?: number) => d<Repere[]>(api.get('/reperes', { params: { q, lat, lng } })),
    proposer: (body: { nom: string; description?: string; categorie: string; ville: string; lat: number; lng: number }) => d<Repere>(api.post('/reperes', body))
  },
  carte: {
    vehiculesProches: (lat: number, lng: number) =>
      d<{ id: string; type: 'TAXI' | 'RAMASSAGE' | 'MOTO'; lat: number; lng: number; cap: number }[]>(api.get('/carte/vehicules-proches', { params: { lat, lng } })),
    itineraire: (deLat: number, deLng: number, versLat: number, versLng: number) =>
      d<{ distanceKm: number; dureeMin: number; trace: [number, number][] }>(api.get('/carte/itineraire', { params: { deLat, deLng, versLat, versLng } }))
  },
  config: () => d<{ smsSimulation: boolean; paiement: string; numeroSupport: string; numeroUrgence: string }>(api.get('/public/config'))
};
