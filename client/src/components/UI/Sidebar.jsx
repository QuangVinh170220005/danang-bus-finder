import { useBusStore } from '../../store/busStore';
import { tenChieu } from '../../algorithms/graph';
import { formatKm, formatPhut } from '../../algorithms/goiYTuyen';
import IDSVisualizer from '../Algorithm/IDSVisualizer';

function DongToaDo({ nhan, giaTri, onChange, dangChon, onChonBanDo, onViTriHienTai, dangLay }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">{nhan}</span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={onChonBanDo}
            className={`px-2 py-1 rounded text-xs border ${dangChon ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}
          >
            {dangChon ? 'Bấm bản đồ...' : 'Chọn trên bản đồ'}
          </button>
          <button
            type="button"
            onClick={onViTriHienTai}
            className="px-2 py-1 rounded text-xs border border-gray-300 bg-white"
          >
            {dangLay ? 'Đang lấy...' : 'Vị trí hiện tại'}
          </button>
        </span>
      </div>
      <input
        value={giaTri}
        onChange={onChange}
        placeholder="16.05440, 108.20220"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />
    </div>
  );
}

function DongThongKe({ thongKe }) {
  if (!thongKe) return null;
  return (
    <span className="text-xs text-gray-600">
      {formatKm(thongKe.tongMet)} · khoảng {formatPhut(thongKe.phut)} · {thongKe.soTram} trạm
      <br />
      Xe {formatKm(thongKe.metXe)}, đi bộ {formatKm(thongKe.metDiBo)}
    </span>
  );
}

export default function Sidebar() {
  const {
    goiY,
    tuyenChon,
    cheDoChon,
    setCheDoChon,
    chuoiDi,
    chuoiDen,
    setChuoiDi,
    setChuoiDen,
    banKinh,
    setBanKinh,
    timCacTuyen,
    chonMotTuyen,
    xoaKetQua,
    layViTriHienTai,
    dangLayViTri,
    nhacNho
  } = useBusStore();

  function doiBanKinh(gia) {
    setBanKinh(gia);
    if (useBusStore.getState().goiY) timCacTuyen();
  }

  function xoaTatCa() {
    xoaKetQua();
    useBusStore.setState({ goiY: null, phuongAn: null });
  }

  return (
    <div className="w-[28rem] bg-white shadow-lg overflow-y-auto flex flex-col shrink-0">
      <div className="p-5 bg-primary text-white">
        <h1 className="text-xl font-bold">Tìm xe buýt Đà Nẵng</h1>
        <p className="text-sm opacity-90 mt-1">Chọn điểm A và B. App liệt kê mọi tuyến đi được, rồi IDS chọn đường ít trạm nhất và đường ngắn nhất.</p>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm font-bold text-gray-800">1. Chọn điểm A và điểm B</p>
        <DongToaDo
          nhan="Điểm đi A (lat, lng)"
          giaTri={chuoiDi}
          onChange={(event) => setChuoiDi(event.target.value)}
          dangChon={cheDoChon === 'di'}
          onChonBanDo={() => setCheDoChon(cheDoChon === 'di' ? null : 'di')}
          onViTriHienTai={() => layViTriHienTai('di')}
          dangLay={dangLayViTri === 'di'}
        />
        <DongToaDo
          nhan="Điểm đến B (lat, lng)"
          giaTri={chuoiDen}
          onChange={(event) => setChuoiDen(event.target.value)}
          dangChon={cheDoChon === 'den'}
          onChonBanDo={() => setCheDoChon(cheDoChon === 'den' ? null : 'den')}
          onViTriHienTai={() => layViTriHienTai('den')}
          dangLay={dangLayViTri === 'den'}
        />

        {nhacNho && <p className="text-sm text-red-700">{nhacNho}</p>}

        <label className="flex items-center justify-between gap-2 text-sm text-gray-700">
          Đi bộ tối đa tới trạm
          <span className="flex items-center gap-2">
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={banKinh}
              onChange={(event) => doiBanKinh(+event.target.value)}
            />
            <b className="w-14 text-right">{banKinh} m</b>
          </span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={timCacTuyen}
            className="flex-1 bg-primary text-white rounded px-4 py-3 font-medium"
          >
            Tìm các tuyến từ A đến B
          </button>
          <button onClick={xoaTatCa} className="px-4 py-3 border border-gray-300 rounded">
            Xóa
          </button>
        </div>

        {goiY && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-800">2. Các tuyến đi được</p>
            <p className="text-sm text-gray-700">
              {goiY.ds.length
                ? `${goiY.ds.length} tuyến trong vòng ${goiY.banKinh} m đi bộ. Bấm một tuyến để xem trên bản đồ.`
                : `Không có tuyến nào trong vòng ${goiY.banKinh} m đi bộ. Hãy tăng bán kính hoặc chọn điểm gần trạm hơn.`}
            </p>
            {goiY.ds.map((g) => {
              const dangChon = tuyenChon && tuyenChon.tuyenId === g.route.id && tuyenChon.chieu === g.chieu;
              return (
                <button
                  key={`${g.route.id}-${g.chieu}`}
                  onClick={() => chonMotTuyen(g)}
                  className={`block w-full text-left text-sm border rounded px-3 py-2 ${dangChon ? 'border-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <span className="font-semibold">Tuyến {g.route.id}</span>, {tenChieu(g.chieu)}
                  <br />
                  <DongThongKe thongKe={g.thongKe} />
                </button>
              );
            })}
            {goiY.ds.length > 0 && (
              <p className="text-xs text-gray-500">
                Km và thời gian là ước tính: đi bộ 5 km/h, xe buýt 20 km/h, tính theo các trạm trên tuyến.
              </p>
            )}
          </div>
        )}

        <IDSVisualizer />
      </div>
    </div>
  );
}
