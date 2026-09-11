import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus, Student, Teacher } from '../types';
import { isHomeroomClassMatch } from '../utils/classUtils';

interface EditAttendanceModalProps {
  students: Student[];
  teachers: Teacher[];
  currentTeacher: Teacher | null;
  attendanceRecords: AttendanceRecord[];
  initialRecord?: AttendanceRecord | null;
  initialDate?: string;
  onClose: () => void;
  onSave: (record: AttendanceRecord) => void;
  onDelete?: (recordId: string) => void;
}

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  students,
  teachers,
  currentTeacher,
  attendanceRecords,
  initialRecord,
  initialDate,
  onClose,
  onSave,
  onDelete,
}) => {
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.teacherType === 'admin';
  const isWaliKelas = !isAdmin && (currentTeacher?.teacherType === 'wali_kelas' || Boolean(currentTeacher?.homeroomClass));
  const isGuruMapel = !isAdmin && !isWaliKelas && (currentTeacher?.teacherType === 'guru_mapel' || Boolean(currentTeacher?.subject));
  const myHomeroom = currentTeacher?.homeroomClass;

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (initialRecord) return initialRecord.date;
    if (initialDate) return initialDate;
    return new Date().toISOString().split('T')[0];
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialRecord) return initialRecord.studentId;
    return '';
  });

  const [searchStudent, setSearchStudent] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>(() => initialRecord?.status || 'Hadir');
  const [timeStr, setTimeStr] = useState<string>(() => {
    if (initialRecord?.time) return initialRecord.time.slice(0, 5);
    return '07:00';
  });
  const [note, setNote] = useState<string>(() => initialRecord?.note || '');
  const [actingTeacherId, setActingTeacherId] = useState<string>(() => {
    if (initialRecord?.teacherId) return initialRecord.teacherId;
    if (currentTeacher?.id) return currentTeacher.id;
    return teachers[0]?.id || '';
  });

  // Filter students based on role permissions
  const allowedStudents = useMemo(() => {
    let list = students;
    if (isWaliKelas && myHomeroom) {
      list = list.filter((s) => isHomeroomClassMatch(s.classRoom, myHomeroom));
    }
    if (searchStudent.trim()) {
      const q = searchStudent.toLowerCase().trim();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.nis.includes(q) || s.classRoom.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, isWaliKelas, myHomeroom, searchStudent]);

  // Set initial student if not set
  useEffect(() => {
    if (!selectedStudentId && allowedStudents.length > 0) {
      setSelectedStudentId(allowedStudents[0].id);
    }
  }, [allowedStudents, selectedStudentId]);

  // Find existing record for this student and date
  const existingRecordForSelection = useMemo(() => {
    if (!selectedStudentId || !selectedDate) return null;
    return attendanceRecords.find((r) => r.studentId === selectedStudentId && r.date === selectedDate) || null;
  }, [attendanceRecords, selectedStudentId, selectedDate]);

  // Populate form if an existing record exists for the selected date & student
  useEffect(() => {
    if (existingRecordForSelection) {
      setStatus(existingRecordForSelection.status);
      setTimeStr(existingRecordForSelection.time.slice(0, 5));
      setNote(existingRecordForSelection.note || '');
      if (existingRecordForSelection.teacherId) {
        setActingTeacherId(existingRecordForSelection.teacherId);
      }
    }
  }, [existingRecordForSelection]);

  const selectedStudentObj = students.find((s) => s.id === selectedStudentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentObj) return;

    const teacherObj = teachers.find((t) => t.id === actingTeacherId) || currentTeacher || teachers[0];

    const teacherType: 'admin' | 'wali_kelas' | 'guru_mapel' =
      teacherObj?.teacherType ||
      (teacherObj?.role === 'admin'
        ? 'admin'
        : teacherObj?.homeroomClass
        ? 'wali_kelas'
        : 'guru_mapel');

    const teacherSubject =
      teacherType === 'wali_kelas'
        ? (teacherObj?.homeroomClass ? `Wali ${teacherObj.homeroomClass}` : 'Wali Kelas')
        : teacherType === 'guru_mapel'
        ? (teacherObj?.subject ? `Mapel: ${teacherObj.subject}` : 'Guru Mapel')
        : (teacherObj?.subject || 'Administrator');

    const fullTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;

    const recordToSave: AttendanceRecord = {
      id: existingRecordForSelection?.id || initialRecord?.id || `att-edit-${Date.now()}`,
      schoolId: selectedStudentObj.schoolId,
      studentId: selectedStudentObj.id,
      nis: selectedStudentObj.nis,
      studentName: selectedStudentObj.name,
      classRoom: selectedStudentObj.classRoom,
      date: selectedDate,
      time: fullTime,
      status,
      scannedVia: existingRecordForSelection?.scannedVia || 'Manual Input',
      note: note.trim() || `Koreksi absensi (${status}) oleh ${teacherObj?.name || 'Petugas'}`,
      teacherId: teacherObj?.id,
      teacherName: teacherObj?.name || 'Guru Pengabsen',
      teacherRole: teacherObj?.role || 'guru',
      teacherType,
      teacherSubject,
    };

    onSave(recordToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl relative my-auto animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-lg font-bold shadow-xs">
              <i className="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                {initialRecord ? 'Edit Catatan Presensi' : 'Edit / Input Presensi Lampau'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isGuruMapel
                  ? `Akses Guru Mapel (${currentTeacher?.subject})`
                  : isWaliKelas
                  ? `Akses Wali Kelas (${myHomeroom})`
                  : 'Akses Administrator Sekolah'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* 1. Date Selector */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Tanggal Presensi:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* 2. Student Selection */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Pilih Siswa:
            </label>
            {initialRecord ? (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-indigo-950 dark:text-indigo-200 text-sm block">
                    {initialRecord.studentName}
                  </span>
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                    NIS: {initialRecord.nis} | Kelas: {initialRecord.classRoom}
                  </span>
                </div>
                <span className="px-2 py-1 bg-indigo-600 text-white font-bold rounded-lg text-[10px]">
                  Terkunci
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Ketik untuk memfilter nama / NIS..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-1"
                />
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {allowedStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - Kelas {s.classRoom} (NIS: {s.nis})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Existing Status Indicator Banner */}
          {existingRecordForSelection && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <i className="fa-solid fa-info-circle text-amber-600"></i>
                <span>Catatan sebelumnya ditemukan pada {selectedDate}:</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Status: <strong>{existingRecordForSelection.status}</strong> ({existingRecordForSelection.time} WIB) - Pengabsen: <strong>{existingRecordForSelection.teacherName || 'Petugas'}</strong> ({existingRecordForSelection.teacherSubject || 'Wali/Admin'})
              </p>
            </div>
          )}

          {/* 3. Status Selector */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Status Kehadiran:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'] as AttendanceStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                    status === st
                      ? st === 'Hadir'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : st === 'Terlambat'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : st === 'Izin'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : st === 'Sakit'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Time and Teacher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Jam Kedatangan (WIB):
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Petugas / Pengabsen:
              </label>
              <select
                value={actingTeacherId}
                onChange={(e) => setActingTeacherId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.teacherType === 'wali_kelas' ? (t.homeroomClass ? `Wali ${t.homeroomClass}` : 'Wali') : t.teacherType === 'guru_mapel' ? `Mapel ${t.subject}` : 'Admin'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Notes */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Catatan / Keterangan Koreksi:
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Koreksi absensi karena surat dokter susulan / instruksi guru mapel"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            {initialRecord && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Yakin ingin menghapus rekaman absensi ${initialRecord.studentName} pada ${initialRecord.date}?`)) {
                    onDelete(initialRecord.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
                <span>Hapus Absen Ini</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk text-xs"></i>
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
