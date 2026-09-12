import React, { useState, useEffect } from 'react';

interface HeaderProps {
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onToggleMobileSidebar?: () => void;
  currentSchoolName?: string;
  onShareLink?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode = false,
  onToggleDarkMode,
  onToggleMobileSidebar,
  currentSchoolName = 'SD INPRES 2 ULATAN',
  onShareLink,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="bg-[#043328]/95 dark:bg-[#011a14]/95 backdrop-blur-md border-b border-[#0d5947] dark:border-[#084234] sticky top-0 z-20 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Sidebar Toggle + Live Date & Time */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Toggle (hidden on desktop) */}
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-emerald-200 bg-[#064536] dark:bg-[#032920] hover:bg-[#0b5c49] dark:hover:bg-[#084234] border border-[#0f6c56] transition-colors cursor-pointer shrink-0"
              title="Buka Navigasi Menu"
              aria-label="Toggle navigation"
            >
              <i className="fa-solid fa-bars text-sm"></i>
            </button>
          )}

          {/* Date & Time Display */}
          <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-xl bg-[#064536] dark:bg-[#032920] border border-[#0f6c56] dark:border-[#084234] text-xs sm:text-sm text-emerald-100 font-medium shadow-2xs shrink-0">
            <i className="fa-regular fa-calendar-days text-emerald-400 text-xs"></i>
            <span className="font-semibold text-white hidden sm:inline">{formattedDate}</span>
            <span className="text-emerald-300/40 hidden sm:inline">•</span>
            <span className="font-mono font-bold text-emerald-200">
              {formattedTime} <span className="text-[10px] font-normal text-emerald-300/70">WIB</span>
            </span>
          </div>
        </div>

        {/* Right: Active School Pill + Share Link + Dark/Light Toggle */}
        <div className="flex items-center gap-2">
          {onShareLink && (
            <button
              type="button"
              onClick={onShareLink}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
              title="Bagikan tautan aplikasi ke rekan guru (otomatis logout untuk melindungi data admin)"
            >
              <i className="fa-solid fa-share-nodes text-xs"></i>
              <span className="hidden md:inline">Bagikan Link Guru</span>
            </button>
          )}

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#064536] dark:bg-[#032920] border border-[#0f6c56] dark:border-[#084234] text-xs text-emerald-100 shadow-2xs max-w-[180px] sm:max-w-[300px]"
            title={`Sekolah: ${currentSchoolName}`}
          >
            <i className="fa-solid fa-school text-emerald-400 text-xs shrink-0"></i>
            <span className="font-bold text-white truncate text-[11px] sm:text-xs">
              {currentSchoolName}
            </span>
          </div>

          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-sm font-bold text-amber-300 bg-[#064536] hover:bg-[#0b5c49] dark:bg-[#032920] dark:hover:bg-[#084234] border border-[#0f6c56] dark:border-[#084234] transition-all cursor-pointer shadow-2xs shrink-0"
              title={isDarkMode ? 'Ganti ke Mode Terang (Emerald Green)' : 'Ganti ke Mode Gelap (Dark Forest Green)'}
              aria-label="Toggle Dark Mode"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun text-amber-400 text-base' : 'fa-moon text-emerald-200 text-base'}`}></i>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
