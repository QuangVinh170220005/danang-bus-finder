import { haversine } from './haversine';
import { layCanh, layThuTuTram } from './graph';
import { thongKeHanhTrinh } from './goiYTuyen';

const DIEM_DI = '__diem_di';
const DIEM_DEN = '__diem_den';

function dungDoThi(ds, diemDi, diemDen) {
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

  ds.forEach((g, idx) => {
    const thuTu = layThuTuTram(g.route, g.chieu);
    const doan = thuTu.slice(g.i, g.j + 1);

    doan.forEach((tram, k) => {
      const id = `t${idx}_${k}`;
      nodes[id] = {
        id,
        name: tram.name,
        lat: tram.lat,
        lng: tram.lng,
        goiY: idx,
        tramGoc: tram
      };
      edges[id] = [];
    });

    edges[DIEM_DI].push({
      to: `t${idx}_0`,
      met: Math.round(g.metDi),
      loai: 'diBo',
      tuyenId: g.route.id,
      chieu: g.chieu
    });

    for (let k = 0; k < doan.length - 1; k++) {
      edges[`t${idx}_${k}`].push({
        to: `t${idx}_${k + 1}`,
        met: Math.round(haversine(doan[k], doan[k + 1])),
        loai: 'xe',
        tuyenId: g.route.id,
        chieu: g.chieu
      });
    }

    edges[`t${idx}_${doan.length - 1}`].push({
      to: DIEM_DEN,
      met: Math.round(g.metDen),
      loai: 'diBo',
      tuyenId: g.route.id,
      chieu: g.chieu
    });
  });

  return { nodes, edges };
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
  const tran = itTram ? 60 : 400;

  for (let vong = 0; vong < tran; vong++) {
    stats.iterationsCount += 1;
    steps.push({
      type: 'NEW_DEPTH',
      depth: itTram ? gioiHan : vong + 1,
      message: itTram ? `Lần ${gioiHan}: tối đa ${gioiHan} bước` : `Lần ${vong + 1}: nới giới hạn quãng đường`
    });

    let vuotNhoNhat = Infinity;
    let totNhat = null;

    function dls(nodeId, chiPhiHienTai, metHienTai, duong) {
      if (stats.nodesVisited >= 200000) {
        stats.dungSom = true;
        return;
      }

      stats.nodesVisited += 1;
      stats.memoryNodes = Math.max(stats.memoryNodes, duong.length);

      if (nodeId === DIEM_DEN) {
        const ungVien = {
          path: duong.slice(),
          met: metHienTai,
          buoc: duong.length - 1
        };
        const hon = !totNhat
          || (itTram ? ungVien.buoc < totNhat.buoc || (ungVien.buoc === totNhat.buoc && ungVien.met < totNhat.met) : ungVien.met < totNhat.met);
        if (hon) totNhat = ungVien;
        return;
      }

      const cacCanh = doThi.edges[nodeId] || [];
      for (let i = 0; i < cacCanh.length; i++) {
        const canh = cacCanh[i];
        if (duong.includes(canh.to)) continue;
        const them = itTram ? 1 : canh.met;
        const moi = chiPhiHienTai + them;
        if (moi > gioiHan) {
          if (moi < vuotNhoNhat) vuotNhoNhat = moi;
          continue;
        }
        duong.push(canh.to);
        dls(canh.to, moi, metHienTai + canh.met, duong);
        duong.pop();
        if (stats.dungSom) return;
      }
    }

    dls(DIEM_DI, 0, 0, [DIEM_DI]);

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
  steps.push({ type: 'FAILURE', message: 'Không thấy đường trong các tuyến đã gợi ý' });
  return { found: false, path: [], stats, steps, met: 0 };
}

function docKetQua(doThi, ids, ds, diemDi, diemDen, tieuChi) {
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
      tuyenId: canh?.tuyenId,
      chieu: canh?.chieu
    });
  }

  const tramNodes = ids.path.map((id) => doThi.nodes[id]).filter((node) => node && !node.laDiemNguoiDung);
  const g = ds[tramNodes[0].goiY];
  const thongKe = thongKeHanhTrinh(g.route, g.chieu, g.i, g.j, g.metDi, g.metDen);

  return {
    thanhCong: true,
    thongBao: '',
    diemDi,
    diemDen,
    tramDon: tramNodes[0].tramGoc,
    tramXuong: tramNodes[tramNodes.length - 1].tramGoc,
    metDiBoDau: cacDoan[0]?.loai === 'diBo' ? cacDoan[0].met : 0,
    metDiBoCuoi: cacDoan[cacDoan.length - 1]?.loai === 'diBo' ? cacDoan[cacDoan.length - 1].met : 0,
    cacDoan,
    cacTram: tramNodes.map((node) => node.tramGoc),
    tuyenId: g.route.id,
    chieu: g.chieu,
    tenTuyen: g.route.name,
    tramKhac: [],
    ids,
    bfs: null,
    thongKe,
    tieuChi
  };
}

export function chonTuyenBangIDS(ds, diemDi, diemDen, tieuChi) {
  if (!ds?.length) {
    return { thanhCong: false, thongBao: 'Chưa có tuyến nào để IDS chọn.', ids: null, bfs: null };
  }

  const doThi = dungDoThi(ds, diemDi, diemDen);
  const ids = chayIDSChon(doThi, tieuChi);
  if (!ids.found) {
    return { thanhCong: false, thongBao: 'IDS không tìm được đường trong các tuyến đã gợi ý.', ids, bfs: null };
  }

  return docKetQua(doThi, ids, ds, diemDi, diemDen, tieuChi);
}
