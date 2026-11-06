import { useEffect } from 'react';
import { useBusStore } from '../../store/busStore';
import { gomCacLan } from '../../algorithms/ids';

export default function IDSVisualizer() {
  const { idsResult, currentStep, setCurrentStep, isPlaying, setIsPlaying } = useBusStore();
  const cacLan = gomCacLan(idsResult?.steps || []);
  const lan = cacLan[currentStep];

  useEffect(() => {
    if (!isPlaying || cacLan.length === 0 || currentStep >= cacLan.length - 1) {
      if (isPlaying) setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep(currentStep + 1);
    }, 1400);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, cacLan.length]);

  if (!idsResult || cacLan.length === 0) return null;

  function bamChay() {
    if (currentStep >= cacLan.length - 1) setCurrentStep(0);
    setIsPlaying(!isPlaying);
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden w-full flex flex-col">
      <div className="bg-primary text-white px-4 py-3">
        <h3 className="font-semibold flex items-center justify-between">
          <span>IDS thử từng lần</span>
          <span className="text-xs opacity-75">{currentStep + 1}/{cacLan.length}</span>
        </h3>
      </div>

      <div className="p-4">
        {lan && (
          <>
            <p className="text-sm font-medium text-gray-800">{lan.tieuDe}</p>
            <p className="text-sm text-gray-600 mt-1">{lan.giaiThich}</p>
            {lan.nut.length > 0 && (
              <ol className="mt-3 text-sm text-gray-800 space-y-1 list-decimal pl-4">
                {lan.nut.map((nut) => (
                  <li key={nut.nodeId}>{nut.ten}</li>
                ))}
              </ol>
            )}
            {lan.loai === 'thu' && (
              <p className="text-xs text-gray-500 mt-3">Chấm tím trên bản đồ đánh số đúng danh sách này, và đứng yên trong suốt lần thử.</p>
            )}
          </>
        )}
      </div>

      <div className="border-t p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <button onClick={bamChay} className="flex-1 bg-primary text-white px-4 py-2 rounded-lg">
            {isPlaying ? 'Tạm dừng' : 'Chạy'}
          </button>
          <button
            onClick={() => currentStep < cacLan.length - 1 && setCurrentStep(currentStep + 1)}
            disabled={currentStep >= cacLan.length - 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Tiếp
          </button>
          <button
            onClick={() => {
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            Đầu
          </button>
        </div>
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${((currentStep + 1) / cacLan.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
