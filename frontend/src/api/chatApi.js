import axiosClient from './axiosClient';

export const chatApi = {
  // Chat asking endpoint supporting session_id
  askQuestion: async (question, sessionId = null) => {
    const payload = { question };
    if (sessionId) {
      payload.session_id = sessionId;
    }
    const response = await axiosClient.post('/chat', payload);
    return response.data;
  },

  // Multi-chat sessions
  getSessions: async () => {
    const response = await axiosClient.get('/chat/sessions');
    return response.data;
  },

  createSession: async (title = 'New Conversation') => {
    const response = await axiosClient.post('/chat/sessions', { title });
    return response.data;
  },

  renameSession: async (sessionId, title) => {
    const response = await axiosClient.patch(`/chat/sessions/${sessionId}`, { title });
    return response.data;
  },

  deleteSession: async (sessionId) => {
    const response = await axiosClient.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  getSessionMessages: async (sessionId) => {
    const response = await axiosClient.get(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },

  getHistory: async (sessionId = null) => {
    const url = sessionId ? `/chat/history?session_id=${sessionId}` : '/chat/history';
    const response = await axiosClient.get(url);
    return response.data;
  },

  clearHistory: async (sessionId = null) => {
    const url = sessionId ? `/chat/history?session_id=${sessionId}` : '/chat/history';
    const response = await axiosClient.delete(url);
    return response.data;
  },

  // Export report as PDF or DOCX
  exportReport: async (sessionId = null, format = 'pdf') => {
    let url = `/chat/export?format=${format}`;
    if (sessionId) {
      url += `&session_id=${sessionId}`;
    }
    const response = await axiosClient.get(url, {
      responseType: 'blob',
    });
    return response;
  },
};
