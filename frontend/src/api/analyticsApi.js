import axiosClient from './axiosClient';

export const analyticsApi = {
  getStats: async () => {
    const response = await axiosClient.get('/analytics/stats');
    return response.data;
  },
};
