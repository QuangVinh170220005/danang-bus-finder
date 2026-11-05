import { haversine } from './haversine';

const WALK_RADIUS_METERS = 500;

export function buildGraph(routes) {
  const nodes = {};
  const edges = {};

  routes.forEach(route => {
    route.stops.forEach(stop => {
      if (!nodes[stop.id]) {
        nodes[stop.id] = {
          id: stop.id,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          routes: []
        };
        edges[stop.id] = [];
      }

      if (!nodes[stop.id].routes.includes(route.id)) {
        nodes[stop.id].routes.push(route.id);
      }
    });
  });

  routes.forEach(route => {
    for (let i = 0; i < route.stops.length - 1; i++) {
      const from = route.stops[i];
      const to = route.stops[i + 1];

      if (nodes[from.id] && nodes[to.id]) {
        const distance = haversine(from, to);

        if (!edges[from.id].find(e => e.to === to.id)) {
          edges[from.id].push({
            to: to.id,
            weight: distance,
            type: 'bus',
            route: route.id
          });
        }

        if (!edges[to.id].find(e => e.to === from.id)) {
          edges[to.id].push({
            to: from.id,
            weight: distance,
            type: 'bus',
            route: route.id
          });
        }
      }
    }
  });

  const nodeList = Object.values(nodes);
  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      const distance = haversine(nodeList[i], nodeList[j]);

      if (distance <= WALK_RADIUS_METERS) {
        const hasDirectBusConnection = edges[nodeList[i].id].some(
          e => e.to === nodeList[j].id && e.type === 'bus'
        );

        if (!hasDirectBusConnection) {
          edges[nodeList[i].id].push({
            to: nodeList[j].id,
            weight: distance,
            type: 'walk'
          });

          edges[nodeList[j].id].push({
            to: nodeList[i].id,
            weight: distance,
            type: 'walk'
          });
        }
      }
    }
  }

  return { nodes, edges };
}

export function findNearestStop(point, nodes, maxDistance = 1000) {
  let nearest = null;
  let minDistance = Infinity;

  Object.values(nodes).forEach(node => {
    const distance = haversine(point, node);
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearest = { ...node, distance };
    }
  });

  return nearest;
}

export function findStopsInRadius(point, nodes, radius = 500) {
  return Object.values(nodes)
    .map(node => ({
      ...node,
      distance: haversine(point, node)
    }))
    .filter(node => node.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}
