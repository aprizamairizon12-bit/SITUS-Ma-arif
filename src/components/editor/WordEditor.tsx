import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Printer,
  Download,
  Save,
  FilePlus,
  FolderOpen,
  Image as ImageIcon,
  Check,
  Eye,
  FileText,
  Settings2,
  X,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';
import { exportLetterToDocx } from '../../utils/docxExport';

export const WordEditor: React.FC = () => {
  const { settings } = useSettings();
  const [docTitle, setDocTitle] = useState('Dokumen Resmi SMAS Ma\'arif 05 Padang Ratu');
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [hasKop, setHasKop] = useState(true);
  const [marginTop, setMarginTop] = useState(25);
  const [marginBottom, setMarginBottom] = useState(25);
  const [marginLeft, setMarginLeft] = useState(25);
  const [marginRight, setMarginRight] = useState(25);

  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [isSavedListOpen, setIsSavedListOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const defaultContent = `
    <h2 style="text-align: center;"><strong>SURAT KEPUTUSAN KEPALA SEKOLAH</strong></h2>
    <p style="text-align: center;">Nomor: 421.3/001/SMAS-M.05/TU/2025</p>
    <p style="text-align: center;"><strong>TENTANG</strong></p>
    <p style="text-align: center;"><strong>PEMBAGIAN TUGAS GURU DAN TENAGA KEPENDIDIKAN</strong></p>
    <p><br></p>
    <p>Menimbang: Bahwa demi kelancaran proses belajar mengajar pada SMAS Ma'arif 05 Padang Ratu tahun pelajaran ${settings.academicYear}, maka perlu menetapkan pembagian tugas kerja bagi pendidik dan tenaga kependidikan.</p>
    <p>Mengingat: Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.</p>
    <p><br></p>
    <p style="text-align: center;"><strong>MEMUTUSKAN</strong></p>
    <p>Menetapkan susunan penugasan guru dan staf tata usaha sebagai berikut:</p>
    <table style="width: 100%;">
      <tbody>
        <tr>
          <th>No</th>
          <th>Nama Pegawai</th>
          <th>Jabatan</th>
          <th>Tugas Pokok</th>
        </tr>
        <tr>
          <td>1</td>
          <td>H. M. Syaifullah, M.Pd.</td>
          <td>Kepala Sekolah</td>
          <td>Penanggung Jawab Utama</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Ahmad Fauzi, S.Kom.</td>
          <td>Kepala Tata Usaha</td>
          <td>Pengelola Administrasi Terpadu</td>
        </tr>
      </tbody>
    </table>
    <p><br></p>
    <p>Keputusan ini berlaku sejak tanggal ditetapkan dengan ketentuan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.</p>
  `;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
    ],
    content: defaultContent,
  });

  useEffect(() => {
    const q = query(collection(db, 'createdLetters'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSavedDocs(docs);
    });

    return () => unsub();
  }, []);

  const handleSaveDocument = async () => {
    if (!editor) return;
    const htmlContent = editor.getHTML();

    try {
      if (currentDocId) {
        await updateDoc(doc(db, 'createdLetters', currentDocId), {
          title: docTitle,
          contentHtml: htmlContent,
          paperSize,
          orientation,
          hasKop,
          updatedAt: new Date().toISOString(),
        });
        setNotification(`Dokumen "${docTitle}" berhasil diperbarui.`);
      } else {
        const ref = await addDoc(collection(db, 'createdLetters'), {
          title: docTitle,
          letterType: 'editor_document',
          letterTypeName: 'Dokumen Editor Word',
          letterNumber: '421.3/EDT/' + Date.now().toString().slice(-4),
          date: new Date().toISOString().split('T')[0],
          contentHtml: htmlContent,
          signeeName: settings.headmasterName,
          signeeNip: settings.headmasterNip,
          signeeRole: 'Kepala SMA Ma\'arif 05 Padang Ratu',
          paperSize,
          orientation,
          hasKop,
          status: 'diterbitkan',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setCurrentDocId(ref.id);
        setNotification(`Dokumen baru "${docTitle}" berhasil disimpan ke database.`);
      }
      setTimeout(() => setNotification(null), 3500);
    } catch (e: any) {
      alert('Gagal menyimpan: ' + e.message);
    }
  };

  const handleOpenDoc = (d: any) => {
    if (editor) {
      editor.commands.setContent(d.contentHtml || '');
      setDocTitle(d.title || 'Dokumen Tanpa Judul');
      setPaperSize(d.paperSize || 'A4');
      setHasKop(d.hasKop ?? true);
      setCurrentDocId(d.id);
      setIsSavedListOpen(false);
      setNotification(`Dokumen "${d.title}" berhasil dimuat.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleNewDocument = () => {
    if (editor) {
      editor.commands.setContent('<p>Ketik teks dokumen Anda di sini...</p>');
      setDocTitle('Dokumen Baru');
      setCurrentDocId(null);
    }
  };

  const handleAddTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  const handleExportDocx = async () => {
    if (!editor) return;
    await exportLetterToDocx({
      title: docTitle,
      letterNumber: 'RESMI/' + new Date().getFullYear(),
      bodyText: editor.getText(),
      signeeName: settings.headmasterName,
      signeeNip: settings.headmasterNip,
      signeeRole: 'Kepala Sekolah',
      settings,
      hasKop,
      filename: `${docTitle.replace(/\s+/g, '_')}.docx`,
    });
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Application Bar */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            W
          </div>
          <div>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="font-bold text-slate-900 dark:text-white text-base bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-600"
              placeholder="Judul Dokumen..."
            />
            <p className="text-[11px] text-slate-400">Editor Dokumen Pengalaman Microsoft Word Terintegrasi</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleNewDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Baru</span>
          </button>
          <button
            onClick={() => setIsSavedListOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Buka ({savedDocs.length})</span>
          </button>
          <button
            onClick={handleExportDocx}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download DOCX</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={handleSaveDocument}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Word-like Ribbon Toolbar */}
      <div className="no-print bg-slate-100 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1 text-xs">
        {/* Undo / Redo */}
        <button
          onClick={() => editor?.chain().focus().undo().run()}
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().redo().run()}
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Text Formats */}
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg font-bold transition ${
            editor?.isActive('bold') ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
          title="Bold (Tebal)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg italic transition ${
            editor?.isActive('italic') ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
          title="Italic (Miring)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg transition ${
            editor?.isActive('underline') ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
          title="Underline (Garis Bawah)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-lg transition ${
            editor?.isActive('strike') ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
          title="Strikethrough (Coret)"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Headings */}
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg font-bold ${
            editor?.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg font-bold ${
            editor?.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Heading 2"
        >
          H2
        </button>

        <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Text Alignments */}
        <button
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded-lg ${
            editor?.isActive({ textAlign: 'left' }) ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Rata Kiri"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded-lg ${
            editor?.isActive({ textAlign: 'center' }) ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Rata Tengah"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded-lg ${
            editor?.isActive({ textAlign: 'right' }) ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Rata Kanan"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded-lg ${
            editor?.isActive({ textAlign: 'justify' }) ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Rata Kiri Kanan"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Lists */}
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg ${
            editor?.isActive('bulletList') ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg ${
            editor?.isActive('orderedList') ? 'bg-blue-600 text-white' : 'hover:bg-white dark:hover:bg-slate-700'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Table & Images */}
        <button
          onClick={handleAddTable}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-medium"
          title="Sisipkan Tabel"
        >
          <TableIcon className="w-4 h-4" />
          <span>Tabel</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Paper & Margin Controls */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span>Kertas:</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as 'A4' | 'F4')}
              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
            >
              <option value="A4">A4 (21 x 29.7 cm)</option>
              <option value="F4">F4 / Folio (21.5 x 33 cm)</option>
            </select>
          </label>

          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-1">
            <span>Orientasi:</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as any)}
              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>

          {/* Margin Quick Adjuster */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px]">
            <span className="font-semibold text-slate-500">Margin(mm):</span>
            <span title="Atas">T:</span>
            <input
              type="number"
              min="5"
              max="50"
              value={marginTop}
              onChange={(e) => setMarginTop(Number(e.target.value))}
              className="w-10 px-1 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-center text-xs"
            />
            <span title="Kiri">L:</span>
            <input
              type="number"
              min="5"
              max="50"
              value={marginLeft}
              onChange={(e) => setMarginLeft(Number(e.target.value))}
              className="w-10 px-1 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-center text-xs"
            />
            <span title="Kanan">R:</span>
            <input
              type="number"
              min="5"
              max="50"
              value={marginRight}
              onChange={(e) => setMarginRight(Number(e.target.value))}
              className="w-10 px-1 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-center text-xs"
            />
            <span title="Bawah">B:</span>
            <input
              type="number"
              min="5"
              max="50"
              value={marginBottom}
              onChange={(e) => setMarginBottom(Number(e.target.value))}
              className="w-10 px-1 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-center text-xs"
            />
          </div>

          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-300 dark:border-slate-700">
            <input
              type="checkbox"
              checked={hasKop}
              onChange={(e) => setHasKop(e.target.checked)}
              className="rounded"
            />
            <span>Kop Resmi</span>
          </label>
        </div>
      </div>

      {/* Dynamic print stylesheet with user-defined margins */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${paperSize === 'F4' ? '215mm 330mm' : '210mm 297mm'} ${orientation};
                margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm !important;
              }
              .printable-area {
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          `,
        }}
      />

      {/* Main Workspace: Real Paper Sheet Simulator */}
      <div className="w-full overflow-x-auto flex justify-center p-4 sm:p-8 bg-slate-200 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 min-h-[750px]">
        <div
          className={`printable-area bg-white text-slate-900 shadow-2xl p-10 sm:p-14 transition-all ${
            paperSize === 'F4'
              ? orientation === 'landscape'
                ? 'paper-f4-landscape'
                : 'paper-f4'
              : orientation === 'landscape'
              ? 'paper-a4-landscape'
              : 'paper-a4'
          }`}
          style={{
            fontFamily: 'Times New Roman, serif',
            paddingTop: `${marginTop}mm`,
            paddingBottom: `${marginBottom}mm`,
            paddingLeft: `${marginLeft}mm`,
            paddingRight: `${marginRight}mm`,
          }}
        >
          {/* Header Kop Surat */}
          {hasKop && <KopSuratView />}

          {/* Tiptap Rich Text Content Area */}
          <div className="tiptap-editor-content mt-4 min-h-[450px]">
            <EditorContent editor={editor} />
          </div>

          {/* Footer signature line */}
          <div className="mt-14 flex justify-end text-xs">
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

      {/* Modal Daftar Dokumen Tersimpan */}
      {isSavedListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span>Buka Dokumen Tersimpan</span>
              </h3>
              <button onClick={() => setIsSavedListOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              {savedDocs.length > 0 ? (
                savedDocs.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleOpenDoc(d)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{d.title}</p>
                      <p className="text-slate-400 mt-0.5">
                        {d.letterNumber} • Terakhir diperbarui: {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                    <button className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs">
                      Buka
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-6">Belum ada dokumen tersimpan di database.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
