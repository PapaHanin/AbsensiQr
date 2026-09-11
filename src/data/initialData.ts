import { Student, AttendanceRecord, AttendanceStatus, SystemSettings, Teacher, School } from '../types';
import { MALE_BW_AVATAR, FEMALE_BW_AVATAR } from '../utils/avatars';

export const DEFAULT_PRIMARY_SCHOOL_ID = 'sd-inpres-2-ulatan';

export const INITIAL_SCHOOLS: School[] = [
  {
    id: 'sd-inpres-2-ulatan',
    code: 'ULATAN2',
    name: 'SD INPRES 2 ULATAN',
    address: 'Desa Ulatan, Kec. Muara Samu, Kab. Paser, Kalimantan Timur',
    city: 'Paser',
    academicYear: '2025/2026',
    lateCutoffTime: '07:00',
    headmasterName: 'Drs. H. Mulyadi, M.Pd',
    headmasterNip: '19680512 199403 1 005',
    iihhBeresDatabaseId: 'ai-studio-iihhberes2ulatan-4d8d204c-3913-4c1d-8f70-4cdb00f5a9a0',
    contactEmail: 'Fadli46046@gmail.com',
    contactPhone: '081234567890',
    isActive: true,
    createdAt: '2025-01-01',
    notes: 'Sekolah Induk / Utama (SD Inpres 2 Ulatan)',
  },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  schoolId: DEFAULT_PRIMARY_SCHOOL_ID,
  lateCutoffTime: '07:00',
  schoolName: 'SD INPRES 2 ULATAN',
  schoolAddress: 'Desa Ulatan, Kec. Muara Samu, Kab. Paser, Kalimantan Timur',
  academicYear: '2025/2026',
  headmasterName: 'Drs. H. Mulyadi, M.Pd',
  headmasterNip: '19680512 199403 1 005',
  schoolCity: 'Paser',
  schoolRegency: 'PEMERINTAH KABUPATEN PASER',
  schoolDepartment: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  cardTitle: 'KARTU TANDA SISWA & PRESENSI DIGITAL',
  cardValidityText: 'KARTU RESMI PELAJAR • BERLAKU SELAMA MENJADI SISWA',
};

export const SD_CLASSES = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

// Alias for backwards compatibility
export const SMP_CLASSES = SD_CLASSES;

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tch-admin',
    name: 'MOH. FADLI',
    nip: '199903202025211020',
    email: 'Fadli46046@gmail.com',
    pin: 'Hanin231221',
    subject: 'Administrator Sekolah',
    role: 'admin',
    teacherType: 'admin',
  },
];

export const INITIAL_STUDENTS: Student[] = [];

export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateInitialAttendance = (_todayStr: string): AttendanceRecord[] => {
  return [];
};

