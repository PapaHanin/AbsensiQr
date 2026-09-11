import React, { useState, useRef, useEffect } from 'react';
import { School, Student, Teacher, SUPER_ADMIN_EMAIL } from '../types';
import { DEFAULT_PRIMARY_SCHOOL_ID } from '../data/initialData';

interface SchoolManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  currentSchoolId: string;
  onSelectSchool: (schoolId: string) => void;
  onSaveSchool: (school: School, initialAdmin?: Omit<Teacher, 'id'>) => Promise<void>;
  onSaveSchoolAdmin?: (schoolId: string, adminData: Omit<Teacher, 'id'>) => Promise<void>;
  onDeleteSchool: (schoolId: string) => Promise<void>;
  students: Student[];
  teachers: Teacher[];
  onShowToast?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const SchoolManagementModal: React.FC<SchoolManagementModalProps> = ({
  isOpen,
  onClose,
  schools,
  currentSchoolId,
  onSelectSchool,
  onSaveSchool,
  onSaveSchoolAdmin,
  onDeleteSchool,
  students,
  teachers,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedCredsNotice, setCopiedCredsNotice] = useState(false);

  // Success Credential Card Popup State
  const [createdSchoolCreds, setCreatedSchoolCreds] = useState<{
    schoolName: string;
    schoolCode: string;
    adminName: string;
    adminEmail: string;
    adminPin: string;
    phone?: string;
    schoolId: string;
  } | null>(null);

  // Quick Add/Edit Admin Modal for an Existing School
  const [adminModalSchool, setAdminModalSchool] = useState<School | null>(null);
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    nip: '',
    email: '',
    pin: '1234',
    roleType: 'kepsek' as 'kepsek' | 'operator' | 'guru',
    subject: 'Kepala Sekolah & Administrator',
  });
  const [adminModalError, setAdminModalError] = useState('');
  const [isAdminSaving, setIsAdminSaving] = useState(false);
  const [showAdminModalPin, setShowAdminModalPin] = useState(false);

  // Main School Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    academicYear: '2025/2026',
    lateCutoffTime: '07:00',
    headmasterName: '',
    headmasterNip: '',
    contactPhone: '',
    contactEmail: '',
    iihhBeresDatabaseId: '',
    notes: '',
  });

  // Admin Account Creation within New School Form
  const [createAdminAccount, setCreateAdminAccount] = useState(true);
  const [adminRoleType, setAdminRoleType] = useState<'kepsek' | 'operator' | 'guru'>('kepsek');
  const [adminName, setAdminName] = useState('');
  const [adminNip, setAdminNip] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPin, setAdminPin] = useState('1234');
  const [adminTitle, setAdminTitle] = useState('Kepala Sekolah & Administrator');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const currentSchool = schools.find((s) => s.id === currentSchoolId) || schools[0];

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStudentCountForSchool = (schoolId: string) => {
    return students.filter(
      (s) => (!s.schoolId && schoolId === DEFAULT_PRIMARY_SCHOOL_ID) || s.schoolId === schoolId
    ).length;
  };

  const getTeacherCountForSchool = (schoolId: string) => {
    return teachers.filter(
      (t) => (!t.schoolId && schoolId === DEFAULT_PRIMARY_SCHOOL_ID) || t.schoolId === schoolId
    ).length;
  };

  const getSchoolAdmins = (schoolId: string) => {
    return teachers.filter(
      (t) =>
        ((!t.schoolId && schoolId === DEFAULT_PRIMARY_SCHOOL_ID) || t.schoolId === schoolId) &&
        t.role === 'admin'
    );
  };

  const handleGenerateCode = (schoolName: string) => {
    const clean = schoolName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
    return clean || 'SCH' + Math.floor(Math.random() * 1000);
  };

  const openCreateForm = () => {
    setEditingSchoolId(null);
    setFormError('');
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      academicYear: '2025/2026',
      lateCutoffTime: '07:00',
      headmasterName: '',
      headmasterNip: '',
      contactPhone: '',
      contactEmail: '',
      iihhBeresDatabaseId: '',
      notes: '',
    });

    // Reset Admin fields
    setCreateAdminAccount(true);
    setAdminRoleType('kepsek');
    setAdminName('');
    setAdminNip('');
    setAdminEmail('');
    setAdminPin('1234');
    setAdminTitle('Kepala Sekolah & Administrator');
    setIsFormOpen(true);
  };

  const openEditForm = (school: School) => {
    setEditingSchoolId(school.id);
    setFormError('');
    setFormData({
      name: school.name,
      code: school.code,
      address: school.address,
      city: school.city || '',
      academicYear: school.academicYear,
      lateCutoffTime: school.lateCutoffTime,
      headmasterName: school.headmasterName || '',
      headmasterNip: school.headmasterNip || '',
      contactPhone: school.contactPhone || '',
      contactEmail: school.contactEmail || '',
      iihhBeresDatabaseId: school.iihhBeresDatabaseId || '',
      notes: school.notes || '',
    });
    setCreateAdminAccount(false);
    setIsFormOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (!editingSchoolId && !prev.code) {
        const code = handleGenerateCode(val);
        updated.code = code;
        // Also suggest email if empty or matches previous pattern
        if (!adminEmail || adminEmail.includes('@sekolah.sch.id')) {
          setAdminEmail(`admin.${code.toLowerCase()}@sekolah.sch.id`);
        }
      }
      return updated;
    });
  };

  const handleHeadmasterNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, headmasterName: val }));
    if (!editingSchoolId && adminRoleType === 'kepsek' && (!adminName || adminName === formData.headmasterName)) {
      setAdminName(val);
    }
  };

  const handleHeadmasterNipChange = (val: string) => {
    setFormData((prev) => ({ ...prev, headmasterNip: val }));
    if (!editingSchoolId && adminRoleType === 'kepsek' && (!adminNip || adminNip === formData.headmasterNip)) {
      setAdminNip(val);
    }
  };

  const handleAdminRoleTypeChange = (type: 'kepsek' | 'operator' | 'guru') => {
    setAdminRoleType(type);
    if (type === 'kepsek') {
      if (formData.headmasterName) setAdminName(formData.headmasterName);
      if (formData.headmasterNip) setAdminNip(formData.headmasterNip);
      setAdminTitle('Kepala Sekolah & Administrator');
    } else if (type === 'operator') {
      if (adminTitle === 'Kepala Sekolah & Administrator') {
        setAdminTitle('Operator & Administrator Sekolah');
      }
    } else {
      setAdminTitle('Guru & Administrator Sekolah');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      const msg = 'Nama resmi sekolah wajib diisi.';
      setFormError(msg);
      onShowToast?.('Form Belum Lengkap', msg, 'warning');
      return;
    }

    // Prepare Admin Account if adding new school
    let initialAdmin: Omit<Teacher, 'id'> | undefined = undefined;
    const cleanSchoolCode = (formData.code.trim() || handleGenerateCode(formData.name)).toUpperCase();

    if (!editingSchoolId && createAdminAccount) {
      const effectiveAdminName =
        adminName.trim() ||
        formData.headmasterName.trim() ||
        (adminRoleType === 'operator'
          ? `Operator ${formData.name.trim()}`
          : `Kepala ${formData.name.trim()}`);

      const suggestedEmail = `admin.${cleanSchoolCode.toLowerCase()}@sekolah.sch.id`;
      let cleanEmail = adminEmail.trim().toLowerCase() || suggestedEmail;

      if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
        const msg = `Email "${SUPER_ADMIN_EMAIL}" adalah akun khusus Super Administrator. Gunakan email lain seperti "${suggestedEmail}".`;
        setFormError(msg);
        onShowToast?.('Email Khusus Super Admin', msg, 'warning');
        return;
      }

      const effectivePin = adminPin.trim() || '1234';
      if (effectivePin.length < 4) {
        const msg = 'PIN Keamanan login admin minimal 4 karakter (contoh: 1234).';
        setFormError(msg);
        onShowToast?.('PIN Terlalu Pendek', msg, 'warning');
        return;
      }

      initialAdmin = {
        name: effectiveAdminName,
        nip: adminNip.trim() || formData.headmasterNip.trim() || undefined,
        email: cleanEmail,
        pin: effectivePin,
        role: 'admin',
        teacherType: 'admin',
        subject:
          adminTitle.trim() ||
          (adminRoleType === 'operator'
            ? 'Operator & Administrator'
            : 'Kepala Sekolah & Administrator'),
      };
    }

    setIsSaving(true);
    try {
      const cleanSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 25) || 'school';

      const generatedId =
        editingSchoolId ||
        `${cleanSlug}-${Math.random().toString(36).substring(2, 7)}`;

      const schoolToSave: School = {
        id: generatedId,
        code: cleanSchoolCode,
        name: formData.name.trim(),
        address: formData.address.trim() || 'Alamat belum diatur',
        city: formData.city.trim() || 'Indonesia',
        academicYear: formData.academicYear.trim() || '2025/2026',
        lateCutoffTime: formData.lateCutoffTime.trim() || '07:00',
        headmasterName: formData.headmasterName.trim() || (initialAdmin && adminRoleType === 'kepsek' ? initialAdmin.name : undefined),
        headmasterNip: formData.headmasterNip.trim() || (initialAdmin && adminRoleType === 'kepsek' ? initialAdmin.nip : undefined),
        contactPhone: formData.contactPhone.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || (initialAdmin ? initialAdmin.email : undefined),
        iihhBeresDatabaseId: formData.iihhBeresDatabaseId.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        isActive: true,
        createdAt:
          schools.find((s) => s.id === generatedId)?.createdAt ||
          new Date().toISOString().split('T')[0],
      };

      await onSaveSchool(schoolToSave, initialAdmin);
      setIsFormOpen(false);
      setFormError('');

      // If new school was created with admin credentials, show the success credentials card
      if (!editingSchoolId && initialAdmin) {
        setCreatedSchoolCreds({
          schoolName: schoolToSave.name,
          schoolCode: schoolToSave.code,
          adminName: initialAdmin.name,
          adminEmail: initialAdmin.email,
          adminPin: initialAdmin.pin || '1234',
          phone: schoolToSave.contactPhone,
          schoolId: schoolToSave.id,
        });
      } else if (!editingSchoolId) {
        onSelectSchool(schoolToSave.id);
      }
    } catch (err: any) {
      console.warn('Gagal memproses data sekolah:', err);
      const msg = 'Gagal menyimpan sekolah: ' + (err?.message || 'Terjadi kesalahan sistem.');
      setFormError(msg);
      onShowToast?.('Gagal Menyimpan', msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (schoolId: string) => {
    if (schoolId === DEFAULT_PRIMARY_SCHOOL_ID) {
      alert('Sekolah utama (SD Inpres 2 Ulatan) tidak dapat dihapus.');
      return;
    }

    if (
      window.confirm(
        'Yakin ingin menghapus data sekolah ini dari daftar? Siswa dan absensi yang terafiliasi tidak akan hilang permanen namun tidak lagi aktif.'
      )
    ) {
      setDeletingId(schoolId);
      try {
        await onDeleteSchool(schoolId);
        if (currentSchoolId === schoolId) {
          onSelectSchool(DEFAULT_PRIMARY_SCHOOL_ID);
        }
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // WhatsApp Message Generator for school admin credentials
  const getWhatsAppMessage = (
    schoolName: string,
    schoolCode: string,
    adminName: string,
    email: string,
    pin: string
  ) => {
    const appUrl = window.location.origin;
    return `*AKUN LOGIN ADMINISTRATOR SEKOLAH*
*Aplikasi Presensi QR Code Siswa*

🏫 *Sekolah:* ${schoolName}
🔑 *Kode Sekolah:* ${schoolCode}
👤 *Nama Admin:* ${adminName}
📧 *Email Login:* ${email}
🔢 *PIN Login:* ${pin}
🌐 *Link Aplikasi:* ${appUrl}

*Langkah Awal untuk Admin Sekolah:*
1. Buka link aplikasi di atas menggunakan Google Chrome (di Laptop atau HP).
2. Klik menu *Login Guru/Admin*, lalu masukkan *Email* dan *PIN* di atas.
3. Setelah login, Anda sebagai Admin Sekolah dapat langsung:
   - Menambahkan data guru & mengatur PIN mereka di menu *Kelola Guru*.
   - Mengatur kelas dan menambahkan data siswa di menu *Data Siswa*.
   - Mengunduh & mencetak kartu QR Code siswa secara mandiri.
   - Memantau rekap absensi harian dan sinkronisasi ke e-Rapor.

Terima kasih dan selamat bertugas!`;
  };

  const handleCopyWhatsAppMessage = (
    schoolName: string,
    schoolCode: string,
    adminName: string,
    email: string,
    pin: string
  ) => {
    const msg = getWhatsAppMessage(schoolName, schoolCode, adminName, email, pin);
    navigator.clipboard.writeText(msg);
    setCopiedCredsNotice(true);
    setTimeout(() => setCopiedCredsNotice(false), 2500);
  };

  const handleOpenWhatsAppDirect = (
    schoolName: string,
    schoolCode: string,
    adminName: string,
    email: string,
    pin: string,
    phone?: string
  ) => {
    const msg = getWhatsAppMessage(schoolName, schoolCode, adminName, email, pin);
    let targetPhone = '';
    if (phone) {
      let clean = phone.replace(/[^0-9]/g, '');
      if (clean.startsWith('0')) clean = '62' + clean.slice(1);
      targetPhone = clean;
    }
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Open Add Admin Modal for an Existing School
  const handleOpenAddAdminModal = (school: School) => {
    setAdminModalSchool(school);
    setAdminModalError('');
    setAdminFormData({
      name: school.headmasterName || '',
      nip: school.headmasterNip || '',
      email: `admin.${school.code.toLowerCase()}@sekolah.sch.id`,
      pin: '1234',
      roleType: 'kepsek',
      subject: 'Kepala Sekolah & Administrator',
    });
  };

  const handleSaveAdminModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminModalSchool || !onSaveSchoolAdmin) return;
    setAdminModalError('');

    if (!adminFormData.name.trim() || !adminFormData.email.trim()) {
      setAdminModalError('Nama dan Email Admin Sekolah wajib diisi.');
      return;
    }

    const cleanEmail = adminFormData.email.trim().toLowerCase();
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      setAdminModalError(`Email "${SUPER_ADMIN_EMAIL}" adalah hak khusus Super Administrator.`);
      return;
    }

    if (adminFormData.pin.trim().length < 4) {
      setAdminModalError('PIN Keamanan minimal 4 karakter (contoh: 1234).');
      return;
    }

    setIsAdminSaving(true);
    try {
      await onSaveSchoolAdmin(adminModalSchool.id, {
        name: adminFormData.name.trim(),
        nip: adminFormData.nip.trim() || undefined,
        email: cleanEmail,
        pin: adminFormData.pin.trim() || '1234',
        role: 'admin',
        teacherType: 'admin',
        subject: adminFormData.subject.trim() || 'Administrator Sekolah',
      });

      // Show credentials popup so superadmin can copy/send to WhatsApp
      setCreatedSchoolCreds({
        schoolName: adminModalSchool.name,
        schoolCode: adminModalSchool.code,
        adminName: adminFormData.name.trim(),
        adminEmail: cleanEmail,
        adminPin: adminFormData.pin.trim() || '1234',
        phone: adminModalSchool.contactPhone,
        schoolId: adminModalSchool.id,
      });

      setAdminModalSchool(null);
    } catch (err: any) {
      setAdminModalError(err?.message || 'Gagal menyimpan admin sekolah.');
    } finally {
      setIsAdminSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden relative">
        
        {/* Header Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-700 text-white relative flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner shrink-0">
                <i className="fa-solid fa-school-flag text-2xl"></i>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight truncate">
                    Kelola Sistem Multi-Sekolah
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-xs shrink-0">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-indigo-100 mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                  Tambah sekolah baru lengkap dengan akun <strong>Admin/Kepala Sekolah</strong> otomatis, agar pihak sekolah dapat mandiri menambahkan guru dan siswa tanpa membebani Anda.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-rose-600 text-white transition-colors cursor-pointer text-xs font-bold shrink-0 shadow-xs"
              title="Tutup Jendela"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
              <span>Tutup</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider block">
                Total Sekolah
              </span>
              <span className="text-base sm:text-lg font-black text-white">{schools.length} Sekolah</span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider block">
                Sekolah Aktif di Layar
              </span>
              <span className="text-xs font-bold text-white truncate block mt-0.5" title={currentSchool?.name}>
                {currentSchool?.name || 'SD INPRES 2 ULATAN'}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider block">
                Total Siswa (Sekolah Ini)
              </span>
              <span className="text-base sm:text-lg font-black text-white">
                {getStudentCountForSchool(currentSchoolId)} Siswa
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/15">
              <span className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider block">
                Mode Sistem
              </span>
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Multi-Tenant Terisolasi
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Action & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama sekolah, kota, atau kode sekolah..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-indigo-500/20 shrink-0"
            >
              <i className="fa-solid fa-plus-circle"></i>
              <span>Tambah Sekolah Baru (+ Admin Sekolah)</span>
            </button>
          </div>

          {/* Form Modal / Drawer */}
          {isFormOpen && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                  <i className="fa-solid fa-pen-to-square"></i>
                  <span>
                    {editingSchoolId
                      ? 'Edit Data Sekolah'
                      : 'Pendaftaran Sekolah Baru & Pembuatan Akun Admin'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* SECTION 1: Identitas Sekolah */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    <i className="fa-solid fa-school text-indigo-600"></i>
                    <span>1. Identitas Resmi Sekolah</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Nama Resmi Sekolah <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Contoh: SD NEGERI 1 BANGGAI"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Kode Unik Sekolah (Slug ID)
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setFormData({ ...formData, code: val });
                          if (!editingSchoolId && (!adminEmail || adminEmail.includes('@sekolah.sch.id'))) {
                            setAdminEmail(`admin.${val.toLowerCase()}@sekolah.sch.id`);
                          }
                        }}
                        placeholder="Contoh: SDN1BGI"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Alamat Lengkap Sekolah
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Contoh: Jl. Merdeka No. 10, Kec. Luwuk"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Contoh: Kab. Banggai"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Tahun Ajaran Aktif
                      </label>
                      <input
                        type="text"
                        value={formData.academicYear}
                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                        placeholder="Contoh: 2025/2026"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Toleransi Jam Masuk (Terlambat)
                      </label>
                      <input
                        type="time"
                        value={formData.lateCutoffTime}
                        onChange={(e) => setFormData({ ...formData, lateCutoffTime: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono font-bold text-amber-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Nomor WhatsApp / HP Kontak Sekolah
                      </label>
                      <input
                        type="text"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        placeholder="Contoh: 081234567890 (Untuk kirim akun via WA)"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Nama Kepala Sekolah
                      </label>
                      <input
                        type="text"
                        value={formData.headmasterName}
                        onChange={(e) => handleHeadmasterNameChange(e.target.value)}
                        placeholder="Contoh: Drs. Ahmad Yani, M.Pd"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        NIP Kepala Sekolah
                      </label>
                      <input
                        type="text"
                        value={formData.headmasterNip}
                        onChange={(e) => handleHeadmasterNipChange(e.target.value)}
                        placeholder="Contoh: 19780101 200501 1 004"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Database e-Rapor (IIH Beres) Khusus Sekolah Ini{' '}
                        <span className="text-slate-400 font-normal">(Opsional - Kosongkan jika pakai database default)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.iihhBeresDatabaseId}
                        onChange={(e) => setFormData({ ...formData, iihhBeresDatabaseId: e.target.value })}
                        placeholder="Contoh: ai-studio-iihhberes-sdn1bgi-xxxx"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Akun Administrator Sekolah (Kepala Sekolah / Operator) */}
                {!editingSchoolId && (
                  <div className="space-y-3 bg-amber-50/70 dark:bg-amber-950/25 border-2 border-amber-300 dark:border-amber-800/60 p-4 rounded-2xl">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                        <i className="fa-solid fa-user-shield text-amber-600 dark:text-amber-400 text-sm"></i>
                        <span>2. Akun Administrator Sekolah (Login Mandiri Sekolah)</span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-200">
                        <input
                          type="checkbox"
                          checked={createAdminAccount}
                          onChange={(e) => setCreateAdminAccount(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Buat akun Admin Sekolah otomatis</span>
                      </label>
                    </div>

                    <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                      💡 <strong>Hemat waktu Anda:</strong> Akun ini diberikan kepada Kepala Sekolah atau Operator Sekolah agar mereka dapat login sendiri, menambahkan guru mapel/wali kelas, dan mengunggah data siswa mereka tanpa meminta bantuan Anda sebagai Super Admin.
                    </p>

                    {createAdminAccount && (
                      <div className="space-y-3 pt-2">
                        {/* Pilihan Peran Admin */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Siapa yang ditunjuk sebagai Administrator Utama Sekolah ini?
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleAdminRoleTypeChange('kepsek')}
                              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                                adminRoleType === 'kepsek'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                              }`}
                            >
                              <i className="fa-solid fa-user-tie"></i>
                              <span>Kepala Sekolah</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAdminRoleTypeChange('operator')}
                              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                                adminRoleType === 'operator'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                              }`}
                            >
                              <i className="fa-solid fa-laptop-code"></i>
                              <span>Operator / Staf IT</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAdminRoleTypeChange('guru')}
                              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                                adminRoleType === 'guru'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                              }`}
                            >
                              <i className="fa-solid fa-chalkboard-user"></i>
                              <span>Guru Ditugaskan Admin</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Nama Lengkap Admin <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required={createAdminAccount}
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              placeholder="Contoh: Drs. Ahmad Yani, M.Pd"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              NIP Admin (Opsional)
                            </label>
                            <input
                              type="text"
                              value={adminNip}
                              onChange={(e) => setAdminNip(e.target.value)}
                              placeholder="Contoh: 19780101 200501 1 004"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Email Login Admin Sekolah <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="email"
                              required={createAdminAccount}
                              value={adminEmail}
                              onChange={(e) => setAdminEmail(e.target.value)}
                              placeholder="admin.sdn1@sekolah.sch.id atau email kepsek"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Digunakan Admin untuk login di aplikasi.
                            </span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              PIN Login Admin Sekolah <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showAdminPin ? 'text' : 'password'}
                                required={createAdminAccount}
                                maxLength={16}
                                value={adminPin}
                                onChange={(e) => setAdminPin(e.target.value)}
                                placeholder="Contoh: 1234"
                                className="w-full pl-8 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-amber-800 dark:text-amber-300 focus:outline-none focus:border-indigo-500"
                              />
                              <i className="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                              <button
                                type="button"
                                onClick={() => setShowAdminPin(!showAdminPin)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              >
                                <i className={`fa-solid ${showAdminPin ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Default: <strong>1234</strong> (Dapat diubah sesuai keinginan).
                            </span>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Jabatan / Status di Sekolah
                            </label>
                            <input
                              type="text"
                              value={adminTitle}
                              onChange={(e) => setAdminTitle(e.target.value)}
                              placeholder="Kepala Sekolah & Administrator Sekolah"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formError && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                    <i className="fa-solid fa-circle-exclamation shrink-0 text-sm text-rose-600"></i>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Menyimpan ke Cloud...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>
                          {editingSchoolId
                            ? 'Simpan Perubahan Sekolah'
                            : 'Simpan Sekolah & Terbitkan Akun Admin'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Schools */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Daftar Sekolah Terdaftar ({filteredSchools.length})</span>
              <span>Kelola admin atau beralih sekolah dengan satu klik</span>
            </div>

            {filteredSchools.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <i className="fa-solid fa-school text-slate-400 text-3xl mb-2"></i>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tidak ada sekolah yang cocok dengan kata kunci
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik &quot;Tambah Sekolah Baru&quot; untuk mendaftarkan sekolah pembeli Anda.
                </p>
              </div>
            ) : (
              filteredSchools.map((school) => {
                const isActive = school.id === currentSchoolId;
                const studentCount = getStudentCountForSchool(school.id);
                const teacherCount = getTeacherCountForSchool(school.id);
                const schoolAdmins = getSchoolAdmins(school.id);

                return (
                  <div
                    key={school.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 shadow-sm'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <i className="fa-solid fa-building-columns"></i>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 truncate">
                              {school.name}
                            </h3>

                            <button
                              type="button"
                              onClick={() => handleCopyCode(school.code)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer flex items-center gap-1 transition-colors"
                              title="Salin Kode Sekolah"
                            >
                              <span>{school.code}</span>
                              <i
                                className={`fa-solid ${
                                  copiedCode === school.code ? 'fa-check text-emerald-600' : 'fa-copy text-slate-400'
                                }`}
                              ></i>
                            </button>

                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Sedang Aktif di Layar
                              </span>
                            )}

                            {school.id === DEFAULT_PRIMARY_SCHOOL_ID && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                                Sekolah Utama
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {school.address} {school.city ? `• ${school.city}` : ''}
                          </p>

                          <div className="flex flex-wrap items-center gap-3.5 mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-user-graduate text-slate-400"></i>
                              <strong>{studentCount}</strong> Siswa
                            </span>
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-chalkboard-user text-slate-400"></i>
                              <strong>{teacherCount}</strong> Guru/Admin
                            </span>
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-clock text-slate-400"></i>
                              Batas: <strong>{school.lateCutoffTime}</strong>
                            </span>
                            {school.headmasterName && (
                              <span className="flex items-center gap-1">
                                <i className="fa-solid fa-user-tie text-slate-400"></i>
                                Kepsek: <strong>{school.headmasterName}</strong>
                              </span>
                            )}
                            {school.contactPhone && (
                              <span className="flex items-center gap-1">
                                <i className="fa-brands fa-whatsapp text-emerald-500"></i>
                                {school.contactPhone}
                              </span>
                            )}
                          </div>

                          {/* Dedicated Admin School Card Bar */}
                          <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center text-xs shrink-0 font-bold">
                                <i className="fa-solid fa-user-gear"></i>
                              </div>
                              <div className="min-w-0">
                                {schoolAdmins.length > 0 ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                      Admin: {schoolAdmins[0].name}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      {schoolAdmins[0].email}
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                      PIN: {schoolAdmins[0].pin || '1234'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                    Belum ada akun Admin khusus sekolah ini.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {schoolAdmins.length > 0 ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyWhatsAppMessage(
                                        school.name,
                                        school.code,
                                        schoolAdmins[0].name,
                                        schoolAdmins[0].email,
                                        schoolAdmins[0].pin || '1234'
                                      )
                                    }
                                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Salin Kredensial Login untuk dikirim via WA"
                                  >
                                    <i className="fa-brands fa-whatsapp text-emerald-600"></i>
                                    <span>Salin Info Akun</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddAdminModal(school)}
                                    className="px-2 py-1 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Edit atau Reset PIN Admin Sekolah ini"
                                  >
                                    <i className="fa-solid fa-key text-[10px]"></i>
                                    <span>Edit PIN/Admin</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddAdminModal(school)}
                                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                                >
                                  <i className="fa-solid fa-user-plus text-[10px]"></i>
                                  <span>+ Buat Akun Admin</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-1">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => onSelectSchool(school.id)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            <span>Buka Sekolah Ini</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold">
                            Aktif
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditForm(school)}
                          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                          title="Edit Info Sekolah"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>

                        {school.id !== DEFAULT_PRIMARY_SCHOOL_ID && (
                          <button
                            type="button"
                            disabled={deletingId === school.id}
                            onClick={() => handleDelete(school.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            title="Hapus Sekolah"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-indigo-500"></i>
            <span>
              Setiap sekolah beroperasi mandiri dengan admin, guru, murid, dan kartu QR masing-masing.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {/* ==================================================================== */}
        {/* SUB-MODAL 1: SUCCESS CREDENTIAL CARD POPUP FOR WHATSAPP SHARING */}
        {/* ==================================================================== */}
        {createdSchoolCreds && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-sm">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Sekolah & Akun Admin Berhasil Dibuat!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Salin atau kirim informasi login ini langsung kepada <strong>Kepala Sekolah / Operator</strong> via WhatsApp agar mereka dapat mulai menambahkan guru dan siswa secara mandiri.
                </p>
              </div>

              {/* Credential Card Display */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 font-sans font-semibold">Nama Sekolah:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 font-sans truncate max-w-[220px]">
                    {createdSchoolCreds.schoolName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 font-sans font-semibold">Kode Sekolah:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {createdSchoolCreds.schoolCode}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 font-sans font-semibold">Nama Admin:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 font-sans truncate max-w-[220px]">
                    {createdSchoolCreds.adminName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 font-sans font-semibold">Email Login:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {createdSchoolCreds.adminEmail}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans font-semibold">PIN Login:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 text-sm tracking-widest">
                    {createdSchoolCreds.adminPin}
                  </span>
                </div>
              </div>

              {copiedCredsNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
                  <i className="fa-solid fa-check"></i>
                  <span>Format WhatsApp Berhasil Disalin ke Clipboard!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyWhatsAppMessage(
                      createdSchoolCreds.schoolName,
                      createdSchoolCreds.schoolCode,
                      createdSchoolCreds.adminName,
                      createdSchoolCreds.adminEmail,
                      createdSchoolCreds.adminPin
                    )
                  }
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>Salin Pesan Format WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenWhatsAppDirect(
                        createdSchoolCreds.schoolName,
                        createdSchoolCreds.schoolCode,
                        createdSchoolCreds.adminName,
                        createdSchoolCreds.adminEmail,
                        createdSchoolCreds.adminPin,
                        createdSchoolCreds.phone
                      )
                    }
                    className="py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <i className="fa-brands fa-whatsapp text-sm"></i>
                    <span>Kirim via WA Langsung</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectSchool(createdSchoolCreds.schoolId);
                      setCreatedSchoolCreds(null);
                    }}
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>Buka Sekolah Ini</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCreatedSchoolCreds(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors mt-1"
                >
                  Selesai / Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SUB-MODAL 2: QUICK CREATE / EDIT ADMIN FOR AN EXISTING SCHOOL */}
        {/* ==================================================================== */}
        {adminModalSchool && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                    <i className="fa-solid fa-user-shield"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Kelola Akun Admin Sekolah
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                      {adminModalSchool.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAdminModalSchool(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {adminModalError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                  <span>{adminModalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveAdminModal} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Admin / Kepala Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                    placeholder="Contoh: Drs. H. Mulyadi, M.Pd"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      NIP Admin (Opsional)
                    </label>
                    <input
                      type="text"
                      value={adminFormData.nip}
                      onChange={(e) => setAdminFormData({ ...adminFormData, nip: e.target.value })}
                      placeholder="NIP..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      PIN Login <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminModalPin ? 'text' : 'password'}
                        required
                        maxLength={16}
                        value={adminFormData.pin}
                        onChange={(e) => setAdminFormData({ ...adminFormData, pin: e.target.value })}
                        placeholder="1234"
                        className="w-full pl-7 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-amber-800 dark:text-amber-300 focus:outline-none focus:border-indigo-500"
                      />
                      <i className="fa-solid fa-key absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                      <button
                        type="button"
                        onClick={() => setShowAdminModalPin(!showAdminModalPin)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <i className={`fa-solid ${showAdminModalPin ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Login Admin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    placeholder="admin.sekolah@sekolah.sch.id"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan / Bagian
                  </label>
                  <input
                    type="text"
                    value={adminFormData.subject}
                    onChange={(e) => setAdminFormData({ ...adminFormData, subject: e.target.value })}
                    placeholder="Kepala Sekolah & Administrator / Operator"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAdminModalSchool(null)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isAdminSaving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAdminSaving ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Simpan Akun Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
