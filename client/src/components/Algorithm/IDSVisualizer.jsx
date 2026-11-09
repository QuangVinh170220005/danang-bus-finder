import { useEffect, useRef } from 'react';
import { useBusStore } from '../../store/busStore';

export default function IDSVisualizer() {
  const {
    idsSimulating,
    idsProgress,
    idsTable,
    idsComparison,
    idsSpeed,
    idsMaxDepth,
    idsTargetType,
    idsStatusText,
    startIDSSimulation,
    stopIDSSimulation,
    clearIDSSimulation,
    setIdsSpeed,
    setIdsMaxDepth,
    setIdsTargetType,
    tuyenId
  } = useBusStore();

  const tableEndRef = useRef(null);

  useEffect(() => {
    if (tableEndRef.current) {
      tableEndRef.current.scrollTop = tableEndRef.current.scrollHeight;
    }
  }, [idsTable.length]);

  return (
    <div className="border rounded p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">4. Mô phỏng thuật toán IDS</p>
        {idsSimulating && (
          <span className="flex items-center gap-1.5 text-xs text-primary font-semibold bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            Đang duyệt...
          </span>
        )}
      </div>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">Mục tiêu tìm kiếm</span>
        <select
          value={idsTargetType}
          onChange={(e) => setIdsTargetType(e.target.value)}
          disabled={idsSimulating}
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white disabled:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="route_stop">Trạm xe buýt trên Tuyến {tuyenId || 'đang chọn'}</option>
          <option value="destination">Điểm đến đã chọn (B)</option>
          <option value="nearest_station">Bến xe bất kỳ gần nhất</option>
        </select>
      </label>

      <label className="flex items-center justify-between gap-2 text-sm text-gray-700">
        Độ sâu tối đa (L)
        <span className="flex items-center gap-2">
          <input
            type="range"
            min="5"
            max="40"
            value={idsMaxDepth}
            onChange={(e) => setIdsMaxDepth(+e.target.value)}
            disabled={idsSimulating}
          />
          <b className="w-14 text-right">{idsMaxDepth}</b>
        </span>
      </label>

      <label className="flex items-center justify-between gap-2 text-sm text-gray-700">
        Tốc độ chạy
        <span className="flex items-center gap-2">
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={idsSpeed}
            onChange={(e) => setIdsSpeed(+e.target.value)}
          />
          <b className="w-14 text-right">{idsSpeed} ms</b>
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        {idsSimulating ? (
          <button
            onClick={stopIDSSimulation}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Tạm dừng
          </button>
        ) : (
          <button
            onClick={startIDSSimulation}
            className="flex-1 bg-primary hover:bg-blue-600 text-white rounded px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Chạy IDS
          </button>
        )}
        <button
          onClick={clearIDSSimulation}
          disabled={idsSimulating}
          className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors"
        >
          Xóa
        </button>
      </div>

      {idsStatusText && (
        <div className="text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded p-2.5">
          {idsStatusText}
        </div>
      )}

      {/* Bảng theo dõi tiến trình duyệt từng độ sâu L */}
      {idsTable.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-semibold text-gray-700 flex justify-between">
            <span>Tiến trình mở rộng theo độ sâu</span>
            <span className="text-gray-500 font-normal">{idsTable.length} lần lặp</span>
          </div>
          <div
            ref={tableEndRef}
            className="max-h-48 overflow-y-auto border border-gray-200 rounded text-xs bg-white"
          >
            <table className="w-full text-right border-collapse">
              <thead className="bg-gray-100 text-gray-700 sticky top-0 border-b border-gray-200 text-xs">
                <tr>
                  <th className="py-1.5 px-2.5 text-center font-medium">Giới hạn L</th>
                  <th className="py-1.5 px-2.5 font-medium">Lượt duyệt</th>
                  <th className="py-1.5 px-2.5 font-medium">Nút khác</th>
                  <th className="py-1.5 px-2.5 text-center font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono text-xs">
                {idsTable.map((row, idx) => (
                  <tr
                    key={idx}
                    className={row.hit ? 'bg-blue-50 font-bold text-primary' : 'hover:bg-gray-50'}
                  >
                    <td className="py-1.5 px-2.5 text-center">{row.L}</td>
                    <td className="py-1.5 px-2.5">{row.cnt.toLocaleString()}</td>
                    <td className="py-1.5 px-2.5">{row.seenCount.toLocaleString()}</td>
                    <td className={`py-1.5 px-2.5 text-center font-sans font-semibold ${row.hit ? 'text-primary' : 'text-gray-500'}`}>
                      {row.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Khung so sánh bộ nhớ với BFS */}
      {idsComparison && (
        <div className="bg-blue-50/70 border border-blue-200 rounded p-3 text-xs text-blue-900 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5 text-primary">
            <span>So sánh hiệu quả bộ nhớ:</span>
          </p>
          <p className="leading-relaxed text-gray-700">
            Ngăn xếp của <b className="text-gray-900">IDS</b> chỉ sâu tối đa <b className="text-primary">{idsComparison.idsMemory}</b> nút.
            Trong khi đó, <b className="text-gray-900">BFS</b> phải giữ tới <b className="text-red-600">{idsComparison.bfsQueuePeak.toLocaleString()}</b> nút trong hàng đợi để cùng tìm ra đường ngắn nhất ({idsComparison.steps} chặng).
          </p>
        </div>
      )}
    </div>
  );
}
