import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Printer,
  Download,
  Upload,
  Search,
  Trash2,
  Edit2,
  X,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { StudentInvoice, Student } from '../../types';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';
import {
  downloadInvoiceTemplate,
  readExcelFile,
  pickExcelCell,
  parseExcelNumber,
  formatExcelImportError,
} from '../../utils/excelExport';

export const StudentInvoiceManagement: React.FC = () => {
  const { settings } = useSettings();
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Print mode
  const [isPrintSingleOpen, setIsPrintSingleOpen] = useState(false);
  const [isPrintBulkOpen, setIsPrintBulkOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<StudentInvoice | null>(null);

  // Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const initialForm: Omit<StudentInvoice, 'id' | 'createdAt'> = {
    invoiceNumber: '',
    studentId: '',
    studentName: '',
    nis: '',
    className: '',
    category: 'SPP',
    amount: 150000,
    notes: 'Pembayaran SPP Bulan Berjalan',
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    invoiceDate: new Date().toISOString().split('T')[0],
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      setStudents(list);
    });

    const unsubInvoices = onSnapshot(
      query(collection(db, 'studentInvoices'), orderBy('invoiceDate', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentInvoice));
        setInvoices(list);
      }
    );

    return () => {
      unsubStudents();
      unsubInvoices();
    };
  }, []);

  const handleOpenAdd = () => {
    const firstStudent = students[0];
    setFormData({
      ...initialForm,
      invoiceNumber: `TAG/SMA-M05/${String(invoices.length + 1).padStart(3, '0')}/${new Date().getFullYear()}`,
      studentId: firstStudent ? firstStudent.id : '',
      studentName: firstStudent ? firstStudent.name : '',
      nis: firstStudent ? firstStudent.nis : '',
      className: firstStudent ? firstStudent.className : '',
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleSelectStudent = (studentId: string) => {
    const s = students.find((st) => st.id === studentId);
    if (s) {
      setFormData({
        ...formData,
        studentId: s.id,
        studentName: s.name,
        nis: s.nis,
        className: s.className,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.amount) return;

    if (isEditing && activeInvoice) {
      await updateDoc(doc(db, 'studentInvoices', activeInvoice.id), { ...formData });
    } else {
      await addDoc(collection(db, 'studentInvoices'), {
        ...formData,
        createdAt: new Date().toISOString(),
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (inv: StudentInvoice) => {
    if (window.confirm(`Hapus surat tagihan untuk siswa "${inv.studentName}"?`)) {
      await deleteDoc(doc(db, 'studentInvoices', inv.id));
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile(file, ['nama siswa', 'nama lengkap', 'nis', 'kategori tagihan', 'nominal']);
      const now = new Date().toISOString();
      const todayStr = now.split('T')[0];
      const defaultDueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
      const validDocs: Array<Omit<StudentInvoice, 'id'>> = [];

      rows.forEach((row, idx) => {
        const studentName = pickExcelCell(row, 'Nama Siswa', 'Nama Lengkap', 'Nama Peserta Didik', 'Nama');
        if (!studentName) return;

        validDocs.push({
          invoiceNumber: `TAG/SMA-M05/${String(invoices.length + idx + 1).padStart(3, '0')}/${new Date().getFullYear()}`,
          studentName,
          nis: pickExcelCell(row, 'NIS', 'No Induk') || '-',
          className: pickExcelCell(row, 'Kelas', 'Rombel', 'Nama Rombel') || 'X-1 (Fase E)',
          category: (pickExcelCell(row, 'Kategori Tagihan', 'Kategori', 'Jenis Tagihan') || 'SPP') as StudentInvoice['category'],
          amount: parseExcelNumber(pickExcelCell(row, 'Nominal', 'Jumlah', 'Tagihan', 'Biaya'), 150000),
          notes: pickExcelCell(row, 'Keterangan', 'Catatan') || '-',
          dueDate: pickExcelCell(row, 'Jatuh Tempo', 'Tenggat') || defaultDueDate,
          invoiceDate: todayStr,
          createdAt: now,
        });
      });

      if (validDocs.length === 0) {
        const headers = Object.keys(rows[0] || {}).filter((k) => !k.startsWith('__COL_')).slice(0, 6).join(', ');
        showNotify(
          `Tidak ditemukan kolom "Nama Siswa" / "Nama Lengkap" pada file Excel.${headers ? ` Kolom terbaca: ${headers}` : ''}`,
          'error'
        );
        return;
      }

      for (let i = 0; i < validDocs.length; i += 400) {
        const batch = writeBatch(db);
        validDocs.slice(i, i + 400).forEach((item) => {
          batch.set(doc(collection(db, 'studentInvoices')), item);
        });
        await batch.commit();
      }

      showNotify(`Berhasil mengimpor ${validDocs.length} data tagihan siswa dari Excel.`);
    } catch (err: any) {
      showNotify('Gagal impor Excel: ' + formatExcelImportError(err), 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Categories available (respects showUniformBilling)
  const availableCategories = [
    'Tunggakan',
    'Daftar Ulang',
    'SPP',
    'Ujian',
    ...(settings.showUniformBilling ? ['Seragam'] : []),
    'Lainnya',
  ];

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.className.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || i.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-white font-semibold text-xs shadow-xl flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            <span>Penerbitan Surat Tagihan Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Buat dan cetak surat pemberitahuan tagihan biaya sekolah perorangan atau massal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadInvoiceTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template Excel</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} className="hidden" />
          </label>

          <button
            onClick={() => setIsPrintBulkOpen(true)}
            disabled={filteredInvoices.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Massal ({filteredInvoices.length} Surat)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Surat Tagihan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa, NIS, atau kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="ALL">Semua Kategori Tagihan</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nomor Surat</th>
                <th className="py-3 px-4">Nama Peserta Didik</th>
                <th className="py-3 px-4">NIS / Kelas</th>
                <th className="py-3 px-4">Jenis Tagihan</th>
                <th className="py-3 px-4 font-bold">Nominal Tagihan</th>
                <th className="py-3 px-4">Batas Pembayaran</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono text-[11px] font-bold">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{inv.studentName}</td>
                    <td className="py-3 px-4">
                      <div>{inv.nis}</div>
                      <div className="text-slate-400 text-[10px]">{inv.className}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {inv.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                      {formatRupiah(inv.amount)}
                    </td>
                    <td className="py-3 px-4 text-rose-600 font-medium">{inv.dueDate}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{inv.notes || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setActiveInvoice(inv);
                            setIsPrintSingleOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Cetak Surat Tagihan"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
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
                    Belum ada surat tagihan dibuat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Buat Surat Tagihan */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Buat Surat Tagihan Siswa
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Peserta Didik dari Database:
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="">-- Pilih Siswa atau isi manual di bawah --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.nis} - {s.className})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nama Siswa</label>
                  <input
                    type="text"
                    required
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NIS</label>
                  <input
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kelas</label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kategori Tagihan</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nominal Tagihan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Batas Pembayaran</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Uraian / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Tagihan SPP Bulan Januari 2025"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Simpan & Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Print Single Invoice */}
      {isPrintSingleOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-indigo-600" />
                <span>Pratinjau Surat Pemberitahuan Tagihan</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Print / PDF)</span>
                </button>
                <button onClick={() => setIsPrintSingleOpen(false)} className="p-2 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="printable-area py-6 px-4" style={{ fontFamily: 'Times New Roman, serif' }}>
              <KopSuratView />
              <div className="text-center my-4">
                <h2 className="text-base font-extrabold tracking-wide uppercase underline">
                  SURAT PEMBERITAHUAN ADMINISTRASI PEMBIAYAAN
                </h2>
                <p className="text-xs text-slate-600 font-mono">Nomor: {activeInvoice.invoiceNumber}</p>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed space-y-3 mt-4 text-justify">
                <p>Kepada Yth.<br />Bapak/Ibu Orang Tua / Wali dari:<br /><strong>{activeInvoice.studentName}</strong> (Kelas: {activeInvoice.className})<br />di Tempat</p>
                <p>
                  Dengan hormat,<br />
                  Dalam rangka tertib administrasi sekolah serta kelancaran proses kegiatan belajar mengajar pada {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, bersama ini kami sampaikan rincian tagihan pembiayaan sekolah peserta didik yang bersangkutan sebagai berikut:
                </p>

                <div className="my-4 border border-black p-4 bg-slate-50">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr><td className="w-40 py-1 font-semibold">Nama Siswa</td><td className="w-4">:</td><td className="font-bold">{activeInvoice.studentName}</td></tr>
                      <tr><td className="py-1 font-semibold">NIS / Kelas</td><td>:</td><td>{activeInvoice.nis} / {activeInvoice.className}</td></tr>
                      <tr><td className="py-1 font-semibold">Kategori Tagihan</td><td>:</td><td className="font-bold">{activeInvoice.category}</td></tr>
                      <tr><td className="py-1 font-semibold">Keterangan Tagihan</td><td>:</td><td>{activeInvoice.notes || '-'}</td></tr>
                      <tr><td className="py-1 font-semibold text-rose-700">Batas Pembayaran</td><td>:</td><td className="font-bold text-rose-700">{activeInvoice.dueDate}</td></tr>
                      <tr className="border-t border-black font-extrabold text-base">
                        <td className="pt-2">Jumlah Tagihan</td><td>:</td><td className="pt-2">{formatRupiah(activeInvoice.amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>
                  Pembayaran dapat diselesaikan secara langsung di ruang Tata Usaha {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} setiap hari kerja.
                </p>
                <p>
                  Demikian surat pemberitahuan ini kami sampaikan, atas perhatian dan kerjasama Bapak/Ibu kami ucapkan terima kasih.
                </p>
              </div>

              <div className="mt-8 flex justify-end text-xs">
                <div className="text-center w-64 space-y-1">
                  <p>Padang Ratu, {new Date(activeInvoice.invoiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Kepala Tata Usaha,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-sm">{settings.tuHeadName}</p>
                  <p>NIP. {settings.tuHeadNip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Print Bulk Invoices with page breaks */}
      {isPrintBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-indigo-600" />
                <span>Pratinjau Cetak Massal ({filteredInvoices.length} Lembar Surat)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Seluruhnya ({filteredInvoices.length} Halaman)</span>
                </button>
                <button onClick={() => setIsPrintBulkOpen(false)} className="p-2 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="printable-area py-6 px-4">
              {filteredInvoices.map((inv, idx) => (
                <div key={inv.id} className={idx < filteredInvoices.length - 1 ? 'page-break mb-12' : ''}>
                  <KopSuratView />
                  <div className="text-center my-4">
                    <h2 className="text-base font-extrabold tracking-wide uppercase underline">
                      SURAT PEMBERITAHUAN TAGIHAN SEKOLAH
                    </h2>
                    <p className="text-xs text-slate-600 font-mono">Nomor: {inv.invoiceNumber}</p>
                  </div>

                  <div className="text-xs sm:text-sm leading-relaxed space-y-3 text-justify">
                    <p>Kepada Yth. Orang Tua / Wali dari: <strong>{inv.studentName}</strong> (Kelas: {inv.className})</p>
                    <p>Bersama ini kami sampaikan rincian tagihan pembiayaan administrasi sekolah:</p>
                    <div className="my-3 border border-black p-3 bg-slate-50">
                      <table className="w-full">
                        <tbody>
                          <tr><td className="w-40 font-semibold">Nama Siswa</td><td>:</td><td className="font-bold">{inv.studentName}</td></tr>
                          <tr><td className="font-semibold">NIS / Kelas</td><td>:</td><td>{inv.nis} / {inv.className}</td></tr>
                          <tr><td className="font-semibold">Kategori Tagihan</td><td>:</td><td className="font-bold">{inv.category}</td></tr>
                          <tr><td className="font-semibold">Keterangan</td><td>:</td><td>{inv.notes || '-'}</td></tr>
                          <tr><td className="font-semibold text-rose-700">Jatuh Tempo</td><td>:</td><td className="font-bold text-rose-700">{inv.dueDate}</td></tr>
                          <tr className="font-extrabold text-base border-t border-black">
                            <td className="pt-2">Total Tagihan</td><td>:</td><td className="pt-2">{formatRupiah(inv.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end text-xs">
                    <div className="text-center w-64 space-y-1">
                      <p>Padang Ratu, {new Date(inv.invoiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p>Kepala Tata Usaha,</p>
                      <div className="h-16"></div>
                      <p className="font-bold underline text-sm">{settings.tuHeadName}</p>
                      <p>NIP. {settings.tuHeadNip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
