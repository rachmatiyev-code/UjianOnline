import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Question, QuestionType, DifficultyLevel, MediaType } from '../types/exam';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (newQuestions: Question[]) => void;
}

const SAMPLE_AIKEN_TEXT = `TOPIK: Biologi Genetika | POIN: 15 | LEVEL: Sedang
Kodon inisiasi universal pada proses translasi mRNA menjadi polipeptida di ribosom yang menyandi asam amino Metionin adalah...
A. AUG
B. UAA
C. UAG
D. UGA
ANSWER: A
PEMBAHASAN: Kodon AUG berfungsi sebagai kodon start (inisiasi) yang menyandi asam amino Metionin pada eukariota maupun prokariota.

TOPIK: Termodinamika Fisika | POIN: 20 | LEVEL: Sulit | MEDIA: formula | RUMUS: ΔU = Q - W   (Proses Isotermal: ΔT = 0 ⇒ ΔU = 0)
Suatu gas ideal mengalami ekspansi isotermal pada suhu tetap 300 K dan menyerap kalor Q sebesar 450 Joule. Berapakah usaha luar (W) yang dilakukan oleh gas tersebut?
A. 0 Joule
B. 225 Joule
C. 450 Joule
D. 900 Joule
ANSWER: C
PEMBAHASAN: Pada proses isotermal gas ideal, perubahan energi dalam ΔU = 0, sehingga usaha luar W sama dengan kalor yang diserap Q = 450 Joule.`;

const SAMPLE_CSV_TEXT = `Topik\tTipe\tKesulitan\tPoin\tPertanyaan\tOpsi_A\tOpsi_B\tOpsi_C\tOpsi_D\tKunci\tPembahasan
Elektromagnetisme\tmultiple_choice\tSedang\t15\tHukum yang menyatakan bahwa GGL induksi sebanding dengan laju perubahan fluks magnetik adalah...\tHukum Faraday\tHukum Coulomb\tHukum Ohm\tHukum Kirchoff\tA\tHukum induksi elektromagnetik Faraday merumuskan ε = -N dΦ/dt.
Stoikiometri Kimia\tshort_answer\tMudah\t15\tBerapakah massa molekul relatif (Mr) dari senyawa air (H2O) jika Ar H = 1 dan Ar O = 16? (Tuliskan angka saja)\t\t\t\t\t18\tMr H2O = (2 × 1) + 16 = 18 gram/mol.`;

const SAMPLE_JSON_TEXT = JSON.stringify(
  [
    {
      topic: 'Kalkulus Diferensial',
      type: 'multiple_choice',
      difficulty: 'Sedang',
      points: 15,
      mediaType: 'formula',
      formulaText: 'f(x) = 3x² - 12x + 7\nf\'(x) = lim(h→0) [f(x+h) - f(x)] / h',
      text: 'Tentukan nilai gradien garis singgung kurva f(x) = 3x² - 12x + 7 pada titik dengan absis x = 3!',
      options: [
        { id: 'A', label: '6' },
        { id: 'B', label: '9' },
        { id: 'C', label: '12' },
        { id: 'D', label: '18' },
      ],
      correctAnswers: ['A'],
      explanation: "Turunan pertama f'(x) = 6x - 12. Untuk x = 3, maka f'(3) = 6(3) - 12 = 18 - 12 = 6.",
    },
  ],
  null,
  2
);

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
}) => {
  const [mode, setMode] = useState<'aiken' | 'csv' | 'json'>('aiken');
  const [rawText, setRawText] = useState<string>(SAMPLE_AIKEN_TEXT);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleModeSwitch = (nextMode: 'aiken' | 'csv' | 'json') => {
    setMode(nextMode);
    setErrorMsg(null);
    if (nextMode === 'aiken') setRawText(SAMPLE_AIKEN_TEXT);
    if (nextMode === 'csv') setRawText(SAMPLE_CSV_TEXT);
    if (nextMode === 'json') setRawText(SAMPLE_JSON_TEXT);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawText(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  const parseQuestions = (): Question[] => {
    const now = Date.now();
    if (mode === 'json') {
      const parsed = JSON.parse(rawText);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item, idx) => ({
        id: `SOAL-IMP-${String(now).slice(-4)}-${idx + 1}`,
        topic: item.topic || 'Materi Umum',
        type: (item.type as QuestionType) || 'multiple_choice',
        difficulty: (item.difficulty as DifficultyLevel) || 'Sedang',
        points: Number(item.points) || 15,
        mediaType: (item.mediaType as MediaType) || 'none',
        mediaUrl: item.mediaUrl || undefined,
        formulaText: item.formulaText || undefined,
        mediaCaption: item.mediaCaption || undefined,
        text: item.text || 'Pertanyaan Impor',
        options: Array.isArray(item.options)
          ? item.options
          : [
              { id: 'A', label: 'Opsi A' },
              { id: 'B', label: 'Opsi B' },
            ],
        correctAnswers: Array.isArray(item.correctAnswers) ? item.correctAnswers : ['A'],
        explanation: item.explanation || 'Pembahasan otomatis.',
        createdAt: new Date().toISOString(),
      }));
    }

    if (mode === 'csv') {
      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        throw new Error('Format CSV/TSV minimal harus memiliki baris header dan 1 baris soal.');
      }
      const dataLines = lines.slice(1);
      return dataLines.map((line, idx) => {
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        const [
          topic = 'Umum',
          type = 'multiple_choice',
          difficulty = 'Sedang',
          points = '15',
          text = '',
          optA = '',
          optB = '',
          optC = '',
          optD = '',
          answer = 'A',
          explanation = '',
        ] = cols.map((c) => c.trim());

        const qType = (
          ['multiple_choice', 'checkboxes', 'true_false', 'short_answer'].includes(type)
            ? type
            : 'multiple_choice'
        ) as QuestionType;

        const options =
          qType === 'short_answer'
            ? []
            : [
                { id: 'A', label: optA || 'Pilihan A' },
                { id: 'B', label: optB || 'Pilihan B' },
                ...(optC ? [{ id: 'C', label: optC }] : []),
                ...(optD ? [{ id: 'D', label: optD }] : []),
              ];

        return {
          id: `SOAL-CSV-${String(now).slice(-4)}-${idx + 1}`,
          topic,
          type: qType,
          difficulty: (['Mudah', 'Sedang', 'Sulit'].includes(difficulty)
            ? difficulty
            : 'Sedang') as DifficultyLevel,
          points: Number(points) || 15,
          mediaType: 'none',
          text: text || `Soal Impor #${idx + 1}`,
          options,
          correctAnswers: answer
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean),
          explanation: explanation || 'Pembahasan soal impor.',
          createdAt: new Date().toISOString(),
        };
      });
    }

    // Aiken / Google Forms Text Format
    const blocks = rawText
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    return blocks.map((block, idx) => {
      const lines = block.split(/\r?\n/).map((l) => l.trim());
      let topic = 'Sains Terpadu';
      let points = 15;
      let difficulty: DifficultyLevel = 'Sedang';
      let mediaType: MediaType = 'none';
      let formulaText: string | undefined;
      let questionLines: string[] = [];
      const options: { id: string; label: string }[] = [];
      let correctAnswers: string[] = ['A'];
      let explanation = 'Pembahasan terverifikasi.';

      for (const line of lines) {
        if (line.toUpperCase().startsWith('TOPIK:')) {
          const parts = line.split('|').map((p) => p.trim());
          parts.forEach((p) => {
            const [k, ...rest] = p.split(':');
            const val = rest.join(':').trim();
            if (k.toUpperCase() === 'TOPIK') topic = val;
            if (k.toUpperCase() === 'POIN') points = Number(val) || 15;
            if (k.toUpperCase() === 'LEVEL' && ['Mudah', 'Sedang', 'Sulit'].includes(val)) {
              difficulty = val as DifficultyLevel;
            }
            if (k.toUpperCase() === 'MEDIA' && val === 'formula') {
              mediaType = 'formula';
            }
            if (k.toUpperCase() === 'RUMUS') {
              formulaText = val;
            }
          });
        } else if (/^[A-E][.)]\s+/.test(line)) {
          const optId = line[0].toUpperCase();
          const label = line.replace(/^[A-E][.)]\s+/, '').trim();
          options.push({ id: optId, label });
        } else if (line.toUpperCase().startsWith('ANSWER:')) {
          const ansRaw = line.replace(/^ANSWER:\s*/i, '').trim();
          correctAnswers = ansRaw.split(',').map((a) => a.trim().toUpperCase());
        } else if (line.toUpperCase().startsWith('PEMBAHASAN:')) {
          explanation = line.replace(/^PEMBAHASAN:\s*/i, '').trim();
        } else {
          questionLines.push(line);
        }
      }

      return {
        id: `SOAL-AIK-${String(now).slice(-4)}-${idx + 1}`,
        topic,
        type: correctAnswers.length > 1 ? 'checkboxes' : 'multiple_choice',
        difficulty,
        points,
        mediaType,
        formulaText,
        text: questionLines.join(' ') || `Soal Impor #${idx + 1}`,
        options:
          options.length > 0
            ? options
            : [
                { id: 'A', label: 'Opsi A' },
                { id: 'B', label: 'Opsi B' },
              ],
        correctAnswers,
        explanation,
        createdAt: new Date().toISOString(),
      };
    });
  };

  const handleImportSubmit = () => {
    try {
      const imported = parseQuestions();
      if (imported.length === 0) {
        setErrorMsg('Tidak ditemukan butir soal yang valid untuk diimpor.');
        return;
      }
      onImportQuestions(imported);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengurai format teks soal. Periksa kembali sintaks.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Impor Bank Soal Multi-Format
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Impor butir soal sekaligus melalui format Teks Cepat (Aiken), Spreadsheet CSV/TSV, atau JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleModeSwitch('aiken')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'aiken'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Teks Cepat (Aiken / Forms)
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('csv')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'csv'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Spreadsheet (TSV / CSV)
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('json')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'json'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Format JSON
            </button>
          </div>

          <label className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Berkas (.txt / .csv / .json)</span>
            <input
              type="file"
              accept=".txt,.csv,.tsv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Editor Konten Impor (Dapat diedit langsung sebelum diimpor)</span>
            </span>
            <button
              type="button"
              onClick={() => handleModeSwitch(mode)}
              className="text-sky-700 hover:underline font-medium"
            >
              Muat Ulang Contoh Template
            </button>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setErrorMsg(null);
            }}
            rows={11}
            className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-600 leading-relaxed"
            placeholder="Tempelkan daftar soal di sini..."
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Mendukung deteksi otomatis kunci jawaban, bobot poin, rumus, dan pembahasan.
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Proses & Impor ke Bank Soal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
