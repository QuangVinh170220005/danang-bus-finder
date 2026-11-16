const boNhoDuong = new Map();

function layGoongApiKey() {
  return import.meta.env.VITE_GOONG_API_KEY || '';
}

function khoaDiem(cacDiem, phuongTien) {
  const chuoi = cacDiem.map((diem) => `${diem.lat.toFixed(5)},${diem.lng.toFixed(5)}`).join('|');
  return `${phuongTien}|${chuoi}`;
}

function giaiMaPolyline(str) {
  if (!str) return [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords = [];

  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}

// Goong Direction API (nguồn chính vẽ đường theo đường phố Việt Nam)
async function taiDuongGoong(cacDiem, phuongTien) {
  const key = layGoongApiKey();
  if (!key || cacDiem.length < 2) return null;

  const vehicle = phuongTien === 'foot' ? 'bike' : 'car';
  const origin = `${cacDiem[0].lat},${cacDiem[0].lng}`;
  const destination = cacDiem
    .slice(1)
    .map((diem) => `${diem.lat},${diem.lng}`)
    .join(';');

  const params = new URLSearchParams({
    origin,
    destination,
    vehicle,
    api_key: key
  });

  try {
    const phanHoi = await fetch(`https://rsapi.goong.io/Direction?${params}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!phanHoi.ok) return null;
    const data = await phanHoi.json();
    const route = data.routes?.[0];
    const toaDo = giaiMaPolyline(route?.overview_polyline?.points);
    const met = (route?.legs || []).reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);

    if (toaDo.length >= 2) {
      return { toaDo, met };
    }
  } catch {
    // Fallback sang OSRM nếu Goong lỗi mạng/timeout
  }

  return null;
}

// Goong Distance Matrix API (tính khoảng cách nhiều điểm trong 1-2 request)
export async function layMaTranKhoangCach(origins, destinations, vehicle = 'bike') {
  const key = layGoongApiKey();
  if (!key || !origins?.length || !destinations?.length) return null;

  const CHUNK = 25;
  const ketQua = Array.from({ length: origins.length }, () => new Array(destinations.length).fill(null));

  for (let i = 0; i < origins.length; i += CHUNK) {
    const oChunk = origins.slice(i, i + CHUNK);
    const originsStr = oChunk.map((p) => `${p.lat},${p.lng}`).join('|');

    for (let j = 0; j < destinations.length; j += CHUNK) {
      const dChunk = destinations.slice(j, j + CHUNK);
      const destStr = dChunk.map((p) => `${p.lat},${p.lng}`).join('|');
      const params = new URLSearchParams({
        origins: originsStr,
        destinations: destStr,
        vehicle,
        api_key: key
      });

      try {
        const phanHoi = await fetch(`https://rsapi.goong.io/DistanceMatrix?${params}`, {
          signal: AbortSignal.timeout(8000)
        });
        if (!phanHoi.ok) continue;
        const data = await phanHoi.json();
        (data.rows || []).forEach((row, rIdx) => {
          (row.elements || []).forEach((el, cIdx) => {
            if (el.status === 'OK' && typeof el.distance?.value === 'number') {
              ketQua[i + rIdx][j + cIdx] = el.distance.value;
            }
          });
        });
      } catch {
        // Bỏ qua chunk lỗi, giữ null để dùng fallback Haversine
      }
    }
  }

  return ketQua;
}

// Máy chủ định tuyến dự phòng (OpenStreetMap & OSRM)
async function taiDuongOSRM(cacDiem, phuongTien = 'foot') {
  const chuoi = cacDiem.map((diem) => `${diem.lng},${diem.lat}`).join(';');
  const profile = phuongTien === 'foot' ? 'foot' : 'driving';

  const urls = [
    phuongTien === 'foot'
      ? `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${chuoi}?overview=full&geometries=geojson`
      : `https://routing.openstreetmap.de/routed-car/route/v1/driving/${chuoi}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/${profile}/${chuoi}?overview=full&geometries=geojson`
  ];

  for (const url of urls) {
    try {
      const phanHoi = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!phanHoi.ok) continue;
      const data = await phanHoi.json();
      const tuyen = data.routes?.[0];
      if (tuyen?.geometry?.coordinates && tuyen.geometry.coordinates.length >= 2) {
        return {
          toaDo: tuyen.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          met: tuyen.distance
        };
      }
    } catch {
      // Thử nguồn tiếp theo
    }
  }

  return null;
}

export async function layDuongPho(cacDiem, phuongTien = 'motorcycle') {
  if (!cacDiem || cacDiem.length < 2) return null;

  const khoa = khoaDiem(cacDiem, phuongTien);
  if (boNhoDuong.has(khoa)) {
    return boNhoDuong.get(khoa);
  }

  const viec = (async () => {
    // 1. Nguồn chính: Goong Direction API
    const tuGoong = await taiDuongGoong(cacDiem, phuongTien).catch(() => null);
    if (tuGoong) return tuGoong;

    // 2. Dự phòng: OpenStreetMap / OSRM
    const tuOSRM = await taiDuongOSRM(cacDiem, phuongTien).catch(() => null);
    if (tuOSRM) return tuOSRM;

    // 3. Nếu danh sách nhiều trạm mà bị từ chối nguyên chùm, ghép từng chặng liên tiếp
    if (cacDiem.length > 2) {
      try {
        const cacDoan = [];
        let tongMet = 0;
        let coDoanPho = false;
        let coDoanLoi = false;
        for (let i = 0; i < cacDiem.length - 1; i++) {
          const doan = await layDuongPho([cacDiem[i], cacDiem[i + 1]], phuongTien);
          if (doan && doan.toaDo && doan.toaDo.length >= 2) {
            coDoanPho = true;
            tongMet += doan.met;
            if (i === 0) cacDoan.push(...doan.toaDo);
            else cacDoan.push(...doan.toaDo.slice(1));
          } else {
            coDoanLoi = true;
            if (i === 0) cacDoan.push([cacDiem[i].lat, cacDiem[i].lng], [cacDiem[i + 1].lat, cacDiem[i + 1].lng]);
            else cacDoan.push([cacDiem[i + 1].lat, cacDiem[i + 1].lng]);
          }
        }
        if (coDoanPho && cacDoan.length >= 2) {
          return { toaDo: cacDoan, met: tongMet, uocTinh: coDoanLoi };
        }
      } catch {}
    }

    return null;
  })();

  boNhoDuong.set(khoa, viec);
  const ketQua = await viec;
  if (!ketQua || ketQua.uocTinh) boNhoDuong.delete(khoa);
  return ketQua;
}

export function duongPhoHopLy(metThang, metPho) {
  if (metPho == null || metThang < 3) return false;
  return true;
}
