import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Save,
  CheckCircle,
  Sliders,
  Maximize2,
  Minimize2,
  Copy,
  ChevronDown,
  Sparkles,
  Info,
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Student, Teacher, CreatedLetter } from '../../types';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { exportLetterToDocx } from '../../utils/docxExport';
import { LETTER_TEMPLATES, LetterTemplateDef } from './letterTemplates';

export const LetterGenerator: React.FC = () => {
  const { settings } = useSettings();
  const { activeYearName } = useAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [createdLetters, setCreatedLetters] = useState<CreatedLetter[]>([]);

  // Selected template & parameters
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('ket_aktif');
  const [letterNumber, setLetterNumber] = useState('');
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasKop, setHasKop] = useState(true);

  // Paper & Margins (Request: Pengaturan Margin Kertas Waktu Mencetak)
  const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [marginTop, setMarginTop] = useState<number>(25); // mm
  const [marginBottom, setMarginBottom] = useState<number>(25); // mm
  const [marginLeft, setMarginLeft] = useState<number>(30); // mm
  const [marginRight, setMarginRight] = useState<number>(20); // mm
  const [marginPreset, setMarginPreset] = useState<'standard' | 'narrow' | 'wide' | 'custom'>('standard');
  const [showMarginSettings, setShowMarginSettings] = useState<boolean>(true);

  // Signatory
  const [signeeName, setSigneeName] = useState(settings.headmasterName);
  const [signeeNip, setSigneeNip] = useState(settings.headmasterNip);
  const [signeeRole, setSigneeRole] = useState(`Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}`);

  // Dynamic payload fields
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [customTitle, setCustomTitle] = useState('SURAT KETERANGAN AKTIF SEKOLAH');
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  const [notification, setNotification] = useState<string | null>(null);

  // Group templates by category
  const categories = Array.from(new Set(LETTER_TEMPLATES.map((t) => t.category)));

  // Current active template definition
  const currentTemplate: LetterTemplateDef =
    LETTER_TEMPLATES.find((t) => t.key === selectedTemplateKey) || LETTER_TEMPLATES[0];

  // Initialize extra fields when template changes
  useEffect(() => {
    setExtraFields((prev) => ({
      ...currentTemplate.defaultFields,
      ...prev,
    }));
    setCustomTitle(currentTemplate.title);
  }, [selectedTemplateKey]);

  // Fetch students, teachers, and letters
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      setStudents(list);
      if (list.length > 0 && !selectedStudentId) {
        setSelectedStudentId(list[0].id);
      }
    });

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher));
      setTeachers(list);
      if (list.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(list[0].id);
      }
    });

    const unsubLetters = onSnapshot(
      query(collection(db, 'createdLetters'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreatedLetter));
        setCreatedLetters(list);
        generateAutoNumber(list.length + 1);
      }
    );

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubLetters();
    };
  }, []);

  const generateAutoNumber = (sequenceNum: number) => {
    const seqStr = String(sequenceNum).padStart(3, '0');
    const months = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const currentMonthRoman = months[new Date().getMonth()];
    const currentYear = new Date().getFullYear();

    const formatted = (settings.letterNumberFormat || '421.3/{nomor}/SMAS-M.05/TU/{bulan-romawi}/{tahun}')
      .replace('{nomor}', seqStr)
      .replace('{bulan-romawi}', currentMonthRoman)
      .replace('{bulan}', currentMonthRoman)
      .replace('{tahun}', String(currentYear));

    setLetterNumber(formatted);
  };

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

  const handleSelectTemplate = (template: LetterTemplateDef) => {
    setSelectedTemplateKey(template.key);
    setCustomTitle(template.title);
    setExtraFields(template.defaultFields);
  };

  const handleApplyPreset = (preset: 'standard' | 'narrow' | 'wide') => {
    setMarginPreset(preset);
    if (preset === 'standard') {
      setMarginTop(25);
      setMarginBottom(25);
      setMarginLeft(30);
      setMarginRight(20);
    } else if (preset === 'narrow') {
      setMarginTop(15);
      setMarginBottom(15);
      setMarginLeft(20);
      setMarginRight(15);
    } else if (preset === 'wide') {
      setMarginTop(30);
      setMarginBottom(30);
      setMarginLeft(35);
      setMarginRight(25);
    }
  };

  const handleCustomMarginChange = (side: 'top' | 'bottom' | 'left' | 'right', val: number) => {
    setMarginPreset('custom');
    if (side === 'top') setMarginTop(val);
    if (side === 'bottom') setMarginBottom(val);
    if (side === 'left') setMarginLeft(val);
    if (side === 'right') setMarginRight(val);
  };

  const handleSaveToDatabase = async () => {
    try {
      const newLetter: Omit<CreatedLetter, 'id'> = {
        letterType: selectedTemplateKey,
        letterTypeName: customTitle,
        letterNumber,
        title: customTitle,
        date: letterDate,
        academicYear: activeYearName,
        studentId: currentTemplate.target === 'student' ? currentStudent?.id : undefined,
        studentName: currentTemplate.target === 'student' ? currentStudent?.name : undefined,
        teacherId: currentTemplate.target === 'teacher' ? currentTeacher?.id : undefined,
        teacherName: currentTemplate.target === 'teacher' ? currentTeacher?.name : undefined,
        contentHtml: '', // rendered dynamically
        signeeName,
        signeeNip,
        signeeRole,
        paperSize: paperSize === 'Letter' ? 'A4' : paperSize,
        orientation,
        hasKop,
        status: 'diterbitkan',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'createdLetters'), newLetter);

      // Register to outgoingLetters agenda
      await addDoc(collection(db, 'outgoingLetters'), {
        letterNumber,
        letterDate,
        academicYear: activeYearName,
        recipient:
          currentTemplate.target === 'student'
            ? `Orang Tua / Siswa: ${currentStudent?.name || 'Siswa'}`
            : currentTemplate.target === 'teacher'
            ? currentTeacher?.name || 'Pegawai'
            : extraFields.kepadaYth || 'Instansi Terkait',
        subject: customTitle,
        signatory: signeeName,
        notes: `Diterbitkan melalui Pembuat Surat SITUS (${currentTemplate.label})`,
        category: selectedTemplateKey,
        createdAt: new Date().toISOString(),
      });

      setNotification(`Surat dengan nomor ${letterNumber} berhasil disimpan ke database dan buku agenda surat keluar!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert('Gagal menyimpan surat: ' + e.message);
    }
  };

  const handleExportDocx = async () => {
    const bodyText = currentTemplate.getDocxText({
      student: currentStudent,
      teacher: currentTeacher,
      settings,
      extra: extraFields,
      letterNumber,
      letterDate,
    });

    await exportLetterToDocx({
      title: customTitle,
      letterNumber,
      bodyText,
      signeeName,
      signeeNip,
      signeeRole,
      settings,
      hasKop,
      filename: `${customTitle.replace(/\s+/g, '_')}_${currentStudent?.name || currentTeacher?.name || 'Sekolah'}.docx`,
    });
  };

  const handlePrint = () => {
    // Sync css variables to document element
    document.documentElement.style.setProperty('--print-margin-top', `${marginTop}mm`);
    document.documentElement.style.setProperty('--print-margin-right', `${marginRight}mm`);
    document.documentElement.style.setProperty('--print-margin-bottom', `${marginBottom}mm`);
    document.documentElement.style.setProperty('--print-margin-left', `${marginLeft}mm`);
    window.print();
  };

  // Determine paper container class based on paper size and orientation
  const getPaperClass = () => {
    if (orientation === 'landscape') {
      if (paperSize === 'F4') return 'paper-f4-landscape';
      if (paperSize === 'Letter') return 'paper-letter-landscape';
      return 'paper-a4-landscape';
    } else {
      if (paperSize === 'F4') return 'paper-f4';
      if (paperSize === 'Letter') return 'paper-letter';
      return 'paper-a4';
    }
  };

  return (
    <div className="space-y-6">
      {/* Injected Print Stylesheet with Dynamic Margins */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${
                  paperSize === 'F4'
                    ? '215mm 330mm'
                    : paperSize === 'Letter'
                    ? '216mm 279mm'
                    : '210mm 297mm'
                } ${orientation};
                margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm !important;
              }
              .printable-area {
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
              }
            }
          `,
        }}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header bar with vibrant gradients */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-blue-50/50 to-white dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Modul Pembuat Surat Resmi Terpadu</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                  22 Template Lengkap
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kop resmi institusi, format lengkap tanpa kosong, pengaturan margin kertas cetak presisi & ekspor DOCX/PDF
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportDocx}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download DOCX (Word)</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-900 to-blue-950 hover:from-slate-800 hover:to-blue-900 text-white text-xs font-semibold shadow-md shadow-slate-900/20 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Cetak Dokumen</span>
          </button>
          <button
            onClick={handleSaveToDatabase}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan ke Database</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Selection, Margin Controls & Form Fields (no-print) */}
        <div className="no-print lg:col-span-5 space-y-4">
          {/* Template Selector Accordion */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Pilih Template Surat ({LETTER_TEMPLATES.length} Jenis)</span>
              </p>
              <span className="text-[11px] text-blue-600 font-semibold">{currentTemplate.label}</span>
            </div>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {categories.map((cat, cIdx) => {
                const itemsInCat = LETTER_TEMPLATES.filter((t) => t.category === cat);
                return (
                  <div key={cIdx} className="space-y-1">
                    <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300 px-2 py-1 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/40 rounded-lg">
                      {cat}
                    </div>
                    <div className="grid grid-cols-1 gap-1 pl-1">
                      {itemsInCat.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => handleSelectTemplate(item)}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                            selectedTemplateKey === item.key
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {selectedTemplateKey === item.key && (
                            <CheckCircle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dedicated Paper & Print Margins Control (Pengaturan Margin Kertas Waktu Mencetak) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-amber-500/30 dark:border-amber-500/20 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Pengaturan Kertas & Margin Cetak</h3>
                  <p className="text-[11px] text-slate-500">Sesuaikan margin cetak (mm) dan ukuran kertas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMarginSettings(!showMarginSettings)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showMarginSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showMarginSettings && (
              <div className="space-y-4">
                {/* Paper Size & Orientation */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Ukuran Kertas:
                    </label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium outline-none"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="F4">F4 / Folio (215 × 330 mm)</option>
                      <option value="Letter">Letter (216 × 279 mm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Orientasi:
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium outline-none"
                    >
                      <option value="portrait">Tegak (Portrait)</option>
                      <option value="landscape">Mendatar (Landscape)</option>
                    </select>
                  </div>
                </div>

                {/* Margin Presets */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Preset Margin Standar:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('standard')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition text-center cursor-pointer ${
                        marginPreset === 'standard'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Standar TU (2.5 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('narrow')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition text-center cursor-pointer ${
                        marginPreset === 'narrow'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Ringkas (1.5 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('wide')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition text-center cursor-pointer ${
                        marginPreset === 'wide'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Luas / Berkas (3 cm)
                    </button>
                  </div>
                </div>

                {/* 4-Sided Margin Inputs (mm) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] block">
                    Penyesuaian Margin Kertas (Milimeter / mm):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Atas (Top)</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="5"
                          max="60"
                          value={marginTop}
                          onChange={(e) => handleCustomMarginChange('top', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400 ml-1">mm</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Kiri (Left)</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="5"
                          max="60"
                          value={marginLeft}
                          onChange={(e) => handleCustomMarginChange('left', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400 ml-1">mm</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Kanan (Right)</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="5"
                          max="60"
                          value={marginRight}
                          onChange={(e) => handleCustomMarginChange('right', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400 ml-1">mm</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Bawah (Bottom)</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="5"
                          max="60"
                          value={marginBottom}
                          onChange={(e) => handleCustomMarginChange('bottom', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400 ml-1">mm</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    * Margin ini otomatis diterapkan langsung ke lembar pratinjau dan dialog cetak browser (Ctrl + P).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Document Parameters & Dynamic Fields */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
            <p className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] border-b border-slate-100 dark:border-slate-800 pb-2">
              Parameter Isi Surat: {currentTemplate.label}
            </p>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nomor Surat Otomatis
              </label>
              <input
                type="text"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tanggal Surat
                </label>
                <input
                  type="date"
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Kop Resmi</span>
                <input
                  type="checkbox"
                  checked={hasKop}
                  onChange={(e) => setHasKop(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Select student if template targets student */}
            {currentTemplate.target === 'student' && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Peserta Didik dari Database:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-medium"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.nis} - {s.className})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Select teacher if template targets teacher */}
            {currentTemplate.target === 'teacher' && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Guru / Pegawai Ditugaskan:
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-medium"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.position})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Specific Form Fields for the Template */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Formulir Rincian Dokumen:
              </span>
              {currentTemplate.fields.map((field) => (
                <div key={field.key}>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={extraFields[field.key] || ''}
                      onChange={(e) => setExtraFields({ ...extraFields, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-xs"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={extraFields[field.key] || ''}
                      onChange={(e) => setExtraFields({ ...extraFields, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-xs"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Signatory Settings */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">Penandatangan Dokumen:</label>
              <input
                type="text"
                value={signeeName}
                onChange={(e) => setSigneeName(e.target.value)}
                placeholder="Nama Penandatangan"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
              <input
                type="text"
                value={signeeNip}
                onChange={(e) => setSigneeNip(e.target.value)}
                placeholder="NIP Penandatangan"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
              <input
                type="text"
                value={signeeRole}
                onChange={(e) => setSigneeRole(e.target.value)}
                placeholder="Jabatan"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Right Column: High-Fidelity Paper Simulation Preview with Live Margin Paddings */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Paper Info Ribbon */}
          <div className="no-print w-full flex items-center justify-between text-xs text-slate-500 mb-2 px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Lembar Kerja: <strong>{paperSize} ({orientation})</strong></span>
            </span>
            <span className="font-mono text-[11px]">
              Margin: T:{marginTop}mm · R:{marginRight}mm · B:{marginBottom}mm · L:{marginLeft}mm
            </span>
          </div>

          <div className="w-full overflow-x-auto flex justify-center p-3 sm:p-5 bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-950 dark:to-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner">
            {/* Paper Sheet Simulator with exact dynamic padding from margins */}
            <div
              className={`printable-area bg-white text-black shadow-2xl transition-all duration-200 ${getPaperClass()}`}
              style={{
                fontFamily: settings.kopFont || 'Times New Roman, serif',
                paddingTop: `${marginTop}mm`,
                paddingRight: `${marginRight}mm`,
                paddingBottom: `${marginBottom}mm`,
                paddingLeft: `${marginLeft}mm`,
                boxSizing: 'border-box',
              }}
            >
              {/* Kop Surat Resmi */}
              {hasKop && <KopSuratView />}

              {/* Title & Number */}
              <div className="text-center mt-3 mb-5">
                <h2 className="text-sm sm:text-base font-bold tracking-wider underline uppercase">
                  {customTitle}
                </h2>
                <p className="text-xs sm:text-sm mt-0.5">
                  Nomor: {letterNumber}
                </p>
              </div>

              {/* Render Selected Authentic Template (Never Empty!) */}
              {currentTemplate.renderPreview({
                student: currentStudent,
                teacher: currentTeacher,
                settings,
                extra: extraFields,
                letterNumber,
                letterDate,
              })}

              {/* Formal Indonesian Signature Block (Right Aligned) */}
              <div className="mt-8 flex justify-end text-xs sm:text-sm">
                <div className="w-64 text-center">
                  <p>Padang Ratu, {new Date(letterDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="mt-0.5 font-medium">{signeeRole}</p>
                  <div className="h-16 flex items-center justify-center">
                    {/* Space for school seal / signature */}
                  </div>
                  <p className="font-bold underline uppercase">{signeeName}</p>
                  <p className="font-mono text-xs">NIP. {signeeNip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
