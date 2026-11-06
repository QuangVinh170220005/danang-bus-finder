import { useBusStore } from '../../store/busStore';

function Dong({ ten, giaTri }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-600">{ten}</span>
      <strong>{giaTri}</strong>
    </div>
  );
}

function MotThuatToan({ ten, mau, ketQua, laIDS }) {
  if (!ketQua) return null;
  const { stats, found, path } = ketQua;

  return (
    <div className={`border-l-4 ${mau} pl-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{ten}</span>
        <span className={`text-xs px-2 py-1 rounded ${found ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {found ? 'Tìm thấy' : 'Không thấy'}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <Dong ten="Số nút đã xét" giaTri={stats.nodesVisited} />
        <Dong ten="Thời gian" giaTri={`${stats.timeTaken.toFixed(2)} ms`} />
        <Dong ten="Độ sâu" giaTri={stats.depthReached} />
        <Dong
          ten={laIDS ? 'Bộ nhớ (nhánh đang đi)' : 'Bộ nhớ (hàng đợi)'}
          giaTri={`${stats.memoryNodes} nút`}
        />
        {laIDS && <Dong ten="Số lần tăng độ sâu" giaTri={stats.iterationsCount} />}
        {found && <Dong ten="Số bước trên đường" giaTri={Math.max(path.length - 1, 0)} />}
      </div>
    </div>
  );
}

export default function StatsPanel() {
  const { idsResult, bfsResult } = useBusStore();

  if (!idsResult && !bfsResult) return null;

  let giaiThich = 'Hai thuật toán tìm trên cùng một đồ thị, cùng điểm đi và điểm đến.';
  if (idsResult && bfsResult) {
    const cungDuong = idsResult.found && bfsResult.found && idsResult.path.join('|') === bfsResult.path.join('|');
    giaiThich = `IDS xét ${idsResult.stats.nodesVisited} nút và nhớ ${idsResult.stats.memoryNodes} nút trên nhánh đang đi. BFS xét ${bfsResult.stats.nodesVisited} nút và nhớ ${bfsResult.stats.memoryNodes} nút trong hàng đợi. `;
    giaiThich += cungDuong
      ? 'Hai bên ra cùng một đường. IDS xét nhiều hơn vì làm lại các độ sâu nhỏ. BFS mỗi nút xét một lần nhưng phải giữ hàng đợi.'
      : 'Hai bên không ra cùng một đường.';
  }

  return (
    <div className="bg-white rounded-lg border p-4 w-full">
      <h3 className="text-lg font-bold text-gray-800 mb-3">So sánh IDS và BFS</h3>
      <div className="space-y-3">
        <MotThuatToan ten="IDS" mau="border-primary" ketQua={idsResult} laIDS />
        <MotThuatToan ten="BFS" mau="border-secondary" ketQua={bfsResult} />
        <p className="pt-3 border-t text-xs text-gray-600">{giaiThich}</p>
      </div>
    </div>
  );
}
