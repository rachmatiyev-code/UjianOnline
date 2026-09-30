import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  CheckCircle2,
  Shuffle,
  Clock,
  Send,
  RotateCcw,
  Eye,
} from 'lucide-react';
import {
  Question,
  Student,
  ExamConfig,
  ExamSubmission,
  QuestionResultDetail,
  UserSession,
} from '../types/exam';
import { MediaRenderer } from './MediaRenderer';

interface ExamTakerViewProps {
  questions: Question[];
  students: Student[];
  examConfig: ExamConfig;
  currentSession: UserSession;
  studentSubmissions?: ExamSubmission[];
  onCompleteExam: (
    submission: ExamSubmission,
    newStudentIfCreated?: Student
  ) => void;
  onInspectSubmission: (submission: ExamSubmission) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const ExamTakerView: React.FC<ExamTakerViewProps> = ({
  questions,
  students,
  examConfig,
  currentSession,
  studentSubmissions = [],
  onCompleteExam,
  onInspectSubmission,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    currentSession.role === 'siswa' && currentSession.studentId
      ? currentSession.studentId
      : students[0]?.id || 'NEW'
  );
  const [customNisn, setCustomNisn] = useState(
    currentSession.role === 'siswa' ? currentSession.identifier : '0089912045'
  );
  const [customName, setCustomName] = useState(
    currentSession.role === 'siswa' ? currentSession.name : ''
  );
  const [customClass, setCustomClass] = useState(
    currentSession.role === 'siswa' && currentSession.className
      ? currentSession.className
      : 'XII MIPA 1'
  );
  const [customEmail, setCustomEmail] = useState(
    currentSession.role === 'siswa' && currentSession.email
      ? currentSession.email
      : ''
  );

  // Sync selected student when session changes
  useEffect(() => {
    if (currentSession.role === 'siswa') {
      if (currentSession.studentId) {
        setSelectedStudentId(currentSession.studentId);
      } else {
        const matched = students.find(
          (s) =>
            s.nisn === currentSession.identifier ||
            s.name.toLowerCase() === currentSession.name.toLowerCase()
        );
        if (matched) {
          setSelectedStudentId(matched.id);
        } else {
          setSelectedStudentId('NEW');
          setCustomName(currentSession.name);
          setCustomNisn(currentSession.identifier);
          if (currentSession.className) setCustomClass(currentSession.className);
          if (currentSession.email) setCustomEmail(currentSession.email);
        }
      }
    }
  }, [currentSession, students]);

  const [isExamActive, setIsExamActive] = useState(false);
  const [startedAtIso, setStartedAtIso] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [lastSubmission, setLastSubmission] = useState<ExamSubmission | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Timer effect during active exam
  useEffect(() => {
    if (!isExamActive) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamActive]);

  const remainingSeconds = Math.max(
    examConfig.durationMinutes * 60 - elapsedSeconds,
    0
  );

  const handleStartExam = () => {
    setValidationError(null);
    if (selectedStudentId === 'NEW' && !customName.trim()) {
      setValidationError('Mohon isi Nama Lengkap siswa terlebih dahulu sebelum memulai ujian.');
      return;
    }

    const orderedQuestions = examConfig.randomizeQuestions
      ? shuffleArray(questions)
      : [...questions];

    const preparedQuestions = orderedQuestions.map((q) => ({
      ...q,
      options:
        examConfig.randomizeOptions && q.type === 'multiple_choice'
          ? shuffleArray(q.options)
          : q.options,
    }));

    setActiveQuestions(preparedQuestions);
    setAnswers({});
    setElapsedSeconds(0);
    setStartedAtIso(new Date().toISOString());
    setLastSubmission(null);
    setIsExamActive(true);
  };

  const handleSingleSelect = (qId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: [optionId] }));
  };

  const handleCheckboxToggle = (qId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[qId] || [];
      const exists = current.includes(optionId);
      const next = exists
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [qId]: next };
    });
  };

  const handleShortAnswerChange = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value.trim() ? [value] : [] }));
  };

  const answeredCount = useMemo(() => {
    return activeQuestions.filter((q) => (answers[q.id]?.length || 0) > 0).length;
  }, [activeQuestions, answers]);

  const handleSubmitExam = () => {
    let studentObj = students.find((s) => s.id === selectedStudentId);
    let newlyCreatedStudent: Student | undefined;

    if (!studentObj) {
      newlyCreatedStudent = {
        id: `SIS-${String(Date.now()).slice(-4)}`,
        nisn: customNisn.trim() || '0089900111',
        name: customName.trim() || 'Siswa Peserta Ujian',
        className: customClass.trim() || 'XII MIPA 1',
        email:
          customEmail.trim() ||
          `${(customName.trim() || 'siswa').toLowerCase().replace(/\s+/g, '.')}@sekolah.sch.id`,
        status: 'Aktif',
        joinedAt: new Date().toISOString().slice(0, 10),
      };
      studentObj = newlyCreatedStudent;
    }

    let totalScore = 0;
    let maxScore = 0;

    // Grade against canonical order of questions for clean item analysis
    const details: QuestionResultDetail[] = questions.map((q) => {
      maxScore += q.points;
      const userAns = answers[q.id] || [];
      let isCorrect = false;

      if (q.type === 'short_answer') {
        const rawUser = (userAns[0] || '').trim().toLowerCase();
        isCorrect = q.correctAnswers.some(
          (accepted) => accepted.trim().toLowerCase() === rawUser
        );
      } else if (q.type === 'checkboxes') {
        const sortedUser = [...userAns].sort().join(',');
        const sortedCorrect = [...q.correctAnswers].sort().join(',');
        isCorrect = sortedUser.length > 0 && sortedUser === sortedCorrect;
      } else {
        isCorrect =
          userAns.length === 1 && userAns[0] === q.correctAnswers[0];
      }

      const earnedPoints = isCorrect ? q.points : 0;
      totalScore += earnedPoints;

      return {
        questionId: q.id,
        questionText: q.text,
        topic: q.topic,
        studentAnswers: userAns,
        correctAnswers: q.correctAnswers,
        isCorrect,
        earnedPoints,
        maxPoints: q.points,
        explanation: q.explanation,
      };
    });

    const percentage =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const gradeLetter: 'A' | 'B' | 'C' | 'D' | 'E' =
      percentage >= 85
        ? 'A'
        : percentage >= 75
        ? 'B'
        : percentage >= 60
        ? 'C'
        : percentage >= 45
        ? 'D'
        : 'E';

    const submission: ExamSubmission = {
      id: `SUB-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      studentId: studentObj.id,
      studentNisn: studentObj.nisn,
      studentName: studentObj.name,
      className: studentObj.className,
      examTitle: examConfig.title,
      startedAt: startedAtIso || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      durationSeconds: Math.max(elapsedSeconds, 12),
      totalScore,
      maxScore,
      percentage,
      gradeLetter,
      passed: percentage >= examConfig.passingGrade,
      randomizedQuestions: examConfig.randomizeQuestions,
      randomizedOptions: examConfig.randomizeOptions,
      details,
      syncedToSheets: false,
    };

    setIsExamActive(false);
    setLastSubmission(submission);
    onCompleteExam(submission, newlyCreatedStudent);
  };

  // Pre-exam or Post-exam Screen
  if (!isExamActive) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Google Forms-style Top Accent Banner */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="h-2.5 bg-sky-700" />
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Formulir Evaluasi Digital</span>
              <span aria-hidden="true">·</span>
              <span>Durasi: <strong className="font-mono tabular-nums">{examConfig.durationMinutes} Menit</strong></span>
              <span aria-hidden="true">·</span>
              <span>Ambang Batas Lulus: <strong className="font-mono tabular-nums">{examConfig.passingGrade}%</strong></span>
              <span aria-hidden="true">·</span>
              <span>Jumlah Soal: <strong className="font-mono tabular-nums">{questions.length} Butir</strong></span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
              {examConfig.title}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {examConfig.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-sky-700" />
                <span>
                  Pengacakan Soal:{' '}
                  <strong>{examConfig.randomizeQuestions ? 'Aktif' : 'Nonaktif'}</strong>
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Pengacakan Opsi:{' '}
                <strong>{examConfig.randomizeOptions ? 'Aktif' : 'Nonaktif'}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>Penilaian & Pembahasan Otomatis: <strong>Aktif</strong></span>
            </div>
          </div>
        </div>

        {/* Immediate Result Summary Card if just submitted */}
        {lastSubmission && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Respons Ujian Berhasil Direkam & Dinilai Otomatis</span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mt-1">
                  Hasil Evaluasi: {lastSubmission.studentName}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  NISN: <span className="font-mono tabular-nums">{lastSubmission.studentNisn}</span> · Kelas: {lastSubmission.className} · Sesi: <span className="font-mono">{lastSubmission.id}</span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-3xl font-semibold text-slate-900 font-mono tabular-nums">
                  {lastSubmission.percentage}% ({lastSubmission.gradeLetter})
                </div>
                <div
                  className={`text-xs font-semibold mt-0.5 ${
                    lastSubmission.passed ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {lastSubmission.passed ? '● LULUS KOMPETENSI' : '▲ PERLU REMEDIAL'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                Skor Poin: <strong className="font-mono tabular-nums">{lastSubmission.totalScore}/{lastSubmission.maxScore}</strong> · Jawaban Benar:{' '}
                <strong className="font-mono tabular-nums">
                  {lastSubmission.details.filter((d) => d.isCorrect).length}/{lastSubmission.details.length}
                </strong>{' '}
                butir soal.
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onInspectSubmission(lastSubmission)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka Analisis Lengkap & Pembahasan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Identity Card before Starting Exam */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Identitas Peserta Ujian
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentSession.role === 'siswa'
                  ? 'Anda masuk dengan akses Siswa (RBAC). Navigasi guru disembunyikan dan sesi ujian terhubung ke akun Anda.'
                  : 'Mode Simulasi Guru/Admin: Pilih nama siswa dari database atau daftarkan peserta baru untuk menguji formulir ujian.'}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-sky-800">
              {currentSession.role === 'siswa'
                ? `Sesi Siswa: ${currentSession.name} (${currentSession.identifier})`
                : 'Mode Pratinjau Guru/Admin'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {currentSession.role === 'siswa'
                  ? 'Peserta Ujian Aktif'
                  : 'Pilih Peserta dari Database Siswa'}
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} — NISN: {st.nisn} ({st.className})
                  </option>
                ))}
                <option value="NEW">+ Input Peserta Siswa Baru...</option>
              </select>
            </div>

            {selectedStudentId === 'NEW' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Contoh: Dimas Aditya Pratama"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nomor Induk Siswa Nasional (NISN) *
                  </label>
                  <input
                    type="text"
                    value={customNisn}
                    onChange={(e) => setCustomNisn(e.target.value)}
                    placeholder="0089912045"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kelas / Rombongan Belajar
                  </label>
                  <input
                    type="text"
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value)}
                    placeholder="XII MIPA 1"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Sekolah
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="dimas.pratama@sekolah.sch.id"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>
            )}

            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {validationError}
              </div>
            )}

            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Hasil ujian otomatis disinkronkan ke laporan guru & Google Sheets.
              </div>
              <button
                type="button"
                onClick={handleStartExam}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Mulai Kerjakan Formulir Ujian</span>
              </button>
            </div>
          </div>
        </div>

        {/* Personal Submission History for Siswa role */}
        {currentSession.role === 'siswa' && studentSubmissions.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Riwayat Partisipasi Ujian Saya
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar hasil evaluasi yang pernah dikerjakan oleh akun siswa aktif.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-600">
                {studentSubmissions.length} Sesi
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {studentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {sub.examTitle}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{sub.id}</span> ·{' '}
                      {new Date(sub.submittedAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · Durasi:{' '}
                      <span className="font-mono tabular-nums">
                        {Math.floor(sub.durationSeconds / 60)}m {sub.durationSeconds % 60}d
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                        {sub.percentage}% ({sub.gradeLetter})
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          sub.passed ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {sub.passed ? '● Lulus' : '▲ Remedial'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectSubmission(sub)}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                    >
                      Analisis & Pembahasan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Exam Form Interface (Google Forms Style)
  const minsLeft = Math.floor(remainingSeconds / 60);
  const secsLeft = remainingSeconds % 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Sticky Exam Status & Timer Header */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-xs font-semibold text-slate-900">
            {examConfig.title}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Terjawab: <strong className="font-mono tabular-nums text-slate-800">{answeredCount}/{activeQuestions.length}</strong> butir soal
            {examConfig.randomizeQuestions && ' · Urutan Diacak'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums font-semibold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-sky-700" />
            <span>
              {String(minsLeft).padStart(2, '0')}:{String(secsLeft).padStart(2, '0')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExamActive(false)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Batalkan</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-5">
        {activeQuestions.map((q, index) => {
          const currentAns = answers[q.id] || [];
          return (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              {/* Question Header Metadata (Zero-Pill Unboxed Text) */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900">
                    Pertanyaan {index + 1} dari {activeQuestions.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{q.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span>Tingkat {q.difficulty}</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {q.points} Poin
                </span>
              </div>

              {/* Question Prompt */}
              <p className="text-base text-slate-900 font-medium leading-relaxed">
                {q.text}
              </p>

              {/* Multimedia Attachment if any */}
              <MediaRenderer question={q} />

              {/* Answer Input Control based on Question Type */}
              <div className="pt-2 space-y-2.5">
                {(q.type === 'multiple_choice' || q.type === 'true_false') &&
                  q.options.map((opt) => {
                    const checked = currentAns.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-sky-50/70 border-sky-600 text-slate-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={checked}
                          onChange={() => handleSingleSelect(q.id, opt.id)}
                          className="mt-0.5 text-sky-700 focus:ring-sky-600"
                        />
                        <span className="text-sm leading-snug">
                          <strong className="font-mono mr-1.5">{opt.id}.</strong>
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}

                {q.type === 'checkboxes' && (
                  <>
                    <div className="text-xs text-slate-500 mb-1">
                      Pilih semua jawaban yang benar (Kotak Centang Jamak):
                    </div>
                    {q.options.map((opt) => {
                      const checked = currentAns.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? 'bg-sky-50/70 border-sky-600 text-slate-900'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleCheckboxToggle(q.id, opt.id)}
                            className="mt-0.5 rounded text-sky-700 focus:ring-sky-600"
                          />
                          <span className="text-sm leading-snug">
                            <strong className="font-mono mr-1.5">{opt.id}.</strong>
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </>
                )}

                {q.type === 'short_answer' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">
                      Ketikkan jawaban singkat Anda:
                    </label>
                    <input
                      type="text"
                      value={currentAns[0] || ''}
                      onChange={(e) => handleShortAnswerChange(q.id, e.target.value)}
                      placeholder="Jawaban Anda..."
                      className="w-full sm:max-w-md px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Selesai mengerjakan seluruh butir soal?
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Pastikan <strong className="font-mono tabular-nums">{answeredCount}</strong> dari{' '}
            <strong className="font-mono tabular-nums">{activeQuestions.length}</strong> soal telah terisi dengan benar sebelum dikirim.
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmitExam}
          className="px-6 py-2.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Kirim Formulir & Lihat Nilai Otomatis</span>
        </button>
      </div>
    </div>
  );
};
