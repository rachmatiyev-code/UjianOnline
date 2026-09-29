import React, { useState } from 'react';
import {
  FolderOpen,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import {
  Student,
  Question,
  ExamSubmission,
  WorkspaceDatabaseInfo,
} from '../types/exam';

interface SheetsDatabaseViewProps {
  userEmail: string | null;
  hasToken: boolean;
  isLoggingIn: boolean;
  isSyncing: boolean;
  syncError: string | null;
  dbInfo: WorkspaceDatabaseInfo | null;
  students: Student[];
  questions: Question[];
  submissions: ExamSubmission[];
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSyncWithConfirmation: () => void;
}

export const SheetsDatabaseView: React.FC<SheetsDatabaseViewProps> = ({
  userEmail,
  hasToken,
  isLoggingIn,
  isSyncing,
  syncError,
  dbInfo,
  students,
  questions,
  submissions,
  onGoogleLogin,
  onGoogleLogout,
  onSyncWithConfirmation,
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<
    'Hasil_Ujian' | 'Data_Siswa' | 'Bank_Soal' | 'Riwayat_Partisipasi'
  >('Hasil_Ujian');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Integrasi Google Workspace</span>
            <span aria-hidden="true">·</span>
            <span>Folder Otomatis: <strong className="font-mono">UjianOnline_Database</strong></span>
            <span aria-hidden="true">·</span>
            <span>4 Lembar Kerja Terstruktur</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Database Google Sheets & Sinkronisasi Drive
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Seluruh hasil ujian, daftar induk siswa, bank soal, dan riwayat partisipasi disimpan secara otomatis ke dalam Google Sheets di folder khusus <strong>UjianOnline_Database</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!hasToken ? (
            <button
              type="button"
              onClick={onGoogleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          ) : (
            <>
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
                    ? 'Menyinkronkan ke UjianOnline_Database...'
                    : 'Sinkronkan Semua Data ke Google Sheets'}
                </span>
              </button>
              <button
                type="button"
                onClick={onGoogleLogout}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putuskan Sesi</span>
              </button>
            </>
          )}
        </div>
      </div>

      {syncError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <strong>Pemberitahuan Sinkronisasi:</strong> {syncError}
        </div>
      )}

      {/* Connection & Folder Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs text-slate-500">Status Koneksi Google Workspace</div>
          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            {hasToken ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Terhubung ({userEmail || 'Akun Guru'})</span>
              </>
            ) : (
              <span className="text-amber-700">
                ▲ Menunggu Otorisasi Google Drive & Sheets
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Saat terhubung, setiap pengumpulan ujian baru otomatis diperbarui ke lembar kerja Google Sheets Anda.
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
              Folder akan dibuat otomatis di Google Drive pada saat sinkronisasi pertama.
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
              Menampilkan struktur baris dan kolom real-time yang disinkronkan ke dalam file Google Sheets Anda.
            </p>
          </div>

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
                          s.passed ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'
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
