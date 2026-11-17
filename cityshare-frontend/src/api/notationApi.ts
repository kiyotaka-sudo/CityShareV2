import api from './axiosConfig';

export const notationApi = {
  create: async (payload: { noteId: number; note: number; criteres: string[]; commentaire: string }) => {
    const { data } = await api.post('/notations/', {
      noteId: payload.noteId,
      note: payload.note,
      criteres: payload.criteres,
      commentaire: payload.commentaire
    });
    return data;
  }
};
