export class BFSAlgorithm {
  constructor(graph) {
    this.graph = graph;
    this.stats = {
      nodesVisited: 0,
      maxQueueSize: 0,
      timeTaken: 0
    };
    this.steps = [];
  }

  search(startNodeId, goalNodeId) {
    this.reset();
    const startTime = performance.now();

    const queue = [{ id: startNodeId, path: [startNodeId] }];
    const visited = new Set([startNodeId]);

    this.steps.push({
      type: 'START',
      nodeId: startNodeId,
      message: `BFS bắt đầu từ "${this.graph.nodes[startNodeId]?.name}"`
    });

    while (queue.length > 0) {
      this.stats.maxQueueSize = Math.max(this.stats.maxQueueSize, queue.length);

      const { id, path } = queue.shift();
      this.stats.nodesVisited++;

      const node = this.graph.nodes[id];
      if (!node) continue;

      this.steps.push({
        type: 'VISIT',
        nodeId: id,
        nodeName: node.name,
        queueSize: queue.length,
        message: `Thăm ${node.name} (hàng đợi: ${queue.length})`
      });

      if (id === goalNodeId) {
        this.stats.timeTaken = performance.now() - startTime;

        this.steps.push({
          type: 'FOUND',
          nodeId: id,
          path,
          message: 'BFS tìm thấy đích'
        });

        return {
          found: true,
          path,
          pathDetails: this._buildPathDetails(path),
          stats: { ...this.stats },
          steps: this.steps
        };
      }

      const neighbors = this.graph.edges[id] || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({
            id: edge.to,
            path: [...path, edge.to]
          });

          this.steps.push({
            type: 'EXPLORE_EDGE',
            from: id,
            to: edge.to,
            edgeType: edge.type
          });
        }
      }
    }

    this.stats.timeTaken = performance.now() - startTime;

    this.steps.push({
      type: 'FAILURE',
      message: 'BFS không thấy đường'
    });

    return {
      found: false,
      stats: { ...this.stats },
      steps: this.steps
    };
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
      maxQueueSize: 0,
      timeTaken: 0
    };
    this.steps = [];
  }
}
