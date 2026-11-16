import { haversine } from './haversine';
import { layCanh, layThuTuTram, tenChieu } from './graph';

const DIEM_DI = '__diem_di';
const DIEM_DEN = '__diem_den';
const BAN_KINH_GAN = 2000;
const BAN_KINH_CHUYEN_TUYEN = 500;
const MET_MOI_PHUT_DI_BO = 5000 / 60;
const MET_MOI_PHUT_XE = 20000 / 60;

function khoaToaDo(p) {
  return `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
}

function dungDoThi(routes, diemDi, diemDen, ds = []) {
  const nodes = {};
  const edges = {};

  nodes[DIEM_DI] = {
    id: DIEM_DI,
    name: 'Điểm đi',
    lat: diemDi.lat,
    lng: diemDi.lng,
    laDiemNguoiDung: true
  };
  nodes[DIEM_DEN] = {
    id: DIEM_DEN,
    name: 'Điểm đến',
    lat: diemDen.lat,
    lng: diemDen.lng,
    laDiemNguoiDung: true
  };
  edges[DIEM_DI] = [];
  edges[DIEM_DEN] = [];

  // Tận dụng khoảng cách đường phố Goong Distance Matrix đã tính sẵn (nếu có)
  const metDiPhoMap = new Map();
  const metDenPhoMap = new Map();
  (ds || []).forEach((g) => {
    const thuTu = layThuTuTram(g.route, g.chieu);
    if (thuTu[g.i]) metDiPhoMap.set(khoaToaDo(thuTu[g.i]), Math.round(g.metDi));
    if (thuTu[g.j]) metDenPhoMap.set(khoaToaDo(thuTu[g.j]), Math.round(g.metDen));
  });

  const allStopNodes = [];

  (routes || []).forEach((route) => {
    ['di', 've'].forEach((chieu) => {
      const thuTu = layThuTuTram(route, chieu);
      thuTu.forEach((tram, k) => {
        const id = `r_${route.id}_${chieu}_${k}`;
        const node = {
          id,
          name: tram.name,
          lat: tram.lat,
          lng: tram.lng,
          tuyenId: route.id,
          tenTuyen: route.name,
          chieu,
          tramGoc: tram
        };
        nodes[id] = node;
        edges[id] = [];
        allStopNodes.push(node);
      });

      for (let k = 0; k < thuTu.length - 1; k++) {
        const tuId = `r_${route.id}_${chieu}_${k}`;
        const denId = `r_${route.id}_${chieu}_${k + 1}`;
        edges[tuId].push({
          to: denId,
          met: Math.round(haversine(thuTu[k], thuTu[k + 1])),
          loai: 'xe',
          tuyenId: route.id,
          chieu
        });
      }
    });
  });

  // Thêm cạnh chuyển tuyến giữa 2 tuyến khác nhau có trạm trùng hoặc gần nhau (<= 500m)
  for (let a = 0; a < allStopNodes.length; a++) {
    const u = allStopNodes[a];
    for (let b = a + 1; b < allStopNodes.length; b++) {
      const v = allStopNodes[b];
      if (u.tuyenId === v.tuyenId) continue;
      const d = haversine(u, v);
      if (d <= BAN_KINH_CHUYEN_TUYEN) {
        const met = Math.round(d);
        edges[u.id].push({ to: v.id, met, loai: 'chuyenTuyen' });
        edges[v.id].push({ to: u.id, met, loai: 'chuyenTuyen' });
      }
    }
  }

  // Nối điểm đi -> các trạm gần nhất (ưu tiên trong 2km; nếu không có thì lấy top 12 trạm gần nhất)
  const ungVienDi = allStopNodes
    .map((n) => {
      const k = khoaToaDo(n);
      const met = metDiPhoMap.has(k) ? metDiPhoMap.get(k) : Math.round(haversine(diemDi, n));
      return { id: n.id, met };
    })
    .sort((a, b) => a.met - b.met);

  const ganDi = ungVienDi.filter((u) => u.met <= BAN_KINH_GAN);
  const chonDi = ganDi.length > 0 ? ganDi : ungVienDi.slice(0, 12);
  chonDi.forEach((u) => {
    edges[DIEM_DI].push({ to: u.id, met: u.met, loai: 'diBo' });
  });

  // Nối các trạm gần điểm đến -> điểm đến (ưu tiên trong 2km; nếu không có thì lấy top 12 trạm gần nhất)
  const ungVienDen = allStopNodes
    .map((n) => {
      const k = khoaToaDo(n);
      const met = metDenPhoMap.has(k) ? metDenPhoMap.get(k) : Math.round(haversine(n, diemDen));
      return { id: n.id, met };
    })
    .sort((a, b) => a.met - b.met);

  const ganDen = ungVienDen.filter((u) => u.met <= BAN_KINH_GAN);
  const chonDen = ganDen.length > 0 ? ganDen : ungVienDen.slice(0, 12);
  chonDen.forEach((u) => {
    edges[u.id].push({ to: DIEM_DEN, met: u.met, loai: 'diBo' });
  });

  return { nodes, edges };
}

function chiPhiCanh(canh, itTram) {
  if (itTram) return 1;
  if (canh.loai === 'diBo') return canh.met * 4;
  if (canh.loai === 'chuyenTuyen') return canh.met * 4 + 1000;
  return canh.met;
}

function chayIDSChon(doThi, tieuChi) {
  const itTram = tieuChi === 'itTram';
  const stats = {
    nodesVisited: 0,
    depthReached: 0,
    iterationsCount: 0,
    timeTaken: 0,
    memoryNodes: 1,
    maxQueueSize: 0,
    dungSom: false
  };
  const steps = [{ type: 'START', message: 'IDS bắt đầu từ giới hạn nhỏ nhất, rồi nới rộng cho đến khi tới điểm đến.' }];
  const lucBatDau = performance.now();
  let gioiHan = itTram ? 1 : 0;
  const soNut = Object.keys(doThi.nodes).length;
  const tran = itTram ? Math.max(80, soNut + 5) : Math.max(1500, soNut * 3);

  for (let vong = 0; vong < tran; vong++) {
    stats.iterationsCount += 1;
    steps.push({
      type: 'NEW_DEPTH',
      depth: itTram ? gioiHan : vong + 1,
      message: itTram ? `Lần ${gioiHan}: tối đa ${gioiHan} bước` : `Lần ${vong + 1}: nới giới hạn chi phí`
    });

    let vuotNhoNhat = Infinity;
    let totNhat = null;
    const bestAtState = new Map();

    function dls(nodeId, chiPhiHienTai, metHienTai, metDiBoHienTai, soLanChuyen, duong) {
      if (stats.nodesVisited >= 250000) {
        stats.dungSom = true;
        return;
      }

      const stateKey = `${nodeId}|${soLanChuyen}`;
      const prevBest = bestAtState.get(stateKey);
      if (prevBest !== undefined && prevBest <= chiPhiHienTai) return;
      bestAtState.set(stateKey, chiPhiHienTai);

      stats.nodesVisited += 1;
      stats.memoryNodes = Math.max(stats.memoryNodes, duong.length);

      if (nodeId === DIEM_DEN) {
        const ungVien = {
          path: duong.slice(),
          chiPhi: chiPhiHienTai,
          met: metHienTai,
          metDiBo: metDiBoHienTai,
          buoc: duong.length - 1
        };
        const hon = !totNhat
          || (itTram
            ? ungVien.buoc < totNhat.buoc || (ungVien.buoc === totNhat.buoc && ungVien.metDiBo < totNhat.metDiBo)
            : ungVien.chiPhi < totNhat.chiPhi || (ungVien.chiPhi === totNhat.chiPhi && ungVien.met < totNhat.met));
        if (hon) totNhat = ungVien;
        return;
      }

      const cacCanh = doThi.edges[nodeId] || [];
      for (let i = 0; i < cacCanh.length; i++) {
        const canh = cacCanh[i];
        if (canh.loai === 'chuyenTuyen' && soLanChuyen >= 1) continue;
        if (duong.includes(canh.to)) continue;

        const them = chiPhiCanh(canh, itTram);
        const moi = chiPhiHienTai + them;
        if (moi > gioiHan) {
          if (moi < vuotNhoNhat) vuotNhoNhat = moi;
          continue;
        }

        const chuyenMoi = canh.loai === 'chuyenTuyen' ? soLanChuyen + 1 : soLanChuyen;
        const themDiBo = canh.loai === 'diBo' || canh.loai === 'chuyenTuyen' ? canh.met : 0;

        duong.push(canh.to);
        dls(canh.to, moi, metHienTai + canh.met, metDiBoHienTai + themDiBo, chuyenMoi, duong);
        duong.pop();
        if (stats.dungSom) return;
      }
    }

    dls(DIEM_DI, 0, 0, 0, 0, [DIEM_DI]);

    if (totNhat) {
      stats.depthReached = totNhat.buoc;
      stats.timeTaken = performance.now() - lucBatDau;
      steps.push({ type: 'SUCCESS', message: `Tìm thấy đường, ${totNhat.buoc} bước` });
      return { found: true, path: totNhat.path, stats, steps, met: totNhat.met };
    }

    if (stats.dungSom || vuotNhoNhat === Infinity) break;
    gioiHan = itTram ? gioiHan + 1 : vuotNhoNhat;
  }

  stats.timeTaken = performance.now() - lucBatDau;
  steps.push({ type: 'FAILURE', message: 'Không thấy đường trong mạng lưới tuyến hiện có' });
  return { found: false, path: [], stats, steps, met: 0 };
}

function docKetQua(doThi, ids, diemDi, diemDen, tieuChi) {
  const cacDoan = [];

  for (let i = 0; i < ids.path.length - 1; i++) {
    const tu = doThi.nodes[ids.path[i]];
    const den = doThi.nodes[ids.path[i + 1]];
    const canh = layCanh(doThi, ids.path[i], ids.path[i + 1]);
    cacDoan.push({
      tu,
      den,
      met: canh ? canh.met : Math.round(haversine(tu, den)),
      loai: canh?.loai || 'diBo',
      tuyenId: canh?.tuyenId || den?.tuyenId,
      chieu: canh?.chieu || den?.chieu
    });
  }

  const tramNodes = ids.path.map((id) => doThi.nodes[id]).filter((node) => node && !node.laDiemNguoiDung);

  // Gom các trạm theo từng chặng xe buýt (hỗ trợ cả đi thẳng 1 tuyến và chuyển 2 tuyến)
  const cacChangXe = [];
  tramNodes.forEach((node) => {
    const cuoi = cacChangXe[cacChangXe.length - 1];
    if (cuoi && cuoi.tuyenId === node.tuyenId && cuoi.chieu === node.chieu) {
      cuoi.cacTram.push(node.tramGoc);
    } else {
      cacChangXe.push({
        tuyenId: node.tuyenId,
        chieu: node.chieu,
        tenTuyen: node.tenTuyen,
        cacTram: [node.tramGoc]
      });
    }
  });

  const metDiBoDau = cacDoan[0]?.loai === 'diBo' ? cacDoan[0].met : 0;
  const metDiBoCuoi = cacDoan[cacDoan.length - 1]?.loai === 'diBo' ? cacDoan[cacDoan.length - 1].met : 0;
  const doanChuyen = cacDoan.find((d) => d.loai === 'chuyenTuyen') || null;
  const metDiBoGiua = doanChuyen ? doanChuyen.met : 0;
  const metDiBo = Math.round(metDiBoDau + metDiBoGiua + metDiBoCuoi);
  const metXe = Math.round(
    cacDoan.filter((d) => d.loai === 'xe').reduce((sum, d) => sum + d.met, 0)
  );
  const tongMet = metXe + metDiBo;
  const phut = metDiBo / MET_MOI_PHUT_DI_BO + metXe / MET_MOI_PHUT_XE + (cacChangXe.length > 1 ? 3 : 0);

  const changDau = cacChangXe[0];
  const changCuoi = cacChangXe[cacChangXe.length - 1];
  const moTaTuyen = cacChangXe.map((c) => `Tuyến ${c.tuyenId} (${tenChieu(c.chieu)})`).join(' → ');

  return {
    thanhCong: true,
    thongBao: '',
    diemDi,
    diemDen,
    tramDon: tramNodes[0].tramGoc,
    tramXuong: tramNodes[tramNodes.length - 1].tramGoc,
    tramChuyen: cacChangXe.length > 1 ? changDau.cacTram[changDau.cacTram.length - 1] : null,
    tramChuyenTiep: cacChangXe.length > 1 ? changCuoi.cacTram[0] : null,
    metDiBoDau,
    metDiBoGiua,
    metDiBoCuoi,
    cacDoan,
    cacChangXe,
    cacTram: tramNodes.map((node) => node.tramGoc),
    toaDoDi: null,
    toaDoDen: null,
    toaDoXe: null,
    tuyenId: changDau.tuyenId,
    chieu: changDau.chieu,
    tenTuyen: moTaTuyen,
    tramKhac: [],
    ids,
    bfs: null,
    thongKe: {
      soTram: tramNodes.length,
      metXe,
      metDiBo,
      tongMet,
      phut
    },
    tieuChi
  };
}

export function chonTuyenBangIDS(ds, diemDi, diemDen, tieuChi, routes = null) {
  const dsTuyen = routes && routes.length ? routes : (ds || []).map((g) => g.route).filter(Boolean);
  if (!dsTuyen.length) {
    return { thanhCong: false, thongBao: 'Chưa có tuyến nào để IDS chọn.', ids: null, bfs: null };
  }

  const doThi = dungDoThi(dsTuyen, diemDi, diemDen, ds);
  const ids = chayIDSChon(doThi, tieuChi);
  if (!ids.found) {
    return { thanhCong: false, thongBao: 'IDS không tìm được đường trong các tuyến hiện có.', ids, bfs: null };
  }

  return docKetQua(doThi, ids, diemDi, diemDen, tieuChi);
}
