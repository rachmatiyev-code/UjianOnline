import React, { useState } from 'react';
import {
  FolderOpen,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  Download,
  Link2,
} from 'lucide-react';
import {
  Student,
  Question,
  ExamSubmission,
  WorkspaceDatabaseInfo,
} from '../types/exam';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  exportTabAsCsv,
} from '../services/workspaceService';

interface SheetsDatabaseViewProps {
  gasWebAppUrl: string;
  onUpdateGasWebAppUrl: (url: string) => void;
  isSyncing: boolean;
  syncError: string | null;
  dbInfo: WorkspaceDatabaseInfo | null;
  students: Student[];
  questions: Question[];
  submissions: ExamSubmission[];
  onSyncWithConfirmation: () => void;
  onSimulateLocalGasSync: () => void;
}

export const SheetsDatabaseView: React.FC<SheetsDatabaseViewProps> = ({
  gasWebAppUrl,
  onUpdateGasWebAppUrl,
  isSyncing,
  syncError,
  dbInfo,
  students,
  questions,
  submissions,
  onSyncWithConfirmation,
  onSimulateLocalGasSync,
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<
    'Hasil_Ujian' | 'Data_Siswa' | 'Bank_Soal' | 'Riwayat_Partisipasi'
  >('Hasil_Ujian');
  const [showGasCode, setShowGasCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyGasCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      // ignore
    }
  };

  const isUrlConfigured = gasWebAppUrl.trim().startsWith('https://script.google.com/');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Integrasi Google Apps Script (Tanpa Firebase)</span>
            <span aria-hidden="true">·</span>
            <span>
              Folder Otomatis: <strong className="font-mono">UjianOnline_Database</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>4 Lembar Kerja Terstruktur</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Database Google Sheets & Google Apps Script
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Menghubungkan aplikasi ujian langsung ke Google Drive & Google Sheets menggunakan <strong>Google Apps Script Web App (`DriveApp` & `SpreadsheetApp`)</strong> tanpa ketergantungan Firebase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowGasCode((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5 text-sky-700" />
            <span>{showGasCode ? 'Sembunyikan Kode Apps Script' : 'Lihat Kode Google Apps Script (Code.gs)'}</span>
          </button>

          <button
            type="button"
            onClick={onSyncWithConfirmation}
            disabled={isSyncing}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-60 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
            />
            <span>
              {isSyncing
                ? 'Menyinkronkan via Apps Script...'
                : 'Sinkronkan ke Google Sheets (GAS)'}
            </span>
          </button>
        </div>
      </div>

      {/* Google Apps Script Web App URL Configuration Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-sky-700" />
              <span>Konfigurasi Endpoint Web App Google Apps Script</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan URL deployment Web App Google Apps Script Anda (<code className="font-mono">https://script.google.com/macros/s/.../exec</code>) untuk sinkronisasi otomatis ke folder <strong>UjianOnline_Database</strong>.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700">
            {isUrlConfigured
              ? '● Endpoint Web App Aktif'
              : dbInfo
              ? '● Tersinkronisasi'
              : 'Menunggu URL / Simulasi'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="url"
            value={gasWebAppUrl}
            onChange={(e) => onUpdateGasWebAppUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
          />

          <button
            type="button"
            onClick={onSyncWithConfirmation}
            disabled={isSyncing}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
          >
            {isUrlConfigured ? 'Kirim Data ke Web App URL' : 'Uji Sinkronisasi GAS'}
          </button>

          {!isUrlConfigured && (
            <button
              type="button"
              onClick={onSimulateLocalGasSync}
              disabled={isSyncing}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              title="Simulasikan eksekusi fungsi ensureDatabaseInDrive() dari Google Apps Script"
            >
              Simulasi Eksekusi Apps Script
            </button>
          )}
        </div>

        {syncError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <strong>Pemberitahuan Google Apps Script:</strong> {syncError}
          </div>
        )}
      </div>

      {/* Expandable Google Apps Script (Code.gs) Source Code & Deployment Instructions */}
      {showGasCode && (
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-sky-400">
                Code.gs · Google Apps Script (DriveApp & SpreadsheetApp)
              </div>
              <h3 className="text-sm font-semibold text-white mt-0.5">
                Skrip Otomatis Pembuat Folder &ldquo;UjianOnline_Database&rdquo; & 4 Lembar Kerja Sheets
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCopyGasCode}
              className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Kode Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode Code.gs</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-300 bg-slate-800/70 p-4 rounded-lg border border-slate-700">
              <div>
                <strong className="text-white block mb-0.5">1. Buka Apps Script</strong>
                Kunjungi <code className="text-sky-300 font-mono">script.google.com</code> dan buat proyek baru.
              </div>
              <div>
                <strong className="text-white block mb-0.5">2. Tempel Code.gs</strong>
                Salin kode di bawah ini ke editor <code className="text-sky-300 font-mono">Code.gs</code> lalu simpan.
              </div>
              <div>
                <strong className="text-white block mb-0.5">3. Deploy Web App</strong>
                Klik <em>Deploy &gt; New deployment &gt; Web app</em> (Execute as: <em>Me</em>, Access: <em>Anyone</em>).
              </div>
              <div>
                <strong className="text-white block mb-0.5">4. Tempel URL</strong>
                Tempel URL <code className="text-sky-300 font-mono">.../exec</code> ke kolom input di atas lalu klik Sinkronkan.
              </div>
            </div>

            <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-lg overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
              {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
          </div>
        </div>
      )}

      {/* Connection & Folder Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs text-slate-500">Status Mesin Google Apps Script</div>
          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            {isUrlConfigured || dbInfo ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {isUrlConfigured
                    ? 'Terhubung ke Web App GAS'
                    : 'Mode Apps Script Siap'}
                </span>
              </>
            ) : (
              <span className="text-amber-700">
                ▲ Siap Dikonfigurasi (Tanpa Firebase)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Menggunakan <code className="font-mono">doPost(e)</code> & <code className="font-mono">DriveApp</code> untuk otomatis mengirim nilai ujian ke Google Sheets.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-sky-700" />
            <span>Folder Khusus Google Drive</span>
          </div>
          <div className="text-sm font-mono font-semibold text-slate-900">
            /UjianOnline_Database
          </div>
          {dbInfo ? (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-emerald-700 font-medium">● Folder Aktif</span>
              <a
                href={dbInfo.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Buka Folder Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Otomatis dibuat oleh <code className="font-mono">DriveApp.createFolder(&apos;UjianOnline_Database&apos;)</code>.
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Spreadsheet Induk Hasil & Siswa</span>
          </div>
          <div className="text-sm font-mono font-semibold text-slate-900 truncate">
            UjianOnline_Master_Database
          </div>
          {dbInfo ? (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500 font-mono tabular-nums">
                Sync:{' '}
                {dbInfo.lastSyncedAt
                  ? new Date(dbInfo.lastSyncedAt).toLocaleTimeString('id-ID')
                  : 'Baru saja'}
              </span>
              <a
                href={dbInfo.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Buka Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Berisi 4 lembar kerja: Hasil_Ujian, Data_Siswa, Bank_Soal, Riwayat_Partisipasi.
            </p>
          )}
        </div>
      </div>

      {/* Interactive Spreadsheet Tab Preview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Pratinjau Struktur Tabel Google Sheets (UjianOnline_Database)
            </h2>
            <p className="text-xs text-slate-500">
              Menampilkan struktur baris dan kolom real-time yang dikirim ke Google Sheets melalui Google Apps Script.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {(
                [
                  'Hasil_Ujian',
                  'Data_Siswa',
                  'Bank_Soal',
                  'Riwayat_Partisipasi',
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSheetTab(tab)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeSheetTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                exportTabAsCsv(activeSheetTab, students, questions, submissions)
              }
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Unduh CSV ({activeSheetTab})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeSheetTab === 'Hasil_Ujian' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="py-2.5 px-3">A · ID_Hasil</th>
                  <th className="py-2.5 px-3">B · Waktu_Selesai</th>
                  <th className="py-2.5 px-3">C · NISN</th>
                  <th className="py-2.5 px-3">D · Nama_Siswa</th>
                  <th className="py-2.5 px-3">E · Kelas</th>
                  <th className="py-2.5 px-3 text-right">F · Skor</th>
                  <th className="py-2.5 px-3 text-right">G · Nilai_%</th>
                  <th className="py-2.5 px-3">H · Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-800">{s.id}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(s.submittedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{s.studentNisn}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      {s.studentName}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">
                      {s.className}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-800">
                      {s.totalScore}/{s.maxScore}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {s.percentage}% ({s.gradeLetter})
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={
                          s.passed
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {s.passed ? 'LULUS' : 'REMEDIAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeSheetTab === 'Data_Siswa' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="py-2.5 px-3">A · ID_Siswa</th>
                  <th className="py-2.5 px-3">B · NISN</th>
                  <th className="py-2.5 px-3">C · Nama_Lengkap</th>
                  <th className="py-2.5 px-3">D · Kelas</th>
                  <th className="py-2.5 px-3">E · Email_Sekolah</th>
                  <th className="py-2.5 px-3">F · Status</th>
                  <th className="py-2.5 px-3 text-right">G · Total_Partisipasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {students.map((st) => {
                  const count = submissions.filter(
                    (s) => s.studentId === st.id || s.studentNisn === st.nisn
                  ).length;
                  return (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-800">{st.id}</td>
                      <td className="py-2.5 px-3 text-slate-700">{st.nisn}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        {st.name}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {st.className}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{st.email}</td>
                      <td className="py-2.5 px-3 text-emerald-700">{st.status}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeSheetTab === 'Bank_Soal' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="py-2.5 px-3">A · ID_Soal</th>
                  <th className="py-2.5 px-3">B · Topik</th>
                  <th className="py-2.5 px-3">C · Tipe</th>
                  <th className="py-2.5 px-3">D · Media</th>
                  <th className="py-2.5 px-3 text-right">E · Poin</th>
                  <th className="py-2.5 px-3">F · Kunci</th>
                  <th className="py-2.5 px-3">G · Pertanyaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                      {q.id}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-800 whitespace-nowrap">
                      {q.topic}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {q.type}
                    </td>
                    <td className="py-2.5 px-3 text-sky-700 whitespace-nowrap">
                      {q.mediaType}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      {q.points}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">
                      {q.correctAnswers.join(', ')}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 max-w-md truncate">
                      {q.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeSheetTab === 'Riwayat_Partisipasi' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="py-2.5 px-3">A · ID_Partisipasi</th>
                  <th className="py-2.5 px-3">B · Waktu_Mulai</th>
                  <th className="py-2.5 px-3">C · Waktu_Selesai</th>
                  <th className="py-2.5 px-3">D · Nama_Siswa</th>
                  <th className="py-2.5 px-3">E · Pengacakan</th>
                  <th className="py-2.5 px-3">F · Detail_Evaluasi_Butir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                      {s.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(s.startedAt).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(s.submittedAt).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900 whitespace-nowrap">
                      {s.studentName} ({s.className})
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {s.randomizedQuestions ? 'Acak Aktif' : 'Standar'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">
                      {s.details
                        .map(
                          (d) =>
                            `${d.questionId}:${d.isCorrect ? 'BENAR' : 'SALAH'}(${d.earnedPoints}pt)`
                        )
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
