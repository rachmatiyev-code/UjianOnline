import React, { useState, useEffect } from 'react';
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
  CloudDownload,
  CheckSquare,
  Square,
  Edit3,
  Trash2,
  X,
} from 'lucide-react';
import {
  Student,
  Question,
  ExamSubmission,
  WorkspaceDatabaseInfo,
  DifficultyLevel,
} from '../types/exam';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  exportTabAsCsv,
  DatabaseTabName,
} from '../services/workspaceService';

interface SheetsDatabaseViewProps {
  gasWebAppUrl: string;
  onUpdateGasWebAppUrl: (url: string) => void;
  isSyncing: boolean;
  isFetchingTab: DatabaseTabName | 'ALL' | null;
  syncError: string | null;
  dbInfo: WorkspaceDatabaseInfo | null;
  students: Student[];
  questions: Question[];
  submissions: ExamSubmission[];
  passingGrade: number;
  onSyncWithConfirmation: () => void;
  onSimulateLocalGasSync: () => void;
  onFetchFromDatabase: (tab: DatabaseTabName | 'ALL') => void;
  // Local CRUD handlers for Pilih, Edit, Hapus across all 4 tables
  onUpdateSubmission: (updated: ExamSubmission) => void;
  onBulkUpdateSubmissions: (
    ids: string[],
    patch: { className?: string; passed?: boolean }
  ) => void;
  onDeleteSubmissions: (ids: string[]) => void;
  onUpdateStudent: (updated: Student) => void;
  onBulkUpdateStudents: (
    ids: string[],
    patch: Partial<Pick<Student, 'className' | 'status'>>
  ) => void;
  onDeleteStudents: (ids: string[]) => void;
  onUpdateQuestion: (updated: Question) => void;
  onBulkUpdateQuestions: (
    ids: string[],
    patch: Partial<Pick<Question, 'topic' | 'difficulty' | 'points'>>
  ) => void;
  onDeleteQuestions: (ids: string[]) => void;
}

export const SheetsDatabaseView: React.FC<SheetsDatabaseViewProps> = ({
  gasWebAppUrl,
  onUpdateGasWebAppUrl,
  isSyncing,
  isFetchingTab,
  syncError,
  dbInfo,
  students,
  questions,
  submissions,
  passingGrade,
  onSyncWithConfirmation,
  onSimulateLocalGasSync,
  onFetchFromDatabase,
  onUpdateSubmission,
  onBulkUpdateSubmissions,
  onDeleteSubmissions,
  onUpdateStudent,
  onBulkUpdateStudents,
  onDeleteStudents,
  onUpdateQuestion,
  onBulkUpdateQuestions,
  onDeleteQuestions,
}) => {
  const [activeSheetTab, setActiveSheetTab] =
    useState<DatabaseTabName>('Hasil_Ujian');
  const [showGasCode, setShowGasCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Selection state for local data (Pilih)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Single Edit Modal states for local data (Edit)
  const [editingSubmission, setEditingSubmission] =
    useState<ExamSubmission | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Bulk Edit Panel state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkClass, setBulkClass] = useState('');
  const [bulkPassed, setBulkPassed] = useState<'' | 'LULUS' | 'REMEDIAL'>('');
  const [bulkStudentStatus, setBulkStudentStatus] = useState<
    '' | 'Aktif' | 'Nonaktif'
  >('');
  const [bulkQuestionTopic, setBulkQuestionTopic] = useState('');
  const [bulkQuestionDiff, setBulkQuestionDiff] = useState<
    '' | DifficultyLevel
  >('');
  const [bulkQuestionPoints, setBulkQuestionPoints] = useState('');

  // Reset selection when switching active tab
  useEffect(() => {
    setSelectedIds([]);
    setShowBulkEdit(false);
  }, [activeSheetTab]);

  const currentTabIds =
    activeSheetTab === 'Hasil_Ujian' || activeSheetTab === 'Riwayat_Partisipasi'
      ? submissions.map((s) => s.id)
      : activeSheetTab === 'Data_Siswa'
      ? students.map((st) => st.id)
      : questions.map((q) => q.id);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedIds.length === currentTabIds.length &&
      currentTabIds.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentTabIds);
    }
  };

  const handleDeleteSelectedLocal = () => {
    if (selectedIds.length === 0) return;
    if (
      activeSheetTab === 'Hasil_Ujian' ||
      activeSheetTab === 'Riwayat_Partisipasi'
    ) {
      onDeleteSubmissions(selectedIds);
    } else if (activeSheetTab === 'Data_Siswa') {
      onDeleteStudents(selectedIds);
    } else {
      onDeleteQuestions(selectedIds);
    }
    setSelectedIds([]);
  };

  const handleApplyBulkLocalEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    if (
      activeSheetTab === 'Hasil_Ujian' ||
      activeSheetTab === 'Riwayat_Partisipasi'
    ) {
      const patch: { className?: string; passed?: boolean } = {};
      if (bulkClass.trim()) patch.className = bulkClass.trim();
      if (bulkPassed === 'LULUS') patch.passed = true;
      if (bulkPassed === 'REMEDIAL') patch.passed = false;
      onBulkUpdateSubmissions(selectedIds, patch);
    } else if (activeSheetTab === 'Data_Siswa') {
      const patch: Partial<Pick<Student, 'className' | 'status'>> = {};
      if (bulkClass.trim()) patch.className = bulkClass.trim();
      if (bulkStudentStatus) patch.status = bulkStudentStatus;
      onBulkUpdateStudents(selectedIds, patch);
    } else if (activeSheetTab === 'Bank_Soal') {
      const patch: Partial<Pick<Question, 'topic' | 'difficulty' | 'points'>> =
        {};
      if (bulkQuestionTopic.trim()) patch.topic = bulkQuestionTopic.trim();
      if (bulkQuestionDiff) patch.difficulty = bulkQuestionDiff;
      if (bulkQuestionPoints && Number(bulkQuestionPoints) > 0) {
        patch.points = Number(bulkQuestionPoints);
      }
      onBulkUpdateQuestions(selectedIds, patch);
    }

    setShowBulkEdit(false);
    setSelectedIds([]);
    setBulkClass('');
    setBulkPassed('');
    setBulkStudentStatus('');
    setBulkQuestionTopic('');
    setBulkQuestionDiff('');
    setBulkQuestionPoints('');
  };

  const handleSaveSubmissionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission) return;
    const maxScore = Math.max(Number(editingSubmission.maxScore) || 100, 1);
    const totalScore = Math.min(
      Math.max(Number(editingSubmission.totalScore) || 0, 0),
      maxScore
    );
    const percentage = Math.round((totalScore / maxScore) * 100);
    const gradeLetter: ExamSubmission['gradeLetter'] =
      percentage >= 85
        ? 'A'
        : percentage >= 75
        ? 'B'
        : percentage >= 60
        ? 'C'
        : percentage >= 45
        ? 'D'
        : 'E';

    onUpdateSubmission({
      ...editingSubmission,
      totalScore,
      maxScore,
      percentage,
      gradeLetter,
      passed: percentage >= passingGrade,
    });
    setEditingSubmission(null);
  };

  const handleSaveStudentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.name.trim()) return;
    onUpdateStudent(editingStudent);
    setEditingStudent(null);
  };

  const handleSaveQuestionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.text.trim()) return;
    onUpdateQuestion(editingQuestion);
    setEditingQuestion(null);
  };

  const handleCopyGasCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      // ignore
    }
  };

  const isUrlConfigured = gasWebAppUrl
    .trim()
    .startsWith('https://script.google.com/');

  const databaseTabsMeta: {
    id: DatabaseTabName;
    title: string;
    subtitle: string;
    count: number;
    unit: string;
  }[] = [
    {
      id: 'Hasil_Ujian',
      title: 'Hasil Ujian',
      subtitle: 'Rekap nilai akhir, skor & predikat kelulusan',
      count: submissions.length,
      unit: 'baris nilai',
    },
    {
      id: 'Data_Siswa',
      title: 'Data Siswa',
      subtitle: 'Biodata induk siswa, NISN, kelas & status',
      count: students.length,
      unit: 'data siswa',
    },
    {
      id: 'Bank_Soal',
      title: 'Bank Soal',
      subtitle: 'Pertanyaan, format media, bobot & kunci',
      count: questions.length,
      unit: 'butir soal',
    },
    {
      id: 'Riwayat_Partisipasi',
      title: 'Riwayat Partisipasi',
      subtitle: 'Log waktu pengerjaan, pengacakan & rincian butir',
      count: submissions.length,
      unit: 'log sesi',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Integrasi Google Apps Script (Tanpa Firebase)</span>
            <span aria-hidden="true">·</span>
            <span>
              Folder Otomatis:{' '}
              <strong className="font-mono">UjianOnline_Database</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>Sinkronisasi & Ambil Data 2 Arah</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Database Google Sheets & Manajemen Data Lokal
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Ambil data dari database Google Sheets untuk masing-masing tabel (<strong>Hasil Ujian</strong>, <strong>Data Siswa</strong>, <strong>Bank Soal</strong>, <strong>Riwayat Partisipasi</strong>) serta pilih, edit, dan hapus data lokal secara fleksibel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowGasCode((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5 text-sky-700" />
            <span>
              {showGasCode
                ? 'Sembunyikan Kode Apps Script'
                : 'Kode Apps Script (Code.gs)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFetchFromDatabase('ALL')}
            disabled={isFetchingTab !== null || isSyncing}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <CloudDownload
              className={`w-3.5 h-3.5 text-emerald-700 ${
                isFetchingTab === 'ALL' ? 'animate-bounce' : ''
              }`}
            />
            <span>
              {isFetchingTab === 'ALL'
                ? 'Mengambil Semua Data...'
                : 'Ambil Semua Data dari Database'}
            </span>
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
                : 'Simpan ke Google Sheets (GAS)'}
            </span>
          </button>
        </div>
      </div>

      {/* Section 1: Ambil Data dari Database per Kategori (4 Tabel) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CloudDownload className="w-4 h-4 text-sky-700" />
              <span>
                Ambil Data dari Database (Per Lembar Kerja Google Sheets)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tarik dan perbarui data lokal untuk masing-masing kategori langsung dari database <strong>UjianOnline_Database</strong>.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600">
            Sumber:{' '}
            <strong>
              {isUrlConfigured
                ? 'Endpoint Web App GAS'
                : 'Snapshot UjianOnline_Database'}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {databaseTabsMeta.map((item) => {
            const isFetchingThis =
              isFetchingTab === item.id || isFetchingTab === 'ALL';
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                  activeSheetTab === item.id
                    ? 'border-sky-700 bg-sky-50/30'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-sky-800">
                      {item.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {item.count} {item.unit}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {item.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSheetTab(item.id);
                      onFetchFromDatabase(item.id);
                    }}
                    disabled={isFetchingTab !== null || isSyncing}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <CloudDownload
                      className={`w-3.5 h-3.5 ${
                        isFetchingThis ? 'animate-bounce' : ''
                      }`}
                    />
                    <span>
                      {isFetchingThis
                        ? 'Mengambil...'
                        : `Ambil ${item.title}`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
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
              Masukkan URL deployment Web App Google Apps Script Anda (
              <code className="font-mono">
                https://script.google.com/macros/s/.../exec
              </code>
              ) untuk komunikasi dua arah dengan folder{' '}
              <strong>UjianOnline_Database</strong>.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700">
            {isUrlConfigured
              ? '● Endpoint Web App Aktif'
              : dbInfo
              ? '● Tersinkronisasi'
              : 'Mode Snapshot Lokal Aktif'}
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
            {isUrlConfigured
              ? 'Kirim Data ke Web App URL'
              : 'Simpan ke Snapshot Database'}
          </button>

          {!isUrlConfigured && (
            <button
              type="button"
              onClick={onSimulateLocalGasSync}
              disabled={isSyncing}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
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

      {/* Expandable Google Apps Script (Code.gs) Source Code */}
      {showGasCode && (
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-sky-400">
                Code.gs · Google Apps Script (DriveApp & SpreadsheetApp)
              </div>
              <h3 className="text-sm font-semibold text-white mt-0.5">
                Skrip Otomatis Simpan & Ambil Data 4 Lembar Kerja di Folder
                &ldquo;UjianOnline_Database&rdquo;
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
            <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-lg overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
              {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
          </div>
        </div>
      )}

      {/* Interactive Local Data Table with Full Pilih, Edit, Hapus & Ambil Data per Tab */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Kelola Data Lokal & Sinkronisasi Tabel ({activeSheetTab})
            </h2>
            <p className="text-xs text-slate-500">
              Pilih satu atau beberapa baris data lokal di bawah ini untuk mengedit atau menghapus data sebelum/sesudah disinkronkan.
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
              onClick={() => onFetchFromDatabase(activeSheetTab)}
              disabled={isFetchingTab !== null}
              className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <CloudDownload className="w-3.5 h-3.5 text-sky-700" />
              <span>Ambil {activeSheetTab}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportTabAsCsv(activeSheetTab, students, questions, submissions)
              }
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>

        {/* Selection & Bulk Action Toolbar for Local Data */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-2"
            >
              {selectedIds.length === currentTabIds.length &&
              currentTabIds.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-sky-700" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                Pilih Semua di {activeSheetTab} ({currentTabIds.length})
              </span>
            </button>

            {selectedIds.length > 0 && (
              <span className="text-xs font-mono font-semibold text-sky-800">
                · {selectedIds.length} data lokal terpilih
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkEdit((prev) => !prev)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Massal ({selectedIds.length})</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedLocal}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data Lokal ({selectedIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  setShowBulkEdit(false);
                }}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Batal Pilih
              </button>
            </div>
          )}
        </div>

        {/* Bulk Edit Panel for Local Data */}
        {showBulkEdit && selectedIds.length > 0 && (
          <form
            onSubmit={handleApplyBulkLocalEdit}
            className="px-6 py-4 bg-sky-50/60 border-b border-sky-200 flex flex-wrap items-end gap-4"
          >
            {(activeSheetTab === 'Hasil_Ujian' ||
              activeSheetTab === 'Riwayat_Partisipasi') && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ubah Kelas Peserta
                  </label>
                  <input
                    type="text"
                    value={bulkClass}
                    onChange={(e) => setBulkClass(e.target.value)}
                    placeholder="Contoh: XII MIPA 1"
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Kelulusan
                  </label>
                  <select
                    value={bulkPassed}
                    onChange={(e) => setBulkPassed(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">-- Tidak Diubah --</option>
                    <option value="LULUS">LULUS</option>
                    <option value="REMEDIAL">REMEDIAL</option>
                  </select>
                </div>
              </>
            )}

            {activeSheetTab === 'Data_Siswa' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ubah Kelas
                  </label>
                  <input
                    type="text"
                    value={bulkClass}
                    onChange={(e) => setBulkClass(e.target.value)}
                    placeholder="Contoh: XII MIPA 2"
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ubah Status Siswa
                  </label>
                  <select
                    value={bulkStudentStatus}
                    onChange={(e) =>
                      setBulkStudentStatus(e.target.value as any)
                    }
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">-- Tidak Diubah --</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </>
            )}

            {activeSheetTab === 'Bank_Soal' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ubah Topik Soal
                  </label>
                  <input
                    type="text"
                    value={bulkQuestionTopic}
                    onChange={(e) => setBulkQuestionTopic(e.target.value)}
                    placeholder="Contoh: Biologi Seluler"
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={bulkQuestionDiff}
                    onChange={(e) => setBulkQuestionDiff(e.target.value as any)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">-- Tidak Diubah --</option>
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Sulit">Sulit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bobot Poin
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bulkQuestionPoints}
                    onChange={(e) => setBulkQuestionPoints(e.target.value)}
                    placeholder="20"
                    className="w-24 px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
              >
                Terapkan Perubahan Lokal
              </button>
              <button
                type="button"
                onClick={() => setShowBulkEdit(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          {activeSheetTab === 'Hasil_Ujian' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="py-2.5 px-3 w-10">Pilih</th>
                  <th className="py-2.5 px-3">A · ID_Hasil</th>
                  <th className="py-2.5 px-3">B · Waktu_Selesai</th>
                  <th className="py-2.5 px-3">C · NISN</th>
                  <th className="py-2.5 px-3">D · Nama_Siswa</th>
                  <th className="py-2.5 px-3">E · Kelas</th>
                  <th className="py-2.5 px-3 text-right">F · Skor</th>
                  <th className="py-2.5 px-3 text-right">G · Nilai_%</th>
                  <th className="py-2.5 px-3">H · Status</th>
                  <th className="py-2.5 px-3 text-right font-sans">
                    Aksi Data Lokal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {submissions.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-sky-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(s.id)}
                          className="rounded text-sky-700 focus:ring-sky-600"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{s.id}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {new Date(s.submittedAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {s.studentNisn}
                      </td>
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
                      <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSubmission({ ...s })}
                            className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSubmissions([s.id])}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeSheetTab === 'Data_Siswa' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="py-2.5 px-3 w-10">Pilih</th>
                  <th className="py-2.5 px-3">A · ID_Siswa</th>
                  <th className="py-2.5 px-3">B · NISN</th>
                  <th className="py-2.5 px-3">C · Nama_Lengkap</th>
                  <th className="py-2.5 px-3">D · Kelas</th>
                  <th className="py-2.5 px-3">E · Email_Sekolah</th>
                  <th className="py-2.5 px-3">F · Status</th>
                  <th className="py-2.5 px-3 text-right">
                    G · Total_Partisipasi
                  </th>
                  <th className="py-2.5 px-3 text-right font-sans">
                    Aksi Data Lokal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {students.map((st) => {
                  const isSelected = selectedIds.includes(st.id);
                  const count = submissions.filter(
                    (s) => s.studentId === st.id || s.studentNisn === st.nisn
                  ).length;
                  return (
                    <tr
                      key={st.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-sky-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(st.id)}
                          className="rounded text-sky-700 focus:ring-sky-600"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{st.id}</td>
                      <td className="py-2.5 px-3 text-slate-700">{st.nisn}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        {st.name}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {st.className}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{st.email}</td>
                      <td className="py-2.5 px-3 text-emerald-700">
                        {st.status}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingStudent({ ...st })}
                            className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStudents([st.id])}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
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
                  <th className="py-2.5 px-3 w-10">Pilih</th>
                  <th className="py-2.5 px-3">A · ID_Soal</th>
                  <th className="py-2.5 px-3">B · Topik</th>
                  <th className="py-2.5 px-3">C · Tipe</th>
                  <th className="py-2.5 px-3">D · Media</th>
                  <th className="py-2.5 px-3 text-right">E · Poin</th>
                  <th className="py-2.5 px-3">F · Kunci</th>
                  <th className="py-2.5 px-3">G · Pertanyaan</th>
                  <th className="py-2.5 px-3 text-right font-sans">
                    Aksi Data Lokal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {questions.map((q) => {
                  const isSelected = selectedIds.includes(q.id);
                  return (
                    <tr
                      key={q.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-sky-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(q.id)}
                          className="rounded text-sky-700 focus:ring-sky-600"
                        />
                      </td>
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
                      <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingQuestion({ ...q })}
                            className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteQuestions([q.id])}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeSheetTab === 'Riwayat_Partisipasi' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="py-2.5 px-3 w-10">Pilih</th>
                  <th className="py-2.5 px-3">A · ID_Partisipasi</th>
                  <th className="py-2.5 px-3">B · Waktu_Mulai</th>
                  <th className="py-2.5 px-3">C · Waktu_Selesai</th>
                  <th className="py-2.5 px-3">D · Nama_Siswa</th>
                  <th className="py-2.5 px-3">E · Pengacakan</th>
                  <th className="py-2.5 px-3">F · Detail_Evaluasi_Butir</th>
                  <th className="py-2.5 px-3 text-right font-sans">
                    Aksi Data Lokal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {submissions.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-sky-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(s.id)}
                          className="rounded text-sky-700 focus:ring-sky-600"
                        />
                      </td>
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
                              `${d.questionId}:${
                                d.isCorrect ? 'BENAR' : 'SALAH'
                              }(${d.earnedPoints}pt)`
                          )
                          .join(' · ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSubmission({ ...s })}
                            className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSubmissions([s.id])}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Edit Local Submission (Hasil_Ujian & Riwayat_Partisipasi) */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Edit Data Lokal Hasil & Riwayat Ujian ({editingSubmission.id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingSubmission(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSubmissionModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Siswa *
                  </label>
                  <input
                    type="text"
                    value={editingSubmission.studentName}
                    onChange={(e) =>
                      setEditingSubmission({
                        ...editingSubmission,
                        studentName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NISN *
                  </label>
                  <input
                    type="text"
                    value={editingSubmission.studentNisn}
                    onChange={(e) =>
                      setEditingSubmission({
                        ...editingSubmission,
                        studentNisn: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas
                  </label>
                  <input
                    type="text"
                    value={editingSubmission.className}
                    onChange={(e) =>
                      setEditingSubmission({
                        ...editingSubmission,
                        className: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durasi Pengerjaan (Detik)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingSubmission.durationSeconds}
                    onChange={(e) =>
                      setEditingSubmission({
                        ...editingSubmission,
                        durationSeconds: Number(e.target.value) || 60,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skor Perolehan
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editingSubmission.maxScore}
                    value={editingSubmission.totalScore}
                    onChange={(e) =>
                      setEditingSubmission({
                        ...editingSubmission,
                        totalScore: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skor Maksimal
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingSubmission.maxScore}
                    onChange={(e) =>
                      setEditingSubmission({
                        ...editingSubmission,
                        maxScore: Number(e.target.value) || 100,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubmission(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
                >
                  Simpan Perubahan Lokal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Local Student (Data_Siswa) */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Edit Data Lokal Siswa ({editingStudent.id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStudentModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NISN *
                  </label>
                  <input
                    type="text"
                    value={editingStudent.nisn}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        nisn: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas
                  </label>
                  <input
                    type="text"
                    value={editingStudent.className}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        className: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        status: e.target.value as 'Aktif' | 'Nonaktif',
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
                >
                  Simpan Perubahan Lokal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Local Question (Bank_Soal) */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Edit Data Lokal Soal ({editingQuestion.id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveQuestionModal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pertanyaan Soal *
                </label>
                <textarea
                  rows={3}
                  value={editingQuestion.text}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      text: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Topik
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.topic}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        topic: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        difficulty: e.target.value as DifficultyLevel,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Sulit">Sulit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bobot Poin
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingQuestion.points}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        points: Number(e.target.value) || 10,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
                >
                  Simpan Perubahan Lokal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
