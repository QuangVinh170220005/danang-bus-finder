const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

async function fetchDanangBusRoutes() {
  const query = `
    [out:json][timeout:25];
    area["name:en"="Da Nang"]["admin_level"="4"]->.searchArea;
    (
      relation["route"="bus"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    console.log('Fetching bus routes from OpenStreetMap');
    const response = await axios.post(OVERPASS_API, query, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  } catch (error) {
    console.error('OSM request failed:', error.message);
    throw error;
  }
}

function parseOSMData(osmData) {
  const nodes = {};
  const routes = [];

  osmData.elements
    .filter(el => el.type === 'node')
    .forEach(node => {
      nodes[node.id] = {
        id: node.id,
        lat: node.lat,
        lon: node.lon,
        tags: node.tags || {}
      };
    });

  osmData.elements
    .filter(el => el.type === 'relation' && el.tags?.route === 'bus')
    .forEach(relation => {
      const routeData = {
        id: relation.tags.ref || relation.id,
        name: relation.tags.name || `Tuyến ${relation.tags.ref}`,
        operator: relation.tags.operator || 'DATRAMACO',
        from: relation.tags.from || '',
        to: relation.tags.to || '',
        stops: []
      };

      relation.members
        .filter(m => m.role === 'stop' || m.role === 'platform')
        .forEach(member => {
          const node = nodes[member.ref];
          if (node) {
            routeData.stops.push({
              id: node.id.toString(),
              name: node.tags.name || `Trạm ${node.id}`,
              lat: node.lat,
              lng: node.lon
            });
          }
        });

      if (routeData.stops.length > 0) {
        routes.push(routeData);
      }
    });

  return routes;
}

async function main() {
  try {
    const osmData = await fetchDanangBusRoutes();
    console.log(`Fetched ${osmData.elements.length} OSM elements`);

    const routes = parseOSMData(osmData);
    console.log(`Parsed ${routes.length} routes`);

    routes.forEach(route => {
      console.log(`Route ${route.id}: ${route.name} (${route.stops.length} stops)`);
    });

    const outputPath = path.join(__dirname, '../data/danang-bus-routes.json');
    await fs.writeFile(outputPath, JSON.stringify(routes, null, 2), 'utf8');
    console.log(`Wrote ${outputPath}`);

    const stopMap = new Map();

    routes.forEach(route => {
      route.stops.forEach(stop => {
        if (!stopMap.has(stop.id)) {
          stopMap.set(stop.id, {
            ...stop,
            routes: [route.id]
          });
        } else {
          stopMap.get(stop.id).routes.push(route.id);
        }
      });
    });

    const allStops = Array.from(stopMap.values());
    const stopsOutputPath = path.join(__dirname, '../data/danang-bus-stops.json');
    await fs.writeFile(stopsOutputPath, JSON.stringify(allStops, null, 2), 'utf8');
    console.log(`Wrote ${allStops.length} stops to ${stopsOutputPath}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchDanangBusRoutes, parseOSMData };
