
import React from 'react';

interface SpinnerProps {
  message: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-50">
      <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-100 text-lg font-medium">{message}</p>
    </div>
  );
};

export default Spinner;
