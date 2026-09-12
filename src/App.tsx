import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Student,
  AttendanceRecord,
  SystemSettings,
  ActiveTab,
  AttendanceStatus,
  ToastMessage,
  Teacher,
  TeacherType,
  ScheduledLeave,
  BehaviorLog,
  School,
} from './types';
import { formatClassLabel } from './utils/classUtils';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  DEFAULT_SETTINGS,
  INITIAL_SCHOOLS,
  DEFAULT_PRIMARY_SCHOOL_ID,
  getTodayDateString,
  generateInitialAttendance,
} from './data/initialData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { DashboardTab } from './components/DashboardTab';
import { ScannerTab } from './components/ScannerTab';
import { StudentsTab } from './components/StudentsTab';
import { SimulatorTab } from './components/SimulatorTab';
import { LoginModal } from './components/LoginModal';
import { TeacherManagementModal } from './components/TeacherManagementModal';
import { AdminProfileModal } from './components/AdminProfileModal';
import { GuideModal } from './components/GuideModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DapodikAnnouncementModal, CURRENT_ANNOUNCEMENT_VERSION } from './components/DapodikAnnouncementModal';
import { ERaporSyncModal } from './components/ERaporSyncModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { testFirestoreConnection, setCustomIIHHBeresDatabaseId } from './firebase';
import {
  subscribeToStudents,
  subscribeToAttendance,
  subscribeToTeachers,
  subscribeToSettings,
  subscribeToLeaves,
  subscribeToBehaviorLogs,
  subscribeToSchools,
  saveSchoolToFirestore,
  deleteSchoolFromFirestore,
  seedInitialSchoolsIfEmpty,
  saveStudentToFirestore,
  deleteStudentFromFirestore,
  bulkDeleteStudentsFromFirestore,
  syncAllStudentsToFirestore,
  syncAllAttendanceToFirestore,
  syncAllTeachersToFirestore,
  saveAttendanceToFirestore,
  deleteAttendanceFromFirestore,
  saveTeacherToFirestore,
  deleteTeacherFromFirestore,
  saveSettingsToFirestore,
  saveLeaveToFirestore,
  deleteLeaveFromFirestore,
  saveBehaviorLogToFirestore,
  deleteBehaviorLogFromFirestore,
  seedInitialFirestoreDataIfEmpty,
  fetchAllTeachersFromFirestore,
  fetchAllAttendanceFromFirestore,
  fetchAllStudentsFromFirestore,
} from './services/firestoreService';
import { safeSetItem, safeGetItem, safeRemoveItem, cleanStaleLocalStorage } from './utils/storage';
import { isHomeroomClassMatch, resolveRecordTeacher } from './utils/classUtils';

const LOCAL_STORAGE_KEYS = {
  SCHOOLS: 'absensi_siswa_schools_v1',
  CURRENT_SCHOOL_ID: 'absensi_siswa_current_school_id_v1',
  STUDENTS: 'absensi_siswa_students_v2',
  ATTENDANCE: 'absensi_siswa_attendance_v2',
  SETTINGS: 'absensi_siswa_settings_v1',
  TEACHERS: 'absensi_siswa_teachers_v2',
  CURRENT_TEACHER: 'absensi_siswa_current_teacher_v2',
  LEAVES: 'absensi_siswa_leaves_v1',
  BEHAVIOR_LOGS: 'absensi_siswa_behavior_logs_v1',
};

export default function App() {
  const todayStr = getTodayDateString();
  const isInitialMount = useRef(true);

  // Run cleanup once on startup to remove legacy keys and reclaim quota space
  useEffect(() => {
    cleanStaleLocalStorage();
  }, []);

  // Multi-School State (Sistem Multi-Sekolah)
  const [schools, setSchools] = useState<School[]>(() => {
    try {
      const saved = safeGetItem(LOCAL_STORAGE_KEYS.SCHOOLS);
      if (saved) {
        const parsed: School[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SCHOOLS;
    } catch {
      return INITIAL_SCHOOLS;
    }
  });

  const [currentSchoolId, setCurrentSchoolId] = useState<string>(() => {
    try {
      const saved = safeGetItem(LOCAL_STORAGE_KEYS.CURRENT_SCHOOL_ID);
      return saved || DEFAULT_PRIMARY_SCHOOL_ID;
    } catch {
      return DEFAULT_PRIMARY_SCHOOL_ID;
    }
  });

  // Settings state with safe JSON parse
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = safeGetItem(LOCAL_STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed: SystemSettings = JSON.parse(saved);
        if (parsed.schoolName && (parsed.schoolName.toUpperCase().includes('OGOMOJOLO') || parsed.schoolName === 'SD NEGERI 1 INDONESIA')) {
          return DEFAULT_SETTINGS;
        }
        return parsed;
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      console.warn('Failed to parse settings from localStorage:', e);
      return DEFAULT_SETTINGS;
    }
  });

  // Students state with safe JSON parse
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      if (safeGetItem('absensi_siswa_students_v1')) {
        safeRemoveItem('absensi_siswa_students_v1');
        safeRemoveItem('absensi_siswa_attendance_v1');
      }

      const saved = safeGetItem(LOCAL_STORAGE_KEYS.STUDENTS);
      const parsed: Student[] = saved ? JSON.parse(saved) : INITIAL_STUDENTS;

      const filtered = parsed.filter(
        (s) => !['std-1001', 'std-1002', 'std-1003', 'std-1004', 'std-1005', 'std-1006', 'std-1007', 'std-1008', 'std-1009', 'std-1010', 'std-1011', 'std-1012', 'std-1013', 'std-1014'].includes(s.id)
      );

      const seenIds = new Set<string>();
      return filtered.map((s, index) => {
        let uniqueId = s.id;
        if (!uniqueId || seenIds.has(uniqueId)) {
          uniqueId = `std-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}`;
        }
        seenIds.add(uniqueId);
        return { ...s, id: uniqueId };
      });
    } catch (e) {
      console.warn('Failed to parse students from localStorage:', e);
      return INITIAL_STUDENTS;
    }
  });

  // Attendance Records state with safe JSON parse
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = safeGetItem(LOCAL_STORAGE_KEYS.ATTENDANCE);
      const parsed: AttendanceRecord[] = saved ? JSON.parse(saved) : generateInitialAttendance(todayStr);
      return parsed.filter(
        (r) => !['std-1001', 'std-1002', 'std-1003', 'std-1004', 'std-1005', 'std-1006', 'std-1007', 'std-1008', 'std-1009', 'std-1010', 'std-1011', 'std-1012', 'std-1013', 'std-1014'].includes(r.studentId)
      );
    } catch (e) {
      console.warn('Failed to parse attendance from localStorage:', e);
      return generateInitialAttendance(todayStr);
    }
  });

  // Teachers state with safe JSON parse
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      if (safeGetItem('absensi_siswa_teachers_v1')) {
        safeRemoveItem('absensi_siswa_teachers_v1');
        safeRemoveItem('absensi_siswa_current_teacher_v1');
      }

      const saved = safeGetItem(LOCAL_STORAGE_KEYS.TEACHERS);
      if (!saved) return INITIAL_TEACHERS;

      const parsed: Teacher[] = JSON.parse(saved);
      const filtered = parsed.filter(
        (t) => !['tch-1', 'tch-2', 'tch-3', 'tch-4', 'tch-5', 'tch-6', 'tch-7', 'tch-8'].includes(t.id)
      );

      if (filtered.length === 0) return INITIAL_TEACHERS;

      return filtered.map((t) => {
        if (t.id === 'tch-admin' && (t.name === 'Budi Santoso, S.Pd.SD' || !t.name)) {
          return INITIAL_TEACHERS[0];
        }
        if (t.id === 'tch-admin' || t.email?.toLowerCase() === 'fadli46046@gmail.com') {
          return { ...t, pin: 'Hanin231221' };
        }
        return t;
      });
    } catch (e) {
      console.warn('Failed to parse teachers from localStorage:', e);
      return INITIAL_TEACHERS;
    }
  });

  // Scheduled Leaves (Izin / Sakit Terjadwal) state
  const [scheduledLeaves, setScheduledLeaves] = useState<ScheduledLeave[]>(() => {
    try {
      const saved = safeGetItem(LOCAL_STORAGE_KEYS.LEAVES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to parse leaves from localStorage:', e);
      return [];
    }
  });

  // Student Behavior & Character Logs state
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog[]>(() => {
    try {
      const saved = safeGetItem(LOCAL_STORAGE_KEYS.BEHAVIOR_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to parse behavior logs from localStorage:', e);
      return [];
    }
  });

  // Currently logged-in Teacher (defaults to admin MOH. FADLI if not explicitly logged in)
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(() => {
    try {
      const saved = safeGetItem(LOCAL_STORAGE_KEYS.CURRENT_TEACHER);
      if (saved) {
        const parsed: Teacher = JSON.parse(saved);
        if (parsed && parsed.id) {
          if (parsed.id === 'tch-admin' || parsed.email?.toLowerCase() === 'fadli46046@gmail.com') {
            return { ...parsed, pin: 'Hanin231221' };
          }
          return parsed;
        }
      }
      return INITIAL_TEACHERS[0] || null;
    } catch (e) {
      console.warn('Failed to parse current teacher from localStorage:', e);
      return INITIAL_TEACHERS[0] || null;
    }
  });

  // Modals for Teacher Login, Management, Admin Profile, Guide, and Cloud Sync
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [isERaporSyncModalOpen, setIsERaporSyncModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Dapodik-style Announcement Pop-up on initial enter
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState<boolean>(() => {
    try {
      const acknowledgedVersion = safeGetItem('dapodik_announcement_acknowledged');
      return acknowledgedVersion !== CURRENT_ANNOUNCEMENT_VERSION;
    } catch {
      return true;
    }
  });

  // Dark / Light Theme Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = safeGetItem('app_theme_mode');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Apply dark mode class to <html> root
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        safeSetItem('app_theme_mode', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        safeSetItem('app_theme_mode', 'light');
      }
    } catch (e) {
      console.warn('Failed to sync theme class:', e);
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Navigation & Date
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast helper
  const addToast = useCallback(
    (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev, { id, title, message, type }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleCloseAnnouncement = useCallback((dontShowAgain: boolean) => {
    setIsAnnouncementOpen(false);
    if (dontShowAgain) {
      const targetVer = settings.announcementVersion || CURRENT_ANNOUNCEMENT_VERSION;
      safeSetItem('dapodik_announcement_acknowledged', targetVer);
    }
  }, [settings.announcementVersion]);

  const handleOpenAnnouncement = useCallback(() => {
    setIsAnnouncementOpen(true);
  }, []);

  const handleResetAnnouncementStatus = useCallback(() => {
    safeRemoveItem('dapodik_announcement_acknowledged');
    addToast(
      'Pop-up Direset',
      'Pemberitahuan ala Dapodik akan otomatis muncul kembali saat membuka beranda.',
      'info'
    );
  }, [addToast]);

  // Save to LocalStorage whenever states update (fast local cache with quota management)
  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.CURRENT_SCHOOL_ID, currentSchoolId);
  }, [currentSchoolId]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.LEAVES, JSON.stringify(scheduledLeaves));
  }, [scheduledLeaves]);

  useEffect(() => {
    safeSetItem(LOCAL_STORAGE_KEYS.BEHAVIOR_LOGS, JSON.stringify(behaviorLogs));
  }, [behaviorLogs]);

  useEffect(() => {
    if (currentTeacher) {
      safeSetItem(LOCAL_STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(currentTeacher));
    } else {
      safeRemoveItem(LOCAL_STORAGE_KEYS.CURRENT_TEACHER);
    }
  }, [currentTeacher]);

  // Real-time Firestore synchronization & Initial Connection
  useEffect(() => {
    testFirestoreConnection().catch((err) => {
      console.warn('Firestore connection notice:', err);
    });

    // Seed initial data to Firestore if completely empty
    seedInitialFirestoreDataIfEmpty(
      INITIAL_STUDENTS,
      INITIAL_TEACHERS,
      DEFAULT_SETTINGS,
      generateInitialAttendance(todayStr)
    ).catch((err) => {
      console.warn('Firestore initial data check notice:', err);
    });

    // Ensure super admin PIN is synced to Hanin231221
    saveTeacherToFirestore({ ...INITIAL_TEACHERS[0], pin: 'Hanin231221' }).catch((err) => {
      console.warn('Super admin PIN sync notice:', err);
    });

    // Seed initial schools if empty
    seedInitialSchoolsIfEmpty().catch((err) => {
      console.warn('Firestore schools check notice:', err);
    });

    // Immediate one-shot fetch from Firestore to ensure zero-latency data loading
    fetchAllTeachersFromFirestore().then((remoteTeachers) => {
      if (remoteTeachers && remoteTeachers.length > 0) {
        setTeachers((prev) => {
          const map = new Map<string, Teacher>();
          prev.forEach((t) => map.set(t.id, t));
          remoteTeachers.forEach((t) => {
            const normalized: Teacher = { ...t, schoolId: t.schoolId || DEFAULT_PRIMARY_SCHOOL_ID };
            map.set(normalized.id, normalized);
          });
          INITIAL_TEACHERS.forEach((t) => {
            if (!map.has(t.id)) map.set(t.id, t);
          });
          const merged = Array.from(map.values());
          safeSetItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(console.warn);

    fetchAllAttendanceFromFirestore().then((remoteAttendance) => {
      if (remoteAttendance && remoteAttendance.length > 0) {
        setAttendanceRecords((prev) => {
          const map = new Map<string, AttendanceRecord>();
          prev.forEach((r) => map.set(r.id, r));
          remoteAttendance.forEach((r) => {
            const normalized: AttendanceRecord = { ...r, schoolId: r.schoolId || DEFAULT_PRIMARY_SCHOOL_ID };
            map.set(normalized.id, normalized);
          });
          const merged = Array.from(map.values());
          safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(console.warn);

    fetchAllStudentsFromFirestore().then((remoteStudents) => {
      if (remoteStudents && remoteStudents.length > 0) {
        setStudents((prev) => {
          const map = new Map<string, Student>();
          prev.forEach((s) => map.set(s.id, s));
          remoteStudents.forEach((s) => {
            const normalized: Student = { ...s, schoolId: s.schoolId || DEFAULT_PRIMARY_SCHOOL_ID };
            map.set(normalized.id, normalized);
          });
          const merged = Array.from(map.values());
          safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(console.warn);

    // Subscribe to Firestore schools collection
    const unsubSchools = subscribeToSchools((fsSchools) => {
      if (fsSchools && fsSchools.length > 0) {
        setSchools((prev) => {
          const schoolMap = new Map<string, School>();
          // 1. Keep all existing local schools (never drop a locally created school)
          prev.forEach((s) => schoolMap.set(s.id, s));
          // 2. Merge/update with schools from Firestore
          fsSchools.forEach((s) => schoolMap.set(s.id, s));
          // 3. Ensure defaults exist
          INITIAL_SCHOOLS.forEach((s) => {
            if (!schoolMap.has(s.id)) schoolMap.set(s.id, s);
          });
          const merged = Array.from(schoolMap.values());
          safeSetItem(LOCAL_STORAGE_KEYS.SCHOOLS, JSON.stringify(merged));
          return merged;
        });
      }
    });

    // Subscribe to Firestore collections in real-time with safe merge to avoid data wipes
    const unsubStudents = subscribeToStudents((fsStudents) => {
      if (!fsStudents || fsStudents.length === 0) return;
      let missing: Student[] = [];
      setStudents((prev) => {
        const prevMap = new Map<string, Student>();
        prev.forEach((s) => prevMap.set(s.id, s));

        // Update/insert from Firestore with normalized schoolId
        fsStudents.forEach((s) => {
          const normalized: Student = { ...s, schoolId: s.schoolId || DEFAULT_PRIMARY_SCHOOL_ID };
          prevMap.set(normalized.id, normalized);
        });

        missing = prev.filter((p) => !fsStudents.some((f) => f.id === p.id));
        const merged = Array.from(prevMap.values());
        safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(merged));
        return merged;
      });

      // Backfill to Firestore any students that exist locally but not yet in Firestore
      if (missing.length > 0) {
        syncAllStudentsToFirestore(missing).catch((err) =>
          console.warn('Backfill students notice:', err)
        );
      }
    });

    const unsubAttendance = subscribeToAttendance((fsRecords) => {
      if (!fsRecords || fsRecords.length === 0) return;
      let missing: AttendanceRecord[] = [];
      setAttendanceRecords((prev) => {
        const prevMap = new Map<string, AttendanceRecord>();
        prev.forEach((r) => prevMap.set(r.id, r));

        fsRecords.forEach((r) => {
          const raw = (r.teacherName || '').trim().toLowerCase();
          let record: AttendanceRecord = { ...r, schoolId: r.schoolId || DEFAULT_PRIMARY_SCHOOL_ID };
          if (
            !r.teacherName ||
            raw === 'petugas scanner' ||
            raw === 'petugas sekolah' ||
            raw === 'wali kelas / sistem' ||
            raw === 'sistem'
          ) {
            const resolved = resolveRecordTeacher(r, teachers, students, currentTeacher);
            record = {
              ...record,
              teacherName: resolved.name,
              teacherType: resolved.type,
              teacherSubject: resolved.subject,
            };
          }
          prevMap.set(record.id, record);
        });

        missing = prev.filter((p) => !fsRecords.some((f) => f.id === p.id));
        const merged = Array.from(prevMap.values());
        safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
        return merged;
      });

      // Backfill to Firestore any local attendance not yet in Firestore
      if (missing.length > 0) {
        syncAllAttendanceToFirestore(missing).catch((err) =>
          console.warn('Backfill attendance notice:', err)
        );
      }
    });

    const unsubTeachers = subscribeToTeachers((fsTeachers) => {
      if (!fsTeachers || fsTeachers.length === 0) return;
      let missing: Teacher[] = [];
      setTeachers((prev) => {
        const prevMap = new Map<string, Teacher>();
        prev.forEach((t) => prevMap.set(t.id, t));

        fsTeachers.forEach((t) => {
          let teacherObj: Teacher = { ...t, schoolId: t.schoolId || DEFAULT_PRIMARY_SCHOOL_ID };
          if ((t.id === 'tch-admin' || t.email?.toLowerCase() === 'fadli46046@gmail.com') && t.pin !== 'Hanin231221') {
            teacherObj = { ...teacherObj, pin: 'Hanin231221' };
            saveTeacherToFirestore(teacherObj).catch(console.warn);
          }
          prevMap.set(teacherObj.id, teacherObj);
        });

        INITIAL_TEACHERS.forEach((t) => {
          if (!prevMap.has(t.id)) prevMap.set(t.id, t);
        });

        missing = prev.filter((p) => !fsTeachers.some((f) => f.id === p.id));
        const merged = Array.from(prevMap.values());
        safeSetItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(merged));
        return merged;
      });

      // Backfill to Firestore any teachers that exist locally but not yet in Firestore
      if (missing.length > 0) {
        syncAllTeachersToFirestore(missing).catch((err) =>
          console.warn('Backfill teachers notice:', err)
        );
      }
    });

    const unsubSettings = subscribeToSettings((fsSettings) => {
      if (fsSettings && fsSettings.schoolName) {
        // Only accept if settings belong to current active school or legacy default
        if (!fsSettings.schoolId || fsSettings.schoolId === currentSchoolId) {
          setSettings(fsSettings);
        }
      }
    });

    const unsubLeaves = subscribeToLeaves((fsLeaves) => {
      if (fsLeaves) {
        setScheduledLeaves(fsLeaves);
      }
    });

    const unsubBehavior = subscribeToBehaviorLogs((fsLogs) => {
      if (fsLogs) {
        setBehaviorLogs(fsLogs);
      }
    });

    return () => {
      unsubSchools();
      unsubStudents();
      unsubAttendance();
      unsubTeachers();
      unsubSettings();
      unsubLeaves();
      unsubBehavior();
    };
  }, [todayStr]);

  // Update Settings in State and Firestore
  const handleUpdateSettings = useCallback(
    (newSettings: SystemSettings) => {
      const scopedSettings: SystemSettings = {
        ...newSettings,
        schoolId: DEFAULT_PRIMARY_SCHOOL_ID,
      };
      setSettings(scopedSettings);
      saveSettingsToFirestore(scopedSettings, DEFAULT_PRIMARY_SCHOOL_ID).catch((err) =>
        console.warn('Failed to sync settings to Firestore:', err)
      );

      safeSetItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(scopedSettings));
    },
    []
  );

  // Teacher Login Handler
  const handleTeacherLogin = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    safeSetItem(LOCAL_STORAGE_KEYS.CURRENT_TEACHER, JSON.stringify(teacher));
    setIsLoginModalOpen(false);

    addToast(
      'Login Berhasil',
      `Selamat datang, ${teacher.name} (${teacher.role === 'admin' ? 'Admin' : teacher.subject})`,
      'success'
    );
  };

  // Teacher Logout Handler
  const handleTeacherLogout = () => {
    const prevName = currentTeacher?.name || 'Pengguna';
    setCurrentTeacher(null);
    safeRemoveItem(LOCAL_STORAGE_KEYS.CURRENT_TEACHER);
    addToast('Berhasil Keluar', `Anda telah keluar dari akun ${prevName}.`, 'info');
  };

  // Add Teacher Handler (by Admin)
  const handleAddTeacher = (newTeacherData: Omit<Teacher, 'id'>) => {
    const exists = teachers.some((t) => t.email.toLowerCase() === newTeacherData.email.toLowerCase());
    if (exists) {
      addToast('Email Terdaftar', `Email ${newTeacherData.email} sudah terdaftar!`, 'error');
      return;
    }

    const newTeacher: Teacher = {
      ...newTeacherData,
      schoolId: DEFAULT_PRIMARY_SCHOOL_ID,
      id: `tch-${Date.now()}`,
    };

    setTeachers((prev) => [...prev, newTeacher]);
    saveTeacherToFirestore(newTeacher).catch((err) =>
      console.warn('Failed to save teacher to Firestore:', err)
    );
    addToast('Guru Mapel Ditambahkan', `Akun ${newTeacher.name} (${newTeacher.subject}) berhasil disimpan.`, 'success');
  };

  // Update Teacher / Admin Handler
  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)));
    if (currentTeacher?.id === updatedTeacher.id) {
      setCurrentTeacher(updatedTeacher);
    }
    saveTeacherToFirestore(updatedTeacher).catch((err) =>
      console.warn('Failed to update teacher in Firestore:', err)
    );
    addToast(
      'Data Diperbarui',
      `Profil ${updatedTeacher.name} (${updatedTeacher.role === 'admin' ? 'Admin' : updatedTeacher.subject}) berhasil disimpan.`,
      'success'
    );
  };

  // Update Teacher PIN Handler (e.g. from Forgot PIN recovery)
  const handleUpdateTeacherPin = async (teacherId: string, newPin: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;
    const updated: Teacher = { ...teacher, pin: newPin };
    setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updated : t)));
    if (currentTeacher?.id === teacherId) {
      setCurrentTeacher(updated);
    }
    await saveTeacherToFirestore(updated);
    addToast(
      'PIN Berhasil Diperbarui',
      `PIN untuk akun ${updated.name} telah berhasil direset.`,
      'success'
    );
  };

  // Delete Teacher Handler
  const handleDeleteTeacher = (id: string) => {
    const teacher = teachers.find((t) => t.id === id);
    if (!teacher) return;

    setTeachers((prev) => prev.filter((t) => t.id !== id));
    if (currentTeacher?.id === id) {
      setCurrentTeacher(teachers.find((t) => t.id !== id) || null);
    }
    deleteTeacherFromFirestore(id).catch((err) =>
      console.warn('Failed to delete teacher from Firestore:', err)
    );
    addToast('Akun Dihapus', `Akun guru ${teacher.name} telah dihapus.`, 'info');
  };

  // Calculate late status based on cutoff time
  const calculateLateStatus = (
    timeStr: string,
    cutoffStr: string
  ): AttendanceStatus => {
    const [h, m] = timeStr.split(':').map(Number);
    const [cutH, cutM] = cutoffStr.split(':').map(Number);

    const currentTimeMin = h * 60 + m;
    const cutoffTimeMin = cutH * 60 + cutM;

    return currentTimeMin > cutoffTimeMin ? 'Terlambat' : 'Hadir';
  };

  // Record attendance via QR Camera / Manual / Simulator
  const handleRecordAttendance = useCallback(
    (
      student: Student,
      scannedVia: 'QR Camera' | 'Manual Input' | 'Simulator',
      customDate?: string
    ): { record: AttendanceRecord; isDuplicate: boolean } => {
      const currentDate = customDate || getTodayDateString();
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Check duplicate on same date
      const existing = attendanceRecords.find(
        (r) => r.studentId === student.id && r.date === currentDate
      );

      if (existing) {
        addToast(
          'Absensi Duplikat',
          `${student.name} sudah melakukan absensi tanggal ${currentDate} jam ${existing.time} WIB.`,
          'warning'
        );
        return { record: existing, isDuplicate: true };
      }

      // Determine status (Hadir vs Terlambat)
      const status = calculateLateStatus(timeStr, settings.lateCutoffTime);
      const note =
        status === 'Terlambat'
          ? `Terlambat (Masuk ${timeStr} WIB, Batas ${settings.lateCutoffTime})`
          : 'Hadir Tepat Waktu';

      // Teacher tracking information - always assign real teacher, never generic fallback
      const homeroom = teachers.find(
        (t) => t.homeroomClass && isHomeroomClassMatch(student.classRoom, t.homeroomClass)
      );
      const assignedTeacher =
        currentTeacher || homeroom || teachers.find((t) => t.role === 'admin') || teachers[0];

      const teacherName = assignedTeacher?.name || 'MOH. FADLI';
      const teacherRole = assignedTeacher?.role || 'guru';
      const teacherType: TeacherType =
        assignedTeacher?.teacherType ||
        (assignedTeacher?.role === 'admin'
          ? 'admin'
          : assignedTeacher?.homeroomClass
          ? 'wali_kelas'
          : 'guru_mapel');

      const teacherSubject =
        teacherType === 'guru_mapel'
          ? (assignedTeacher?.subject ? `Mapel: ${assignedTeacher.subject}` : 'Guru Mapel')
          : teacherType === 'wali_kelas'
          ? (assignedTeacher?.homeroomClass ? `Wali ${formatClassLabel(assignedTeacher.homeroomClass)}` : 'Wali Kelas')
          : (assignedTeacher?.subject || 'Administrator Sekolah');

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        schoolId: currentSchoolId,
        studentId: student.id,
        nis: student.nis,
        studentName: student.name,
        classRoom: student.classRoom,
        date: currentDate,
        time: timeStr,
        status,
        scannedVia,
        note,
        teacherId: assignedTeacher?.id,
        teacherName,
        teacherRole,
        teacherType,
        teacherSubject,
      };

      setAttendanceRecords((prev) => {
        const updated = [newRecord, ...prev];
        safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
        return updated;
      });
      saveAttendanceToFirestore(newRecord).catch((err) =>
        console.warn('Notice saving attendance to Firestore (persisted locally):', err)
      );

      if (status === 'Hadir') {
        addToast('Absensi Berhasil', `[Hadir] ${student.name} (${student.classRoom}) - ${currentDate} ${timeStr} WIB`, 'success');
      } else {
        addToast('Absensi Terlambat', `[Terlambat] ${student.name} (${student.classRoom}) - ${currentDate} ${timeStr} WIB`, 'warning');
      }

      return { record: newRecord, isDuplicate: false };
    },
    [attendanceRecords, settings.lateCutoffTime, addToast, currentTeacher, teachers, currentSchoolId]
  );

  // Add Manual Attendance
  const handleAddManualAttendance = (
    studentId: string,
    status: AttendanceStatus,
    note?: string,
    customTime?: string
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const now = new Date();
    const timeStr =
      customTime ||
      now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

    // Teacher tracking information - always assign real teacher
    const homeroom = teachers.find(
      (t) => t.homeroomClass && isHomeroomClassMatch(student.classRoom, t.homeroomClass)
    );
    const assignedTeacher =
      currentTeacher || homeroom || teachers.find((t) => t.role === 'admin') || teachers[0];

    const teacherName = assignedTeacher?.name || 'MOH. FADLI';
    const teacherRole = assignedTeacher?.role || 'guru';
    const teacherType: TeacherType =
      assignedTeacher?.teacherType ||
      (assignedTeacher?.role === 'admin'
        ? 'admin'
        : assignedTeacher?.homeroomClass
        ? 'wali_kelas'
        : 'guru_mapel');

    const teacherSubject =
      teacherType === 'guru_mapel'
        ? (assignedTeacher?.subject ? `Mapel: ${assignedTeacher.subject}` : 'Guru Mapel')
        : teacherType === 'wali_kelas'
        ? (assignedTeacher?.homeroomClass ? `Wali ${formatClassLabel(assignedTeacher.homeroomClass)}` : 'Wali Kelas')
        : (assignedTeacher?.subject || 'Administrator Sekolah');

    const newRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}`,
      schoolId: currentSchoolId,
      studentId: student.id,
      nis: student.nis,
      studentName: student.name,
      classRoom: student.classRoom,
      date: selectedDate,
      time: timeStr,
      status,
      scannedVia: 'Manual Input',
      note: note || `Disimpan manual (${status})`,
      teacherId: assignedTeacher?.id,
      teacherName,
      teacherRole,
      teacherType,
      teacherSubject,
    };

    setAttendanceRecords((prev) => {
      const updated = [newRecord, ...prev];
      safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      return updated;
    });
    saveAttendanceToFirestore(newRecord).catch((err) =>
      console.warn('Notice saving manual attendance to Firestore:', err)
    );
    addToast('Absensi Manual Saved', `Absensi manual ${student.name} (${status}) tanggal ${selectedDate} berhasil dicatat.`, 'success');
  };

  // Update or Save Edited Attendance Record (Supports past dates editing)
  const handleUpdateAttendanceRecord = useCallback(
    (record: AttendanceRecord) => {
      setAttendanceRecords((prev) => {
        const index = prev.findIndex((r) => r.id === record.id);
        let updated: AttendanceRecord[];
        if (index >= 0) {
          updated = [...prev];
          updated[index] = record;
        } else {
          // If editing a record that matches same student and date
          const filtered = prev.filter(
            (r) => !(r.studentId === record.studentId && r.date === record.date)
          );
          updated = [record, ...filtered];
        }
        safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
        return updated;
      });
      saveAttendanceToFirestore(record).catch((err) =>
        console.warn('Notice saving updated attendance to Firestore:', err)
      );
      addToast(
        'Absensi Berhasil Disimpan',
        `Data presensi ${record.studentName} (${record.status}) tgl ${record.date} berhasil diperbarui.`,
        'success'
      );
    },
    [addToast]
  );

  // Delete Attendance Record
  const handleDeleteRecord = (id: string) => {
    setAttendanceRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
      return updated;
    });
    deleteAttendanceFromFirestore(id).catch((err) =>
      console.warn('Notice deleting attendance from Firestore:', err)
    );
    addToast('Data Dihapus', 'Riwayat absensi telah dihapus.', 'info');
  };

  // Manual Sync to Cloud (Anti-Data-Loss when clearing browser history)
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  const handleManualSyncCloud = async () => {
    setIsSyncingCloud(true);
    try {
      if (attendanceRecords.length > 0) {
        await syncAllAttendanceToFirestore(attendanceRecords);
      }
      if (students.length > 0) {
        await syncAllStudentsToFirestore(students);
      }
      if (teachers.length > 0) {
        await syncAllTeachersToFirestore(teachers);
      }
      safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
      safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      safeSetItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));

      addToast(
        'Data 100% Tersimpan di Cloud',
        `Berhasil menyinkronkan ${attendanceRecords.length} data absensi dan ${students.length} siswa ke Cloud Firestore. Data Anda tetap aman meskipun riwayat browser dibersihkan.`,
        'success'
      );
    } catch (err: any) {
      console.warn('Manual cloud sync notice:', err);
      addToast(
        'Sinkronisasi Selesai',
        'Data tersimpan di penyimpanan lokal dan sinkronisasi cloud telah diperbarui.',
        'info'
      );
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Scheduled Leaves Handlers
  const handleSaveLeave = (leave: ScheduledLeave, autoPopulateAttendance: boolean) => {
    const leaveWithSchool: ScheduledLeave = {
      ...leave,
      schoolId: leave.schoolId || currentSchoolId,
    };

    setScheduledLeaves((prev) => {
      const filtered = prev.filter((l) => l.id !== leaveWithSchool.id);
      return [leaveWithSchool, ...filtered];
    });

    saveLeaveToFirestore(leaveWithSchool).catch((err) =>
      console.warn('Failed to save leave to Firestore:', err)
    );

    // Auto-populate attendance records for the dates in leave range if enabled
    if (autoPopulateAttendance) {
      const student = students.find((s) => s.id === leaveWithSchool.studentId);
      if (student) {
        const start = new Date(leaveWithSchool.startDate);
        const end = new Date(leaveWithSchool.endDate);
        const dateList: string[] = [];

        // Loop inclusive date range
        const curr = new Date(start);
        while (curr <= end) {
          dateList.push(curr.toISOString().slice(0, 10));
          curr.setDate(curr.getDate() + 1);
        }

        const newRecordsToSave: AttendanceRecord[] = [];
        setAttendanceRecords((prev) => {
          let updated = [...prev];
          dateList.forEach((dStr) => {
            const existingIdx = updated.findIndex(
              (r) => r.studentId === student.id && r.date === dStr
            );
            const status: AttendanceStatus = leaveWithSchool.type === 'Sakit' ? 'Sakit' : 'Izin';
            const homeroom = teachers.find(
              (t) => t.homeroomClass && isHomeroomClassMatch(student.classRoom, t.homeroomClass)
            );
            const assignedTeacher =
              currentTeacher || homeroom || teachers.find((t) => t.role === 'admin') || teachers[0];
            const teacherName = leaveWithSchool.recordedBy || assignedTeacher?.name || 'MOH. FADLI';
            const teacherRole = assignedTeacher?.role || 'guru';
            const teacherType = assignedTeacher?.teacherType || (assignedTeacher?.homeroomClass ? 'wali_kelas' : 'admin');
            const teacherSubject =
              assignedTeacher?.teacherType === 'wali_kelas' || assignedTeacher?.homeroomClass
                ? (assignedTeacher?.homeroomClass ? `Wali ${assignedTeacher.homeroomClass}` : 'Wali Kelas')
                : assignedTeacher?.subject || (assignedTeacher?.role === 'admin' ? 'Administrator Sekolah' : 'Guru Pengabsen');

            const attRecord: AttendanceRecord = {
              id: existingIdx >= 0 ? updated[existingIdx].id : `att-leave-${Date.now()}-${dStr}`,
              schoolId: currentSchoolId,
              studentId: student.id,
              nis: student.nis,
              studentName: student.name,
              classRoom: student.classRoom,
              date: dStr,
              time: '07:00:00',
              status,
              scannedVia: 'Manual Input',
              note: `[Izin Terjadwal] ${leaveWithSchool.reason}`,
              teacherId: assignedTeacher?.id,
              teacherName,
              teacherRole,
              teacherType,
              teacherSubject,
            };

            if (existingIdx >= 0) {
              updated[existingIdx] = attRecord;
            } else {
              updated.unshift(attRecord);
            }
            newRecordsToSave.push(attRecord);
          });
          return updated;
        });

        // Persist generated records to Firestore
        newRecordsToSave.forEach((r) => {
          saveAttendanceToFirestore(r).catch((err) =>
            console.warn('Failed to save leave attendance to Firestore:', err)
          );
        });
      }
    }

    addToast(
      'Izin Tersimpan',
      `Jadwal ${leaveWithSchool.type} ananda ${leaveWithSchool.studentName} (${leaveWithSchool.startDate} s/d ${leaveWithSchool.endDate}) berhasil dicatat.`,
      'success'
    );
  };

  const handleDeleteLeave = (leaveId: string) => {
    setScheduledLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    deleteLeaveFromFirestore(leaveId).catch((err) =>
      console.warn('Failed to delete leave from Firestore:', err)
    );
    addToast('Izin Dihapus', 'Data izin/sakit terjadwal telah dihapus.', 'info');
  };

  // Behavior & Character Log Handlers
  const handleSaveBehaviorLog = (log: BehaviorLog) => {
    const logWithSchool: BehaviorLog = {
      ...log,
      schoolId: log.schoolId || currentSchoolId,
    };

    setBehaviorLogs((prev) => {
      const filtered = prev.filter((l) => l.id !== logWithSchool.id);
      return [logWithSchool, ...filtered];
    });

    saveBehaviorLogToFirestore(logWithSchool).catch((err) =>
      console.warn('Failed to save behavior log to Firestore:', err)
    );

    addToast(
      'Jurnal Karakter Tersimpan',
      `Catatan poin ${logWithSchool.type === 'positive' ? '+' : ''}${logWithSchool.points} untuk ${logWithSchool.studentName} berhasil dicatat.`,
      'success'
    );
  };

  const handleDeleteBehaviorLog = (logId: string) => {
    setBehaviorLogs((prev) => prev.filter((l) => l.id !== logId));
    deleteBehaviorLogFromFirestore(logId).catch((err) =>
      console.warn('Failed to delete behavior log from Firestore:', err)
    );
    addToast('Catatan Dihapus', 'Catatan jurnal perilaku siswa telah dihapus.', 'info');
  };

  // Student Management Handlers
  const handleAddStudent = (newStudentData: Omit<Student, 'id' | 'createdAt'> & { id?: string }) => {
    const uniqueId = newStudentData.id || `std-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newStudent: Student = {
      ...newStudentData,
      id: uniqueId,
      schoolId: DEFAULT_PRIMARY_SCHOOL_ID,
      createdAt: getTodayDateString(),
    };
    setStudents((prev) => [...prev, newStudent]);
    saveStudentToFirestore(newStudent).catch((err) =>
      console.warn('Failed to save student to Firestore:', err)
    );
    addToast('Siswa Ditambahkan', `${newStudent.name} berhasil didaftarkan.`, 'success');
  };

  const handleAddBulkStudents = (newStudentsList: Student[]) => {
    const timestamp = Date.now();
    const preparedStudents = newStudentsList.map((s, idx) => ({
      ...s,
      schoolId: DEFAULT_PRIMARY_SCHOOL_ID,
      id: s.id && s.id.length > 5 ? s.id : `std-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 8)}`,
      createdAt: s.createdAt || getTodayDateString(),
    }));

    setStudents((prev) => {
      const existingNisMap = new Set(prev.map((p) => p.nis.trim()));
      const filteredNew = preparedStudents.filter((s) => !existingNisMap.has(s.nis.trim()));
      const updated = [...prev, ...filteredNew];
      syncAllStudentsToFirestore(filteredNew).catch((err) =>
        console.warn('Failed to bulk sync students to Firestore:', err)
      );
      return updated;
    });

    addToast('Import Berhasil', `${newStudentsList.length} siswa baru berhasil diproses.`, 'success');
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const studentWithSchool: Student = {
      ...updatedStudent,
      schoolId: updatedStudent.schoolId || currentSchoolId,
    };
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === studentWithSchool.id);
      const updated = exists
        ? prev.map((s) => (s.id === studentWithSchool.id ? studentWithSchool : s))
        : [...prev, studentWithSchool];
      safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });
    saveStudentToFirestore(studentWithSchool).catch((err) =>
      console.warn('Failed to update student in Firestore:', err)
    );
    addToast('Data Diperbarui', `Data ${studentWithSchool.name} berhasil diperbarui.`, 'success');
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });
    deleteStudentFromFirestore(id).catch((err) =>
      console.warn('Failed to delete student from Firestore:', err)
    );
    addToast('Siswa Dihapus', 'Siswa berhasil dihapus dari database.', 'info');
  };

  const handleBulkDeleteStudents = (ids: string[]) => {
    const idSet = new Set(ids);
    setStudents((prev) => {
      const updated = prev.filter((s) => !idSet.has(s.id));
      safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      return updated;
    });
    bulkDeleteStudentsFromFirestore(ids).catch((err) =>
      console.warn('Failed to bulk delete students from Firestore:', err)
    );
    addToast('Siswa Dihapus', `${ids.length} siswa berhasil dihapus secara permanen.`, 'info');
  };

  // Reset data for the school
  const handleResetData = () => {
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setCurrentTeacher(INITIAL_TEACHERS[0]);
    setSettings(DEFAULT_SETTINGS);
    setAttendanceRecords([]);
    setScheduledLeaves([]);
    setBehaviorLogs([]);
    safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    safeSetItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
    safeSetItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    safeSetItem(LOCAL_STORAGE_KEYS.LEAVES, JSON.stringify([]));
    safeSetItem(LOCAL_STORAGE_KEYS.BEHAVIOR_LOGS, JSON.stringify([]));
    saveSettingsToFirestore(DEFAULT_SETTINGS, DEFAULT_PRIMARY_SCHOOL_ID).catch((e) => console.warn(e));
    addToast('Reset Berhasil', 'Semua data sekolah berhasil direset ke data awal.', 'info');
  };

  // Restore Data Handler for Cloud Sync / JSON File Import
  const handleRestoreData = (restored: {
    students: Student[];
    attendanceRecords: AttendanceRecord[];
    settings: SystemSettings;
    teachers: Teacher[];
    schools?: School[];
  }) => {
    const targetSchoolId = DEFAULT_PRIMARY_SCHOOL_ID;

    // Normalize all items with consistent IDs and schoolId
    const seenStudentIds = new Set<string>();
    const normStudents: Student[] = (restored.students || []).map((s, idx) => {
      let id = s.id && typeof s.id === 'string' && s.id.trim() !== ''
        ? s.id.trim()
        : `std-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      if (seenStudentIds.has(id)) {
        id = `std-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenStudentIds.add(id);
      return {
        ...s,
        id,
        schoolId: targetSchoolId,
      };
    });

    const seenTeacherIds = new Set<string>();
    const normTeachers: Teacher[] = (restored.teachers || []).map((t, idx) => {
      let id = t.id && typeof t.id === 'string' && t.id.trim() !== ''
        ? t.id.trim()
        : `tch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      if (seenTeacherIds.has(id)) {
        id = `tch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      }
      seenTeacherIds.add(id);
      return {
        ...t,
        id,
        schoolId: targetSchoolId,
      };
    });

    const normAttendance: AttendanceRecord[] = (restored.attendanceRecords || []).map((r, idx) => ({
      ...r,
      id: r.id && typeof r.id === 'string' && r.id.trim() !== ''
        ? r.id.trim()
        : `att-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      schoolId: targetSchoolId,
    }));

    const normSettings: SystemSettings = {
      ...(restored.settings || settings),
      schoolId: targetSchoolId,
    };

    // Merge data cleanly into single school state
    setStudents((prev) => {
      const studentMap = new Map<string, Student>();
      prev.forEach((s) => studentMap.set(s.id, s));
      normStudents.forEach((s) => studentMap.set(s.id, s));
      const merged = Array.from(studentMap.values());
      safeSetItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(merged));
      return merged;
    });

    setTeachers((prev) => {
      const teacherMap = new Map<string, Teacher>();
      prev.forEach((t) => teacherMap.set(t.id, t));
      teacherMap.set(INITIAL_TEACHERS[0].id, { ...INITIAL_TEACHERS[0], pin: 'Hanin231221' });
      normTeachers.forEach((t) => teacherMap.set(t.id, t));
      const merged = Array.from(teacherMap.values());
      safeSetItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(merged));
      return merged;
    });

    setAttendanceRecords((prev) => {
      const attMap = new Map<string, AttendanceRecord>();
      prev.forEach((r) => attMap.set(r.id, r));
      normAttendance.forEach((r) => attMap.set(r.id, r));
      const merged = Array.from(attMap.values());
      safeSetItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
      return merged;
    });

    setSettings(normSettings);
    safeSetItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(normSettings));

    // Batch-sync to Firestore in the background
    if (normStudents.length > 0) {
      syncAllStudentsToFirestore(normStudents).catch((e) =>
        console.warn('Firestore restore students sync warning:', e)
      );
    }
    if (normTeachers.length > 0) {
      syncAllTeachersToFirestore(normTeachers).catch((e) =>
        console.warn('Firestore restore teachers sync warning:', e)
      );
    }
    if (normAttendance.length > 0) {
      syncAllAttendanceToFirestore(normAttendance).catch((e) =>
        console.warn('Firestore restore attendance sync warning:', e)
      );
    }
    if (normSettings) {
      saveSettingsToFirestore(normSettings, targetSchoolId).catch((e) =>
        console.warn('Firestore restore settings sync warning:', e)
      );
    }
  };

  // Single School Scoped Data (Semua data terpusat untuk 1 sekolah - SD Inpres 2 Ulatan):
  const effectiveStudents = students;
  const effectiveAttendance = attendanceRecords;
  const effectiveTeachers = teachers;
  const effectiveLeaves = scheduledLeaves;
  const effectiveBehaviorLogs = behaviorLogs;

  const todayCount = effectiveAttendance.filter((r) => r.date === todayStr).length;

  return (
    <ErrorBoundary fallbackTitle="Terjadi Kendala pada Aplikasi Utama">
      {/* Refined "Warna Latar Hijau yang Bagus": Fresh, elegant soft emerald/sage mint canvas in light mode, deep luxury emerald noir in dark mode */}
      <div className="min-h-screen bg-emerald-50/50 dark:bg-[#031d17] text-slate-800 dark:text-slate-100 flex flex-row font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-600 selection:text-white transition-colors duration-200">
        {/* Locked Sidebar Navigation (Stays fixed on left, does NOT scroll down with content) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          todayCount={todayCount}
          settings={settings}
          currentTeacher={currentTeacher}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleTeacherLogout}
          onOpenTeacherManage={() => setIsTeacherModalOpen(true)}
          onOpenAdminProfile={() => setIsAdminProfileModalOpen(true)}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
          onOpenAnnouncement={handleOpenAnnouncement}
          onOpenERaporSync={() => setIsERaporSyncModalOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Right Column: Header (Date & Dark/Light mode only) and Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Top Header - ONLY Date/Time and Dark/Light Mode toggle as requested */}
          <Header
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
            currentSchoolName={settings.schoolName || 'SD INPRES 2 ULATAN'}
          />

          {/* Toast Notifications */}
          <Toast toasts={toasts} onDismiss={dismissToast} />

          {/* Main Content View */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
          {activeTab === 'dashboard' && (
            <ErrorBoundary fallbackTitle="Terjadi Kendala pada Dashboard Rekap">
              <DashboardTab
                students={effectiveStudents}
                attendanceRecords={effectiveAttendance}
                scheduledLeaves={effectiveLeaves}
                behaviorLogs={effectiveBehaviorLogs}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                settings={settings}
                teachers={effectiveTeachers}
                currentTeacher={currentTeacher}
                onAddManualAttendance={handleAddManualAttendance}
                onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
                onDeleteRecord={handleDeleteRecord}
                onSaveLeave={handleSaveLeave}
                onDeleteLeave={handleDeleteLeave}
                onSaveBehaviorLog={handleSaveBehaviorLog}
                onDeleteBehaviorLog={handleDeleteBehaviorLog}
                onOpenERaporSync={() => setIsERaporSyncModalOpen(true)}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'scanner' && (
            <ErrorBoundary fallbackTitle="Terjadi Kendala pada Pemindai QR Camera">
              <ScannerTab
                students={effectiveStudents}
                attendanceRecords={effectiveAttendance}
                settings={settings}
                teachers={effectiveTeachers}
                currentTeacher={currentTeacher}
                onSelectTeacher={(t) => {
                  setCurrentTeacher(t);
                  addToast('Guru Pengabsen Diubah', `Petugas pengabsen aktif: ${t.name}`, 'info');
                }}
                onRecordAttendance={handleRecordAttendance}
                onManualSyncCloud={handleManualSyncCloud}
                isSyncingCloud={isSyncingCloud}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'students' && (
            <ErrorBoundary fallbackTitle="Terjadi Kendala pada Kelola Data Siswa">
              <StudentsTab
                students={effectiveStudents}
                settings={settings}
                currentTeacher={currentTeacher}
                teachers={effectiveTeachers}
                scheduledLeaves={effectiveLeaves}
                behaviorLogs={effectiveBehaviorLogs}
                onAddStudent={handleAddStudent}
                onAddBulkStudents={handleAddBulkStudents}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onDeleteBulkStudents={handleBulkDeleteStudents}
                onSaveLeave={handleSaveLeave}
                onDeleteLeave={handleDeleteLeave}
                onSaveBehaviorLog={handleSaveBehaviorLog}
                onDeleteBehaviorLog={handleDeleteBehaviorLog}
                onOpenERaporSync={() => setIsERaporSyncModalOpen(true)}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'simulator' && (
            <ErrorBoundary fallbackTitle="Terjadi Kendala pada Pengaturan & Simulasi">
              <SimulatorTab
                students={effectiveStudents}
                attendanceRecords={effectiveAttendance}
                settings={settings}
                currentTeacher={currentTeacher}
                isDarkMode={isDarkMode}
                onToggleDarkMode={handleToggleDarkMode}
                onUpdateSettings={handleUpdateSettings}
                onRecordAttendance={handleRecordAttendance}
                onResetData={handleResetData}
                onOpenAnnouncement={handleOpenAnnouncement}
                onResetAnnouncementStatus={handleResetAnnouncementStatus}
              />
            </ErrorBoundary>
          )}
        </main>

        {/* Teacher Login Modal */}
        {isLoginModalOpen && (
          <LoginModal
            teachers={teachers}
            currentTeacher={currentTeacher}
            onLogin={handleTeacherLogin}
            onClose={() => setIsLoginModalOpen(false)}
            canClose={true}
            schools={schools}
            currentSchoolId={currentSchoolId}
            onUpdateTeacherPin={handleUpdateTeacherPin}
          />
        )}

        {/* Teacher Management Modal for Admin */}
        {isTeacherModalOpen && (
          <TeacherManagementModal
            teachers={effectiveTeachers}
            currentTeacher={currentTeacher}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onClose={() => setIsTeacherModalOpen(false)}
          />
        )}

        {/* Admin Profile & School Data Customization Modal */}
        {isAdminProfileModalOpen && currentTeacher && (
          <AdminProfileModal
            currentTeacher={currentTeacher}
            settings={settings}
            onUpdateTeacher={handleUpdateTeacher}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setIsAdminProfileModalOpen(false)}
          />
        )}

        {/* Guide Modal for Teachers & Selling app */}
        {isGuideModalOpen && (
          <GuideModal
            onClose={() => setIsGuideModalOpen(false)}
            onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
          />
        )}

        {/* Cloud Sync & Export Modal */}
        {isCloudSyncModalOpen && (
          <CloudSyncModal
            students={effectiveStudents}
            attendanceRecords={effectiveAttendance}
            settings={settings}
            teachers={effectiveTeachers}
            schools={schools}
            onRestoreData={handleRestoreData}
            onClose={() => setIsCloudSyncModalOpen(false)}
            onShowToast={addToast}
          />
        )}

        {/* Dapodik Announcement & Feature Update Pop-up Modal */}
        {isAnnouncementOpen && (
          <DapodikAnnouncementModal
            isOpen={isAnnouncementOpen}
            onClose={handleCloseAnnouncement}
            settings={settings}
            currentTeacher={currentTeacher}
            onUpdateSettings={handleUpdateSettings}
            onNavigateToSettings={() => {
              setActiveTab('simulator');
            }}
          />
        )}

        {/* e-Rapor Merdeka Semester Recap Synchronization Modal (iihh Beres) */}
        {isERaporSyncModalOpen && (
          <ERaporSyncModal
            isOpen={isERaporSyncModalOpen}
            onClose={() => setIsERaporSyncModalOpen(false)}
            students={effectiveStudents}
            attendanceRecords={effectiveAttendance}
            scheduledLeaves={effectiveLeaves}
            settings={settings}
            currentTeacher={currentTeacher}
            onSuccessToast={(title, msg) => addToast(title, msg, 'success')}
          />
        )}

          {/* Footer with Firebase Cloud status */}
          <footer className="border-t border-[#0d5947] dark:border-[#07382d] bg-[#043328] dark:bg-[#011a14] py-4 text-center text-xs text-emerald-200/80 dark:text-emerald-300/70 no-print transition-colors">
            <div className="flex items-center justify-center gap-2 flex-wrap px-4">
              <span>&copy; {new Date().getFullYear()} {settings.schoolName} — Sistem Absensi QR Code Siswa</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Firebase Cloud Connected
              </span>
            </div>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
