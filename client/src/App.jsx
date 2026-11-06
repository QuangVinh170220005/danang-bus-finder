import { useEffect, useState } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/UI/Sidebar';
import { useBusStore } from './store/busStore';
import api from './services/api';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setRoutes } = useBusStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      const routesData = await api.getRoutes();
      setRoutes(routesData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không gọi được API');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Đang tải danh sách tuyến...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không tải được dữ liệu</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 relative">
        <MapView />
      </div>
    </div>
  );
}

export default App;
