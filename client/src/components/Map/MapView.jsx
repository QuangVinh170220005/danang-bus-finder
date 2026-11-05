import { useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import { useBusStore } from '../../store/busStore';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const busStopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

export default function MapView() {
  const { routes, from, to, idsResult } = useBusStore();
  const mapRef = useRef();
  const [mapStyle, setMapStyle] = useState('vietmapStreet');

  const defaultCenter = [16.0544, 108.2022];
  const vietmapApiKey = import.meta.env.VITE_VIETMAP_API_KEY;

  const tileProviders = {
    vietmap: {
      name: 'VietMap',
      url: `https://maps.vietmap.vn/api/maps/light/styles.json?apikey=${vietmapApiKey}`,
      rasterUrl: `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${vietmapApiKey}`,
      attribution: '&copy; <a href="https://vietmap.vn">VietMap</a>'
    },
    vietmapStreet: {
      name: 'VietMap đường phố',
      url: `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${vietmapApiKey}`,
      attribution: '&copy; <a href="https://vietmap.vn">VietMap</a>'
    },
    osm: {
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    carto: {
      name: 'Carto sáng',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    cartoDark: {
      name: 'Carto tối',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    esri: {
      name: 'Esri',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri'
    }
  };

  const currentTile = tileProviders[mapStyle];
  const tileUrl = currentTile.rasterUrl || currentTile.url;

  const routePath = idsResult?.found && idsResult.pathDetails
    ? idsResult.pathDetails.map(detail => [detail.from.lat, detail.from.lng])
    : [];

  if (routePath.length > 0 && idsResult.pathDetails) {
    const lastDetail = idsResult.pathDetails[idsResult.pathDetails.length - 1];
    routePath.push([lastDetail.to.lat, lastDetail.to.lng]);
  }

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2">
        <select
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value)}
          className="text-sm border-none focus:ring-2 focus:ring-primary rounded"
        >
          {Object.entries(tileProviders).map(([key, provider]) => (
            <option key={key} value={key}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="w-full h-full"
        ref={mapRef}
        style={{ background: '#f0f0f0' }}
      >
        <TileLayer
          attribution={currentTile.attribution}
          url={tileUrl}
          maxZoom={19}
          subdomains={['a', 'b', 'c']}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />

        {routes.map((route) =>
          route.stops.map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={busStopIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{stop.name}</strong>
                  <br />
                  <span className="text-xs text-gray-600">Tuyến {route.id}</span>
                </div>
              </Popup>
            </Marker>
          ))
        )}

        {from && (
          <>
            <Marker position={[from.lat, from.lng]} icon={startIcon}>
              <Popup>
                <strong>Điểm đi</strong>
              </Popup>
            </Marker>
            <Circle
              center={[from.lat, from.lng]}
              radius={500}
              pathOptions={{ color: 'green', fillOpacity: 0.1 }}
            />
          </>
        )}

        {to && (
          <>
            <Marker position={[to.lat, to.lng]} icon={endIcon}>
              <Popup>
                <strong>Điểm đến</strong>
              </Popup>
            </Marker>
            <Circle
              center={[to.lat, to.lng]}
              radius={500}
              pathOptions={{ color: 'red', fillOpacity: 0.1 }}
            />
          </>
        )}

        {routePath.length > 0 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: '#1a73e8',
              weight: 4,
              opacity: 0.8
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
