import React from 'react';
import { SystemSettings, Teacher } from '../types';
import { MonthlyStudentRecapItem } from '../utils/pdf';
import { formatCleanNIP } from '../utils/classUtils';

interface PrintMonthlyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  recaps: MonthlyStudentRecapItem[];
  monthLabel: string;
  selectedClass: string;
  settings: SystemSettings;
  effectiveSchoolDays: number;
  onUpdateEffectiveDays?: (days: number) => void;
  homeroomTeacher?: {
    name?: string;
    nip?: string;
    classLabel?: string;
  };
  headmaster?: {
    name?: string;
    nip?: string;
  };
  adminTeacher?: Teacher | null;
}

export const PrintMonthlyRecapModal: React.FC<PrintMonthlyRecapModalProps> = ({
  isOpen,
  onClose,
  recaps,
  monthLabel,
  selectedClass,
  settings,
  effectiveSchoolDays,
  onUpdateEffectiveDays,
  homeroomTeacher,
  headmaster,
  adminTeacher,
}) => {
  if (!isOpen) return null;

  const totalHadir = recaps.reduce((sum, r) => sum + r.hadir, 0);
  const totalTerlambat = recaps.reduce((sum, r) => sum + r.terlambat, 0);
  const totalSakit = recaps.reduce((sum, r) => sum + r.sakit, 0);
  const totalIzin = recaps.reduce((sum, r) => sum + r.izin, 0);
  const totalAlpa = recaps.reduce((sum, r) => sum + r.alpa, 0);
  const totalMasuk = recaps.reduce((sum, r) => sum + r.totalHadir, 0);
  const averagePercentage =
    recaps.length > 0 ? Math.round(recaps.reduce((sum, r) => sum + r.percentage, 0) / recaps.length) : 0;

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="print-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] overflow-hidden">
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="no-print p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-xs">
              <i className="fa-solid fa-print"></i>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Cetak Rekapitulasi Presensi Bulanan</span>
                <span className="text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono font-normal">
                  {selectedClass === 'Semua' ? 'Semua Kelas' : selectedClass}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Bulan {monthLabel} • Format Cetak Resmi SD Inpres 2 Ulatan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Effective school days control */}
            {onUpdateEffectiveDays && (
              <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-300 font-medium">Hari Efektif:</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={effectiveSchoolDays}
                  onChange={(e) => onUpdateEffectiveDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 bg-slate-950 text-emerald-400 font-mono font-bold text-center rounded border border-slate-600 py-0.5"
                  title="Sesuaikan jumlah hari efektif sekolah seragam untuk semua siswa"
                />
                <span className="text-slate-400">Hari</span>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-print text-sm"></i>
              <span>Cetak Sekarang (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <i className="fa-solid fa-xmark mr-1.5"></i>
              Tutup
            </button>
          </div>
        </div>

        {/* CSS for print layout */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-monthly-recap,
            #printable-monthly-recap * {
              visibility: visible !important;
            }
            #printable-monthly-recap {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 10mm !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border: 1px solid #334155 !important;
              padding: 4px 6px !important;
              font-size: 8.5pt !important;
            }
            th {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              font-weight: bold !important;
              text-align: center !important;
            }
            .kop-divider {
              border-top: 3px double #000 !important;
              margin: 8px 0 12px 0 !important;
            }
          }
        `}</style>

        {/* Printable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/50">
          <div
            id="printable-monthly-recap"
            className="bg-white text-slate-900 max-w-5xl mx-auto p-6 sm:p-8 rounded-xl shadow-md border border-slate-200"
          >
            {/* Kop Surat Resmi SD Inpres 2 Ulatan */}
            <div className="text-center pb-2">
              <h3 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase">
                {settings.schoolRegency || 'PEMERINTAH KABUPATEN PARIGI MOUTONG'}
              </h3>
              <h3 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h3>
              <h1 className="text-base sm:text-xl font-black text-slate-950 tracking-wide uppercase mt-0.5">
                {settings.schoolName || 'SD INPRES 2 ULATAN'}
              </h1>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                NPSN: {settings.npsn || '40206214'} &bull; NSS: {settings.nss || '101180816027'}
              </p>
              <p className="text-[10px] text-slate-600 italic">
                Alamat: {settings.schoolAddress || 'Desa Ulatan, Kec. Palasa, Kab. Parigi Moutong, Sulawesi Tengah'}
              </p>
              <div className="kop-divider border-t-2 border-double border-slate-900 mt-2 mb-3"></div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-4">
              <h2 className="text-sm sm:text-base font-extrabold uppercase underline tracking-wide text-slate-950">
                LAPORAN REKAPITULASI PRESENSI BULANAN SISWA
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                Tahun Ajaran {settings.academicYear || '2025/2026'}
              </p>
            </div>

            {/* Metadata Information (2 Columns) */}
            <div className="grid grid-cols-2 gap-4 text-xs font-medium mb-3 text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="space-y-1">
                <div>
                  <span className="font-bold inline-block w-28">Bulan / Periode</span>: {monthLabel}
                </div>
                <div>
                  <span className="font-bold inline-block w-28">Kelas</span>: {selectedClass === 'Semua' ? 'Semua Kelas' : selectedClass}
                </div>
                <div>
                  <span className="font-bold inline-block w-28">Jumlah Siswa</span>: {recaps.length} Orang
                </div>
              </div>
              <div className="space-y-1 text-right sm:text-left sm:pl-8">
                <div>
                  <span className="font-bold inline-block w-36">Hari Efektif Sekolah</span>: <strong className="text-slate-950 font-bold">{effectiveSchoolDays} Hari (Seragam)</strong>
                </div>
                <div>
                  <span className="font-bold inline-block w-36">Rata-rata Kehadiran</span>: <strong className="text-emerald-700 font-bold">{averagePercentage}%</strong>
                </div>
                <div>
                  <span className="font-bold inline-block w-36">Tanggal Cetak</span>: {todayFormatted}
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-900 uppercase font-bold text-[10px] text-center border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-1 border border-slate-300 w-8">No</th>
                    <th className="py-2 px-2 border border-slate-300 w-24">NIS</th>
                    <th className="py-2 px-3 border border-slate-300 text-left">Nama Lengkap Siswa</th>
                    <th className="py-2 px-2 border border-slate-300 w-16">Kelas</th>
                    <th className="py-2 px-1 border border-slate-300 w-10">L/P</th>
                    <th className="py-2 px-1.5 border border-slate-300 w-16 text-emerald-800">Hadir (H)</th>
                    <th className="py-2 px-1.5 border border-slate-300 w-16 text-amber-800">Terlambat (T)</th>
                    <th className="py-2 px-1.5 border border-slate-300 w-14 text-indigo-800">Sakit (S)</th>
                    <th className="py-2 px-1.5 border border-slate-300 w-14 text-sky-800">Izin (I)</th>
                    <th className="py-2 px-1.5 border border-slate-300 w-14 text-rose-800">Alfa (A)</th>
                    <th className="py-2 px-2 border border-slate-300 w-20 bg-slate-200/60 font-black">Total Hadir</th>
                    <th className="py-2 px-2 border border-slate-300 w-16 font-black">% Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recaps.length > 0 ? (
                    recaps.map((r, idx) => (
                      <tr key={r.studentId} className="hover:bg-slate-50 text-[11px]">
                        <td className="py-1 px-1 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-mono">{r.nis}</td>
                        <td className="py-1 px-3 border border-slate-300 font-bold text-slate-900">{r.name}</td>
                        <td className="py-1 px-2 border border-slate-300 text-center">{r.classRoom}</td>
                        <td className="py-1 px-1 border border-slate-300 text-center font-bold">
                          {r.gender === 'Perempuan' ? 'P' : 'L'}
                        </td>
                        <td className="py-1 px-1.5 border border-slate-300 text-center font-bold text-emerald-700">
                          {r.hadir} hr
                        </td>
                        <td className="py-1 px-1.5 border border-slate-300 text-center font-semibold text-amber-700">
                          {r.terlambat} hr
                        </td>
                        <td className="py-1 px-1.5 border border-slate-300 text-center font-semibold text-indigo-700">
                          {r.sakit} hr
                        </td>
                        <td className="py-1 px-1.5 border border-slate-300 text-center font-semibold text-sky-700">
                          {r.izin} hr
                        </td>
                        <td className={`py-1 px-1.5 border border-slate-300 text-center font-bold ${r.alpa > 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-500'}`}>
                          {r.alpa} hr
                        </td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-black font-mono bg-slate-50 text-slate-950">
                          {r.totalHadir} hr
                        </td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-black font-mono">
                          {r.percentage}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-6 text-center text-slate-500 italic">
                        Tidak ada data rekapan siswa untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                {recaps.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-400 text-[11px]">
                    <tr>
                      <td colSpan={5} className="py-1.5 px-3 border border-slate-300 uppercase text-center font-black">
                        TOTAL AKUMULASI KELAS ({recaps.length} SISWA)
                      </td>
                      <td className="py-1.5 px-1 border border-slate-300 text-center text-emerald-800 font-black font-mono">
                        {totalHadir} hr
                      </td>
                      <td className="py-1.5 px-1 border border-slate-300 text-center text-amber-800 font-black font-mono">
                        {totalTerlambat} hr
                      </td>
                      <td className="py-1.5 px-1 border border-slate-300 text-center text-indigo-800 font-black font-mono">
                        {totalSakit} hr
                      </td>
                      <td className="py-1.5 px-1 border border-slate-300 text-center text-sky-800 font-black font-mono">
                        {totalIzin} hr
                      </td>
                      <td className="py-1.5 px-1 border border-slate-300 text-center text-rose-800 font-black font-mono">
                        {totalAlpa} hr
                      </td>
                      <td className="py-1.5 px-2 border border-slate-300 text-center bg-slate-200 text-slate-950 font-black font-mono">
                        {totalMasuk} hr
                      </td>
                      <td className="py-1.5 px-2 border border-slate-300 text-center font-black font-mono">
                        {averagePercentage}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Attendance Legend & Notes */}
            <div className="mt-3 text-[10px] text-slate-600 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
              <div>
                <span className="font-bold">Keterangan:</span> H: Hadir, T: Terlambat, S: Sakit, I: Izin, A: Alfa (Tanpa Keterangan).
                Total Hadir = (Hadir + Terlambat). Hari Efektif = {effectiveSchoolDays} Hari Seragam.
              </div>
              <div className="font-mono font-semibold text-slate-500">
                Sistem Presensi Digital &bull; SD Inpres 2 Ulatan
              </div>
            </div>

            {/* Official Signatures Section */}
            <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-xs text-slate-900">
              {/* Left Signature: Wali Kelas or Koordinator */}
              <div className="text-center">
                <p className="font-medium text-slate-700">Mengetahui,</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedClass !== 'Semua'
                    ? (homeroomTeacher?.classLabel || `Wali Kelas ${selectedClass}`)
                    : 'Koordinator Presensi / Tenaga Administrasi'}
                </p>
                <div className="h-16"></div>
                <p className="font-bold underline text-slate-950">
                  {selectedClass !== 'Semua'
                    ? (homeroomTeacher?.name?.trim() || '( ........................................ )')
                    : (adminTeacher?.name?.trim() || 'MOH. FADLI')}
                </p>
                <p className="text-[11px] text-slate-700 font-mono">
                  NIP.{' '}
                  {selectedClass !== 'Semua'
                    ? formatCleanNIP(homeroomTeacher?.nip)
                    : (adminTeacher?.nip || '199903202025211020')}
                </p>
              </div>

              {/* Right Signature: Kepala Sekolah */}
              <div className="text-center">
                <p className="font-medium text-slate-700">
                  {settings.schoolCity || 'Ulatan'}, {todayFormatted}
                </p>
                <p className="font-bold text-slate-900 mt-0.5">
                  Kepala Sekolah {settings.schoolName || 'SD Inpres 2 Ulatan'}
                </p>
                <div className="h-16"></div>
                <p className="font-bold underline text-slate-950">
                  {headmaster?.name?.trim() || settings.headmasterName || 'RAHMAT, S.Pd., M.Pd'}
                </p>
                <p className="text-[11px] text-slate-700 font-mono">
                  NIP. {formatCleanNIP(headmaster?.nip || settings.headmasterNip) || '19851204 200903 1 002'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
