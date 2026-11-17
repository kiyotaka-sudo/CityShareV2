import api from './axiosConfig';
import { Reservation } from '../types';
import { normalizeTrip } from '../utils/tripMapper';

export interface QRValidateResult {
  valid: boolean;
  message: string;
  reservation?: Reservation;
}

export const reservationApi = {
  create: async (trajetId: number, nbPlaces = 1) => {
    const { data } = await api.post<Reservation>('/reservations/', { trajetId, nbPlaces });
    if (data.trajet) {
      data.trajet = normalizeTrip(data.trajet);
    }
    return data;
  },
  mine: async () => {
    const { data } = await api.get<Reservation[]>('/reservations/mes-reservations');
    return data.map((item) => ({
      ...item,
      trajet: item.trajet ? normalizeTrip(item.trajet) : item.trajet
    }));
  },
  conducteurPassengers: async () => {
    const { data } = await api.get<Reservation[]>('/reservations/conducteur/mes-passagers');
    return data.map((item) => ({
      ...item,
      trajet: item.trajet ? normalizeTrip(item.trajet) : item.trajet
    }));
  },
  validateQr: async (reservationId: number, token: string) => {
    const { data } = await api.post<QRValidateResult>(`/reservations/${reservationId}/validate-qr`, { token });
    return data;
  },
  validateArrivalQr: async (reservationId: number, token: string) => {
    const { data } = await api.post<QRValidateResult>(`/reservations/${reservationId}/validate-arrival-qr`, { token });
    return data;
  },
  confirmerArrivee: async (reservationId: number) => {
    const { data } = await api.post<Reservation>(`/reservations/${reservationId}/confirmer-arrivee`);
    if (data.trajet) {
      data.trajet = normalizeTrip(data.trajet);
    }
    return data;
  }
};
