import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Student, SystemSettings } from '../types';
import { createStudentQRPayload, generateQRCodeDataURL } from '../utils/qr';
import {
  CardCustomizationOptions,
  drawCustomizedCardPDF,
} from '../utils/cardCustomization';
import { CardCustomizationPanel } from './CardCustomizationPanel';
import { StudentCardRenderer } from './StudentCardRenderer';

interface StudentCardModalProps {
  student: Student;
  settings: SystemSettings;
  onClose: () => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  student,
  settings,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [cardOptions, setCardOptions] = useState<CardCustomizationOptions>({
    theme: 'wave',
    color: 'blue',
    font: 'sans',
  });

  useEffect(() => {
    const payload = createStudentQRPayload(student);
    generateQRCodeDataURL(payload).then((url) => setQrDataUrl(url));
  }, [student]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Draw single card centered on A4 page
      const cardWidth = 90;
      const cardHeight = 62;
      const x = (210 - cardWidth) / 2;
      const y = (297 - cardHeight) / 2;

      let photoDataUrl: string | undefined = undefined;
      const photoSrc = student.photo || student.avatarUrl;
      if (photoSrc) {
        if (photoSrc.startsWith('data:image')) {
          photoDataUrl = photoSrc;
        } else {
          try {
            photoDataUrl = await new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = 'Anonymous';
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 160;
                canvas.height = img.naturalHeight || 200;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  resolve(canvas.toDataURL('image/jpeg', 0.9));
                } else {
                  resolve(undefined);
                }
              };
              img.onerror = () => resolve(undefined);
              img.src = photoSrc;
            });
          } catch {
            photoDataUrl = undefined;
          }
        }
      }

      drawCustomizedCardPDF(
        doc,
        x,
        y,
        cardWidth,
        cardHeight,
        student,
        settings.schoolName,
        photoDataUrl,
        qrDataUrl,
        cardOptions
      );

      const safeName = student.name.replace(/\s+/g, '_');
      doc.save(`Kartu_Presensi_QR_${student.nis}_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Gagal mengekspor PDF kartu.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${student.nis}_${student.name.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl relative my-auto animate-scale-up overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-lg font-bold shadow-sm shadow-indigo-600/20">
              <i className="fa-solid fa-id-card"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Kartu QR Digital Pelajar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih tema, warna, dan font sebelum mencetak atau mengunduh PDF.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Tutup"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Customization Toolbar */}
        <CardCustomizationPanel
          options={cardOptions}
          onChange={setCardOptions}
        />

        {/* Card View Area */}
        <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center overflow-y-auto">
          {/* Printable container styling for browser print */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #single-card-printable,
              #single-card-printable * {
                visibility: visible;
              }
              #single-card-printable {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                background: white !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
            }
          `}</style>

          <div id="single-card-printable" className="w-full max-w-xl">
            <StudentCardRenderer
              student={student}
              settings={settings}
              options={cardOptions}
              qrUrl={qrDataUrl}
              photoUrl={student.photo || student.avatarUrl}
              showCheckbox={false}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 no-print">
          <button
            onClick={handleDownloadQR}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            <i className="fa-solid fa-download text-indigo-600 dark:text-indigo-400"></i>
            <span>Unduh File QR</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <i className={`fa-solid ${isExportingPDF ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
              <span>{isExportingPDF ? 'Membuat PDF...' : 'Unduh PDF Kartu'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-print"></i>
              <span>Cetak Kartu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
