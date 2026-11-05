import { useEffect } from 'react';
import { useBusStore } from '../../store/busStore';

export default function IDSVisualizer() {
  const { idsResult, currentStep, setCurrentStep, isPlaying, setIsPlaying, playbackSpeed } = useBusStore();

  const steps = idsResult?.steps || [];
  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (!isPlaying || !idsResult || currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep(currentStep + 1);
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length, playbackSpeed]);

  if (!idsResult) {
    return null;
  }

  const handlePlayPause = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const getStepColor = (type) => {
    switch (type) {
      case 'START': return 'bg-blue-50 border-blue-400 text-blue-700';
      case 'NEW_DEPTH': return 'bg-yellow-50 border-yellow-400 text-yellow-700';
      case 'VISIT': return 'bg-blue-50 border-blue-300 text-blue-600';
      case 'EXPLORE_EDGE': return 'bg-purple-50 border-purple-300 text-purple-600';
      case 'FOUND': return 'bg-green-50 border-green-500 text-green-700';
      case 'BACKTRACK': return 'bg-gray-50 border-gray-300 text-gray-500';
      case 'DEPTH_LIMIT': return 'bg-orange-50 border-orange-400 text-orange-600';
      case 'SUCCESS': return 'bg-green-100 border-green-500 text-green-800';
      case 'FAILURE': return 'bg-red-50 border-red-400 text-red-700';
      default: return 'bg-gray-50 border-gray-300 text-gray-600';
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden max-h-[400px] flex flex-col">
      <div className="bg-primary text-white px-4 py-3">
        <h3 className="font-semibold flex items-center justify-between">
          <span>Các bước IDS</span>
          <span className="text-xs opacity-75">
            {currentStep + 1}/{steps.length}
          </span>
        </h3>
      </div>

      <div className="p-4 border-b">
        {currentStepData && (
          <div className={`p-3 rounded-lg border-l-4 ${getStepColor(currentStepData.type)}`}>
            <div className="text-sm font-medium">{currentStepData.type}</div>
            {currentStepData.message && (
              <div className="text-xs mt-1 break-words">{currentStepData.message}</div>
            )}
            {currentStepData.depth !== undefined && (
              <div className="text-xs mt-1">Độ sâu: {currentStepData.depth}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 max-h-[200px]">
        {steps.slice(0, currentStep + 1).reverse().slice(0, 10).map((step, idx) => {
          const actualIdx = currentStep - idx;
          return (
            <div
              key={actualIdx}
              className={`text-xs p-2 rounded border-l-2 ${getStepColor(step.type)} ${
                idx === 0 ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <span className="font-mono text-[10px] text-gray-400 mr-2">#{actualIdx + 1}</span>
              <span>{step.message || step.type}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            {isPlaying ? 'Tạm dừng' : 'Chạy'}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep >= steps.length - 1}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tiếp
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Đầu
          </button>
        </div>

        <div className="mt-3">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
