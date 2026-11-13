import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { OutgoingLetter } from '../../types';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';

export const OutgoingLetters: React.FC = () => {
  const { settings } = useSettings();
  const { activeYearName, academicYearNames } = useAcademicYear();
  const [letters, setLetters] = useState<OutgoingLetter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintAgendaOpen, setIsPrintAgendaOpen] = useState(false);
  const [activeLetter, setActiveLetter] = useState<OutgoingLetter | null>(null);

  const initialForm: Omit<OutgoingLetter, 'id' | 'createdAt'> = {
    letterNumber: '',
    letterDate: new Date().toISOString().split('T')[0],
    recipient: '',
    subject: '',
    signatory: settings.headmasterName,
    academicYear: activeYearName,
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'outgoingLetters'), orderBy('letterDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as OutgoingLetter));
      setLetters(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      ...initialForm,
      signatory: settings.headmasterName,
      academicYear: activeYearName,
      letterNumber: `421.3/${String(letters.length + 1).padStart(3, '0')}/SMA-M.05/TU/${new Date().getFullYear()}`,
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (letter: OutgoingLetter) => {
    setActiveLetter(letter);
    setFormData({
      letterNumber: letter.letterNumber,
      letterDate: letter.letterDate,
      recipient: letter.recipient,
      subject: letter.subject,
      signatory: letter.signatory,
      academicYear: letter.academicYear || activeYearName,
      notes: letter.notes || '',
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.letterNumber || !formData.recipient || !formData.subject) return;

    if (isEditing && activeLetter) {
      await updateDoc(doc(db, 'outgoingLetters', activeLetter.id), { ...formData });
    } else {
      await addDoc(collection(db, 'outgoingLetters'), {
        ...formData,
        createdAt: new Date().toISOString(),
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (l: OutgoingLetter) => {
    if (window.confirm(`Hapus pencatatan surat keluar "${l.letterNumber}"?`)) {
      await deleteDoc(doc(db, 'outgoingLetters', l.id));
    }
  };

  const filtered = letters.filter((l) => {
    const matchSearch =
      l.letterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchYear = selectedYear === 'ALL' || (l.academicYear || activeYearName) === selectedYear;
    return matchSearch && matchYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-rose-600" />
            <span>Agenda Surat Keluar</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Buku register dan arsip nomor surat keluar resmi SMAS Ma'arif 05 Padang Ratu
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Surat Keluar</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor surat, penerima, atau perihal surat keluar..."
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
                <th className="py-3 px-4">Nomor Surat Keluar</th>
                <th className="py-3 px-4">Tanggal Surat</th>
                <th className="py-3 px-4">Tujuan / Penerima</th>
                <th className="py-3 px-4">Perihal / Hal</th>
                <th className="py-3 px-4">Penandatangan</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.length > 0 ? (
                filtered.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white">
                      {l.letterNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-600">{l.letterDate}</td>
                    <td className="py-3 px-4 font-bold">{l.recipient}</td>
                    <td className="py-3 px-4 max-w-xs">{l.subject}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{l.signatory}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(l)}
                          className="p-1 rounded text-slate-500 hover:text-rose-600"
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
                    Belum ada surat keluar dicatat.
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
                {isEditing ? 'Edit Surat Keluar' : 'Pencatatan Surat Keluar Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nomor Surat Keluar</label>
                <input
                  type="text"
                  required
                  value={formData.letterNumber}
                  onChange={(e) => setFormData({ ...formData, letterNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono outline-none"
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
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Penandatangan</label>
                  <input
                    type="text"
                    required
                    value={formData.signatory}
                    onChange={(e) => setFormData({ ...formData, signatory: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tujuan / Penerima Surat</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Orang Tua / Wali Siswa Kelas XII"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
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

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Perihal / Isi Ringkas</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Isi perihal surat keluar..."
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Agenda Surat Keluar */}
      {isPrintAgendaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-rose-600" />
                <span>Pratinjau Buku Agenda Surat Keluar</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
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
                  BUKU AGENDA SURAT KELUAR
                </h2>
                <p className="text-xs text-slate-600">
                  Tahun Pelajaran {selectedYear === 'ALL' ? activeYearName : selectedYear}
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-900 text-[11px] mt-4">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                    <th className="border border-slate-900 p-2 w-8">No</th>
                    <th className="border border-slate-900 p-2">Nomor Surat</th>
                    <th className="border border-slate-900 p-2">Tanggal</th>
                    <th className="border border-slate-900 p-2 text-left">Tujuan / Penerima</th>
                    <th className="border border-slate-900 p-2 text-left">Perihal</th>
                    <th className="border border-slate-900 p-2">Penandatangan</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, idx) => (
                    <tr key={l.id} className="border-b border-slate-900">
                      <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-900 p-1.5 font-mono font-bold">{l.letterNumber}</td>
                      <td className="border border-slate-900 p-1.5 text-center">{l.letterDate}</td>
                      <td className="border border-slate-900 p-1.5 font-bold">{l.recipient}</td>
                      <td className="border border-slate-900 p-1.5">{l.subject}</td>
                      <td className="border border-slate-900 p-1.5 text-center">{l.signatory}</td>
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
