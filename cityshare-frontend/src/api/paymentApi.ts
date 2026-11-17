import api from './axiosConfig';

export type PaymentOperator = 'CM_MTNMOBILEMONEY' | 'CM_ORANGEMONEY';

export interface PaymentInit {
  paiementId: number;
  paymentRef: string;
  paymentUrl?: string | null;
  statut: string;
  montant: number;
  devise: string;
  operateur?: PaymentOperator;
}

export const paymentApi = {
  init: async (reservationId: number, phone: string | undefined, operator: PaymentOperator) => {
    const { data } = await api.post<PaymentInit>(
      `/payments/reservation/${reservationId}/init`,
      null,
      { params: { ...(phone ? { phone } : {}), operator } }
    );
    return data;
  },
  status: async (reservationId: number) => {
    const { data } = await api.get<PaymentInit>(`/payments/reservation/${reservationId}/status`);
    return data;
  },
  simulate: async (reservationId: number) => {
    const { data } = await api.post<PaymentInit>(`/payments/reservation/${reservationId}/simulate`);
    return data;
  }
};
