function sapXepCanh(a, b) {
  if (a.loai !== b.loai) return a.loai === 'xe' ? -1 : 1;
  return a.met - b.met;
}

export function chayBFS(doThi, batDau, ketThuc) {
  const stats = {
    nodesVisited: 0,
    depthReached: 0,
    iterationsCount: 1,
    timeTaken: 0,
    memoryNodes: 1,
    maxQueueSize: 1,
    dungSom: false
  };
  const lucBatDau = performance.now();
  const hangDoi = [[batDau]];
  const daXep = new Set([batDau]);

  while (hangDoi.length > 0) {
    stats.maxQueueSize = Math.max(stats.maxQueueSize, hangDoi.length);
    stats.memoryNodes = stats.maxQueueSize;

    const duong = hangDoi.shift();
    const nodeId = duong[duong.length - 1];
    stats.nodesVisited += 1;

    if (nodeId === ketThuc) {
      stats.timeTaken = performance.now() - lucBatDau;
      stats.depthReached = duong.length - 1;
      return { found: true, path: duong, stats, steps: [] };
    }

    const cacCanh = (doThi.edges[nodeId] || []).slice().sort(sapXepCanh);
    cacCanh.forEach((canh) => {
      if (daXep.has(canh.to)) return;
      daXep.add(canh.to);
      hangDoi.push(duong.concat(canh.to));
    });
  }

  stats.timeTaken = performance.now() - lucBatDau;
  return { found: false, path: [], stats, steps: [] };
}
