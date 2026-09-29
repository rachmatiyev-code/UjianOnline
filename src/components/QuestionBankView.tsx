import React, { useState, useMemo } from 'react';
import {
  Plus,
  Upload,
  Trash2,
  Edit3,
  Copy,
  CheckSquare,
  Square,
  Search,
  Shuffle,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Question,
  QuestionType,
  MediaType,
  DifficultyLevel,
  ExamConfig,
} from '../types/exam';
import { MediaRenderer } from './MediaRenderer';
import diagramSelBiologi from '../assets/images/diagram_sel_biologi_1790692867331.jpg';
import grafikFisikaKinematika from '../assets/images/grafik_fisika_kinematika_1790692882983.jpg';

interface QuestionBankViewProps {
  questions: Question[];
  examConfig: ExamConfig;
  onUpdateExamConfig: (next: ExamConfig) => void;
  onAddQuestion: (q: Question) => void;
  onUpdateQuestion: (q: Question) => void;
  onDeleteQuestions: (ids: string[]) => void;
  onBulkUpdateQuestions: (
    ids: string[],
    patch: Partial<Pick<Question, 'topic' | 'difficulty' | 'points'>>
  ) => void;
  onOpenImportModal: () => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  questions,
  examConfig,
  onUpdateExamConfig,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestions,
  onBulkUpdateQuestions,
  onOpenImportModal,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('ALL');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Bulk edit state
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkDifficulty, setBulkDifficulty] = useState<DifficultyLevel | ''>('');
  const [bulkPoints, setBulkPoints] = useState<string>('');
  const [showBulkEditPanel, setShowBulkEditPanel] = useState(false);

  const topics = useMemo(() => {
    const s = new Set<string>(questions.map((q) => q.topic));
    return ['ALL', ...Array.from(s)];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchTopic = topicFilter === 'ALL' || q.topic === topicFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        q.text.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.id.toLowerCase().includes(query);
      return matchTopic && matchSearch;
    });
  }, [questions, topicFilter, searchQuery]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  const handleOpenCreate = () => {
    const blank: Question = {
      id: `SOAL-${String(Date.now()).slice(-4)}`,
      topic: 'Biologi Seluler',
      type: 'multiple_choice',
      text: '',
      mediaType: 'none',
      options: [
        { id: 'A', label: 'Pilihan Jawaban A' },
        { id: 'B', label: 'Pilihan Jawaban B' },
        { id: 'C', label: 'Pilihan Jawaban C' },
        { id: 'D', label: 'Pilihan Jawaban D' },
      ],
      correctAnswers: ['A'],
      points: 15,
      difficulty: 'Sedang',
      explanation: '',
      createdAt: new Date().toISOString(),
    };
    setEditingQuestion(blank);
    setIsCreatingNew(true);
  };

  const handleDuplicate = (q: Question) => {
    const copy: Question = {
      ...q,
      id: `${q.id}-SALINAN-${String(Date.now()).slice(-2)}`,
      text: `${q.text} (Salinan)`,
      createdAt: new Date().toISOString(),
    };
    onAddQuestion(copy);
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.text.trim()) return;
    if (isCreatingNew) {
      onAddQuestion(editingQuestion);
    } else {
      onUpdateQuestion(editingQuestion);
    }
    setEditingQuestion(null);
    setIsCreatingNew(false);
  };

  const handleApplyBulkUpdate = () => {
    const patch: Partial<Pick<Question, 'topic' | 'difficulty' | 'points'>> = {};
    if (bulkTopic.trim()) patch.topic = bulkTopic.trim();
    if (bulkDifficulty) patch.difficulty = bulkDifficulty;
    if (bulkPoints && Number(bulkPoints) > 0) patch.points = Number(bulkPoints);

    if (Object.keys(patch).length > 0 && selectedIds.length > 0) {
      onBulkUpdateQuestions(selectedIds, patch);
      setShowBulkEditPanel(false);
      setBulkTopic('');
      setBulkDifficulty('');
      setBulkPoints('');
      setSelectedIds([]);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingQuestion) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingQuestion({
          ...editingQuestion,
          mediaType: 'image',
          mediaUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Exam Form Settings Card */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Manajemen Instrumen Soal</span>
            <span aria-hidden="true">·</span>
            <span>Total Bobot: <strong className="font-mono tabular-nums">{questions.reduce((a, b) => a + b.points, 0)} Poin</strong></span>
            <span aria-hidden="true">·</span>
            <span>Mendukung Gambar, Audio, Video Simulasi & Rumus</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Bank Soal & Konfigurasi Pengacakan
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Pilih, edit, hapus, atau impor butir soal dengan dukungan multi-media dan pengaturan pengacakan otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor Soal (CSV / Aiken / JSON)</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Butir Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Form Configuration & Randomization Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Judul Paket Formulir Ujian Aktif
          </label>
          <input
            type="text"
            value={examConfig.title}
            onChange={(e) =>
              onUpdateExamConfig({ ...examConfig, title: e.target.value })
            }
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ambang Lulus (%)
          </label>
          <input
            type="number"
            min={10}
            max={100}
            value={examConfig.passingGrade}
            onChange={(e) =>
              onUpdateExamConfig({
                ...examConfig,
                passingGrade: Number(e.target.value) || 75,
              })
            }
            className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Durasi (Menit)
          </label>
          <input
            type="number"
            min={5}
            max={180}
            value={examConfig.durationMinutes}
            onChange={(e) =>
              onUpdateExamConfig({
                ...examConfig,
                durationMinutes: Number(e.target.value) || 40,
              })
            }
            className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
          />
        </div>

        <div className="md:col-span-3 flex flex-col gap-2 pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={examConfig.randomizeQuestions}
              onChange={(e) =>
                onUpdateExamConfig({
                  ...examConfig,
                  randomizeQuestions: e.target.checked,
                })
              }
              className="rounded text-sky-700 focus:ring-sky-600"
            />
            <span className="flex items-center gap-1 font-medium">
              <Shuffle className="w-3.5 h-3.5 text-sky-700" />
              Acak Urutan Soal
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={examConfig.randomizeOptions}
              onChange={(e) =>
                onUpdateExamConfig({
                  ...examConfig,
                  randomizeOptions: e.target.checked,
                })
              }
              className="rounded text-sky-700 focus:ring-sky-600"
            />
            <span className="font-medium">Acak Urutan Opsi Jawaban</span>
          </label>
        </div>
      </div>

      {/* Filter & Multi-Select Toolbar (Pilih, Edit, Hapus) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {selectedIds.length === filteredQuestions.length &&
              filteredQuestions.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-sky-700" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>
                {selectedIds.length > 0
                  ? `${selectedIds.length} Soal Dipilih`
                  : 'Pilih Semua Soal'}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkEditPanel((prev) => !prev)}
                  className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Massal ({selectedIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteQuestions(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2"
                >
                  Batal Pilih
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari teks atau kode soal..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-600 w-52"
              />
            </div>

            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-sky-600"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'Semua Topik Kompetensi' : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Edit Panel when triggered */}
        {showBulkEditPanel && selectedIds.length > 0 && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Ubah Topik Kompetensi
              </label>
              <input
                type="text"
                value={bulkTopic}
                onChange={(e) => setBulkTopic(e.target.value)}
                placeholder="Kosongkan jika tetap"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Ubah Tingkat Kesulitan
              </label>
              <select
                value={bulkDifficulty}
                onChange={(e) =>
                  setBulkDifficulty(e.target.value as DifficultyLevel | '')
                }
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="">-- Tidak Diubah --</option>
                <option value="Mudah">Mudah</option>
                <option value="Sedang">Sedang</option>
                <option value="Sulit">Sulit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Ubah Bobot Poin
              </label>
              <input
                type="number"
                value={bulkPoints}
                onChange={(e) => setBulkPoints(e.target.value)}
                placeholder="Contoh: 20"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyBulkUpdate}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Terapkan Perubahan
              </button>
              <button
                type="button"
                onClick={() => setShowBulkEditPanel(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, index) => {
          const isSelected = selectedIds.includes(q.id);
          return (
            <div
              key={q.id}
              className={`bg-white border rounded-xl p-5 transition-colors ${
                isSelected ? 'border-sky-600 bg-sky-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelectOne(q.id)}
                    className="mt-0.5 text-slate-500 hover:text-sky-700"
                    aria-label={`Pilih soal ${q.id}`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-700" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-900">
                        #{index + 1} · {q.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{q.topic}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {q.type === 'multiple_choice'
                          ? 'Pilihan Ganda'
                          : q.type === 'checkboxes'
                          ? 'Kotak Centang Jamak'
                          : q.type === 'true_false'
                          ? 'Benar / Salah'
                          : 'Isian Singkat'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Tingkat {q.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {q.points} Poin
                      </span>
                      {q.mediaType !== 'none' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-700 font-medium">
                            Media: {q.mediaType.toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-900 mt-2 leading-relaxed">
                      {q.text}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestion({ ...q });
                      setIsCreatingNew(false);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(q)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Duplikat Soal"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestions([q.id])}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pl-7 mt-3 space-y-3">
                <MediaRenderer question={q} />

                {q.options.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt) => {
                      const isCorrect = q.correctAnswers.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border ${
                            isCorrect
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="font-mono font-semibold mr-1.5">
                            {opt.id}.
                          </span>
                          {opt.label}
                          {isCorrect && (
                            <span className="ml-2 text-emerald-700 font-semibold">
                              (✓ Kunci)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950">
                    <strong>Kunci Jawaban Isian Singkat:</strong>{' '}
                    <span className="font-mono">{q.correctAnswers.join(' / ')}</span>
                  </div>
                )}

                {q.explanation && (
                  <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <strong className="text-slate-800">Pembahasan:</strong>{' '}
                    {q.explanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Editor Soal (Tambah / Edit) */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEditor}
            className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isCreatingNew
                    ? 'Buat Butir Soal Baru'
                    : `Edit Butir Soal · ${editingQuestion.id}`}
                </h2>
                <p className="text-xs text-slate-500">
                  Konfigurasikan pertanyaan, format media, opsi pilihan, kunci jawaban otomatis, dan pembahasan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Topik / Kompetensi Materi *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingQuestion.topic}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, topic: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe Pertanyaan
                  </label>
                  <select
                    value={editingQuestion.type}
                    onChange={(e) => {
                      const nextType = e.target.value as QuestionType;
                      let nextOptions = editingQuestion.options;
                      let nextCorrect = editingQuestion.correctAnswers;
                      if (nextType === 'true_false') {
                        nextOptions = [
                          { id: 'TRUE', label: 'Benar' },
                          { id: 'FALSE', label: 'Salah' },
                        ];
                        nextCorrect = ['TRUE'];
                      } else if (nextType === 'short_answer') {
                        nextOptions = [];
                        nextCorrect = [''];
                      } else if (nextOptions.length === 0 || nextOptions[0]?.id === 'TRUE') {
                        nextOptions = [
                          { id: 'A', label: 'Pilihan A' },
                          { id: 'B', label: 'Pilihan B' },
                          { id: 'C', label: 'Pilihan C' },
                          { id: 'D', label: 'Pilihan D' },
                        ];
                        nextCorrect = ['A'];
                      }
                      setEditingQuestion({
                        ...editingQuestion,
                        type: nextType,
                        options: nextOptions,
                        correctAnswers: nextCorrect,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="checkboxes">Kotak Centang Jamak</option>
                    <option value="true_false">Benar / Salah</option>
                    <option value="short_answer">Isian Singkat</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Level
                    </label>
                    <select
                      value={editingQuestion.difficulty}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          difficulty: e.target.value as DifficultyLevel,
                        })
                      }
                      className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    >
                      <option value="Mudah">Mudah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Sulit">Sulit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Poin
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={editingQuestion.points}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          points: Number(e.target.value) || 10,
                        })
                      }
                      className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teks Pertanyaan Soal *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingQuestion.text}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, text: e.target.value })
                  }
                  placeholder="Tuliskan redaksi soal secara jelas..."
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {/* Media Attachment Controls */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800">
                    Format Media Pendukung Soal
                  </label>
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
                    {(['none', 'image', 'formula', 'audio', 'video'] as MediaType[]).map(
                      (m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() =>
                            setEditingQuestion({ ...editingQuestion, mediaType: m })
                          }
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            editingQuestion.mediaType === m
                              ? 'bg-sky-700 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {m === 'none'
                            ? 'Tanpa Media'
                            : m === 'image'
                            ? 'Gambar / Diagram'
                            : m === 'formula'
                            ? 'Rumus / Kode'
                            : m === 'audio'
                            ? 'Audio Sinyal'
                            : 'Video Simulasi'}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {editingQuestion.mediaType === 'image' && (
                  <div className="space-y-2 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingQuestion({
                            ...editingQuestion,
                            mediaUrl: diagramSelBiologi,
                            mediaCaption:
                              'Diagram struktur organel sel eukariotik (Pustaka Sains).',
                          })
                        }
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700"
                      >
                        Gunakan Gambar Biologi Sel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingQuestion({
                            ...editingQuestion,
                            mediaUrl: grafikFisikaKinematika,
                            mediaCaption:
                              'Grafik Kecepatan terhadap Waktu v(t) Kinematika.',
                          })
                        }
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700"
                      >
                        Gunakan Grafik Kinematika Fisika
                      </button>
                      <label className="px-2.5 py-1 text-xs bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-800 rounded cursor-pointer flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Unggah Gambar dari Komputer</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={editingQuestion.mediaCaption || ''}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          mediaCaption: e.target.value,
                        })
                      }
                      placeholder="Keterangan / Caption Gambar..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded"
                    />
                  </div>
                )}

                {editingQuestion.mediaType === 'formula' && (
                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={3}
                      value={editingQuestion.formulaText || ''}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          formulaText: e.target.value,
                        })
                      }
                      placeholder="Ketik rumus matematika, reaksi kimia, atau potongan algoritma..."
                      className="w-full p-2.5 text-xs font-mono bg-slate-900 text-slate-100 rounded-lg"
                    />
                  </div>
                )}

                {editingQuestion.mediaType === 'audio' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Frekuensi Sinyal Audio (Hz)
                      </label>
                      <input
                        type="number"
                        min={100}
                        max={2000}
                        value={editingQuestion.audioFreq || 440}
                        onChange={(e) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            audioFreq: Number(e.target.value) || 440,
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Keterangan Audio
                      </label>
                      <input
                        type="text"
                        value={editingQuestion.mediaCaption || ''}
                        onChange={(e) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            mediaCaption: e.target.value,
                          })
                        }
                        placeholder="Deskripsi sampel bunyi..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Options & Correct Answer Key Editor */}
              {editingQuestion.type === 'short_answer' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kunci Jawaban Isian Singkat (Pisahkan dengan koma jika ada beberapa variasi yang diterima)
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.correctAnswers.join(', ')}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        correctAnswers: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Contoh: 15, lima belas"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Opsi Pilihan & Tandai Kunci Jawaban Benar
                    </label>
                    {editingQuestion.type !== 'true_false' &&
                      editingQuestion.options.length < 5 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextLetter = String.fromCharCode(
                              65 + editingQuestion.options.length
                            );
                            setEditingQuestion({
                              ...editingQuestion,
                              options: [
                                ...editingQuestion.options,
                                { id: nextLetter, label: `Opsi ${nextLetter}` },
                              ],
                            });
                          }}
                          className="text-xs text-sky-700 font-semibold hover:underline"
                        >
                          + Tambah Opsi
                        </button>
                      )}
                  </div>

                  {editingQuestion.options.map((opt, idx) => {
                    const isKey = editingQuestion.correctAnswers.includes(opt.id);
                    return (
                      <div key={opt.id} className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (editingQuestion.type === 'checkboxes') {
                              const next = isKey
                                ? editingQuestion.correctAnswers.filter(
                                    (k) => k !== opt.id
                                  )
                                : [...editingQuestion.correctAnswers, opt.id];
                              setEditingQuestion({
                                ...editingQuestion,
                                correctAnswers: next.length > 0 ? next : [opt.id],
                              });
                            } else {
                              setEditingQuestion({
                                ...editingQuestion,
                                correctAnswers: [opt.id],
                              });
                            }
                          }}
                          className={`px-2.5 py-2 rounded-lg text-xs font-mono font-semibold border transition-colors shrink-0 ${
                            isKey
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {opt.id} {isKey ? '✓ Kunci' : ''}
                        </button>
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => {
                            const updated = [...editingQuestion.options];
                            updated[idx] = { ...opt, label: e.target.value };
                            setEditingQuestion({
                              ...editingQuestion,
                              options: updated,
                            });
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pembahasan & Penjelasan Analisis Hasil Siswa
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      explanation: e.target.value,
                    })
                  }
                  placeholder="Jelaskan langkah penyelesaian soal untuk umpan balik otomatis kepada siswa..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
              >
                Simpan Butir Soal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
