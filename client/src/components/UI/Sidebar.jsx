import { useState } from 'react';
import { useBusStore } from '../../store/busStore';
import { layThuTuTram, tenChieu } from '../../algorithms/graph';
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
    timCacTuyen,
    chonMotTuyen,
    xoaKetQua,
    layViTriHienTai,
    dangLayViTri,
    nhacNho
  } = useBusStore();

  const [moLoTrinh, setMoLoTrinh] = useState({});

  function toggleLoTrinh(key) {
    setMoLoTrinh((prev) => ({ ...prev, [key]: !prev[key] }));
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
                ? `${goiY.ds.length} tuyến có thể đi từ A đến B. Bấm một tuyến để xem trên bản đồ.`
                : 'Không tìm thấy tuyến phù hợp.'}
            </p>
            {goiY.ds.map((g) => {
              const key = `${g.route.id}-${g.chieu}`;
              const dangChon = tuyenChon && tuyenChon.tuyenId === g.route.id && tuyenChon.chieu === g.chieu;
              const doanTram = layThuTuTram(g.route, g.chieu).slice(g.i, g.j + 1);
              const loTrinh = doanTram.map((tram) => tram.name).join(' - ');
              const dangMo = !!moLoTrinh[key];
              return (
                <div
                  key={key}
                  className={`border rounded text-sm ${dangChon ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'}`}
                >
                  <button
                    type="button"
                    onClick={() => chonMotTuyen(g)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50/70 rounded-t"
                  >
                    <span className="font-semibold">Tuyến {g.route.id}</span>, {tenChieu(g.chieu)}
                    <br />
                    <DongThongKe thongKe={g.thongKe} />
                  </button>
                  {loTrinh && (
                    <div className="border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => toggleLoTrinh(key)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-primary font-medium hover:bg-gray-50"
                      >
                        <span>{dangMo ? 'Ẩn lộ trình' : `Xem lộ trình (${doanTram.length} trạm)`}</span>
                        <span>{dangMo ? '▾' : '▸'}</span>
                      </button>
                      {dangMo && (
                        <div className="px-3 pb-2.5 pt-1 text-xs text-gray-700 leading-relaxed">
                          {loTrinh}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
