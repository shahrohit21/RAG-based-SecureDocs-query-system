import axiosClient from './axiosClient';

export const authApi = {
  login: async (email, password) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email, password, fullName) => {
    const response = await axiosClient.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  },
};
