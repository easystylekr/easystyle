
import React from 'react';

interface TagProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const Tag: React.FC<TagProps> = ({ label, isSelected, onClick }) => {
  const baseClasses = 'px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200';
  const selectedClasses = 'bg-amber-400 text-slate-900 shadow-md';
  const unselectedClasses = 'bg-slate-700 text-slate-300 hover:bg-slate-600';

  return (
    <button onClick={onClick} className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}>
      {label}
    </button>
  );
};

export default Tag;
