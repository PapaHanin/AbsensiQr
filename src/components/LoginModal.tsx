import React, { useState, useEffect, useId } from 'react';
import { Teacher, School } from '../types';

interface LoginModalProps {
  teachers: Teacher[];
  currentTeacher: Teacher | null;
  onLogin: (teacher: Teacher) => void;
  onClose?: () => void;
  canClose?: boolean;
  schools?: School[];
  currentSchoolId?: string;
  onUpdateTeacherPin?: (teacherId: string, newPin: string) => Promise<void> | void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  teachers,
  onLogin,
  onClose,
  canClose = false,
  schools = [],
  currentSchoolId,
}) => {
  const modalId = useId();

  // Login Form States (Always initialize completely blank to prevent auto-fill)
  const [emailInput, setEmailInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset inputs when modal renders to ensure clean state
  useEffect(() => {
    setEmailInput('');
    setPinInput('');
    setErrorMsg('');
    setSuccessMsg('');
  }, []);

  // Forgot PIN States
  const [isForgotPinMode, setIsForgotPinMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [matchedTeacher, setMatchedTeacher] = useState<Teacher | null>(null);
  const [matchedSchool, setMatchedSchool] = useState<School | null>(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);

  // Switch to Forgot PIN mode
  const handleOpenForgotPin = (prefillEmail?: string) => {
    setIsForgotPinMode(true);
    setForgotErrorMsg('');
    const emailToUse = (prefillEmail || emailInput).trim();
    if (emailToUse) {
      setForgotEmail(emailToUse);
      lookupTeacherAccount(emailToUse);
    }
  };

  // Switch back to Login Mode
  const handleBackToLogin = () => {
    setIsForgotPinMode(false);
    setForgotErrorMsg('');
    setErrorMsg('');
  };

  // Lookup Teacher Account by Email
  const lookupTeacherAccount = (inputEmail: string) => {
    setForgotErrorMsg('');
    const cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setForgotErrorMsg('Masukkan alamat email yang terdaftar.');
      return;
    }

    const found = teachers.find((t) => t.email.toLowerCase() === cleanEmail);
    if (!found) {
      setMatchedTeacher(null);
      setMatchedSchool(null);
      setForgotErrorMsg(`Email "${cleanEmail}" tidak terdaftar pada sekolah ini. Pastikan penulisan sudah benar atau tanyakan ke Admin.`);
      return;
    }

    setMatchedTeacher(found);
    const targetSchool = schools.find((s) => s.id === (found.schoolId || currentSchoolId)) || null;
    setMatchedSchool(targetSchool);
  };

  // Normal Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPin = pinInput.trim();

    if (!cleanEmail) {
      setErrorMsg('Masukkan alamat email terdaftar Anda.');
      return;
    }

    if (!cleanPin) {
      setErrorMsg('Masukkan PIN keamanan guru yang diberikan oleh Admin.');
      return;
    }

    // Match teacher by email within current active school
    const found = teachers.find((t) => t.email.toLowerCase() === cleanEmail);
    if (!found) {
      setErrorMsg(`Email "${cleanEmail}" tidak terdaftar. Hubungi Admin Sekolah Anda.`);
      return;
    }

    // Verify PIN: strictly match the registered teacher's pin
    const expectedPin = (found.pin && found.pin.trim()) || '1234';
    if (cleanPin !== expectedPin) {
      setErrorMsg('PIN yang Anda masukkan salah. Hubungi Admin jika Anda lupa PIN akun Anda.');
      return;
    }

    onLogin(found);
  };

  // WhatsApp Message Generator for Teacher Help
  const generateWhatsAppMessage = () => {
    const schoolName = matchedSchool?.name || 'SD INPRES 2 ULATAN';
    const teacherName = matchedTeacher?.name || 'Guru';
    const teacherEmail = matchedTeacher?.email || forgotEmail;
    const nipInfo = matchedTeacher?.nip ? ` (NIP: ${matchedTeacher.nip})` : '';

    return `Halo Admin/Kepala Sekolah *${schoolName}*,\n\nSaya *${teacherName}*${nipInfo}\nEmail: ${teacherEmail}\n\nSaya memerlukan informasi/reset PIN untuk login ke Aplikasi Presensi Siswa. Mohon bantuannya.\n\nTerima kasih.`;
  };

  const handleOpenWhatsAppAdmin = () => {
    const message = generateWhatsAppMessage();
    let phone = (matchedSchool?.contactPhone || '').trim().replace(/[^0-9]/g, '');

    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    if (phone.length >= 8) {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(message);
      setCopiedWhatsAppText(true);
      setTimeout(() => setCopiedWhatsAppText(false), 4000);
    }
  };

  const handleCopyWhatsAppText = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopiedWhatsAppText(true);
    setTimeout(() => setCopiedWhatsAppText(false), 4000);
  };

  return (
    <div
      id={`login-modal-overlay-${modalId}`}
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id={`login-modal-content-${modalId}`}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative animate-scale-up my-auto transition-colors"
      >
        {canClose && onClose && (
          <button
            id={`login-modal-close-btn-${modalId}`}
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-500 text-slate-500 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            title="Tutup"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
            <span>Tutup</span>
          </button>
        )}

        {/* =========================================================================
            VIEW 1: NORMAL LOGIN FORM (MANUAL INPUT ONLY - NO AUTOFILL / DROPDOWN)
           ========================================================================= */}
        {!isForgotPinMode ? (
          <div>
            <div className="text-center space-y-2 mb-6 mt-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-500 dark:to-indigo-700 text-white flex items-center justify-center mx-auto text-2xl font-bold shadow-md shadow-indigo-600/20 ring-4 ring-indigo-50 dark:ring-indigo-950/60 font-mono">
                <i className="fa-solid fa-user-shield"></i>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Login Akun Guru / Admin
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Masukkan Email dan PIN yang telah diberikan khusus oleh <strong>Admin Sekolah</strong> Anda.
              </p>
            </div>

            {/* Success message banner from recent actions */}
            {successMsg && (
              <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-start gap-2 animate-fade-in">
                <i className="fa-solid fa-circle-check mt-0.5 shrink-0 text-emerald-600"></i>
                <p>{successMsg}</p>
              </div>
            )}

            {/* Security Notice: Individual Account & PIN */}
            <div className="mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <i className="fa-solid fa-lock text-indigo-500 text-xs shrink-0"></i>
              <span>Setiap guru wajib login menggunakan Email dan PIN masing-masing.</span>
            </div>

            {/* Email & PIN Login Form - Explicit autoComplete="off" */}
            <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Alamat Email Terdaftar <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id={`login-email-input-${modalId}`}
                    type="email"
                    required
                    autoFocus
                    autoComplete="off"
                    placeholder="nama@guru.sch.id atau email Anda"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-850 transition-colors"
                  />
                  <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    PIN Keamanan Guru <span className="text-rose-500">*</span>
                  </label>
                  <button
                    id={`login-forgot-pin-btn-${modalId}`}
                    type="button"
                    onClick={() => handleOpenForgotPin(emailInput)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <i className="fa-solid fa-key text-[10px]"></i>
                    <span>Lupa PIN?</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id={`login-pin-input-${modalId}`}
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={16}
                    autoComplete="new-password"
                    placeholder="Masukkan PIN yang diberikan Admin"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-medium tracking-widest focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-850 transition-colors"
                  />
                  <i className="fa-solid fa-key absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    title={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                  >
                    <i className={`fa-solid ${showPin ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-xl p-3 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-2 animate-shake">
                  <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0 text-rose-500"></i>
                  <div className="space-y-1">
                    <p>{errorMsg}</p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                      Belum menerima PIN atau lupa?{' '}
                      <button
                        type="button"
                        onClick={() => handleOpenForgotPin(emailInput)}
                        className="font-bold underline text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 cursor-pointer"
                      >
                        Hubungi Admin Sekolah
                      </button>
                    </p>
                  </div>
                </div>
              )}

              <button
                id={`login-submit-btn-${modalId}`}
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>Masuk ke Akun Guru</span>
              </button>
            </form>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-shield-halved text-emerald-500 text-xs"></i>
                <span>Sistem Presensi Siswa Terverifikasi • SD Inpres 2 Ulatan</span>
              </p>
            </div>
          </div>
        ) : (
          /* =========================================================================
              VIEW 2: FORGOT PIN - ADMIN CONTACT ONLY (NO UNAUTHORIZED PIN RESET)
             ========================================================================= */
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                id={`forgot-pin-back-btn-${modalId}`}
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left"></i>
                <span>Kembali ke Login</span>
              </button>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold flex items-center gap-1">
                <i className="fa-solid fa-key text-[10px]"></i>
                <span>Bantuan PIN</span>
              </span>
            </div>

            <div className="space-y-1.5 mb-5">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-user-shield text-indigo-600 dark:text-indigo-400"></i>
                <span>Bantuan PIN Akun Guru</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                PIN akun guru diberikan dan dikelola langsung oleh <strong>Admin Sekolah (Pak Moh. Fadli)</strong> untuk menjaga kerahasiaan dan keamanan akun masing-masing.
              </p>
            </div>

            {/* Step 1: Input Email to find teacher account */}
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 mb-4 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Masukkan Email Akun Anda <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id={`forgot-email-input-${modalId}`}
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (matchedTeacher) {
                        setMatchedTeacher(null);
                      }
                      if (forgotErrorMsg) setForgotErrorMsg('');
                    }}
                    placeholder="nama@guru.sch.id"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                  />
                  <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                </div>
                <button
                  id={`forgot-search-btn-${modalId}`}
                  type="button"
                  onClick={() => lookupTeacherAccount(forgotEmail)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>Cek</span>
                </button>
              </div>

              {/* Matched Teacher Badge */}
              {matchedTeacher && (
                <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-sm">
                      <i className="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {matchedTeacher.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {matchedTeacher.role === 'admin' ? 'Administrator Sekolah' : matchedTeacher.subject} • {matchedSchool?.name || 'Sekolah'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                    Terdaftar
                  </span>
                </div>
              )}
            </div>

            {/* Forgot Error Banner */}
            {forgotErrorMsg && (
              <div className="mb-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-xl p-3 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2 animate-shake">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0 text-rose-500"></i>
                <p>{forgotErrorMsg}</p>
              </div>
            )}

            {/* WhatsApp Admin Support Card */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                <i className="fa-solid fa-headset text-indigo-500"></i>
                <span>Hubungi Admin Sekolah untuk Info PIN</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Silakan hubungi Admin Sekolah (Pak Moh. Fadli) via WhatsApp untuk mendapatkan atau memperbarui PIN login akun Anda.
              </p>

              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instansi: <strong className="text-slate-800 dark:text-slate-200">{matchedSchool?.name || 'SD INPRES 2 ULATAN'}</strong>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Admin: <strong className="text-slate-800 dark:text-slate-200">MOH. FADLI</strong>
                </p>
              </div>

              {copiedWhatsAppText && (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[11px] p-2 rounded-lg font-semibold flex items-center gap-1.5">
                  <i className="fa-solid fa-check"></i>
                  <span>Teks pesan bantuan berhasil disalin ke clipboard!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  id={`whatsapp-send-btn-${modalId}`}
                  type="button"
                  onClick={handleOpenWhatsAppAdmin}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fa-brands fa-whatsapp text-sm"></i>
                  <span>Kirim Pesan ke Admin</span>
                </button>
                <button
                  id={`whatsapp-copy-btn-${modalId}`}
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  className="w-full py-2.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>Salin Teks Pesan</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
