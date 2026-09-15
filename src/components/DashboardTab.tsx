import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemSettings, Teacher, ScheduledLeave, BehaviorLog } from '../types';
import { openWhatsAppNotification } from '../utils/whatsapp';
import { generateAttendancePDFReport, generateMonthlyAttendancePDFReport } from '../utils/pdf';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { isHomeroomClassMatch, formatClassLabel, findHomeroomTeacher, resolveRecordTeacher } from '../utils/classUtils';
import { AutoAbsenteeModal } from './AutoAbsenteeModal';
import { ScheduledLeaveModal } from './ScheduledLeaveModal';
import { StudentBehaviorModal } from './StudentBehaviorModal';
import { EditAttendanceModal } from './EditAttendanceModal';
import { PrintMonthlyRecapModal } from './PrintMonthlyRecapModal';

interface DashboardTabProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  scheduledLeaves?: ScheduledLeave[];
  behaviorLogs?: BehaviorLog[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  settings: SystemSettings;
  teachers?: Teacher[];
  currentTeacher?: Teacher | null;
  onAddManualAttendance: (
    studentId: string,
    status: AttendanceStatus,
    note?: string,
    customTime?: string
  ) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateAttendanceRecord?: (record: AttendanceRecord) => void;
  onSaveLeave?: (leave: ScheduledLeave, autoPopulateAttendance: boolean) => void;
  onDeleteLeave?: (leaveId: string) => void;
  onSaveBehaviorLog?: (log: BehaviorLog) => void;
  onDeleteBehaviorLog?: (logId: string) => void;
  onOpenERaporSync?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  students,
  attendanceRecords,
  scheduledLeaves = [],
  behaviorLogs = [],
  selectedDate,
  setSelectedDate,
  settings,
  teachers = [],
  currentTeacher,
  onAddManualAttendance,
  onDeleteRecord,
  onUpdateAttendanceRecord,
  onSaveLeave,
  onDeleteLeave,
  onSaveBehaviorLog,
  onDeleteBehaviorLog,
  onOpenERaporSync,
}) => {
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.teacherType === 'admin';
  const isWaliKelas = !isAdmin && (currentTeacher?.teacherType === 'wali_kelas' || Boolean(currentTeacher?.homeroomClass));
  const myHomeroom = currentTeacher?.homeroomClass;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (isWaliKelas && myHomeroom) return myHomeroom;
    return 'Semua';
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('Semua');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [exportAlertMessage, setExportAlertMessage] = useState<string | null>(null);

  // New Features Modals State
  const [isAutoAbsenteeOpen, setIsAutoAbsenteeOpen] = useState(false);
  const [isScheduledLeaveOpen, setIsScheduledLeaveOpen] = useState(false);
  const [isStudentBehaviorOpen, setIsStudentBehaviorOpen] = useState(false);
  const [isEditAttendanceOpen, setIsEditAttendanceOpen] = useState(false);
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AttendanceRecord | null>(null);

  // Manual Attendance Form State
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('Hadir');
  const [manualNote, setManualNote] = useState('');
  const [manualTime, setManualTime] = useState('06:50');

  // Filter mode state: 'daily' | 'range' | 'monthly'
  const [filterMode, setFilterMode] = useState<'daily' | 'range' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<string>(selectedDate);
  const [endDate, setEndDate] = useState<string>(selectedDate);
  const [monthPicker, setMonthPicker] = useState<string>(() => selectedDate.slice(0, 7));
  const [monthlyViewMode, setMonthlyViewMode] = useState<'summary' | 'logs'>('summary');
  const [customEffectiveDays, setCustomEffectiveDays] = useState<number | null>(null);

  // Active target class: strictly locked to myHomeroom for Wali Kelas, or selectedClass for Admin
  const activeClass = isWaliKelas && myHomeroom ? myHomeroom : selectedClass;

  // Filter attendance by date / range / month
  const dateFilteredRecords = useMemo(() => {
    if (filterMode === 'daily') {
      return attendanceRecords.filter((rec) => rec.date === selectedDate);
    } else if (filterMode === 'range') {
      if (!startDate || !endDate) return attendanceRecords;
      return attendanceRecords.filter((rec) => rec.date >= startDate && rec.date <= endDate);
    } else if (filterMode === 'monthly') {
      if (!monthPicker) return attendanceRecords;
      return attendanceRecords.filter((rec) => rec.date.startsWith(monthPicker));
    }
    return attendanceRecords;
  }, [attendanceRecords, filterMode, selectedDate, startDate, endDate, monthPicker]);

  // Detected effective school days for the month
  const detectedEffectiveDays = useMemo(() => {
    const monthRecords = attendanceRecords.filter((r) => {
      if (!r.date.startsWith(monthPicker)) return false;
      if (activeClass !== 'Semua') {
        return isHomeroomClassMatch(r.classRoom, activeClass) || r.classRoom === activeClass;
      }
      return true;
    });

    const uniqueDates = new Set(monthRecords.map((r) => r.date));
    return uniqueDates.size > 0 ? uniqueDates.size : 20;
  }, [attendanceRecords, monthPicker, activeClass]);

  // Uniform effective school days (can be adjusted by user)
  const effectiveSchoolDays = customEffectiveDays !== null ? customEffectiveDays : detectedEffectiveDays;

  // Find the most recent date with attendance records
  const latestRecordDate = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return null;
    const sorted = [...attendanceRecords].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.date || null;
  }, [attendanceRecords]);

  // Readable Date Range Label for UI and PDF Report
  const dateRangeLabel = useMemo(() => {
    if (filterMode === 'daily') {
      try {
        const d = new Date(selectedDate);
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      } catch {
        return selectedDate;
      }
    } else if (filterMode === 'range') {
      return `${startDate} s/d ${endDate}`;
    } else if (filterMode === 'monthly') {
      try {
        const [y, m] = monthPicker.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        const mName = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        return `Bulan ${mName}`;
      } catch {
        return `Bulan ${monthPicker}`;
      }
    }
    return selectedDate;
  }, [filterMode, selectedDate, startDate, endDate, monthPicker]);

  // Statistics calculation
  const stats = useMemo(() => {
    const relevantStudents = activeClass !== 'Semua'
      ? students.filter((s) => isHomeroomClassMatch(s.classRoom, activeClass) || s.classRoom === activeClass)
      : students;
    const totalStudents = relevantStudents.length;

    const relevantRecords = activeClass !== 'Semua'
      ? dateFilteredRecords.filter((r) => isHomeroomClassMatch(r.classRoom, activeClass) || r.classRoom === activeClass)
      : dateFilteredRecords;

    const hadir = relevantRecords.filter((r) => r.status === 'Hadir').length;
    const terlambat = relevantRecords.filter((r) => r.status === 'Terlambat').length;
    const izinSakit = relevantRecords.filter((r) => r.status === 'Izin' || r.status === 'Sakit').length;
    const alpa = relevantRecords.filter((r) => r.status === 'Alpa').length;
    const totalRecorded = relevantRecords.length;
    const unrecorded = Math.max(0, totalStudents - totalRecorded);

    return { totalStudents, hadir, terlambat, izinSakit, alpa, totalRecorded, unrecorded };
  }, [students, dateFilteredRecords, activeClass]);

  // Active Leaves for today/selectedDate
  const activeLeavesCount = useMemo(() => {
    return scheduledLeaves.filter(
      (l) => selectedDate >= l.startDate && selectedDate <= l.endDate
    ).length;
  }, [scheduledLeaves, selectedDate]);

  // Available classes for filter
  const classesList = useMemo(() => {
    const setCls = new Set(students.map((s) => s.classRoom));
    return ['Semua', ...Array.from(setCls).sort()];
  }, [students]);

  // Relevant Teachers for Monitoring Activity:
  // For Wali Kelas or single class filter: ONLY Wali Kelas of this class and Guru Mapel. No cross-class mixing!
  // For Admin with 'Semua': all teachers
  const relevantTeachersForActivity = useMemo(() => {
    if (isAdmin && activeClass === 'Semua') {
      return teachers;
    }

    return teachers.filter((tch) => {
      // Always include Guru Mapel (PJOK, PAI, etc.)
      if (tch.teacherType === 'guru_mapel') return true;

      // Include Wali Kelas if class matches
      if (tch.teacherType === 'wali_kelas' && tch.homeroomClass) {
        return isHomeroomClassMatch(tch.homeroomClass, activeClass);
      }

      // Include Admin only if they logged attendance for this specific class
      if (tch.teacherType === 'admin' || tch.role === 'admin') {
        return dateFilteredRecords.some(
          (r) =>
            (r.teacherId === tch.id || r.teacherName?.toLowerCase().trim() === tch.name.toLowerCase().trim()) &&
            (activeClass === 'Semua' || isHomeroomClassMatch(r.classRoom, activeClass) || r.classRoom === activeClass)
        );
      }

      return false;
    });
  }, [teachers, isAdmin, activeClass, dateFilteredRecords]);

  // Teacher Attendance Activity Monitoring: strict per-teacher counting
  const teacherAttendanceActivity = useMemo(() => {
    return relevantTeachersForActivity.map((tch) => {
      const byTeacher = dateFilteredRecords.filter((r) => {
        // Scope to active class if not 'Semua'
        if (activeClass !== 'Semua' && !isHomeroomClassMatch(r.classRoom, activeClass) && r.classRoom !== activeClass) {
          return false;
        }

        // 1. Direct ID match
        if (r.teacherId && r.teacherId === tch.id) return true;

        // 2. Direct Name match
        if (r.teacherName && tch.name && r.teacherName.toLowerCase().trim() === tch.name.toLowerCase().trim()) return true;

        // 3. Fallback: unassigned records default to homeroom teacher ONLY if tch is this class's Wali Kelas
        if (!r.teacherId && !r.teacherName && tch.teacherType === 'wali_kelas' && tch.homeroomClass) {
          return isHomeroomClassMatch(r.classRoom, tch.homeroomClass);
        }

        return false;
      });

      const count = byTeacher.length;
      const classesSet = new Set(byTeacher.map((r) => r.classRoom));
      const classesRecorded = Array.from(classesSet).sort();
      const times = byTeacher.map((r) => r.time).filter(Boolean).sort();
      const latestTime = times.length > 0 ? times[times.length - 1] : null;

      return {
        teacher: tch,
        count,
        classesRecorded,
        latestTime,
        isDone: count > 0,
      };
    });
  }, [relevantTeachersForActivity, dateFilteredRecords, activeClass]);

  const activeTeachersCount = useMemo(() => {
    return teacherAttendanceActivity.filter((t) => t.isDone).length;
  }, [teacherAttendanceActivity]);

  // Filtered list for the display table
  const filteredTableData = useMemo(() => {
    return dateFilteredRecords.filter((rec) => {
      const resolved = resolveRecordTeacher(rec, teachers, students, currentTeacher);
      const matchSearch =
        rec.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resolved.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.teacherName && rec.teacherName.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchClass = true;
      if (activeClass !== 'Semua') {
        matchClass = isHomeroomClassMatch(rec.classRoom, activeClass) || rec.classRoom === activeClass;
      }

      const matchStatus = selectedStatus === 'Semua' || rec.status === selectedStatus;

      let matchTeacher = true;
      if (selectedTeacherFilter !== 'Semua') {
        const targetTeacher = teachers.find((t) => t.id === selectedTeacherFilter);
        matchTeacher =
          rec.teacherId === selectedTeacherFilter ||
          resolved.name.toLowerCase().trim() === selectedTeacherFilter.toLowerCase().trim() ||
          (targetTeacher && resolved.name.toLowerCase().trim() === targetTeacher.name.toLowerCase().trim());
      }

      return matchSearch && matchClass && matchStatus && matchTeacher;
    });
  }, [dateFilteredRecords, searchTerm, activeClass, selectedStatus, selectedTeacherFilter, teachers, students, currentTeacher]);

  // Per-Student Monthly Summary Breakdown: Hadir, Terlambat, Sakit, Izin, Alfa
  // Uniform total days = effectiveSchoolDays for all students
  const monthlyStudentRecaps = useMemo(() => {
    if (filterMode !== 'monthly') return [];

    const classStudents = students.filter((s) => {
      let matchClass = true;
      if (activeClass !== 'Semua') {
        matchClass = isHomeroomClassMatch(s.classRoom, activeClass) || s.classRoom === activeClass;
      }
      const matchSearch =
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nis.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSearch;
    });

    return classStudents.map((s) => {
      const recordsInMonth = attendanceRecords.filter(
        (r) => r.date.startsWith(monthPicker) && (r.studentId === s.id || r.nis === s.nis)
      );

      let sakit = recordsInMonth.filter((r) => r.status === 'Sakit').length;
      let izin = recordsInMonth.filter((r) => r.status === 'Izin').length;
      let alpa = recordsInMonth.filter((r) => r.status === 'Alpa').length;
      let terlambat = recordsInMonth.filter((r) => r.status === 'Terlambat').length;

      // Account for multi-day scheduled leaves
      scheduledLeaves?.forEach((leave) => {
        if (leave.studentId === s.id) {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const cur = new Date(start);
          while (cur <= end) {
            const curStr = cur.toISOString().split('T')[0];
            if (curStr.startsWith(monthPicker)) {
              const alreadyHasRecord = recordsInMonth.some((r) => r.date === curStr);
              if (!alreadyHasRecord) {
                if (leave.type === 'Sakit') sakit++;
                else if (leave.type === 'Izin' || leave.type === 'Dispensasi') izin++;
              }
            }
            cur.setDate(cur.getDate() + 1);
          }
        }
      });

      // Total non-attendance absences
      const totalAbsen = sakit + izin + alpa;

      // Uniform Total Hadir:
      // All students are evaluated against the uniform effective school days.
      // Total Hadir = max(0, effectiveSchoolDays - totalAbsen).
      // If 0 absences, Total Hadir is identical and uniform across all students!
      const totalHadir = Math.max(0, effectiveSchoolDays - totalAbsen);
      const hadir = Math.max(0, totalHadir - terlambat);
      const totalHari = effectiveSchoolDays;
      const percentage = effectiveSchoolDays > 0 ? Math.round((totalHadir / effectiveSchoolDays) * 100) : 0;

      return {
        studentId: s.id,
        nis: s.nis,
        name: s.name,
        classRoom: s.classRoom,
        gender: s.gender,
        avatarUrl: s.avatarUrl || s.photo,
        parentPhone: s.parentPhone,
        hadir,
        terlambat,
        sakit,
        izin,
        alpa,
        totalHadir,
        totalHari,
        percentage,
      };
    });
  }, [filterMode, activeClass, students, searchTerm, attendanceRecords, monthPicker, scheduledLeaves, effectiveSchoolDays]);

  const handleExportPDF = () => {
    const hrTeacher = findHomeroomTeacher(teachers, activeClass, currentTeacher);
    const hm = {
      name: settings.headmasterName,
      nip: settings.headmasterNip,
    };
    const adminTch = teachers.find((t) => t.teacherType === 'admin' || t.role === 'admin') || currentTeacher;

    if (filterMode === 'monthly') {
      if (!monthlyStudentRecaps || monthlyStudentRecaps.length === 0) {
        setExportAlertMessage('Tidak ada data siswa untuk dicetak ke PDF rekap bulanan.');
        return;
      }
      generateMonthlyAttendancePDFReport({
        recaps: monthlyStudentRecaps,
        monthLabel: dateRangeLabel,
        selectedClass: activeClass,
        settings,
        effectiveSchoolDays,
        homeroomTeacher: hrTeacher,
        headmaster: hm,
        adminTeacher: adminTch ? { name: adminTch.name, nip: adminTch.nip } : undefined,
      });
      return;
    }

    if (!filteredTableData || filteredTableData.length === 0) {
      setExportAlertMessage('Tidak ada data absensi untuk dicetak ke PDF pada filter saat ini.');
      return;
    }

    generateAttendancePDFReport({
      records: filteredTableData,
      dateRangeLabel,
      selectedClass: activeClass,
      settings,
      stats,
      homeroomTeacher: hrTeacher,
      headmaster: hm,
    });
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }
    onAddManualAttendance(manualStudentId, manualStatus, manualNote, `${manualTime}:00`);
    setIsManualModalOpen(false);
    setManualStudentId('');
    setManualNote('');
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'Hadir':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <i className="fa-solid fa-circle-check text-[10px]"></i> Hadir
          </span>
        );
      case 'Terlambat':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <i className="fa-solid fa-clock text-[10px]"></i> Terlambat
          </span>
        );
      case 'Izin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <i className="fa-solid fa-file-signature text-[10px]"></i> Izin
          </span>
        );
      case 'Sakit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <i className="fa-solid fa-notes-medical text-[10px]"></i> Sakit
          </span>
        );
      case 'Alpa':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <i className="fa-solid fa-circle-xmark text-[10px]"></i> Alpa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Streamlined Clean Header & Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs transition-colors space-y-4">
        {/* Row 1: Page Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Dashboard & Rekap Absensi
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/80">
                {dateRangeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring kehadiran siswa realtime, rekapitulasi harian, rentang tanggal, dan bulanan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingAttendanceRecord(null);
                setIsEditAttendanceOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800"
              title="Input baru atau koreksi absensi tanggal lampau"
            >
              <i className="fa-solid fa-pen-to-square text-indigo-600 dark:text-indigo-400"></i>
              <span>Koreksi / Lampau</span>
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <i className="fa-solid fa-user-plus text-indigo-600 dark:text-indigo-400"></i>
              <span>Absen Manual</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              title="Unduh Laporan Absensi PDF Siap Cetak"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (filterMode !== 'monthly') {
                  setFilterMode('monthly');
                }
                setIsPrintModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              title="Cetak Laporan Rekapitulasi Presensi (Print Resmi)"
            >
              <i className="fa-solid fa-print"></i>
              <span>Cetak Rekapan</span>
            </button>

            {onOpenERaporSync && (
              <button
                onClick={onOpenERaporSync}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer border border-emerald-500/40"
                title="Sinkronisasi Rekap Kehadiran Siswa ke Aplikasi e-Rapor Merdeka (iihh Beres)"
              >
                <i className="fa-solid fa-cloud-arrow-up text-[11px]"></i>
                <span>Kirim Rekap ke e-Rapor</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Clean Date Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 w-fit">
            <button
              type="button"
              onClick={() => setFilterMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="fa-regular fa-calendar text-[11px]"></i>
              <span>Harian</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'range'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="fa-solid fa-calendar-days text-[11px]"></i>
              <span>Rentang Tanggal</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <i className="fa-solid fa-calendar-week text-[11px]"></i>
              <span>Per Bulan</span>
            </button>
          </div>

          {/* Dynamic Date Inputs */}
          <div className="flex items-center gap-2">
            {filterMode === 'daily' && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                <i className="fa-regular fa-calendar text-slate-400"></i>
                <span className="font-medium text-slate-500 dark:text-slate-400">Tanggal:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {filterMode === 'range' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                <span className="font-medium text-slate-500 dark:text-slate-400">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
                />
                <span className="text-slate-400">-</span>
                <span className="font-medium text-slate-500 dark:text-slate-400">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {filterMode === 'monthly' && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                <i className="fa-solid fa-calendar-week text-slate-400"></i>
                <span className="font-medium text-slate-500 dark:text-slate-400">Bulan:</span>
                <input
                  type="month"
                  value={monthPicker}
                  onChange={(e) => setMonthPicker(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5 Bento Grid Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Siswa */}
        <div className="bento-card border-l-4 border-l-slate-400 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Siswa</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-users"></i>
            </div>
          </div>
          <div className="mt-2">
            <div className="stat-value">{stats.totalStudents}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">Siswa terdaftar</div>
          </div>
        </div>

        {/* Hadir */}
        <div className="bento-card border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="stat-label text-emerald-700">Hadir Tepat Waktu</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-user-check"></i>
            </div>
          </div>
          <div className="mt-2">
            <div className="stat-value text-emerald-700">{stats.hadir}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">
              {stats.totalStudents > 0
                ? `${Math.round((stats.hadir / stats.totalStudents) * 100)}% dari total`
                : '0%'}
            </div>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bento-card border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="stat-label text-amber-700">Terlambat</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-user-clock"></i>
            </div>
          </div>
          <div className="mt-2">
            <div className="stat-value text-amber-700">{stats.terlambat}</div>
            <div className="text-[11px] font-semibold text-amber-600 mt-1">&gt; 07:00 WIB</div>
          </div>
        </div>

        {/* Izin / Sakit */}
        <div className="bento-card border-l-4 border-l-indigo-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="stat-label text-indigo-700">Izin / Sakit</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-notes-medical"></i>
            </div>
          </div>
          <div className="mt-2">
            <div className="stat-value text-indigo-700">{stats.izinSakit}</div>
            <div className="text-[11px] font-semibold text-indigo-600 mt-1">Keterangan resmi</div>
          </div>
        </div>

        {/* Alpa / Belum Absen */}
        <div className="bento-card border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="stat-label text-rose-700">Alpa / Belum Absen</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-user-xmark"></i>
            </div>
          </div>
          <div className="mt-2">
            <div className="stat-value text-rose-700">
              {stats.alpa + stats.unrecorded}
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-1">
              {stats.alpa} Alpa, {stats.unrecorded} Belum
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Tools: Auto-Flag Absentees, Scheduled Leaves, Behavior Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tool 1: Auto Absentee Detection */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-rose-50 to-orange-50/60 dark:from-rose-950/30 dark:to-orange-950/20 border border-rose-200/80 dark:border-rose-800/60 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                <i className="fa-solid fa-bell"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Peringatan Siswa Alpha
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Deteksi otomatis & kirim WA
                </p>
              </div>
            </div>
            {stats.unrecorded > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                {stats.unrecorded} Belum Hadir
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Lengkap
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsAutoAbsenteeOpen(true)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-900 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-magnifying-glass-chart"></i>
            <span>Cek Siswa Belum Hadir</span>
          </button>
        </div>

        {/* Tool 2: Scheduled Leaves & Doctor's Note */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-sky-50 to-indigo-50/60 dark:from-sky-950/30 dark:to-indigo-950/20 border border-sky-200/80 dark:border-sky-800/60 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Izin / Sakit Terjadwal
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Izin multi-hari & surat dokter
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
              {activeLeavesCount > 0 ? `${activeLeavesCount} Aktif Hari Ini` : `${scheduledLeaves.length} Total Izin`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsScheduledLeaveOpen(true)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-900 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 dark:hover:text-white text-sky-700 dark:text-sky-300 text-xs font-bold rounded-xl border border-sky-200 dark:border-sky-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-file-medical"></i>
            <span>Kelola Izin & Bukti Dokter</span>
          </button>
        </div>

        {/* Tool 3: Behavior & Character Logs */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-amber-50 to-yellow-50/60 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-200/80 dark:border-amber-800/60 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                <i className="fa-solid fa-star"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Jurnal & Poin Karakter
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Kedisiplinan & evaluasi rapor
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {behaviorLogs.length} Catatan
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsStudentBehaviorOpen(true)}
            className="w-full py-2 px-3 bg-white dark:bg-slate-900 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <i className="fa-solid fa-book-bookmark"></i>
            <span>Buka Jurnal & Poin Siswa</span>
          </button>
        </div>
      </div>

      {/* Teacher Attendance Activity Monitoring Card (Dewan Guru & Wali Kelas) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                <i className="fa-solid fa-chalkboard-user"></i>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Monitoring Guru yang Melakukan Absensi</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  {activeTeachersCount} dari {teachers.length} Guru Aktif
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Pantau guru mana (wali kelas, guru mapel, atau admin) yang sudah/sedang mengabsen siswa pada periode <strong className="text-slate-700 dark:text-slate-300 font-semibold">{dateRangeLabel}</strong>.
            </p>
          </div>

          {selectedTeacherFilter !== 'Semua' && (
            <button
              onClick={() => setSelectedTeacherFilter('Semua')}
              className="self-start sm:self-auto text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
              <span>Hapus Filter Guru</span>
            </button>
          )}
        </div>

        {/* Teacher Activity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teacherAttendanceActivity.map((item) => {
            const isSelected = selectedTeacherFilter === item.teacher.id;
            const isDone = item.count > 0;

            return (
              <div
                key={item.teacher.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/40 shadow-xs'
                    : isDone
                    ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <i className={`fa-solid ${isDone ? 'fa-check' : 'fa-hourglass-start'}`}></i>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {item.teacher.name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                            item.teacher.teacherType === 'wali_kelas'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.teacher.teacherType === 'guru_mapel'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          }`}
                        >
                          {item.teacher.teacherType === 'wali_kelas'
                            ? (item.teacher.homeroomClass ? `Wali ${item.teacher.homeroomClass}` : 'Wali Kelas')
                            : item.teacher.teacherType === 'guru_mapel'
                            ? `Mapel: ${item.teacher.subject}`
                            : 'Admin Sekolah'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isDone ? `${item.count} Siswa` : 'Belum Absen'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-slate-500 dark:text-slate-400 truncate pr-1">
                    {isDone ? (
                      <span>
                        Terakhir: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.latestTime} WIB</strong>
                        {item.classesRecorded.length > 0 && (
                          <span className="ml-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            ({item.classesRecorded.join(', ')})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="italic text-slate-400">Belum ada siswa diabsen</span>
                    )}
                  </div>

                  {isDone ? (
                    <button
                      type="button"
                      onClick={() => setSelectedTeacherFilter(isSelected ? 'Semua' : item.teacher.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/80 dark:border-indigo-800'
                      }`}
                    >
                      <i className={`fa-solid ${isSelected ? 'fa-check' : 'fa-filter'}`}></i>
                      <span>{isSelected ? 'Tersaring' : 'Lihat Siswa'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7-Day Attendance Trend Visualizer (Recharts) */}
      <AttendanceTrendChart
        students={students}
        attendanceRecords={attendanceRecords}
        selectedDate={selectedDate}
        selectedClass={selectedClass}
      />

      {/* Bento Main Table Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Cari nama siswa atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Hapus Pencarian"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Kelas */}
            {isWaliKelas && myHomeroom ? (
              <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                <i className="fa-solid fa-lock text-[10px]"></i>
                <span>Kelas: {myHomeroom} (Terkunci)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                <i className="fa-solid fa-graduation-cap text-indigo-600 dark:text-indigo-400 text-xs"></i>
                <span className="font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Kelas:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
                >
                  {classesList.map((cls) => (
                    <option key={cls} value={cls} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                      {cls === 'Semua' ? 'Semua Kelas' : `Kelas ${cls}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <i className="fa-solid fa-filter text-slate-500 dark:text-slate-400 text-xs"></i>
              <span className="font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
              >
                <option value="Semua" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Semua Status</option>
                <option value="Hadir" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Hadir</option>
                <option value="Terlambat" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Terlambat</option>
                <option value="Izin" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Izin</option>
                <option value="Sakit" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Sakit</option>
                <option value="Alpa" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Alpa</option>
              </select>
            </div>

            {/* Filter Guru Pengabsen */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <i className="fa-solid fa-chalkboard-user text-indigo-600 dark:text-indigo-400 text-xs"></i>
              <span className="font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Guru:</span>
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="Semua" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Semua Guru</option>
                {relevantTeachersForActivity.map((tch) => (
                  <option key={tch.id} value={tch.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                    {tch.name} ({tch.teacherType === 'wali_kelas' ? (tch.homeroomClass ? `Wali ${tch.homeroomClass}` : 'Wali Kelas') : tch.teacherType === 'guru_mapel' ? `Mapel ${tch.subject}` : 'Admin'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Monthly View Mode Switcher */}
        {filterMode === 'monthly' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <i className="fa-solid fa-chart-pie text-indigo-600 dark:text-indigo-400"></i>
                <span>Tampilan Rekap {dateRangeLabel}:</span>
              </span>

              {/* Uniform Effective School Days Control */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Hari Efektif:</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={effectiveSchoolDays}
                  onChange={(e) => setCustomEffectiveDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-11 text-center font-extrabold font-mono text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  title="Jumlah hari efektif sekolah seragam untuk semua siswa dalam 1 bulan"
                />
                <span className="text-slate-400 font-medium text-[11px]">Hari</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setMonthlyViewMode('summary')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                  monthlyViewMode === 'summary'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <i className="fa-solid fa-table-list text-xs"></i>
                <span>Rekap Per Siswa (H / T / S / I / A)</span>
              </button>
              <button
                type="button"
                onClick={() => setMonthlyViewMode('logs')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                  monthlyViewMode === 'logs'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                <span>Log Scan Harian ({filteredTableData.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer border-l border-slate-200 dark:border-slate-700 ml-1 pl-2.5"
                title="Buka Lembar Rekapan Cetak Resmi (Kop Sekolah & TTD)"
              >
                <i className="fa-solid fa-print text-xs"></i>
                <span>Cetak Rekapan</span>
              </button>
              {onOpenERaporSync && (
                <button
                  type="button"
                  onClick={onOpenERaporSync}
                  className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer border-l border-slate-200 dark:border-slate-700 ml-1 pl-2.5"
                  title="Kirim Rekap Kehadiran Siswa ke e-Rapor Merdeka"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                  <span>Kirim ke e-Rapor</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table Results Count & Reset */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
          <span>
            {filterMode === 'monthly' && monthlyViewMode === 'summary' ? (
              <>
                Menampilkan rekapitulasi kehadiran untuk <strong className="text-slate-900 dark:text-white font-mono font-bold">{monthlyStudentRecaps.length}</strong> siswa
                {selectedClass !== 'Semua' && (
                  <> (Kelas <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedClass}</span>)</>
                )}
              </>
            ) : (
              <>
                Menampilkan <strong className="text-slate-900 dark:text-white font-mono font-bold">{filteredTableData.length}</strong> data absensi
                {selectedClass !== 'Semua' && (
                  <> (Kelas <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedClass}</span>)</>
                )}
                {selectedTeacherFilter !== 'Semua' && (
                  <> (Oleh Guru: <span className="font-bold text-indigo-600 dark:text-indigo-400">{teachers.find((t) => t.id === selectedTeacherFilter)?.name || selectedTeacherFilter}</span>)</>
                )}
              </>
            )}
          </span>
          {(searchTerm || selectedClass !== 'Semua' || selectedStatus !== 'Semua' || selectedTeacherFilter !== 'Semua') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedClass('Semua');
                setSelectedStatus('Semua');
                setSelectedTeacherFilter('Semua');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left text-[10px]"></i>
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {filterMode === 'monthly' && monthlyViewMode === 'summary' ? (
            /* Monthly Per-Student Summary Table */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3 text-center">Kelas</th>
                  <th className="py-3 px-3 text-center">Hadir (H)</th>
                  <th className="py-3 px-3 text-center">Terlambat (T)</th>
                  <th className="py-3 px-3 text-center">Sakit (S)</th>
                  <th className="py-3 px-3 text-center">Izin (I)</th>
                  <th className="py-3 px-3 text-center">Alfa (A)</th>
                  <th className="py-3 px-3 text-center">Total Masuk</th>
                  <th className="py-3 px-4">Persentase</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                {monthlyStudentRecaps.length > 0 ? (
                  monthlyStudentRecaps.map((r, index) => {
                    const studentInfo = students.find((s) => s.id === r.studentId);
                    return (
                      <tr key={r.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-slate-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={r.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                              alt={r.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white">{r.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                NIS: {r.nis} • {r.gender === 'Perempuan' ? 'P' : 'L'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {r.classRoom}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {r.hadir} hr
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {r.terlambat} hr
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {r.sakit} hr
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            {r.izin} hr
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${
                              r.alpa > 0
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {r.alpa} hr
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold font-mono text-slate-900 dark:text-white">
                          {r.totalHadir} hr
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full ${
                                  r.percentage >= 85
                                    ? 'bg-emerald-500'
                                    : r.percentage >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${r.percentage}%` }}
                              ></div>
                            </div>
                            <span className="font-bold font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {r.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {r.parentPhone ? (
                            <button
                              type="button"
                              onClick={() => {
                                const cleanPhone = r.parentPhone!.replace(/[^0-9]/g, '');
                                const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                                const message = `*LAPORAN REKAPITULASI PRESENSI BULANAN*\n${settings.schoolName}\n\nKepada Yth. Orang Tua / Wali dari:\n*Nama:* ${r.name}\n*NIS:* ${r.nis}\n*Kelas:* ${r.classRoom}\n*Periode:* ${dateRangeLabel}\n\n*Rincian Kehadiran:*\n✅ Hadir: ${r.hadir} hari\n⏰ Terlambat: ${r.terlambat} hari\n🏥 Sakit: ${r.sakit} hari\n📝 Izin: ${r.izin} hari\n❌ Alfa: ${r.alpa} hari\n*Total Hadir:* ${r.totalHadir} hari\n*Persentase Kehadiran:* ${r.percentage}%\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.`;
                                window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');
                              }}
                              title={`Kirim Rekap Bulanan via WA ke Ortu ${r.name} (${r.parentPhone})`}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer text-xs inline-flex items-center gap-1.5 font-bold shadow-2xs"
                            >
                              <i className="fa-brands fa-whatsapp text-sm"></i>
                              <span>Kirim Rekap WA</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No HP -</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <i className="fa-solid fa-clipboard-question text-3xl text-slate-300"></i>
                        <p className="font-bold text-sm text-slate-700">Tidak ada data siswa ditemukan</p>
                        <p className="text-xs text-slate-500">
                          Pastikan filter kelas dan pencarian siswa sesuai.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {monthlyStudentRecaps.length > 0 && (
                <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 uppercase text-xs tracking-wider">
                      TOTAL AKUMULASI KELAS ({monthlyStudentRecaps.length} SISWA)
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-400 font-extrabold font-mono">
                      {monthlyStudentRecaps.reduce((acc, c) => acc + c.hadir, 0)} hr
                    </td>
                    <td className="py-3 px-3 text-center text-amber-700 dark:text-amber-400 font-extrabold font-mono">
                      {monthlyStudentRecaps.reduce((acc, c) => acc + c.terlambat, 0)} hr
                    </td>
                    <td className="py-3 px-3 text-center text-indigo-700 dark:text-indigo-400 font-extrabold font-mono">
                      {monthlyStudentRecaps.reduce((acc, c) => acc + c.sakit, 0)} hr
                    </td>
                    <td className="py-3 px-3 text-center text-sky-700 dark:text-sky-400 font-extrabold font-mono">
                      {monthlyStudentRecaps.reduce((acc, c) => acc + c.izin, 0)} hr
                    </td>
                    <td className="py-3 px-3 text-center text-rose-700 dark:text-rose-400 font-extrabold font-mono">
                      {monthlyStudentRecaps.reduce((acc, c) => acc + c.alpa, 0)} hr
                    </td>
                    <td className="py-3 px-3 text-center text-slate-900 dark:text-white font-extrabold font-mono">
                      {monthlyStudentRecaps.reduce((acc, c) => acc + c.totalHadir, 0)} hr
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-right text-xs text-slate-500 dark:text-slate-400">
                      Bulan {dateRangeLabel}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            /* Standard Logs Table */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  {filterMode !== 'daily' && <th className="py-3 px-4">Tanggal</th>}
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Guru Pengabsen</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                {filteredTableData.length > 0 ? (
                  filteredTableData.map((record, index) => {
                    const studentInfo = students.find((s) => s.id === record.studentId);
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 dark:text-slate-500 font-medium">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={studentInfo?.photo || studentInfo?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                              alt={record.studentName}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white">{record.studentName}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">NIS: {record.nis}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{record.classRoom}</td>
                        {filterMode !== 'daily' && (
                          <td className="py-3 px-4 font-mono font-semibold text-slate-600 dark:text-slate-400">{record.date}</td>
                        )}
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400">{record.time} WIB</td>
                        <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                        <td className="py-3 px-4">
                          {(() => {
                            const teacherInfo = resolveRecordTeacher(record, teachers, students, currentTeacher);
                            return (
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
                                  <i className="fa-solid fa-chalkboard-user text-xs text-indigo-600 dark:text-indigo-400"></i>
                                  <span>{teacherInfo.name}</span>
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                                      teacherInfo.type === 'wali_kelas'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                        : teacherInfo.type === 'guru_mapel'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                                    }`}
                                  >
                                    {teacherInfo.type === 'wali_kelas'
                                      ? teacherInfo.subject.startsWith('Wali')
                                        ? teacherInfo.subject
                                        : `Wali ${teacherInfo.subject}`
                                      : teacherInfo.type === 'guru_mapel'
                                      ? teacherInfo.subject.startsWith('Mapel')
                                        ? teacherInfo.subject
                                        : `Mapel: ${teacherInfo.subject}`
                                      : teacherInfo.subject || 'Admin'}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                            <i
                              className={
                                record.scannedVia === 'QR Camera'
                                  ? 'fa-solid fa-camera text-indigo-600 dark:text-indigo-400'
                                  : 'fa-solid fa-keyboard text-amber-600 dark:text-amber-400'
                              }
                            ></i>
                            {record.scannedVia}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {record.note || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {studentInfo ? (
                              <button
                                onClick={() =>
                                  openWhatsAppNotification(
                                    studentInfo,
                                    record,
                                    settings.schoolName
                                  )
                                }
                                title={`Kirim WA Otomatis ke Ortu ${record.studentName} (${studentInfo.parentPhone || 'No HP Belum Ada'})`}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-bold shadow-2xs"
                              >
                                <i className="fa-brands fa-whatsapp text-sm"></i>
                                <span>Kirim WA</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Data siswa tidak ditemukan"
                                className="px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
                              >
                                <i className="fa-brands fa-whatsapp text-sm mr-1"></i>
                                <span>Kirim WA</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingAttendanceRecord(record);
                                setIsEditAttendanceOpen(true);
                              }}
                              title="Edit / Koreksi absensi ini"
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button
                              onClick={() => onDeleteRecord(record.id)}
                              title="Hapus riwayat ini"
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={filterMode !== 'daily' ? 10 : 9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto px-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-xl">
                          <i className="fa-solid fa-clipboard-question"></i>
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                            {searchTerm
                              ? `Tidak ada data presensi cocok dengan "${searchTerm}"`
                              : filterMode === 'daily'
                              ? `Presensi untuk ${dateRangeLabel} belum direkam`
                              : 'Tidak ada data presensi untuk periode ini'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {searchTerm
                              ? 'Coba periksa kembali ejaan nama atau NIS siswa yang dicari.'
                              : attendanceRecords.length > 0
                              ? `Data presensi Anda tersimpan aman di Cloud (${attendanceRecords.length} total rekaman). Belum ada pemindaian QR untuk tanggal ini.`
                              : 'Gunakan tab Scanner QR untuk melakukan pemindaian presensi siswa.'}
                          </p>
                        </div>

                        {/* Quick action recovery buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          {searchTerm && (
                            <button
                              type="button"
                              onClick={() => setSearchTerm('')}
                              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                              <i className="fa-solid fa-rotate-left mr-1.5"></i>
                              Reset Pencarian
                            </button>
                          )}
                          {latestRecordDate && latestRecordDate !== selectedDate && filterMode === 'daily' && (
                            <button
                              type="button"
                              onClick={() => setSelectedDate(latestRecordDate)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <i className="fa-solid fa-calendar-day"></i>
                              <span>Buka Presensi Terakhir ({latestRecordDate})</span>
                            </button>
                          )}
                          {attendanceRecords.length > 0 && filterMode === 'daily' && (
                            <button
                              type="button"
                              onClick={() => setFilterMode('monthly')}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <i className="fa-solid fa-calendar-days"></i>
                              <span>Lihat Rekap Bulan Ini</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Absen Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setIsManualModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
              <i className="fa-solid fa-pen-to-square text-indigo-600"></i>
              <span>Input Absensi Manual</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Catat absensi siswa secara manual untuk kasus siswa tanpa kartu QR atau keterangan khusus.
            </p>

            {currentTeacher && (
              <div className="mb-4 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                  <i className="fa-solid fa-chalkboard-user text-indigo-600"></i>
                  <span>Guru Pencatat: <strong className="text-slate-900">{currentTeacher.name}</strong></span>
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                  {currentTeacher.teacherType === 'wali_kelas'
                    ? (currentTeacher.homeroomClass ? `Wali ${currentTeacher.homeroomClass}` : 'Wali Kelas')
                    : currentTeacher.teacherType === 'guru_mapel'
                    ? `Mapel ${currentTeacher.subject}`
                    : 'Admin'}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmitManual} className="space-y-4">
              {/* Select Student */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Siswa <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students
                    .filter((std) => (isWaliKelas && myHomeroom ? isHomeroomClassMatch(std.classRoom, myHomeroom) : true))
                    .map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name} ({std.nis}) - {formatClassLabel(std.classRoom)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Status & Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Kehadiran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="Hadir">Hadir</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Alpa">Alpa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan / Catatan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Surat sakit terlampir, Lomba, dll..."
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Simpan Absensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Alert Modal */}
      {exportAlertMessage && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 text-center space-y-4 shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-circle-info"></i>
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Informasi Laporan</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {exportAlertMessage}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setExportAlertMessage(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Modal Auto Absentee Detection */}
      {isAutoAbsenteeOpen && (
        <AutoAbsenteeModal
          students={students}
          attendanceRecords={attendanceRecords}
          selectedDate={selectedDate}
          settings={settings}
          currentTeacher={currentTeacher || null}
          onAddManualAttendance={onAddManualAttendance}
          onClose={() => setIsAutoAbsenteeOpen(false)}
        />
      )}

      {/* 2. Modal Scheduled Leaves & Doctor Note Upload */}
      {isScheduledLeaveOpen && onSaveLeave && onDeleteLeave && (
        <ScheduledLeaveModal
          students={students}
          leaves={scheduledLeaves}
          currentTeacher={currentTeacher || null}
          onSaveLeave={onSaveLeave}
          onDeleteLeave={onDeleteLeave}
          onClose={() => setIsScheduledLeaveOpen(false)}
        />
      )}

      {/* 3. Modal Student Behavior & Character Log */}
      {isStudentBehaviorOpen && onSaveBehaviorLog && onDeleteBehaviorLog && (
        <StudentBehaviorModal
          students={students}
          behaviorLogs={behaviorLogs}
          settings={settings}
          currentTeacher={currentTeacher || null}
          onSaveBehaviorLog={onSaveBehaviorLog}
          onDeleteBehaviorLog={onDeleteBehaviorLog}
          onClose={() => setIsStudentBehaviorOpen(false)}
        />
      )}

      {/* 4. Modal Edit / Input Presensi Lampau */}
      {isEditAttendanceOpen && (
        <EditAttendanceModal
          students={students}
          teachers={teachers || []}
          currentTeacher={currentTeacher || null}
          attendanceRecords={attendanceRecords}
          initialRecord={editingAttendanceRecord}
          initialDate={selectedDate}
          onClose={() => {
            setIsEditAttendanceOpen(false);
            setEditingAttendanceRecord(null);
          }}
          onSave={(updatedRec) => {
            if (onUpdateAttendanceRecord) {
              onUpdateAttendanceRecord(updatedRec);
            }
            setIsEditAttendanceOpen(false);
            setEditingAttendanceRecord(null);
          }}
          onDelete={onDeleteRecord}
        />
      )}

      {/* 5. Modal Cetak Lembar Rekapitulasi Presensi Resmi */}
      {isPrintModalOpen && (
        <PrintMonthlyRecapModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          recaps={monthlyStudentRecaps}
          monthLabel={dateRangeLabel}
          selectedClass={activeClass}
          settings={settings}
          effectiveSchoolDays={effectiveSchoolDays}
          onUpdateEffectiveDays={(days) => setCustomEffectiveDays(days)}
          homeroomTeacher={findHomeroomTeacher(teachers, activeClass, currentTeacher)}
          headmaster={{
            name: settings.headmasterName,
            nip: settings.headmasterNip,
          }}
          adminTeacher={teachers.find((t) => t.teacherType === 'admin' || t.role === 'admin') || currentTeacher}
        />
      )}
    </div>
  );
};
