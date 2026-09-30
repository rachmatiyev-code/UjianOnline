import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckSquare,
  Square,
  Edit3,
  Trash2,
  Eye,
  X,
  History,
  CloudDownload,
  Users,
} from 'lucide-react';
import { Student, ExamSubmission } from '../types/exam';
import { DatabaseTabName } from '../services/workspaceService';

interface StudentManagerViewProps {
  students: Student[];
  submissions: ExamSubmission[];
  isFetchingTab: DatabaseTabName | 'ALL' | null;
  onFetchFromDatabase: (tab: DatabaseTabName | 'ALL') => void;
  onAddStudent: (student: Student) => void;
  onBulkAddStudents: (newStudents: Student[], replaceExisting?: boolean) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudents: (ids: string[]) => void;
  onBulkUpdateStudents: (
    ids: string[],
    patch: Partial<Pick<Student, 'className' | 'status'>>
  ) => void;
  onInspectSubmission: (sub: ExamSubmission) => void;
}

export const StudentManagerView: React.FC<StudentManagerViewProps> = ({
  students,
  submissions,
  isFetchingTab,
  onFetchFromDatabase,
  onAddStudent,
  onBulkAddStudents,
  onUpdateStudent,
  onDeleteStudents,
  onBulkUpdateStudents,
  onInspectSubmission,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

  // Bulk Add Students Modal State
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');
  const [bulkDefaultClass, setBulkDefaultClass] = useState('XII MIPA 1');
  const [bulkDefaultStatus, setBulkDefaultStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [replaceExistingOnBulk, setReplaceExistingOnBulk] = useState(false);

  // Bulk edit controls
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkClassName, setBulkClassName] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'Aktif' | 'Nonaktif' | ''>('');

  const classes = useMemo(() => {
    const s = new Set<string>(students.map((st) => st.className));
    return ['ALL', ...Array.from(s)];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchClass = classFilter === 'ALL' || st.className === classFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.nisn.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        st.id.toLowerCase().includes(q);
      return matchClass && matchQuery;
    });
  }, [students, classFilter, searchQuery]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedIds.length === filteredStudents.length &&
      filteredStudents.length > 0
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleOpenCreate = () => {
    setEditingStudent({
      id: `SIS-${String(Date.now()).slice(-4)}`,
      nisn: `008${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: '',
      className: 'XII MIPA 1',
      email: '',
      status: 'Aktif',
      joinedAt: new Date().toISOString().slice(0, 10),
    });
    setIsCreatingNew(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.name.trim()) return;
    const normalized: Student = {
      ...editingStudent,
      email:
        editingStudent.email.trim() ||
        `${editingStudent.name.toLowerCase().replace(/\s+/g, '.')}@sekolah.sch.id`,
    };
    if (isCreatingNew) {
      onAddStudent(normalized);
    } else {
      onUpdateStudent(normalized);
    }
    setEditingStudent(null);
    setIsCreatingNew(false);
  };

  const handleApplyBulkUpdate = () => {
    const patch: Partial<Pick<Student, 'className' | 'status'>> = {};
    if (bulkClassName.trim()) patch.className = bulkClassName.trim();
    if (bulkStatus) patch.status = bulkStatus;

    if (Object.keys(patch).length > 0 && selectedIds.length > 0) {
      onBulkUpdateStudents(selectedIds, patch);
      setShowBulkPanel(false);
      setBulkClassName('');
      setBulkStatus('');
      setSelectedIds([]);
    }
  };

  const getStudentSubmissions = (st: Student) => {
    return submissions.filter(
      (s) => s.studentId === st.id || s.studentNisn === st.nisn
    );
  };

  // Parse bulk student lines in real-time (supports "Nama", "No. Nama", "NISN, Nama, Kelas", or Tab-separated from Excel/Sheets)
  const parsedBulkStudents = useMemo<Student[]>(() => {
    const lines = bulkNamesText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const today = new Date().toISOString().slice(0, 10);
    const baseStamp = String(Date.now()).slice(-4);

    return lines
      .map((line, idx): Student | null => {
        // Strip leading numbering like "1. ", "1) ", "01 - " if it's followed by a name
        const cleanedLine = line.replace(/^\d{1,3}[\.\)\-]\s+/, '').trim();
        if (!cleanedLine) return null;

        const parts = cleanedLine
          .split(/\t|\||;|,/)
          .map((p) => p.trim())
          .filter(Boolean);

        let nisn = '';
        let name = '';
        let className = bulkDefaultClass.trim() || 'XII MIPA 1';
        let email = '';

        if (parts.length === 1) {
          name = parts[0];
        } else if (parts.length === 2) {
          if (/^\d{4,}$/.test(parts[0])) {
            nisn = parts[0];
            name = parts[1];
          } else {
            name = parts[0];
            className = parts[1] || className;
          }
        } else if (parts.length >= 3) {
          if (/^\d{4,}$/.test(parts[0])) {
            nisn = parts[0];
            name = parts[1];
            className = parts[2] || className;
            email = parts[3] || '';
          } else if (/^\d{4,}$/.test(parts[1])) {
            nisn = parts[1];
            name = parts[2];
            className = parts[3] || className;
          } else {
            name = parts[0];
            className = parts[1] || className;
            email = parts[2] || '';
          }
        }

        if (
          !name ||
          name.toLowerCase() === 'nama' ||
          name.toLowerCase() === 'nama siswa' ||
          name.toLowerCase() === 'nama lengkap'
        ) {
          return null;
        }

        const generatedNisn =
          nisn || `0085${baseStamp}${String(idx + 1).padStart(2, '0')}`;
        const generatedEmail =
          email ||
          `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@sekolah.sch.id`;

        return {
          id: `SIS-${baseStamp}-${String(idx + 1).padStart(2, '0')}`,
          nisn: generatedNisn,
          name,
          className,
          email: generatedEmail,
          status: bulkDefaultStatus,
          joinedAt: today,
        };
      })
      .filter((s): s is Student => s !== null);
  }, [bulkNamesText, bulkDefaultClass, bulkDefaultStatus]);

  const handleConfirmBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBulkStudents.length === 0) return;
    onBulkAddStudents(parsedBulkStudents, replaceExistingOnBulk);
    setBulkNamesText('');
    setReplaceExistingOnBulk(false);
    setIsBulkAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Database Induk Peserta</span>
            <span aria-hidden="true">·</span>
            <span>Terdaftar: <strong className="font-mono tabular-nums">{students.length} Siswa</strong></span>
            <span aria-hidden="true">·</span>
            <span>Tersinkronisasi dengan Tab <strong className="font-mono">Data_Siswa</strong> & <strong className="font-mono">Riwayat_Partisipasi</strong></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
            Manajemen Data Siswa & Riwayat Partisipasi
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Pilih, edit, atau hapus data siswa secara fleksibel serta pantau riwayat lengkap partisipasi dan perkembangan nilai setiap murid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => onFetchFromDatabase('Data_Siswa')}
            disabled={isFetchingTab !== null}
            className="px-3.5 py-2 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <CloudDownload
              className={`w-3.5 h-3.5 text-sky-700 ${
                isFetchingTab === 'Data_Siswa' ? 'animate-bounce' : ''
              }`}
            />
            <span>
              {isFetchingTab === 'Data_Siswa'
                ? 'Mengambil...'
                : 'Ambil Data Siswa dari DB'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFetchFromDatabase('Riwayat_Partisipasi')}
            disabled={isFetchingTab !== null}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <CloudDownload
              className={`w-3.5 h-3.5 text-emerald-700 ${
                isFetchingTab === 'Riwayat_Partisipasi' ? 'animate-bounce' : ''
              }`}
            />
            <span>Ambil Riwayat Partisipasi</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkAddOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 text-amber-800" />
            <span>Input Nama Siswa Bulk</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Satuan</span>
          </button>
        </div>
      </div>

      {/* Multi-Select & Filter Bar (Pilih, Edit, Hapus) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {selectedIds.length === filteredStudents.length &&
              filteredStudents.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-sky-700" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>
                {selectedIds.length > 0
                  ? `${selectedIds.length} Siswa Dipilih`
                  : 'Pilih Semua Siswa'}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPanel((prev) => !prev)}
                  className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Kelas / Status Massal ({selectedIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteStudents(selectedIds);
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
                placeholder="Cari nama, NISN, atau email..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-600 w-56"
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
          </div>
        </div>

        {/* Bulk Edit Panel */}
        {showBulkPanel && selectedIds.length > 0 && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Pindahkan ke Kelas Baru
              </label>
              <input
                type="text"
                value={bulkClassName}
                onChange={(e) => setBulkClassName(e.target.value)}
                placeholder="Contoh: XII MIPA 1"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Ubah Status Keaktifan
              </label>
              <select
                value={bulkStatus}
                onChange={(e) =>
                  setBulkStatus(e.target.value as 'Aktif' | 'Nonaktif' | '')
                }
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="">-- Tidak Diubah --</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyBulkUpdate}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Simpan Perubahan Massal
              </button>
              <button
                type="button"
                onClick={() => setShowBulkPanel(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* High-Density Student Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-500 hover:text-sky-700"
                    aria-label="Pilih semua"
                  >
                    {selectedIds.length === filteredStudents.length &&
                    filteredStudents.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-sky-700" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold">ID & NISN</th>
                <th className="py-3 px-4 font-semibold">Nama Lengkap Siswa</th>
                <th className="py-3 px-4 font-semibold">Kelas</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Partisipasi</th>
                <th className="py-3 px-4 font-semibold text-right">Rata-Rata Nilai</th>
                <th className="py-3 px-4 font-semibold">Ujian Terakhir</th>
                <th className="py-3 px-4 font-semibold text-right">Pilih / Edit / Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Tidak ada data siswa yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isSelected = selectedIds.includes(st.id);
                  const stSubs = getStudentSubmissions(st);
                  const attemptsCount = stSubs.length;
                  const avgScore =
                    attemptsCount > 0
                      ? Math.round(
                          stSubs.reduce((acc, s) => acc + s.percentage, 0) /
                            attemptsCount
                        )
                      : null;
                  const latestSub = stSubs[0] || null;

                  return (
                    <tr
                      key={st.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-sky-50/40'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(st.id)}
                          className="text-slate-500 hover:text-sky-700"
                          aria-label={`Pilih ${st.name}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-700" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{st.nisn}</div>
                        <div className="text-slate-400">{st.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{st.name}</div>
                        <div className="text-slate-500">{st.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {st.className}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            st.status === 'Aktif'
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {st.status === 'Aktif' ? '● Aktif' : '○ Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-800 whitespace-nowrap">
                        {attemptsCount} Sesi
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {avgScore !== null ? (
                          <span
                            className={`font-semibold ${
                              avgScore >= 75
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {avgScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400">Belum Ujian</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {latestSub
                          ? new Date(latestSub.submittedAt).toLocaleDateString('id-ID')
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHistoryStudent(st)}
                            className="px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md flex items-center gap-1 transition-colors"
                            title="Lihat Riwayat Partisipasi Siswa"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Riwayat ({attemptsCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudent({ ...st });
                              setIsCreatingNew(false);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStudents([st.id])}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Hapus Data Siswa"
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

      {/* Modal Tambah / Edit Data Siswa */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleSaveStudent}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">
                {isCreatingNew
                  ? 'Tambah Data Siswa Baru'
                  : `Edit Informasi Siswa · ${editingStudent.id}`}
              </h2>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, name: e.target.value })
                  }
                  placeholder="Nama lengkap sesuai daftar absen..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Induk Siswa Nasional (NISN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nisn}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, nisn: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas / Rombel *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.className}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        className: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Sekolah
                  </label>
                  <input
                    type="email"
                    value={editingStudent.email}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, email: e.target.value })
                    }
                    placeholder="siswa@sekolah.sch.id"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Keaktifan
                  </label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        status: e.target.value as 'Aktif' | 'Nonaktif',
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
              >
                Simpan Data Siswa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Input Nama Siswa Bulk (Massal) */}
      {isBulkAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleConfirmBulkAdd}
            className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-700" />
                  <span>Input Nama Siswa Bulk (Tambah Massal Sekaligus)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tempel daftar nama siswa dari Excel, Google Sheets, Word, atau WhatsApp (1 baris = 1 siswa).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkAddOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelas Default (untuk baris tanpa kelas) *
                </label>
                <input
                  type="text"
                  required
                  value={bulkDefaultClass}
                  onChange={(e) => setBulkDefaultClass(e.target.value)}
                  placeholder="Contoh: XII MIPA 1"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Keaktifan Default
                </label>
                <select
                  value={bulkDefaultStatus}
                  onChange={(e) =>
                    setBulkDefaultStatus(e.target.value as 'Aktif' | 'Nonaktif')
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Daftar Nama Siswa (1 Baris per Siswa) *
                </label>
                <span className="text-[11px] font-mono text-sky-800 font-semibold">
                  Terdeteksi: {parsedBulkStudents.length} Siswa Valid
                </span>
              </div>
              <textarea
                rows={7}
                value={bulkNamesText}
                onChange={(e) => setBulkNamesText(e.target.value)}
                placeholder={`Contoh 1 (Hanya Nama):\nAhmad Fauzi\nBunga Citra Lestari\nCahyo Nugroho\n\nContoh 2 (NISN, Nama, Kelas):\n0081234561, Dimas Anggara, XII MIPA 2\n0081234562, Eka Putri, XII MIPA 2`}
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Mendukung format: <strong>Nama Saja</strong>, <strong>1. Nama</strong>, <strong>Nama, Kelas</strong>, atau <strong>NISN, Nama, Kelas</strong> (koma, titik koma, atau Tab Excel).
              </p>
            </div>

            {/* Option to replace dummy/existing students */}
            <label className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExistingOnBulk}
                onChange={(e) => setReplaceExistingOnBulk(e.target.checked)}
                className="mt-0.5 rounded text-sky-700 focus:ring-sky-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900">
                  Ganti seluruh daftar siswa lama/dummy dengan daftar baru ini
                </span>
                <p className="text-slate-600 mt-0.5">
                  Centang opsi ini jika Anda ingin menghapus daftar siswa bawaan (dummy) dan hanya menyimpan daftar siswa yang baru dimasukkan.
                </p>
              </div>
            </label>

            {/* Live Preview Table */}
            {parsedBulkStudents.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  Pratinjau Siswa yang Akan Disimpan ({parsedBulkStudents.length} Siswa)
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono">
                        <th className="py-1.5 px-3">No</th>
                        <th className="py-1.5 px-3">NISN</th>
                        <th className="py-1.5 px-3 font-sans">Nama Siswa</th>
                        <th className="py-1.5 px-3 font-sans">Kelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {parsedBulkStudents.map((st, i) => (
                        <tr key={st.id}>
                          <td className="py-1.5 px-3 text-slate-500">{i + 1}</td>
                          <td className="py-1.5 px-3 text-slate-700">{st.nisn}</td>
                          <td className="py-1.5 px-3 font-sans font-medium text-slate-900">
                            {st.name}
                          </td>
                          <td className="py-1.5 px-3 font-sans text-slate-600">
                            {st.className}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsBulkAddOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={parsedBulkStudents.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg"
              >
                Simpan {parsedBulkStudents.length} Siswa Sekarang
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Riwayat Lengkap Partisipasi per Siswa */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs text-slate-500">
                  Log Riwayat Partisipasi Lengkap · NISN:{' '}
                  <span className="font-mono tabular-nums">{historyStudent.nisn}</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {historyStudent.name} ({historyStudent.className})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {getStudentSubmissions(historyStudent).length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Siswa ini belum memiliki riwayat pengerjaan ujian.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">ID Sesi</th>
                      <th className="py-2.5 px-3 font-semibold">Waktu Selesai</th>
                      <th className="py-2.5 px-3 font-semibold">Judul Ujian</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Skor</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Nilai (%)</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {getStudentSubmissions(historyStudent).map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                          {sub.id}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                          {new Date(sub.submittedAt).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">{sub.examTitle}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {sub.totalScore}/{sub.maxScore}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {sub.percentage}% ({sub.gradeLetter})
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={
                              sub.passed
                                ? 'text-emerald-700 font-semibold'
                                : 'text-amber-700 font-semibold'
                            }
                          >
                            {sub.passed ? '● LULUS' : '▲ REMEDIAL'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryStudent(null);
                              onInspectSubmission(sub);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Buka Analisis</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
