import axiosClient from './axiosClient';

export const chatApi = {
  askQuestion: async (question) => {
    const response = await axiosClient.post('/chat', { question });
    return response.data;
  },

  getHistory: async () => {
    const response = await axiosClient.get('/chat/history');
    return response.data;
  },

  clearHistory: async () => {
    const response = await axiosClient.delete('/chat/history');
    return response.data;
  },
};
