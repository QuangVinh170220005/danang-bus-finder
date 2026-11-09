import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'),
  timeout: 10000
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success) return response.data.data;
    return response.data;
  },
  (error) => {
    throw error.response?.data?.error || error.message;
  }
);

const api = {
  getRoutes() {
    return apiClient.get('/bus/routes');
  }
};

export default api;
