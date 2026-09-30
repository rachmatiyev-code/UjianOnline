import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Building2,
  BookOpen,
  Mail,
  BadgeCheck,
  KeyRound,
  X,
  CheckCircle2,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { TeacherProfile } from '../types/exam';

interface TeacherProfileModalProps {
  isOpen: boolean;
  teacherProfile: TeacherProfile;
  currentPassword: string;
  shareableUrl: string;
  onClose: () => void;
  onSaveProfile: (nextProfile: TeacherProfile, nextPassword?: string) => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  teacherProfile,
  currentPassword,
  shareableUrl,
  onClose,
  onSaveProfile,
}) => {
  const [name, setName] = useState(teacherProfile?.name || 'Budi Santoso, M.Pd.');
  const [identifier, setIdentifier] = useState(
    teacherProfile?.identifier || '198604122011011004'
  );
  const [email, setEmail] = useState(
    teacherProfile?.email || 'budi.santoso@sekolah.sch.id'
  );
  const [schoolName, setSchoolName] = useState(
    teacherProfile?.schoolName || 'SMA Negeri 1 Nusantara'
  );
  const [subjectName, setSubjectName] = useState(
    teacherProfile?.subjectName || 'Informatika & Ilmu Komputer'
  );
  const [roleTitle, setRoleTitle] = useState(
    teacherProfile?.roleTitle || 'Guru / Koordinator Ujian'
  );
  const [newPassword, setNewPassword] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen && teacherProfile) {
      setName(teacherProfile.name || '');
      setIdentifier(teacherProfile.identifier || '');
      setEmail(teacherProfile.email || '');
      setSchoolName(teacherProfile.schoolName || '');
      setSubjectName(teacherProfile.subjectName || '');
      setRoleTitle(teacherProfile.roleTitle || '');
      setNewPassword('');
      setCopiedLink(false);
    }
  }, [isOpen, teacherProfile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: TeacherProfile = {
      name: name.trim(),
      identifier: identifier.trim() || '198604122011011004',
      email:
        email.trim() ||
        `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.')}@sekolah.sch.id`,
      schoolName: schoolName.trim() || 'SMA Negeri Unggulan',
      subjectName: subjectName.trim() || 'Evaluasi Terpadu',
      roleTitle: roleTitle.trim() || 'Guru Pengampu & Administrator',
    };

    onSaveProfile(
      updated,
      newPassword.trim().length >= 3 ? newPassword.trim() : undefined
    );
    onClose();
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Edit Data Guru & Identitas Instansi
              </h2>
              <p className="text-xs text-slate-500">
                Data guru ini otomatis tersimpan di server dan tampil saat link dibagikan ke siswa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap Guru & Gelar *
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd., M.Pd."
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NIP / NUPTK / ID Pengajar
              </label>
              <div className="relative">
                <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: 198604122011011004"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Guru / Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guru@sekolah.sch.id"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Sekolah / Instansi
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: SMA Negeri 1 Nusantara"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mata Pelajaran / Bidang Studi
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Contoh: Biologi & Sains Terpadu"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jabatan / Keterangan Peran
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Contoh: Guru Pengampu & Koordinator Evaluasi"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
              />
            </div>
          </div>

          {/* Optional Password Update */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-sky-700" />
              <span>Ganti Password Login Guru (Opsional)</span>
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={`Kosongkan jika tetap menggunakan password saat ini (${currentPassword})`}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-sky-700"
            />
          </div>

          {/* Shareable Link Box so shared links always load real teacher data */}
          <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-sky-950 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-sky-700" />
                <span>Link Ujian Siswa (Sinkron dengan Data Guru & Database)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-md flex items-center gap-1 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-sky-900 leading-relaxed">
              Saat link dibagikan ke perangkat/browser siswa, aplikasi otomatis memuat daftar siswa, soal, dan profil guru yang telah Anda simpan di server & Google Sheets (bukan data dummy).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Simpan Data Guru</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
