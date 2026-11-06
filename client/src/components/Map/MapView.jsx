import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useBusStore } from '../../store/busStore';
import { gomCacLan } from '../../algorithms/ids';
import { layThuTuTram, tenChieu } from '../../algorithms/graph';
import { haversine } from '../../algorithms/haversine';
import { duongPhoHopLy, layDuongPho, urlNenVietMap } from '../../services/vietmap';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const NEN_DU_PHONG = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

function iconChu(chu, mau) {
  return L.divIcon({
    className: 'tram-so',
    html: `<div style="background:${mau};color:#fff;min-width:28px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;padding:0 4px;border:2px solid #fff">${chu}</div>`,
    iconSize: [28, 26],
    iconAnchor: [14, 26]
  });
}

function iconLan(so) {
  return L.divIcon({
    className: 'tram-so',
    html: `<div style="background:#7c3aed;color:#fff;width:22px;height:22px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff">${so}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function iconSo(so, mau) {
  return L.divIcon({
    className: 'tram-so',
    html: `<div style="background:${mau};color:#fff;width:18px;height:18px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid #fff">${so}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function docToaDo(chuoi) {
  if (!chuoi) return null;
  const [lat, lng] = chuoi.split(',').map((phan) => parseFloat(phan.trim()));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function VuaManHinh({ diem }) {
  const map = useMap();
  const khoa = diem.map((mot) => `${mot[0].toFixed(4)},${mot[1].toFixed(4)}`).join('|');

  useEffect(() => {
    if (diem.length < 2) return;
    map.fitBounds(diem, { padding: [48, 48], maxZoom: 16 });
  }, [khoa]);

  return null;
}

function BatClick() {
  const cachNhap = useBusStore((s) => s.cachNhap);
  const datDiemTrenBanDo = useBusStore((s) => s.datDiemTrenBanDo);

  useMapEvents({
    click(event) {
      if (cachNhap !== 'toaDo') return;
      datDiemTrenBanDo(event.latlng.lat, event.latlng.lng);
    }
  });

  return null;
}

function DuongTheoPho({ diem, mau, netDut, weight, phuongTien = 'motorcycle' }) {
  const [viTri, setViTri] = useState(null);
  const khoa = `${phuongTien}|${diem.map((mot) => `${mot.lat.toFixed(5)},${mot.lng.toFixed(5)}`).join('|')}`;
  const quaGan = diem.length < 2 || haversine(diem[0], diem[diem.length - 1]) < 25;

  useEffect(() => {
    if (quaGan) {
      setViTri(null);
      return undefined;
    }

    let conSong = true;
    setViTri(null);
    const metThang = haversine(diem[0], diem[diem.length - 1]);
    layDuongPho(diem, phuongTien).then((duong) => {
      if (!conSong) return;
      if (duong && duongPhoHopLy(metThang, duong.met)) {
        setViTri(duong.toaDo);
        return;
      }
      if (!duong && phuongTien !== 'foot') {
        setViTri(diem.map((mot) => [mot.lat, mot.lng]));
        return;
      }
      setViTri(null);
    });

    return () => {
      conSong = false;
    };
  }, [khoa, quaGan]);

  if (!viTri || viTri.length < 2) return null;

  return (
    <Polyline
      positions={viTri}
      pathOptions={{ color: mau, weight, dashArray: netDut ? '7 7' : null, opacity: 0.95 }}
    />
  );
}

export default function MapView() {
  const {
    routes,
    tuyenId,
    chieu,
    ketQua,
    chuoiDi,
    chuoiDen,
    diemKeTiep,
    cachNhap,
    tramXemId,
    idsResult,
    currentStep
  } = useBusStore();

  const coDuong = Boolean(ketQua?.thanhCong);
  const tuyenVe = coDuong
    ? routes.find((route) => route.id === ketQua.tuyenId)
    : routes.find((route) => route.id === tuyenId);
  const chieuVe = coDuong ? ketQua.chieu : chieu;
  const tramTheoChieu = layThuTuTram(tuyenVe, chieuVe);
  const mauChieu = chieuVe === 've' ? '#e67e22' : '#1a73e8';
  const cacLan = gomCacLan(idsResult?.steps || []);
  const lanDangXem = cacLan[currentStep];
  const chamLanNay = lanDangXem?.loai === 'thu' ? lanDangXem.nut : [];
  const diemDiNhap = docToaDo(chuoiDi);
  const diemDenNhap = docToaDo(chuoiDen);
  const urlVietMap = urlNenVietMap();
  const tramXem = coDuong ? ketQua.tramKhac.find((tram) => tram.id === tramXemId) : null;
  const xuongSatDen = coDuong && haversine(ketQua.tramXuong, ketQua.diemDen) < 90;

  const diemCanh = [];
  if (coDuong) {
    diemCanh.push([ketQua.diemDi.lat, ketQua.diemDi.lng], [ketQua.diemDen.lat, ketQua.diemDen.lng]);
    ketQua.cacTram.forEach((tram) => diemCanh.push([tram.lat, tram.lng]));
  } else {
    tramTheoChieu.forEach((tram) => diemCanh.push([tram.lat, tram.lng]));
    if (diemDiNhap) diemCanh.push([diemDiNhap.lat, diemDiNhap.lng]);
    if (diemDenNhap) diemCanh.push([diemDenNhap.lat, diemDenNhap.lng]);
  }

  const tramGiua = coDuong ? ketQua.cacTram.slice(1, -1) : [];
  const loiChon = cachNhap === 'toaDo'
    ? (diemKeTiep === 'den' ? 'Bấm bản đồ để đặt điểm đến' : 'Bấm bản đồ để đặt điểm đi')
    : 'Đang chọn bằng danh sách trạm';

  return (
    <div className="w-full h-full relative">
      <MapContainer center={[16.0544, 108.2022]} zoom={14} minZoom={1} className="w-full h-full">
        <TileLayer
          attribution={urlVietMap ? '&copy; VietMap' : 'Tiles &copy; Esri'}
          url={urlVietMap || NEN_DU_PHONG}
          maxZoom={20}
        />
        <VuaManHinh diem={diemCanh} />
        <BatClick />

        {!coDuong && tramTheoChieu.length > 1 && (
          <DuongTheoPho diem={tramTheoChieu} mau={mauChieu} weight={4} />
        )}

        {!coDuong && tramTheoChieu.map((tram, index) => (
          <Marker key={tram.id} position={[tram.lat, tram.lng]} icon={iconSo(index + 1, mauChieu)}>
            <Popup>
              {index + 1}. {tram.name}
              <br />
              Tuyến {tuyenVe.id}, {tenChieu(chieuVe)}
            </Popup>
          </Marker>
        ))}

        {!coDuong && diemDiNhap && (
          <Marker position={[diemDiNhap.lat, diemDiNhap.lng]} icon={iconChu('Đi', '#16803c')}>
            <Popup>Điểm đi</Popup>
          </Marker>
        )}
        {!coDuong && diemDenNhap && (
          <Marker position={[diemDenNhap.lat, diemDenNhap.lng]} icon={iconChu('Đến', '#b91c1c')}>
            <Popup>Điểm đến</Popup>
          </Marker>
        )}

        {coDuong && (
          <>
            <DuongTheoPho diem={[ketQua.diemDi, ketQua.tramDon]} mau="#16803c" netDut weight={5} phuongTien="foot" />
            <DuongTheoPho diem={ketQua.cacTram} mau="#1a73e8" weight={5} />
            <DuongTheoPho diem={[ketQua.tramXuong, ketQua.diemDen]} mau="#16803c" netDut weight={5} phuongTien="foot" />
            {tramXem && (
              <DuongTheoPho diem={[ketQua.diemDi, tramXem]} mau="#6b7280" netDut weight={4} phuongTien="foot" />
            )}

            <Marker position={[ketQua.diemDi.lat, ketQua.diemDi.lng]} icon={iconChu('Đi', '#16803c')}>
              <Popup>Điểm đầu đi bộ</Popup>
            </Marker>
            <Marker position={[ketQua.tramDon.lat, ketQua.tramDon.lng]} icon={iconChu('Đón', '#1a73e8')}>
              <Popup>Trạm đón: {ketQua.tramDon.name}</Popup>
            </Marker>
            {tramGiua.map((tram) => (
              <CircleMarker
                key={tram.id}
                center={[tram.lat, tram.lng]}
                radius={5}
                pathOptions={{ color: '#1a73e8', fillColor: '#1a73e8', fillOpacity: 1 }}
              >
                <Popup>{tram.name}</Popup>
              </CircleMarker>
            ))}
            {xuongSatDen ? (
              <CircleMarker
                center={[ketQua.tramXuong.lat, ketQua.tramXuong.lng]}
                radius={7}
                pathOptions={{ color: '#b45309', fillColor: '#b45309', fillOpacity: 1 }}
              >
                <Popup>Trạm xuống: {ketQua.tramXuong.name}</Popup>
              </CircleMarker>
            ) : (
              <Marker position={[ketQua.tramXuong.lat, ketQua.tramXuong.lng]} icon={iconChu('Xuống', '#b45309')}>
                <Popup>Trạm xuống: {ketQua.tramXuong.name}</Popup>
              </Marker>
            )}
            <Marker position={[ketQua.diemDen.lat, ketQua.diemDen.lng]} icon={iconChu('Đến', '#b91c1c')}>
              <Popup>
                Điểm đến
                {xuongSatDen && (
                  <>
                    <br />
                    Xuống tại {ketQua.tramXuong.name}
                  </>
                )}
              </Popup>
            </Marker>
          </>
        )}

        {chamLanNay.map((nut, index) => (
          <Marker key={`lan-${nut.nodeId}`} position={[nut.lat, nut.lng]} icon={iconLan(index + 1)} zIndexOffset={500}>
            <Popup>
              {index + 1}. {nut.ten}
              <br />
              Chỗ IDS xét trong {lanDangXem.tieuDe.toLowerCase()}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute top-3 left-14 z-[500] bg-white/95 shadow rounded px-3 py-1 text-xs text-gray-700 pointer-events-none">
        {loiChon}
      </div>
      <div className="absolute top-3 right-3 z-[500] bg-white/95 shadow rounded px-3 py-2 text-xs text-gray-700 space-y-2 pointer-events-none">
        <p className="flex items-center gap-2">
          <svg width="36" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="36" y2="5" stroke="#16803c" strokeWidth="3" strokeDasharray="6 4" />
          </svg>
          Đi bộ
        </p>
        <p className="flex items-center gap-2">
          <svg width="36" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="36" y2="5" stroke="#1a73e8" strokeWidth="3" />
          </svg>
          Xe buýt
        </p>
      </div>
    </div>
  );
}
