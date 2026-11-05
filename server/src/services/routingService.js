const axios = require('axios');

class RoutingService {
  constructor() {
    this.osrmServer = 'https://router.project-osrm.org';
  }

  async getRouteGeometry(fromLat, fromLng, toLat, toLng) {
    try {
      const url = `${this.osrmServer}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`;
      const params = {
        overview: 'full',
        geometries: 'geojson',
        steps: false
      };

      const response = await axios.get(url, { params, timeout: 5000 });

      if (response.data.code === 'Ok' && response.data.routes && response.data.routes[0]) {
        const coordinates = response.data.routes[0].geometry.coordinates;
        return coordinates.map(coord => [coord[1], coord[0]]);
      }

      return [[fromLat, fromLng], [toLat, toLng]];
    } catch (error) {
      console.warn(`Routing failed for ${fromLat},${fromLng} -> ${toLat},${toLng}: ${error.message}`);
      return [[fromLat, fromLng], [toLat, toLng]];
    }
  }

  async getFullRouteGeometry(stops) {
    const segments = [];

    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];

      const geometry = await this.getRouteGeometry(from.lat, from.lng, to.lat, to.lng);
      segments.push(geometry);
    }

    return segments;
  }

  async getBatchRouteGeometry(stops) {
    if (stops.length < 2) return [];

    try {
      const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
      const url = `${this.osrmServer}/route/v1/driving/${coords}`;
      const params = {
        overview: 'full',
        geometries: 'geojson',
        steps: false
      };

      const response = await axios.get(url, { params, timeout: 10000 });

      if (response.data.code === 'Ok' && response.data.routes && response.data.routes[0]) {
        const coordinates = response.data.routes[0].geometry.coordinates;
        const geometry = coordinates.map(coord => [coord[1], coord[0]]);
        return this.splitGeometryIntoSegments(geometry, stops);
      }

      return this.straightLineSegments(stops);
    } catch (error) {
      console.warn(`Batch routing failed: ${error.message}`);
      return this.straightLineSegments(stops);
    }
  }

  splitGeometryIntoSegments(geometry, stops) {
    const segments = [];
    let currentSegment = [];
    let stopIndex = 0;

    for (const point of geometry) {
      currentSegment.push(point);

      if (stopIndex < stops.length - 1) {
        const nextStop = stops[stopIndex + 1];
        const distance = this.haversineDistance(
          point[0], point[1],
          nextStop.lat, nextStop.lng
        );

        if (distance < 0.05) {
          segments.push([...currentSegment]);
          currentSegment = [point];
          stopIndex++;
        }
      }
    }

    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }

    while (segments.length < stops.length - 1) {
      const i = segments.length;
      segments.push([[stops[i].lat, stops[i].lng], [stops[i + 1].lat, stops[i + 1].lng]]);
    }

    return segments;
  }

  straightLineSegments(stops) {
    const segments = [];
    for (let i = 0; i < stops.length - 1; i++) {
      segments.push([
        [stops[i].lat, stops[i].lng],
        [stops[i + 1].lat, stops[i + 1].lng]
      ]);
    }
    return segments;
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * Math.PI / 180;
  }
}

module.exports = new RoutingService();
