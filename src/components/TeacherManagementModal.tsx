import React, { useState } from 'react';
import { Teacher, TeacherType } from '../types';
import { SD_CLASSES } from '../data/initialData';

interface TeacherManagementModalProps {
  teachers: Teacher[];
  currentTeacher: Teacher | null;
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onClose: () => void;
}

export const TeacherManagementModal: React.FC<TeacherManagementModalProps> = ({
  teachers,
  currentTeacher,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onClose,
}) => {
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('1234');
  const [subject, setSubject] = useState('');
  const [teacherType, setTeacherType] = useState<TeacherType>('wali_kelas');
  const [homeroomClass, setHomeroomClass] = useState<string>('Kelas 1');
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  // Start editing a specific teacher / admin
  const handleStartEdit = (teacher: Teacher) => {
    setFormError('');
    setEditingTeacherId(teacher.id);
    setName(teacher.name);
    setNip(teacher.nip || '');
    setEmail(teacher.email);
    setPin(teacher.pin || '1234');
    setSubject(teacher.subject);
    setTeacherType(teacher.teacherType || (teacher.role === 'admin' ? 'admin' : (teacher.homeroomClass ? 'wali_kelas' : 'guru_mapel')));
    setHomeroomClass(teacher.homeroomClass || 'Kelas 1');
  };

  const handleCancelEdit = () => {
    setFormError('');
    setEditingTeacherId(null);
    setName('');
    setNip('');
    setEmail('');
    setPin('1234');
    setSubject('');
    setTeacherType('wali_kelas');
    setHomeroomClass('Kelas 1');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !email.trim() || !subject.trim()) {
      setFormError('Semua kolom bertanda bintang (*) wajib diisi.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim() || '1234';

    if (cleanPin.length < 4) {
      setFormError('PIN Keamanan login guru minimal terdiri dari 4 karakter / angka.');
      return;
    }

    const computedRole = teacherType === 'admin' ? 'admin' : 'guru';
    const computedHomeroomClass = teacherType === 'wali_kelas' ? homeroomClass : undefined;

    if (editingTeacherId) {
      const existing = teachers.find((t) => t.id === editingTeacherId);
      // Update existing teacher / admin
      onUpdateTeacher({
        id: editingTeacherId,
        schoolId: existing?.schoolId,
        name: name.trim(),
        nip: nip.trim(),
        email: cleanEmail,
        pin: cleanPin,
        subject: subject.trim(),
        role: computedRole,
        teacherType,
        homeroomClass: computedHomeroomClass,
      });
      handleCancelEdit();
    } else {
      // Add new teacher
      onAddTeacher({
        name: name.trim(),
        nip: nip.trim(),
        email: cleanEmail,
        pin: cleanPin,
        subject: subject.trim(),
        role: computedRole,
        teacherType,
        homeroomClass: computedHomeroomClass,
      });
      setName('');
      setNip('');
      setEmail('');
      setPin('1234');
      setSubject('');
      setTeacherType('wali_kelas');
      setHomeroomClass('Kelas 1');
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.homeroomClass && t.homeroomClass.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.nip && t.nip.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (currentTeacher?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Akses Dibatasi</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hanya akun Administrator yang berhak melihat dan mengelola akun guru sekolah.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl relative my-auto animate-scale-up flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Sticky Fixed Header with Clear, Uncut Close Button */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
              <i className="fa-solid fa-users-gear"></i>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                Kelola Akun Guru & PIN Login
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Tambah akun guru dan atur PIN login agar guru dapat masuk ke sistem sekolah.
              </p>
            </div>
          </div>

          {/* Prominent Close Button */}
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

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Form Tambah / Edit Guru & Admin */}
          <form
            onSubmit={handleSubmit}
            className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
              editingTeacherId
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200/50'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                <i
                  className={`fa-solid ${
                    editingTeacherId ? 'fa-pen-to-square text-amber-600' : 'fa-user-plus text-indigo-600'
                  }`}
                ></i>
                <span>{editingTeacherId ? 'Edit Data & PIN Guru / Admin' : 'Tambah Akun Guru Baru'}</span>
              </h4>
              {editingTeacherId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: AHMAD FAUZI, S.Pd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  NIP (Nomor Induk Pegawai)
                </label>
                <input
                  type="text"
                  placeholder="contoh: 198504122010011008"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Login Guru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: guru.ipa@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  PIN Keamanan Login Guru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="contoh: 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold tracking-wider text-indigo-700 focus:outline-none focus:border-indigo-500"
                  />
                  <i className="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  PIN 4-16 karakter/angka yang harus dimasukkan guru saat login.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mata Pelajaran / Tugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    teacherType === 'wali_kelas'
                      ? 'contoh: Guru Kelas / Tematik'
                      : teacherType === 'admin'
                      ? 'contoh: Administrator / Operator Sekolah'
                      : 'contoh: PAI / PJOK / Bahasa Inggris'
                  }
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
                {/* Preset cepat untuk mempermudah pengisian */}
                <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                  <span className="text-[10px] text-slate-400 font-medium">Pilihan cepat:</span>
                  {teacherType === 'wali_kelas' ? (
                    <>
                      {['Guru Kelas', 'Tematik', 'Guru Kelas & Tematik'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSubject(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all cursor-pointer ${
                            subject === preset
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </>
                  ) : teacherType === 'admin' ? (
                    <>
                      {['Administrator', 'Operator Sekolah', 'Kepala Sekolah'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSubject(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all cursor-pointer ${
                            subject === preset
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {['PAI (Agama Islam)', 'PJOK (Olahraga)', 'Bahasa Inggris', 'Seni Budaya'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSubject(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all cursor-pointer ${
                            subject === preset
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Status Peran & Hak Akses
                </label>
                <select
                  value={teacherType}
                  onChange={(e) => setTeacherType(e.target.value as TeacherType)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="wali_kelas">Guru Wali Kelas (Bisa Edit Siswa Kelasnya & TTD Laporan)</option>
                  <option value="guru_mapel">Guru Mapel (Hanya Lihat Presensi & Scan QR)</option>
                  <option value="admin">Administrator Sekolah (Akses Penuh Semua Kelas)</option>
                </select>
              </div>

              {teacherType === 'wali_kelas' && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kelas Binaan (Wali Kelas) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={homeroomClass}
                    onChange={(e) => setHomeroomClass(e.target.value)}
                    className="w-full bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {SD_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>Wali {cls}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Info Banner Hak Akses */}
            <div className="text-[11px] bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-xl text-indigo-900 flex items-start gap-2">
              <i className="fa-solid fa-circle-info text-indigo-600 mt-0.5"></i>
              <div>
                {teacherType === 'wali_kelas' ? (
                  <span>
                    <strong>Wali Kelas {homeroomClass}:</strong> Berhak mengedit siswa kelas <strong>{homeroomClass}</strong>. Nama dan NIP akan otomatis tertera di tanda tangan laporan presensi.
                  </span>
                ) : teacherType === 'guru_mapel' ? (
                  <span>
                    <strong>Guru Mapel:</strong> Hanya dapat melihat presensi dan memindai QR kartu. Tidak dapat mengubah biodata siswa.
                  </span>
                ) : (
                  <span>
                    <strong>Admin Sekolah:</strong> Memiliki wewenang mengelola data seluruh siswa dan mengatur akun guru di sekolah ini.
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  editingTeacherId
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <i className={`fa-solid ${editingTeacherId ? 'fa-check' : 'fa-plus'} text-xs`}></i>
                <span>{editingTeacherId ? 'Simpan Perubahan Data & PIN' : 'Simpan Akun Guru & PIN'}</span>
              </button>
              {editingTeacherId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          {/* Tabel Daftar Guru & PIN */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>Daftar Guru, Peran, & PIN Login</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {teachers.length}
                </span>
              </h4>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari guru, NIP, atau kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                />
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Nama & NIP</th>
                    <th className="p-3">Email & PIN Login</th>
                    <th className="p-3">Peran & Penugasan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((t) => {
                    const isCurrent = currentTeacher?.id === t.id;
                    const isEditing = editingTeacherId === t.id;
                    const isWali = t.teacherType === 'wali_kelas' || Boolean(t.homeroomClass);

                    return (
                      <tr
                        key={t.id}
                        className={`transition-colors ${
                          isEditing
                            ? 'bg-amber-50 font-bold'
                            : isCurrent
                            ? 'bg-indigo-50/50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{t.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                  Anda
                                </span>
                              )}
                            </div>
                            {t.nip ? (
                              <span className="text-[10px] text-slate-500 font-mono font-normal">
                                NIP: {t.nip}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic font-normal">NIP: -</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-[11px]">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-slate-700">{t.email}</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-[10px] w-fit">
                              <i className="fa-solid fa-key text-[8px]"></i>
                              <span>PIN: {t.pin || '1234'}</span>
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.role === 'admin' || t.teacherType === 'admin' ? (
                              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                                <i className="fa-solid fa-shield-halved text-amber-700 text-[9px]"></i>
                                Admin Sekolah
                              </span>
                            ) : isWali ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <i className="fa-solid fa-user-graduate text-emerald-700 text-[9px]"></i>
                                Wali {t.homeroomClass} ({t.subject})
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <i className="fa-solid fa-book-open text-slate-500 text-[9px]"></i>
                                Guru Mapel: {t.subject}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(t)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="Edit Data & PIN Guru"
                          >
                            <i className="fa-solid fa-pen-to-square mr-1"></i>
                            <span>Edit PIN</span>
                          </button>

                          {/* Delete Button (Allowed for all except if it is the only admin) */}
                          {t.role !== 'admin' || teachers.filter((x) => x.role === 'admin').length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setTeacherToDelete(t)}
                              className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Hapus Akun"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1">Utama</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <i className="fa-solid fa-users-slash text-2xl text-slate-300"></i>
                          <p className="font-bold text-xs text-slate-700">
                            {searchQuery ? `Tidak ada guru cocok dengan "${searchQuery}"` : 'Belum ada data guru tersimpan'}
                          </p>
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="text-[11px] text-indigo-600 hover:underline font-bold"
                            >
                              Reset Pencarian
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirmation Modal for Delete Teacher */}
          {teacherToDelete && (
            <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 text-center space-y-4 shadow-2xl animate-scale-up">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-slate-900">Konfirmasi Hapus Akun</h4>
                  <p className="text-xs text-slate-600">
                    Apakah Anda yakin ingin menghapus akun guru <strong>{teacherToDelete.name}</strong>?
                  </p>
                  <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-2 text-left space-y-0.5 font-medium text-slate-700">
                    <div><strong>Email:</strong> {teacherToDelete.email}</div>
                    <div><strong>PIN:</strong> {teacherToDelete.pin || '1234'}</div>
                    <div><strong>Tugas:</strong> {teacherToDelete.subject}</div>
                    {teacherToDelete.homeroomClass && (
                      <div><strong>Wali Kelas:</strong> {teacherToDelete.homeroomClass}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTeacherToDelete(null)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = teacherToDelete.id;
                      setTeacherToDelete(null);
                      onDeleteTeacher(id);
                    }}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Total {filteredTeachers.length} Akun Guru & Admin
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
