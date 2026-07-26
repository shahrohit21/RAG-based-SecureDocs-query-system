import axiosClient from './axiosClient';

export const documentApi = {
  uploadDocument: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  getDocuments: async () => {
    const response = await axiosClient.get('/documents');
    return response.data;
  },

  viewDocumentContent: async (documentId) => {
    const response = await axiosClient.get(`/documents/${documentId}/view`);
    return response.data;
  },

  deleteDocument: async (documentId) => {
    const response = await axiosClient.delete(`/documents/${documentId}`);
    return response.data;
  },
};
