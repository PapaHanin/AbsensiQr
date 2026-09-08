import React from 'react';
import { ActiveTab, SystemSettings, Teacher, isSuperAdminEmail } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  todayCount: number;
  settings: SystemSettings;
  currentTeacher: Teacher | null;
  onOpenLogin: () => void;
  onLogout?: () => void;
  onOpenTeacherManage: () => void;
  onOpenCloudSync: () => void;
  onOpenAdminProfile?: () => void;
  onOpenGuide?: () => void;
  onOpenAnnouncement?: () => void;
  onOpenERaporSync?: () => void;
  onOpenSchoolManagement?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  todayCount,
  settings,
  currentTeacher,
  onOpenLogin,
  onLogout,
  onOpenTeacherManage,
  onOpenCloudSync,
  onOpenAdminProfile,
  onOpenGuide,
  onOpenAnnouncement,
  onOpenERaporSync,
  onOpenSchoolManagement,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard & Rekap',
      icon: 'fa-solid fa-chart-pie',
      badge: null,
    },
    {
      id: 'scanner' as ActiveTab,
      label: 'Scan QR Kamera',
      icon: 'fa-solid fa-camera',
      badge: 'LIVE',
      badgeClass: 'bg-rose-500 text-white animate-pulse',
    },
    {
      id: 'students' as ActiveTab,
      label: 'Data Siswa & Kartu',
      icon: 'fa-solid fa-id-card',
      badge: null,
    },
    {
      id: 'simulator' as ActiveTab,
      label: 'Pengaturan & Simulasi',
      icon: 'fa-solid fa-sliders',
      badge: null,
    },
  ];

  const handleSelectTab = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 sm:p-5 text-emerald-100">
      {/* Top: School Brand Identity */}
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#0d5947] dark:border-[#07382d]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-400/30 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-950/50 shrink-0">
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm leading-tight text-white truncate">
                {settings.schoolName || 'Sistem Absensi'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#085241] text-emerald-200 border border-[#137b62]">
                  TA {settings.academicYear}
                </span>
                <span className="text-[10px] text-emerald-300/70 truncate">
                  Presensi QR
                </span>
              </div>
            </div>
          </div>

          {/* Close button for Mobile Drawer */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-[#064536] transition-colors"
              title="Tutup Menu"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          )}
        </div>

        {/* Multi-School Switcher / Management Button (Khusus Super Admin fadli46046@gmail.com) */}
        {isSuperAdminEmail(currentTeacher?.email) && onOpenSchoolManagement && (
          <div className="pb-1">
            <button
              type="button"
              onClick={() => {
                onOpenSchoolManagement();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-amber-950/80 to-amber-900/60 hover:from-amber-900/90 hover:to-amber-850/80 text-amber-200 border border-amber-500/40 shadow-xs group cursor-pointer"
              title="Kelola Daftar Sekolah Pembeli & Sistem Multi-Sekolah"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs group-hover:scale-110 transition-transform shrink-0">
                  <i className="fa-solid fa-school-flag"></i>
                </div>
                <span className="truncate text-xs">Kelola Sekolah</span>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shadow-2xs shrink-0 uppercase tracking-wider">
                Super Admin
              </span>
            </button>
          </div>
        )}

        {/* Section: Menu Navigasi Utama */}
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/70 mb-2 px-3">
            Menu Navigasi
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-950/40 border border-emerald-400/30'
                        : 'text-emerald-200 hover:bg-[#064536] hover:text-white'
                    }`}
                  >
                  <div className="flex items-center gap-3">
                    <i
                      className={`${item.icon} text-sm w-4 text-center ${
                        isActive ? 'text-white' : 'text-emerald-300/70'
                      }`}
                    ></i>
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.id === 'dashboard' && todayCount > 0 && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-emerald-950/90 text-white'
                            : 'bg-[#064536] text-emerald-200 border border-[#0f6c56]'
                        }`}
                      >
                        {todayCount}
                      </span>
                    )}
                  </div>
                </button>
                {item.id === 'students' && onOpenERaporSync && (
                  <div className="pt-1 pb-0.5 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenERaporSync();
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/30 hover:border-emerald-400/50 shadow-xs group cursor-pointer"
                      title="Kirim Rekap Kehadiran Semester Siswa ke e-Rapor Merdeka (iihh Beres)"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform shrink-0">
                          <i className="fa-solid fa-cloud-arrow-up"></i>
                        </div>
                        <span className="truncate text-[11px]">Kirim Rekap ke e-Rapor</span>
                      </div>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                        e-Rapor
                      </span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          </nav>
        </div>

        {/* Section: Bantuan & Utilitas */}
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/70 mb-2 px-3">
            Utilitas & Panduan
          </div>
          <div className="space-y-1.5">
            {onOpenGuide && (
              <button
                type="button"
                onClick={() => {
                  onOpenGuide();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-mobile-screen-button text-emerald-400 text-sm w-4 text-center"></i>
                <span className="truncate">Panduan HP Guru</span>
              </button>
            )}

            {onOpenAnnouncement && (
              <button
                type="button"
                onClick={() => {
                  onOpenAnnouncement();
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  currentTeacher?.role === 'admin'
                    ? 'text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60'
                    : 'text-emerald-200 bg-[#064536]/80 hover:bg-[#0b5c49] border border-[#0f6c56]/70'
                }`}
                title={
                  currentTeacher?.role === 'admin'
                    ? 'Pemberitahuan Sistem (Mode Admin: Dapat Mengedit)'
                    : 'Pemberitahuan Sistem (Mode Guru: Hanya Melihat - Terkunci)'
                }
              >
                <div className="flex items-center gap-3 truncate">
                  <i
                    className={`fa-solid fa-bullhorn text-sm w-4 text-center shrink-0 ${
                      currentTeacher?.role === 'admin' ? 'text-amber-400' : 'text-emerald-300'
                    }`}
                  ></i>
                  <span className="truncate">Pemberitahuan Sistem</span>
                </div>
                {currentTeacher?.role === 'admin' ? (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 shrink-0 flex items-center gap-1">
                    <i className="fa-solid fa-pen-to-square text-[8px]"></i>
                    Admin
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 shrink-0 flex items-center gap-1">
                    <i className="fa-solid fa-lock text-[8px]"></i>
                    Lihat
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenCloudSync();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-200 bg-[#064536] hover:bg-[#0b5c49] border border-[#0f6c56] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-cloud-arrow-up text-emerald-400 text-sm w-4 text-center"></i>
              <span className="truncate">Cloud Sync & Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Data Guru & Profil Pengguna */}
      <div className="pt-4 border-t border-[#0d5947] dark:border-[#07382d] mt-6">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/70 mb-2 px-1">
          Data Guru / Pengguna
        </div>

        {currentTeacher ? (
          <div className="bg-[#053d30] dark:bg-[#02231c] border border-[#0f6954] dark:border-[#084234] rounded-2xl p-3 shadow-2xs">
            {/* Teacher Identity */}
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                  currentTeacher.role === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-emerald-600 text-white shadow-xs'
                }`}
              >
                <i
                  className={
                    currentTeacher.role === 'admin'
                      ? 'fa-solid fa-shield-halved text-xs'
                      : 'fa-solid fa-user-tie text-xs'
                  }
                ></i>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-xs text-white truncate" title={currentTeacher.name}>
                  {currentTeacher.name}
                </div>
                <div className="text-[10px] text-emerald-300/70 truncate">
                  {currentTeacher.email || 'Guru Terdaftar'}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span
                    className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md ${
                      currentTeacher.role === 'admin'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : currentTeacher.homeroomClass
                        ? 'bg-[#0b5c49] text-emerald-200 border border-[#137b62]'
                        : 'bg-[#064536] text-emerald-300'
                    }`}
                  >
                    {currentTeacher.role === 'admin'
                      ? 'Admin Utama'
                      : currentTeacher.homeroomClass
                      ? `Wali Kelas ${currentTeacher.homeroomClass}`
                      : currentTeacher.subject || 'Guru Mapel'}
                  </span>
                  {currentTeacher.nip && (
                    <span className="text-[9px] text-emerald-300/70 font-mono">
                      NIP: {currentTeacher.nip}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions for Teacher / Admin */}
            <div className="mt-3 pt-2.5 border-t border-[#0d5947]/70 dark:border-[#07382d] space-y-1">
              {currentTeacher.role === 'admin' && onOpenAdminProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAdminProfile();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#064536] text-[11px] font-medium text-emerald-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-school text-emerald-400 text-xs w-4"></i>
                  <span>Edit Profil Sekolah</span>
                </button>
              )}

              {currentTeacher.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenTeacherManage();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#064536] text-[11px] font-medium text-emerald-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-users-gear text-emerald-400 text-xs w-4"></i>
                  <span>Kelola Akun Guru</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else {
                    onOpenLogin();
                  }
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-950/80 text-[11px] font-semibold text-emerald-300 hover:text-emerald-100 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-right-from-bracket text-xs w-4"></i>
                <span>Keluar (Logout)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#053d30] dark:bg-[#02231c] border border-[#0f6954] dark:border-[#084234] rounded-2xl p-3 text-center">
            <div className="w-8 h-8 mx-auto mb-1.5 rounded-full bg-[#064536] flex items-center justify-center text-emerald-300 text-xs">
              <i className="fa-solid fa-user-lock"></i>
            </div>
            <p className="text-xs font-bold text-white">Belum Masuk Akun Guru</p>
            <p className="text-[10px] text-emerald-300/70 mt-0.5 mb-2.5">
              Masuk untuk tanda tangan otomatis & izin khusus
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenLogin();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-right-to-bracket text-xs"></i>
              <span>Login Akun Guru</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Locked Sidebar (Fixed / Sticky to Viewport so it doesn't scroll with content) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 shrink-0 bg-[#043328] dark:bg-[#011a14] border-r border-[#0d5947] dark:border-[#07382d] z-30 select-none overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Overlay (Off-canvas sidebar when opened via mobile hamburger button) */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          ></div>

          {/* Drawer Panel */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-[#043328] dark:bg-[#011a14] border-r border-[#0d5947] z-50 overflow-y-auto shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* 3. Mobile Sticky Bottom Navigation Bar (for convenient quick navigation on mobile phones) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#043328]/95 dark:bg-[#011a14]/95 backdrop-blur-md border-t border-[#0d5947] z-40 px-2 py-1.5 shadow-lg">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#085241] text-white border border-[#137b62] font-bold shadow-xs'
                    : 'text-emerald-300/70 hover:text-white'
                }`}
              >
                <i className={`${item.icon} text-sm mb-0.5 ${isActive ? 'text-white' : 'text-emerald-400'}`}></i>
                <span className="text-[10px] truncate max-w-full">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
