import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, Check, Users } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ClassRoom } from '../../types';
import { useSettings } from '../../context/SettingsContext';

export const ClassManagement: React.FC = () => {
  const { settings } = useSettings();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  const initialForm = {
    name: '',
    academicYear: settings.academicYear,
    homeroomTeacher: '',
    room: '',
    studentCount: 30,
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'classes'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom));
      setClasses(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setFormData({ ...initialForm, academicYear: settings.academicYear });
    setEditingClass(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: ClassRoom) => {
    setEditingClass(c);
    setFormData({
      name: c.name,
      academicYear: c.academicYear,
      homeroomTeacher: c.homeroomTeacher,
      room: c.room,
      studentCount: c.studentCount,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingClass) {
      await updateDoc(doc(db, 'classes', editingClass.id), {
        ...formData,
      });
    } else {
      await addDoc(collection(db, 'classes'), {
        ...formData,
        createdAt: new Date().toISOString(),
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (c: ClassRoom) => {
    if (window.confirm(`Hapus rombel "${c.name}"?`)) {
      await deleteDoc(doc(db, 'classes', c.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-600" />
            <span>Data Kelas & Rombongan Belajar (Rombel)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen pembagian rombongan belajar dan wali kelas SMAS Ma'arif 05 Padang Ratu
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas / Rombel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-extrabold text-sm">
                  {cls.name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cls)}
                    className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Tahun Pelajaran:</span>
                  <span className="font-semibold">{cls.academicYear}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Wali Kelas:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{cls.homeroomTeacher || 'Belum ditentukan'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Ruang Kelas:</span>
                  <span className="font-semibold">{cls.room || '-'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-slate-500">
                <Users className="w-3.5 h-3.5" />
                <span>Kapasitas Siswa</span>
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {cls.studentCount || 30} Siswa
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Class */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingClass ? 'Edit Rombel' : 'Tambah Rombel Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Rombel / Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X-1 (Fase E), XI MIPA 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Wali Kelas</label>
                <input
                  type="text"
                  placeholder="Nama Guru Wali Kelas"
                  value={formData.homeroomTeacher}
                  onChange={(e) => setFormData({ ...formData, homeroomTeacher: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Ruangan</label>
                  <input
                    type="text"
                    placeholder="Ruang 01"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jumlah Siswa</label>
                  <input
                    type="number"
                    value={formData.studentCount}
                    onChange={(e) => setFormData({ ...formData, studentCount: Number(e.target.value) })}
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
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
