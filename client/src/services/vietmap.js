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

async function taiDuongPho(cacDiem, phuongTien) {
  const key = import.meta.env.VITE_VIETMAP_API_KEY;
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

export function layDuongPho(cacDiem, phuongTien = 'motorcycle') {
  const key = import.meta.env.VITE_VIETMAP_API_KEY;
  if (!key || cacDiem.length < 2) return Promise.resolve(null);

  const khoa = khoaDiem(cacDiem, phuongTien);
  if (!boNhoDuong.has(khoa)) {
    const viec = taiDuongPho(cacDiem, phuongTien).catch(() => {
      boNhoDuong.delete(khoa);
      return null;
    });
    boNhoDuong.set(khoa, viec);
  }
  return boNhoDuong.get(khoa);
}

export function duongPhoHopLy(metThang, metPho) {
  if (metPho == null || metThang < 25) return false;
  if (metThang < 120 && metPho > metThang * 3) return false;
  return true;
}
