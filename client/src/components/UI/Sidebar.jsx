import { useState, useMemo } from 'react';
import { useBusStore } from '../../store/busStore';
import { IDSAlgorithm } from '../../algorithms/ids';
import { BFSAlgorithm } from '../../algorithms/bfs';
import { findNearestStop, findStopsInRadius } from '../../algorithms/graph';

export default function Sidebar() {
  const {
    routes,
    graph,
    setFrom,
    setTo,
    setIDSResult,
    setBFSResult,
    isSearching,
    setIsSearching,
    resetSearch
  } = useBusStore();

  const [inputMode, setInputMode] = useState('select');
  const [fromInput, setFromInput] = useState('16.0738, 108.2280');
  const [toInput, setToInput] = useState('16.0650, 108.2190');
  const [selectedFromStop, setSelectedFromStop] = useState('');
  const [selectedToStop, setSelectedToStop] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState([]);

  const allStops = useMemo(() => {
    const stopMap = new Map();
    routes.forEach(route => {
      route.stops.forEach(stop => {
        if (!stopMap.has(stop.id)) {
          stopMap.set(stop.id, {
            ...stop,
            routes: [route.id],
            routeName: route.name
          });
        } else {
          const existing = stopMap.get(stop.id);
          if (!existing.routes.includes(route.id)) {
            existing.routes.push(route.id);
          }
        }
      });
    });
    return Array.from(stopMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [routes]);

  const handleSearch = () => {
    try {
      setIsSearching(true);
      let fromPoint, toPoint, startStop, endStop;

      if (inputMode === 'select') {
        if (!selectedFromStop || !selectedToStop) {
          alert('Chọn trạm đi và trạm đến');
          setIsSearching(false);
          return;
        }

        startStop = graph.nodes[selectedFromStop];
        endStop = graph.nodes[selectedToStop];

        if (!startStop || !endStop) {
          alert('Không có trạm này trong đồ thị');
          setIsSearching(false);
          return;
        }

        fromPoint = { lat: startStop.lat, lng: startStop.lng };
        toPoint = { lat: endStop.lat, lng: endStop.lng };
      } else {
        const [fromLat, fromLng] = fromInput.split(',').map(s => parseFloat(s.trim()));
        const [toLat, toLng] = toInput.split(',').map(s => parseFloat(s.trim()));

        if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
          alert('Tọa độ không đúng. Ghi dạng lat, lng');
          setIsSearching(false);
          return;
        }

        fromPoint = { lat: fromLat, lng: fromLng };
        toPoint = { lat: toLat, lng: toLng };

        startStop = findNearestStop(fromPoint, graph.nodes, 1000);
        endStop = findNearestStop(toPoint, graph.nodes, 1000);

        if (!startStop || !endStop) {
          alert('Không có trạm trong bán kính 1 km');
          setIsSearching(false);
          return;
        }
      }

      setFrom(fromPoint);
      setTo(toPoint);

      const idsAlgo = new IDSAlgorithm(graph);
      let idsResult;

      if (selectedRoute) {
        idsResult = idsAlgo.searchByRoute(startStop.id, selectedRoute, 20);
      } else {
        idsResult = idsAlgo.search(startStop.id, endStop.id, 20);
      }

      const bfsAlgo = new BFSAlgorithm(graph);
      const bfsResult = bfsAlgo.search(startStop.id, endStop.id);

      setIDSResult({ ...idsResult, startStop, endStop });
      setBFSResult({ ...bfsResult, startStop, endStop });

      if (idsResult.found) {
        findAlternativeRoutes(fromPoint, toPoint, startStop, endStop);
      }

      setIsSearching(false);
    } catch (error) {
      console.error(error);
      alert('Lỗi: ' + error.message);
      setIsSearching(false);
    }
  };

  const findAlternativeRoutes = (fromPoint, toPoint, primaryStart, primaryEnd) => {
    try {
      const startStops = findStopsInRadius(fromPoint, graph.nodes, 500)
        .filter(s => s.id !== primaryStart.id)
        .slice(0, 3);

      const endStops = findStopsInRadius(toPoint, graph.nodes, 500)
        .filter(s => s.id !== primaryEnd.id)
        .slice(0, 3);

      const alternativeResults = [];

      for (const start of startStops) {
        for (const end of endStops) {
          const idsAlgo = new IDSAlgorithm(graph);
          const result = idsAlgo.search(start.id, end.id, 15);

          if (result.found) {
            alternativeResults.push({
              startStop: start,
              endStop: end,
              walkToStart: start.distance,
              walkFromEnd: end.distance,
              path: result.path,
              pathDetails: result.pathDetails,
              totalStops: result.path.length
            });
          }
        }
      }

      alternativeResults.sort((a, b) => {
        const distA = a.walkToStart + a.walkFromEnd + a.totalStops * 500;
        const distB = b.walkToStart + b.walkFromEnd + b.totalStops * 500;
        return distA - distB;
      });

      setAlternatives(alternativeResults.slice(0, 3));
      if (alternativeResults.length > 0) {
        setShowAlternatives(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="w-96 bg-white shadow-lg overflow-y-auto flex flex-col">
      <div className="p-6 bg-gradient-to-r from-primary to-blue-600 text-white">
        <h1 className="text-2xl font-bold mb-2">Xe buýt Đà Nẵng</h1>
        <p className="text-sm opacity-90">Tìm đường bằng IDS</p>
      </div>

      <div className="p-6 space-y-4 flex-1">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputMode('select')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'select'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Chọn trạm
          </button>
          <button
            onClick={() => setInputMode('coords')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'coords'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Nhập tọa độ
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lọc tuyến
          </label>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="">Mọi tuyến</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>
                Tuyến {route.id}: {route.from} - {route.to}
              </option>
            ))}
          </select>
        </div>

        {inputMode === 'select' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạm đi
              </label>
              <select
                value={selectedFromStop}
                onChange={(e) => setSelectedFromStop(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Chọn trạm đi</option>
                {allStops.map(stop => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name} (tuyến {stop.routes.join(', ')})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {allStops.length} trạm
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạm đến
              </label>
              <select
                value={selectedToStop}
                onChange={(e) => setSelectedToStop(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Chọn trạm đến</option>
                {allStops.map(stop => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name} (tuyến {stop.routes.join(', ')})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {inputMode === 'coords' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Điểm đi (lat, lng)
              </label>
              <input
                type="text"
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                placeholder="16.0738, 108.2280"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Điểm đến (lat, lng)
              </label>
              <input
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="16.0650, 108.2190"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="flex-1 bg-primary text-white px-4 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang tìm
              </>
            ) : (
              'Tìm đường'
            )}
          </button>

          <button
            onClick={resetSearch}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Xóa
          </button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">Điền nhanh điểm đi</p>
          <div className="space-y-1 text-xs">
            <button
              onClick={() => setFromInput('16.0738, 108.2280')}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
            >
              Bến xe Đà Nẵng
            </button>
            <button
              onClick={() => setFromInput('16.0650, 108.2190')}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
            >
              Chợ Hàn
            </button>
            <button
              onClick={() => setFromInput('16.0610, 108.2270')}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
            >
              Cầu Rồng
            </button>
            <button
              onClick={() => setFromInput('16.0410, 108.2480')}
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
            >
              Mỹ Khê
            </button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500">
            Nhập hai điểm trong Đà Nẵng. App lấy trạm gần nhất rồi chạy IDS.
          </p>
        </div>

        {showAlternatives && alternatives.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Đường khác ({alternatives.length})
              </p>
              <button
                onClick={() => setShowAlternatives(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Ẩn
              </button>
            </div>
            <div className="space-y-2">
              {alternatives.map((alt, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs"
                >
                  <div className="font-medium text-blue-900 mb-1">
                    Phương án {idx + 2}
                  </div>
                  <div className="space-y-1 text-blue-700">
                    <div>
                      Đi bộ {Math.round(alt.walkToStart)} m tới {alt.startStop.name}
                    </div>
                    <div>
                      {alt.totalStops} trạm, {alt.pathDetails?.length || 0} đoạn
                    </div>
                    <div>
                      Đi bộ {Math.round(alt.walkFromEnd)} m từ {alt.endStop.name}
                    </div>
                    <div className="pt-1 border-t border-blue-300 mt-2 font-medium">
                      Khoảng {Math.round((alt.walkToStart + alt.walkFromEnd) / 83 + alt.totalStops * 2)} phút
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {routes.length} tuyến
          </p>
          <div className="space-y-1">
            {routes.map((route) => (
              <div key={route.id} className="text-xs text-gray-600">
                <span className="font-semibold text-primary">Tuyến {route.id}:</span>{' '}
                {route.stops.length} trạm
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
