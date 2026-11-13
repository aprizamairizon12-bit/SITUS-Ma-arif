import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  X,
  FileText,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { IncomingLetter } from '../../types';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';

export const IncomingLetters: React.FC = () => {
  const { settings } = useSettings();
  const { activeYearName, academicYearNames } = useAcademicYear();
  const [letters, setLetters] = useState<IncomingLetter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintAgendaOpen, setIsPrintAgendaOpen] = useState(false);
  const [activeLetter, setActiveLetter] = useState<IncomingLetter | null>(null);

  const initialForm: Omit<IncomingLetter, 'id' | 'createdAt'> = {
    letterNumber: '',
    letterDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    sender: '',
    subject: '',
    disposition: 'Kepala Sekolah / Waka Terkait',
    academicYear: activeYearName,
    fileName: '',
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'incomingLetters'), orderBy('receivedDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as IncomingLetter));
      setLetters(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setFormData({ ...initialForm, academicYear: activeYearName });
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (letter: IncomingLetter) => {
    setActiveLetter(letter);
    setFormData({
      letterNumber: letter.letterNumber,
      letterDate: letter.letterDate,
      receivedDate: letter.receivedDate,
      sender: letter.sender,
      subject: letter.subject,
      disposition: letter.disposition,
      academicYear: letter.academicYear || activeYearName,
      fileName: letter.fileName || '',
      notes: letter.notes || '',
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.letterNumber || !formData.sender || !formData.subject) return;

    if (isEditing && activeLetter) {
      await updateDoc(doc(db, 'incomingLetters', activeLetter.id), { ...formData });
    } else {
      await addDoc(collection(db, 'incomingLetters'), {
        ...formData,
        createdAt: new Date().toISOString(),
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (l: IncomingLetter) => {
    if (window.confirm(`Hapus pencatatan surat masuk "${l.letterNumber}"?`)) {
      await deleteDoc(doc(db, 'incomingLetters', l.id));
    }
  };

  const filtered = letters.filter((l) => {
    const matchSearch =
      l.letterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchYear = selectedYear === 'ALL' || (l.academicYear || activeYearName) === selectedYear;
    return matchSearch && matchYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-cyan-600" />
            <span>Agenda Surat Masuk</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan surat masuk dari dinas, yayasan, instansi luar, dan orang tua siswa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintAgendaOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Agenda</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Surat Masuk</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor surat, pengirim, atau perihal surat masuk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
          />
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
        >
          <option value="ALL">Semua Tahun Pelajaran</option>
          {academicYearNames.map((yr) => (
            <option key={yr} value={yr}>
              TA {yr}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nomor & Tanggal Surat</th>
                <th className="py-3 px-4">Tgl Diterima</th>
                <th className="py-3 px-4">Asal / Pengirim</th>
                <th className="py-3 px-4">Perihal / Isi Ringkas</th>
                <th className="py-3 px-4">Disposisi</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.length > 0 ? (
                filtered.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white font-mono">{l.letterNumber}</div>
                      <div className="text-[11px] text-slate-400">{l.letterDate}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-cyan-600">{l.receivedDate}</td>
                    <td className="py-3 px-4 font-bold">{l.sender}</td>
                    <td className="py-3 px-4 max-w-xs">{l.subject}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{l.disposition}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(l)}
                          className="p-1 rounded text-slate-500 hover:text-cyan-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
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
                    Belum ada surat masuk dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Surat Masuk' : 'Pencatatan Surat Masuk Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nomor Surat Asli</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 421/100/Disdik/2025"
                  value={formData.letterNumber}
                  onChange={(e) => setFormData({ ...formData, letterNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tanggal Surat</label>
                  <input
                    type="date"
                    required
                    value={formData.letterDate}
                    onChange={(e) => setFormData({ ...formData, letterDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tanggal Diterima</label>
                  <input
                    type="date"
                    required
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Asal Pengirim Surat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dinas Pendidikan dan Kebudayaan Prov. Lampung"
                  value={formData.sender}
                  onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Perihal / Ringkasan Isi</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Isi pokok surat..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Instruksi / Disposisi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Waka Kurikulum untuk ditindaklanjuti"
                    value={formData.disposition}
                    onChange={(e) => setFormData({ ...formData, disposition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tahun Pelajaran</label>
                  <select
                    value={formData.academicYear || activeYearName}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none"
                  >
                    {academicYearNames.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
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
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Agenda Surat Masuk */}
      {isPrintAgendaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-cyan-600" />
                <span>Pratinjau Buku Agenda Surat Masuk</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Print / PDF)</span>
                </button>
                <button onClick={() => setIsPrintAgendaOpen(false)} className="p-2 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="printable-area py-6 px-4">
              <KopSuratView />
              <div className="text-center my-4">
                <h2 className="text-base font-extrabold tracking-wide uppercase underline">
                  BUKU AGENDA SURAT MASUK
                </h2>
                <p className="text-xs text-slate-600">
                  Tahun Pelajaran {selectedYear === 'ALL' ? activeYearName : selectedYear}
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-900 text-[11px] mt-4">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                    <th className="border border-slate-900 p-2 w-8">No</th>
                    <th className="border border-slate-900 p-2">Tgl Terima</th>
                    <th className="border border-slate-900 p-2">Nomor & Tanggal Asli</th>
                    <th className="border border-slate-900 p-2 text-left">Asal Pengirim</th>
                    <th className="border border-slate-900 p-2 text-left">Perihal</th>
                    <th className="border border-slate-900 p-2 text-left">Disposisi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, idx) => (
                    <tr key={l.id} className="border-b border-slate-900">
                      <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 p-1.5 text-center">{l.receivedDate}</td>
                      <td className="border border-slate-900 p-1.5 font-mono">{l.letterNumber} ({l.letterDate})</td>
                      <td className="border border-slate-900 p-1.5 font-bold">{l.sender}</td>
                      <td className="border border-slate-900 p-1.5">{l.subject}</td>
                      <td className="border border-slate-900 p-1.5">{l.disposition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 flex justify-end text-xs">
                <div className="text-center w-60 space-y-1">
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
