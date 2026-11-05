import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    console.error(error);
    throw error.response?.data?.error || error.message;
  }
);

const api = {
  async getRoutes() {
    return await apiClient.get('/bus/routes');
  },

  async getRouteById(routeId) {
    return await apiClient.get(`/bus/routes/${routeId}`);
  },

  async getStops() {
    return await apiClient.get('/bus/stops');
  },

  async findNearbyStops(lat, lng, radius = 500) {
    return await apiClient.get('/bus/stops/near', {
      params: { lat, lng, radius }
    });
  },

  async searchRoute(from, to, algorithm = 'ids') {
    return await apiClient.post('/search/route', {
      from,
      to,
      algorithm
    });
  },

  async getGraph() {
    return await apiClient.get('/search/graph');
  },

  async getRouteGeometry(routeId) {
    return await apiClient.get(`/bus/routes/${routeId}/geometry`);
  },

  async healthCheck() {
    return await apiClient.get('/health');
  }
};

export default api;
