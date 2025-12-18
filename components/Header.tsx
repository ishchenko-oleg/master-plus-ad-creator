import React from 'react';
import { Film, Music, Layers, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
  return (
    <header className="w-full p-4 md:p-6 flex flex-col md:flex-row items-center justify-between border-b border-gray-200 dark:border-brand-800 bg-white/80 dark:bg-brand-900/50 backdrop-blur-sm sticky top-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Layers className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          <Film className="w-4 h-4 text-pink-500 dark:text-pink-400 absolute -bottom-1 -right-2" />
        </div>
        <div>
           <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-brand-600 to-pink-500 dark:from-brand-400 dark:to-pink-400 bg-clip-text text-transparent">
            Майстер Плюс AD
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-4 md:mt-0">
         <p className="hidden md:block text-gray-500 dark:text-gray-400 text-sm max-w-xs text-right">
          Створи свій відео-колаж. Додай фото, текст та музику.
        </p>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={isDarkMode ? "Включити світлу тему" : "Включити темну тему"}
        >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};