import React from 'react';
import { X, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { ExamSubmission, Question } from '../types/exam';

interface StudentAnalysisModalProps {
  submission: ExamSubmission | null;
  allStudentSubmissions: ExamSubmission[];
  questionsMap: Record<string, Question>;
  onClose: () => void;
}

export const StudentAnalysisModal: React.FC<StudentAnalysisModalProps> = ({
  submission,
  allStudentSubmissions,
  questionsMap,
  onClose,
}) => {
  if (!submission) return null;

  // Compute topic mastery breakdown
  const topicStats: Record<
    string,
    { earned: number; max: number; correct: number; total: number }
  > = {};

  submission.details.forEach((d) => {
    if (!topicStats[d.topic]) {
      topicStats[d.topic] = { earned: 0, max: 0, correct: 0, total: 0 };
    }
    topicStats[d.topic].earned += d.earnedPoints;
    topicStats[d.topic].max += d.maxPoints;
    topicStats[d.topic].total += 1;
    if (d.isCorrect) topicStats[d.topic].correct += 1;
  });

  const topicEntries = Object.entries(topicStats).map(([topic, stat]) => {
    const pct = stat.max > 0 ? Math.round((stat.earned / stat.max) * 100) : 0;
    return { topic, ...stat, pct };
  });

  const strengths = topicEntries.filter((t) => t.pct >= 75).map((t) => t.topic);
  const weaknesses = topicEntries.filter((t) => t.pct < 75).map((t) => t.topic);

  const mins = Math.floor(submission.durationSeconds / 60);
  const secs = submission.durationSeconds % 60;

  const formatOptionAnswer = (qId: string, ansList: string[]) => {
    const q = questionsMap[qId];
    if (!q || q.options.length === 0) return ansList.join(', ') || '(Tidak dijawab)';
    return ansList
      .map((a) => {
        const found = q.options.find((o) => o.id === a);
        return found ? `${found.id}. ${found.label}` : a;
      })
      .join(' | ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Laporan Diagnostik Individu</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{submission.id}</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(submission.submittedAt).toLocaleString('id-ID')}</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mt-0.5">
              {submission.studentName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
              <span>NISN: <strong className="font-mono tabular-nums">{submission.studentNisn}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Kelas: <strong>{submission.className}</strong></span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-semibold ${
                  submission.passed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {submission.passed ? '● LULUS KOMPETENSI' : '▲ PERLU REMEDIAL'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              aria-label="Tutup analisis"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Nilai Akhir & Predikat</div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1">
                {submission.percentage}% <span className="text-base font-sans text-slate-600">({submission.gradeLetter})</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Skor Poin Perolehan</div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1">
                {submission.totalScore} <span className="text-sm text-slate-400">/ {submission.maxScore}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Ketepatan Jawaban</div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1">
                {submission.details.filter((d) => d.isCorrect).length}{' '}
                <span className="text-sm text-slate-400">/ {submission.details.length} Soal</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Durasi Pengerjaan</div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-1">
                {mins}m {secs}d
              </div>
            </div>
          </div>

          {/* Topic Mastery & Pedagogical Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 border-b border-slate-200">
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                01. Peta Penguasaan Kompetensi per Topik
              </h3>
              <div className="space-y-3">
                {topicEntries.map((item) => (
                  <div key={item.topic} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{item.topic}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {item.earned}/{item.max} pt · <strong>{item.pct}%</strong>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.pct >= 75
                            ? 'bg-emerald-600'
                            : item.pct >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.max(item.pct, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                02. Sintesis Evaluasi Otomatis
              </h3>
              <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-slate-900">Kompetensi Kuat:</strong>{' '}
                  {strengths.length > 0
                    ? strengths.join(', ')
                    : 'Belum ada topik yang melampaui ambang batas 75%.'}
                </p>
                <p>
                  <strong className="text-slate-900">Area Penguatan / Remedial:</strong>{' '}
                  {weaknesses.length > 0
                    ? weaknesses.join(', ')
                    : 'Seluruh topik telah dikuasai dengan sangat baik.'}
                </p>
                <p className="pt-1 border-t border-slate-200 text-slate-500">
                  Sistem Pengacakan:{' '}
                  {submission.randomizedQuestions
                    ? 'Soal & urutan opsi diacak secara unik pada sesi ini.'
                    : 'Urutan soal standar.'}
                </p>
              </div>
            </div>
          </div>

          {/* Participation History of this Student */}
          {allStudentSubmissions.length > 0 && (
            <div className="pb-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                03. Riwayat Lengkap Partisipasi Siswa ({allStudentSubmissions.length} Sesi)
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">ID Sesi</th>
                      <th className="py-2.5 px-3 font-semibold">Waktu Selesai</th>
                      <th className="py-2.5 px-3 font-semibold">Paket Ujian</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Durasi</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Nilai (%)</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allStudentSubmissions.map((hist) => (
                      <tr
                        key={hist.id}
                        className={
                          hist.id === submission.id ? 'bg-sky-50/60 font-medium' : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-700">
                          {hist.id}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-600">
                          {new Date(hist.submittedAt).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{hist.examTitle}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                          {Math.floor(hist.durationSeconds / 60)}m {hist.durationSeconds % 60}d
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {hist.percentage}% ({hist.gradeLetter})
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={
                              hist.passed ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'
                            }
                          >
                            {hist.passed ? '● LULUS' : '▲ REMEDIAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Item-by-Item Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              04. Analisis Jawaban & Pembahasan Per Butir Soal
            </h3>
            <div className="space-y-4">
              {submission.details.map((detail, idx) => (
                <div
                  key={detail.questionId}
                  className="p-4 border border-slate-200 rounded-lg bg-white space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-mono font-semibold text-slate-800">
                        Soal #{idx + 1} ({detail.questionId})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{detail.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {detail.isCorrect ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>BENAR</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>KURANG TEPAT</span>
                        </span>
                      )}
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        +{detail.earnedPoints} / {detail.maxPoints} Poin
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-900 font-medium leading-relaxed">
                    {detail.questionText}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <div className="text-slate-500 mb-0.5">Jawaban Siswa:</div>
                      <div
                        className={`font-medium ${
                          detail.isCorrect ? 'text-emerald-800' : 'text-red-700'
                        }`}
                      >
                        {formatOptionAnswer(detail.questionId, detail.studentAnswers)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <div className="text-slate-500 mb-0.5">Kunci Jawaban Benar:</div>
                      <div className="font-medium text-slate-900">
                        {formatOptionAnswer(detail.questionId, detail.correctAnswers)}
                      </div>
                    </div>
                  </div>

                  {detail.explanation && (
                    <div className="pt-2 text-xs text-slate-600 border-t border-slate-100 leading-relaxed">
                      <strong className="text-slate-800">Pembahasan:</strong> {detail.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
