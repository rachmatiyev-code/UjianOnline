import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  TeacherProfile,
} from './types/exam';
import {
  syncDataViaGoogleAppsScript,
  fetchFromDatabaseViaGas,
  fetchServerSharedState,
  saveServerSharedState,
  appendServerSubmission,
  buildShareableAppUrl,
  DatabaseTabName,
  DatabaseSnapshot,
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
import { TeacherProfileModal } from './components/TeacherProfileModal';

type ActiveTab = 'dashboard' | 'exam' | 'questions' | 'students' | 'sheets';

const DEFAULT_TEACHER_PASSWORD = 'guru123';

const DEFAULT_TEACHER_PROFILE: TeacherProfile = {
  name: 'Budi Santoso, M.Pd.',
  identifier: '198604122011011004',
  email: 'budi.santoso@sekolah.sch.id',
  schoolName: 'SMA Negeri 1 Nusantara',
  subjectName: 'Informatika & Ilmu Komputer',
  roleTitle: 'Guru / Koordinator Ujian',
};

const STORAGE_KEYS = {
  QUESTIONS: 'ujianonline_questions_v1',
  STUDENTS: 'ujianonline_students_v1',
  SUBMISSIONS: 'ujianonline_submissions_v1',
  CONFIG: 'ujianonline_config_v1',
  DB_INFO: 'ujianonline_dbinfo_v1',
  SESSION: 'ujianonline_rbac_session_v1',
  TEACHER_PASSWORD: 'ujianonline_teacher_password_v1',
  TEACHER_PROFILE: 'ujianonline_teacher_profile_v1',
  GAS_WEB_APP_URL: 'ujianonline_gas_webapp_url_v1',
  DATABASE_SNAPSHOT: 'ujianonline_db_snapshot_v1',
  HAS_CUSTOM_DATA: 'ujianonline_has_custom_data_v1',
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

function getGasUrlFromQuery(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('gas') || params.get('db') || '').trim();
  } catch {
    return '';
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
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(() =>
    loadFromStorage(STORAGE_KEYS.TEACHER_PROFILE, DEFAULT_TEACHER_PROFILE)
  );
  const [isTeacherProfileModalOpen, setIsTeacherProfileModalOpen] =
    useState(false);

  const [passwordModalState, setPasswordModalState] = useState<{
    isOpen: boolean;
    mode: 'verify' | 'change';
  }>({
    isOpen: false,
    mode: 'verify',
  });

  // Google Apps Script Web App state (Zero Firebase)
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string>(() => {
    const fromQuery = getGasUrlFromQuery();
    if (fromQuery) return fromQuery;
    return loadFromStorage(STORAGE_KEYS.GAS_WEB_APP_URL, '');
  });
  const [databaseSnapshot, setDatabaseSnapshot] = useState<DatabaseSnapshot>(
    () =>
      loadFromStorage<DatabaseSnapshot>(STORAGE_KEYS.DATABASE_SNAPSHOT, {
        students: INITIAL_STUDENTS,
        questions: INITIAL_QUESTIONS,
        submissions: INITIAL_SUBMISSIONS,
        updatedAt: new Date().toISOString(),
      })
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingTab, setIsFetchingTab] = useState<
    DatabaseTabName | 'ALL' | null
  >(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isInitialServerCheckDone, setIsInitialServerCheckDone] =
    useState(false);

  const hasAutoFetchedGasRef = useRef(false);

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

  // Mark local storage as having real user/teacher customizations
  const markCustomDataModified = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HAS_CUSTOM_DATA, 'true');
    } catch {
      // ignore
    }
  }, []);

  // 1. On initial load, sync with Server Shared State (/api/state) & URL ?gas= parameter
  // This ensures shared links NEVER load dummy data if the teacher has saved/edited data or connected Google Sheets.
  useEffect(() => {
    let isMounted = true;
    async function initSharedState() {
      const urlGas = getGasUrlFromQuery();
      const serverRes = await fetchServerSharedState();

      if (!isMounted) return;

      const hasLocalCustomFlag =
        localStorage.getItem(STORAGE_KEYS.HAS_CUSTOM_DATA) === 'true';
      const localGasUrl = loadFromStorage(STORAGE_KEYS.GAS_WEB_APP_URL, '');
      const localStudents = loadFromStorage<Student[] | null>(
        STORAGE_KEYS.STUDENTS,
        null
      );
      const isLocalDifferentFromDummy =
        hasLocalCustomFlag ||
        Boolean(localGasUrl) ||
        (Array.isArray(localStudents) &&
          (localStudents.length !== INITIAL_STUDENTS.length ||
            localStudents[0]?.name !== INITIAL_STUDENTS[0]?.name));

      let effectiveGasUrl = urlGas || localGasUrl;

      if (serverRes.hasServerData && serverRes.state) {
        const st = serverRes.state;
        // If this browser doesn't have custom local edits OR is opening a shared link, load the server state
        if (!isLocalDifferentFromDummy || urlGas) {
          if (Array.isArray(st.students)) setStudents(st.students);
          if (Array.isArray(st.questions)) setQuestions(st.questions);
          if (Array.isArray(st.submissions)) setSubmissions(st.submissions);
          if (st.examConfig) setExamConfig(st.examConfig);
          if (st.teacherProfile) setTeacherProfile(st.teacherProfile);
          if (st.teacherPassword) setTeacherPassword(st.teacherPassword);
          if (st.dbInfo) setDbInfo(st.dbInfo);
          if (st.gasWebAppUrl && !urlGas) {
            setGasWebAppUrl(st.gasWebAppUrl);
            effectiveGasUrl = st.gasWebAppUrl;
          }
        } else {
          // If server has data, still prefer more recent server data unless local is actively a teacher session
          const currentSession = loadFromStorage<UserSession | null>(
            STORAGE_KEYS.SESSION,
            null
          );
          if (currentSession?.role !== 'guru') {
            if (Array.isArray(st.students)) setStudents(st.students);
            if (Array.isArray(st.questions)) setQuestions(st.questions);
            if (Array.isArray(st.submissions)) setSubmissions(st.submissions);
            if (st.examConfig) setExamConfig(st.examConfig);
            if (st.teacherProfile) setTeacherProfile(st.teacherProfile);
            if (st.teacherPassword) setTeacherPassword(st.teacherPassword);
            if (st.dbInfo) setDbInfo(st.dbInfo);
            if (st.gasWebAppUrl && !effectiveGasUrl) {
              setGasWebAppUrl(st.gasWebAppUrl);
              effectiveGasUrl = st.gasWebAppUrl;
            }
          }
        }
      } else if (isLocalDifferentFromDummy) {
        // Server does not have data yet, but this browser has custom teacher data -> seed the server immediately!
        await saveServerSharedState({
          students,
          questions,
          submissions,
          examConfig,
          teacherProfile,
          teacherPassword,
          gasWebAppUrl: effectiveGasUrl,
          dbInfo,
        });
      }

      setIsInitialServerCheckDone(true);

      // If we have a Google Apps Script / Sheets URL (from query, server, or local), auto-fetch live data from Sheets!
      if (effectiveGasUrl && !hasAutoFetchedGasRef.current) {
        hasAutoFetchedGasRef.current = true;
        try {
          const result = await fetchFromDatabaseViaGas(
            effectiveGasUrl,
            'ALL',
            undefined,
            serverRes.state?.dbInfo?.spreadsheetId || dbInfo?.spreadsheetId
          );
          if (!isMounted) return;
          if (result.source === 'gas_remote') {
            if (result.students && result.students.length > 0) {
              setStudents(result.students);
            }
            if (result.questions && result.questions.length > 0) {
              setQuestions(result.questions);
            }
            if (result.submissions && result.submissions.length > 0) {
              setSubmissions(result.submissions);
            }
            if (result.dbInfo) {
              setDbInfo(result.dbInfo);
            }
          }
        } catch {
          // Silent fallback if offline
        }
      }
    }

    initSharedState();
    return () => {
      isMounted = false;
    };
  }, []);

  // Automatically persist state changes to the server so shared links ALWAYS get live data instead of dummy data
  useEffect(() => {
    if (!isInitialServerCheckDone) return;
    const hasLocalCustomFlag =
      localStorage.getItem(STORAGE_KEYS.HAS_CUSTOM_DATA) === 'true';
    if (!hasLocalCustomFlag && userSession?.role !== 'guru' && !gasWebAppUrl) {
      return;
    }

    const timer = setTimeout(() => {
      saveServerSharedState({
        students,
        questions,
        submissions,
        examConfig,
        teacherProfile,
        teacherPassword,
        gasWebAppUrl,
        dbInfo,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    isInitialServerCheckDone,
    students,
    questions,
    submissions,
    examConfig,
    teacherProfile,
    teacherPassword,
    gasWebAppUrl,
    dbInfo,
    userSession?.role,
  ]);

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
        STORAGE_KEYS.TEACHER_PROFILE,
        JSON.stringify(teacherProfile)
      );
    } catch {
      // ignore
    }
  }, [teacherProfile]);

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

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.DATABASE_SNAPSHOT,
        JSON.stringify(databaseSnapshot)
      );
    } catch {
      // ignore
    }
  }, [databaseSnapshot]);

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
      name: teacherProfile.name,
      identifier: teacherProfile.identifier,
      email: teacherProfile.email,
    };
    setUserSession(nextSession);
    setActiveTab('dashboard');
    showToast(
      `Password Guru terverifikasi. Masuk sebagai ${teacherProfile.name}.`
    );
  }, [teacherProfile, showToast]);

  const handleUpdateTeacherPassword = useCallback(
    (newPass: string) => {
      markCustomDataModified();
      setTeacherPassword(newPass);
      showToast('Password akses Guru/Admin berhasil diperbarui.');
    },
    [markCustomDataModified, showToast]
  );

  const handleUpdateTeacherProfile = useCallback(
    (updatedProfile: TeacherProfile) => {
      markCustomDataModified();
      setTeacherProfile(updatedProfile);
      setUserSession((prev) =>
        prev && prev.role === 'guru'
          ? {
              ...prev,
              name: updatedProfile.name,
              identifier: updatedProfile.identifier,
              email: updatedProfile.email,
            }
          : prev
      );
      showToast(
        `Data Guru (${updatedProfile.name}) berhasil diperbarui dan disimpan.`
      );
    },
    [markCustomDataModified, showToast]
  );

  const handleShareAppLink = useCallback(async () => {
    markCustomDataModified();
    await saveServerSharedState({
      students,
      questions,
      submissions,
      examConfig,
      teacherProfile,
      teacherPassword,
      gasWebAppUrl,
      dbInfo,
    });
    const url = buildShareableAppUrl(gasWebAppUrl);
    try {
      await navigator.clipboard.writeText(url);
      showToast(
        'Link aplikasi berhasil disalin! Data asli Anda telah disinkronkan ke server agar link yang dibagikan tidak memuat data dummy.'
      );
    } catch {
      showToast(
        `Data telah disinkronkan untuk link berbagi: ${url}`
      );
    }
  }, [
    markCustomDataModified,
    students,
    questions,
    submissions,
    examConfig,
    teacherProfile,
    teacherPassword,
    gasWebAppUrl,
    dbInfo,
    showToast,
  ]);

  const handleSimulateLocalGasSync = useCallback(() => {
    markCustomDataModified();
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
      const syncedSubs = submissions.map((s) => ({
        ...s,
        syncedToSheets: true,
      }));
      setSubmissions(syncedSubs);
      setDatabaseSnapshot((prev) => ({
        students: students.length > 0 ? students : prev.students,
        questions: questions.length > 0 ? questions : prev.questions,
        submissions: syncedSubs.length > 0 ? syncedSubs : prev.submissions,
        updatedAt: new Date().toISOString(),
      }));
      setIsSyncing(false);
      showToast(
        'Google Apps Script (DriveApp & SpreadsheetApp) berhasil menyinkronkan 4 lembar kerja di folder UjianOnline_Database.'
      );
    }, 500);
  }, [
    markCustomDataModified,
    gasWebAppUrl,
    students,
    questions,
    submissions,
    showToast,
  ]);

  const executeGoogleAppsScriptSync = useCallback(
    async (
      nextStudents: Student[],
      nextQuestions: Question[],
      nextSubmissions: ExamSubmission[]
    ) => {
      markCustomDataModified();
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
        const syncedSubs = nextSubmissions.map((s) => ({
          ...s,
          syncedToSheets: true,
        }));
        setDbInfo(updatedDb);
        setSubmissions(syncedSubs);
        setDatabaseSnapshot((prev) => ({
          students: nextStudents.length > 0 ? nextStudents : prev.students,
          questions: nextQuestions.length > 0 ? nextQuestions : prev.questions,
          submissions: syncedSubs.length > 0 ? syncedSubs : prev.submissions,
          updatedAt: new Date().toISOString(),
        }));
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
    [
      markCustomDataModified,
      gasWebAppUrl,
      handleSimulateLocalGasSync,
      showToast,
    ]
  );

  const handleFetchFromDatabase = useCallback(
    async (targetTab: DatabaseTabName | 'ALL') => {
      markCustomDataModified();
      setIsFetchingTab(targetTab);
      setSyncError(null);
      try {
        const result = await fetchFromDatabaseViaGas(
          gasWebAppUrl,
          targetTab,
          databaseSnapshot,
          dbInfo?.spreadsheetId
        );

        if (result.dbInfo) {
          setDbInfo(result.dbInfo);
        }

        if (targetTab === 'Data_Siswa' && result.students) {
          setStudents(result.students);
          if (result.students.length > 0) {
            setDatabaseSnapshot((prev) => ({
              ...prev,
              students: result.students!,
              updatedAt: new Date().toISOString(),
            }));
          }
          showToast(
            `Berhasil mengambil ${result.students.length} Data Siswa dari database (${
              result.source === 'gas_remote'
                ? 'Google Sheets GAS'
                : 'UjianOnline_Database'
            }).`
          );
        } else if (targetTab === 'Bank_Soal' && result.questions) {
          setQuestions(result.questions);
          if (result.questions.length > 0) {
            setDatabaseSnapshot((prev) => ({
              ...prev,
              questions: result.questions!,
              updatedAt: new Date().toISOString(),
            }));
          }
          showToast(
            `Berhasil mengambil ${result.questions.length} butir Bank Soal dari database (${
              result.source === 'gas_remote'
                ? 'Google Sheets GAS'
                : 'UjianOnline_Database'
            }).`
          );
        } else if (targetTab === 'Hasil_Ujian' && result.submissions) {
          setSubmissions(result.submissions);
          if (result.submissions.length > 0) {
            setDatabaseSnapshot((prev) => ({
              ...prev,
              submissions: result.submissions!,
              updatedAt: new Date().toISOString(),
            }));
          }
          showToast(
            `Berhasil mengambil ${result.submissions.length} Hasil Ujian dari database (${
              result.source === 'gas_remote'
                ? 'Google Sheets GAS'
                : 'UjianOnline_Database'
            }).`
          );
        } else if (targetTab === 'Riwayat_Partisipasi' && result.submissions) {
          setSubmissions(result.submissions);
          if (result.submissions.length > 0) {
            setDatabaseSnapshot((prev) => ({
              ...prev,
              submissions: result.submissions!,
              updatedAt: new Date().toISOString(),
            }));
          }
          showToast(
            `Berhasil mengambil ${result.submissions.length} Riwayat Partisipasi dari database (${
              result.source === 'gas_remote'
                ? 'Google Sheets GAS'
                : 'UjianOnline_Database'
            }).`
          );
        } else if (targetTab === 'ALL') {
          if (result.students) setStudents(result.students);
          if (result.questions) setQuestions(result.questions);
          if (result.submissions) setSubmissions(result.submissions);
          showToast(
            `Berhasil mengambil seluruh 4 tabel (${result.students?.length ?? 0} Siswa, ${result.questions?.length ?? 0} Soal, ${result.submissions?.length ?? 0} Hasil & Riwayat) dari database.`
          );
        }
      } catch (err: any) {
        console.error('Fetch from DB error:', err);
        setSyncError(
          err?.message ||
            'Gagal mengambil data dari Google Apps Script. Pastikan URL Web App benar.'
        );
      } finally {
        setIsFetchingTab(null);
      }
    },
    [
      markCustomDataModified,
      gasWebAppUrl,
      databaseSnapshot,
      dbInfo?.spreadsheetId,
      showToast,
    ]
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

  // Exam Completion Handler (Auto-grades & syncs via Server + GAS)
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
    appendServerSubmission(newSubmission, newStudentIfCreated);

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
    markCustomDataModified();
    setQuestions((prev) => [...prev, q]);
    showToast(`Butir soal ${q.id} berhasil ditambahkan ke Bank Soal.`);
  };

  const handleUpdateQuestion = (updated: Question) => {
    markCustomDataModified();
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
        markCustomDataModified();
        setQuestions((prev) => prev.filter((q) => !ids.includes(q.id)));
        showToast(`${ids.length} butir soal telah dihapus.`);
      },
    });
  };

  const handleBulkUpdateQuestions = (
    ids: string[],
    patch: Partial<Pick<Question, 'topic' | 'difficulty' | 'points'>>
  ) => {
    markCustomDataModified();
    setQuestions((prev) =>
      prev.map((q) => (ids.includes(q.id) ? { ...q, ...patch } : q))
    );
    showToast(`${ids.length} butir soal berhasil diperbarui secara massal.`);
  };

  const handleImportQuestions = (imported: Question[]) => {
    markCustomDataModified();
    setQuestions((prev) => [...prev, ...imported]);
    showToast(`${imported.length} butir soal baru berhasil diimpor ke Bank Soal.`);
  };

  // Student CRUD with Confirmation for Deletions & Bulk Name Input
  const handleAddStudent = (st: Student) => {
    markCustomDataModified();
    setStudents((prev) => [st, ...prev]);
    showToast(`Siswa ${st.name} (${st.className}) berhasil ditambahkan.`);
  };

  const handleBulkAddStudents = (
    newStudents: Student[],
    replaceOrMode?: boolean | 'append' | 'replace'
  ) => {
    markCustomDataModified();
    const shouldReplace =
      replaceOrMode === true || replaceOrMode === 'replace';
    if (shouldReplace) {
      setStudents(newStudents);
      setDatabaseSnapshot((prev) => ({
        ...prev,
        students: newStudents,
        updatedAt: new Date().toISOString(),
      }));
      showToast(
        `Berhasil mengganti daftar siswa dengan ${newStudents.length} data siswa baru (data dummy dibersihkan).`
      );
    } else {
      setStudents((prev) => {
        const combined = [...newStudents, ...prev];
        setDatabaseSnapshot((snap) => ({
          ...snap,
          students: combined,
          updatedAt: new Date().toISOString(),
        }));
        return combined;
      });
      showToast(
        `Berhasil menambahkan ${newStudents.length} nama siswa secara massal (bulk).`
      );
    }
  };

  const handleUpdateStudent = (updated: Student) => {
    markCustomDataModified();
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
        markCustomDataModified();
        setStudents((prev) => prev.filter((s) => !ids.includes(s.id)));
        showToast(`${ids.length} data siswa telah dihapus.`);
      },
    });
  };

  const handleBulkUpdateStudents = (
    ids: string[],
    patch: Partial<Pick<Student, 'className' | 'status'>>
  ) => {
    markCustomDataModified();
    setStudents((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s))
    );
    showToast(`${ids.length} data siswa berhasil diperbarui secara massal.`);
  };

  // Submissions & Participation History Local CRUD (Pilih, Edit, Hapus Data Lokal)
  const handleUpdateSubmission = (updated: ExamSubmission) => {
    markCustomDataModified();
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    showToast(
      `Data lokal hasil/riwayat ujian ${updated.studentName} (${updated.id}) berhasil diperbarui.`
    );
  };

  const handleBulkUpdateSubmissions = (
    ids: string[],
    patch: { className?: string; passed?: boolean }
  ) => {
    markCustomDataModified();
    setSubmissions((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, ...patch } : s))
    );
    showToast(
      `${ids.length} data lokal hasil & riwayat ujian berhasil diperbarui secara massal.`
    );
  };

  const handleDeleteSubmissions = (ids: string[]) => {
    const affected = submissions
      .filter((s) => ids.includes(s.id))
      .map(
        (s) => `${s.id} · ${s.studentName} (${s.className}) · Nilai ${s.percentage}%`
      );

    setConfirmDialog({
      isOpen: true,
      title: `Hapus ${ids.length} Data Lokal Hasil & Riwayat Ujian?`,
      description:
        'Menghapus data lokal ini akan menghilangkannya dari daftar Hasil Ujian dan Riwayat Partisipasi lokal. Anda tetap dapat memulihkannya dari database jika sudah disinkronkan.',
      AffectedItems: affected,
      confirmLabel: 'Hapus Data Lokal',
      variant: 'danger',
      onConfirm: () => {
        markCustomDataModified();
        setSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
        showToast(`${ids.length} data lokal hasil & riwayat ujian telah dihapus.`);
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
                <>
                  <button
                    type="button"
                    onClick={() => setIsTeacherProfileModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
                    title="Edit biodata Guru, NIP, sekolah, mata pelajaran, & password"
                  >
                    Edit Data Guru
                  </button>
                  <button
                    type="button"
                    onClick={handleShareAppLink}
                    className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors whitespace-nowrap"
                    title="Salin link berbagi ujian (sinkronisasi data asli ke server agar tidak memuat data dummy)"
                  >
                    Bagikan Link
                  </button>
                </>
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
            teacherProfile={teacherProfile}
            onLogin={handleRbacLogin}
            onUpdateTeacherPassword={handleUpdateTeacherPassword}
            onUpdateTeacherProfile={handleUpdateTeacherProfile}
            onOpenEditTeacherProfile={() => setIsTeacherProfileModalOpen(true)}
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
                isFetchingTab={isFetchingTab}
                onSyncNow={handleTriggerSyncWithConfirmation}
                onFetchFromDatabase={handleFetchFromDatabase}
                onSelectSubmission={(sub) => setInspectedSubmission(sub)}
                onUpdateSubmission={handleUpdateSubmission}
                onBulkUpdateSubmissions={handleBulkUpdateSubmissions}
                onDeleteSubmissions={handleDeleteSubmissions}
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
                isFetchingTab={isFetchingTab}
                onFetchFromDatabase={handleFetchFromDatabase}
                onUpdateExamConfig={(cfg) => {
                  markCustomDataModified();
                  setExamConfig(cfg);
                }}
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
                isFetchingTab={isFetchingTab}
                onFetchFromDatabase={handleFetchFromDatabase}
                onAddStudent={handleAddStudent}
                onBulkAddStudents={handleBulkAddStudents}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudents={handleDeleteStudents}
                onBulkUpdateStudents={handleBulkUpdateStudents}
                onInspectSubmission={(sub) => setInspectedSubmission(sub)}
              />
            )}

            {userSession.role === 'guru' && effectiveTab === 'sheets' && (
              <SheetsDatabaseView
                gasWebAppUrl={gasWebAppUrl}
                onUpdateGasWebAppUrl={(url) => {
                  markCustomDataModified();
                  setGasWebAppUrl(url);
                }}
                isSyncing={isSyncing}
                isFetchingTab={isFetchingTab}
                syncError={syncError}
                dbInfo={dbInfo}
                students={students}
                questions={questions}
                submissions={submissions}
                passingGrade={examConfig.passingGrade}
                onSyncWithConfirmation={handleTriggerSyncWithConfirmation}
                onSimulateLocalGasSync={handleSimulateLocalGasSync}
                onFetchFromDatabase={handleFetchFromDatabase}
                onUpdateSubmission={handleUpdateSubmission}
                onBulkUpdateSubmissions={handleBulkUpdateSubmissions}
                onDeleteSubmissions={handleDeleteSubmissions}
                onUpdateStudent={handleUpdateStudent}
                onBulkUpdateStudents={handleBulkUpdateStudents}
                onDeleteStudents={handleDeleteStudents}
                onUpdateQuestion={handleUpdateQuestion}
                onBulkUpdateQuestions={handleBulkUpdateQuestions}
                onDeleteQuestions={handleDeleteQuestions}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Quiet Footer (RBAC-Aware) */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          UjianOnline — {teacherProfile.schoolName} · {teacherProfile.subjectName} ({teacherProfile.name})
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
                onClick={() => setIsTeacherProfileModalOpen(true)}
                className="hover:text-slate-900 transition-colors"
              >
                Edit Data Guru
              </button>
              <button
                type="button"
                onClick={() =>
                  setPasswordModalState({ isOpen: true, mode: 'change' })
                }
                className="hover:text-slate-900 transition-colors"
              >
                Ubah Password
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

      <TeacherProfileModal
        isOpen={isTeacherProfileModalOpen}
        teacherProfile={teacherProfile}
        currentPassword={teacherPassword}
        shareableUrl={buildShareableAppUrl(gasWebAppUrl)}
        onClose={() => setIsTeacherProfileModalOpen(false)}
        onSaveProfile={(nextProfile, nextPassword) => {
          handleUpdateTeacherProfile(nextProfile);
          if (nextPassword) {
            handleUpdateTeacherPassword(nextPassword);
          }
        }}
      />
    </div>
  );
}
