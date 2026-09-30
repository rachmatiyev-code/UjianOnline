import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Lock,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Eye,
  LayoutDashboard,
  KeyRound,
} from 'lucide-react';
import { Student, UserRole, UserSession } from '../types/exam';

interface LoginPortalViewProps {
  students: Student[];
  teacherPassword: string;
  isDefaultPassword: boolean;
  isLoggingInGoogle: boolean;
  onLogin: (session: UserSession, newStudentIfCreated?: Student) => void;
  onUpdateTeacherPassword: (newPassword: string) => void;
  onGoogleLoginAsTeacher: () => void;
}

export const LoginPortalView: React.FC<LoginPortalViewProps> = ({
  students,
  teacherPassword,
  isDefaultPassword,
  isLoggingInGoogle,
  onLogin,
  onUpdateTeacherPassword,
  onGoogleLoginAsTeacher,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('siswa');

  // Student login state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || 'NEW'
  );
  const [customStudentName, setCustomStudentName] = useState('');
  const [customStudentNisn, setCustomStudentNisn] = useState('0089912045');
  const [customStudentClass, setCustomStudentClass] = useState('XII MIPA 1');
  const [customStudentEmail, setCustomStudentEmail] = useState('');

  // Teacher/Admin login & password state
  const [teacherName, setTeacherName] = useState('Budi Santoso, M.Pd.');
  const [teacherNip, setTeacherNip] = useState('198604122011011004');
  const [teacherEmail, setTeacherEmail] = useState('budi.santoso@sekolah.sch.id');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Inline password configuration panel state for Teacher
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [currentPassForChange, setCurrentPassForChange] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmNewPassInput, setConfirmNewPassInput] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (selectedRole === 'siswa') {
      if (selectedStudentId === 'NEW') {
        if (!customStudentName.trim()) {
          setErrorMsg('Mohon masukkan Nama Lengkap Siswa untuk melanjutkan.');
          return;
        }
        const newStudent: Student = {
          id: `SIS-${String(Date.now()).slice(-4)}`,
          nisn: customStudentNisn.trim() || '0089912045',
          name: customStudentName.trim(),
          className: customStudentClass.trim() || 'XII MIPA 1',
          email:
            customStudentEmail.trim() ||
            `${customStudentName
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '.')}@sekolah.sch.id`,
          status: 'Aktif',
          joinedAt: new Date().toISOString().slice(0, 10),
        };
        onLogin(
          {
            role: 'siswa',
            name: newStudent.name,
            identifier: newStudent.nisn,
            studentId: newStudent.id,
            className: newStudent.className,
            email: newStudent.email,
          },
          newStudent
        );
        return;
      }

      const found = students.find((s) => s.id === selectedStudentId) || students[0];
      if (!found) {
        setErrorMsg('Data siswa tidak ditemukan. Silakan pilih input siswa baru.');
        return;
      }

      onLogin({
        role: 'siswa',
        name: found.name,
        identifier: found.nisn,
        studentId: found.id,
        className: found.className,
        email: found.email,
      });
    } else {
      // Teacher/Admin login requires password verification
      if (!teacherName.trim()) {
        setErrorMsg('Mohon masukkan nama Guru / Administrator.');
        return;
      }
      if (!inputPassword) {
        setErrorMsg(
          'Mohon masukkan Password Guru yang telah ditentukan untuk mengakses menu Guru/Admin.'
        );
        return;
      }
      if (inputPassword !== teacherPassword) {
        setErrorMsg(
          'Password Guru tidak sesuai! Silakan masukkan password yang telah ditentukan oleh guru.'
        );
        return;
      }

      onLogin({
        role: 'guru',
        name: teacherName.trim(),
        identifier: teacherNip.trim() || 'ADMIN-01',
        email: teacherEmail.trim() || 'admin@sekolah.sch.id',
      });
    }
  };

  const handleSaveNewTeacherPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (currentPassForChange !== teacherPassword) {
      setErrorMsg('Password guru saat ini tidak sesuai.');
      return;
    }
    if (newPassInput.trim().length < 4) {
      setErrorMsg('Password baru minimal terdiri dari 4 karakter.');
      return;
    }
    if (newPassInput !== confirmNewPassInput) {
      setErrorMsg('Konfirmasi password baru tidak cocok.');
      return;
    }

    onUpdateTeacherPassword(newPassInput);
    setInputPassword(newPassInput);
    setCurrentPassForChange('');
    setNewPassInput('');
    setConfirmNewPassInput('');
    setIsSettingPassword(false);
    setSuccessMsg(
      'Password Guru berhasil diperbarui! Silakan klik "Masuk sebagai Guru/Admin" untuk melanjutkan.'
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Top Accent Strip */}
        <div
          className={`h-2 transition-colors ${
            selectedRole === 'siswa' ? 'bg-sky-700' : 'bg-slate-900'
          }`}
        />

        <div className="p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Role-Based Access Control (RBAC)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
                Portal Masuk UjianOnline
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Pilih peran akses Anda. Siswa langsung diarahkan hanya ke <strong>Ruang Ujian</strong>, sedangkan akses <strong>Guru/Admin</strong> dilindungi dengan password yang ditentukan oleh guru.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('guru');
                  setIsSettingPassword((prev) => !prev);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-700" />
                <span>Tentukan / Ubah Password Guru</span>
              </button>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Option 1: Siswa */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('siswa');
                setIsSettingPassword(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`text-left p-5 rounded-xl border-2 transition-all flex flex-col justify-between gap-4 ${
                selectedRole === 'siswa'
                  ? 'border-sky-700 bg-sky-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        selectedRole === 'siswa'
                          ? 'bg-sky-700 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        Masuk sebagai Siswa
                      </div>
                      <div className="text-xs text-slate-500">
                        Peserta Ujian & Evaluasi Mandiri
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="rbac-role"
                    checked={selectedRole === 'siswa'}
                    onChange={() => setSelectedRole('siswa')}
                    className="text-sky-700 focus:ring-sky-600"
                  />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Akses khusus pengerjaan ujian online dengan pengacakan soal otomatis serta laporan pembahasan instan setelah ujian selesai.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Akses Ruang Ujian & Pembahasan Nilai Pribadi</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <EyeOff className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>Tab Dashboard Guru, Bank Soal, Data Siswa & Sheets Disembunyikan</span>
                </div>
              </div>
            </button>

            {/* Role Option 2: Guru / Admin */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('guru');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`text-left p-5 rounded-xl border-2 transition-all flex flex-col justify-between gap-4 ${
                selectedRole === 'guru'
                  ? 'border-slate-900 bg-slate-50/70'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        selectedRole === 'guru'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        Masuk sebagai Guru/Admin
                      </div>
                      <div className="text-xs text-slate-500">
                        Wajib Verifikasi Password Guru
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="rbac-role"
                    checked={selectedRole === 'guru'}
                    onChange={() => setSelectedRole('guru')}
                    className="text-slate-900 focus:ring-slate-800"
                  />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Kendali penuh atas pemantauan nilai real-time, pembuatan & impor soal multimedia, manajemen data siswa, dan integrasi Google Sheets.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span>Tampilkan Seluruh 5 Menu Navigasi Guru & Admin</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-slate-800" />
                  <span>Dilindungi Menu Input Password yang Ditentukan Guru</span>
                </div>
              </div>
            </button>
          </div>

          {/* Inline Teacher Password Config Panel (when toggled) */}
          {selectedRole === 'guru' && isSettingPassword && (
            <form
              onSubmit={handleSaveNewTeacherPassword}
              className="bg-white border-2 border-slate-900 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-900" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Menu Pengaturan Password Guru / Admin
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingPassword(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Tutup Pengaturan
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Tentukan password khusus yang wajib dimasukkan saat ingin masuk ke mode <strong>Guru/Admin</strong>.
                {isDefaultPassword && (
                  <span className="ml-1 text-slate-700">
                    (Password awal saat ini: <code className="font-mono font-semibold">guru123</code>)
                  </span>
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Guru Saat Ini *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassForChange}
                    onChange={(e) => setCurrentPassForChange(e.target.value)}
                    placeholder="Password saat ini..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Guru Baru *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Minimal 4 karakter..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Konfirmasi Password Baru *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassInput}
                    onChange={(e) => setConfirmNewPassInput(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Tampilkan karakter password</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingPassword(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    Simpan Password Baru Guru
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Login Form Details based on selectedRole */}
          <form
            onSubmit={handleFormSubmit}
            className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5"
          >
            {selectedRole === 'siswa' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Identitas Login Siswa
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pilih akun siswa terdaftar atau masukkan identitas peserta baru untuk masuk ke Ruang Ujian.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-sky-800 font-semibold">
                    Hak Akses: Hanya Ruang Ujian
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih Akun Siswa Terdaftar (NISN & Nama)
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — NISN: {st.nisn} ({st.className})
                      </option>
                    ))}
                    <option value="NEW">+ Masuk sebagai Peserta Siswa Baru...</option>
                  </select>
                </div>

                {selectedStudentId === 'NEW' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nama Lengkap Siswa *
                      </label>
                      <input
                        type="text"
                        value={customStudentName}
                        onChange={(e) => setCustomStudentName(e.target.value)}
                        placeholder="Contoh: Dimas Aditya Pratama"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nomor Induk Siswa Nasional (NISN) *
                      </label>
                      <input
                        type="text"
                        value={customStudentNisn}
                        onChange={(e) => setCustomStudentNisn(e.target.value)}
                        placeholder="0089912045"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Kelas / Rombongan Belajar
                      </label>
                      <input
                        type="text"
                        value={customStudentClass}
                        onChange={(e) => setCustomStudentClass(e.target.value)}
                        placeholder="XII MIPA 1"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Email Sekolah
                      </label>
                      <input
                        type="email"
                        value={customStudentEmail}
                        onChange={(e) => setCustomStudentEmail(e.target.value)}
                        placeholder="dimas.pratama@sekolah.sch.id"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Otorisasi & Input Password Guru / Admin
                    </h2>
                    <p className="text-xs text-slate-500">
                      Masukkan password yang telah ditentukan oleh guru untuk membuka seluruh menu pengelolaan ujian.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-800 font-semibold">
                    Hak Akses: Seluruh Menu Navigasi (Penuh)
                  </span>
                </div>

                {/* Primary Teacher Password Input Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-slate-900">
                      Password Akses Guru / Admin *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsSettingPassword((prev) => !prev)}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>
                        {isSettingPassword
                          ? 'Sembunyikan Pengaturan Password'
                          : 'Ubah / Tentukan Password Guru'}
                      </span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="Masukkan password guru..."
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    {isDefaultPassword ? (
                      <span>
                        Password bawaan awal:{' '}
                        <code className="font-mono font-semibold text-slate-800">
                          guru123
                        </code>{' '}
                        (Guru dapat mengubahnya melalui menu &ldquo;Ubah / Tentukan Password Guru&rdquo;)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">
                        ● Password kustom yang ditentukan guru sedang aktif.
                      </span>
                    )}
                  </div>
                </div>

                {/* Teacher Profile Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Guru / Administrator *
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="Budi Santoso, M.Pd."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      NIP / ID Pengajar
                    </label>
                    <input
                      type="text"
                      value={teacherNip}
                      onChange={(e) => setTeacherNip(e.target.value)}
                      placeholder="198604122011011004"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Institusi
                    </label>
                    <input
                      type="email"
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="budi.santoso@sekolah.sch.id"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                {successMsg}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {selectedRole === 'siswa'
                  ? 'Saat masuk sebagai Siswa, navigasi otomatis dikunci ke Ruang Ujian.'
                  : 'Saat password guru terverifikasi, kelima menu pengelolaan ditampilkan.'}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-xs font-semibold text-white rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
                    selectedRole === 'siswa'
                      ? 'bg-sky-700 hover:bg-sky-800'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  <span>
                    {selectedRole === 'siswa'
                      ? 'Masuk sebagai Siswa'
                      : 'Verifikasi Password & Masuk Guru'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
