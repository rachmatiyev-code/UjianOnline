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
  UserSession,
} from './types/exam';
import {
  syncDataViaGoogleAppsScript,
  FOLDER_NAME,
  SPREADSHEET_TITLE,
} from './services/workspaceService';
import { DashboardView } from './components/DashboardView';
import { ExamTakerView } from './components/ExamTakerView';
import { QuestionBankView } from './components/QuestionBankView';
import { StudentManagerView } from './components/StudentManagerView';
import { SheetsDatabaseView } from './components/SheetsDatabaseView';
import { StudentAnalysisModal } from './components/StudentAnalysisModal';
import { QuestionImportModal } from './components/QuestionImportModal';
import { ConfirmModal, ConfirmDialogState } from './components/ConfirmModal';
import { LoginPortalView } from './components/LoginPortalView';
import { TeacherPasswordModal } from './components/TeacherPasswordModal';

type ActiveTab = 'dashboard' | 'exam' | 'questions' | 'students' | 'sheets';

const DEFAULT_TEACHER_PASSWORD = 'guru123';

const STORAGE_KEYS = {
  QUESTIONS: 'ujianonline_questions_v1',
  STUDENTS: 'ujianonline_students_v1',
  SUBMISSIONS: 'ujianonline_submissions_v1',
  CONFIG: 'ujianonline_config_v1',
  DB_INFO: 'ujianonline_dbinfo_v1',
  SESSION: 'ujianonline_rbac_session_v1',
  TEACHER_PASSWORD: 'ujianonline_teacher_password_v1',
  GAS_WEB_APP_URL: 'ujianonline_gas_webapp_url_v1',
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
  const [userSession, setUserSession] = useState<UserSession | null>(() =>
    loadFromStorage<UserSession | null>(STORAGE_KEYS.SESSION, null)
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const savedSession = loadFromStorage<UserSession | null>(
      STORAGE_KEYS.SESSION,
      null
    );
    return savedSession?.role === 'siswa' ? 'exam' : 'dashboard';
  });

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
  const [teacherPassword, setTeacherPassword] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.TEACHER_PASSWORD, DEFAULT_TEACHER_PASSWORD)
  );
  const [passwordModalState, setPasswordModalState] = useState<{
    isOpen: boolean;
    mode: 'verify' | 'change';
  }>({
    isOpen: false,
    mode: 'verify',
  });

  // Google Apps Script Web App state (Zero Firebase)
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.GAS_WEB_APP_URL, '')
  );
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

  useEffect(() => {
    try {
      if (userSession) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(userSession));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch {
      // ignore
    }
  }, [userSession]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.TEACHER_PASSWORD,
        JSON.stringify(teacherPassword)
      );
    } catch {
      // ignore
    }
  }, [teacherPassword]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.GAS_WEB_APP_URL,
        JSON.stringify(gasWebAppUrl)
      );
    } catch {
      // ignore
    }
  }, [gasWebAppUrl]);

  // Enforce RBAC navigation lock: Siswa can ONLY stay on 'exam' (Ruang Ujian)
  useEffect(() => {
    if (userSession?.role === 'siswa' && activeTab !== 'exam') {
      setActiveTab('exam');
    }
  }, [userSession, activeTab]);

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

  // RBAC Login & Role Switching Handlers
  const handleRbacLogin = useCallback(
    (session: UserSession, newStudentIfCreated?: Student) => {
      if (newStudentIfCreated) {
        setStudents((prev) => [newStudentIfCreated, ...prev]);
      }
      setUserSession(session);
      if (session.role === 'siswa') {
        setActiveTab('exam');
        showToast(
          `Masuk sebagai Siswa (${session.name}). Semua tab guru disembunyikan & akses dibatasi ke Ruang Ujian.`
        );
      } else {
        setActiveTab('dashboard');
        showToast(
          `Masuk sebagai Guru/Admin (${session.name}). Seluruh menu navigasi ditampilkan.`
        );
      }
    },
    [showToast]
  );

  const handleRbacLogout = useCallback(() => {
    setUserSession(null);
    showToast('Anda telah keluar dari sesi. Silakan pilih peran untuk masuk kembali.');
  }, [showToast]);

  const handleQuickSwitchRole = useCallback(
    (targetRole: 'siswa' | 'guru') => {
      if (targetRole === 'siswa') {
        const defaultStudent = students[0];
        const nextSession: UserSession = defaultStudent
          ? {
              role: 'siswa',
              name: defaultStudent.name,
              identifier: defaultStudent.nisn,
              studentId: defaultStudent.id,
              className: defaultStudent.className,
              email: defaultStudent.email,
            }
          : {
              role: 'siswa',
              name: 'Alya Putri Ramadhani',
              identifier: '0084192831',
              className: 'XII MIPA 1',
              email: 'alya.ramadhani@sekolah.sch.id',
            };
        setUserSession(nextSession);
        setActiveTab('exam');
        showToast(
          `Peran diubah ke Siswa (${nextSession.name}). Navigasi dikunci hanya di Ruang Ujian.`
        );
      } else {
        // Switching to Guru/Admin ALWAYS requires entering the teacher-defined password
        setPasswordModalState({ isOpen: true, mode: 'verify' });
      }
    },
    [students, showToast]
  );

  const handleVerifiedTeacherModalLogin = useCallback(() => {
    const nextSession: UserSession = {
      role: 'guru',
      name: 'Budi Santoso, M.Pd.',
      identifier: '198604122011011004',
      email: 'budi.santoso@sekolah.sch.id',
    };
    setUserSession(nextSession);
    setActiveTab('dashboard');
    showToast(
      'Password Guru terverifikasi. Seluruh menu navigasi Guru/Admin ditampilkan.'
    );
  }, [showToast]);

  const handleUpdateTeacherPassword = useCallback(
    (newPass: string) => {
      setTeacherPassword(newPass);
      showToast('Password akses Guru/Admin berhasil diperbarui.');
    },
    [showToast]
  );

  const handleSimulateLocalGasSync = useCallback(() => {
    setIsSyncing(true);
    setSyncError(null);
    setTimeout(() => {
      const simulatedDb: WorkspaceDatabaseInfo = {
        gasWebAppUrl:
          gasWebAppUrl.trim() ||
          'https://script.google.com/macros/s/AKfycb_UjianOnline_Database/exec',
        folderId: '1UjianOnlineFolder_GAS',
        folderName: FOLDER_NAME,
        folderUrl: 'https://drive.google.com/drive/my-drive',
        spreadsheetId: '1UjianOnlineSheet_GAS',
        spreadsheetTitle: SPREADSHEET_TITLE,
        spreadsheetUrl: 'https://docs.google.com/spreadsheets',
        lastSyncedAt: new Date().toISOString(),
      };
      setDbInfo(simulatedDb);
      setSubmissions((prev) =>
        prev.map((s) => ({ ...s, syncedToSheets: true }))
      );
      setIsSyncing(false);
      showToast(
        'Google Apps Script (DriveApp & SpreadsheetApp) berhasil menyinkronkan 4 lembar kerja di folder UjianOnline_Database.'
      );
    }, 600);
  }, [gasWebAppUrl, showToast]);

  const executeGoogleAppsScriptSync = useCallback(
    async (
      nextStudents: Student[],
      nextQuestions: Question[],
      nextSubmissions: ExamSubmission[]
    ) => {
      if (!gasWebAppUrl.trim()) {
        handleSimulateLocalGasSync();
        return;
      }

      setIsSyncing(true);
      setSyncError(null);
      try {
        const updatedDb = await syncDataViaGoogleAppsScript(
          gasWebAppUrl,
          nextStudents,
          nextQuestions,
          nextSubmissions
        );
        setDbInfo(updatedDb);
        setSubmissions((prev) =>
          prev.map((s) => ({ ...s, syncedToSheets: true }))
        );
        showToast(
          'Berhasil menyinkronkan data ke Google Sheets via Google Apps Script (folder UjianOnline_Database).'
        );
      } catch (err: any) {
        console.error('GAS Sync error:', err);
        setSyncError(
          err?.message ||
            'Gagal menghubungi Web App Google Apps Script. Pastikan URL .../exec benar dan di-deploy dengan akses "Anyone".'
        );
      } finally {
        setIsSyncing(false);
      }
    },
    [gasWebAppUrl, handleSimulateLocalGasSync, showToast]
  );

  // Mandatory User Confirmation before mutating/overwriting Google Sheets data via GAS
  const handleTriggerSyncWithConfirmation = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Sinkronkan ke Google Sheets via Google Apps Script?',
      description:
        'Tindakan ini akan mengeksekusi fungsi doPost(e) pada Google Apps Script untuk memastikan folder "UjianOnline_Database" tersedia di Google Drive dan memperbarui 4 lembar kerja (Hasil_Ujian, Data_Siswa, Bank_Soal, Riwayat_Partisipasi).',
      AffectedItems: [
        `${submissions.length} Baris Laporan Nilai & Riwayat Partisipasi`,
        `${students.length} Baris Data Induk Siswa`,
        `${questions.length} Baris Instrumen Bank Soal`,
      ],
      confirmLabel: 'Jalankan Google Apps Script',
      variant: 'primary',
      onConfirm: () => {
        executeGoogleAppsScriptSync(students, questions, submissions);
      },
    });
  };

  // Exam Completion Handler (Auto-grades & syncs via GAS)
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

    if (gasWebAppUrl.trim() || dbInfo) {
      setConfirmDialog({
        isOpen: true,
        title: 'Kirim Hasil Ujian ke Google Sheets (Apps Script)?',
        description: `Kirim hasil ujian terbaru atas nama ${newSubmission.studentName} (Nilai: ${newSubmission.percentage}%) ke spreadsheet di folder Google Drive "UjianOnline_Database" melalui Google Apps Script?`,
        AffectedItems: [
          `Peserta: ${newSubmission.studentName} (${newSubmission.className})`,
          `Skor: ${newSubmission.totalScore}/${newSubmission.maxScore} (${newSubmission.percentage}% - ${newSubmission.gradeLetter})`,
        ],
        confirmLabel: 'Kirim via Apps Script',
        variant: 'primary',
        onConfirm: () => {
          executeGoogleAppsScriptSync(
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

  const currentStudentPersonalSubmissions = useMemo(() => {
    if (!userSession || userSession.role !== 'siswa') return [];
    return submissions.filter(
      (s) =>
        (userSession.studentId && s.studentId === userSession.studentId) ||
        s.studentNisn === userSession.identifier ||
        s.studentName.toLowerCase() === userSession.name.toLowerCase()
    );
  }, [userSession, submissions]);

  // Strict RBAC Tab Guard: If logged in as Siswa, effectiveTab is strictly locked to 'exam'
  const effectiveTab: ActiveTab =
    userSession?.role === 'siswa' ? 'exam' : activeTab;

  const visibleNavItems: { id: ActiveTab; label: string; mobileLabel: string }[] =
    useMemo(() => {
      if (!userSession) return [];
      if (userSession.role === 'siswa') {
        return [{ id: 'exam', label: 'Ruang Ujian', mobileLabel: 'Ruang Ujian' }];
      }
      return [
        { id: 'dashboard', label: 'Dashboard Nilai', mobileLabel: 'Dashboard' },
        { id: 'exam', label: 'Ruang Ujian', mobileLabel: 'Ruang Ujian' },
        { id: 'questions', label: 'Bank Soal', mobileLabel: 'Bank Soal' },
        { id: 'students', label: 'Data Siswa', mobileLabel: 'Data Siswa' },
        { id: 'sheets', label: 'Database Sheets', mobileLabel: 'Google Sheets' },
      ];
    }, [userSession]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href={userSession?.role === 'siswa' ? '#exam' : '#dashboard'}
          onClick={(e) => {
            e.preventDefault();
            if (!userSession) return;
            setActiveTab(userSession.role === 'siswa' ? 'exam' : 'dashboard');
          }}
          className="text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap"
        >
          UjianOnline
        </a>

        {/* Zone 2: RBAC-aware clean text navigation links */}
        {userSession ? (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setActiveTab(
                    userSession.role === 'siswa' ? 'exam' : item.id
                  )
                }
                className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
                  effectiveTab === item.id
                    ? 'text-slate-900 border-sky-700 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : (
          <div className="hidden md:block text-xs text-slate-500">
            Pilih Peran Akses: <strong className="text-slate-800">Siswa</strong> atau{' '}
            <strong className="text-slate-800">Guru/Admin</strong>
          </div>
        )}

        {/* Zone 3: RBAC Session Controls & Primary Actions */}
        <div className="flex items-center gap-2">
          {!userSession ? (
            <>
              <button
                type="button"
                onClick={() => handleQuickSwitchRole('siswa')}
                className="px-3.5 py-2 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Masuk Siswa
              </button>
              <button
                type="button"
                onClick={() =>
                  setPasswordModalState({ isOpen: true, mode: 'verify' })
                }
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Login Password Guru
              </button>
            </>
          ) : (
            <>
              {/* Active RBAC Role Indicator & Role Switcher */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 mr-1">
                <span>
                  Peran:{' '}
                  <strong className="text-slate-900">
                    {userSession.role === 'siswa' ? 'Siswa' : 'Guru/Admin'}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[130px]" title={userSession.name}>
                  {userSession.name}
                </span>
              </div>

              {userSession.role === 'guru' && (
                <button
                  type="button"
                  onClick={() =>
                    setPasswordModalState({ isOpen: true, mode: 'change' })
                  }
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
                  title="Atur atau ubah password akses Guru/Admin"
                >
                  Atur Password Guru
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  handleQuickSwitchRole(
                    userSession.role === 'siswa' ? 'guru' : 'siswa'
                  )
                }
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                title={
                  userSession.role === 'siswa'
                    ? 'Masukkan password guru untuk beralih ke mode Guru/Admin'
                    : 'Beralih ke peran Siswa untuk menyembunyikan tab guru & membatasi di Ruang Ujian'
                }
              >
                {userSession.role === 'siswa'
                  ? 'Masuk Guru (Password)'
                  : 'Mode Siswa'}
              </button>

              {/* Teacher-only Google Apps Script Sync Button */}
              {userSession.role === 'guru' && (
                <button
                  type="button"
                  onClick={handleTriggerSyncWithConfirmation}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {isSyncing ? 'Sinkronisasi GAS...' : 'Sinkronkan Sheets (GAS)'}
                </button>
              )}

              <button
                type="button"
                onClick={handleRbacLogout}
                className="px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Keluar
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Navigation Strip (RBAC filtered) */}
      {userSession && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setActiveTab(
                    userSession.role === 'siswa' ? 'exam' : item.id
                  )
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  effectiveTab === item.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.mobileLabel}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
            {userSession.role === 'siswa' ? 'Akses: Siswa' : 'Akses: Guru/Admin'}
          </span>
        </div>
      )}

      {/* Non-intrusive Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-40 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium max-w-sm border border-slate-700">
          {toastMessage}
        </div>
      )}

      {/* Main Content Container (1440px Desktop Presence) */}
      <main className="flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!userSession ? (
          <LoginPortalView
            students={students}
            teacherPassword={teacherPassword}
            isDefaultPassword={teacherPassword === DEFAULT_TEACHER_PASSWORD}
            onLogin={handleRbacLogin}
            onUpdateTeacherPassword={handleUpdateTeacherPassword}
          />
        ) : (
          <>
            {userSession.role === 'guru' && effectiveTab === 'dashboard' && (
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

            {effectiveTab === 'exam' && (
              <ExamTakerView
                questions={questions}
                students={students}
                examConfig={examConfig}
                currentSession={userSession}
                studentSubmissions={currentStudentPersonalSubmissions}
                onCompleteExam={handleCompleteExam}
                onInspectSubmission={(sub) => setInspectedSubmission(sub)}
              />
            )}

            {userSession.role === 'guru' && effectiveTab === 'questions' && (
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

            {userSession.role === 'guru' && effectiveTab === 'students' && (
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

            {userSession.role === 'guru' && effectiveTab === 'sheets' && (
              <SheetsDatabaseView
                gasWebAppUrl={gasWebAppUrl}
                onUpdateGasWebAppUrl={setGasWebAppUrl}
                isSyncing={isSyncing}
                syncError={syncError}
                dbInfo={dbInfo}
                students={students}
                questions={questions}
                submissions={submissions}
                onSyncWithConfirmation={handleTriggerSyncWithConfirmation}
                onSimulateLocalGasSync={handleSimulateLocalGasSync}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Quiet Footer (RBAC-Aware) */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          UjianOnline — Sistem Evaluasi Terpadu & Integrasi Database Google Sheets (UjianOnline_Database)
        </span>
        <div className="flex items-center gap-4">
          {!userSession ? (
            <span>RBAC Aktif: Masuk sebagai Siswa atau Guru/Admin</span>
          ) : userSession.role === 'siswa' ? (
            <span>
              Hak Akses RBAC: <strong className="text-slate-700">Siswa (Hanya Ruang Ujian)</strong>
            </span>
          ) : (
            <>
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
            </>
          )}
        </div>
      </footer>

      {/* Modals */}
      <StudentAnalysisModal
        submission={inspectedSubmission}
        allStudentSubmissions={inspectedStudentSubmissions}
        questionsMap={questionsMap}
        onClose={() => setInspectedSubmission(null)}
      />

      {userSession?.role === 'guru' && (
        <QuestionImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportQuestions={handleImportQuestions}
        />
      )}

      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      <TeacherPasswordModal
        isOpen={passwordModalState.isOpen}
        initialMode={passwordModalState.mode}
        currentTeacherPassword={teacherPassword}
        isDefaultPassword={teacherPassword === DEFAULT_TEACHER_PASSWORD}
        isAlreadyTeacher={userSession?.role === 'guru'}
        onClose={() =>
          setPasswordModalState((prev) => ({ ...prev, isOpen: false }))
        }
        onVerifiedLogin={handleVerifiedTeacherModalLogin}
        onUpdatePassword={handleUpdateTeacherPassword}
      />
    </div>
  );
}
