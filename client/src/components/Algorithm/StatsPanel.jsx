import { useBusStore } from '../../store/busStore';

export default function StatsPanel() {
  const { idsResult, bfsResult } = useBusStore();

  if (!idsResult && !bfsResult) {
    return null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 min-w-[300px]">
      <h3 className="text-lg font-bold text-gray-800 mb-3">
        IDS và BFS
      </h3>

      <div className="space-y-3">
        {idsResult && (
          <div className="border-l-4 border-primary pl-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-primary">IDS</span>
              {idsResult.found ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Tìm thấy</span>
              ) : (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Không thấy</span>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Node đã thăm</span>
                <strong>{idsResult.stats.nodesVisited}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Độ sâu lớn nhất</span>
                <strong>{idsResult.stats.depthReached}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian</span>
                <strong>{idsResult.stats.timeTaken.toFixed(2)} ms</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số lần lặp</span>
                <strong>{idsResult.stats.iterationsCount}</strong>
              </div>
              {idsResult.found && idsResult.path && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Số trạm</span>
                  <strong>{idsResult.path.length}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {bfsResult && (
          <div className="border-l-4 border-secondary pl-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-secondary">BFS</span>
              {bfsResult.found ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Tìm thấy</span>
              ) : (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Không thấy</span>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Node đã thăm</span>
                <strong>{bfsResult.stats.nodesVisited}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hàng đợi lớn nhất</span>
                <strong>{bfsResult.stats.maxQueueSize}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian</span>
                <strong>{bfsResult.stats.timeTaken.toFixed(2)} ms</strong>
              </div>
              {bfsResult.found && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Số trạm</span>
                  <strong>{bfsResult.path.length}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {idsResult && bfsResult && (
          <div className="pt-3 border-t text-xs text-gray-600">
            <p>
              IDS giữ ít bộ nhớ hơn vì chỉ lưu nhánh đang xét. Nó duyệt lại các độ sâu nhỏ nên số node có thể nhiều hơn BFS.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
