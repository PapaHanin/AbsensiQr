import React, { useState, useEffect } from 'react';
import { SystemSettings, Teacher } from '../types';

interface DapodikAnnouncementModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
  settings: SystemSettings;
  currentTeacher?: Teacher | null;
  onUpdateSettings?: (newSettings: SystemSettings) => void;
  onNavigateToSettings?: () => void;
}

export const CURRENT_ANNOUNCEMENT_VERSION = 'v2.4.0_maroon_sticky';

export const DapodikAnnouncementModal: React.FC<DapodikAnnouncementModalProps> = ({
  isOpen,
  onClose,
  settings,
  currentTeacher,
  onUpdateSettings,
  onNavigateToSettings,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Admin edit form states
  const [editTitle, setEditTitle] = useState<string>(settings.announcementTitle || '');
  const [editContent, setEditContent] = useState<string>(settings.announcementContent || '');
  const [editDate, setEditDate] = useState<string>(settings.announcementDate || '3 September 2026');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  const isAdmin = currentTeacher?.role === 'admin';

  // Sync edit form with settings
  useEffect(() => {
    setEditTitle(settings.announcementTitle || '');
    setEditContent(settings.announcementContent || '');
    setEditDate(settings.announcementDate || '3 September 2026');
  }, [settings]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose(dontShowAgain);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, dontShowAgain]);

  if (!isOpen) return null;

  const currentVersion = settings.announcementVersion || CURRENT_ANNOUNCEMENT_VERSION;
  const releaseDate = settings.announcementDate || '3 September 2026';

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !onUpdateSettings) return;

    onUpdateSettings({
      ...settings,
      announcementTitle: editTitle.trim(),
      announcementContent: editContent.trim(),
      announcementDate: editDate.trim() || releaseDate,
    });

    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
      setIsEditing(false);
    }, 1200);
  };

  return (
    <div
      id="dapodik-announcement-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#032920] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#0d5947] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header - Official Style */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-[#02231c] text-white p-5 sm:p-6 relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs flex items-center justify-center text-white text-xl sm:text-2xl shadow-inner shrink-0">
                <i className="fa-solid fa-bullhorn animate-bounce"></i>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-900 shadow-2xs">
                    Pemberitahuan Sistem
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                    {currentVersion}
                  </span>

                  {/* Access Level Badge: Admin vs Guru */}
                  {isAdmin ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700/80 flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-shield-halved text-[9px]"></i>
                      Admin (Bisa Edit)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-200 border border-emerald-800 flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-lock text-[9px] text-amber-400"></i>
                      Guru (Hanya Melihat)
                    </span>
                  )}
                </div>

                <h2
                  id="announcement-title"
                  className="text-lg sm:text-xl font-extrabold leading-tight text-white tracking-tight"
                >
                  {settings.announcementTitle || 'Rilis Pembaruan & Penambahan Fitur Baru'}
                </h2>
                <p className="text-xs text-emerald-200/90 mt-1 flex items-center gap-2 flex-wrap">
                  <span>
                    <i className="fa-regular fa-building mr-1"></i>
                    {settings.schoolName || 'Sistem Absensi Sekolah'}
                  </span>
                  <span>•</span>
                  <span>
                    <i className="fa-regular fa-calendar-check mr-1"></i>
                    {releaseDate}
                  </span>
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              {isAdmin && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow-sm transition-all cursor-pointer"
                  title="Edit Judul dan Isi Pengumuman (Khusus Admin)"
                >
                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                  <span>Edit Teks</span>
                </button>
              )}

              {/* Quick Close 'X' Button */}
              <button
                type="button"
                onClick={() => onClose(dontShowAgain)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-all cursor-pointer shrink-0"
                title="Tutup Pemberitahuan"
                aria-label="Tutup"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 dark:text-emerald-100 text-xs sm:text-sm leading-relaxed">
          {/* Admin Inline Editor (Only accessible if logged in as Admin) */}
          {isAdmin && isEditing ? (
            <form onSubmit={handleSaveAnnouncement} className="p-4 rounded-2xl bg-amber-50/80 dark:bg-[#043328] border-2 border-amber-400/80 dark:border-amber-600/80 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-[#0d5947]">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-xs uppercase tracking-wide">
                  <i className="fa-solid fa-pen-to-square text-amber-600 dark:text-amber-400"></i>
                  <span>Form Pengeditan Pengumuman (Akses Administrator)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                  Khusus Admin
                </span>
              </div>

              {saveSuccessNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 border border-emerald-300 dark:border-emerald-800">
                  <i className="fa-solid fa-circle-check text-emerald-600"></i>
                  <span>Perubahan pengumuman berhasil disimpan ke sistem!</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-200 mb-1">
                  Judul Pengumuman Utama:
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Rilis Pembaruan & Fitur Baru Absensi QR"
                  className="w-full bg-white dark:bg-[#02231c] border border-amber-300 dark:border-[#0d6352] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-200 mb-1">
                  Tanggal Pengumuman / Rilis:
                </label>
                <input
                  type="text"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  placeholder="Contoh: 3 September 2026"
                  className="w-full bg-white dark:bg-[#02231c] border border-amber-300 dark:border-[#0d6352] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-emerald-200 mb-1">
                  Pesan / Pengumuman Khusus dari Sekolah (Opsional):
                </label>
                <textarea
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Tulis pesan khusus yang ingin disampaikan kepada para guru..."
                  className="w-full bg-white dark:bg-[#02231c] border border-amber-300 dark:border-[#0d6352] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#0d6352] text-slate-700 dark:text-emerald-200 hover:bg-slate-200 dark:hover:bg-[#064739] text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-floppy-disk text-xs"></i>
                  <span>Simpan Pengumuman</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* Locked Status Notice for Teachers / Non-admin */}
          {!isAdmin && (
            <div className="p-3 rounded-xl bg-[#032920] dark:bg-[#02231c] border border-[#0d5947] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center justify-center text-xs shrink-0">
                  <i className="fa-solid fa-lock text-amber-400"></i>
                </div>
                <div>
                  <p className="font-extrabold text-[11px] text-white">
                    Hak Akses Guru: Hanya Melihat
                  </p>
                  <p className="text-[10px] text-emerald-300/80">
                    Pengumuman ini dikunci untuk guru. Pengeditan hanya dapat dilakukan oleh akun Admin ({settings.headmasterName || 'Admin Sekolah'}).
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-900/90 text-emerald-200 shrink-0">
                Read Only
              </span>
            </div>
          )}

          {/* Official Greeting Note */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-[#043328] border border-amber-200/80 dark:border-[#0d5947] flex items-start gap-3">
            <i className="fa-solid fa-circle-info text-amber-600 dark:text-amber-400 text-base mt-0.5 shrink-0"></i>
            <div className="space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Kepada Yth. Bapak/Ibu Kepala Sekolah, Guru, Wali Kelas, dan Operator:
              </p>
              <p className="text-[12px] sm:text-xs text-amber-800/90 dark:text-amber-300/80">
                Sistem absensi sekolah telah diperbarui dengan penyempurnaan antarmuka, kenyamanan navigasi, dan optimalisasi kinerja pemindaian QR Code siswa.
              </p>
            </div>
          </div>

          {/* Custom School Announcement (if configured by school admin) */}
          {settings.announcementContent && settings.announcementContent.trim() !== '' && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#043328] border border-emerald-200 dark:border-[#0d5947] space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                <i className="fa-solid fa-bullhorn text-emerald-600 dark:text-emerald-400"></i>
                <span>Pesan Pengumuman Khusus dari Sekolah:</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-emerald-100 whitespace-pre-line leading-relaxed font-medium">
                {settings.announcementContent}
              </p>
            </div>
          )}

          {/* Detailed Update Highlights / Changelog */}
          <div className="space-y-2.5">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-emerald-300/70 flex items-center gap-1.5">
              <i className="fa-solid fa-sparkles text-emerald-600 dark:text-emerald-400"></i>
              <span>Daftar Pembaruan & Fitur Terbaru:</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Item 1 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#043328] border border-slate-200/80 dark:border-[#095243] flex items-start gap-3 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-[#085241] text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0 font-bold">
                  <i className="fa-solid fa-palette"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    1. Nuansa Tema Hijau Emerald Elegan
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-emerald-200/80 mt-0.5 leading-normal">
                    Latar belakang aplikasi dipercantik dengan warna hijau zamrud (emerald) alami yang sejuk, profesional, dan nyaman di mata serta kontras tinggi.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#043328] border border-slate-200/80 dark:border-[#095243] flex items-start gap-3 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-[#085241] text-indigo-700 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0 font-bold">
                  <i className="fa-solid fa-bars-staggered"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    2. Navigasi Samping Terkunci (Sticky Sidebar)
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-emerald-200/80 mt-0.5 leading-normal">
                    Panel navigasi samping kiri kini terkunci di tempatnya (tidak ikut bergeser/tergulung saat tabel data siswa di-scroll ke bawah).
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#043328] border border-slate-200/80 dark:border-[#095243] flex items-start gap-3 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-[#085241] text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0 font-bold">
                  <i className="fa-regular fa-clock"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    3. Bilah Atas Minimalis Jam Realtime & Mode Tema
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-emerald-200/80 mt-0.5 leading-normal">
                    Menampilkan Hari, Tanggal, dan Jam digital detik realtime (WIB), disertai tombol cepat mode gelap/terang tanpa gangguan tombol lain.
                  </p>
                </div>
              </div>

              {/* Item 4 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#043328] border border-slate-200/80 dark:border-[#095243] flex items-start gap-3 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-[#085241] text-amber-700 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0 font-bold">
                  <i className="fa-solid fa-signature"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    4. Tanda Tangan Otomatis Dokumen & Ekspor Laporan
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-emerald-200/80 mt-0.5 leading-normal">
                    Cetak PDF dan ekspor rekapitulasi kehadiran otomatis menyematkan tanda tangan serta NIP Kepala Sekolah dan Wali Kelas.
                  </p>
                </div>
              </div>

              {/* Item 5 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#043328] border border-slate-200/80 dark:border-[#095243] flex items-start gap-3 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-[#085241] text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs shrink-0 font-bold">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    5. Sinkronisasi Cloud Firestore & Penyimpanan Aman
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-emerald-200/80 mt-0.5 leading-normal">
                    Seluruh presensi dan kartu identitas siswa tersimpan aman di cloud Firebase serta dapat dicadangkan kapan saja.
                  </p>
                </div>
              </div>

              {/* Item 6 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#043328] border border-slate-200/80 dark:border-[#095243] flex items-start gap-3 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-[#06332d] text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs shrink-0 font-bold">
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    6. Transparansi & Identitas Guru Pengabsen
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-emerald-200/80 mt-0.5 leading-normal">
                    Setiap absensi mencatat nama guru yang bertugas mengabsen (Wali Kelas / Guru Mapel / Admin) secara transparan pada tabel dashboard dan berkas ekspor laporan, tanpa label generik &apos;Petugas Scanner&apos;.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Notice Box */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#02231c] border border-slate-200 dark:border-[#0d5947] text-[11px] text-slate-600 dark:text-emerald-200/80 space-y-1">
            <p className="font-bold text-slate-800 dark:text-emerald-200">
              <i className="fa-solid fa-circle-exclamation text-emerald-600 mr-1.5"></i>
              Petunjuk Navigasi:
            </p>
            <p>
              Pemberitahuan sistem ini dapat diakses kembali melalui bilah menu navigasi di sebelah kiri pada tombol{' '}
              <strong className="text-slate-900 dark:text-white">&quot;Pemberitahuan Sistem&quot;</strong>.
              {isAdmin ? (
                <span className="text-amber-700 dark:text-amber-300 font-semibold ml-1">
                  Sebagai Administrator, Anda dapat mengedit isi pengumuman ini kapan saja.
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold ml-1">
                  Sebagai Guru, pengumuman ini terkunci dalam mode baca saja.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Modal Footer with Checkbox and Close Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#02231c] border-t border-slate-200/90 dark:border-[#0d5947] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* 'Don't show again' checkbox */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-emerald-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 dark:focus:ring-emerald-500 cursor-pointer accent-emerald-700"
            />
            <span>Jangan tampilkan lagi pemberitahuan ini</span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Admin Edit button if not editing */}
            {isAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <i className="fa-solid fa-pen-to-square text-xs text-amber-600"></i>
                <span>Edit Pengumuman</span>
              </button>
            )}

            {/* Admin link to settings */}
            {isAdmin && onNavigateToSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose(dontShowAgain);
                  onNavigateToSettings();
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#0d6352] text-slate-700 dark:text-emerald-200 hover:bg-slate-200 dark:hover:bg-[#064739] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-sliders text-xs"></i>
                <span>Pengaturan Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onClose(dontShowAgain)}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold shadow-md shadow-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-check text-xs"></i>
              <span>Tutup & Mengerti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

