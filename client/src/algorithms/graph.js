import { haversine } from './haversine';

export const BAN_KINH_DI_BO = 800;

export function tenChieu(chieu) {
  if (chieu === 've') return 'chiều về';
  if (chieu === 'di') return 'chiều đi';
  return 'cả hai chiều';
}

export function layThuTuTram(route, chieu) {
  if (!route) return [];
  if (chieu === 've') return [...route.stops].reverse();
  return route.stops.slice();
}

export function taoDoanTuyen(cacTram, tuyenId, chieu) {
  const nodes = {};
  const edges = {};

  cacTram.forEach((tram) => {
    nodes[tram.id] = {
      id: tram.id,
      name: tram.name,
      lat: tram.lat,
      lng: tram.lng,
      tuyen: [tuyenId]
    };
    edges[tram.id] = [];
  });

  for (let i = 0; i < cacTram.length - 1; i++) {
    const truoc = cacTram[i];
    const sau = cacTram[i + 1];
    edges[truoc.id].push({
      to: sau.id,
      met: haversine(truoc, sau),
      loai: 'xe',
      tuyenId,
      chieu
    });
  }

  return { nodes, edges };
}

export function themDiemDi(doThi, nodeId, diem, cacTram) {
  doThi.nodes[nodeId] = {
    id: nodeId,
    name: 'Điểm đi',
    lat: diem.lat,
    lng: diem.lng,
    tuyen: [],
    laDiemNguoiDung: true
  };

  doThi.edges[nodeId] = cacTram
    .map((tram) => ({
      to: tram.id,
      met: haversine(diem, tram),
      loai: 'diBo'
    }))
    .sort((a, b) => a.met - b.met);
}

export function themDiemDen(doThi, nodeId, diem, tramXuong) {
  doThi.nodes[nodeId] = {
    id: nodeId,
    name: 'Điểm đến',
    lat: diem.lat,
    lng: diem.lng,
    tuyen: [],
    laDiemNguoiDung: true
  };
  doThi.edges[nodeId] = [];
  doThi.edges[tramXuong.id].push({
    to: nodeId,
    met: haversine(tramXuong, diem),
    loai: 'diBo'
  });
}

export function layCanh(doThi, tuId, denId) {
  return (doThi.edges[tuId] || []).find((canh) => canh.to === denId) || null;
}
