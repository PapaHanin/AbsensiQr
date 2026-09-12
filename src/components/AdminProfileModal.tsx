import React, { useState } from 'react';
import { Teacher, SystemSettings } from '../types';

interface AdminProfileModalProps {
  currentTeacher: Teacher;
  settings: SystemSettings;
  onUpdateTeacher: (updated: Teacher) => void;
  onUpdateSettings: (updated: SystemSettings) => void;
  onClose: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  currentTeacher,
  settings,
  onUpdateTeacher,
  onUpdateSettings,
  onClose,
}) => {
  // Admin Data Form
  const [name, setName] = useState(currentTeacher.name);
  const [nip, setNip] = useState(currentTeacher.nip || '');
  const [email, setEmail] = useState(currentTeacher.email);
  const [pin, setPin] = useState(currentTeacher.pin || '1234');
  const [subject, setSubject] = useState(currentTeacher.subject);

  // School & Headmaster Data Form (for official reports / signature)
  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [schoolAddress, setSchoolAddress] = useState(settings.schoolAddress);
  const [schoolCity, setSchoolCity] = useState(settings.schoolCity || 'Jakarta Selatan');
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [lateCutoffTime, setLateCutoffTime] = useState(settings.lateCutoffTime);
  const [headmasterName, setHeadmasterName] = useState(settings.headmasterName || 'Drs. H. Mulyadi, M.Pd');
  const [headmasterNip, setHeadmasterNip] = useState(settings.headmasterNip || '19680512 199403 1 005');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email.trim()) {
      setErrorMessage('Nama dan Email admin wajib diisi.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim() || '1234';

    // Update current admin profile
    onUpdateTeacher({
      ...currentTeacher,
      name: name.trim(),
      nip: nip.trim(),
      email: cleanEmail,
      pin: cleanPin,
      subject: subject.trim() || 'Administrator Sekolah',
    });

    // Update School Settings
    onUpdateSettings({
      ...settings,
      schoolName: schoolName.trim() || 'SD NEGERI INDONESIA',
      schoolAddress: schoolAddress.trim(),
      schoolCity: schoolCity.trim() || 'Jakarta',
      academicYear: academicYear.trim() || '2025/2026',
      lateCutoffTime,
      headmasterName: headmasterName.trim(),
      headmasterNip: headmasterNip.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl relative my-auto animate-scale-up flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Sticky Fixed Header with Clear, Uncut Close Button */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg font-bold shrink-0">
              <i className="fa-solid fa-user-gear"></i>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                Edit Profil Admin & Identitas Sekolah
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Ubah data profil Anda, PIN login admin, dan pengaturan sekolah.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            title="Tutup Jendela"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
            <span>Tutup</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Profil Pribadi Admin */}
          <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-amber-700"></i>
              <span>Profil Pribadi Administrator</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap Admin & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: MOH. FADLI"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  NIP Admin (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="contoh: 199903202025211020"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Login Admin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: admin@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  PIN Keamanan Login Admin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="contoh: 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold tracking-wider text-amber-800 focus:outline-none focus:border-indigo-500"
                  />
                  <i className="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jabatan / Bagian
                </label>
                <input
                  type="text"
                  placeholder="contoh: Kurikulum & Administrasi / Kepala Sekolah / IT"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Data Sekolah & Jadwal */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-school text-indigo-600"></i>
              <span>Identitas Sekolah & Batas Waktu Masuk</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Sekolah / Instansi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: SD NEGERI 1 INDONESIA"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kota / Kabupaten Sekolah
                </label>
                <input
                  type="text"
                  placeholder="contoh: Jakarta Selatan / Surabaya"
                  value={schoolCity}
                  onChange={(e) => setSchoolCity(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  placeholder="contoh: 2025/2026"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jam Batas Masuk (Presensi)
                </label>
                <input
                  type="time"
                  value={lateCutoffTime}
                  onChange={(e) => setLateCutoffTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alamat Sekolah
                </label>
                <input
                  type="text"
                  placeholder="contoh: Jl. Merdeka No. 10"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Data Kepala Sekolah untuk Tanda Tangan Laporan */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-file-signature text-indigo-700"></i>
              <span>Data Kepala Sekolah (Pengesahan Laporan PDF)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap Kepala Sekolah & Gelar
                </label>
                <input
                  type="text"
                  placeholder="contoh: Drs. H. Mulyadi, M.Pd"
                  value={headmasterName}
                  onChange={(e) => setHeadmasterName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  placeholder="contoh: 19680512 199403 1 005"
                  value={headmasterNip}
                  onChange={(e) => setHeadmasterNip(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-check"></i>
              <span>Simpan Profil Admin & Data Sekolah</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
