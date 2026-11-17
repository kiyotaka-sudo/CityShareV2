import api from './axiosConfig';
import { Parcel, Trip } from '../types';
import { normalizeTrips } from '../utils/tripMapper';

export const colisApi = {
  match: async (params: { depart: string; arrivee: string; poids: string }) => {
    const { data } = await api.get<Trip[]>('/colis/match', { params });
    return normalizeTrips(data);
  },
  create: async (
    payload: Partial<Parcel> & {
      conducteurId?: number;
      trajetId?: number;
      latDepart?: number;
      lngDepart?: number;
      latArrivee?: number;
      lngArrivee?: number;
    }
  ) => {
    const { data } = await api.post<Parcel>('/colis/', payload);
    return data;
  },
  track: async (id: number) => {
    const { data } = await api.get<Parcel>(`/colis/${id}`);
    return data;
  }
};
