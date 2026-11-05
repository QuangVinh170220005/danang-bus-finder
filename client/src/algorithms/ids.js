export class IDSAlgorithm {
  constructor(graph) {
    this.graph = graph;
    this.stats = {
      nodesVisited: 0,
      depthReached: 0,
      timeTaken: 0,
      iterationsCount: 0
    };
    this.steps = [];
  }

  search(startNodeId, goalNodeId, maxDepth = 20) {
    this.reset();
    const startTime = performance.now();

    this.steps.push({
      type: 'START',
      nodeId: startNodeId,
      goalId: goalNodeId,
      message: `Bắt đầu từ "${this.graph.nodes[startNodeId]?.name}" đến "${this.graph.nodes[goalNodeId]?.name}"`
    });

    for (let depth = 1; depth <= maxDepth; depth++) {
      this.stats.depthReached = depth;
      this.stats.iterationsCount++;

      this.steps.push({
        type: 'NEW_DEPTH',
        depth,
        message: `Lần ${this.stats.iterationsCount}: độ sâu ${depth}`
      });

      const result = this._dls(startNodeId, goalNodeId, depth, [], new Set());

      if (result.found) {
        this.stats.timeTaken = performance.now() - startTime;
        this.steps.push({
          type: 'SUCCESS',
          path: result.path,
          message: `Tìm thấy đường sau ${this.stats.iterationsCount} lần lặp`
        });

        return {
          found: true,
          path: result.path,
          pathDetails: this._buildPathDetails(result.path),
          stats: { ...this.stats },
          steps: this.steps
        };
      }
    }

    this.stats.timeTaken = performance.now() - startTime;
    this.steps.push({
      type: 'FAILURE',
      message: `Không thấy đường sau ${this.stats.iterationsCount} lần lặp`
    });

    return {
      found: false,
      stats: { ...this.stats },
      steps: this.steps
    };
  }

  _dls(nodeId, goalId, limit, path, visited) {
    this.stats.nodesVisited++;
    const node = this.graph.nodes[nodeId];

    if (!node) {
      return { found: false };
    }

    const currentPath = [...path, nodeId];
    visited.add(nodeId);

    this.steps.push({
      type: 'VISIT',
      nodeId,
      nodeName: node.name,
      depth: currentPath.length - 1,
      limit,
      routes: node.routes,
      message: `Thăm ${node.name} (độ sâu ${currentPath.length - 1}/${limit})`
    });

    if (nodeId === goalId) {
      this.steps.push({
        type: 'FOUND',
        nodeId,
        path: currentPath,
        message: `Đích: ${node.name}`
      });
      return { found: true, path: currentPath };
    }

    if (limit === 0) {
      this.steps.push({
        type: 'DEPTH_LIMIT',
        nodeId,
        message: `Hết độ sâu tại ${node.name}`
      });
      return { found: false };
    }

    const neighbors = (this.graph.edges[nodeId] || [])
      .filter(e => !visited.has(e.to))
      .sort((a, b) => {
        if (a.type === 'bus' && b.type === 'walk') return -1;
        if (a.type === 'walk' && b.type === 'bus') return 1;
        return a.weight - b.weight;
      });

    for (const edge of neighbors) {
      this.steps.push({
        type: 'EXPLORE_EDGE',
        from: nodeId,
        to: edge.to,
        weight: edge.weight,
        edgeType: edge.type,
        route: edge.route,
        message: `Sang ${this.graph.nodes[edge.to]?.name} (${edge.type})`
      });

      const result = this._dls(edge.to, goalId, limit - 1, currentPath, new Set(visited));

      if (result.found) {
        return result;
      }
    }

    this.steps.push({
      type: 'BACKTRACK',
      nodeId,
      message: `Quay lui từ ${node.name}`
    });

    return { found: false };
  }

  _buildPathDetails(path) {
    const details = [];

    for (let i = 0; i < path.length - 1; i++) {
      const fromId = path[i];
      const toId = path[i + 1];
      const edge = this.graph.edges[fromId]?.find(e => e.to === toId);

      if (edge) {
        details.push({
          from: this.graph.nodes[fromId],
          to: this.graph.nodes[toId],
          distance: edge.weight,
          type: edge.type,
          route: edge.route
        });
      }
    }

    return details;
  }

  reset() {
    this.stats = {
      nodesVisited: 0,
      depthReached: 0,
      timeTaken: 0,
      iterationsCount: 0
    };
    this.steps = [];
  }

  searchByRoute(startNodeId, targetRoute, maxDepth = 15) {
    this.reset();
    const startTime = performance.now();

    for (let depth = 1; depth <= maxDepth; depth++) {
      this.stats.depthReached = depth;
      this.stats.iterationsCount++;

      const result = this._dlsByRoute(startNodeId, targetRoute, depth, [], new Set());

      if (result.found) {
        this.stats.timeTaken = performance.now() - startTime;
        return {
          found: true,
          stops: result.stops,
          stats: { ...this.stats },
          steps: this.steps
        };
      }
    }

    this.stats.timeTaken = performance.now() - startTime;
    return { found: false, stats: { ...this.stats }, steps: this.steps };
  }

  _dlsByRoute(nodeId, targetRoute, limit, path, visited) {
    this.stats.nodesVisited++;
    const node = this.graph.nodes[nodeId];

    if (!node) return { found: false };

    const currentPath = [...path, nodeId];
    visited.add(nodeId);

    if (node.routes.includes(targetRoute)) {
      return { found: true, stops: [node] };
    }

    if (limit === 0) return { found: false };

    const neighbors = (this.graph.edges[nodeId] || [])
      .filter(e => !visited.has(e.to))
      .sort((a, b) => a.weight - b.weight);

    for (const edge of neighbors) {
      const result = this._dlsByRoute(edge.to, targetRoute, limit - 1, currentPath, new Set(visited));
      if (result.found) {
        return { found: true, stops: [node, ...result.stops] };
      }
    }

    return { found: false };
  }
}
