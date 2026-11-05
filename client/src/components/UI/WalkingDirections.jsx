import { useMemo } from 'react';
import { useBusStore } from '../../store/busStore';
import { generateWalkingDirections, formatTime } from '../../utils/walkingDirections';
import { formatDistance } from '../../algorithms/haversine';

export default function WalkingDirections() {
  const { from, to, idsResult } = useBusStore();

  const walkingInfo = useMemo(() => {
    if (!from || !idsResult?.found || !idsResult.startStop) {
      return null;
    }

    const toStart = generateWalkingDirections(
      from,
      { lat: idsResult.startStop.lat, lng: idsResult.startStop.lng },
      "Vị trí hiện tại",
      idsResult.startStop.name
    );

    const fromEnd = to && idsResult.endStop ? generateWalkingDirections(
      { lat: idsResult.endStop.lat, lng: idsResult.endStop.lng },
      to,
      idsResult.endStop.name,
      "Điểm đích"
    ) : null;

    return { toStart, fromEnd };
  }, [from, to, idsResult]);

  if (!walkingInfo) {
    return null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="text-lg font-bold text-gray-800 mb-3">
        Đi bộ
      </h3>

      <div className="mb-4 pb-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700 text-sm">
            Tới trạm đi
          </span>
          <span className="text-xs text-gray-500">
            {walkingInfo.toStart.time} phút
          </span>
        </div>

        <div className="space-y-2">
          {walkingInfo.toStart.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="text-gray-700">{step.instruction}</div>
                {step.distance > 0 && (
                  <div className="text-xs text-gray-500">
                    {formatDistance(step.distance)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700 font-medium">
          {walkingInfo.toStart.summary}
        </div>
      </div>

      {walkingInfo.fromEnd && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700 text-sm">
              Từ trạm đến
            </span>
            <span className="text-xs text-gray-500">
              {walkingInfo.fromEnd.time} phút
            </span>
          </div>

          <div className="space-y-2">
            {walkingInfo.fromEnd.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-gray-700">{step.instruction}</div>
                  {step.distance > 0 && (
                    <div className="text-xs text-gray-500">
                      {formatDistance(step.distance)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium">
            {walkingInfo.fromEnd.summary}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700">Ước tính cả đi xe</span>
          <span className="font-bold text-primary">
            {formatTime(
              walkingInfo.toStart.time +
              (walkingInfo.fromEnd?.time || 0) +
              (idsResult.path?.length || 0) * 2
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
