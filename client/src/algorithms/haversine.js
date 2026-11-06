export function haversine(a, b) {
  const banKinhTraiDat = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const chenhLat = ((b.lat - a.lat) * Math.PI) / 180;
  const chenhLng = ((b.lng - a.lng) * Math.PI) / 180;

  const x =
    Math.sin(chenhLat / 2) * Math.sin(chenhLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(chenhLng / 2) * Math.sin(chenhLng / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return banKinhTraiDat * y;
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
