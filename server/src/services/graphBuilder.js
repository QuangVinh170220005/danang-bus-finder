const busDataService = require('./busDataService');

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const WALK_RADIUS_METERS = 500;

class GraphBuilder {
  async buildGraph() {
    const routes = await busDataService.getAllRoutes();
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
          const distance = haversine(from.lat, from.lng, to.lat, to.lng);

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
        const distance = haversine(
          nodeList[i].lat,
          nodeList[i].lng,
          nodeList[j].lat,
          nodeList[j].lng
        );

        if (distance <= WALK_RADIUS_METERS) {
          const hasDirectBus = edges[nodeList[i].id].some(
            e => e.to === nodeList[j].id && e.type === 'bus'
          );

          if (!hasDirectBus) {
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

    console.log(`Graph: ${Object.keys(nodes).length} nodes`);

    return { nodes, edges };
  }
}

module.exports = new GraphBuilder();
