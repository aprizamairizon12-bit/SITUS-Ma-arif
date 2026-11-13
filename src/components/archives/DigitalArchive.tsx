import React, { useState, useEffect } from 'react';
import {
  Archive,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Folder,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  FileCheck,
  X,
  Plus,
  Calendar,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { ArchiveDocument } from '../../types';
import { useAcademicYear } from '../../context/AcademicYearContext';

export const DigitalArchive: React.FC = () => {
  const { activeYearName, academicYearNames } = useAcademicYear();
  const [archives, setArchives] = useState<ArchiveDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState<ArchiveDocument | null>(null);

  const categories = [
    'Surat Masuk',
    'Surat Keluar',
    'Surat Tugas & SPT',
    'SPPD',
    'Surat Keputusan (SK)',
    'Berita Acara & Notulen',
    'Dokumen Siswa',
    'Dokumen Guru',
    'Dokumen Kurikulum & Akreditasi',
    'Dokumen Keuangan',
    'Dokumen Lainnya',
  ];

  const initialForm = {
    title: '',
    documentNumber: '',
    documentDate: new Date().toISOString().split('T')[0],
    academicYear: activeYearName,
    category: 'Surat Masuk',
    origin: 'Dinas / Lembaga Pengirim',
    destination: 'SMAS Ma\'arif 05 Padang Ratu',
    description: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'archives'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ArchiveDocument));
      setArchives(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!formData.title) {
        setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const handleUploadArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    setIsUploading(true);
    try {
      let fileUrl = '';
      const fileName = selectedFile ? selectedFile.name : 'Dokumen_Arsip.pdf';
      const fileType = selectedFile ? selectedFile.type : 'application/pdf';
      const fileSize = selectedFile ? selectedFile.size : 102400;

      if (selectedFile) {
        try {
          const storageRef = ref(storage, `archives/${Date.now()}_${selectedFile.name}`);
          const uploadRes = await uploadBytes(storageRef, selectedFile);
          fileUrl = await getDownloadURL(uploadRes.ref);
        } catch (storageErr) {
          console.warn("Storage upload fallback:", storageErr);
          // If Firebase Storage security rules or bucket is initializing, generate data URL preview
          fileUrl = await readFileAsDataURL(selectedFile);
        }
      }

      await addDoc(collection(db, 'archives'), {
        ...formData,
        academicYear: formData.academicYear || activeYearName,
        fileName,
        fileType,
        fileSize,
        fileUrl,
        createdAt: new Date().toISOString(),
      });

      setIsUploadOpen(false);
      setFormData({ ...initialForm, academicYear: activeYearName });
      setSelectedFile(null);
    } catch (err: any) {
      alert('Gagal mengunggah arsip: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = async (docItem: ArchiveDocument) => {
    if (window.confirm(`Hapus arsip "${docItem.title}"?`)) {
      await deleteDoc(doc(db, 'archives', docItem.id));
    }
  };

  const filteredArchives = archives.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || a.category === selectedCategory;
    const matchesYear = selectedYear === 'ALL' || (a.academicYear || activeYearName) === selectedYear;
    return matchesSearch && matchesCategory && matchesYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-indigo-600" />
            <span>Manajemen Arsip Dokumen Digital</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penyimpanan aman surat masuk, surat keluar, SK, berita acara, dokumen guru dan siswa
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Arsip Dokumen</span>
        </button>
      </div>

      {/* Category Folders Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
          }`}
        >
          <FolderOpen className="w-5 h-5 mb-2" />
          <div>
            <span className="text-xs font-bold block truncate">Semua Dokumen</span>
            <span className="text-[11px] opacity-80">{archives.length} Berkas</span>
          </div>
        </button>

        {categories.slice(0, 5).map((cat) => {
          const count = archives.filter((a) => a.category === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              <Folder className="w-5 h-5 mb-2 text-amber-500" />
              <div>
                <span className="text-xs font-bold block truncate">{cat}</span>
                <span className="text-[11px] opacity-80">{count} Berkas</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search and Category Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul arsip, nomor surat, perihal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
          />
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="ALL">Semua Tahun Pelajaran</option>
          {academicYearNames.map((yr) => (
            <option key={yr} value={yr}>
              TA {yr}
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="ALL">Semua Kategori Folder</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Archives Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArchives.length > 0 ? (
          filteredArchives.map((docItem) => (
            <div
              key={docItem.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      {docItem.fileType?.includes('image') ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {docItem.category}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate mt-1">
                        {docItem.title}
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(docItem)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-1 text-slate-500 text-[11px]">
                  <p>Nomor: <span className="font-mono text-slate-700 dark:text-slate-300">{docItem.documentNumber || '-'}</span></p>
                  <p>Tanggal: <span>{docItem.documentDate}</span></p>
                  <p className="line-clamp-2">{docItem.description || 'Tidak ada catatan tambahan.'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {docItem.fileName}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActivePreviewDoc(docItem)}
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                    title="Pratinjau Dokumen"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {docItem.fileUrl && (
                    <a
                      href={docItem.fileUrl}
                      download={docItem.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            Belum ada arsip dokumen digital yang diunggah.
          </div>
        )}
      </div>

      {/* Modal Upload Arsip */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Upload Dokumen ke Arsip Digital</span>
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadArchive} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Berkas Dokumen (PDF, JPG, PNG, atau Foto HP)
                </label>
                <input
                  type="file"
                  accept=".pdf, image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Judul Arsip Dokumen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SK Panitia PPDB 2024 / Sertifikat Akreditasi"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nomor Dokumen</label>
                  <input
                    type="text"
                    placeholder="Nomor surat jika ada"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tanggal Dokumen</label>
                  <input
                    type="date"
                    value={formData.documentDate}
                    onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kategori Folder</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
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
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Keterangan / Uraian</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan mengenai berkas ini..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50"
                >
                  {isUploading ? 'Menyimpan...' : 'Upload Dokumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Arsip */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pratinjau Arsip: {activePreviewDoc.title}
              </h3>
              <button onClick={() => setActivePreviewDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-xs space-y-1.5">
                <p><strong>Nomor:</strong> {activePreviewDoc.documentNumber || '-'}</p>
                <p><strong>Kategori:</strong> {activePreviewDoc.category}</p>
                <p><strong>Tanggal Dokumen:</strong> {activePreviewDoc.documentDate}</p>
                <p><strong>Deskripsi:</strong> {activePreviewDoc.description || '-'}</p>
              </div>

              {activePreviewDoc.fileUrl ? (
                activePreviewDoc.fileType?.includes('image') ? (
                  <div className="flex justify-center p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <img src={activePreviewDoc.fileUrl} alt="Arsip" className="max-h-96 object-contain rounded" />
                  </div>
                ) : (
                  <iframe src={activePreviewDoc.fileUrl} title="Preview PDF" className="w-full h-96 rounded-xl border border-slate-200 dark:border-slate-700" />
                )
              ) : (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  Dokumen fisik tersimpan di lemari arsip Tata Usaha SMAS Ma'arif 05 Padang Ratu.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
