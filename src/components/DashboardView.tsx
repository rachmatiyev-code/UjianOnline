import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Trash2,
  Play,
} from 'lucide-react';
import {
  ExamSubmission,
  Question,
  Student,
  ExamConfig,
  WorkspaceDatabaseInfo,
} from '../types/exam';

interface DashboardViewProps {
  submissions: ExamSubmission[];
  questions: Question[];
  students: Student[];
  examConfig: ExamConfig;
  dbInfo: WorkspaceDatabaseInfo | null;
  isSyncing: boolean;
  onSyncNow: () => void;
  onSelectSubmission: (sub: ExamSubmission) => void;
  onDeleteSubmission: (sub: ExamSubmission) => void;
  onNavigateToExam: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  submissions,
  questions,
  students,
  examConfig,
  dbInfo,
  isSyncing,
  onSyncNow,
  onSelectSubmission,
  onDeleteSubmission,
  onNavigateToExam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'REMEDIAL'>('ALL');

  const classes = useMemo(() => {
    const set = new Set<string>(students.map((s) => s.className));
    submissions.forEach((s) => set.add(s.className));
    return ['ALL', ...Array.from(set)];
  }, [students, submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesClass = classFilter === 'ALL' || sub.className === classFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PASSED' && sub.passed) ||
        (statusFilter === 'REMEDIAL' && !sub.passed);
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        sub.studentName.toLowerCase().includes(q) ||
        sub.studentNisn.toLowerCase().includes(q) ||
        sub.id.toLowerCase().includes(q);
      return matchesClass && matchesStatus && matchesQuery;
    });
  }, [submissions, classFilter, statusFilter, searchQuery]);

  // Aggregate real-time statistics
  const stats = useMemo(() => {
    const count = filteredSubmissions.length;
    if (count === 0) {
      return {
        avgScore: 0,
        passRate: 0,
        passedCount: 0,
        remedialCount: 0,
        avgDurationMins: 0,
        highestScore: 0,
      };
    }
    const totalPct = filteredSubmissions.reduce((acc, s) => acc + s.percentage, 0);
    const passedCount = filteredSubmissions.filter((s) => s.passed).length;
    const totalDuration = filteredSubmissions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const highestScore = Math.max(...filteredSubmissions.map((s) => s.percentage));
    return {
      avgScore: Math.round((totalPct / count) * 10) / 10,
      passRate: Math.round((passedCount / count) * 100),
      passedCount,
      remedialCount: count - passedCount,
      avgDurationMins: Math.round(totalDuration / count / 60),
      highestScore,
    };
  }, [filteredSubmissions]);

  // Per-question item analysis (Daya Serap & Tingkat Ketepatan Butir Soal)
  const itemAnalysis = useMemo(() => {
    return questions.map((q, idx) => {
      let attempts = 0;
      let correct = 0;
      filteredSubmissions.forEach((sub) => {
        const d = sub.details.find((det) => det.questionId === q.id);
        if (d) {
          attempts += 1;
          if (d.isCorrect) correct += 1;
        }
      });
      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
      return {
        index: idx + 1,
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        points: q.points,
        attempts,
        correct,
        accuracy,
      };
    });
  }, [questions, filteredSubmissions]);

  // Score distribution buckets
  const distribution = useMemo(() => {
    const buckets = [
      { label: '85 – 100 (Sangat Baik / A)', count: 0, color: 'bg-emerald-600' },
      { label: '75 – 84 (Tuntas / B)', count: 0, color: 'bg-sky-600' },
      { label: '60 – 74 (Hampir Tuntas / C)', count: 0, color: 'bg-amber-500' },
      { label: '< 60 (Perlu Bimbingan / D-E)', count: 0, color: 'bg-red-600' },
    ];
    filteredSubmissions.forEach((s) => {
      if (s.percentage >= 85) buckets[0].count += 1;
      else if (s.percentage >= 75) buckets[1].count += 1;
      else if (s.percentage >= 60) buckets[2].count += 1;
      else buckets[3].count += 1;
    });
    return buckets;
  }, [filteredSubmissions]);

  const handleExportCsv = () => {
    const headers = [
      'ID_Sesi',
      'Waktu_Selesai',
      'NISN',
      'Nama_Siswa',
      'Kelas',
      'Skor_Poin',
      'Skor_Maksimal',
      'Nilai_Persen',
      'Predikat',
      'Status_Kelulusan',
      'Durasi_Detik',
    ];
    const rows = filteredSubmissions.map((s) => [
      s.id,
      s.submittedAt,
      s.studentNisn,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.className}"`,
      s.totalScore,
      s.maxScore,
      s.percentage,
      s.gradeLetter,
      s.passed ? 'LULUS' : 'REMEDIAL',
      s.durationSeconds,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Nilai_UjianOnline_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Contextual Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Pemantauan Real-Time</span>
            <span aria-hidden="true">·</span>
            <span>Ambang Batas Kelulusan (KKM): <strong className="font-mono tabular-nums">{examConfig.passingGrade}%</strong></span>
            <span aria-hidden="true">·</span>
            <span>Folder Drive: <strong className="font-mono">UjianOnline_Database</strong></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Dashboard Laporan Nilai & Analitik Siswa
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Evaluasi otomatis nilai ujian, distribusi penguasaan materi per topik, dan analisis daya serap tiap butir soal secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateToExam}
            className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 text-sky-700" />
            <span>Uji Coba Ruang Ujian</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-60 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Menyinkronkan ke Sheets...'
                : dbInfo
                ? 'Sinkronkan ke Google Sheets'
                : 'Hubungkan & Simpan ke Google Sheets'}
            </span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Rata-Rata Nilai Kelas</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900 font-mono tabular-nums">
              {stats.avgScore}%
            </span>
            <span className="text-xs text-slate-500">
              Tertinggi: <strong className="font-mono tabular-nums text-slate-800">{stats.highestScore}%</strong>
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Dari <span className="font-mono tabular-nums font-semibold text-slate-800">{filteredSubmissions.length}</span> partisipasi ujian terekam
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Tingkat Kelulusan (≥ {examConfig.passingGrade}%)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900 font-mono tabular-nums">
              {stats.passRate}%
            </span>
            <span
              className={`text-xs font-semibold ${
                stats.passRate >= 75 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {stats.passRate >= 75 ? '● NOMINAL' : '▲ PERLU EVALUASI'}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            <span className="font-mono tabular-nums text-emerald-700 font-semibold">{stats.passedCount}</span> Lulus ·{' '}
            <span className="font-mono tabular-nums text-amber-700 font-semibold">{stats.remedialCount}</span> Remedial
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Cakupan Partisipasi Siswa</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900 font-mono tabular-nums">
              {students.length}
            </span>
            <span className="text-xs text-slate-500">Siswa Terdaftar</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Rata-rata durasi pengerjaan: <strong className="font-mono tabular-nums text-slate-800">{stats.avgDurationMins} menit</strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Instrumen Bank Soal & Media</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900 font-mono tabular-nums">
              {questions.length}
            </span>
            <span className="text-xs text-slate-500">Butir Soal Aktif</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Total Skor Maksimal: <strong className="font-mono tabular-nums text-slate-800">{questions.reduce((a, b) => a + b.points, 0)} Poin</strong>
          </div>
        </div>
      </div>

      {/* Analytical Two-Column Section: Score Distribution & Item Difficulty Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Score Distribution */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              01. Distribusi Rentang Nilai Siswa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sebaran capaian nilai berdasarkan ambang ketuntasan minimum.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {distribution.map((b) => {
              const pct =
                filteredSubmissions.length > 0
                  ? Math.round((b.count / filteredSubmissions.length) * 100)
                  : 0;
              return (
                <div key={b.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{b.label}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      <strong>{b.count}</strong> siswa ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${b.color}`}
                      style={{ width: `${Math.max(pct, b.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {dbInfo && (
            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">
                  Tersimpan di <strong>{dbInfo.folderName}</strong>
                </span>
              </div>
              <a
                href={dbInfo.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 hover:underline font-semibold shrink-0 ml-2"
              >
                Buka Google Sheets →
              </a>
            </div>
          )}
        </div>

        {/* Right: Per-Question Item Analysis */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                02. Analisis Daya Serap Per Butir Soal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Persentase siswa yang menjawab benar pada setiap kompetensi soal.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {questions.length} Butir Soal
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Kode Soal</th>
                  <th className="py-2 px-3 font-semibold">Topik Kompetensi</th>
                  <th className="py-2 px-3 font-semibold">Tingkat</th>
                  <th className="py-2 px-3 font-semibold text-right">Bobot</th>
                  <th className="py-2 pl-3 font-semibold text-right">Ketepatan Siswa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemAnalysis.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-3 font-mono tabular-nums font-semibold text-slate-800">
                      #{item.index} · {item.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{item.topic}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.difficulty}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {item.points} pt
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2 w-full">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              item.accuracy >= 75
                                ? 'bg-emerald-600'
                                : item.accuracy >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${item.accuracy}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-slate-900 w-16 text-right">
                          {item.accuracy}% ({item.correct}/{item.attempts})
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Real-Time Student Submissions Table with Filters & Individual Analysis Trigger */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              03. Daftar Nilai & Analisis Hasil Setiap Siswa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik tombol <strong>Analisis Siswa</strong> pada baris mana pun untuk membuka rincian jawaban dan rekomendasi topik per individu.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau NISN..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-600 w-48"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-sky-600"
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'Semua Kelas' : c}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PASSED')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === 'PASSED'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lulus
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('REMEDIAL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === 'REMEDIAL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Remedial
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Waktu Pengumpulan</th>
                <th className="py-3 px-4 font-semibold">NISN</th>
                <th className="py-3 px-4 font-semibold">Nama Siswa</th>
                <th className="py-3 px-4 font-semibold">Kelas</th>
                <th className="py-3 px-4 font-semibold text-right">Ketepatan</th>
                <th className="py-3 px-4 font-semibold text-right">Durasi</th>
                <th className="py-3 px-4 font-semibold text-right">Nilai Akhir</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Tidak ada data hasil ujian yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const correctCount = sub.details.filter((d) => d.isCorrect).length;
                  const mins = Math.floor(sub.durationSeconds / 60);
                  const secs = sub.durationSeconds % 60;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {new Date(sub.submittedAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {sub.studentNisn}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {sub.studentName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {sub.className}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {correctCount}/{sub.details.length} Soal
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {mins}m {secs}d
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {sub.percentage}% ({sub.gradeLetter})
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            sub.passed ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {sub.passed ? '● LULUS' : '▲ REMEDIAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectSubmission(sub)}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Analisis Siswa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSubmission(sub)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Hapus Riwayat Nilai"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
