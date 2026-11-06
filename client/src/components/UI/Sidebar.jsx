import { useMemo, useState } from 'react';
import { useBusStore } from '../../store/busStore';
import { timDuong } from '../../algorithms/timDuong';
import { layThuTuTram, tenChieu } from '../../algorithms/graph';
import WalkingDirections from './WalkingDirections';
import StatsPanel from '../Algorithm/StatsPanel';
import IDSVisualizer from '../Algorithm/IDSVisualizer';

const VI_DU = [
  {
    ten: 'Bến xe đi Chợ Hàn, tuyến 01 chiều đi',
    tuyen: '01',
    chieu: 'di',
    di: '16.0742, 108.2290',
    den: '16.0648, 108.2185'
  },
  {
    ten: 'Hội An về bến xe, tuyến 01 chiều về',
    tuyen: '01',
    chieu: 've',
    di: '15.8860, 108.3340',
    den: '16.0738, 108.2280'
  },
  {
    ten: 'Điểm quá xa, không có trạm',
    tuyen: '01',
    chieu: 'di',
    di: '10.0000, 100.0000',
    den: '16.0650, 108.2190'
  }
];

function docToaDo(chuoi) {
  const [lat, lng] = chuoi.split(',').map((phan) => parseFloat(phan.trim()));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export default function Sidebar() {
  const {
    routes,
    tuyenId,
    chieu,
    setTuyen,
    ketQua,
    chuoiDi,
    chuoiDen,
    setChuoiDi,
    setChuoiDen,
    cachNhap,
    setCachNhap,
    setDangTim,
    dangTim,
    ganKetQua,
    xoaKetQua,
    chonTramDon,
    setTramXem,
    tramXemId
  } = useBusStore();

  const [tramDiId, setTramDiId] = useState('');
  const [tramDenId, setTramDenId] = useState('');
  const [loiNhap, setLoiNhap] = useState('');

  const giaTriTuyen = tuyenId ? `${tuyenId}|${chieu}` : '';

  const tramTheoId = useMemo(() => {
    const bang = {};
    routes.forEach((route) => {
      route.stops.forEach((stop) => {
        bang[stop.id] = stop;
      });
    });
    return bang;
  }, [routes]);

  const tuyenDangChon = routes.find((route) => route.id === tuyenId);
  const tuyenLietKe = ketQua?.thanhCong
    ? routes.find((route) => route.id === ketQua.tuyenId)
    : tuyenDangChon;
  const chieuLietKe = ketQua?.thanhCong ? ketQua.chieu : chieu;
  const tramChieuNay = layThuTuTram(tuyenLietKe, chieuLietKe);

  function doiTuyen(giaTri) {
    xoaKetQua();
    if (!giaTri) {
      setTuyen('', '');
      return;
    }
    const [id, huong] = giaTri.split('|');
    setTuyen(id, huong);
  }

  function doiTramDi(giaTri) {
    setTramDiId(giaTri);
    const phan = giaTri.split('|');
    if (phan.length !== 3) return;
    setTuyen(phan[0], phan[1]);
    xoaKetQua();
  }

  function layHaiDiem() {
    if (cachNhap === 'tram') {
      const idDi = tramDiId.split('|')[2];
      const di = tramTheoId[idDi];
      const den = tramTheoId[tramDenId];
      if (!di || !den) return { loi: 'Chọn trạm đi và trạm đến.' };
      if (di.id === den.id) return { loi: 'Trạm đi và trạm đến đang trùng nhau.' };
      return {
        diemDi: { lat: di.lat, lng: di.lng },
        diemDen: { lat: den.lat, lng: den.lng }
      };
    }

    const diemDi = docToaDo(chuoiDi);
    const diemDen = docToaDo(chuoiDen);
    if (!diemDi) return { loi: 'Tọa độ điểm đi chưa đúng. Viết dạng 16.07, 108.22' };
    if (!diemDen) return { loi: 'Tọa độ điểm đến chưa đúng. Viết dạng 16.06, 108.21' };
    return { diemDi, diemDen };
  }

  function chayVoiDiem(diemDi, diemDen, tuyen, huong) {
    const yeuCauMoi = { tuyenId: tuyen, chieu: huong, diemDi, diemDen };
    useBusStore.setState({ yeuCau: yeuCauMoi });
    const ketQuaMoi = timDuong({ routes, ...yeuCauMoi, tramDonId: '' });
    ganKetQua(ketQuaMoi);
    setDangTim(false);
  }

  function chayTim() {
    const diem = layHaiDiem();
    if (diem.loi) {
      setLoiNhap(diem.loi);
      return;
    }

    setLoiNhap('');
    setDangTim(true);
    chayVoiDiem(diem.diemDi, diem.diemDen, tuyenId, chieu);
  }

  function chayViDu(mau) {
    setCachNhap('toaDo');
    setChuoiDi(mau.di);
    setChuoiDen(mau.den);
    useBusStore.setState({ diemKeTiep: 'di' });
    setTuyen(mau.tuyen, mau.chieu);
    setLoiNhap('');
    setDangTim(true);
    chayVoiDiem(docToaDo(mau.di), docToaDo(mau.den), mau.tuyen, mau.chieu);
  }

  return (
    <div className="w-96 bg-white shadow-lg overflow-y-auto flex flex-col">
      <div className="p-5 bg-primary text-white">
        <h1 className="text-xl font-bold">Tìm xe buýt Đà Nẵng</h1>
        <p className="text-sm opacity-90 mt-1">Bấm bản đồ để đặt điểm, rồi bấm Tìm đường.</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setCachNhap('toaDo')}
            className={`flex-1 px-3 py-2 rounded text-sm ${cachNhap === 'toaDo' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            Nhập tọa độ
          </button>
          <button
            onClick={() => setCachNhap('tram')}
            className={`flex-1 px-3 py-2 rounded text-sm ${cachNhap === 'tram' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            Chọn trạm
          </button>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Tuyến và chiều</span>
          <select
            value={giaTriTuyen}
            onChange={(event) => doiTuyen(event.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Tất cả tuyến</option>
            {routes.map((route) => (
              <optgroup key={route.id} label={`Tuyến ${route.id}`}>
                <option value={`${route.id}|di`}>Chiều đi: {route.from} đến {route.to}</option>
                <option value={`${route.id}|ve`}>Chiều về: {route.to} đến {route.from}</option>
              </optgroup>
            ))}
          </select>
        </label>

        {cachNhap === 'toaDo' ? (
          <>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Điểm đi (lat, lng)</span>
              <input
                value={chuoiDi}
                onChange={(event) => setChuoiDi(event.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Điểm đến (lat, lng)</span>
              <input
                value={chuoiDen}
                onChange={(event) => setChuoiDen(event.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              />
            </label>
          </>
        ) : (
          <>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Trạm đi</span>
              <select
                value={tramDiId}
                onChange={(event) => doiTramDi(event.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Chọn trạm đi</option>
                {routes.map((route) => (
                  <optgroup key={`${route.id}-di`} label={`Tuyến ${route.id} chiều đi`}>
                    {route.stops.map((stop, index) => (
                      <option key={`di-${stop.id}`} value={`${route.id}|di|${stop.id}`}>
                        {index + 1}. {stop.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {routes.map((route) => (
                  <optgroup key={`${route.id}-ve`} label={`Tuyến ${route.id} chiều về`}>
                    {[...route.stops].reverse().map((stop, index) => (
                      <option key={`ve-${stop.id}`} value={`${route.id}|ve|${stop.id}`}>
                        {index + 1}. {stop.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Trạm đến</span>
              <select
                value={tramDenId}
                onChange={(event) => setTramDenId(event.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Chọn trạm đến</option>
                {routes.map((route) => (
                  <optgroup key={`${route.id}-den`} label={`Tuyến ${route.id}`}>
                    {route.stops.map((stop) => (
                      <option key={`den-${stop.id}`} value={stop.id}>
                        {stop.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </>
        )}

        {loiNhap && <p className="text-sm text-red-700">{loiNhap}</p>}

        <div className="flex gap-2">
          <button
            onClick={chayTim}
            disabled={dangTim}
            className="flex-1 bg-primary text-white rounded px-4 py-3 font-medium disabled:opacity-50"
          >
            {dangTim ? 'Đang tìm' : 'Tìm đường'}
          </button>
          <button onClick={xoaKetQua} className="px-4 py-3 border border-gray-300 rounded">
            Xóa
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Ví dụ để thử</p>
          {VI_DU.map((mau) => (
            <button
              key={mau.ten}
              onClick={() => chayViDu(mau)}
              className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-100"
            >
              {mau.ten}
            </button>
          ))}
        </div>

        <WalkingDirections />
        <StatsPanel />

        {tuyenLietKe && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-800 mb-2">
              Tuyến {tuyenLietKe.id}, {tenChieu(chieuLietKe)}
            </p>
            <ol className="text-sm text-gray-700 space-y-1">
              {tramChieuNay.map((stop, index) => {
                const laThayThe = ketQua?.thanhCong && ketQua.tramKhac.some((tram) => tram.id === stop.id);
                const dangDeXuat = ketQua?.thanhCong && ketQua.tramDon.id === stop.id;
                return (
                  <li key={stop.id} className="flex items-center justify-between gap-2">
                    <span>{index + 1}. {stop.name}</span>
                    {dangDeXuat && <span className="text-xs text-green-700 shrink-0">Đề xuất</span>}
                    {laThayThe && (
                      <span className="shrink-0 space-x-2">
                        <button onClick={() => setTramXem(stop.id)} className="text-xs text-primary">
                          {tramXemId === stop.id ? 'Ẩn' : 'Xem'}
                        </button>
                        <button onClick={() => chonTramDon(stop.id)} className="text-xs text-primary">
                          Đón
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <IDSVisualizer />
      </div>
    </div>
  );
}
