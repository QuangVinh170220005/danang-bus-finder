import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useBusStore } from '../../store/busStore';
import { gomCacLan } from '../../algorithms/ids';
import { layThuTuTram, tenChieu } from '../../algorithms/graph';
import { haversine } from '../../algorithms/haversine';
import { duongPhoHopLy, layDuongPho, urlNenVietMap } from '../../services/vietmap';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import L from 'leaflet';

try {
  if (typeof window !== 'undefined') {
    const workerUrl = new URL('/maplibre-gl-worker.mjs', window.location.href).href;
    setWorkerUrl(workerUrl);
  }
} catch (e) {
  console.warn('Lỗi cấu hình maplibre worker:', e);
}

function GoongMapLayer({ styleUrl }) {
  const map = useMap();

  useEffect(() => {
    if (!styleUrl) return;
    let gl = null;
    let removed = false;

    function cleanup() {
      if (removed) return;
      removed = true;
      if (gl) {
        try {
          map.removeLayer(gl);
        } catch {}
      }
    }

    try {
      gl = maplibreGL({
        style: styleUrl,
        pane: 'tilePane'
      });
      gl.addTo(map);

      const glMap = gl.getMaplibreMap?.();
      if (glMap) {
        // Tự động gỡ layer nếu Goong bị chặn (403, 401, CORS, domain restriction) để lộ bản đồ nền
        glMap.on('error', (e) => {
          const err = e?.error || e;
          const status = err?.status || err?.statusCode;
          const msg = (err?.message || '').toLowerCase();
          if (status === 403 || status === 401 || msg.includes('403') || msg.includes('unauthorized') || msg.includes('failed to fetch')) {
            console.warn('Goong Map bị chặn hoặc không tải được style, dùng bản đồ nền dự phòng:', err);
            cleanup();
          }
        });
      }

      const timer = setTimeout(() => {
        try {
          gl.getMaplibreMap()?.resize();
        } catch {}
      }, 150);

      return () => {
        clearTimeout(timer);
        cleanup();
      };
    } catch (err) {
      console.warn('Lỗi tải Goong Map layer:', err);
      cleanup();
    }
  }, [map, styleUrl]);

  return null;
}

const MAP_STYLES = {
  goong: {
    id: 'goong',
    name: 'Goong Map (Đường phố)',
    mota: 'Bản đồ vector Goong chuẩn Việt Nam',
    isGoong: true,
    styleUrl: (key) => `https://tiles.goong.io/assets/goong_map_web.json?api_key=${key}`
  },
  street: {
    id: 'street',
    name: 'Đường phố chuẩn (Esri)',
    mota: 'Bản đồ giao thông sáng rõ nét',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19
  },
  satellite: {
    id: 'satellite',
    name: 'Vệ tinh (Satellite)',
    mota: 'Ảnh chụp vệ tinh thực tế & tên đường',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19
  },
  dark: {
    id: 'dark',
    name: 'Chế độ tối (Dark Mode)',
    mota: 'Tông đen xám làm nổi bật các chấm IDS',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 16
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    mota: 'Bản đồ chi tiết ngõ hẻm',
    url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  topo: {
    id: 'topo',
    name: 'Địa hình (Topographic)',
    mota: 'Độ cao đồi núi Sơn Trà & Ngũ Hành Sơn',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19
  }
};

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

function iconSo(so, mau, mo = false) {
  return L.divIcon({
    className: 'tram-so',
    html: `<div style="background:${mau};color:#fff;width:18px;height:18px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid #fff;opacity:${mo ? 0.45 : 1}">${so}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function iconDiem(loai) {
  const isDest = loai === 'dich';
  const tagText = isDest ? 'Điểm đến (B)' : 'Xuất phát (A)';
  const tagClass = isDest ? 'dest' : 'start';
  const letter = isDest ? 'B' : 'A';
  const gradId = isDest ? 'pin-grad-dest' : 'pin-grad-start';
  const startColor = isDest ? '#EF4444' : '#10B981';
  const endColor = isDest ? '#B91C1C' : '#047857';
  const textColor = isDest ? '#B91C1C' : '#047857';

  return L.divIcon({
    className: 'diem-dau-cuoi',
    iconSize: [40, 52],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
    html: `
      <div class="pro-pin-wrapper">
        <div class="pin-ripple-ring ${tagClass}"></div>
        <div class="pin-ripple-ring ${tagClass} r2"></div>
        <div class="pin-anchor-box">
          <div class="pin-tag-pill ${tagClass}">${tagText}</div>
          <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="${gradId}" x1="20" y1="2" x2="20" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="${startColor}"/>
                <stop offset="100%" stop-color="${endColor}"/>
              </linearGradient>
            </defs>
            <path d="M20 2C10.61 2 3 9.61 3 19C3 31.5 20 48 20 48C20 48 37 31.5 37 19C37 9.61 29.39 2 20 2Z" fill="url(#${gradId})" stroke="#FFFFFF" stroke-width="2.2"/>
            <circle cx="20" cy="19" r="8.5" fill="#FFFFFF"/>
            <text x="20" y="23.5" text-anchor="middle" fill="${textColor}" font-size="12" font-weight="900" font-family="'Be Vietnam Pro', system-ui, sans-serif">${letter}</text>
          </svg>
        </div>
      </div>
    `
  });
}

function iconViTriBan() {
  return L.divIcon({
    className: 'diem-dau-cuoi',
    iconSize: [40, 52],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
    html: `
      <div class="pro-pin-wrapper">
        <div class="pin-ripple-ring user"></div>
        <div class="pin-ripple-ring user r2"></div>
        <div class="pin-anchor-box">
          <div class="pin-tag-pill user">Vị trí của bạn</div>
          <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pin-grad-user" x1="20" y1="2" x2="20" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#8B5CF6"/>
                <stop offset="100%" stop-color="#6D28D9"/>
              </linearGradient>
            </defs>
            <path d="M20 2C10.61 2 3 9.61 3 19C3 31.5 20 48 20 48C20 48 37 31.5 37 19C37 9.61 29.39 2 20 2Z" fill="url(#pin-grad-user)" stroke="#FFFFFF" stroke-width="2.2"/>
            <circle cx="20" cy="19" r="8.5" fill="#FFFFFF"/>
            <path d="M16 23C16 20.8 17.8 19 20 19C22.2 19 24 20.8 24 23M20 17.5C18.6 17.5 17.5 16.4 17.5 15C17.5 13.6 18.6 12.5 20 12.5C21.4 12.5 22.5 13.6 22.5 15C22.5 16.4 21.4 17.5 20 17.5Z" stroke="#6D28D9" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    `
  });
}

function iconTarget(ten) {
  return L.divIcon({
    className: 'diem-dau-cuoi',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;width:56px;height:56px;border-radius:50%;border:3px solid #f59e0b;background:rgba(245,158,11,0.22);animation:pro-pin-ripple 1.6s ease-out infinite"></div>
        <div class="pin-tag-pill" style="top:-30px;background:#d97706;border-color:#fff">${ten}</div>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="12" fill="#f59e0b" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="14" cy="14" r="7.5" fill="#ffffff"/>
          <circle cx="14" cy="14" r="4" fill="#d97706"/>
        </svg>
      </div>
    `
  });
}

const iconXuatPhat = iconDiem('di');
const iconDiemDen = iconDiem('dich');
const iconNguoiDung = iconViTriBan();

const svgBus = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="16" rx="2"/><path d="M3 11h18"/><path d="M19 19v2"/><path d="M5 19v2"/><circle cx="7.5" cy="15.5" r="1.5" fill="#FFFFFF"/><circle cx="16.5" cy="15.5" r="1.5" fill="#FFFFFF"/></svg>`;
const svgBusSmall = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="16" rx="2"/><path d="M3 11h18"/><path d="M19 19v2"/><path d="M5 19v2"/><circle cx="7.5" cy="15.5" r="1.5" fill="#FFFFFF"/><circle cx="16.5" cy="15.5" r="1.5" fill="#FFFFFF"/></svg>`;

function iconBenXe(ten, hienNhan) {
  const nhan = hienNhan
    ? `<div style="position:absolute;top:42px;left:50%;transform:translateX(-50%);white-space:nowrap;font:600 11px 'Be Vietnam Pro',Arial,sans-serif;color:#202124;background:rgba(255,255,255,.93);padding:1px 6px;border-radius:10px;box-shadow:0 1px 3px #0005;pointer-events:none">${ten}</div>`
    : '';
  return L.divIcon({
    className: 'tram-so',
    html: `<div style="position:relative;width:36px;height:36px"><div style="width:36px;height:36px;background:#d93025;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px #0008;display:grid;place-items:center"><span style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center">${svgBus}</span></div>${nhan}</div>`,
    iconSize: [36, 36],
    iconAnchor: [9, 40]
  });
}

function iconDiemDon(ten, hienNhan) {
  const nhan = hienNhan
    ? `<div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:3px;white-space:nowrap;font:600 11px 'Be Vietnam Pro',Arial,sans-serif;color:#202124;background:rgba(255,255,255,.93);padding:1px 6px;border-radius:10px;box-shadow:0 1px 3px #0005;pointer-events:none">${ten}</div>`
    : '';
  return L.divIcon({
    className: 'tram-so',
    html: `<div style="position:relative;width:22px;height:22px"><div style="width:22px;height:22px;background:#1a73e8;border:2px solid #fff;border-radius:6px;box-shadow:0 2px 5px #0008;display:grid;place-items:center;color:#fff">${svgBusSmall}</div>${nhan}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

const laBenXe = (ten) => /^bến xe/i.test(ten.trim());

// Hiện toàn bộ bến xe và điểm đón trên bản đồ (bến xe: ghim đỏ, điểm đón: ô vuông xanh, xa thì thu thành chấm)
function TatCaTram({ routes }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  // Đang chọn điểm thì bấm vào icon trạm sẽ chọn đúng trạm đó. Không thì bấm icon để mở popup có nút chọn.
  const cheDoChon = useBusStore((s) => s.cheDoChon);
  const chonViTri = useBusStore((s) => s.chonViTri);
  const datDiemTheoLoai = useBusStore((s) => s.datDiemTheoLoai);
  const datViTriBatKy = useBusStore((s) => s.datViTriBatKy);
  const dangChon = Boolean(cheDoChon || chonViTri);
  const chonTram = (tram) => {
    if (chonViTri) datViTriBatKy(tram.lat, tram.lng);
    else datDiemTheoLoai(cheDoChon, tram.lat, tram.lng);
  };

  const danhSach = useMemo(() => {
    const bang = new Map();
    routes.forEach((route) => {
      route.stops.forEach((stop) => {
        const khoa = `${stop.name}|${stop.lat.toFixed(4)}|${stop.lng.toFixed(4)}`;
        const co = bang.get(khoa);
        if (co) co.tuyen.add(route.id);
        else bang.set(khoa, { ...stop, tuyen: new Set([route.id]) });
      });
    });
    return [...bang.values()];
  }, [routes]);

  return danhSach.map((tram) => {
    const benXe = laBenXe(tram.name);
    const popup = dangChon ? null : (
      <Popup>
        <b>{tram.name}</b>
        <br />
        {benXe ? 'Bến xe' : 'Điểm đón xe buýt'}
        <br />
        Tuyến đi qua: {[...tram.tuyen].join(', ')}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button
            onClick={() => { map.closePopup(); datDiemTheoLoai('di', tram.lat, tram.lng); }}
            style={{ background: '#16803c', color: '#fff', border: 0, borderRadius: 5, padding: '4px 8px', cursor: 'pointer' }}
          >
            Xuất phát từ đây
          </button>
          <button
            onClick={() => { map.closePopup(); datDiemTheoLoai('den', tram.lat, tram.lng); }}
            style={{ background: '#b91c1c', color: '#fff', border: 0, borderRadius: 5, padding: '4px 8px', cursor: 'pointer' }}
          >
            Đến đây
          </button>
        </div>
      </Popup>
    );
    const suKien = { click: () => dangChon && chonTram(tram) };
    if (!benXe && zoom < 14) {
      return (
        <CircleMarker
          key={tram.id}
          center={[tram.lat, tram.lng]}
          radius={5}
          eventHandlers={suKien}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#1a73e8', fillOpacity: 1 }}
        >
          {popup}
        </CircleMarker>
      );
    }
    return (
      <Marker
        key={tram.id}
        position={[tram.lat, tram.lng]}
        icon={benXe ? iconBenXe(tram.name, zoom >= 13) : iconDiemDon(tram.name, zoom >= 16)}
        zIndexOffset={benXe ? 200 : 100}
        eventHandlers={suKien}
      >
        {popup}
      </Marker>
    );
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
  const cheDoChon = useBusStore((s) => s.cheDoChon);
  const datDiemTrenBanDo = useBusStore((s) => s.datDiemTrenBanDo);
  const chonViTri = useBusStore((s) => s.chonViTri);
  const datViTriBatKy = useBusStore((s) => s.datViTriBatKy);

  useMapEvents({
    click(event) {
      if (chonViTri) {
        datViTriBatKy(event.latlng.lat, event.latlng.lng);
        return;
      }
      if (!cheDoChon) return;
      datDiemTrenBanDo(event.latlng.lat, event.latlng.lng);
    }
  });

  return null;
}

function DuongTheoPho({ diem, mau, netDut, weight, phuongTien = 'motorcycle', doDuc = 0.95 }) {
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
      pathOptions={{ color: mau, weight, dashArray: netDut ? '7 7' : null, opacity: doDuc }}
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
    cheDoChon,
    nhacNho,
    tramXemId,
    idsResult,
    currentStep,
    tuyenChon,
    chonViTri,
    viTriBatKy,
    ganNhat,
    idsProgress,
    idsFinalPath,
    idsFinalSegments,
    idsFinalRoadCoords,
    idsGoalNode,
    idsSimulating,
    streetLines
  } = useBusStore();

  const chon = tuyenChon && tuyenChon.tuyenId === tuyenId && tuyenChon.chieu === chieu ? tuyenChon : null;
  const ganNhatHopLe = ganNhat?.tram ? ganNhat : null;
  const coDuong = Boolean(ketQua?.thanhCong);
  const tuyenVe = coDuong
    ? routes.find((route) => route.id === ketQua.tuyenId)
    : routes.find((route) => route.id === tuyenId);
  const chieuVe = coDuong ? ketQua.chieu : chieu;
  const tramTheoChieu = coDuong || chon ? layThuTuTram(tuyenVe, chieuVe) : [];
  const mauChieu = chieuVe === 've' ? '#e67e22' : '#1a73e8';
  const cacLan = gomCacLan(idsResult?.steps || []);
  const lanDangXem = cacLan[currentStep];
  const chamLanNay = lanDangXem?.loai === 'thu' ? lanDangXem.nut : [];
  const diemDiNhap = docToaDo(chuoiDi);
  const diemDenNhap = docToaDo(chuoiDen);
  const urlVietMap = urlNenVietMap();
  const tramXem = coDuong ? ketQua.tramKhac.find((tram) => tram.id === tramXemId) : null;
  const xuongSatDen = coDuong && haversine(ketQua.tramXuong, ketQua.diemDen) < 90;

  const goongKey = import.meta.env.VITE_GOONG_MAP_TILES_KEY || import.meta.env.VITE_GOONG_MAP_KEY || '3WdrQw5HWtXXKRI1qkDa9t4FYRgFXA6aZX2PtYkt';

  const [mapStyleKey, setMapStyleKey] = useState(() => {
    return localStorage.getItem('danang_map_style') || 'goong';
  });
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const activeStyle = MAP_STYLES[mapStyleKey] || MAP_STYLES.goong;

  function chonKieuBanDo(key) {
    setMapStyleKey(key);
    localStorage.setItem('danang_map_style', key);
    setShowStyleMenu(false);
  }

  const diemCanh = [];
  if (coDuong) {
    diemCanh.push([ketQua.diemDi.lat, ketQua.diemDi.lng], [ketQua.diemDen.lat, ketQua.diemDen.lng]);
    ketQua.cacTram.forEach((tram) => diemCanh.push([tram.lat, tram.lng]));
  } else if (chon) {
    // Chỉ tự căn bản đồ khi vừa chọn một tuyến. Đặt điểm A, B hay chọn vị trí bất kỳ không làm bản đồ nhảy.
    tramTheoChieu.slice(chon.i, chon.j + 1).forEach((tram) => diemCanh.push([tram.lat, tram.lng]));
    diemCanh.push([chon.diemDi.lat, chon.diemDi.lng], [chon.diemDen.lat, chon.diemDen.lng]);
  } else if (idsFinalRoadCoords && idsFinalRoadCoords.length > 0) {
    idsFinalRoadCoords.forEach((p) => diemCanh.push(p));
  } else if (idsFinalPath && idsFinalPath.length > 0) {
    idsFinalPath.forEach((p) => diemCanh.push([p.lat, p.lng]));
  }

  const tramGiua = coDuong ? ketQua.cacTram.slice(1, -1) : [];
  const dangChonDiem = Boolean(cheDoChon || chonViTri);
  const loiChon = chonViTri
    ? 'Bấm bản đồ để chọn vị trí bất kỳ'
    : cheDoChon === 'den'
    ? 'Bấm bản đồ để chọn điểm đến'
    : cheDoChon === 'di'
    ? 'Bấm bản đồ để chọn điểm đi'
    : 'Bấm nút "Chọn điểm đi" hoặc "Chọn điểm đến" ở cột trái rồi bấm bản đồ';

  return (
    <div className={`w-full h-full relative ${dangChonDiem ? '[&_.leaflet-grab]:!cursor-crosshair' : ''}`}>
      <MapContainer center={[16.0544, 108.2022]} zoom={14} minZoom={1} className="w-full h-full">
        {/* Render theo kiểu bản đồ đang chọn */}
        {activeStyle.isGoong ? (
          <>
            <TileLayer
              key="goong-base-fallback"
              attribution='&copy; <a href="https://goong.io">Goong Maps</a> &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <GoongMapLayer key={activeStyle.id} styleUrl={activeStyle.styleUrl(goongKey)} />
          </>
        ) : (
          <>
            <TileLayer
              key={activeStyle.id}
              attribution={activeStyle.attribution}
              url={activeStyle.url}
              maxZoom={activeStyle.maxZoom || 19}
            />
            {activeStyle.overlayUrl && (
              <TileLayer
                key={`${activeStyle.id}-overlay`}
                attribution=""
                url={activeStyle.overlayUrl}
                maxZoom={activeStyle.maxZoom || 19}
                opacity={0.95}
              />
            )}
          </>
        )}
        <VuaManHinh diem={diemCanh} />
        <BatClick />
        <TatCaTram routes={routes} />

        {!coDuong && tramTheoChieu.length > 1 && (
          <DuongTheoPho diem={tramTheoChieu} mau={mauChieu} weight={chon ? 4 : 4} doDuc={chon ? 0.35 : 0.95} />
        )}
        {!coDuong && chon && chon.j > chon.i && (
          <DuongTheoPho diem={tramTheoChieu.slice(chon.i, chon.j + 1)} mau={mauChieu} weight={7} />
        )}
        {!coDuong && chon && (
          <>
            {chon.toaDoDi ? (
              <Polyline positions={chon.toaDoDi} pathOptions={{ color: '#16803c', dashArray: '7 7', weight: 4, opacity: 0.95 }} />
            ) : (
              <DuongTheoPho diem={[chon.diemDi, tramTheoChieu[chon.i]]} mau="#16803c" netDut weight={4} phuongTien="foot" />
            )}
            {chon.toaDoDen ? (
              <Polyline positions={chon.toaDoDen} pathOptions={{ color: '#16803c', dashArray: '7 7', weight: 4, opacity: 0.95 }} />
            ) : (
              <DuongTheoPho diem={[tramTheoChieu[chon.j], chon.diemDen]} mau="#16803c" netDut weight={4} phuongTien="foot" />
            )}
          </>
        )}

        {!coDuong && tramTheoChieu.map((tram, index) => {
          const trongDoan = !chon || (index >= chon.i && index <= chon.j);
          const icon = chon && index === chon.i
            ? iconChu(`Lên ${index + 1}`, '#16803c')
            : chon && index === chon.j
              ? iconChu(`Xuống ${index + 1}`, '#b45309')
              : iconSo(index + 1, mauChieu, !trongDoan);
          return (
            <Marker key={tram.id} position={[tram.lat, tram.lng]} icon={icon}>
              <Popup>
                {index + 1}. {tram.name}
                <br />
                Tuyến {tuyenVe.id}, {tenChieu(chieuVe)}
              </Popup>
            </Marker>
          );
        })}

        {viTriBatKy && (
          <Marker position={[viTriBatKy.lat, viTriBatKy.lng]} icon={iconNguoiDung} zIndexOffset={4800}>
            <Popup>Vị trí bạn chọn</Popup>
          </Marker>
        )}

        {/* Mạng lưới đường phố xung quanh (giống trang web mẫu) */}
        {streetLines && streetLines.length > 0 && (
          <Polyline
            positions={streetLines}
            pathOptions={{ color: '#4b6a8a', weight: 1.5, opacity: 0.35, interactive: false }}
          />
        )}

        {/* Nút được duyệt trong quá trình chạy IDS (chỉ hiện khi đang chạy mô phỏng, chạy xong tự động ẩn) */}
        {idsSimulating && ((idsProgress?.seenNodes && idsProgress.seenNodes.length > 0) || (idsProgress?.visitedNodes && idsProgress.visitedNodes.length > 0)) && (
          (idsProgress.seenNodes || idsProgress.visitedNodes).map((nut) => (
            <CircleMarker
              key={`ids-dot-${nut.id}`}
              center={[nut.lat, nut.lng]}
              radius={4.5}
              pathOptions={{
                color: '#ffffff',
                weight: 1,
                fillColor: idsProgress.color || '#e08a00',
                fillOpacity: 0.95
              }}
            >
              <Popup>
                <b>{nut.name}</b>
                <br />
                Độ sâu xét: {nut.d} (Vòng lặp L = {idsProgress.L})
              </Popup>
            </CircleMarker>
          ))
        )}

        {/* Lộ trình tìm được bằng IDS: Bám sát lòng đường & vỉa hè thực tế (Tuyệt đối không chim bay) */}
        {idsFinalSegments && idsFinalSegments.length > 0 ? (
          idsFinalSegments.map((seg, sIdx) => {
            const isWalk = seg.loai === 'diBo';
            return (
              <span key={`ids-seg-${sIdx}`}>
                {/* Viền ngoài phát sáng */}
                <Polyline
                  positions={seg.toaDo}
                  pathOptions={{
                    color: '#ffffff',
                    weight: isWalk ? 9 : 12,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
                {/* Đường di chuyển thực tế: Đi bộ nét đứt xanh lá, Xe buýt cam đậm nổi bật */}
                <Polyline
                  positions={seg.toaDo}
                  pathOptions={{
                    color: isWalk ? '#16803c' : '#e8590c',
                    weight: isWalk ? 5 : 6,
                    dashArray: isWalk ? '8 6' : null,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                >
                  <Popup>
                    <b>{isWalk ? 'Đi bộ theo vỉa hè / đường phố' : 'Xe buýt theo tuyến đường'}</b>
                    <br />
                    Từ: {seg.from.name}
                    <br />
                    Đến: {seg.to.name}
                    <br />
                    Cự ly: {Math.round(seg.met)} m
                  </Popup>
                </Polyline>
              </span>
            );
          })
        ) : idsFinalRoadCoords && idsFinalRoadCoords.length > 0 ? (
          <>
            <Polyline
              positions={idsFinalRoadCoords}
              pathOptions={{ color: '#ffffff', weight: 12, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={idsFinalRoadCoords}
              pathOptions={{ color: '#e8590c', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        ) : null}

        {/* Mục tiêu tìm thấy của IDS */}
        {idsGoalNode && (
          <Marker position={[idsGoalNode.lat, idsGoalNode.lng]} icon={iconTarget(idsGoalNode.name)} zIndexOffset={4500}>
            <Popup><b>Mục tiêu:</b> {idsGoalNode.name}</Popup>
          </Marker>
        )}
        {ganNhatHopLe && (
          <>
            <Polyline
              positions={ganNhatHopLe.toaDo}
              pathOptions={{ color: '#7c3aed', weight: 5, dashArray: ganNhatHopLe.uocTinh ? '2 8' : '8 6', opacity: 0.95 }}
            />
            <Marker
              position={[ganNhatHopLe.tram.lat, ganNhatHopLe.tram.lng]}
              icon={iconChu('Gần nhất', '#7c3aed')}
              zIndexOffset={1000}
            >
              <Popup>
                {ganNhatHopLe.tram.name}
                <br />
                Đi bộ {Math.round(ganNhatHopLe.met)} m
              </Popup>
            </Marker>
          </>
        )}

        {!coDuong && diemDiNhap && (
          <Marker position={[diemDiNhap.lat, diemDiNhap.lng]} icon={iconXuatPhat} zIndexOffset={5000}>
            <Popup>Điểm đi</Popup>
          </Marker>
        )}
        {!coDuong && diemDenNhap && (
          <Marker position={[diemDenNhap.lat, diemDenNhap.lng]} icon={iconDiemDen} zIndexOffset={4500}>
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

            <Marker position={[ketQua.diemDi.lat, ketQua.diemDi.lng]} icon={iconXuatPhat} zIndexOffset={5000}>
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
            <Marker position={[ketQua.diemDen.lat, ketQua.diemDen.lng]} icon={iconDiemDen} zIndexOffset={4500}>
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

      {nhacNho && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-gray-900/90 text-white text-sm rounded px-4 py-2 shadow pointer-events-none">
          {nhacNho}
        </div>
      )}
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
        <p className="flex items-center gap-2">
          <svg width="36" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="36" y2="5" stroke="#7c3aed" strokeWidth="3" strokeDasharray="8 5" />
          </svg>
          Đường tới trạm gần nhất
        </p>
        <p className="flex items-center gap-2">
          <span className="w-4 h-4 bg-primary text-white rounded flex items-center justify-center text-[10px] font-bold">B</span>
          Bến xe và điểm đón
        </p>
        {idsSimulating && (
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm inline-block"></span>
            Chấm IDS đang duyệt (theo độ sâu L)
          </p>
        )}
      </div>

      {/* Bộ chọn kiểu bản đồ ở góc dưới bên trái */}
      <div className="absolute bottom-5 left-4 z-[500] select-none">
        {showStyleMenu && (
          <div className="mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-64 space-y-1 backdrop-blur bg-white/95 transition-all">
            <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 text-xs font-semibold text-gray-500">
              <span>CHỌN KIỂU BẢN ĐỒ</span>
              <button
                onClick={() => setShowStyleMenu(false)}
                className="text-gray-400 hover:text-gray-600 font-bold px-1"
              >
                ✕
              </button>
            </div>
            {Object.values(MAP_STYLES).map((s) => (
              <button
                key={s.id}
                onClick={() => chonKieuBanDo(s.id)}
                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between text-xs transition-colors ${
                  mapStyleKey === s.id
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className={`text-[10px] ${mapStyleKey === s.id ? 'text-blue-100' : 'text-gray-400'}`}>
                    {s.mota}
                  </p>
                </div>
                {mapStyleKey === s.id && (
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          className="flex items-center gap-2 bg-white/95 hover:bg-white text-gray-800 shadow-md border border-gray-200 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-lg"
          title="Đổi kiểu bản đồ"
        >
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>Kiểu bản đồ: <b className="text-primary">{activeStyle.name}</b></span>
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showStyleMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
