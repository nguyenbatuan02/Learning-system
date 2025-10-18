import api from '../lib/api';

export const authService = {
  // Register
  register: async (email, password, fullName) => {
    const { data } = await api.post('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return data;
  },

  // Login
  login: async (email, password) => {
    const { data } = await api.post('/api/v1/auth/login', {
      email,
      password,
    });
    return data;
  },

  // Logout
  logout: async () => {
    const { data } = await api.post('/api/v1/auth/logout');
    return data;
  },

  // Get current user
  getCurrentUser: async () => {
    const { data } = await api.get('/api/v1/users/me');
    return data;
  },

  // Update profile
  updateProfile: async (updates) => {
    const { data } = await api.put('/api/v1/users/me', updates);
    return data;
  },

  // Change password  
  changePassword: async (data) => {
     const { data: response } = await api.put('/api/v1/users/me/password', {
       current_password: data.currentPassword,
       new_password: data.newPassword,
     });
     return response;
   }
};

 