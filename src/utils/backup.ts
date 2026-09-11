import { AttendanceRecord, School, Student, SystemSettings, Teacher } from '../types';

/**
 * Export full application database to a JSON backup file
 */
export const exportFullBackupJSON = (
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  settings: SystemSettings,
  teachers: Teacher[],
  schools?: School[]
) => {
  const backupData = {
    app: 'Aplikasi Absensi QR Code Siswa SD',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    schools: schools || [],
    students,
    attendanceRecords,
    settings,
    teachers,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Backup_Database_Absensi_SD_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
