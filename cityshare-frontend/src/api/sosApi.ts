import api from './axiosConfig';

export const sosApi = {
  create: async (payload: { latitude?: number; longitude?: number; address?: string }) => {
    const { data } = await api.post('/sos/', {
      latitude: payload.latitude,
      longitude: payload.longitude,
      adresseApprox: payload.address,
      type: 'MANUEL'
    });
    return data;
  }
};
