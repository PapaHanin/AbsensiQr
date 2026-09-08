import React, { useState } from 'react';

interface GuideModalProps {
  onClose: () => void;
  onOpenCloudSync: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose, onOpenCloudSync }) => {
  const [activeTopic, setActiveTopic] = useState<'hp' | 'sync' | 'security' | 'commercial'>('hp');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8 animate-scale-up space-y-5">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-2 cursor-pointer rounded-full hover:bg-slate-100 transition-colors"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">
            <i className="fa-solid fa-mobile-screen-button"></i>
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Panduan Penggunaan di HP Guru & Distribusi Sekolah
            </h3>
            <p className="text-xs text-slate-500">
              Petunjuk operasional HP guru, sinkronisasi Google Sheets, dan keamanan aplikasi.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTopic('hp')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTopic === 'hp' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-mobile-screen"></i>
            <span>Instal di HP Guru</span>
          </button>
          <button
            onClick={() => setActiveTopic('sync')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTopic === 'sync' ? 'bg-white text-emerald-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-cloud-arrow-up text-emerald-600"></i>
            <span>Sinkronisasi Data</span>
          </button>
          <button
            onClick={() => setActiveTopic('security')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTopic === 'security' ? 'bg-white text-amber-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-shield-halved text-amber-600"></i>
            <span>Keamanan Publish</span>
          </button>
          <button
            onClick={() => setActiveTopic('commercial')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTopic === 'commercial' ? 'bg-white text-purple-600 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-handshake text-purple-600"></i>
            <span>Tips Jual ke Sekolah</span>
          </button>
        </div>

        {/* Content Topics */}
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed max-h-96 overflow-y-auto pr-1">
          {activeTopic === 'hp' && (
            <div className="space-y-3">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-indigo-600"></i>
                  Cara Membuka & Pasang di HP Guru (Android & iPhone)
                </h4>
                <p>
                  Aplikasi ini dirancang responsif sebagai <strong>Progressive Web App (PWA)</strong>, sehingga guru tidak perlu mengunduh file APK berat dari Play Store.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Bagikan Link URL Web</h5>
                    <p className="text-slate-600">
                      Kirimkan link web aplikasi hasil publish (contoh: link <code>run.app</code> atau domain sekolah) via WhatsApp ke guru-guru.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Pasang ke Layar Utama HP (Add to Home Screen)</h5>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                      <li>
                        <strong>Android (Google Chrome):</strong> Buka link di Chrome &rarr; Ketuk titik tiga (⋮) di pojok kanan atas &rarr; Pilih <strong>"Tambahkan ke Layar Utama" / "Instal Aplikasi"</strong>.
                      </li>
                      <li>
                        <strong>iPhone (Safari):</strong> Buka link di Safari &rarr; Ketuk tombol Bagikan (ikon kotak panah ke atas) &rarr; Pilih <strong>"Add to Home Screen" (Tambah ke Layar Utama)</strong>.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Izin Kamera untuk Scan QR Code</h5>
                    <p className="text-slate-600">
                      Saat guru membuka menu <strong>"Scan QR Kamera"</strong>, browser akan meminta izin akses kamera. Guru cukup memilih <strong>"Izinkan / Allow"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'sync' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-table text-emerald-600"></i>
                  Model Sinkronisasi Data Antar Guru & Admin
                </h4>
                <p>
                  Bagaimana data absensi dari puluhan HP guru bisa terkumpul rapi di laptop Admin/Kepala Sekolah?
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                    <i className="fa-brands fa-google-drive"></i>
                    <span>Opsi 1 (Sangat Direkomendasikan): Google Sheets Terpusat</span>
                  </div>
                  <p className="text-slate-600">
                    Admin membuat 1 Google Spreadsheet rekap absensi melalui menu <strong>"Cloud Sync & Backup" &rarr; "Google Sheets"</strong>. Setiap selesai jam mengajar, guru atau admin cukup klik <em>"Ekspor & Sync Data ke Google Sheets"</em>. Semua riwayat absensi otomatis masuk ke 1 spreadsheet induk yang bisa dilihat bersama secara real-time.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs">
                    <i className="fa-solid fa-cloud"></i>
                    <span>Opsi 2: Kode Sinkronisasi Cloud (Cloud Sync Code)</span>
                  </div>
                  <p className="text-slate-600">
                    Admin memberikan <strong>Kode Sync</strong> (contoh: <code>SD-74821</code>) kepada guru. Guru dapat memuat database siswa terbaru atau mengirim data kehadiran menggunakan kode tersebut.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenCloudSync();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-cloud-arrow-up"></i>
                <span>Buka Menu Cloud Sync & Google Sheets</span>
              </button>
            </div>
          )}

          {activeTopic === 'security' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-shield-check text-amber-700"></i>
                  Apakah Publish dari AI Studio / Cloud Run Aman?
                </h4>
                <p>
                  <strong>Ya, sangat aman dan handal untuk digunakan sekolah.</strong> Berikut fakta teknis keamanannya:
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-lock text-emerald-600 text-xs"></i>
                    <span>Enkripsi SSL / HTTPS Bawaan Google</span>
                  </h5>
                  <p className="text-slate-600 mt-0.5">
                    Semua trafik ke domain Cloud Run (<code>https://...run.app</code>) terenkripsi SSL 256-bit kelas industri dari infrastruktur Google Cloud.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-user-lock text-indigo-600 text-xs"></i>
                    <span>Privasi Data Siswa & Penyimpanan Lokal</span>
                  </h5>
                  <p className="text-slate-600 mt-0.5">
                    Data siswa dan absensi disimpan secara aman di storage peramban (LocalStorage) dan terisolasi dari pihak luar. Tidak ada kebocoran data ke pihak ketiga yang tidak berwenang.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <i className="fa-solid fa-key text-amber-600 text-xs"></i>
                    <span>Otorisasi Akun Guru & Peran Admin</span>
                  </h5>
                  <p className="text-slate-600 mt-0.5">
                    Hanya guru yang emailnya sudah didaftarkan oleh Administrator yang dapat login dan mengelola data kelas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'commercial' && (
            <div className="space-y-3">
              <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl space-y-2">
                <h4 className="font-extrabold text-purple-950 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-sack-dollar text-purple-700"></i>
                  Langkah & Tips Menjual Aplikasi ini ke Sekolah
                </h4>
                <p>
                  Paket siap pakai untuk Anda tawarkan ke sekolah-sekolah sasaran:
                </p>
              </div>

              <ol className="list-decimal list-inside space-y-2 bg-white p-4 rounded-2xl border border-slate-200 font-medium">
                <li>
                  <strong className="text-slate-900">Sesuaikan Profil Sekolah & Admin:</strong> Buka tombol <em>"Edit Profil Admin"</em> dan ubah Nama Sekolah, Alamat, serta Tahun Ajaran sesuai sekolah klien Anda.
                </li>
                <li>
                  <strong className="text-slate-900">Impor Data Siswa Sekolah:</strong> Minta data siswa dari operator TU sekolah (format Excel .xlsx / .xls), lalu unggah via tab <em>"Kelola Siswa & QR"</em>.
                </li>
                <li>
                  <strong className="text-slate-900">Cetak Kartu QR Siswa:</strong> Klik <em>"Cetak Kartu QR"</em> untuk mencetak kartu absensi siswa (ID Card / Kartu Pelajar) dalam format PDF/Kertas A4.
                </li>
                <li>
                  <strong className="text-slate-900">Daftarkan Akun Guru Sekolah:</strong> Masukkan daftar email guru-guru yang akan bertugas memindai absensi di kelas atau gerbang sekolah.
                </li>
                <li>
                  <strong className="text-slate-900">Hubungkan Google Sheets Sekolah:</strong> Buat 1 spreadsheet rekapitulasi agar Kepala Sekolah dan TU bisa memantau data kehadiran harian secara otomatis.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
