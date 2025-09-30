import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

export const messagesAPI = {
  getMessages: (room) => api.get(`/messages/${room}`),
};

export default api;