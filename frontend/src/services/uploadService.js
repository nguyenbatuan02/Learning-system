import api from '../lib/api';

export const uploadService = {
  // Upload file
  uploadFile: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/api/v1/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress?.(percentCompleted);
      },
    });
    return data;
  },

  // Process file (OCR + AI extraction)
  processFile: async (fileId) => {
    const { data } = await api.post(`/api/v1/upload/process/${fileId}`);
    return data;
  },

  // Edit extracted text
  editText: async (fileId, editedText) => {
    const { data } = await api.put('/api/v1/upload/edit-text', {
      file_id: fileId,
      edited_text: editedText,
    });
    return data;
  },

  // Get my files
  getMyFiles: async () => {
    const { data } = await api.get('/api/v1/upload/my-files');
    return data;
  },

  // Delete file
  deleteFile: async (fileId) => {
    const { data } = await api.delete(`/api/v1/upload/${fileId}`);
    return data;
  },
};