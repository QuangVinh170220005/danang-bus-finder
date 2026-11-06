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

    if (nodeId === ketThuc) return true;
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
