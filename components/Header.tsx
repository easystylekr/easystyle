
import React from 'react';
import { EasyStyleLogo } from './icons';

interface HeaderProps {
    onBack?: () => void;
    showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onBack, showBackButton }) => {
    return (
        <header className="bg-slate-800/50 backdrop-blur-sm p-4 sticky top-0 z-10 w-full max-w-lg mx-auto flex items-center">
            {showBackButton && (
                <button onClick={onBack} className="text-slate-200 p-2 -ml-2 rounded-full hover:bg-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}
            <div className={`mx-auto ${showBackButton ? 'pr-8' : ''}`}>
                 <EasyStyleLogo />
            </div>
        </header>
    );
};

export default Header;
