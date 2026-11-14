import { useBusStore } from '../../store/busStore';
import { tenChieu } from '../../algorithms/graph';
import { formatKm, formatPhut } from '../../algorithms/goiYTuyen';

function ThePhuongAn({ tieuDe, moTa, ketQua, dangXem, onXem }) {
  return (
    <button
      type="button"
      onClick={onXem}
      disabled={!ketQua?.thanhCong}
      className={`w-full text-left border rounded p-3 space-y-1 ${dangXem ? 'border-primary bg-blue-50' : 'border-gray-200'} disabled:opacity-60`}
    >
      <p className="text-sm font-bold text-gray-800">{tieuDe}</p>
      <p className="text-xs text-gray-500">{moTa}</p>
      {ketQua?.thanhCong ? (
        <>
          <p className="text-sm font-semibold text-gray-900">
            Tuyến {ketQua.tuyenId}, {tenChieu(ketQua.chieu)}
          </p>
          <p className="text-sm text-gray-800">
            {formatKm(ketQua.thongKe.tongMet)} · khoảng {formatPhut(ketQua.thongKe.phut)} · {ketQua.thongKe.soTram} trạm
          </p>
          <p className="text-xs text-gray-600">
            Lên {ketQua.tramDon.name}, xuống {ketQua.tramXuong.name}.
            <br />
            Xe {formatKm(ketQua.thongKe.metXe)}, đi bộ {formatKm(ketQua.thongKe.metDiBo)}.
          </p>
          <p className="text-xs text-gray-500">
            IDS xét {ketQua.ids.stats.nodesVisited} nút, {ketQua.ids.stats.iterationsCount} lần nới giới hạn, độ sâu {ketQua.ids.stats.depthReached}.
          </p>
        </>
      ) : (
        <p className="text-xs text-red-700">{ketQua?.thongBao || 'Chưa chạy.'}</p>
      )}
    </button>
  );
}

export default function IDSVisualizer() {
  const { goiY, phuongAn, tieuChiDangXem, chayIDSHaiPhuongAn, xemPhuongAn } = useBusStore();
  const coTuyen = Boolean(goiY?.ds?.length);
  const cungMot = phuongAn?.itTram?.thanhCong
    && phuongAn?.nganNhat?.thanhCong
    && phuongAn.itTram.tuyenId === phuongAn.nganNhat.tuyenId
    && phuongAn.itTram.chieu === phuongAn.nganNhat.chieu
    && phuongAn.itTram.tramDon.id === phuongAn.nganNhat.tramDon.id
    && phuongAn.itTram.tramXuong.id === phuongAn.nganNhat.tramXuong.id;

  return (
    <div className="border rounded p-4 space-y-3 bg-white">
      <p className="text-sm font-bold text-gray-800">3. IDS chọn trong các tuyến trên</p>
      <p className="text-xs text-gray-600">
        IDS duyệt mọi tuyến vừa gợi ý, rồi trả về hai đường: ít trạm nhất, và quãng đường ngắn nhất.
      </p>
      <button
        type="button"
        onClick={chayIDSHaiPhuongAn}
        disabled={!coTuyen}
        className="w-full bg-primary text-white rounded px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        Chạy IDS
      </button>
      {!coTuyen && <p className="text-xs text-gray-500">Hãy tìm được ít nhất một tuyến từ A đến B trước.</p>}

      {phuongAn && (
        <div className="space-y-2">
          <ThePhuongAn
            tieuDe="1. Ít trạm nhất"
            moTa="IDS ưu tiên đường qua ít trạm nhất. Cùng số trạm thì lấy đường ngắn hơn."
            ketQua={phuongAn.itTram}
            dangXem={tieuChiDangXem === 'itTram'}
            onXem={() => xemPhuongAn('itTram')}
          />
          <ThePhuongAn
            tieuDe="2. Quãng đường ngắn nhất"
            moTa="IDS nới dần giới hạn số mét cho đến khi tới B. Đường trả về là đường ngắn nhất."
            ketQua={phuongAn.nganNhat}
            dangXem={tieuChiDangXem === 'nganNhat'}
            onXem={() => xemPhuongAn('nganNhat')}
          />
          {cungMot && (
            <p className="text-xs text-gray-600">Hai tiêu chí cùng chọn một chuyến.</p>
          )}
          <p className="text-xs text-gray-500">Bấm một phương án để vẽ đường đó trên bản đồ.</p>
        </div>
      )}
    </div>
  );
}
