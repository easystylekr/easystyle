import React from 'react';

interface ProgressIndicatorProps {
  progress: number;
  stage: string;
  showPercentage?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  stage,
  showPercentage = true
}) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-2 flex justify-between items-center">
        <span className="text-sm text-slate-300 font-medium">
          {stage}
        </span>
        {showPercentage && (
          <span className="text-sm text-amber-400 font-mono">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            transform: progress > 0 ? 'translateX(0)' : 'translateX(-100%)'
          }}
        >
          {/* 애니메이션 효과 */}
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-center justify-center space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                progress > 0
                  ? 'bg-amber-400 animate-bounce'
                  : 'bg-slate-600'
              }`}
              style={{
                animationDelay: `${i * 0.2}s`,
                opacity: progress > 0 ? 1 : 0.3
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;