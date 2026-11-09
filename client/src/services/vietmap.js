const boNhoDuong = new Map();

export function urlNenVietMap() {
  const key = import.meta.env.VITE_VIETMAP_API_KEY;
  if (!key) return '';
  return `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}@2x.png?apikey=${key}`;
}

function khoaDiem(cacDiem, phuongTien) {
  const chuoi = cacDiem.map((diem) => `${diem.lat.toFixed(5)},${diem.lng.toFixed(5)}`).join('|');
  return `${phuongTien}|${chuoi}`;
}

async function taiDuongVietMap(cacDiem, phuongTien) {
  const key = import.meta.env.VITE_VIETMAP_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams();
  params.set('apikey', key);
  params.set('vehicle', phuongTien === 'foot' ? 'foot' : 'motorcycle');
  params.set('points_encoded', 'false');
  cacDiem.forEach((diem) => params.append('point', `${diem.lat},${diem.lng}`));

  const goc = phuongTien === 'foot'
    ? 'https://maps.vietmap.vn/api/route?api-version=1.1&'
    : 'https://maps.vietmap.vn/api/route/v4?';

  const phanHoi = await fetch(`${goc}${params}`);
  const data = await phanHoi.json();
  const toaDo = data.paths?.[0]?.points?.coordinates;
  const met = data.paths?.[0]?.distance;
  if (!toaDo || toaDo.length < 2 || typeof met !== 'number') return null;

  return {
    toaDo: toaDo.map(([lng, lat]) => [lat, lng]),
    met
  };
}

// Máy chủ định tuyến đường phố thực tế (OpenStreetMap & OSRM)
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
      const phanHoi = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!phanHoi.ok) continue;
      const data = await phanHoi.json();
      const tuyen = data.routes?.[0];
      if (tuyen?.geometry?.coordinates && tuyen.geometry.coordinates.length >= 2) {
        return {
          toaDo: tuyen.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          met: tuyen.distance
        };
      }
    } catch (e) {
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
    // 1. Thử VietMap nếu có key
    const tuVietMap = await taiDuongVietMap(cacDiem, phuongTien).catch(() => null);
    if (tuVietMap) return tuVietMap;

    // 2. Thử định tuyến thực tế qua OpenStreetMap / OSRM
    const tuOSRM = await taiDuongOSRM(cacDiem, phuongTien).catch(() => null);
    if (tuOSRM) return tuOSRM;

    // 3. Nếu danh sách nhiều trạm mà bị từ chối nguyên chùm, ghép từng chặng liên tiếp theo đường phố
    if (cacDiem.length > 2) {
      try {
        const cacDoan = [];
        let tongMet = 0;
        for (let i = 0; i < cacDiem.length - 1; i++) {
          const doan = await layDuongPho([cacDiem[i], cacDiem[i + 1]], phuongTien);
          if (doan && doan.toaDo && doan.toaDo.length >= 2) {
            tongMet += doan.met;
            if (i === 0) cacDoan.push(...doan.toaDo);
            else cacDoan.push(...doan.toaDo.slice(1));
          } else {
            cacDoan.push([cacDiem[i].lat, cacDiem[i].lng], [cacDiem[i + 1].lat, cacDiem[i + 1].lng]);
          }
        }
        if (cacDoan.length >= 2) {
          return { toaDo: cacDoan, met: tongMet };
        }
      } catch (e) {}
    }

    return null;
  })();

  boNhoDuong.set(khoa, viec);
  const ketQua = await viec;
  if (!ketQua) boNhoDuong.delete(khoa);
  return ketQua;
}

export function duongPhoHopLy(metThang, metPho) {
  if (metPho == null || metThang < 15) return false;
  return true;
}
