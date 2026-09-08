import React, { useState, useMemo, useEffect } from 'react';
import {
  Student,
  AttendanceRecord,
  SystemSettings,
  ScheduledLeave,
  Teacher,
  ERaporRecapDoc,
} from '../types';
import {
  batchSyncERaporRecapsToFirestore,
  fetchERaporRecapsFromFirestore,
  fetchERaporStudentsFromFirestore,
  buildERaporStudentPayload,
} from '../services/firestoreService';
import {
  getCustomIIHHBeresDatabaseId,
  setCustomIIHHBeresDatabaseId,
} from '../firebase';

interface ERaporSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  scheduledLeaves?: ScheduledLeave[];
  settings: SystemSettings;
  currentTeacher?: Teacher | null;
  onSuccessToast?: (title: string, message: string) => void;
}

export type SyncPeriodMode = 'bulanan' | 'rentang_tanggal' | 'semester';

export const ERaporSyncModal: React.FC<ERaporSyncModalProps> = ({
  isOpen,
  onClose,
  students,
  attendanceRecords,
  scheduledLeaves = [],
  settings,
  onSuccessToast,
}) => {
  // Determine current semester default: July-Dec is Semester 1, Jan-June is Semester 2
  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const defaultSemester = currentMonthNum >= 7 ? 1 : 2;

  const [semester, setSemester] = useState<1 | 2>(defaultSemester as 1 | 2);
  const [tahunAjaran, setTahunAjaran] = useState<string>(settings.academicYear || '2024/2025');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');

  // Period mode selection: 'bulanan', 'rentang_tanggal', or 'semester'
  const [periodMode, setPeriodMode] = useState<SyncPeriodMode>('bulanan');

  // Month selector (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mm}`;
  });

  // Custom date range selectors (YYYY-MM-DD)
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
  });

  // Parse start and end year from academic year string (e.g. "2024/2025")
  const parsedYears = useMemo(() => {
    const match = tahunAjaran.match(/(\d{4})\s*[\/-]\s*(\d{4})/);
    if (match) {
      return { startYear: parseInt(match[1], 10), endYear: parseInt(match[2], 10) };
    }
    const curYear = new Date().getFullYear();
    return { startYear: curYear, endYear: curYear + 1 };
  }, [tahunAjaran]);

  // Default date ranges for Semester 1 and 2
  const semesterDateRange = useMemo(() => {
    if (semester === 1) {
      return {
        start: `${parsedYears.startYear}-07-01`,
        end: `${parsedYears.startYear}-12-31`,
      };
    } else {
      return {
        start: `${parsedYears.endYear}-01-01`,
        end: `${parsedYears.endYear}-06-30`,
      };
    }
  }, [semester, parsedYears]);

  // Indonesian month names helper
  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Compute effective date window and display label based on chosen periodMode
  const { effectiveStartDate, effectiveEndDate, effectivePeriodeLabel, daysCount } = useMemo(() => {
    if (periodMode === 'bulanan') {
      const parts = (selectedMonth || '2024-09').split('-');
      const y = parseInt(parts[0], 10) || new Date().getFullYear();
      const m = parseInt(parts[1], 10) || 1;
      const lastDay = new Date(y, m, 0).getDate();
      const s = `${y}-${String(m).padStart(2, '0')}-01`;
      const e = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const mName = MONTH_NAMES[m - 1] || `Bulan ${m}`;
      return {
        effectiveStartDate: s,
        effectiveEndDate: e,
        effectivePeriodeLabel: `Bulan ${mName} ${y} (1 s.d. ${lastDay} ${mName} ${y})`,
        daysCount: lastDay,
      };
    } else if (periodMode === 'rentang_tanggal') {
      const s = customStartDate || `${new Date().getFullYear()}-01-01`;
      const e = customEndDate || s;
      const d1 = new Date(s);
      const d2 = new Date(e);
      const diffMs = Math.max(0, d2.getTime() - d1.getTime());
      const count = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return {
        effectiveStartDate: s,
        effectiveEndDate: e,
        effectivePeriodeLabel: `Rentang Tanggal: ${s} s.d. ${e} (${count} Hari)`,
        daysCount: count,
      };
    } else {
      return {
        effectiveStartDate: semesterDateRange.start,
        effectiveEndDate: semesterDateRange.end,
        effectivePeriodeLabel: `Semester ${semester} (${tahunAjaran}) [${semesterDateRange.start} s.d. ${semesterDateRange.end}]`,
        daysCount: 180,
      };
    }
  }, [periodMode, selectedMonth, customStartDate, customEndDate, semesterDateRange, semester, tahunAjaran]);

  // Unique list of student classes
  const classesList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.classRoom) set.add(s.classRoom);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filter students by selected class
  const filteredStudents = useMemo(() => {
    if (selectedClass === 'Semua') return students;
    return students.filter((s) => s.classRoom === selectedClass);
  }, [students, selectedClass]);

  // Overridden values state: allows manual editing per student NISN or attendance count before sync
  const [manualOverrides, setManualOverrides] = useState<
    Record<
      string,
      {
        nisn?: string;
        sakit?: number;
        izin?: number;
        tanpaKeterangan?: number;
      }
    >
  >({});

  // Selected student IDs for synchronization
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id))
  );

  // When class filter changes, select all relevant students
  useEffect(() => {
    setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
  }, [selectedClass, filteredStudents]);

  // Pre-index attendance records by student ID and NIS for O(1) instantaneous lookup.
  // This turns a massive semester-long scan of ~15,000 records into a single pass,
  // preventing browser UI freezes and making semester calculations instantaneous.
  const attendanceLookup = useMemo(() => {
    const map = new Map<string, { sakit: number; izin: number; alpa: number }>();
    const rangeStart = effectiveStartDate;
    const rangeEnd = effectiveEndDate;

    for (let i = 0; i < attendanceRecords.length; i++) {
      const att = attendanceRecords[i];
      if (att.date && (att.date < rangeStart || att.date > rangeEnd)) continue;

      const keys: string[] = [];
      if (att.studentId) keys.push(att.studentId);
      if (att.nis && att.nis !== att.studentId) keys.push(att.nis);

      for (const k of keys) {
        let entry = map.get(k);
        if (!entry) {
          entry = { sakit: 0, izin: 0, alpa: 0 };
          map.set(k, entry);
        }
        if (att.status === 'Sakit') entry.sakit++;
        else if (att.status === 'Izin') entry.izin++;
        else if (att.status === 'Alpa') entry.alpa++;
      }
    }
    return map;
  }, [attendanceRecords, effectiveStartDate, effectiveEndDate]);

  // Pre-index scheduled multi-day leaves by studentId
  const leavesLookup = useMemo(() => {
    const map = new Map<string, { sakit: number; izin: number }>();
    const rangeStart = effectiveStartDate;
    const rangeEnd = effectiveEndDate;

    for (let i = 0; i < scheduledLeaves.length; i++) {
      const leave = scheduledLeaves[i];
      if (!leave.studentId || leave.status === 'Dibatalkan') continue;
      if (leave.endDate < rangeStart || leave.startDate > rangeEnd) continue;

      const lStart = new Date(leave.startDate > rangeStart ? leave.startDate : rangeStart);
      const lEnd = new Date(leave.endDate < rangeEnd ? leave.endDate : rangeEnd);
      const diffTime = Math.max(0, lEnd.getTime() - lStart.getTime());
      const daysInLeave = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      let entry = map.get(leave.studentId);
      if (!entry) {
        entry = { sakit: 0, izin: 0 };
        map.set(leave.studentId, entry);
      }
      if (leave.type === 'Sakit') {
        entry.sakit = Math.max(entry.sakit, daysInLeave);
      } else if (leave.type === 'Izin' || leave.type === 'Dispensasi') {
        entry.izin = Math.max(entry.izin, daysInLeave);
      }
    }
    return map;
  }, [scheduledLeaves, effectiveStartDate, effectiveEndDate]);

  // Calculate attendance records per student for the active period window
  const studentRecapList = useMemo<ERaporRecapDoc[]>(() => {
    return filteredStudents.map((student) => {
      // Find manual override if exists
      const override = manualOverrides[student.id];

      // Clean NISN: prioritize override, then student.nisn, then student.nis, then student.id
      const rawNisn = override?.nisn ?? (student.nisn || student.nis || student.id);
      const nisn = String(rawNisn).trim();

      // Normalize class format (e.g. "Kelas 4" or "Kelas 1-A")
      const rawClass = student.classRoom || 'Kelas 1';
      const kelas = rawClass.toLowerCase().startsWith('kelas') ? rawClass : `Kelas ${rawClass}`;

      // Instant O(1) attendance lookup
      const attData =
        attendanceLookup.get(student.id) ||
        (student.nis ? attendanceLookup.get(student.nis) : undefined);
      let autoSakit = attData?.sakit || 0;
      let autoIzin = attData?.izin || 0;
      let autoAlpa = attData?.alpa || 0;

      // Check pre-calculated leave days
      const leaveData = leavesLookup.get(student.id);
      if (leaveData) {
        if (leaveData.sakit > autoSakit) autoSakit = leaveData.sakit;
        if (leaveData.izin > autoIzin) autoIzin = leaveData.izin;
      }

      const rawSakit = override?.sakit !== undefined ? override.sakit : autoSakit;
      const rawIzin = override?.izin !== undefined ? override.izin : autoIzin;
      const rawTanpaKeterangan =
        override?.tanpaKeterangan !== undefined ? override.tanpaKeterangan : autoAlpa;

      const sakitCount = Math.max(0, Number(rawSakit) || 0);
      const izinCount = Math.max(0, Number(rawIzin) || 0);
      const tanpaKeteranganCount = Math.max(0, Number(rawTanpaKeterangan) || 0);

      return {
        nisn,
        namaSiswa: student.name,
        kelas,
        semester,
        tahunAjaran,
        sakit: sakitCount,
        izin: izinCount,
        tanpaKeterangan: tanpaKeteranganCount,
        kehadiran: {
          sakit: sakitCount,
          izin: izinCount,
          tanpaKeterangan: tanpaKeteranganCount,
        },
        tipePeriode: periodMode,
        periodeLabel: effectivePeriodeLabel,
        tanggalMulai: effectiveStartDate,
        tanggalSelesai: effectiveEndDate,
        bulan: periodMode === 'bulanan' ? selectedMonth : undefined,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [
    filteredStudents,
    attendanceRecords,
    scheduledLeaves,
    effectiveStartDate,
    effectiveEndDate,
    effectivePeriodeLabel,
    periodMode,
    selectedMonth,
    semester,
    tahunAjaran,
    manualOverrides,
  ]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  // JSON Preview modal state
  const [previewRecap, setPreviewRecap] = useState<ERaporRecapDoc | null>(null);
  const [previewTab, setPreviewTab] = useState<'recap' | 'student'>('recap');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Existing Cloud Records
  const [isCheckingCloud, setIsCheckingCloud] = useState<boolean>(false);
  const [cloudRecords, setCloudRecords] = useState<ERaporRecapDoc[] | null>(null);
  const [cloudStudentCount, setCloudStudentCount] = useState<number>(0);
  const [showCloudHistory, setShowCloudHistory] = useState<boolean>(false);

  // Configurable Target Database ID (Disconnected by default until user provides their new Inpres 2 Ulatan IIH Beres DB ID)
  const [configuredTargetDbId, setConfiguredTargetDbId] = useState<string>(() =>
    getCustomIIHHBeresDatabaseId()
  );
  const [isEditingDbId, setIsEditingDbId] = useState<boolean>(false);
  const [tempDbIdInput, setTempDbIdInput] = useState<string>('');

  const handleSaveTargetDbId = (newId: string) => {
    setCustomIIHHBeresDatabaseId(newId);
    setConfiguredTargetDbId(newId.trim());
    setIsEditingDbId(false);
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Update override helper
  const handleUpdateOverride = (
    studentId: string,
    field: 'nisn' | 'sakit' | 'izin' | 'tanpaKeterangan',
    value: string | number
  ) => {
    setManualOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  // Perform bulk sync to Firestore
  const handleSyncToERapor = async () => {
    const itemsToSync = studentRecapList.filter((_, idx) => {
      const std = filteredStudents[idx];
      return std && selectedStudentIds.has(std.id);
    });

    if (itemsToSync.length === 0) {
      alert('Pilih minimal satu siswa untuk disinkronkan ke e-Rapor Merdeka!');
      return;
    }

    setIsSyncing(true);
    setSyncErrorMessage(null);
    setSyncSuccessMessage(null);
    setSyncProgress({ current: 0, total: itemsToSync.length });

    try {
      // Re-timestamp right before upload
      const timestamp = new Date().toISOString();
      const payload: ERaporRecapDoc[] = itemsToSync.map((item) => ({
        ...item,
        updatedAt: timestamp,
      }));

      // Pass the students list so both attendance recaps AND full student data are synced
      const res = await batchSyncERaporRecapsToFirestore(payload, students, (current, total) => {
        setSyncProgress({ current, total });
      });

      const targetMsg = res.isConnectedToIIHBeres
        ? `ke database e-Rapor (${res.destinationDb}) serta database lokal SD Inpres 2 Ulatan`
        : `ke database mandiri SD Inpres 2 Ulatan (koneksi lama Ogomojolo diputuskan)`;

      setSyncSuccessMessage(
        `Berhasil mengirim rekap absensi (${res.count} siswa) & data profil siswa (${res.studentCount} siswa) ${targetMsg}! Disimpan di koleksi 'rekap_absensi_ulatan', 'students', dan 'data_siswa' (ID Dokumen: NISN Siswa).`
      );
      if (onSuccessToast) {
        onSuccessToast(
          'Sinkronisasi Rekap Berhasil',
          `${res.count} rekap kehadiran (${effectivePeriodeLabel}) & data siswa telah tersimpan aman.`
        );
      }
    } catch (err: any) {
      console.error('Error syncing e-rapor recaps & students:', err);
      setSyncErrorMessage(
        err?.message || 'Terjadi kendala saat menghubungkan ke Firestore e-Rapor Merdeka (iihh Beres).'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Check cloud records from Firestore
  const handleFetchCloudRecords = async () => {
    setIsCheckingCloud(true);
    try {
      const [records, cloudStudents] = await Promise.all([
        fetchERaporRecapsFromFirestore(),
        fetchERaporStudentsFromFirestore(),
      ]);
      setCloudRecords(records);
      setCloudStudentCount(cloudStudents.length);
      setShowCloudHistory(true);
    } catch (err: any) {
      console.error('Error fetching cloud recaps:', err);
      alert('Gagal mengambil data dari Firestore: ' + (err?.message || err));
    } finally {
      setIsCheckingCloud(false);
    }
  };

  // Copy JSON
  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Download all as JSON file
  const handleDownloadJsonBackup = () => {
    const dataToExport = {
      periode: effectivePeriodeLabel,
      tipePeriode: periodMode,
      tanggalMulai: effectiveStartDate,
      tanggalSelesai: effectiveEndDate,
      semester,
      tahunAjaran,
      totalSiswa: studentRecapList.length,
      rekapAbsensi: studentRecapList,
      dataSiswa: filteredStudents.map((s) => {
        const recap = studentRecapList.find((r) => r.nisn === s.nisn || r.nisn === s.id);
        return buildERaporStudentPayload(s, recap);
      }),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodSlug = periodMode === 'bulanan' ? selectedMonth : `${effectiveStartDate}_sd_${effectiveEndDate}`;
    link.download = `rekap_absensi_erapor_${periodSlug}_sem${semester}_${tahunAjaran.replace(/[\/\s]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get matching student profile for preview
  const previewStudentProfile = useMemo(() => {
    if (!previewRecap) return null;
    const found = students.find((s) => s.nisn === previewRecap.nisn || s.nis === previewRecap.nisn || s.id === previewRecap.nisn);
    return buildERaporStudentPayload(found || { id: previewRecap.nisn, name: previewRecap.namaSiswa, classRoom: previewRecap.kelas }, previewRecap);
  }, [previewRecap, students]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-start justify-between border-b border-emerald-800/40 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Sinkronisasi Rekap Kehadiran & Data Siswa ke e-Rapor Merdeka
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-400 text-slate-950 uppercase tracking-wide">
                  iihh Beres
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono">
                  rekap_absensi_ogomojolo
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-950/80 text-teal-300 border border-teal-500/30 font-mono">
                  data_siswa / students
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Kirim rekap absensi fleksibel (per bulan, rentang tanggal, atau semester) dan data profil lengkap siswa langsung ke Google Cloud Firestore aplikasi e-Rapor Merdeka.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all cursor-pointer"
            title="Tutup"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Period Mode Selector Ribbon */}
        <div className="px-4 py-3 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-extrabold uppercase text-emerald-900 dark:text-emerald-300 mr-1 flex items-center gap-1">
              <i className="fa-solid fa-filter text-emerald-600"></i>
              <span>Pilihan Periode:</span>
            </span>

            {/* Mode 1: Per Bulan */}
            <button
              type="button"
              onClick={() => setPeriodMode('bulanan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                periodMode === 'bulanan'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <i className="fa-regular fa-calendar text-[11px]"></i>
              <span>Per Bulan</span>
            </button>

            {/* Mode 2: Rentang Tanggal */}
            <button
              type="button"
              onClick={() => setPeriodMode('rentang_tanggal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                periodMode === 'rentang_tanggal'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-calendar-days text-[11px]"></i>
              <span>Rentang Tanggal (Dari - Ke)</span>
            </button>

            {/* Mode 3: Per Semester */}
            <button
              type="button"
              onClick={() => setPeriodMode('semester')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                periodMode === 'semester'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-graduation-cap text-[11px]"></i>
              <span>Per Semester</span>
            </button>
          </div>

          {/* Active Period Summary Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1.5">
              <i className="fa-regular fa-clock text-emerald-600 dark:text-emerald-400"></i>
              <span>{effectivePeriodeLabel}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Controls Bar based on active periodMode */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full lg:w-auto flex-1">
            {/* Condition 1: Bulan Picker */}
            {periodMode === 'bulanan' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <i className="fa-regular fa-calendar text-emerald-600 dark:text-emerald-400"></i>
                  <span>Pilih Bulan Rekap:</span>
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {/* Condition 2: Custom Date Range (Dari Tanggal & Sampai Tanggal) */}
            {periodMode === 'rentang_tanggal' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar-plus text-emerald-600 dark:text-emerald-400"></i>
                    <span>Dari Tanggal:</span>
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar-check text-emerald-600 dark:text-emerald-400"></i>
                    <span>Sampai Tanggal:</span>
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Semester Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-calendar-week text-emerald-600 dark:text-emerald-400"></i>
                <span>Semester e-Rapor:</span>
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value={1}>Semester 1 (Ganjil - Jul s.d. Des)</option>
                <option value={2}>Semester 2 (Genap - Jan s.d. Jun)</option>
              </select>
            </div>

            {/* Academic Year */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-graduation-cap text-emerald-600 dark:text-emerald-400"></i>
                <span>Tahun Ajaran:</span>
              </label>
              <input
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                placeholder="2024/2025"
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Class Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-layer-group text-emerald-600 dark:text-emerald-400"></i>
                <span>Pilih Kelas:</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Semua">Semua Kelas ({students.length} Siswa)</option>
                {classesList.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons on the right: Database status & JSON Export */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            <button
              type="button"
              onClick={handleFetchCloudRecords}
              disabled={isCheckingCloud}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Periksa data rekap dan profil siswa yang tersimpan di Firestore e-Rapor"
            >
              {isCheckingCloud ? (
                <i className="fa-solid fa-circle-notch fa-spin text-emerald-500"></i>
              ) : (
                <i className="fa-solid fa-database text-emerald-600 dark:text-emerald-400"></i>
              )}
              <span>Cek Database e-Rapor</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJsonBackup}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Unduh seluruh rekap & data siswa dalam format JSON"
            >
              <i className="fa-solid fa-download text-indigo-500"></i>
              <span>Unduh JSON</span>
            </button>
          </div>
        </div>

        {/* Database Connection & Disconnection Ribbon */}
        <div
          className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between text-xs transition-colors ${
            configuredTargetDbId
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <i
              className={`fa-solid ${
                configuredTargetDbId
                  ? 'fa-link text-emerald-600 dark:text-emerald-400'
                  : 'fa-plug-circle-xmark text-amber-600 dark:text-amber-400 text-sm'
              }`}
            ></i>
            <span>
              {configuredTargetDbId ? (
                <>
                  <strong>Terhubung ke e-Rapor IIH Beres (SD Inpres 2 Ulatan):</strong>{' '}
                  <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {configuredTargetDbId}
                  </code>
                </>
              ) : (
                <>
                  <strong>Database Ogomojolo Diputuskan:</strong> Data tersimpan aman di database mandiri SD Inpres 2 Ulatan (koleksi{' '}
                  <code className="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800 dark:text-amber-300">
                    rekap_absensi_ulatan
                  </code>
                  ).
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            {isEditingDbId ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempDbIdInput}
                  onChange={(e) => setTempDbIdInput(e.target.value)}
                  placeholder="ID Database e-Rapor Baru..."
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 font-mono w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveTargetDbId(tempDbIdInput)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDbId(false)}
                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTempDbIdInput(configuredTargetDbId);
                    setIsEditingDbId(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    configuredTargetDbId
                      ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm'
                  }`}
                >
                  <i className="fa-solid fa-database mr-1"></i>
                  {configuredTargetDbId ? 'Ubah Target DB' : 'Hubungkan Database IIH Beres Baru'}
                </button>
                {configuredTargetDbId && (
                  <button
                    type="button"
                    onClick={() => handleSaveTargetDbId('')}
                    className="px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-xs font-bold cursor-pointer border border-rose-200 dark:border-rose-900/50"
                    title="Putuskan koneksi e-Rapor"
                  >
                    Putuskan
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sync Progress Indicator */}
        {syncProgress && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-circle-notch fa-spin text-emerald-600"></i>
                <span>
                  Mengunggah rekap absensi & data siswa ({syncProgress.current} / {syncProgress.total})...
                </span>
              </span>
              <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-200"
                style={{
                  width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Alerts: Success or Error */}
        {syncSuccessMessage && (
          <div className="px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
              <span>{syncSuccessMessage}</span>
            </div>
            <button
              onClick={() => setSyncSuccessMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {syncErrorMessage && (
          <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-sm"></i>
              <span>{syncErrorMessage}</span>
            </div>
            <button
              onClick={() => setSyncErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Main Content: Table & Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Cloud Records History Drawer */}
          {showCloudHistory && cloudRecords && (
            <div className="mb-5 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-database text-emerald-600 dark:text-emerald-400"></i>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Database e-Rapor (iihh Beres):{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{cloudRecords.length} Rekap</span> &{' '}
                    <span className="text-teal-600 dark:text-teal-400 font-extrabold">{cloudStudentCount} Data Siswa</span>
                  </h4>
                </div>
                <button
                  onClick={() => setShowCloudHistory(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Tutup Riwayat
                </button>
              </div>
              {cloudRecords.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Belum ada dokumen yang tersimpan di koleksi `rekap_absensi_ogomojolo`. Silakan klik tombol &quot;Kirim Rekap & Data Siswa ke e-Rapor&quot; untuk mengunggah.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-200 dark:bg-slate-700/60 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">NISN</th>
                        <th className="py-2 px-3">Nama Murid</th>
                        <th className="py-2 px-2 text-center">Kelas</th>
                        <th className="py-2 px-2 text-center">Periode / Tgl</th>
                        <th className="py-2 px-2 text-center">Sakit</th>
                        <th className="py-2 px-2 text-center">Izin</th>
                        <th className="py-2 px-2 text-center">Alpa</th>
                        <th className="py-2 px-3">Updated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 bg-white dark:bg-slate-900 font-mono text-[11px]">
                      {cloudRecords.map((cr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-1.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {cr.nisn}
                          </td>
                          <td className="py-1.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-100">
                            {cr.namaSiswa}
                          </td>
                          <td className="py-1.5 px-2 text-center">{cr.kelas}</td>
                          <td className="py-1.5 px-2 text-center text-[10px] text-slate-600 dark:text-slate-400">
                            {cr.periodeLabel || cr.bulan || `Sem ${cr.semester}`}
                          </td>
                          <td className="py-1.5 px-2 text-center text-amber-600 font-bold">
                            {cr.kehadiran?.sakit ?? cr.sakit ?? 0}
                          </td>
                          <td className="py-1.5 px-2 text-center text-sky-600 font-bold">
                            {cr.kehadiran?.izin ?? cr.izin ?? 0}
                          </td>
                          <td className="py-1.5 px-2 text-center text-rose-600 font-bold">
                            {cr.kehadiran?.tanpaKeterangan ?? cr.tanpaKeterangan ?? 0}
                          </td>
                          <td className="py-1.5 px-3 text-[10px] text-slate-500">
                            {cr.updatedAt ? new Date(cr.updatedAt).toLocaleString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Table Header Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Daftar Rekap Siswa ({studentRecapList.length} Siswa,{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {selectedStudentIds.size} dipilih
                </span>
                ):
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> S: Sakit
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> I: Izin
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> A: Alpa
              </span>
            </div>
          </div>

          {/* Students Recap Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudentIds.size === filteredStudents.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[130px]">NISN (10 Digit)</th>
                  <th className="py-3 px-4 min-w-[180px]">Nama Murid</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Kelas</th>
                  <th className="py-3 px-2 text-center min-w-[70px] bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                    Sakit (S)
                  </th>
                  <th className="py-3 px-2 text-center min-w-[70px] bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold">
                    Izin (I)
                  </th>
                  <th className="py-3 px-2 text-center min-w-[90px] bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold">
                    Tanpa Ket. (A)
                  </th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Pratinjau JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60">
                {studentRecapList.map((recap, index) => {
                  const student = filteredStudents[index];
                  const isChecked = student ? selectedStudentIds.has(student.id) : false;

                  return (
                    <tr
                      key={student?.id || index}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        !isChecked ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => student && handleToggleSelect(student.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* No */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* NISN */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={recap.nisn}
                          onChange={(e) =>
                            student && handleUpdateOverride(student.id, 'nisn', e.target.value)
                          }
                          className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          placeholder="NISN Siswa"
                        />
                      </td>

                      {/* Nama Siswa */}
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          <span>{recap.namaSiswa}</span>
                          {student?.gender && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {student.gender} {student.nis ? `• NIS: ${student.nis}` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kelas */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                          {recap.kelas}
                        </span>
                      </td>

                      {/* Sakit */}
                      <td className="py-2.5 px-2 text-center bg-amber-500/5">
                        <input
                          type="number"
                          min={0}
                          value={recap.kehadiran.sakit}
                          onChange={(e) =>
                            student &&
                            handleUpdateOverride(
                              student.id,
                              'sakit',
                              Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          className="w-14 text-center bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg px-1.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* Izin */}
                      <td className="py-2.5 px-2 text-center bg-sky-500/5">
                        <input
                          type="number"
                          min={0}
                          value={recap.kehadiran.izin}
                          onChange={(e) =>
                            student &&
                            handleUpdateOverride(
                              student.id,
                              'izin',
                              Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          className="w-14 text-center bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded-lg px-1.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </td>

                      {/* Tanpa Keterangan */}
                      <td className="py-2.5 px-2 text-center bg-rose-500/5">
                        <input
                          type="number"
                          min={0}
                          value={recap.kehadiran.tanpaKeterangan}
                          onChange={(e) =>
                            student &&
                            handleUpdateOverride(
                              student.id,
                              'tanpaKeterangan',
                              Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          className="w-14 text-center bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg px-1.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                        />
                      </td>

                      {/* JSON Preview Trigger */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewRecap(recap);
                            setPreviewTab('recap');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <i className="fa-solid fa-code text-[10px]"></i>
                          <span>Lihat JSON</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <i className={`fa-solid ${configuredTargetDbId ? 'fa-shield-halved text-emerald-600 dark:text-emerald-400' : 'fa-database text-amber-500'}`}></i>
            <span>
              Target Database:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {configuredTargetDbId || 'SD Inpres 2 Ulatan (Lokal Cloud - Terputus dari Ogomojolo)'}
              </strong>{' '}
              | ID Dokumen: NISN Siswa.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSyncToERapor}
              disabled={isSyncing || selectedStudentIds.size === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/40"
            >
              {isSyncing ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Mengunggah ke Firestore...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>Kirim Rekap & Data Siswa ({selectedStudentIds.size} Siswa)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* JSON Preview Submodal (with Tabs for Recap Doc & Student Profile Doc) */}
        {previewRecap && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full p-5 text-white animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-file-code text-emerald-400"></i>
                  <h3 className="text-sm font-bold">
                    Pratinjau JSON Dokumen e-Rapor
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewRecap(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Submodal Tabs */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPreviewTab('recap')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    previewTab === 'recap'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  1. Rekap Kehadiran (`rekap_absensi_ulatan`)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('student')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    previewTab === 'student'
                      ? 'bg-teal-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  2. Data Profil Siswa (`data_siswa` / `students`)
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-2">
                Siswa: <strong className="text-emerald-300">{previewRecap.namaSiswa}</strong> | NISN:{' '}
                <strong className="text-teal-300">{previewRecap.nisn}</strong>
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300 max-h-72">
                <pre>
                  {previewTab === 'recap'
                    ? JSON.stringify(previewRecap, null, 2)
                    : JSON.stringify(previewStudentProfile, null, 2)}
                </pre>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {copiedNotification ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <i className="fa-solid fa-check"></i> JSON berhasil disalin!
                    </span>
                  ) : (
                    'Sesuai dengan spesifikasi format e-Rapor Merdeka (iihh Beres)'
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyJson(
                        previewTab === 'recap' ? previewRecap : previewStudentProfile
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-regular fa-copy"></i>
                    <span>Salin JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewRecap(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ERaporSyncModal;
