import { useMemo, useState } from 'react';
import { useBusStore } from '../../store/busStore';
import { layThuTuTram, tenChieu } from '../../algorithms/graph';
import { goiYTuyen, capNhatQuangDuongPho } from '../../algorithms/goiYTuyen';
import { haversine } from '../../algorithms/haversine';
import IDSVisualizer from '../Algorithm/IDSVisualizer';

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
    tramXemId,
    goiY,
    tuyenChon,
    chonViTri,
    cheDoChon,
    setCheDoChon,
    batCheDoChonViTri,
    viTriBatKy,
    ganNhat
  } = useBusStore();

  const [tramDiId, setTramDiId] = useState('');
  const [tramDenId, setTramDenId] = useState('');
  const [loiNhap, setLoiNhap] = useState('');
  const [banKinh, setBanKinh] = useState(800);

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

  function chayGoiY(banKinhMoi) {
    const diem = layHaiDiem();
    if (diem.loi) {
      setLoiNhap(diem.loi);
      return;
    }
    setLoiNhap('');
    const bk = typeof banKinhMoi === 'number' ? banKinhMoi : banKinh;
    const ds = goiYTuyen(routes, diem.diemDi, diem.diemDen, bk);
    const tramGanNhat = (d) => Math.min(...routes.flatMap((r) => r.stops.map((s) => haversine(d, s))));
    useBusStore.setState({
      goiY: {
        diemDi: diem.diemDi,
        diemDen: diem.diemDen,
        ds,
        banKinh: bk,
        metGanA: Math.round(tramGanNhat(diem.diemDi)),
        metGanB: Math.round(tramGanNhat(diem.diemDen))
      },
      tuyenChon: null,
      ketQua: null,
      idsResult: null,
      bfsResult: null,
      yeuCau: null,
      viTriBatKy: null,
      ganNhat: null,
      chonViTri: false
    });
  }

  function chonGoiY(g) {
    setTuyen(g.route.id, g.chieu);
    useBusStore.setState({
      ketQua: null,
      idsResult: null,
      bfsResult: null,
      yeuCau: null,
      viTriBatKy: null,
      ganNhat: null,
      chonViTri: false,
      tramXemId: null,
      currentStep: 0,
      isPlaying: false,
      tuyenChon: {
        tuyenId: g.route.id,
        chieu: g.chieu,
        i: g.i,
        j: g.j,
        metDi: g.metDi,
        metDen: g.metDen,
        diemDi: goiY.diemDi,
        diemDen: goiY.diemDen
      }
    });

    // Cập nhật quãng đường đi bộ thực tế bằng thuật toán IDS
    capNhatQuangDuongPho(g, goiY.diemDi, goiY.diemDen, routes).then((capNhat) => {
      const tc = useBusStore.getState().tuyenChon;
      if (tc && tc.tuyenId === g.route.id && tc.chieu === g.chieu) {
        useBusStore.setState({
          tuyenChon: {
            ...tc,
            metDi: capNhat.metDi,
            metDen: capNhat.metDen,
            toaDoDi: capNhat.toaDoDi,
            toaDoDen: capNhat.toaDoDen
          }
        });
      }
    });
  }

  function xoaTatCa() {
    xoaKetQua();
    useBusStore.setState({ goiY: null });
  }

  return (
    <div className="w-96 bg-white shadow-lg overflow-y-auto flex flex-col">
      <div className="p-5 bg-primary text-white">
        <h1 className="text-xl font-bold">Tìm xe buýt Đà Nẵng</h1>
        <p className="text-sm opacity-90 mt-1">Chọn điểm đầu và điểm cuối, chọn tuyến, rồi chọn vị trí bất kỳ.</p>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm font-bold text-gray-800">1. Chọn điểm đầu (A) và điểm cuối (B)</p>
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

        {cachNhap === 'toaDo' ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setCheDoChon(cheDoChon === 'di' ? null : 'di')}
                className={`flex-1 px-3 py-2 rounded text-sm border ${cheDoChon === 'di' ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-300'}`}
              >
                {cheDoChon === 'di' ? 'Bấm lên bản đồ...' : 'Chọn điểm đi trên bản đồ'}
              </button>
              <button
                onClick={() => setCheDoChon(cheDoChon === 'den' ? null : 'den')}
                className={`flex-1 px-3 py-2 rounded text-sm border ${cheDoChon === 'den' ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-300'}`}
              >
                {cheDoChon === 'den' ? 'Bấm lên bản đồ...' : 'Chọn điểm đến trên bản đồ'}
              </button>
            </div>
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

        <label className="flex items-center justify-between gap-2 text-sm text-gray-700">
          Đi bộ tối đa
          <span className="flex items-center gap-2">
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={banKinh}
              onChange={(event) => {
                const gia = +event.target.value;
                setBanKinh(gia);
                if (goiY) chayGoiY(gia);
              }}
            />
            <b className="w-14 text-right">{banKinh} m</b>
          </span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={chayGoiY}
            className="flex-1 bg-primary text-white rounded px-4 py-3 font-medium"
          >
            Gợi ý các tuyến từ A đến B
          </button>
          <button onClick={xoaTatCa} className="px-4 py-3 border border-gray-300 rounded">
            Xóa
          </button>
        </div>

        {goiY && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-800">2. Chọn một tuyến</p>
            <p className="text-sm text-gray-700">
              {goiY.ds.length
                ? `Có ${goiY.ds.length} lựa chọn. Bấm một tuyến để xem trên bản đồ.`
                : `Không có tuyến nào đi được từ A đến B trong vòng ${goiY.banKinh} m đi bộ. Trạm gần A nhất cách khoảng ${goiY.metGanA} m, trạm gần B nhất cách khoảng ${goiY.metGanB} m. Bạn thử tăng "Đi bộ tối đa" hoặc chọn điểm gần các trục đường chính.`}
            </p>
            {goiY.ds.map((g) => {
              const dangChon = tuyenChon && tuyenChon.tuyenId === g.route.id && tuyenChon.chieu === g.chieu;
              const thuTu = layThuTuTram(g.route, g.chieu);
              const metDiHienThi = dangChon && tuyenChon.metDi ? tuyenChon.metDi : g.metDi;
              const metDenHienThi = dangChon && tuyenChon.metDen ? tuyenChon.metDen : g.metDen;
              return (
                <button
                  key={`${g.route.id}-${g.chieu}`}
                  onClick={() => chonGoiY(g)}
                  className={`block w-full text-left text-sm border rounded px-3 py-2 ${dangChon ? 'border-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <span className="font-semibold">Tuyến {g.route.id}</span>, {tenChieu(g.chieu)}
                  <br />
                  <span className="text-xs text-gray-600">
                    Lên: {thuTu[g.i].name} (đi bộ {Math.round(metDiHienThi)} m)
                    <br />
                    Xuống: {thuTu[g.j].name} (đi bộ {Math.round(metDenHienThi)} m), {g.j - g.i} trạm
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {tuyenChon && (
          <div className="border rounded p-3 space-y-2">
            <p className="text-sm font-bold text-gray-800">3. Chọn một vị trí bất kỳ</p>
            <button
              onClick={() => batCheDoChonViTri(!chonViTri)}
              className={`w-full rounded px-3 py-2 text-sm ${chonViTri ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
            >
              {chonViTri ? 'Bấm lên bản đồ để chọn vị trí...' : 'Chọn vị trí bất kỳ, tìm trạm gần nhất'}
            </button>
            {viTriBatKy && ganNhat?.dangTinh && <p className="text-xs text-gray-600">Đang tìm đường đi bộ theo phố...</p>}
            {ganNhat?.loi && <p className="text-xs text-red-700">{ganNhat.loi}</p>}
            {ganNhat?.tram && (
              <p className="text-sm text-gray-800">
                Trạm gần nhất trên tuyến {ganNhat.tuyenId}: <b>{ganNhat.tram.name}</b>
                <br />
                Quãng đường đi bộ: <b>{Math.round(ganNhat.met)} m</b> (theo thuật toán IDS{ganNhat.soBuoc ? `: ${ganNhat.soBuoc} bước` : ''})
              </p>
            )}
          </div>
        )}

        {/* Mô phỏng thuật toán Iterative Deepening Search (IDS) trực quan giống trang mẫu */}
        <IDSVisualizer />

        {tuyenLietKe && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-800 mb-2">
              Tuyến {tuyenLietKe.id}, {tenChieu(chieuLietKe)}
            </p>
            <ol className="text-sm text-gray-700 space-y-1">
              {tramChieuNay.map((stop, index) => {
                const laThayThe = ketQua?.thanhCong && ketQua.tramKhac.some((tram) => tram.id === stop.id);
                const dangDeXuat = ketQua?.thanhCong && ketQua.tramDon.id === stop.id;
                const trongDoan = !ketQua?.thanhCong && tuyenChon && tuyenChon.tuyenId === tuyenLietKe.id && tuyenChon.chieu === chieuLietKe && index >= tuyenChon.i && index <= tuyenChon.j;
                return (
                  <li key={stop.id} className={`flex items-center justify-between gap-2 ${trongDoan ? 'font-semibold text-primary' : ''}`}>
                    <span>{index + 1}. {stop.name}</span>
                    {trongDoan && index === tuyenChon.i && <span className="text-xs text-green-700 shrink-0">Lên xe</span>}
                    {trongDoan && index === tuyenChon.j && <span className="text-xs text-amber-700 shrink-0">Xuống xe</span>}
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
      </div>
    </div>
  );
}
