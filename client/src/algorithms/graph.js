import { haversine } from './haversine';
import danangStreetGraph from '../data/danang-street-graph.json';

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


// Dựng đồ thị mạng lưới đường phố và xe buýt Đà Nẵng (cho mô phỏng IDS trực quan)
export function taoDoThiToanMang(routes, diemXuatPhat, diemDich, banKinhDiBo = 800) {
  const nodes = {};
  const edges = {};

  // Nạp 1,164 nút giao lộ & tuyến đường thực tế của Đà Nẵng
  if (danangStreetGraph?.nodes) {
    for (const id in danangStreetGraph.nodes) {
      nodes[id] = { ...danangStreetGraph.nodes[id] };
    }
  }
  if (danangStreetGraph?.edges) {
    for (const id in danangStreetGraph.edges) {
      edges[id] = [...danangStreetGraph.edges[id]];
    }
  }

  // Bổ sung đầy đủ các trạm của các tuyến
  if (routes) {
    routes.forEach((route) => {
      ['di', 've'].forEach((chieu) => {
        const stops = layThuTuTram(route, chieu);
        stops.forEach((s) => {
          if (!nodes[s.id]) {
            nodes[s.id] = { id: s.id, name: s.name, lat: s.lat, lng: s.lng, loai: 'tram', tuyen: route.id };
            edges[s.id] = [];
          }
        });
        for (let i = 0; i < stops.length - 1; i++) {
          const u = stops[i];
          const v = stops[i + 1];
          if (!edges[u.id]) edges[u.id] = [];
          if (!edges[u.id].some((e) => e.to === v.id)) {
            edges[u.id].push({ to: v.id, met: haversine(u, v), loai: 'xe' });
          }
        }
      });
    });
  }

  const allNodes = Object.values(nodes);

  // Nối điểm xuất phát tới các nút đường phố & trạm gần nhất xung quanh
  if (diemXuatPhat) {
    nodes['__xuat_phat'] = { id: '__xuat_phat', name: 'Điểm xuất phát', lat: diemXuatPhat.lat, lng: diemXuatPhat.lng, laDiemNguoiDung: true };
    edges['__xuat_phat'] = [];

    const ungVien = allNodes
      .filter((n) => n.id !== '__xuat_phat' && n.id !== '__diem_dich')
      .map((n) => ({ id: n.id, d: haversine(diemXuatPhat, n) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);

    ungVien.forEach(({ id, d }) => {
      edges['__xuat_phat'].push({ to: id, met: d, loai: 'diBo' });
    });
  }

  // Nối các nút lân cận tới điểm đến
  if (diemDich) {
    nodes['__diem_dich'] = { id: '__diem_dich', name: 'Điểm đến', lat: diemDich.lat, lng: diemDich.lng, laDiemNguoiDung: true };
    edges['__diem_dich'] = [];

    const ungVien = allNodes
      .filter((n) => n.id !== '__xuat_phat' && n.id !== '__diem_dich')
      .map((n) => ({ id: n.id, d: haversine(diemDich, n) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);

    ungVien.forEach(({ id, d }) => {
      if (!edges[id]) edges[id] = [];
      edges[id].push({ to: '__diem_dich', met: d, loai: 'diBo' });
    });
  }

  return { nodes, edges, lines: danangStreetGraph?.lines || [] };
}
