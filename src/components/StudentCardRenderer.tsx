import React from 'react';
import { CardTemplateId, Student, SystemSettings } from '../types';
import { CardCustomizationOptions } from '../utils/cardCustomization';
import { TutWuriHandayaniLogo } from './TutWuriHandayaniLogo';

interface StudentCardRendererProps {
  student: Student;
  settings: SystemSettings;
  options: CardCustomizationOptions;
  qrUrl?: string;
  photoUrl?: string;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

export const StudentCardRenderer: React.FC<StudentCardRendererProps> = ({
  student,
  settings,
  options,
  qrUrl,
  photoUrl,
  isSelected = true,
  onToggleSelect,
  showCheckbox = false,
}) => {
  const rawTpl = options.templateId || settings.defaultCardTemplate || 'navy_gold';
  let activeTemplate: CardTemplateId = rawTpl;
  if (rawTpl === 'seraphic') activeTemplate = 'navy_gold';
  if (rawTpl === 'nusantara') activeTemplate = 'emerald_gold';
  if (rawTpl === 'pelita') activeTemplate = 'modern_minimalis';

  const photoSrc = photoUrl || student.photo || student.avatarUrl;
  const finalSchoolName = (settings.schoolName || 'SD INPRES 2 ULATAN').toUpperCase();
  const schoolCity = settings.schoolCity || 'Paser';
  const schoolRegency = settings.schoolRegency || (settings.schoolCity ? `PEMERINTAH KABUPATEN ${settings.schoolCity.toUpperCase()}` : 'PEMERINTAH KABUPATEN PASER');
  const schoolDepartment = settings.schoolDepartment || 'DINAS PENDIDIKAN DAN KEBUDAYAAN';
  const cardTitle = settings.cardTitle || 'KARTU TANDA SISWA & PRESENSI DIGITAL';
  const cardValidityText = settings.cardValidityText || 'KARTU RESMI PELAJAR • BERLAKU SELAMA MENJADI SISWA';
  const headmasterName = settings.headmasterName || 'Drs. H. Mulyadi, M.Pd';
  const rawNip = settings.headmasterNip || '19680512 199403 1 005';
  const headmasterNip = rawNip.startsWith('NIP') ? rawNip : `NIP. ${rawNip}`;
  const academicYear = settings.academicYear || '2025/2026';

  const isEmerald = activeTemplate === 'emerald_gold';
  const isModern = activeTemplate === 'modern_minimalis';

  const headerBgClass = isEmerald ? 'bg-[#064e3b]' : isModern ? 'bg-[#1e293b]' : 'bg-[#0f2b5c]';
  const accentBorderColor = isEmerald ? '#d97706' : isModern ? '#2563eb' : '#c59b27';
  const accentTextClass = isEmerald ? 'text-amber-400' : isModern ? 'text-blue-400' : 'text-[#c59b27]';
  const primaryTextClass = isEmerald ? 'text-[#064e3b]' : isModern ? 'text-slate-900' : 'text-[#0f2b5c]';
  const logoVariant: 'blue_gold' | 'green_gold' | 'official' = isEmerald ? 'green_gold' : isModern ? 'official' : 'blue_gold';

  return (
    <div
      id={`student-card-${student.id}`}
      className="card-item relative bg-white border border-slate-300 shadow-md transition-all select-none mx-auto overflow-hidden flex flex-col justify-between"
      style={{
        width: '276px',
        minHeight: '438px',
        maxHeight: '438px',
        aspectRatio: '53.98 / 85.6',
        borderRadius: '14px',
      }}
    >
      {/* Checkbox Selector for toggling on-screen (Non-Printable) */}
      {showCheckbox && onToggleSelect && (
        <button
          type="button"
          onClick={onToggleSelect}
          className="absolute top-2.5 right-2.5 z-40 w-6 h-6 rounded-lg bg-white/95 border border-slate-300 flex items-center justify-center text-xs cursor-pointer shadow-md no-print hover:bg-white transition-transform active:scale-95"
          title={isSelected ? 'Batalkan cetak siswa ini' : 'Pilih siswa ini'}
        >
          {isSelected && <i className="fa-solid fa-check font-black text-emerald-600"></i>}
        </button>
      )}

      {/* Top Lanyard Slot Guide */}
      <div className="flex justify-center pt-1.5 pb-1 bg-slate-100/70 border-b border-slate-200">
        <div className="w-14 h-2 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center">
          <div className="w-8 h-1 rounded-full bg-slate-300"></div>
        </div>
      </div>

      {/* Card Header: Official Indonesian School Banner */}
      <div
        className={`${headerBgClass} text-white px-3 py-2.5 relative border-b-2 shadow-sm`}
        style={{ borderColor: accentBorderColor }}
      >
        <div className="flex items-center gap-2.5">
          <div className="shrink-0 p-0.5 bg-white/10 rounded-full border border-white/20">
            <TutWuriHandayaniLogo size={32} variant={logoVariant} />
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <span className="text-[7.5px] font-semibold text-slate-200 uppercase tracking-wide block truncate">
              {schoolRegency}
            </span>
            <span className={`text-[8px] font-bold ${accentTextClass} uppercase tracking-wider block truncate`}>
              {schoolDepartment}
            </span>
            <h4 className="font-black text-[11px] tracking-wide text-white uppercase truncate leading-tight mt-0.5">
              {finalSchoolName}
            </h4>
            <span className="text-[7.5px] font-bold text-amber-300/90 uppercase tracking-tight block truncate">
              {cardTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Card Body: Student Photo & Official Biodata */}
      <div className="px-3 pt-2 pb-1 flex-1 flex flex-col justify-between">
        {/* Upper Info Row */}
        <div className="flex gap-2.5 items-start">
          {/* Passport Photo 3:4 */}
          <div className="shrink-0">
            <div
              className="w-[84px] h-[106px] rounded-lg overflow-hidden bg-slate-50 border-2 flex items-center justify-center shadow-sm relative"
              style={{ borderColor: accentBorderColor }}
            >
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
                  <i className="fa-solid fa-user text-2xl text-slate-400 mb-1"></i>
                  <span className="text-[7.5px] font-bold text-slate-500 uppercase">PASFOTO</span>
                  <span className="text-[6.5px] text-slate-400">3 x 4 cm</span>
                </div>
              )}
            </div>
          </div>

          {/* Structured Biodata Table */}
          <div className="flex-1 min-w-0 text-left">
            <div className="border-b border-slate-200 pb-1 mb-1">
              <span className="text-[7px] font-bold text-slate-400 tracking-wider uppercase block">
                NAMA SISWA
              </span>
              <h5 className={`font-black text-[10.5px] ${primaryTextClass} uppercase leading-tight line-clamp-2 tracking-tight`}>
                {student.name}
              </h5>
            </div>

            <div className="space-y-0.5 text-[8.5px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium text-[8px]">NIS / NISN</span>
                <span className="font-mono font-bold text-slate-800 text-[8.5px] truncate max-w-[115px]" title={`${student.nis}${student.nisn ? ` / ${student.nisn}` : ''}`}>
                  {student.nis}{student.nisn ? ` / ${student.nisn}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium text-[8px]">Kelas</span>
                <span className="font-black text-slate-900 text-[8.5px]">{student.classRoom}</span>
              </div>
              {(student.birthPlace || student.birthDate) && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium text-[8px]">TTL</span>
                  <span className="font-semibold text-slate-800 text-[8px] truncate max-w-[110px]" title={[student.birthPlace, student.birthDate].filter(Boolean).join(', ')}>
                    {[student.birthPlace, student.birthDate].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium text-[8px]">Gender</span>
                <span className="font-semibold text-slate-700 text-[8px]">{student.gender || 'Laki-laki'}</span>
              </div>
              {student.address && (
                <div className="flex items-start justify-between gap-1">
                  <span className="text-slate-500 font-medium text-[8px] shrink-0">Alamat</span>
                  <span className="font-medium text-slate-700 text-[7.5px] text-right truncate max-w-[105px]" title={student.address}>
                    {student.address}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-slate-500 font-medium text-[8px]">Status</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[7.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1"></span>
                  Siswa Aktif
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="my-1.5 border-t border-dashed border-slate-200"></div>

        {/* Lower Row: QR Code & Headmaster Signature / Seal */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          {/* QR Code Container */}
          <div className="flex flex-col items-center shrink-0">
            <div className="p-1 bg-white rounded-lg border border-slate-300 shadow-xs">
              {qrUrl ? (
                <img src={qrUrl} alt={`QR ${student.name}`} className="w-[64px] h-[64px] rounded" />
              ) : (
                <div className="w-[64px] h-[64px] bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
                  QR Siswa
                </div>
              )}
            </div>
            <span className="text-[7px] font-extrabold text-slate-600 tracking-wider uppercase mt-0.5">
              PINDAI PRESENSI
            </span>
          </div>

          {/* Pengesahan Kepala Sekolah & Cap Dinas */}
          <div className="flex-1 text-center relative py-0.5 pl-1">
            <p className="text-[7.5px] text-slate-500 font-medium truncate">
              {schoolCity}, {academicYear}
            </p>
            <p className="text-[8px] font-bold text-slate-800 leading-tight">
              Kepala Sekolah,
            </p>

            {/* Signature & Watermark Container */}
            <div className="relative h-9 flex items-center justify-center my-0.5">
              {/* Circular Official Rubber Stamp (Disdikbud Blue) */}
              <div
                className="absolute inset-0 m-auto w-10 h-10 rounded-full border-2 border-dashed border-blue-600/70 flex flex-col items-center justify-center text-blue-700/80 pointer-events-none rotate-[-12deg]"
                style={{
                  background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 80%)',
                }}
              >
                <span className="text-[5.5px] font-black tracking-tighter">★ RESMI ★</span>
                <span className="text-[6px] font-black tracking-widest truncate max-w-[34px]">{schoolCity.slice(0, 6).toUpperCase()}</span>
                <span className="text-[5px] font-bold">DISDIK</span>
              </div>

              {/* Digital Signature Cursive SVG */}
              <svg className="w-24 h-7 text-blue-900 z-10" viewBox="0 0 100 40" fill="none">
                <path
                  d="M10 28 C20 10, 25 35, 38 12 C45 32, 55 15, 68 25 C78 20, 85 28, 92 18 M15 32 L88 30"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Underlined Headmaster Name & NIP */}
            <div className="leading-tight">
              <span className="text-[8.5px] font-black text-slate-900 uppercase underline decoration-slate-800 tracking-tight block truncate" title={headmasterName}>
                {headmasterName}
              </span>
              <span className="text-[7px] text-slate-500 font-mono block truncate" title={headmasterNip}>
                {headmasterNip}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Ribbon */}
      <div
        className={`${headerBgClass} text-white py-1 px-2 text-center border-t`}
        style={{ borderColor: accentBorderColor }}
      >
        <p className="text-[7px] font-bold tracking-wider text-slate-100 uppercase truncate">
          {cardValidityText}
        </p>
      </div>
    </div>
  );
};
