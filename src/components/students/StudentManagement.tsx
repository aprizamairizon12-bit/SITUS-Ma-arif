import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Printer,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  X,
  Check,
  FileText,
  User,
  AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Student } from '../../types';
import {
  exportStudentsToExcel,
  downloadStudentTemplate,
  readExcelFile,
  pickExcelCell,
  parseExcelGender,
  formatExcelImportError,
} from '../../utils/excelExport';
import { KopSuratView } from '../common/KopSuratView';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';

export const StudentManagement: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const { activeAcademicYear, activeYearName } = useAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPrintListOpen, setIsPrintListOpen] = useState(false);
  const [isPrintBiodataOpen, setIsPrintBiodataOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  // Form State
  const initialFormState: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
    nis: '',
    nisn: '',
    name: '',
    gender: 'L',
    birthPlace: 'Padang Ratu',
    birthDate: '2008-01-01',
    religion: 'Islam',
    address: 'Padang Ratu, Lampung Tengah',
    phone: '',
    fatherName: '',
    motherName: '',
    parentJob: 'Petani / Wiraswasta',
    parentAddress: '',
    parentPhone: '',
    entryYear: String(activeAcademicYear?.startYear || new Date().getFullYear()),
    className: 'X-1 (Fase E)',
    status: 'Aktif',
    photoUrl: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Realtime Firestore Listener
  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      setStudents(docs);
    });

    return () => unsubscribe();
  }, []);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({
      ...initialFormState,
      entryYear: String(activeAcademicYear?.startYear || new Date().getFullYear()),
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setActiveStudent(student);
    setFormData({
      nis: student.nis,
      nisn: student.nisn,
      name: student.name,
      gender: student.gender,
      birthPlace: student.birthPlace,
      birthDate: student.birthDate,
      religion: student.religion,
      address: student.address,
      phone: student.phone,
      fatherName: student.fatherName,
      motherName: student.motherName,
      parentJob: student.parentJob,
      parentAddress: student.parentAddress,
      parentPhone: student.parentPhone,
      entryYear: student.entryYear,
      className: student.className,
      status: student.status,
      photoUrl: student.photoUrl || '',
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nis || !formData.className) {
      showNotify('Nama, NIS, dan Kelas wajib diisi!', 'error');
      return;
    }

    try {
      if (isEditing && activeStudent) {
        await updateDoc(doc(db, 'students', activeStudent.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        showNotify(`Data siswa ${formData.name} berhasil diperbarui.`);
      } else {
        await addDoc(collection(db, 'students'), {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showNotify(`Siswa ${formData.name} berhasil ditambahkan.`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showNotify('Gagal menyimpan: ' + err.message, 'error');
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (window.confirm(`Yakin ingin menghapus data siswa "${student.name}" (NIS: ${student.nis})?`)) {
      try {
        await deleteDoc(doc(db, 'students', student.id));
        showNotify(`Data siswa ${student.name} telah dihapus.`);
      } catch (err: any) {
        showNotify('Gagal menghapus: ' + err.message, 'error');
      }
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile(file, ['nama lengkap', 'nama siswa', 'nama peserta didik', 'nis', 'nisn', 'kelas']);
      const now = new Date().toISOString();
      const defaultEntryYear = String(activeAcademicYear?.startYear || 2026);
      const validDocs: Array<Omit<Student, 'id'>> = [];

      rows.forEach((row, idx) => {
        const studentName = pickExcelCell(row, 'Nama Lengkap', 'Nama Siswa', 'Nama Peserta Didik', 'Nama', 'Full Name');
        if (!studentName) return;

        const rawNis = pickExcelCell(row, 'NIS', 'No Induk', 'NIPD', 'No. Induk');
        const studentNis = rawNis || `${defaultEntryYear}${String(students.length + idx + 1).padStart(4, '0')}`;
        const studentNisn = pickExcelCell(row, 'NISN') || '-';
        const gender = parseExcelGender(pickExcelCell(row, 'L/P', 'Jenis Kelamin', 'JK', 'Gender'));
        const rawStatus = pickExcelCell(row, 'Status', 'Status Siswa');
        const status: Student['status'] =
          rawStatus === 'Lulus' || rawStatus === 'Pindah' || rawStatus === 'Keluar' ? rawStatus : 'Aktif';
        const address = pickExcelCell(row, 'Alamat Siswa', 'Alamat', 'Alamat Tinggal') || 'Padang Ratu';

        validDocs.push({
          nis: studentNis,
          nisn: studentNisn,
          name: studentName,
          gender,
          className: pickExcelCell(row, 'Kelas', 'Rombel', 'Nama Rombel', 'Tingkat') || 'X-1 (Fase E)',
          status,
          birthPlace: pickExcelCell(row, 'Tempat Lahir', 'Tmp Lahir') || 'Padang Ratu',
          birthDate: pickExcelCell(row, 'Tanggal Lahir', 'Tgl Lahir') || '2010-01-01',
          religion: pickExcelCell(row, 'Agama') || 'Islam',
          phone: pickExcelCell(row, 'No HP Siswa', 'No HP', 'HP', 'Telepon', 'No. HP') || '-',
          address,
          fatherName: pickExcelCell(row, 'Nama Ayah', 'Ayah') || '-',
          motherName: pickExcelCell(row, 'Nama Ibu', 'Ibu') || '-',
          parentJob: pickExcelCell(row, 'Pekerjaan Ortu', 'Pekerjaan Ayah', 'Pekerjaan') || '-',
          parentAddress: pickExcelCell(row, 'Alamat Ortu', 'Alamat Siswa', 'Alamat') || address,
          parentPhone: pickExcelCell(row, 'No HP Ortu', 'HP Ortu', 'Telepon Ortu') || '-',
          entryYear: pickExcelCell(row, 'Tahun Masuk', 'Angkatan') || defaultEntryYear,
          createdAt: now,
          updatedAt: now,
        });
      });

      if (validDocs.length === 0) {
        const headers = Object.keys(rows[0] || {}).filter((k) => !k.startsWith('__COL_')).slice(0, 6).join(', ');
        showNotify(
          `Tidak ditemukan kolom "Nama Lengkap" / "Nama Siswa" pada file Excel.${headers ? ` Kolom terbaca: ${headers}` : ''}`,
          'error'
        );
        return;
      }

      for (let i = 0; i < validDocs.length; i += 400) {
        const batch = writeBatch(db);
        validDocs.slice(i, i + 400).forEach((item) => {
          batch.set(doc(collection(db, 'students')), item);
        });
        await batch.commit();
      }

      showNotify(`Berhasil mengimpor ${validDocs.length} data peserta didik dari Excel.`);
    } catch (err: any) {
      showNotify('Gagal impor Excel: ' + formatExcelImportError(err), 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Filtered list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'ALL' || s.className === selectedClass;
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const uniqueClasses = Array.from(new Set(students.map((s) => s.className).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold transition ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
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
            <Users className="w-6 h-6 text-blue-600" />
            <span>Manajemen Data Peserta Didik</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {students.length} peserta didik terdaftar di {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} • TA {activeYearName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template Excel */}
          <button
            onClick={downloadStudentTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Download Template Excel Contoh"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template Excel</span>
          </button>

          {/* Import Excel */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} className="hidden" />
          </label>

          {/* Export Excel */}
          <button
            onClick={() => exportStudentsToExcel(filteredStudents)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          {/* Cetak Daftar */}
          <button
            onClick={() => setIsPrintListOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Daftar</span>
          </button>

          {/* Tambah Siswa */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama lengkap, NIS, atau NISN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">Semua Kelas</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Lulus">Lulus</option>
            <option value="Pindah">Pindah</option>
            <option value="Keluar">Keluar</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Peserta Didik</th>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">No. HP Siswa</th>
                <th className="py-3 px-4">Nama Orang Tua</th>
                <th className="py-3 px-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[200px]">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div>{s.nis}</div>
                      <div className="text-slate-400 text-[10px]">NISN: {s.nisn}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{s.gender}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                        {s.className}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : s.status === 'Lulus'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{s.phone || '-'}</td>
                    <td className="py-3 px-4">{s.fatherName || s.motherName || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setActiveStudent(s);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveStudent(s);
                            setIsPrintBiodataOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                          title="Cetak Biodata Lengkap"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                          title="Hapus Siswa"
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
                    Tidak ditemukan peserta didik yang sesuai dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Edit Siswa */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>{isEditing ? 'Edit Data Peserta Didik' : 'Tambah Peserta Didik Baru'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: Achmad Zaky"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    NIS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: 20240101"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NISN</label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: 0071234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Agama</label>
                  <select
                    value={formData.religion}
                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="Contoh: X-1 (Fase E)"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tahun Masuk</label>
                  <input
                    type="text"
                    value={formData.entryYear}
                    onChange={(e) => setFormData({ ...formData, entryYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Pindah">Pindah</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Alamat Tempat Tinggal</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">No. HP Siswa</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pekerjaan Orang Tua</label>
                  <input
                    type="text"
                    value={formData.parentJob}
                    onChange={(e) => setFormData({ ...formData, parentJob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Ayah</label>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Ibu</label>
                  <input
                    type="text"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">No. HP Orang Tua</label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Siswa */}
      {isDetailOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Detail Biodata Peserta Didik</h3>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="w-16 h-20 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 border border-slate-300 dark:border-slate-600">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{activeStudent.name}</h4>
                  <p className="text-slate-500">NIS: {activeStudent.nis} | NISN: {activeStudent.nisn}</p>
                  <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">Kelas: {activeStudent.className}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div><span className="text-slate-400 block">Jenis Kelamin:</span> <strong>{activeStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</strong></div>
                <div><span className="text-slate-400 block">Agama:</span> <strong>{activeStudent.religion}</strong></div>
                <div><span className="text-slate-400 block">Tempat, Tgl Lahir:</span> <strong>{activeStudent.birthPlace}, {activeStudent.birthDate}</strong></div>
                <div><span className="text-slate-400 block">Tahun Masuk:</span> <strong>{activeStudent.entryYear}</strong></div>
                <div><span className="text-slate-400 block">No. HP Siswa:</span> <strong>{activeStudent.phone || '-'}</strong></div>
                <div><span className="text-slate-400 block">Status:</span> <strong>{activeStudent.status}</strong></div>
              </div>

              <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-slate-200">Data Orang Tua / Wali:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-slate-400 block">Nama Ayah:</span> {activeStudent.fatherName || '-'}</div>
                  <div><span className="text-slate-400 block">Nama Ibu:</span> {activeStudent.motherName || '-'}</div>
                  <div><span className="text-slate-400 block">Pekerjaan:</span> {activeStudent.parentJob || '-'}</div>
                  <div><span className="text-slate-400 block">No. HP Ortu:</span> {activeStudent.parentPhone || '-'}</div>
                </div>
                <div className="mt-1"><span className="text-slate-400 block">Alamat Orang Tua:</span> {activeStudent.parentAddress || activeStudent.address}</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  setIsPrintBiodataOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Biodata Resmi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Print Preview: Cetak Daftar Peserta Didik */}
      {isPrintListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>Pratinjau Cetak Daftar Peserta Didik</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang (Print / PDF)</span>
                </button>
                <button
                  onClick={() => setIsPrintListOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content with Kop Surat */}
            <div className="printable-area py-6 px-4">
              <KopSuratView />
              <div className="text-center my-4">
                <h2 className="text-base font-extrabold tracking-wide uppercase underline">
                  DAFTAR PESERTA DIDIK
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tahun Pelajaran {activeYearName} &nbsp;|&nbsp; {selectedClass === 'ALL' ? 'Semua Kelas' : `Kelas: ${selectedClass}`}
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-900 text-[11px] mt-4">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                    <th className="border border-slate-900 p-2 w-8">No</th>
                    <th className="border border-slate-900 p-2">NIS</th>
                    <th className="border border-slate-900 p-2">NISN</th>
                    <th className="border border-slate-900 p-2 text-left">Nama Peserta Didik</th>
                    <th className="border border-slate-900 p-2 w-10">L/P</th>
                    <th className="border border-slate-900 p-2">Kelas</th>
                    <th className="border border-slate-900 p-2 text-left">Tempat, Tgl Lahir</th>
                    <th className="border border-slate-900 p-2 text-left">Nama Orang Tua</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-900">
                      <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono">{s.nis}</td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono">{s.nisn}</td>
                      <td className="border border-slate-900 p-1.5 font-bold">{s.name}</td>
                      <td className="border border-slate-900 p-1.5 text-center">{s.gender}</td>
                      <td className="border border-slate-900 p-1.5 text-center">{s.className}</td>
                      <td className="border border-slate-900 p-1.5">{s.birthPlace}, {s.birthDate}</td>
                      <td className="border border-slate-900 p-1.5">{s.fatherName || s.motherName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="mt-8 flex justify-end text-xs">
                <div className="text-center w-64 space-y-1">
                  <p>Padang Ratu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'},</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-sm">{settings.headmasterName}</p>
                  <p>NIP. {settings.headmasterNip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Print Preview: Cetak Biodata Peserta Didik */}
      {isPrintBiodataOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>Pratinjau Lembar Biodata Resmi</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
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

            {/* Printable Biodata */}
            <div className="printable-area py-6 px-4">
              <KopSuratView />
              <div className="text-center my-4">
                <h2 className="text-base font-extrabold tracking-wide uppercase underline">
                  LEMBAR BIODATA PESERTA DIDIK
                </h2>
                <p className="text-xs text-slate-600">Nomor Induk Siswa: {activeStudent.nis}</p>
              </div>

              <div className="mt-6 flex gap-6 text-xs leading-relaxed">
                <table className="flex-1 border-collapse">
                  <tbody>
                    <tr><td className="py-1.5 w-44 font-semibold text-slate-700">1. Nama Lengkap</td><td className="w-4">:</td><td className="font-bold uppercase text-slate-950">{activeStudent.name}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">2. NIS / NISN</td><td>:</td><td>{activeStudent.nis} / {activeStudent.nisn}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">3. Jenis Kelamin</td><td>:</td><td>{activeStudent.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">4. Tempat, Tanggal Lahir</td><td>:</td><td>{activeStudent.birthPlace}, {activeStudent.birthDate}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">5. Agama</td><td>:</td><td>{activeStudent.religion}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">6. Alamat Tempat Tinggal</td><td>:</td><td>{activeStudent.address}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">7. Nomor Telepon / HP</td><td>:</td><td>{activeStudent.phone || '-'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">8. Diterima di Kelas</td><td>:</td><td>{activeStudent.className}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">9. Tahun Masuk</td><td>:</td><td>{activeStudent.entryYear}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">10. Nama Ayah Kandung</td><td>:</td><td>{activeStudent.fatherName || '-'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">11. Nama Ibu Kandung</td><td>:</td><td>{activeStudent.motherName || '-'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">12. Pekerjaan Orang Tua</td><td>:</td><td>{activeStudent.parentJob || '-'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">13. Alamat Orang Tua</td><td>:</td><td>{activeStudent.parentAddress || activeStudent.address}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">14. No. HP Orang Tua</td><td>:</td><td>{activeStudent.parentPhone || '-'}</td></tr>
                    <tr><td className="py-1.5 font-semibold text-slate-700">15. Status Peserta Didik</td><td>:</td><td className="font-bold">{activeStudent.status}</td></tr>
                  </tbody>
                </table>

                {/* Pas Foto Box */}
                <div className="w-28 flex flex-col items-center">
                  <div className="w-24 h-32 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-center p-2 text-slate-400 text-[10px]">
                    Pas Foto<br />3 x 4 cm
                  </div>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="mt-10 flex justify-between text-xs px-4">
                <div className="text-center w-48 space-y-1">
                  <p className="invisible">Space</p>
                  <p>Orang Tua / Wali,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{activeStudent.fatherName || activeStudent.motherName || '( ...................................... )'}</p>
                </div>

                <div className="text-center w-56 space-y-1">
                  <p>Padang Ratu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Kepala Tata Usaha,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{settings.tuHeadName}</p>
                  <p>NIP. {settings.tuHeadNip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
