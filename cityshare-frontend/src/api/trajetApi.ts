import api from './axiosConfig';
import { Trip } from '../types';
import { normalizeTrip, normalizeTrips } from '../utils/tripMapper';

export const trajetApi = {
  search: async (params: { depart?: string; arrivee?: string; date?: string; places?: number }) => {
    const { data } = await api.get<Trip[]>('/trajets', { params });
    return normalizeTrips(data);
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post<Trip>('/trajets/', payload);
    return normalizeTrip(data);
  },
  listMine: async () => {
    const { data } = await api.get<Trip[]>('/trajets/mes-trajets');
    return normalizeTrips(data);
  },
  demarrer: async (id: number) => {
    const { data } = await api.post<Trip>(`/trajets/${id}/demarrer`);
    return data;
  },
  terminer: async (id: number) => {
    const { data } = await api.post<Trip>(`/trajets/${id}/terminer`);
    return data;
  }
};
