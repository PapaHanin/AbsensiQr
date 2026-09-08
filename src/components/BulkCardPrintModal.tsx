import React, { useState, useEffect, useMemo } from 'react';
import { Student, SystemSettings, Teacher } from '../types';
import { createStudentQRPayload, generateQRCodeDataURL } from '../utils/qr';
import { isHomeroomClassMatch } from '../utils/classUtils';
import {
  CardCustomizationOptions,
  drawCustomizedCardPDF,
} from '../utils/cardCustomization';
import { CardCustomizationPanel } from './CardCustomizationPanel';
import { StudentCardRenderer } from './StudentCardRenderer';
import jsPDF from 'jspdf';

interface BulkCardPrintModalProps {
  students: Student[];
  settings: SystemSettings;
  currentTeacher: Teacher | null;
  initialClass?: string;
  initialSelectedIds?: string[];
  onClose: () => void;
}

export const BulkCardPrintModal: React.FC<BulkCardPrintModalProps> = ({
  students,
  settings,
  currentTeacher,
  initialClass = 'Semua',
  initialSelectedIds,
  onClose,
}) => {
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.teacherType === 'admin';
  const isWaliKelas = !isAdmin && (currentTeacher?.teacherType === 'wali_kelas' || Boolean(currentTeacher?.homeroomClass));
  const myHomeroom = currentTeacher?.homeroomClass;

  // Determine active class filter:
  // If Wali Kelas, strictly lock to their homeroom class
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (isWaliKelas && myHomeroom) {
      return myHomeroom;
    }
    return initialClass !== 'Semua' ? initialClass : 'Semua';
  });

  // Card Customization Options (Theme, Color, Font)
  const [cardOptions, setCardOptions] = useState<CardCustomizationOptions>({
    theme: 'wave',
    color: 'blue',
    font: 'sans',
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return new Set(initialSelectedIds);
    }
    return new Set();
  });
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [isGeneratingQR, setIsGeneratingQR] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Available classes derived from students
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach((s) => {
      if (s.classRoom) classSet.add(s.classRoom);
    });
    return Array.from(classSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students]);

  // Filter students based on class selection and role
  const classFilteredStudents = useMemo(() => {
    let list = students;
    if (isWaliKelas && myHomeroom) {
      list = list.filter((s) => isHomeroomClassMatch(s.classRoom, myHomeroom));
    } else if (selectedClass !== 'Semua') {
      list = list.filter((s) => isHomeroomClassMatch(s.classRoom, selectedClass) || s.classRoom === selectedClass);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      const clsCompare = (a.classRoom || '').localeCompare(b.classRoom || '', undefined, { numeric: true });
      if (clsCompare !== 0) return clsCompare;
      return a.name.localeCompare(b.name);
    });
  }, [students, isWaliKelas, myHomeroom, selectedClass, searchQuery]);

  // Initialize selected student IDs if not passed via props
  useEffect(() => {
    if (!initialSelectedIds || initialSelectedIds.length === 0) {
      setSelectedStudentIds(new Set(classFilteredStudents.map((s) => s.id)));
    }
  }, [classFilteredStudents, initialSelectedIds]);

  // Helper to convert image URL to Base64 for safe jsPDF rendering
  const loadPhotoAsDataUrl = async (url: string): Promise<string | null> => {
    if (!url) return null;
    if (url.startsWith('data:image')) return url;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 160;
          canvas.height = img.naturalHeight || 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Generate QR Code & Photo Data URLs for all students in the list
  useEffect(() => {
    let isMounted = true;
    setIsGeneratingQR(true);

    const generateAll = async () => {
      const qMap: Record<string, string> = {};
      const pMap: Record<string, string> = {};

      for (const student of classFilteredStudents) {
        try {
          const payload = createStudentQRPayload(student);
          const dataUrl = await generateQRCodeDataURL(payload);
          qMap[student.id] = dataUrl;
        } catch (e) {
          console.error('Error generating QR for student:', student.name, e);
        }

        const photoSrc = student.photo || student.avatarUrl;
        if (photoSrc) {
          try {
            const photoDataUrl = await loadPhotoAsDataUrl(photoSrc);
            if (photoDataUrl) {
              pMap[student.id] = photoDataUrl;
            }
          } catch (e) {
            console.warn('Error loading student photo for PDF:', student.name, e);
          }
        }
      }

      if (isMounted) {
        setQrMap(qMap);
        setPhotoMap(pMap);
        setIsGeneratingQR(false);
      }
    };

    if (classFilteredStudents.length > 0) {
      generateAll();
    } else {
      setIsGeneratingQR(false);
    }

    return () => {
      isMounted = false;
    };
  }, [classFilteredStudents]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStudentIds(new Set(classFilteredStudents.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const printableStudents = useMemo(() => {
    return classFilteredStudents.filter((s) => selectedStudentIds.has(s.id));
  }, [classFilteredStudents, selectedStudentIds]);

  // Direct browser print
  const handlePrint = () => {
    window.print();
  };

  // Export to Vector PDF (8 Cards per A4 Page)
  const handleExportPDF = async () => {
    if (printableStudents.length === 0) return;
    setIsExportingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // 8 Cards per A4 Page Layout: 2 columns x 4 rows
      const cardsPerPage = 8;
      const cardWidth = 90;
      const cardHeight = 62;
      const marginX = 10;
      const marginY = 12;
      const gapX = 10;
      const gapY = 8;

      for (let i = 0; i < printableStudents.length; i++) {
        const student = printableStudents[i];
        const slotIndex = i % cardsPerPage;

        if (i > 0 && slotIndex === 0) {
          doc.addPage();
        }

        const col = slotIndex % 2;
        const row = Math.floor(slotIndex / 2);
        const x = marginX + col * (cardWidth + gapX);
        const y = marginY + row * (cardHeight + gapY);

        drawCustomizedCardPDF(
          doc,
          x,
          y,
          cardWidth,
          cardHeight,
          student,
          settings.schoolName,
          photoMap[student.id],
          qrMap[student.id],
          cardOptions
        );

        // Cutting Guideline Marks (Dashed light grey lines)
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.18);
        doc.setLineDashPattern([1.5, 2], 0);

        // Vertical divider between column 0 and column 1
        if (col === 0) {
          const cutX = marginX + cardWidth + gapX / 2;
          doc.line(cutX, y - 2, cutX, y + cardHeight + 2);
        }
        // Horizontal divider between rows
        if (row < 3) {
          const cutY = y + cardHeight + gapY / 2;
          doc.line(x - 2, cutY, x + cardWidth + 2, cutY);
        }
        doc.setLineDashPattern([], 0);
      }

      const safeClass = selectedClass.replace(/\s+/g, '_');
      const safeSchool = settings.schoolName.replace(/\s+/g, '_');
      doc.save(`Kartu_Presensi_QR_${safeSchool}_Kelas_${safeClass}_8perA4.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Terjadi kesalahan saat mengekspor PDF kartu siswa.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl relative my-auto animate-scale-up overflow-hidden">
        {/* Modal Top Control Bar (Non-Printable) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-lg font-bold shadow-sm shadow-indigo-600/20 shrink-0">
              <i className="fa-solid fa-id-card"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Cetak Kartu QR Siswa (Format 8 Kartu per A4)
                </h3>
                {isWaliKelas && myHomeroom && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Wali Kelas {myHomeroom}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Format standar 8 kartu per lembar A4. Pilih tema, warna, dan jenis tulisan sesuai identitas sekolah Anda.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingQR || isExportingPDF || printableStudents.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              title="Unduh File PDF A4 Siap Cetak (8 Kartu / Lembar)"
            >
              <i className={`fa-solid ${isExportingPDF ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
              <span>{isExportingPDF ? 'Membuat PDF...' : 'Unduh PDF (8/A4)'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isGeneratingQR || printableStudents.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              title="Cetak langsung ke printer"
            >
              <i className="fa-solid fa-print"></i>
              <span>Cetak Sekarang</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
              title="Tutup"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* Customization Toolbar (Theme, Color, Font) */}
        <CardCustomizationPanel
          options={cardOptions}
          onChange={setCardOptions}
        />

        {/* Filters & Selection Controls (Non-Printable) */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Class Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
              <i className="fa-solid fa-graduation-cap text-indigo-600 dark:text-indigo-400"></i>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Kelas:</span>
              {isWaliKelas && myHomeroom ? (
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                  Kelas {myHomeroom} (Terkunci ke Kelas Anda)
                </span>
              ) : (
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="Semua" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                    Semua Kelas ({students.length} siswa)
                  </option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Locked Format Badge (8 Kartu / Lembar) */}
            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 text-indigo-800 dark:text-indigo-300">
              <i className="fa-solid fa-table-cells text-indigo-600 dark:text-indigo-400"></i>
              <span className="font-bold">Format Lembar: 8 Kartu per A4 (Presisi 2x4)</span>
            </div>

            {/* Search filter within class */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Terpilih: <strong>{printableStudents.length}</strong> dari {classFilteredStudents.length} siswa
            </span>
            <button
              onClick={selectAll}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Pilih Semua
            </button>
            <button
              onClick={deselectAll}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>
        </div>

        {/* Scrollable Printable Cards Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          {isGeneratingQR ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-xl animate-spin">
                <i className="fa-solid fa-spinner"></i>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Menghasilkan Kode QR Beresolusi Tinggi...
              </p>
              <p className="text-xs text-slate-500">
                Memproses kode QR agar tajam dan mudah dipindai di berbagai perangkat.
              </p>
            </div>
          ) : printableStudents.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 text-xl">
                <i className="fa-solid fa-id-card-clip"></i>
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Tidak ada kartu yang dipilih</p>
              <p className="text-xs text-slate-400">
                Centang siswa di atas atau ubah filter kelas untuk melihat kartu yang ingin dicetak.
              </p>
            </div>
          ) : (
            <div id="printable-cards-container" className="space-y-6">
              {/* CSS for direct Print dialog */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #printable-cards-container,
                  #printable-cards-container * {
                    visibility: visible;
                  }
                  #printable-cards-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0;
                    margin: 0;
                    background: white !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .page-break {
                    page-break-after: always;
                    break-after: page;
                  }
                  .card-item {
                    page-break-inside: avoid;
                    break-inside: avoid;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 10mm;
                  }
                }
              `}</style>

              {/* Grid Layout of Cards: 2 Columns (8 cards per page with page-break) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                {printableStudents.map((student, idx) => {
                  const isChecked = selectedStudentIds.has(student.id);
                  const qrUrl = qrMap[student.id];
                  const photoSrc = photoMap[student.id] || student.photo || student.avatarUrl;

                  return (
                    <div
                      key={student.id}
                      className={(idx + 1) % 8 === 0 ? 'page-break' : ''}
                    >
                      <StudentCardRenderer
                        student={student}
                        settings={settings}
                        options={cardOptions}
                        qrUrl={qrUrl}
                        photoUrl={photoSrc}
                        isSelected={isChecked}
                        onToggleSelect={() => toggleStudent(student.id)}
                        showCheckbox={true}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
