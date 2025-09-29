import React from 'react';
import { EasyStyleLogo, UserIcon, LogoutIcon, AdminIcon } from './icons';

interface HeaderProps {
    onBack?: () => void;
    showBackButton?: boolean;
    isLoggedIn?: boolean;
    onMyPage?: () => void;
    onLogout?: () => void;
    isAdmin?: boolean;
    onAdminClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBack, showBackButton, isLoggedIn, onMyPage, onLogout, isAdmin, onAdminClick }) => {
    return (
        <header className="bg-slate-800/50 backdrop-blur-sm p-4 sticky top-0 z-10 w-full max-w-lg mx-auto flex items-center justify-between">
            <div className="flex-1">
                {showBackButton && (
                    <button onClick={onBack} className="text-slate-200 p-2 -ml-2 rounded-full hover:bg-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
            </div>
            
            <div className="flex-1 flex justify-center">
                 <EasyStyleLogo />
            </div>

            <div className="flex-1 flex justify-end">
                 {isLoggedIn && (
                     <div className="flex items-center gap-2">
                         {isAdmin && (
                            <button onClick={onAdminClick} title="Admin" className="text-slate-200 p-2 rounded-full hover:bg-slate-700">
                                <AdminIcon className="h-6 w-6" />
                            </button>
                         )}
                         <button onClick={onMyPage} title="My Page" className="text-slate-200 p-2 rounded-full hover:bg-slate-700">
                             <UserIcon className="h-6 w-6" />
                         </button>
                         <button onClick={onLogout} title="Logout" className="text-slate-200 p-2 rounded-full hover:bg-slate-700">
                             <LogoutIcon className="h-6 w-6" />
                         </button>
                     </div>
                 )}
            </div>
        </header>
    );
};

export default Header;