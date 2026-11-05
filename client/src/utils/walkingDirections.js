import { haversine, formatDistance, estimateWalkingTime } from '../algorithms/haversine';

export function generateWalkingDirections(from, to, fromName = "Vị trí hiện tại", toName = "Trạm xe buýt") {
  const distance = haversine(from, to);
  const time = estimateWalkingTime(distance);

  const bearing = calculateBearing(from.lat, from.lng, to.lat, to.lng);
  const direction = getDirectionFromBearing(bearing);

  return {
    distance,
    time,
    steps: [
      {
        instruction: `Xuất phát từ ${fromName}`,
        distance: 0,
        direction: 'start'
      },
      {
        instruction: `Đi về hướng ${direction}`,
        distance: Math.round(distance * 0.3),
        direction
      },
      {
        instruction: `Tiếp tục đi thẳng`,
        distance: Math.round(distance * 0.5),
        direction: 'straight'
      },
      {
        instruction: `Đến ${toName} bên ${bearing > 180 ? 'trái' : 'phải'}`,
        distance: Math.round(distance * 0.2),
        direction: 'arrive'
      }
    ],
    summary: `Đi bộ ${formatDistance(distance)}, khoảng ${time} phút`
  };
}

function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
}

function getDirectionFromBearing(bearing) {
  const directions = [
    { name: 'Bắc', min: 337.5, max: 22.5 },
    { name: 'Đông Bắc', min: 22.5, max: 67.5 },
    { name: 'Đông', min: 67.5, max: 112.5 },
    { name: 'Đông Nam', min: 112.5, max: 157.5 },
    { name: 'Nam', min: 157.5, max: 202.5 },
    { name: 'Tây Nam', min: 202.5, max: 247.5 },
    { name: 'Tây', min: 247.5, max: 292.5 },
    { name: 'Tây Bắc', min: 292.5, max: 337.5 }
  ];

  for (const dir of directions) {
    if (bearing >= dir.min && bearing < dir.max) {
      return dir.name;
    }
  }

  return 'Bắc';
}

export function formatTime(minutes) {
  if (minutes < 1) {
    return 'dưới 1 phút';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours} giờ ${mins} phút`;
}
