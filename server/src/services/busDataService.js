const fs = require('fs').promises;
const path = require('path');

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

class BusDataService {
  constructor() {
    this.routes = null;
    this.stops = null;
    this.dataPath = path.join(__dirname, '../data');
  }

  async loadRoutes() {
    if (this.routes) return this.routes;

    try {
      const scrapedPath = path.join(this.dataPath, 'danang-bus-routes.json');
      const data = await fs.readFile(scrapedPath, 'utf8');
      this.routes = JSON.parse(data);
      console.log(`Loaded ${this.routes.length} routes`);
    } catch (error) {
      console.log('Route file missing, using sample data');
      const samplePath = path.join(this.dataPath, 'sample-danang-routes.json');
      const data = await fs.readFile(samplePath, 'utf8');
      this.routes = JSON.parse(data);
      console.log(`Loaded ${this.routes.length} sample routes`);
    }

    return this.routes;
  }

  async loadStops() {
    if (this.stops) return this.stops;

    try {
      const stopsPath = path.join(this.dataPath, 'danang-bus-stops.json');
      const data = await fs.readFile(stopsPath, 'utf8');
      this.stops = JSON.parse(data);
      console.log(`Loaded ${this.stops.length} stops`);
    } catch (error) {
      const routes = await this.loadRoutes();
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

      this.stops = Array.from(stopMap.values());
      console.log(`Built ${this.stops.length} stops from routes`);
    }

    return this.stops;
  }

  async getAllRoutes() {
    return await this.loadRoutes();
  }

  async getRouteById(routeId) {
    const routes = await this.loadRoutes();
    return routes.find(r => r.id === routeId);
  }

  async getAllStops() {
    return await this.loadStops();
  }

  async findNearbyStops(lat, lng, radius = 500) {
    const stops = await this.loadStops();

    return stops
      .map(stop => ({
        ...stop,
        distance: haversine(lat, lng, stop.lat, stop.lng)
      }))
      .filter(stop => stop.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  findNearbyStopsSync(lat, lng, radius = 500) {
    if (!this.stops) {
      throw new Error('Stops not loaded. Call loadStops() first.');
    }

    return this.stops
      .map(stop => ({
        ...stop,
        distance: haversine(lat, lng, stop.lat, stop.lng)
      }))
      .filter(stop => stop.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }
}

module.exports = new BusDataService();
