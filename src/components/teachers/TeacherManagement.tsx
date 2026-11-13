import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Download,
  Upload,
  Printer,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  X,
  Check,
  User,
  AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Teacher } from '../../types';
import {
  exportTeachersToExcel,
  downloadTeacherTemplate,
  readExcelFile,
  pickExcelCell,
  parseExcelGender,
  formatExcelImportError,
} from '../../utils/excelExport';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';

export const TeacherManagement: React.FC = () => {
  const { settings } = useSettings();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPrintBiodataOpen, setIsPrintBiodataOpen] = useState(false);
  const [isPrintListOpen, setIsPrintListOpen] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);

  const initialFormState: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    nip: '-',
    nuptk: '-',
    nik: '',
    gender: 'L',
    birthPlace: 'Lampung Tengah',
    birthDate: '1985-01-01',
    lastEducation: 'S1 Pendidikan',
    major: 'Pendidikan',
    position: 'Guru Mata Pelajaran',
    subject: 'Mata Pelajaran',
    employeeStatus: 'GTY',
    address: 'Padang Ratu, Lampung Tengah',
    phone: '',
    email: '',
    photoUrl: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'teachers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher));
      setTeachers(docs);
    });

    return () => unsubscribe();
  }, []);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setActiveTeacher(teacher);
    setFormData({
      name: teacher.name,
      nip: teacher.nip,
      nuptk: teacher.nuptk,
      nik: teacher.nik,
      gender: teacher.gender,
      birthPlace: teacher.birthPlace,
      birthDate: teacher.birthDate,
      lastEducation: teacher.lastEducation,
      major: teacher.major,
      position: teacher.position,
      subject: teacher.subject,
      employeeStatus: teacher.employeeStatus,
      address: teacher.address,
      phone: teacher.phone,
      email: teacher.email,
      photoUrl: teacher.photoUrl || '',
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showNotify('Nama Guru wajib diisi!', 'error');
      return;
    }

    try {
      if (isEditing && activeTeacher) {
        await updateDoc(doc(db, 'teachers', activeTeacher.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        showNotify(`Data guru ${formData.name} berhasil diperbarui.`);
      } else {
        await addDoc(collection(db, 'teachers'), {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showNotify(`Guru ${formData.name} berhasil ditambahkan.`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showNotify('Gagal menyimpan: ' + err.message, 'error');
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (window.confirm(`Yakin ingin menghapus data guru "${teacher.name}"?`)) {
      try {
        await deleteDoc(doc(db, 'teachers', teacher.id));
        showNotify(`Data guru ${teacher.name} telah dihapus.`);
      } catch (err: any) {
        showNotify('Gagal menghapus: ' + err.message, 'error');
      }
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile(file, ['nama lengkap', 'nama guru', 'nip', 'nuptk', 'mata pelajaran', 'jabatan']);
      const now = new Date().toISOString();
      const validDocs: Array<Omit<Teacher, 'id'>> = [];

      rows.forEach((row) => {
        const name = pickExcelCell(row, 'Nama Lengkap', 'Nama Guru', 'Nama PTK', 'Nama');
        if (!name) return;

        const rawStatus = pickExcelCell(row, 'Status Kepegawaian', 'Status');
        const validStatuses: Teacher['employeeStatus'][] = ['PNS', 'PPPK', 'GTY', 'GTT', 'Honorer'];
        const employeeStatus: Teacher['employeeStatus'] =
          validStatuses.find((s) => s.toLowerCase() === rawStatus.toLowerCase()) || 'GTY';

        validDocs.push({
          name,
          nip: pickExcelCell(row, 'NIP', 'No. NIP') || '-',
          nuptk: pickExcelCell(row, 'NUPTK') || '-',
          nik: pickExcelCell(row, 'NIK') || '-',
          gender: parseExcelGender(pickExcelCell(row, 'L/P', 'Jenis Kelamin', 'JK', 'Gender')),
          position: pickExcelCell(row, 'Jabatan', 'Tugas', 'Tugas Tambahan') || 'Guru Mapel',
          subject: pickExcelCell(row, 'Mata Pelajaran', 'Mapel') || 'Umum',
          employeeStatus,
          lastEducation: pickExcelCell(row, 'Pendidikan Terakhir', 'Pendidikan') || 'S1',
          major: pickExcelCell(row, 'Jurusan', 'Prodi') || '-',
          birthPlace: pickExcelCell(row, 'Tempat Lahir') || 'Padang Ratu',
          birthDate: pickExcelCell(row, 'Tanggal Lahir') || '1985-01-01',
          address: pickExcelCell(row, 'Alamat') || 'Padang Ratu',
          phone: pickExcelCell(row, 'No HP', 'HP', 'Telepon') || '-',
          email: pickExcelCell(row, 'Email') || '-',
          createdAt: now,
          updatedAt: now,
        });
      });

      if (validDocs.length === 0) {
        const headers = Object.keys(rows[0] || {}).filter((k) => !k.startsWith('__COL_')).slice(0, 6).join(', ');
        showNotify(
          `Tidak ditemukan kolom "Nama Lengkap" / "Nama Guru" pada file Excel.${headers ? ` Kolom terbaca: ${headers}` : ''}`,
          'error'
        );
        return;
      }

      for (let i = 0; i < validDocs.length; i += 400) {
        const batch = writeBatch(db);
        validDocs.slice(i, i + 400).forEach((item) => {
          batch.set(doc(collection(db, 'teachers')), item);
        });
        await batch.commit();
      }

      showNotify(`Berhasil mengimpor ${validDocs.length} data guru dari Excel.`);
    } catch (err: any) {
      showNotify('Gagal impor Excel: ' + formatExcelImportError(err), 'error');
    } finally {
      e.target.value = '';
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.nip.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || t.employeeStatus === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold transition ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            <span>Manajemen Data Guru & Pendidik</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {teachers.length} guru & tenaga pendidik terdaftar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadTeacherTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Download Template Excel Guru"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template Excel</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} className="hidden" />
          </label>

          <button
            onClick={() => exportTeachersToExcel(filteredTeachers)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsPrintListOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama guru, mata pelajaran, atau NIP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="ALL">Semua Status Kepegawaian</option>
          <option value="PNS">PNS</option>
          <option value="GTY">GTY (Guru Tetap Yayasan)</option>
          <option value="GTT">GTT (Guru Tidak Tetap)</option>
          <option value="PPPK">PPPK</option>
          <option value="Honorer">Honorer</option>
        </select>
      </div>

      {/* Teachers Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Guru & Gelar</th>
                <th className="py-3 px-4">NIP / NUPTK</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">No. HP</th>
                <th className="py-3 px-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                          {t.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[220px]">{t.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div>{t.nip !== '-' ? t.nip : '-'}</div>
                      <div className="text-slate-400 text-[10px]">NUPTK: {t.nuptk}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{t.gender}</td>
                    <td className="py-3 px-4 font-medium text-emerald-700 dark:text-emerald-300">
                      {t.subject}
                    </td>
                    <td className="py-3 px-4">{t.position}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {t.employeeStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">{t.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setActiveTeacher(t);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveTeacher(t);
                            setIsPrintBiodataOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                          title="Cetak Biodata Guru"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition"
                          title="Edit Guru"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data guru yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Edit Guru */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <span>{isEditing ? 'Edit Data Guru' : 'Tambah Guru Baru'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Contoh: H. M. Syaifullah, S.Pd.I., M.Pd."
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NIP (Jika ada)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="19750812 200501 1 004"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NUPTK</label>
                  <input
                    type="text"
                    value={formData.nuptk}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NIK</label>
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="Contoh: Fisika / Matematika"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jabatan Tambahan</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="Contoh: Waka Kurikulum"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Kepegawaian</label>
                  <select
                    value={formData.employeeStatus}
                    onChange={(e) => setFormData({ ...formData, employeeStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    <option value="PNS">PNS</option>
                    <option value="GTY">GTY (Guru Tetap Yayasan)</option>
                    <option value="GTT">GTT (Guru Tidak Tetap)</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Honorer">Honorer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pendidikan Terakhir</label>
                  <input
                    type="text"
                    value={formData.lastEducation}
                    onChange={(e) => setFormData({ ...formData, lastEducation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="S1 / S2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jurusan</label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">No. HP / WhatsApp</label>
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

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Alamat Tinggal</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Simpan Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Print Preview Biodata Guru */}
      {isPrintBiodataOpen && activeTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>Pratinjau Biodata Guru & Tenaga Pendidik</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Print / PDF)</span>
                </button>
                <button
                  onClick={() => setIsPrintBiodataOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="printable-area py-6 px-4">
              <KopSuratView />
              <div className="text-center my-4">
                <h2 className="text-base font-extrabold tracking-wide uppercase underline">
                  LEMBAR BIODATA GURU / TENAGA PENDIDIK
                </h2>
                <p className="text-xs text-slate-600">SMA MA'ARIF 05 PADANG RATU</p>
              </div>

              <div className="mt-6 flex gap-6 text-xs leading-relaxed">
                <table className="flex-1 border-collapse">
                  <tbody>
                    <tr><td className="py-1.5 w-44 font-semibold text-slate-700">1. Nama Lengkap & Gelar</td><td className="w-4">:</td><td className="font-bold text-slate-950 uppercase">{activeTeacher.name}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">2. NIP</td><td>:</td><td>{activeTeacher.nip}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">3. NUPTK</td><td>:</td><td>{activeTeacher.nuptk}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">4. NIK</td><td>:</td><td>{activeTeacher.nik}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">5. Jenis Kelamin</td><td>:</td><td>{activeTeacher.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">6. Tempat, Tanggal Lahir</td><td>:</td><td>{activeTeacher.birthPlace}, {activeTeacher.birthDate}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">7. Pendidikan Terakhir</td><td>:</td><td>{activeTeacher.lastEducation} ({activeTeacher.major})</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">8. Jabatan</td><td>:</td><td>{activeTeacher.position}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">9. Mata Pelajaran Diampu</td><td>:</td><td className="font-bold">{activeTeacher.subject}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">10. Status Kepegawaian</td><td>:</td><td>{activeTeacher.employeeStatus}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">11. Alamat Domisili</td><td>:</td><td>{activeTeacher.address}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">12. Nomor Telepon / HP</td><td>:</td><td>{activeTeacher.phone || '-'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">13. Alamat Email</td><td>:</td><td>{activeTeacher.email || '-'}</td></tr>
                  </tbody>
                </table>

                <div className="w-28 flex flex-col items-center">
                  <div className="w-24 h-32 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-center p-2 text-slate-400 text-[10px]">
                    Pas Foto<br />3 x 4 cm
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-end text-xs px-4">
                <div className="text-center w-60 space-y-1">
                  <p>Padang Ratu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'},</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{settings.headmasterName}</p>
                  <p>NIP. {settings.headmasterNip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
