export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';

export type Gender = 'Laki-laki' | 'Perempuan';

export interface School {
  id: string; // unique slug e.g. 'sd-inpres-2-ulatan', 'sdn-1-banggai'
  code: string; // unique short code e.g. 'ULATAN2', 'SDN1BGI'
  name: string; // e.g. 'SD INPRES 2 ULATAN'
  address: string;
  city?: string;
  academicYear: string;
  lateCutoffTime: string; // e.g. '07:00'
  headmasterName?: string;
  headmasterNip?: string;
  logoUrl?: string;
  iihhBeresDatabaseId?: string; // Optional custom e-Rapor database ID for this school
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
  notes?: string;
}

export interface Student {
  id: string;
  schoolId?: string; // Multi-tenant school scope (defaults to 'sd-inpres-2-ulatan')
  nis: string;
  nisn?: string;
  name: string;
  classRoom: string;
  gender: Gender;
  parentPhone: string;
  avatarUrl: string;
  photo?: string; // Base64 encoded string or image URL
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId?: string; // Multi-tenant school scope
  studentId: string;
  nis: string;
  studentName: string;
  classRoom: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: AttendanceStatus;
  note?: string;
  scannedVia: 'QR Camera' | 'Manual Input' | 'Simulator';
  teacherId?: string;
  teacherName?: string;
  teacherRole?: 'admin' | 'guru';
  teacherType?: TeacherType;
  teacherSubject?: string;
}

export interface SystemSettings {
  schoolId?: string;
  lateCutoffTime: string; // e.g. "07:00"
  schoolName: string;
  schoolAddress: string;
  academicYear: string;
  headmasterName?: string; // e.g. "Drs. H. Mulyadi, M.Pd"
  headmasterNip?: string; // e.g. "19680512 199403 1 005"
  schoolCity?: string; // e.g. "Jakarta"
  announcementTitle?: string;
  announcementContent?: string;
  announcementVersion?: string;
  announcementDate?: string;
  announcementActive?: boolean;
}

export interface QRPayload {
  app: string;
  nis: string;
  name: string;
  classRoom: string;
}

export type ActiveTab = 'dashboard' | 'scanner' | 'students' | 'simulator';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export const SUPER_ADMIN_EMAIL = 'fadli46046@gmail.com';

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
};

export type TeacherType = 'admin' | 'wali_kelas' | 'guru_mapel';

export interface Teacher {
  id: string;
  schoolId?: string; // Multi-tenant school scope
  name: string;
  email: string;
  pin?: string; // 4-6 digit login PIN for teachers/school admin
  nip?: string;
  subject: string; // e.g. "IPA", "Matematika", "Bahasa Indonesia", "Kurikulum & Administrasi"
  role: 'admin' | 'guru';
  teacherType: TeacherType;
  homeroomClass?: string; // e.g. "Kelas 1", "Kelas 2" (wajib diisi untuk wali_kelas)
}

export type LeaveType = 'Izin' | 'Sakit' | 'Dispensasi';

export interface ScheduledLeave {
  id: string;
  schoolId?: string; // Multi-tenant school scope
  studentId: string;
  nis: string;
  studentName: string;
  classRoom: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  attachmentPhoto?: string; // Base64 or image URL (surat dokter / surat izin)
  createdAt: string;
  recordedBy?: string;
  status: 'Aktif' | 'Selesai' | 'Dibatalkan';
}

export type BehaviorType = 'positive' | 'negative' | 'neutral';

export interface BehaviorLog {
  id: string;
  schoolId?: string; // Multi-tenant school scope
  studentId: string;
  nis: string;
  studentName: string;
  classRoom: string;
  date: string; // YYYY-MM-DD
  type: BehaviorType;
  category: string; // e.g. 'Kedisiplinan', 'Kerapihan', 'Prestasi', 'Sikap / Karakter', 'Lainnya'
  title: string; // e.g. 'Seragam Rapi Lengkap', 'Juara Lomba Matematika', 'Terlambat Masuk'
  points: number; // e.g. +5, +10, -5, -10, 0
  description: string;
  recordedBy: string; // Teacher or Admin name
  createdAt: string;
}

export interface ERaporKehadiran {
  sakit: number;
  izin: number;
  tanpaKeterangan: number;
}

export interface ERaporRecapDoc {
  nisn: string;
  namaSiswa: string;
  kelas: string;
  semester: number; // 1 | 2
  tahunAjaran: string; // e.g. "2024/2025"
  sakit: number;
  izin: number;
  tanpaKeterangan: number;
  kehadiran: ERaporKehadiran;
  updatedAt: string; // ISO_TIMESTAMP
  schoolId?: string;
  tipePeriode?: 'semester' | 'bulanan' | 'rentang_tanggal';
  periodeLabel?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  bulan?: string;
}


