import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';

interface TeacherPasswordModalProps {
  isOpen: boolean;
  initialMode: 'verify' | 'change';
  currentTeacherPassword: string;
  isDefaultPassword: boolean;
  isAlreadyTeacher: boolean;
  onClose: () => void;
  onVerifiedLogin: () => void;
  onUpdatePassword: (newPassword: string) => void;
}

export const TeacherPasswordModal: React.FC<TeacherPasswordModalProps> = ({
  isOpen,
  initialMode,
  currentTeacherPassword,
  isDefaultPassword,
  isAlreadyTeacher,
  onClose,
  onVerifiedLogin,
  onUpdatePassword,
}) => {
  const [mode, setMode] = useState<'verify' | 'change'>(initialMode);
  const [inputPassword, setInputPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setInputPassword('');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!inputPassword) {
      setErrorMsg('Mohon masukkan password Guru/Admin terlebih dahulu.');
      return;
    }

    if (inputPassword !== currentTeacherPassword) {
      setErrorMsg(
        'Password Guru/Admin salah. Gunakan password yang telah ditentukan oleh guru.'
      );
      return;
    }

    onVerifiedLogin();
    onClose();
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isAlreadyTeacher && oldPassword !== currentTeacherPassword) {
      setErrorMsg('Password saat ini tidak sesuai.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMsg('Password baru minimal harus terdiri dari 4 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password baru tidak cocok.');
      return;
    }

    onUpdatePassword(newPassword);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        <div className="h-2 bg-slate-900" />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                {mode === 'verify' ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {mode === 'verify'
                    ? 'Verifikasi Password Guru / Admin'
                    : 'Atur Password Akses Guru'}
                </h3>
                <p className="text-xs text-slate-500">
                  {mode === 'verify'
                    ? 'Masukkan password yang ditentukan guru untuk membuka seluruh menu.'
                    : 'Tentukan password khusus untuk mengamankan akses menu Guru/Admin.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('verify');
                setErrorMsg(null);
              }}
              className={`py-1.5 rounded-md transition-colors ${
                mode === 'verify'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk dengan Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('change');
                setErrorMsg(null);
              }}
              className={`py-1.5 rounded-md transition-colors ${
                mode === 'change'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tentukan / Ubah Password
            </button>
          </div>

          {mode === 'verify' ? (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password Guru / Admin *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="Masukkan password guru..."
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {isDefaultPassword && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Password awal bawaan: <code className="font-mono font-semibold text-slate-800">guru123</code> (Dapat diubah di tab &ldquo;Tentukan / Ubah Password&rdquo;).
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Verifikasi & Masuk Guru
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              {!isAlreadyTeacher && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Guru Saat Ini *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini..."
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  {isDefaultPassword && (
                    <span className="block text-[11px] text-slate-500 mt-1">
                      Password saat ini masih bawaan: <code className="font-mono font-semibold">guru123</code>
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Baru Guru / Admin *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter..."
                    className="w-full pl-3.5 pr-10 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Password Baru *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Password Guru</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
