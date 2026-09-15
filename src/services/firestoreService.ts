import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  getIIHHBeresFirestoreInstance,
  getCustomIIHHBeresDatabaseId,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { Student, AttendanceRecord, SystemSettings, Teacher, ScheduledLeave, BehaviorLog, ERaporRecapDoc, School } from '../types';
import { CloudSyncPayload } from '../utils/cloudSync';
import { INITIAL_SCHOOLS, DEFAULT_PRIMARY_SCHOOL_ID } from '../data/initialData';

/**
 * Sanitizes an object by recursively stripping undefined values,
 * preventing Firestore "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean as T;
}

// Collection Names
export const COLLECTIONS = {
  SCHOOLS: 'schools',
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  TEACHERS: 'teachers',
  SETTINGS: 'settings',
  CLOUD_SYNC: 'cloud_sync',
  LEAVES: 'leaves',
  BEHAVIOR_LOGS: 'behavior_logs',
  REKAP_ABSENSI_ULATAN: 'rekap_absensi_ulatan',
};

/**
 * Subscribes to real-time updates for Schools (Multi-Sekolah)
 */
export function subscribeToSchools(
  onUpdate: (schools: School[]) => void,
  onError?: (err: any) => void
) {
  const path = COLLECTIONS.SCHOOLS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: School[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as School);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`Firestore real-time subscription notice (${path}):`, error?.message || error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves or updates a school in Firestore
 */
export async function saveSchoolToFirestore(school: School): Promise<void> {
  const path = `${COLLECTIONS.SCHOOLS}/${school.id}`;
  try {
    const docRef = doc(db, COLLECTIONS.SCHOOLS, school.id);
    await setDoc(docRef, sanitizeForFirestore(school), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a school from Firestore
 */
export async function deleteSchoolFromFirestore(schoolId: string): Promise<void> {
  const path = `${COLLECTIONS.SCHOOLS}/${schoolId}`;
  try {
    const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Seeds initial school (SD Inpres 2 Ulatan) if schools collection is empty
 */
export async function seedInitialSchoolsIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.SCHOOLS));
    if (snap.empty) {
      console.log('Seeding initial schools to Firestore...');
      for (const school of INITIAL_SCHOOLS) {
        await saveSchoolToFirestore(school);
      }
    }
  } catch (err) {
    console.warn('Could not check or seed schools (running in offline/local fallback mode):', err);
  }
}

/**
 * Fetches all students directly from Firestore once
 */
export async function fetchAllStudentsFromFirestore(): Promise<Student[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.STUDENTS));
    const items: Student[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as Student);
    });
    return items;
  } catch (error) {
    console.warn('fetchAllStudentsFromFirestore notice:', error);
    return [];
  }
}

/**
 * Subscribes to real-time updates for Students
 */
export function subscribeToStudents(
  onUpdate: (students: Student[]) => void,
  onError?: (err: any) => void
) {
  const path = COLLECTIONS.STUDENTS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Student[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Student);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`Firestore real-time subscription notice (${path}):`, error?.message || error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves or updates a single student in Firestore
 */
export async function saveStudentToFirestore(student: Student): Promise<void> {
  const path = `${COLLECTIONS.STUDENTS}/${student.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), sanitizeForFirestore(student));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a single student from Firestore
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const path = `${COLLECTIONS.STUDENTS}/${studentId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Bulk deletes multiple students from Firestore in a batch
 */
export async function bulkDeleteStudentsFromFirestore(studentIds: string[]): Promise<void> {
  const path = COLLECTIONS.STUDENTS;
  try {
    const batch = writeBatch(db);
    studentIds.forEach((id) => {
      batch.delete(doc(db, COLLECTIONS.STUDENTS, id));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Bulk saves or overwrites students in Firestore in safe small chunks with merge
 */
export async function syncAllStudentsToFirestore(students: Student[]): Promise<void> {
  const path = COLLECTIONS.STUDENTS;
  try {
    const validStudents = students.filter((s) => s && typeof s.id === 'string' && s.id.trim() !== '');
    const CHUNK_SIZE = 50; // 50 items prevents exceeding Firestore 10MB batch write limit when photos are present
    for (let i = 0; i < validStudents.length; i += CHUNK_SIZE) {
      const chunk = validStudents.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((std) => {
        const ref = doc(db, COLLECTIONS.STUDENTS, std.id);
        batch.set(ref, sanitizeForFirestore(std), { merge: true });
      });
      try {
        await batch.commit();
      } catch (chunkErr) {
        console.warn(`Firestore batch commit notice for students chunk ${i}-${i + chunk.length}:`, chunkErr);
      }
    }
  } catch (error) {
    console.warn('syncAllStudentsToFirestore notice:', error);
  }
}

/**
 * Bulk saves attendance records in safe chunks
 */
export async function syncAllAttendanceToFirestore(records: AttendanceRecord[]): Promise<void> {
  const path = COLLECTIONS.ATTENDANCE;
  try {
    const validRecords = records.filter((r) => r && typeof r.id === 'string' && r.id.trim() !== '');
    const CHUNK_SIZE = 100;
    for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((att) => {
        const ref = doc(db, COLLECTIONS.ATTENDANCE, att.id);
        batch.set(ref, sanitizeForFirestore(att), { merge: true });
      });
      try {
        await batch.commit();
      } catch (chunkErr) {
        console.warn(`Firestore batch commit notice for attendance chunk ${i}-${i + chunk.length}:`, chunkErr);
      }
    }
  } catch (error) {
    console.warn('syncAllAttendanceToFirestore notice:', error);
  }
}

/**
 * Bulk saves teachers in safe chunks with merge
 */
export async function syncAllTeachersToFirestore(teachers: Teacher[]): Promise<void> {
  const path = COLLECTIONS.TEACHERS;
  try {
    const validTeachers = teachers.filter((t) => t && typeof t.id === 'string' && t.id.trim() !== '');
    const CHUNK_SIZE = 50;
    for (let i = 0; i < validTeachers.length; i += CHUNK_SIZE) {
      const chunk = validTeachers.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((t) => {
        const ref = doc(db, COLLECTIONS.TEACHERS, t.id);
        batch.set(ref, sanitizeForFirestore(t), { merge: true });
      });
      try {
        await batch.commit();
      } catch (chunkErr) {
        console.warn(`Firestore batch commit notice for teachers chunk ${i}-${i + chunk.length}:`, chunkErr);
      }
    }
  } catch (error) {
    console.warn('syncAllTeachersToFirestore notice:', error);
  }
}

/**
 * Fetches all attendance records directly from Firestore once
 */
export async function fetchAllAttendanceFromFirestore(): Promise<AttendanceRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ATTENDANCE));
    const items: AttendanceRecord[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as AttendanceRecord);
    });
    return items;
  } catch (error) {
    console.warn('fetchAllAttendanceFromFirestore notice:', error);
    return [];
  }
}

/**
 * Subscribes to real-time updates for Attendance Records
 */
export function subscribeToAttendance(
  onUpdate: (records: AttendanceRecord[]) => void,
  onError?: (err: any) => void
) {
  const path = COLLECTIONS.ATTENDANCE;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AttendanceRecord);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`Firestore real-time subscription notice (${path}):`, error?.message || error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves a single attendance record
 */
export async function saveAttendanceToFirestore(record: AttendanceRecord): Promise<void> {
  const path = `${COLLECTIONS.ATTENDANCE}/${record.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, record.id), sanitizeForFirestore(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a single attendance record
 */
export async function deleteAttendanceFromFirestore(recordId: string): Promise<void> {
  const path = `${COLLECTIONS.ATTENDANCE}/${recordId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetches all teachers directly from Firestore once
 */
export async function fetchAllTeachersFromFirestore(): Promise<Teacher[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.TEACHERS));
    const items: Teacher[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as Teacher);
    });
    return items;
  } catch (error) {
    console.warn('fetchAllTeachersFromFirestore notice:', error);
    return [];
  }
}

/**
 * Subscribes to real-time updates for Teachers
 */
export function subscribeToTeachers(
  onUpdate: (teachers: Teacher[]) => void,
  onError?: (err: any) => void
) {
  const path = COLLECTIONS.TEACHERS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Teacher[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Teacher);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`Firestore real-time subscription notice (${path}):`, error?.message || error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves a teacher to Firestore
 */
export async function saveTeacherToFirestore(teacher: Teacher): Promise<void> {
  const path = `${COLLECTIONS.TEACHERS}/${teacher.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.TEACHERS, teacher.id), sanitizeForFirestore(teacher));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a teacher from Firestore
 */
export async function deleteTeacherFromFirestore(teacherId: string): Promise<void> {
  const path = `${COLLECTIONS.TEACHERS}/${teacherId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.TEACHERS, teacherId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to System Settings
 */
export function subscribeToSettings(
  onUpdate: (settings: SystemSettings) => void,
  onError?: (err: any) => void
) {
  const path = `${COLLECTIONS.SETTINGS}/school`;
  return onSnapshot(
    doc(db, COLLECTIONS.SETTINGS, 'school'),
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as SystemSettings);
      }
    },
    (error) => {
      console.warn(`Firestore real-time subscription notice (${path}):`, error?.message || error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves System Settings to Firestore.
 * Saves to dedicated document per school (settings/{schoolId}), and also maintains
 * legacy settings/school for the default primary school (Ulatan) for backward-compatibility.
 */
export async function saveSettingsToFirestore(settings: SystemSettings, schoolId?: string): Promise<void> {
  const targetId = schoolId || settings.schoolId || 'school';
  const path = `${COLLECTIONS.SETTINGS}/${targetId}`;
  const payload = sanitizeForFirestore({ ...settings, schoolId: targetId });
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, targetId), payload);
    if (targetId === DEFAULT_PRIMARY_SCHOOL_ID || targetId === 'school') {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'school'), payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Cloud Sync Snapshots to Firestore
 */
export async function saveCloudSyncToFirestore(payload: CloudSyncPayload): Promise<void> {
  const cleanCode = payload.syncCode.trim().toUpperCase();
  const path = `${COLLECTIONS.CLOUD_SYNC}/${cleanCode}`;
  try {
    await setDoc(doc(db, COLLECTIONS.CLOUD_SYNC, cleanCode), sanitizeForFirestore(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches a Cloud Sync Snapshot from Firestore
 */
export async function fetchCloudSyncFromFirestore(syncCode: string): Promise<CloudSyncPayload | null> {
  const cleanCode = syncCode.trim().toUpperCase();
  const path = `${COLLECTIONS.CLOUD_SYNC}/${cleanCode}`;
  try {
    // Direct document fetch first
    const docSnap = await getDoc(doc(db, COLLECTIONS.CLOUD_SYNC, cleanCode));
    if (docSnap.exists()) {
      return docSnap.data() as CloudSyncPayload;
    }

    // Fallback search across collection
    const snapshot = await getDocs(collection(db, COLLECTIONS.CLOUD_SYNC));
    let found: CloudSyncPayload | null = null;
    snapshot.forEach((d) => {
      if (d.id === cleanCode || (d.data() as CloudSyncPayload).syncCode === cleanCode) {
        found = d.data() as CloudSyncPayload;
      }
    });
    return found;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribes to real-time updates for Scheduled Leaves
 */
export function subscribeToLeaves(
  onUpdate: (leaves: ScheduledLeave[]) => void,
  onError?: (err: any) => void
) {
  const path = COLLECTIONS.LEAVES;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: ScheduledLeave[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ScheduledLeave);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`Firestore real-time subscription notice (${path}):`, error?.message || error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves a scheduled leave to Firestore
 */
export async function saveLeaveToFirestore(leave: ScheduledLeave): Promise<void> {
  const path = `${COLLECTIONS.LEAVES}/${leave.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.LEAVES, leave.id), sanitizeForFirestore(leave));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a scheduled leave from Firestore
 */
export async function deleteLeaveFromFirestore(leaveId: string): Promise<void> {
  const path = `${COLLECTIONS.LEAVES}/${leaveId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.LEAVES, leaveId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to real-time updates for Student Behavior Logs
 */
export function subscribeToBehaviorLogs(
  onUpdate: (logs: BehaviorLog[]) => void,
  onError?: (err: any) => void
) {
  const path = COLLECTIONS.BEHAVIOR_LOGS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: BehaviorLog[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as BehaviorLog);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`Firestore real-time subscription notice (${path}):`, error?.message || error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves a behavior log to Firestore
 */
export async function saveBehaviorLogToFirestore(log: BehaviorLog): Promise<void> {
  const path = `${COLLECTIONS.BEHAVIOR_LOGS}/${log.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.BEHAVIOR_LOGS, log.id), sanitizeForFirestore(log));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a behavior log from Firestore
 */
export async function deleteBehaviorLogFromFirestore(logId: string): Promise<void> {
  const path = `${COLLECTIONS.BEHAVIOR_LOGS}/${logId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.BEHAVIOR_LOGS, logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Seeds initial database data if Firestore is currently completely empty
 */
export async function seedInitialFirestoreDataIfEmpty(
  initialStudents: Student[],
  initialTeachers: Teacher[],
  defaultSettings: SystemSettings,
  initialAttendance: AttendanceRecord[]
): Promise<void> {
  try {
    const studentsSnap = await getDocs(collection(db, COLLECTIONS.STUDENTS));
    if (studentsSnap.empty) {
      console.log('Seeding initial students to Firestore...');
      const batch = writeBatch(db);
      initialStudents.forEach((std) => {
        batch.set(doc(db, COLLECTIONS.STUDENTS, std.id), std);
      });
      initialTeachers.forEach((tch) => {
        batch.set(doc(db, COLLECTIONS.TEACHERS, tch.id), tch);
      });
      batch.set(doc(db, COLLECTIONS.SETTINGS, 'school'), defaultSettings);
      initialAttendance.forEach((att) => {
        batch.set(doc(db, COLLECTIONS.ATTENDANCE, att.id), att);
      });
      await batch.commit();
      console.log('Initial Firestore database seeded successfully!');
    }
  } catch (error) {
    console.warn('Could not check or seed Firestore (running in offline/local fallback mode):', error);
  }
}

/**
 * Generates an idempotent, valid document ID for rekap_absensi_ulatan using student's NISN.
 * Stores document in 'rekap_absensi_ulatan' with document ID = NISN siswa.
 */
export function generateERaporDocId(nisn: string, semester?: number, tahunAjaran?: string): string {
  const cleanNisn = (nisn || '').trim();
  if (cleanNisn) {
    return cleanNisn;
  }
  // Fallback only if student has no NISN filled yet
  const cleanTahun = (tahunAjaran || 'default').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  return `no_nisn_sem${semester || 1}_${cleanTahun}`;
}

/**
 * Builds the exact document payload requested for e-Rapor Merdeka (iihh Beres):
 * {
 *   nisn: "0012345678",
 *   namaSiswa: "Nama Siswa",
 *   kelas: "Kelas 4",
 *   semester: 1,
 *   tahunAjaran: "2024/2025",
 *   sakit: 2,
 *   izin: 1,
 *   tanpaKeterangan: 0,
 *   kehadiran: { sakit: 2, izin: 1, tanpaKeterangan: 0 },
 *   updatedAt: ISO_STRING
 * }
 */
export function buildERaporPayload(recap: ERaporRecapDoc) {
  const sakit = Number(recap.sakit ?? recap.kehadiran?.sakit) || 0;
  const izin = Number(recap.izin ?? recap.kehadiran?.izin) || 0;
  const tanpaKeterangan = Number(recap.tanpaKeterangan ?? recap.kehadiran?.tanpaKeterangan) || 0;

  const payload: Record<string, any> = {
    nisn: String(recap.nisn || '').trim(),
    namaSiswa: recap.namaSiswa,
    kelas: recap.kelas,
    semester: Number(recap.semester) || 1,
    tahunAjaran: recap.tahunAjaran,
    sakit,
    izin,
    tanpaKeterangan,
    kehadiran: {
      sakit,
      izin,
      tanpaKeterangan,
    },
    updatedAt: recap.updatedAt || new Date().toISOString(),
  };

  if (recap.tipePeriode) payload.tipePeriode = recap.tipePeriode;
  if (recap.periodeLabel) payload.periodeLabel = recap.periodeLabel;
  if (recap.tanggalMulai) payload.tanggalMulai = recap.tanggalMulai;
  if (recap.tanggalSelesai) payload.tanggalSelesai = recap.tanggalSelesai;
  if (recap.bulan) payload.bulan = recap.bulan;
  if (recap.schoolId) payload.schoolId = recap.schoolId;

  return sanitizeForFirestore(payload);
}

/**
 * Builds student profile payload for syncing to e-Rapor (iihh Beres) database
 * Populates bilingual & alternate fields (nama / namaSiswa / name, kelas / classRoom, etc.)
 * so the e-Rapor app immediately recognizes all student fields.
 */
export function buildERaporStudentPayload(student: Partial<Student>, recap?: ERaporRecapDoc) {
  const cleanNisn = String(recap?.nisn || student.nisn || student.nis || student.id || '').trim();
  const namaSiswa = recap?.namaSiswa || student.name || 'Siswa';
  const kelas = recap?.kelas || student.classRoom || 'Kelas 1';
  const timestamp = new Date().toISOString();

  // Extract class number and roman numerals for maximum compatibility with e-Rapor
  const classNumMatch = kelas.match(/\d+/);
  const classNumber = classNumMatch ? parseInt(classNumMatch[0], 10) : 1;
  const romawiMap: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' };
  const kelasRomawi = romawiMap[classNumber] || String(classNumber);

  return sanitizeForFirestore({
    id: student.id || cleanNisn,
    nis: student.nis || '',
    nisn: cleanNisn,
    name: namaSiswa,
    nama: namaSiswa,
    namaSiswa: namaSiswa,
    classRoom: kelas,
    kelas: kelas,
    rombel: kelas,
    tingkat: classNumber,
    tingkatPendidikan: classNumber,
    romawi: kelasRomawi,
    gender: student.gender || 'Laki-laki',
    jenisKelamin: student.gender || 'Laki-laki',
    parentPhone: student.parentPhone || '',
    noHpOrtu: student.parentPhone || '',
    avatarUrl: student.avatarUrl || '',
    photo: student.photo || student.avatarUrl || '',
    updatedAt: timestamp,
    createdAt: student.createdAt || timestamp,
  });
}

/**
 * Saves a single e-Rapor recap document to Firestore collection `rekap_absensi_ulatan`
 * Writes to user's configured IIH Beres Ulatan database (if set) and always to SD Inpres 2 Ulatan local database.
 */
export async function saveERaporRecapToFirestore(recap: ERaporRecapDoc, student?: Student): Promise<void> {
  const docId = generateERaporDocId(recap.nisn, recap.semester, recap.tahunAjaran);
  const path = `${COLLECTIONS.REKAP_ABSENSI_ULATAN}/${docId}`;
  const payload = buildERaporPayload(recap);
  const studentPayload = buildERaporStudentPayload(student || { id: docId, name: recap.namaSiswa, classRoom: recap.kelas }, recap);

  try {
    const targetDb = getIIHHBeresFirestoreInstance();

    // If a dedicated IIH Beres Ulatan database is configured by the user, write there:
    if (targetDb) {
      try {
        await setDoc(doc(targetDb, COLLECTIONS.REKAP_ABSENSI_ULATAN, docId), payload);
        await setDoc(doc(targetDb, COLLECTIONS.STUDENTS, docId), studentPayload);
        await setDoc(doc(targetDb, 'data_siswa', docId), studentPayload);
        if (student?.id && student.id !== docId) {
          await setDoc(doc(targetDb, COLLECTIONS.STUDENTS, student.id), studentPayload);
        }
      } catch (externalErr) {
        console.warn('Note on syncing to external IIH Beres database:', externalErr);
      }
    }

    // Always write to SD Inpres 2 Ulatan local Firestore
    await setDoc(doc(db, COLLECTIONS.REKAP_ABSENSI_ULATAN, docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Bulk uploads student attendance recaps to Firestore collection `rekap_absensi_ulatan`
 * and ALSO syncs student identity records.
 * If target IIH Beres database is disconnected, safely saves into SD Inpres 2 Ulatan local Firestore.
 */
export async function batchSyncERaporRecapsToFirestore(
  recaps: ERaporRecapDoc[],
  studentsList?: Student[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; count: number; studentCount: number; destinationDb: string; isConnectedToIIHBeres: boolean }> {
  const targetDb = getIIHHBeresFirestoreInstance();
  const targetDbId = getCustomIIHHBeresDatabaseId();
  const destinationName = targetDb ? targetDbId : 'SD Inpres 2 Ulatan (Database Mandiri)';

  if (recaps.length === 0) {
    return {
      success: true,
      count: 0,
      studentCount: 0,
      destinationDb: destinationName,
      isConnectedToIIHBeres: !!targetDb,
    };
  }

  const path = COLLECTIONS.REKAP_ABSENSI_ULATAN;
  try {
    const studentMap = new Map<string, Student>();
    studentsList?.forEach((s) => {
      if (s.id) studentMap.set(s.id, s);
      if (s.nis) studentMap.set(s.nis, s);
      if (s.nisn) studentMap.set(s.nisn, s);
    });

    const CHUNK_SIZE = 40;
    let completedCount = 0;

    for (let i = 0; i < recaps.length; i += CHUNK_SIZE) {
      const chunk = recaps.slice(i, i + CHUNK_SIZE);
      
      const localBatch = writeBatch(db);
      const targetBatch = targetDb ? writeBatch(targetDb) : null;

      for (const recap of chunk) {
        const docId = generateERaporDocId(recap.nisn, recap.semester, recap.tahunAjaran);
        const payload = buildERaporPayload(recap);

        // 1. Attendance Recap Doc to 'rekap_absensi_ulatan'
        const localRecapRef = doc(db, COLLECTIONS.REKAP_ABSENSI_ULATAN, docId);
        localBatch.set(localRecapRef, payload);

        if (targetBatch && targetDb) {
          const targetRecapRef = doc(targetDb, COLLECTIONS.REKAP_ABSENSI_ULATAN, docId);
          targetBatch.set(targetRecapRef, payload);
        }

        // 2. Student Data Doc
        const matchedStudent = studentMap.get(recap.nisn) || studentMap.get(docId) || undefined;
        const studentPayload = buildERaporStudentPayload(
          matchedStudent || { id: docId, name: recap.namaSiswa, classRoom: recap.kelas },
          recap
        );

        if (targetBatch && targetDb) {
          const targetStudentRef = doc(targetDb, COLLECTIONS.STUDENTS, docId);
          targetBatch.set(targetStudentRef, studentPayload);

          const targetDataSiswaRef = doc(targetDb, 'data_siswa', docId);
          targetBatch.set(targetDataSiswaRef, studentPayload);
        }
      }

      // Commit batches
      const promises: Promise<any>[] = [localBatch.commit()];
      if (targetBatch) {
        promises.push(
          targetBatch.commit().catch((targetErr) => {
            console.warn('Target IIH Beres commit note:', targetErr);
          })
        );
      }

      await Promise.allSettled(promises);

      completedCount += chunk.length;
      if (onProgress) {
        onProgress(completedCount, recaps.length);
      }
    }

    return {
      success: true,
      count: completedCount,
      studentCount: completedCount,
      destinationDb: destinationName,
      isConnectedToIIHBeres: !!targetDb,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches all student recap records currently in `rekap_absensi_ulatan`
 */
export async function fetchERaporRecapsFromFirestore(): Promise<ERaporRecapDoc[]> {
  const path = COLLECTIONS.REKAP_ABSENSI_ULATAN;
  try {
    const targetDb = getIIHHBeresFirestoreInstance();
    let snap;
    if (targetDb) {
      try {
        snap = await getDocs(collection(targetDb, path));
      } catch {
        snap = await getDocs(collection(db, path));
      }
    } else {
      snap = await getDocs(collection(db, path));
    }

    const list: ERaporRecapDoc[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as ERaporRecapDoc);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Fetches all student profiles stored in e-Rapor target database or local database
 */
export async function fetchERaporStudentsFromFirestore(): Promise<any[]> {
  const path = COLLECTIONS.STUDENTS;
  try {
    const targetDb = getIIHHBeresFirestoreInstance();
    let snap;
    if (targetDb) {
      try {
        snap = await getDocs(collection(targetDb, path));
      } catch {
        snap = await getDocs(collection(db, path));
      }
    } else {
      snap = await getDocs(collection(db, path));
    }

    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

