import { layDuongPho } from '../services/vietmap';
import { haversine } from './haversine';
import { taoDoThiToanMang } from './graph';

const SO_BUOC_THUONG = 200;
const SO_NUT_TOI_DA = 12000;

function sapXepCanh(a, b) {
  if (a.loai !== b.loai) return a.loai === 'xe' ? -1 : 1;
  return a.met - b.met;
}

export function chayIDS(doThi, batDau, ketThuc) {
  const stats = {
    nodesVisited: 0,
    depthReached: 0,
    iterationsCount: 0,
    timeTaken: 0,
    memoryNodes: 1,
    maxQueueSize: 0,
    dungSom: false
  };
  const steps = [];
  const gioiHanDoSau = Math.min(18, Object.keys(doThi.nodes).length + 2);
  const lucBatDau = performance.now();

  function ghiBuoc(buoc) {
    const buocChinh = buoc.type === 'START' || buoc.type === 'NEW_DEPTH' || buoc.type === 'SUCCESS' || buoc.type === 'FAILURE';
    if (buocChinh || steps.length < SO_BUOC_THUONG) steps.push(buoc);
  }

  function timCoGioiHan(nodeId, doSauConLai, duong) {
    if (stats.nodesVisited >= SO_NUT_TOI_DA) {
      stats.dungSom = true;
      return false;
    }

    stats.nodesVisited += 1;
    stats.memoryNodes = Math.max(stats.memoryNodes, duong.length);

    const node = doThi.nodes[nodeId];
    ghiBuoc({
      type: 'VISIT',
      nodeId,
      ten: node?.name || nodeId,
      lat: node?.lat,
      lng: node?.lng,
      message: `Xét ${node?.name || nodeId}, độ sâu ${duong.length - 1}`
    });

    const daToi = typeof ketThuc === 'function' ? ketThuc(nodeId) && nodeId !== batDau : nodeId === ketThuc;
    if (daToi) return true;
    if (doSauConLai === 0) return false;

    const cacCanh = (doThi.edges[nodeId] || [])
      .filter((canh) => !duong.includes(canh.to))
      .sort(sapXepCanh);

    for (let i = 0; i < cacCanh.length; i++) {
      duong.push(cacCanh[i].to);
      if (timCoGioiHan(cacCanh[i].to, doSauConLai - 1, duong)) return true;
      duong.pop();
    }

    return false;
  }

  ghiBuoc({
    type: 'START',
    message: 'IDS bắt đầu từ độ sâu 1. Chưa thấy đường thì tăng độ sâu.'
  });

  for (let doSau = 1; doSau <= gioiHanDoSau; doSau++) {
    if (stats.dungSom) break;

    stats.iterationsCount += 1;
    stats.depthReached = doSau;
    ghiBuoc({
      type: 'NEW_DEPTH',
      depth: doSau,
      message: `Lần ${doSau}: chỉ được đi tối đa ${doSau} bước`
    });

    const duong = [batDau];
    if (timCoGioiHan(batDau, doSau, duong)) {
      stats.timeTaken = performance.now() - lucBatDau;
      stats.depthReached = duong.length - 1;
      ghiBuoc({
        type: 'SUCCESS',
        message: `Tìm thấy đường, dài ${duong.length - 1} bước`
      });
      return { found: true, path: duong.slice(), stats, steps };
    }
  }

  stats.timeTaken = performance.now() - lucBatDau;
  ghiBuoc({
    type: 'FAILURE',
    message: stats.dungSom ? 'Dừng vì phải xét quá nhiều nút' : 'Hết độ sâu mà chưa thấy đường'
  });
  return { found: false, path: [], stats, steps };
}

export function gomCacLan(steps) {
  const cacLan = [];
  let lanDangThu = null;

  steps.forEach((step) => {
    if (step.type === 'START') {
      cacLan.push({
        loai: 'batDau',
        tieuDe: 'Cách IDS thử',
        giaiThich: 'IDS không đi một mạch tới đích. Nó thử đi 1 bước rồi quay về điểm đi, thử 2 bước rồi quay về, cứ thế đến khi tới điểm đến.',
        nut: []
      });
      return;
    }

    if (step.type === 'NEW_DEPTH') {
      lanDangThu = {
        loai: 'thu',
        doSau: step.depth,
        tieuDe: `Lần ${step.depth}: được đi ${step.depth} bước`,
        giaiThich: 'Bắt đầu lại từ điểm đi. Hết số bước mà chưa tới điểm đến thì lần sau được đi thêm một bước. Cùng một chỗ hiện ở nhiều lần là vì vậy.',
        nut: []
      };
      cacLan.push(lanDangThu);
      return;
    }

    if (step.type === 'VISIT' && lanDangThu && step.lat != null) {
      const daCo = lanDangThu.nut.some((nut) => nut.nodeId === step.nodeId);
      if (!daCo) {
        lanDangThu.nut.push({
          nodeId: step.nodeId,
          ten: step.ten || step.nodeId,
          lat: step.lat,
          lng: step.lng
        });
      }
    }
  });

  const ket = steps[steps.length - 1];
  if (ket?.type === 'SUCCESS') {
    cacLan.push({
      loai: 'xong',
      tieuDe: 'Tìm thấy đường',
      giaiThich: 'Lần này đủ bước để tới điểm đến. Đường trên bản đồ là đường ít bước nhất. Các lần trước phải làm lại vì chưa đi xa được tới nơi.',
      nut: []
    });
  }
  if (ket?.type === 'FAILURE') {
    cacLan.push({
      loai: 'hong',
      tieuDe: 'Không thấy đường',
      giaiThich: ket.message,
      nut: []
    });
  }

  return cacLan;
}


// Generator chạy mô phỏng thuật toán IDS từng bước theo độ sâu L (giống ids-tim-kiem-ben-xe.netlify.app)
export function* taoBoChayIDS(doThi, startId, isGoal, maxD = 25, cap = 200000) {
  let prevSize = -1;
  const colors = ['#0f9d78', '#1d7fd1', '#6b5bd6', '#d6428f', '#e08a00', '#d9482b'];

  for (let Lm = 0; Lm <= maxD; Lm++) {
    const best = new Map();
    const path = [startId];
    const visitedNodes = [];
    let cnt = 0;
    let found = null;
    let aborted = false;

    function dls(u, d) {
      const b = best.get(u);
      if (b !== undefined && b <= d) return false;
      best.set(u, d);
      cnt++;

      const n = doThi.nodes[u];
      if (n && n.lat != null && n.lng != null) {
        visitedNodes.push({ id: u, name: n.name || u, lat: n.lat, lng: n.lng, d });
      }

      if (isGoal(u) && u !== startId) {
        found = path.slice();
        return true;
      }
      if (d === Lm) return false;
      if (cnt > cap) {
        aborted = true;
        return false;
      }

      const edges = (doThi.edges[u] || []).slice().sort((a, b) => a.met - b.met);
      for (const e of edges) {
        if (!path.includes(e.to)) {
          path.push(e.to);
          if (dls(e.to, d + 1)) return true;
          path.pop();
          if (aborted) return false;
        }
      }
      return false;
    }

    dls(startId, 0);

    const seenNodes = [];
    best.forEach((depth, id) => {
      const n = doThi.nodes[id];
      if (n && n.lat != null && n.lng != null && id !== startId) {
        seenNodes.push({ id, name: n.name || id, lat: n.lat, lng: n.lng, d: depth });
      }
    });

    const exhausted = !found && !aborted && best.size === prevSize;
    prevSize = best.size;

    yield {
      L: Lm,
      cnt,
      seenCount: best.size,
      seenNodes,
      visitedNodes: seenNodes,
      color: colors[Lm % colors.length],
      found,
      aborted,
      exhausted
    };

    if (found || aborted || exhausted) return;
  }
}

// Tính số lượng nút đỉnh điểm mà BFS phải giữ trong hàng đợi (để so sánh bộ nhớ với IDS)
export function bfsPeak(doThi, startId, isGoal) {
  let q = [startId];
  const vis = new Set(q);
  let peak = 1;

  while (q.length > 0) {
    const nq = [];
    for (const u of q) {
      if (isGoal(u)) return { peak };
      const edges = doThi.edges[u] || [];
      for (const e of edges) {
        if (!vis.has(e.to)) {
          vis.add(e.to);
          nq.push(e.to);
        }
      }
    }
    q = nq;
    peak = Math.max(peak, q.length);
  }

  return { peak };
}

// Chuyển kết quả chuỗi nút IDS tìm được thành các cung đường phố thực tế (không dùng đường chim bay)
export async function giaiMaDuongIDS(doThi, pathIds) {
  if (!pathIds || pathIds.length < 2) return null;

  const segments = [];
  const allCoords = [];

  for (let i = 0; i < pathIds.length - 1; i++) {
    const uId = pathIds[i];
    const vId = pathIds[i + 1];
    const uNode = doThi.nodes[uId];
    const vNode = doThi.nodes[vId];
    if (!uNode || !vNode) continue;

    const edge = (doThi.edges[uId] || []).find((e) => e.to === vId);
    const laDiBo = uId === '__xuat_phat' || vId === '__diem_dich' || edge?.loai === 'diBo';
    const phuongTien = laDiBo ? 'foot' : 'motorcycle';

    let toaDo = null;
    let met = edge?.met || 0;

    const duong = await layDuongPho([uNode, vNode], phuongTien).catch(() => null);
    if (duong && duong.toaDo && duong.toaDo.length >= 2) {
      toaDo = duong.toaDo;
      met = duong.met;
    } else {
      toaDo = [[uNode.lat, uNode.lng], [vNode.lat, vNode.lng]];
    }

    segments.push({
      from: uNode,
      to: vNode,
      loai: laDiBo ? 'diBo' : 'xe',
      phuongTien,
      toaDo,
      met
    });
  }

  segments.forEach((seg, idx) => {
    if (idx === 0) {
      allCoords.push(...seg.toaDo);
    } else {
      allCoords.push(...seg.toaDo.slice(1));
    }
  });

  return { segments, allCoords };
}

// Tìm đường đi bộ bằng thuật toán IDS trên mạng lưới đường phố Đà Nẵng
export function timDuongDiBoBangIDS(routes, diemBatDau, diemKetThuc) {
  if (!diemBatDau || !diemKetThuc) return null;
  const doThi = taoDoThiToanMang(routes, diemBatDau, diemKetThuc);
  const res = chayIDS(doThi, '__xuat_phat', '__diem_dich');
  if (res.found && res.path.length >= 2) {
    const toaDo = res.path.map((id) => {
      const n = doThi.nodes[id];
      return n ? [n.lat, n.lng] : null;
    }).filter(Boolean);

    let met = 0;
    for (let i = 0; i < res.path.length - 1; i++) {
      const u = res.path[i];
      const v = res.path[i + 1];
      const canh = (doThi.edges[u] || []).find((c) => c.to === v);
      if (canh) met += canh.met;
      else if (doThi.nodes[u] && doThi.nodes[v]) met += haversine(doThi.nodes[u], doThi.nodes[v]);
    }

    return {
      met: Math.round(met),
      toaDo,
      soBuoc: res.path.length - 1,
      thuatToan: 'IDS'
    };
  }

  // Dự phòng khoảng cách thẳng nếu không nối được trên đồ thị
  const d = haversine(diemBatDau, diemKetThuc);
  return {
    met: Math.round(d),
    toaDo: [[diemBatDau.lat, diemBatDau.lng], [diemKetThuc.lat, diemKetThuc.lng]],
    thuatToan: 'IDS'
  };
}

// Tìm trạm gần nhất bằng thuật toán IDS từ một vị trí bất kỳ
export function timTramGanNhatBangIDS(routes, viTri, cacTramMuctieu) {
  if (!viTri || !cacTramMuctieu || !cacTramMuctieu.length) return null;
  const doThi = taoDoThiToanMang(routes, viTri, null);
  const tramSet = new Set(cacTramMuctieu.map((t) => t.id));
  const isGoal = (u) => tramSet.has(u);

  const res = chayIDS(doThi, '__xuat_phat', isGoal);
  if (res.found && res.path.length >= 2) {
    const goalId = res.path[res.path.length - 1];
    const tram = cacTramMuctieu.find((t) => t.id === goalId) || doThi.nodes[goalId];
    const toaDo = res.path.map((id) => {
      const n = doThi.nodes[id];
      return n ? [n.lat, n.lng] : null;
    }).filter(Boolean);

    let met = 0;
    for (let i = 0; i < res.path.length - 1; i++) {
      const u = res.path[i];
      const v = res.path[i + 1];
      const canh = (doThi.edges[u] || []).find((c) => c.to === v);
      if (canh) met += canh.met;
      else if (doThi.nodes[u] && doThi.nodes[v]) met += haversine(doThi.nodes[u], doThi.nodes[v]);
    }

    return {
      tram,
      met: Math.round(met),
      toaDo,
      soBuoc: res.path.length - 1,
      doSauL: res.stats.depthReached,
      thuatToan: 'IDS'
    };
  }

  // Dự phòng: trạm gần nhất theo khoảng cách
  let ganNhat = null;
  let minMet = Infinity;
  cacTramMuctieu.forEach((tram) => {
    const d = haversine(viTri, tram);
    if (d < minMet) {
      minMet = d;
      ganNhat = tram;
    }
  });

  return ganNhat ? {
    tram: ganNhat,
    met: Math.round(minMet),
    toaDo: [[viTri.lat, viTri.lng], [ganNhat.lat, ganNhat.lng]],
    thuatToan: 'IDS'
  } : null;
}
