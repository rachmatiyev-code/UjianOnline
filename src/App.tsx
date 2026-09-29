import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  INITIAL_EXAM_CONFIG,
  INITIAL_QUESTIONS,
  INITIAL_STUDENTS,
  INITIAL_SUBMISSIONS,
} from './data/initialData';
import {
  ExamConfig,
  Question,
  Student,
  ExamSubmission,
  WorkspaceDatabaseInfo,
} from './types/exam';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
} from './services/authService';
import {
  ensureDatabaseStructure,
  syncAllDataToSheets,
} from './services/workspaceService';
import { DashboardView } from './components/DashboardView';
import { ExamTakerView } from './components/ExamTakerView';
import { QuestionBankView } from './components/QuestionBankView';
import { StudentManagerView } from './components/StudentManagerView';
import { SheetsDatabaseView } from './components/SheetsDatabaseView';
import { StudentAnalysisModal } from './components/StudentAnalysisModal';
import { QuestionImportModal } from './components/QuestionImportModal';
import { ConfirmModal, ConfirmDialogState } from './components/ConfirmModal';

type ActiveTab = 'dashboard' | 'exam' | 'questions' | 'students' | 'sheets';

const STORAGE_KEYS = {
  QUESTIONS: 'ujianonline_questions_v1',
  STUDENTS: 'ujianonline_students_v1',
  SUBMISSIONS: 'ujianonline_submissions_v1',
  CONFIG: 'ujianonline_config_v1',
  DB_INFO: 'ujianonline_dbinfo_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [examConfig, setExamConfig] = useState<ExamConfig>(() =>
    loadFromStorage(STORAGE_KEYS.CONFIG, INITIAL_EXAM_CONFIG)
  );
  const [questions, setQuestions] = useState<Question[]>(() =>
    loadFromStorage(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
  );
  const [students, setStudents] = useState<Student[]>(() =>
    loadFromStorage(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS)
  );
  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() =>
    loadFromStorage(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS)
  );
  const [dbInfo, setDbInfo] = useState<WorkspaceDatabaseInfo | null>(() =>
    loadFromStorage(STORAGE_KEYS.DB_INFO, null)
  );

  // Auth & Workspace state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [inspectedSubmission, setInspectedSubmission] =
    useState<ExamSubmission | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Konfirmasi',
    onConfirm: () => {},
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  // Persist to localStorage for instant real-time cross-tab sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(examConfig));
    } catch {
      // ignore
    }
  }, [examConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    } catch {
      // ignore
    }
  }, [questions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch {
      // ignore
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
    } catch {
      // ignore
    }
  }, [submissions]);

  useEffect(() => {
    try {
      if (dbInfo) {
        localStorage.setItem(STORAGE_KEYS.DB_INFO, JSON.stringify(dbInfo));
      }
    } catch {
      // ignore
    }
  }, [dbInfo]);

  // Listen for storage events across tabs for real-time teacher monitoring
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SUBMISSIONS && e.newValue) {
        try {
          setSubmissions(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
      if (e.key === STORAGE_KEYS.STUDENTS && e.newValue) {
        try {
          setStudents(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
      if (e.key === STORAGE_KEYS.QUESTIONS && e.newValue) {
        try {
          setQuestions(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setUserEmail(user.email);
        setHasToken(true);
      },
      (user) => {
        setUserEmail(user?.email || null);
        setHasToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const executeGoogleSheetsSync = useCallback(
    async (
      nextStudents: Student[],
      nextQuestions: Question[],
      nextSubmissions: ExamSubmission[],
      explicitToken?: string
    ) => {
      const token = explicitToken || (await getAccessToken());
      if (!token) {
        setHasToken(false);
        return;
      }

      setIsSyncing(true);
      setSyncError(null);
      try {
        const currentDb =
          dbInfo || (await ensureDatabaseStructure(token));
        const syncedAt = await syncAllDataToSheets(
          token,
          currentDb,
          nextStudents,
          nextQuestions,
          nextSubmissions
        );
        const updatedDb: WorkspaceDatabaseInfo = {
          ...currentDb,
          lastSyncedAt: syncedAt,
        };
        setDbInfo(updatedDb);
        setSubmissions((prev) =>
          prev.map((s) => ({ ...s, syncedToSheets: true }))
        );
        showToast(
          'Berhasil menyinkronkan data ke Google Sheets di folder UjianOnline_Database.'
        );
      } catch (err: any) {
        console.error('Sync error:', err);
        setSyncError(
          err?.message ||
            'Gagal menyinkronkan ke Google Sheets. Pastikan izin Google Drive & Sheets aktif.'
        );
      } finally {
        setIsSyncing(false);
      }
    },
    [dbInfo, showToast]
  );

  const handleGoogleLoginAndSync = async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUserEmail(result.user.email);
        setHasToken(true);
        await executeGoogleSheetsSync(
          students,
          questions,
          submissions,
          result.accessToken
        );
      }
    } catch (err: any) {
      setSyncError(
        err?.message || 'Otorisasi Google gagal atau dibatalkan oleh pengguna.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setHasToken(false);
    setUserEmail(null);
    showToast('Sesi Google Workspace telah diputuskan.');
  };

  // Mandatory User Confirmation before mutating/overwriting Google Sheets data
  const handleTriggerSyncWithConfirmation = () => {
    if (!hasToken) {
      handleGoogleLoginAndSync();
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Sinkronkan & Perbarui Google Sheets?',
      description:
        'Tindakan ini akan memperbarui 4 lembar kerja (Hasil_Ujian, Data_Siswa, Bank_Soal, Riwayat_Partisipasi) di dalam spreadsheet UjianOnline_Master_Database pada folder Google Drive "UjianOnline_Database".',
      AffectedItems: [
        `${submissions.length} Baris Laporan Nilai & Riwayat Partisipasi`,
        `${students.length} Baris Data Induk Siswa`,
        `${questions.length} Baris Instrumen Bank Soal`,
      ],
      confirmLabel: 'Perbarui Google Sheets',
      variant: 'primary',
      onConfirm: () => {
        executeGoogleSheetsSync(students, questions, submissions);
      },
    });
  };

  // Exam Completion Handler (Auto-grades & syncs)
  const handleCompleteExam = (
    newSubmission: ExamSubmission,
    newStudentIfCreated?: Student
  ) => {
    const updatedStudents = newStudentIfCreated
      ? [newStudentIfCreated, ...students]
      : students;
    const updatedSubmissions = [newSubmission, ...submissions];

    if (newStudentIfCreated) {
      setStudents(updatedStudents);
    }
    setSubmissions(updatedSubmissions);
    showToast(
      `Nilai ujian ${newSubmission.studentName} (${newSubmission.percentage}%) berhasil dihitung secara otomatis.`
    );

    if (hasToken) {
      setConfirmDialog({
        isOpen: true,
        title: 'Simpan Hasil Ujian Baru ke Google Sheets?',
        description: `Simpan hasil ujian terbaru atas nama ${newSubmission.studentName} (Nilai: ${newSubmission.percentage}%) ke dalam spreadsheet di folder Google Drive "UjianOnline_Database"?`,
        AffectedItems: [
          `Peserta: ${newSubmission.studentName} (${newSubmission.className})`,
          `Skor: ${newSubmission.totalScore}/${newSubmission.maxScore} (${newSubmission.percentage}% - ${newSubmission.gradeLetter})`,
        ],
        confirmLabel: 'Simpan ke Google Sheets',
        variant: 'primary',
        onConfirm: () => {
          executeGoogleSheetsSync(
            updatedStudents,
            questions,
            updatedSubmissions
          );
        },
      });
    }
  };

  // Question CRUD with Confirmation for Deletions
  const handleAddQuestion = (q: Question) => {
    setQuestions((prev) => [...prev, q]);
    showToast(`Butir soal ${q.id} berhasil ditambahkan ke Bank Soal.`);
  };

  const handleUpdateQuestion = (updated: Question) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
    showToast(`Butir soal ${updated.id} berhasil diperbarui.`);
  };

  const handleDeleteQuestions = (ids: string[]) => {
    const affected = questions
      .filter((q) => ids.includes(q.id))
      .map((q) => `${q.id} — ${q.topic}: ${q.text.slice(0, 50)}...`);

    setConfirmDialog({
      isOpen: true,
      title: `Hapus ${ids.length} Butir Soal dari Bank Soal?`,
      description:
        'Butir soal yang dihapus akan dihilangkan dari formulir ujian aktif serta dari sinkronisasi tab Bank_Soal berikutnya.',
      AffectedItems: affected,
      confirmLabel: 'Hapus Soal',
      variant: 'danger',
      onConfirm: () => {
        setQuestions((prev) => prev.filter((q) => !ids.includes(q.id)));
        showToast(`${ids.length} butir soal telah dihapus.`);
      },
    });
  };

  const handleBulkUpdateQuestions = (
    ids: string[],
    patch: Partial<Pick<Question, 'topic' | 'difficulty' | 'points'>>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (ids.includes(q.id) ? { ...q, ...patch } : q))
    );
    showToast(`${ids.length} butir soal berhasil diperbarui secara massal.`);
  };

  const handleImportQuestions = (imported: Question[]) => {
    setQuestions((prev) => [...prev, ...imported]);
    showToast(`${imported.length} butir soal baru berhasil diimpor ke Bank Soal.`);
  };

  // Student CRUD with Confirmation for Deletions
  const handleAddStudent = (st: Student) => {
    setStudents((prev) => [st, ...prev]);
    showToast(`Siswa ${st.name} (${st.className}) berhasil ditambahkan.`);
  };

  const handleUpdateStudent = (updated: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    showToast(`Data siswa ${updated.name} berhasil diperbarui.`);
  };

  const handleDeleteStudents = (ids: string[]) => {
    const affected = students
      .filter((s) => ids.includes(s.id))
      .map((s) => `${s.nisn} · ${s.name} (${s.className})`);

    setConfirmDialog({
      isOpen: true,
      title: `Hapus ${ids.length} Data Siswa?`,
      description:
        'Menghapus data siswa akan mengeluarkan peserta terpilih dari daftar induk siswa. Pastikan Anda telah memverifikasi daftar siswa berikut.',
      AffectedItems: affected,
      confirmLabel: 'Hapus Data Siswa',
      variant: 'danger',
      onConfirm: () => {
        setStudents((prev) => prev.filter((s) => !ids.includes(s.id)));
        showToast(`${ids.length} data siswa telah dihapus.`);
      },
    });
  };

  const handleBulkUpdateStudents = (
    ids: string[],
    patch: Partial<Pick<Student, 'className' | 'status'>>
  ) => {
    setStudents((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s))
    );
    showToast(`${ids.length} data siswa berhasil diperbarui secara massal.`);
  };

  const handleDeleteSubmission = (sub: ExamSubmission) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Laporan Nilai Ujian?',
      description: `Apakah Anda yakin ingin menghapus riwayat nilai ujian milik ${sub.studentName} (${sub.percentage}%) dari daftar laporan?`,
      AffectedItems: [`${sub.id} · ${sub.studentName} · Skor ${sub.percentage}%`],
      confirmLabel: 'Hapus Laporan',
      variant: 'danger',
      onConfirm: () => {
        setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
        showToast(`Laporan nilai ${sub.id} telah dihapus.`);
      },
    });
  };

  const questionsMap = useMemo(() => {
    const map: Record<string, Question> = {};
    questions.forEach((q) => {
      map[q.id] = q;
    });
    return map;
  }, [questions]);

  const inspectedStudentSubmissions = useMemo(() => {
    if (!inspectedSubmission) return [];
    return submissions.filter(
      (s) =>
        s.studentId === inspectedSubmission.studentId ||
        s.studentNisn === inspectedSubmission.studentNisn
    );
  }, [inspectedSubmission, submissions]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap"
        >
          UjianOnline
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'dashboard'
                ? 'text-slate-900 border-sky-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Dashboard Nilai
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exam')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'exam'
                ? 'text-slate-900 border-sky-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Ruang Ujian
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'questions'
                ? 'text-slate-900 border-sky-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Bank Soal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'students'
                ? 'text-slate-900 border-sky-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Data Siswa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'sheets'
                ? 'text-slate-900 border-sky-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Database Sheets
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {!hasToken ? (
            <button
              type="button"
              onClick={handleGoogleLoginAndSync}
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
            <button
              type="button"
              onClick={handleTriggerSyncWithConfirmation}
              disabled={isSyncing}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
            >
              {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Sheets'}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'exam', label: 'Ruang Ujian' },
            { id: 'questions', label: 'Bank Soal' },
            { id: 'students', label: 'Data Siswa' },
            { id: 'sheets', label: 'Google Sheets' },
          ] as { id: ActiveTab; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
              activeTab === item.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Non-intrusive Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-40 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium max-w-sm border border-slate-700">
          {toastMessage}
        </div>
      )}

      {/* Main Content Container (1440px Desktop Presence) */}
      <main className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            submissions={submissions}
            questions={questions}
            students={students}
            examConfig={examConfig}
            dbInfo={dbInfo}
            isSyncing={isSyncing}
            onSyncNow={handleTriggerSyncWithConfirmation}
            onSelectSubmission={(sub) => setInspectedSubmission(sub)}
            onDeleteSubmission={handleDeleteSubmission}
            onNavigateToExam={() => setActiveTab('exam')}
          />
        )}

        {activeTab === 'exam' && (
          <ExamTakerView
            questions={questions}
            students={students}
            examConfig={examConfig}
            onCompleteExam={handleCompleteExam}
            onInspectSubmission={(sub) => setInspectedSubmission(sub)}
          />
        )}

        {activeTab === 'questions' && (
          <QuestionBankView
            questions={questions}
            examConfig={examConfig}
            onUpdateExamConfig={setExamConfig}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestions={handleDeleteQuestions}
            onBulkUpdateQuestions={handleBulkUpdateQuestions}
            onOpenImportModal={() => setIsImportModalOpen(true)}
          />
        )}

        {activeTab === 'students' && (
          <StudentManagerView
            students={students}
            submissions={submissions}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudents={handleDeleteStudents}
            onBulkUpdateStudents={handleBulkUpdateStudents}
            onInspectSubmission={(sub) => setInspectedSubmission(sub)}
          />
        )}

        {activeTab === 'sheets' && (
          <SheetsDatabaseView
            userEmail={userEmail}
            hasToken={hasToken}
            isLoggingIn={isLoggingIn}
            isSyncing={isSyncing}
            syncError={syncError}
            dbInfo={dbInfo}
            students={students}
            questions={questions}
            submissions={submissions}
            onGoogleLogin={handleGoogleLoginAndSync}
            onGoogleLogout={handleGoogleLogout}
            onSyncWithConfirmation={handleTriggerSyncWithConfirmation}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          UjianOnline — Sistem Evaluasi Terpadu & Integrasi Database Google Sheets (UjianOnline_Database)
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('exam')}
            className="hover:text-slate-900 transition-colors"
          >
            Simulasi Ujian
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className="hover:text-slate-900 transition-colors"
          >
            Pengaturan Google Sheets
          </button>
        </div>
      </footer>

      {/* Modals */}
      <StudentAnalysisModal
        submission={inspectedSubmission}
        allStudentSubmissions={inspectedStudentSubmissions}
        questionsMap={questionsMap}
        onClose={() => setInspectedSubmission(null)}
      />

      <QuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportQuestions={handleImportQuestions}
      />

      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
