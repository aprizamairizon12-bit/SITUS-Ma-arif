import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Download,
  Upload,
  Printer,
  Edit2,
  Trash2,
  FileSpreadsheet,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Staff } from '../../types';
import {
  exportStaffToExcel,
  downloadStaffTemplate,
  readExcelFile,
  pickExcelCell,
  parseExcelGender,
  formatExcelImportError,
} from '../../utils/excelExport';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';

export const StaffManagement: React.FC = () => {
  const { settings } = useSettings();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintListOpen, setIsPrintListOpen] = useState(false);
  const [activeStaff, setActiveStaff] = useState<Staff | null>(null);

  const initialFormState: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    nip: '-',
    nik: '',
    gender: 'L',
    position: 'Staf Administrasi',
    employeeStatus: 'PTY',
    address: 'Padang Ratu, Lampung Tengah',
    phone: '',
    email: '',
    photoUrl: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'staff'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Staff));
      setStaffList(docs);
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

  const handleOpenEdit = (staff: Staff) => {
    setActiveStaff(staff);
    setFormData({
      name: staff.name,
      nip: staff.nip,
      nik: staff.nik,
      gender: staff.gender,
      position: staff.position,
      employeeStatus: staff.employeeStatus,
      address: staff.address,
      phone: staff.phone,
      email: staff.email,
      photoUrl: staff.photoUrl || '',
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.position) {
      showNotify('Nama dan Jabatan wajib diisi!', 'error');
      return;
    }

    try {
      if (isEditing && activeStaff) {
        await updateDoc(doc(db, 'staff', activeStaff.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        showNotify(`Data staf ${formData.name} berhasil diperbarui.`);
      } else {
        await addDoc(collection(db, 'staff'), {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showNotify(`Staf ${formData.name} berhasil ditambahkan.`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showNotify('Gagal menyimpan: ' + err.message, 'error');
    }
  };

  const handleDeleteStaff = async (staff: Staff) => {
    if (window.confirm(`Yakin ingin menghapus data tenaga kependidikan "${staff.name}"?`)) {
      try {
        await deleteDoc(doc(db, 'staff', staff.id));
        showNotify(`Data staf ${staff.name} telah dihapus.`);
      } catch (err: any) {
        showNotify('Gagal menghapus: ' + err.message, 'error');
      }
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile(file, ['nama lengkap', 'nama', 'jabatan', 'jabatan / tugas', 'nip', 'nik']);
      const now = new Date().toISOString();
      const validDocs: Array<Omit<Staff, 'id'>> = [];

      rows.forEach((row) => {
        const name = pickExcelCell(row, 'Nama Lengkap', 'Nama Staf', 'Nama');
        if (!name) return;

        const rawStatus = pickExcelCell(row, 'Status Kepegawaian', 'Status');
        const validStatuses: Staff['employeeStatus'][] = ['PNS', 'PPPK', 'PTY', 'PTT', 'Honorer'];
        const employeeStatus: Staff['employeeStatus'] =
          validStatuses.find((s) => s.toLowerCase() === rawStatus.toLowerCase()) || 'PTY';

        validDocs.push({
          name,
          nip: pickExcelCell(row, 'NIP') || '-',
          nik: pickExcelCell(row, 'NIK') || '-',
          gender: parseExcelGender(pickExcelCell(row, 'L/P', 'Jenis Kelamin', 'JK', 'Gender')),
          position: pickExcelCell(row, 'Jabatan / Tugas', 'Jabatan', 'Tugas') || 'Staf Tata Usaha',
          employeeStatus,
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
          `Tidak ditemukan kolom "Nama Lengkap" / "Nama" pada file Excel.${headers ? ` Kolom terbaca: ${headers}` : ''}`,
          'error'
        );
        return;
      }

      for (let i = 0; i < validDocs.length; i += 400) {
        const batch = writeBatch(db);
        validDocs.slice(i, i + 400).forEach((item) => {
          batch.set(doc(collection(db, 'staff')), item);
        });
        await batch.commit();
      }

      showNotify(`Berhasil mengimpor ${validDocs.length} data staf dari Excel.`);
    } catch (err: any) {
      showNotify('Gagal impor Excel: ' + formatExcelImportError(err), 'error');
    } finally {
      e.target.value = '';
    }
  };

  const filteredStaff = staffList.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nip.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
            <Briefcase className="w-6 h-6 text-amber-600" />
            <span>Manajemen Tenaga Kependidikan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {staffList.length} tenaga administrasi, operator, dan staf sekolah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadStaffTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Download Template Excel Tenaga Kependidikan"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template Excel</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} className="hidden" />
          </label>

          <button
            onClick={() => exportStaffToExcel(filteredStaff)}
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Staf</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pegawai, jabatan (Kepala TU, Operator, Pustakawan)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Pegawai</th>
                <th className="py-3 px-4">NIP / NIK</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Jabatan / Tugas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">No. HP</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[200px]">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">{s.nip !== '-' ? s.nip : s.nik || '-'}</td>
                    <td className="py-3 px-4 font-semibold">{s.gender}</td>
                    <td className="py-3 px-4 font-semibold text-amber-700 dark:text-amber-300">{s.position}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        {s.employeeStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">{s.phone || '-'}</td>
                    <td className="py-3 px-4">{s.email || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                          title="Hapus"
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
                    Tidak ditemukan data tenaga kependidikan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Edit Staf */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" />
                <span>{isEditing ? 'Edit Tenaga Kependidikan' : 'Tambah Tenaga Kependidikan'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="Contoh: Ahmad Fauzi, S.Kom."
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Jabatan / Tugas Pokok <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    placeholder="Contoh: Kepala Tata Usaha / Operator Dapodik"
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
                    <option value="PTY">PTY (Pegawai Tetap Yayasan)</option>
                    <option value="PTT">PTT (Pegawai Tidak Tetap)</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Honorer">Honorer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NIP (Jika ada)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Alamat</label>
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Simpan Staf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Print Preview Rekap Tenaga Kependidikan */}
      {isPrintListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-amber-600" />
                <span>Pratinjau Cetak Tenaga Kependidikan</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Print / PDF)</span>
                </button>
                <button
                  onClick={() => setIsPrintListOpen(false)}
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
                  DAFTAR TENAGA KEPENDIDIKAN & STAF TATA USAHA
                </h2>
                <p className="text-xs text-slate-600">Tahun Pelajaran {settings.academicYear}</p>
              </div>

              <table className="w-full border-collapse border border-slate-900 text-[11px] mt-4">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                    <th className="border border-slate-900 p-2 w-8">No</th>
                    <th className="border border-slate-900 p-2 text-left">Nama Lengkap</th>
                    <th className="border border-slate-900 p-2">NIP / NIK</th>
                    <th className="border border-slate-900 p-2 w-10">L/P</th>
                    <th className="border border-slate-900 p-2 text-left">Jabatan / Tugas</th>
                    <th className="border border-slate-900 p-2">Status</th>
                    <th className="border border-slate-900 p-2">No. HP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-900">
                      <td className="border border-slate-900 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 p-2 font-bold">{s.name}</td>
                      <td className="border border-slate-900 p-2 text-center font-mono">{s.nip !== '-' ? s.nip : s.nik}</td>
                      <td className="border border-slate-900 p-2 text-center">{s.gender}</td>
                      <td className="border border-slate-900 p-2">{s.position}</td>
                      <td className="border border-slate-900 p-2 text-center">{s.employeeStatus}</td>
                      <td className="border border-slate-900 p-2 text-center">{s.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 flex justify-end text-xs">
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
