import React, { useState, useEffect } from 'react';
import { Award, Plus, Search, Edit2, Trash2, X, Download } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Alumni } from '../../types';
import * as XLSX from 'xlsx';

export const AlumniManagement: React.FC = () => {
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<Alumni | null>(null);

  const initialForm: Omit<Alumni, 'id' | 'createdAt'> = {
    name: '',
    nis: '',
    nisn: '',
    graduationYear: '2023',
    phone: '',
    email: '',
    currentActivity: 'Kuliah / Bekerja',
    address: 'Padang Ratu',
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'alumni'), orderBy('graduationYear', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Alumni));
      setAlumniList(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setEditingAlumni(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (a: Alumni) => {
    setEditingAlumni(a);
    setFormData({
      name: a.name,
      nis: a.nis,
      nisn: a.nisn,
      graduationYear: a.graduationYear,
      phone: a.phone,
      email: a.email,
      currentActivity: a.currentActivity,
      address: a.address,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingAlumni) {
      await updateDoc(doc(db, 'alumni', editingAlumni.id), { ...formData });
    } else {
      await addDoc(collection(db, 'alumni'), {
        ...formData,
        createdAt: new Date().toISOString(),
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (a: Alumni) => {
    if (window.confirm(`Hapus data alumni "${a.name}"?`)) {
      await deleteDoc(doc(db, 'alumni', a.id));
    }
  };

  const exportAlumni = () => {
    const data = alumniList.map((a, idx) => ({
      No: idx + 1,
      Nama: a.name,
      NIS: a.nis,
      NISN: a.nisn,
      'Tahun Lulus': a.graduationYear,
      'Aktivitas Saat Ini': a.currentActivity,
      'No HP': a.phone,
      Email: a.email,
      Alamat: a.address,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumni');
    XLSX.writeFile(wb, 'Data_Alumni_SMA_Maarif_05.xlsx');
  };

  const filtered = alumniList.filter((a) => {
    return (
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.graduationYear.includes(searchTerm) ||
      a.currentActivity.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            <span>Penelusuran Data Alumni (Tracer Study)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Database kelulusan, kontak, dan kegiatan alumni SMAS Ma'arif 05 Padang Ratu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportAlumni}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Alumni</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari alumni berdasarkan nama, tahun lulus, universitas/tempat kerja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Alumni</th>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">Tahun Lulus</th>
                <th className="py-3 px-4">Kegiatan Saat Ini (Kuliah / Kerja)</th>
                <th className="py-3 px-4">No. HP</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.length > 0 ? (
                filtered.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{a.name}</td>
                    <td className="py-3 px-4 font-mono">{a.nis} / {a.nisn}</td>
                    <td className="py-3 px-4 font-bold text-amber-600">{a.graduationYear}</td>
                    <td className="py-3 px-4">{a.currentActivity}</td>
                    <td className="py-3 px-4">{a.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(a)}
                          className="p-1 rounded text-slate-500 hover:text-amber-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1 rounded text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada data alumni ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Alumni */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAlumni ? 'Edit Data Alumni' : 'Tambah Data Alumni'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Alumni</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NIS</label>
                  <input
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tahun Lulus</label>
                  <input
                    type="text"
                    required
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Aktivitas / Tempat Kuliah / Kerja</label>
                <input
                  type="text"
                  value={formData.currentActivity}
                  onChange={(e) => setFormData({ ...formData, currentActivity: e.target.value })}
                  placeholder="Contoh: Kuliah di Universitas Lampung / Bekerja"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">No. HP</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
