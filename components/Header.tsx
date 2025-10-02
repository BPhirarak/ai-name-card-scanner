
import React from 'react';
import { clearCurrentUser } from '../services/authService';

const CardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

interface HeaderProps {
    activeView: 'add' | 'list';
    setView: (view: 'add' | 'list') => void;
    currentUser: string;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setView, currentUser, onLogout }) => {
    const navButtonClasses = (view: 'add' | 'list') =>
        `px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${activeView === view
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`;

    const handleLogout = () => {
        if (confirm('ต้องการออกจากระบบหรือไม่?')) {
            clearCurrentUser();
            onLogout();
        }
    };

    return (
        <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center gap-2 text-xl font-bold text-blue-600 dark:text-blue-400">
                           <CardIcon />
                           <span className="hidden sm:inline">AI Name Card Scanner</span>
                           <span className="sm:hidden">Scanner</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <button onClick={() => setView('add')} className={navButtonClasses('add')}>
                            Add Card
                        </button>
                        <button onClick={() => setView('list')} className={navButtonClasses('list')}>
                            Card List
                        </button>
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                            <UserIcon />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{currentUser}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                            title="ออกจากระบบ"
                        >
                            <LogoutIcon />
                            <span className="hidden sm:inline">ออกจากระบบ</span>
                        </button>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
