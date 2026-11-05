import { useEffect, useState } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/UI/Sidebar';
import IDSVisualizer from './components/Algorithm/IDSVisualizer';
import StatsPanel from './components/Algorithm/StatsPanel';
import WalkingDirections from './components/UI/WalkingDirections';
import { useBusStore } from './store/busStore';
import api from './services/api';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setRoutes, setStops, setGraph, routes } = useBusStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);

      const routesData = await api.getRoutes();
      setRoutes(routesData);

      const stopsData = await api.getStops();
      setStops(stopsData);

      const graphData = await api.getGraph();
      setGraph(graphData);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Đang tải dữ liệu xe buýt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tải được dữ liệu</h2>
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

        <div className="absolute top-4 right-4 z-10 space-y-4">
          <StatsPanel />
          <WalkingDirections />
        </div>

        <div className="absolute bottom-4 right-4 z-10 max-w-md">
          <IDSVisualizer />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Xe buýt Đà Nẵng</span>
        </p>
        <p className="text-xs text-gray-500">
          {routes?.length || 0} tuyến, tìm đường bằng IDS
        </p>
      </div>
    </div>
  );
}

export default App;
