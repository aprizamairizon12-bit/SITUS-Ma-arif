import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, UserPlus, Check, X, ShieldAlert, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const initialForm = {
    email: '',
    displayName: '',
    role: 'operator' as UserRole,
    isActive: true,
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
      if (list.length === 0) {
        // Bootstrap standard initial users
        const defaultUsers: UserProfile[] = [
          {
            id: 'aprizamairizon12_admin',
            email: 'aprizamairizon12@gmail.com',
            displayName: 'Ahmad Fauzi, S.Kom. (Super Admin)',
            role: 'super_admin',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'tu_admin_01',
            email: 'dewi.tu@smamaarif05.sch.id',
            displayName: 'Dewi Anggraini (Admin TU)',
            role: 'admin_tu',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'kepsek_user_01',
            email: 'syaifullah.kepsek@smamaarif05.sch.id',
            displayName: 'H. M. Syaifullah, M.Pd. (Kepala Sekolah)',
            role: 'kepala_sekolah',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'operator_user_01',
            email: 'rizki.operator@smamaarif05.sch.id',
            displayName: 'Muhammad Rizki, S.T. (Operator Dapodik)',
            role: 'operator',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ];
        defaultUsers.forEach(u => setDoc(doc(db, 'users', u.id), u));
        setUsers(defaultUsers);
      } else {
        setUsers(list);
      }
    });

    return () => unsub();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.displayName) return;

    try {
      const newId = 'user_' + Date.now();
      await setDoc(doc(db, 'users', newId), {
        id: newId,
        ...form,
        createdAt: new Date().toISOString(),
      });
      setIsAddOpen(false);
      setForm(initialForm);
      setNotification(`Akun ${form.displayName} berhasil dibuat.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert('Gagal menambah user: ' + err.message);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setNotification('Hak akses pengguna berhasil diperbarui.');
      setTimeout(() => setNotification(null), 2500);
    } catch (err: any) {
      alert('Gagal update: ' + err.message);
    }
  };

  const handleToggleActive = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.id), { isActive: !user.isActive });
    } catch (err: any) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const roleBadges: Record<UserRole, { label: string; color: string }> = {
    super_admin: { label: 'Super Admin', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    admin_tu: { label: 'Admin Tata Usaha', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    kepala_sekolah: { label: 'Kepala Sekolah', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    operator: { label: 'Operator Dapodik', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    guru: { label: 'Guru Mata Pelajaran', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600" />
            <span>Manajemen Pengguna & Hak Akses (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admin dapat mengelola akun pengguna, tingkat kewenangan, dan aktivasi akun
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* RBAC Levels Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="font-extrabold text-rose-600 text-sm block">1. Super Admin</span>
          <p className="text-slate-500 mt-1">Mengatur seluruh modul, akun pengguna, konfigurasi kop surat, dan backup sistem.</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="font-extrabold text-blue-600 text-sm block">2. Admin Tata Usaha</span>
          <p className="text-slate-500 mt-1">Mengelola data sekolah, membuat surat resmi, mengarsipkan dokumen, dan mencetak surat.</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="font-extrabold text-amber-600 text-sm block">3. Kepala Sekolah</span>
          <p className="text-slate-500 mt-1">Melihat seluruh data, memeriksa persuratan, dan memverifikasi dokumen resmi.</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="font-extrabold text-emerald-600 text-sm block">4. Operator</span>
          <p className="text-slate-500 mt-1">Menginput dan memperbarui data kesiswaan dan rombel sesuai kewenangan.</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-4">Email / Akun</th>
                <th className="py-3 px-4">Tingkat Hak Akses (Role)</th>
                <th className="py-3 px-4 text-center">Status Akun</th>
                <th className="py-3 px-4 text-center">Ubah Kewenangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {users.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {u.displayName}
                  </td>
                  <td className="py-3 px-4 font-mono">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${roleBadges[u.role]?.color || 'bg-slate-100 text-slate-800'}`}>
                      {roleBadges[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                      className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin_tu">Admin TU</option>
                      <option value="kepala_sekolah">Kepala Sekolah</option>
                      <option value="operator">Operator</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah User */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Tambah Pengguna & Tentukan Hak Akses
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Alamat Email Pengguna</label>
                <input
                  type="email"
                  required
                  placeholder="budi@smamaarif05.sch.id"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tingkat Hak Akses</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="super_admin">1. Super Admin</option>
                  <option value="admin_tu">2. Admin Tata Usaha</option>
                  <option value="kepala_sekolah">3. Kepala Sekolah</option>
                  <option value="operator">4. Operator</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
