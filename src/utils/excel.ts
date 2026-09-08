import * as XLSX from 'xlsx';
import { Student } from '../types';

/**
 * Downloads a true Excel (.xlsx) template for bulk student import
 * Headers: NIS, Nama, Kelas, No HP Orang Tua
 */
export const downloadStudentImportTemplateExcel = (className: string = 'Kelas 1') => {
  const templateData = [
    {
      'NIS': '1001',
      'Nama': 'Ahmad Fauzi',
      'Kelas': className,
      'Jenis Kelamin': 'Laki-laki',
      'No HP Orang Tua': '081234567890',
    },
    {
      'NIS': '1002',
      'Nama': 'Anisa Rahmawati',
      'Kelas': className,
      'Jenis Kelamin': 'Perempuan',
      'No HP Orang Tua': '081234567891',
    },
    {
      'NIS': '1003',
      'Nama': 'Budi Santoso',
      'Kelas': className,
      'Jenis Kelamin': 'Laki-laki',
      'No HP Orang Tua': '081234567892',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // NIS
    { wch: 28 }, // Nama
    { wch: 12 }, // Kelas
    { wch: 16 }, // Jenis Kelamin
    { wch: 20 }, // No HP Orang Tua
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Template_Import_Siswa_SD_${className.replace(/\s+/g, '_')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Reads and parses an uploaded Excel file (.xls, .xlsx) and extracts student records.
 * Validates columns: NIS, Nama, Kelas, No HP Orang Tua
 */
export const parseStudentExcelFile = async (
  file: File,
  defaultClass: string,
  existingStudents: Student[]
): Promise<{ students: Student[]; errors: string[]; addedCount: number }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({ students: [], errors: ['File Excel tidak memiliki lembar kerja (worksheet).'], addedCount: 0 });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        // Convert sheet to 2D array of raw values
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length < 2) {
          resolve({
            students: [],
            errors: ['File Excel kosong atau hanya memiliki baris judul/header.'],
            addedCount: 0,
          });
          return;
        }

        const headerRow = (rows[0] as any[]).map((col) => String(col).trim().toLowerCase());

        // Validate or map column positions
        let nisIdx = headerRow.findIndex((c) => c.includes('nis'));
        let nameIdx = headerRow.findIndex((c) => c.includes('nama'));
        let classIdx = headerRow.findIndex((c) => c.includes('kelas'));
        let genderIdx = headerRow.findIndex((c) => c.includes('kelamin') || c.includes('gender') || c.includes('jk'));
        let phoneIdx = headerRow.findIndex(
          (c) => c.includes('hp') || c.includes('phone') || c.includes('ortu') || c.includes('telepon') || c.includes('wa')
        );

        // Fallbacks if headers are missing or in default order: NIS (0), Nama (1), Kelas (2), No HP Ortu (3/4)
        if (nisIdx === -1) nisIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (classIdx === -1) classIdx = 2;
        if (genderIdx === -1) genderIdx = 3;
        if (phoneIdx === -1) phoneIdx = headerRow.length >= 5 ? 4 : 3;

        const MALE_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        const FEMALE_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';

        const newStudents: Student[] = [];
        const errors: string[] = [];
        const existingNisSet = new Set(existingStudents.map((s) => s.nis.trim()));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (!row || row.length === 0) continue;

          const rawNis = String(row[nisIdx] ?? '').trim();
          const rawName = String(row[nameIdx] ?? '').trim();
          const rawClass = String(row[classIdx] ?? '').trim() || defaultClass || '1-A';
          let rawGender = String(row[genderIdx] ?? '').trim();
          const rawPhone = String(row[phoneIdx] ?? '').trim();

          // Skip completely empty rows
          if (!rawNis && !rawName) continue;

          if (!rawNis || !rawName) {
            errors.push(`Baris ${i + 1}: NIS dan Nama siswa wajib diisi.`);
            continue;
          }

          if (existingNisSet.has(rawNis)) {
            errors.push(`Baris ${i + 1}: NIS "${rawNis}" (${rawName}) sudah ada di database, dilewati.`);
            continue;
          }

          const gLower = rawGender.toLowerCase();
          let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
          if (gLower.includes('p') || gLower.includes('female') || gLower.includes('wanita')) {
            gender = 'Perempuan';
          }

          const uniqueId = `std-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8)}`;

          const newStudent: Student = {
            id: uniqueId,
            nis: rawNis,
            name: rawName,
            classRoom: rawClass,
            gender: gender,
            parentPhone: rawPhone,
            avatarUrl: gender === 'Perempuan' ? FEMALE_AVATAR : MALE_AVATAR,
            createdAt: new Date().toISOString().split('T')[0],
          };

          existingNisSet.add(rawNis);
          newStudents.push(newStudent);
        }

        resolve({
          students: newStudents,
          errors,
          addedCount: newStudents.length,
        });
      } catch (err: any) {
        resolve({
          students: [],
          errors: ['Gagal membaca file Excel. Pastikan format file .xls atau .xlsx valid.'],
          addedCount: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        students: [],
        errors: ['Terjadi kesalahan saat membaca file dari komputer.'],
        addedCount: 0,
      });
    };

    reader.readAsArrayBuffer(file);
  });
};
