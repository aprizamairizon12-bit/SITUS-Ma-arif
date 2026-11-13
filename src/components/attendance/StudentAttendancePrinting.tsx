import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  CalendarCheck,
  FileSpreadsheet,
  Download,
  Users,
  GraduationCap,
  Layers,
  Calendar,
  BookOpen,
  Sliders,
  Check,
  Eye,
  RefreshCw,
  X,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rombel, RombelMember, Student, Teacher } from '../../types';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  exportMonthlyClassAttendanceSheetToExcel,
  exportTeacherSubjectAttendanceSheetToExcel,
} from '../../utils/excelExport';

export interface StudentAttendancePrintingProps {
  initialSubTab?: 'class' | 'teacher';
}

const MONTHS_LIST = [
  { value: 0, label: 'Januari' },
  { value: 1, label: 'Februari' },
  { value: 2, label: 'Maret' },
  { value: 3, label: 'April' },
  { value: 4, label: 'Mei' },
  { value: 5, label: 'Juni' },
  { value: 6, label: 'Juli' },
  { value: 7, label: 'Agustus' },
  { value: 8, label: 'September' },
  { value: 9, label: 'Oktober' },
  { value: 10, label: 'November' },
  { value: 11, label: 'Desember' },
];

export const StudentAttendancePrinting: React.FC<StudentAttendancePrintingProps> = ({
  initialSubTab = 'class',
}) => {
  const { settings } = useSettings();
  const { profile } = useAuth();
  const { activeYearName, activeSemester, academicYearNames } = useAcademicYear();

  // Active Submenu: 'class' (Absensi Kelas Bulanan) vs 'teacher' (Absensi Pegangan Guru)
  const [subTab, setSubTab] = useState<'class' | 'teacher'>(initialSubTab);

  // Firestore collections
  const [rombels, setRombels] = useState<Rombel[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [members, setMembers] = useState<RombelMember[]>([]);

  // --------------------------------------------------------------------------
  // STATE: A. ABSENSI KELAS (BULANAN)
  // --------------------------------------------------------------------------
  const [classAcademicYear, setClassAcademicYear] = useState<string>(activeYearName || settings.academicYear || '2026/2027');
  const [classSemester, setClassSemester] = useState<'Ganjil' | 'Genap'>(activeSemester || 'Ganjil');
  const [classRombelId, setClassRombelId] = useState<string>('');
  const [classMonthIndex, setClassMonthIndex] = useState<number>(new Date().getMonth());
  const [classYear, setClassYear] = useState<number>(new Date().getFullYear());
  const [customHomeroom, setCustomHomeroom] = useState<string>('');

  // --------------------------------------------------------------------------
  // STATE: B. ABSENSI PEGANGAN GURU (PERTEMUAN)
  // --------------------------------------------------------------------------
  const [teacherId, setTeacherId] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherNip, setTeacherNip] = useState<string>('');
  const [teacherSubject, setTeacherSubject] = useState<string>('Bahasa Indonesia');
  const [teacherRombelId, setTeacherRombelId] = useState<string>('');
  const [teacherAcademicYear, setTeacherAcademicYear] = useState<string>(activeYearName || settings.academicYear || '2026/2027');
  const [teacherSemester, setTeacherSemester] = useState<'Ganjil' | 'Genap'>(activeSemester || 'Ganjil');
  const [meetingCount, setMeetingCount] = useState<number>(16);

  useEffect(() => {
    if (activeYearName) {
      setClassAcademicYear(activeYearName);
      setTeacherAcademicYear(activeYearName);
    }
    if (activeSemester) {
      setClassSemester(activeSemester);
      setTeacherSemester(activeSemester);
    }
  }, [activeYearName, activeSemester]);

  // --------------------------------------------------------------------------
  // STATE: C. PENGATURAN CETAK (PRINT SETTINGS)
  // --------------------------------------------------------------------------
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('F4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [margins, setMargins] = useState({ top: 10, bottom: 10, left: 15, right: 10 }); // in mm
  const [marginPreset, setMarginPreset] = useState<'compact' | 'normal' | 'wide'>('compact');
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('xs');
  const [showTwoLogos, setShowTwoLogos] = useState<boolean>(true);
  const [signatureCity, setSignatureCity] = useState<string>('Padang Ratu');
  const [signatureDate, setSignatureDate] = useState<string>(
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  );

  // Modal Preview state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Sync initial subTab prop
  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Load Rombels, Teachers, Students, RombelMembers
  useEffect(() => {
    const unsubRombels = onSnapshot(query(collection(db, 'rombels'), orderBy('name', 'asc')), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rombel));
      setRombels(docs);
      if (docs.length > 0 && !classRombelId) {
        setClassRombelId(docs[0].id);
      }
      if (docs.length > 0 && !teacherRombelId) {
        setTeacherRombelId(docs[0].id);
      }
    });

    const unsubTeachers = onSnapshot(query(collection(db, 'teachers'), orderBy('name', 'asc')), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher));
      setTeachers(docs);
      if (docs.length > 0 && !teacherId) {
        setTeacherId(docs[0].id);
        setTeacherName(docs[0].name);
        setTeacherNip(docs[0].nip || docs[0].nuptk || '-');
        if (docs[0].subject) setTeacherSubject(docs[0].subject);
      }
    });

    const unsubStudents = onSnapshot(query(collection(db, 'students'), orderBy('name', 'asc')), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
    });

    const unsubMembers = onSnapshot(query(collection(db, 'rombel_members'), orderBy('studentName', 'asc')), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RombelMember)));
    });

    return () => {
      unsubRombels();
      unsubTeachers();
      unsubStudents();
      unsubMembers();
    };
  }, []);

  // Set teacher info when teacher select changes
  const handleTeacherSelect = (id: string) => {
    setTeacherId(id);
    const found = teachers.find((t) => t.id === id);
    if (found) {
      setTeacherName(found.name);
      setTeacherNip(found.nip || found.nuptk || '-');
      if (found.subject) setTeacherSubject(found.subject);
    }
  };

  // Selected Rombel for Class Attendance
  const activeClassRombel = useMemo(() => {
    return rombels.find((r) => r.id === classRombelId) || null;
  }, [rombels, classRombelId]);

  // Selected Rombel for Teacher Attendance
  const activeTeacherRombel = useMemo(() => {
    return rombels.find((r) => r.id === teacherRombelId) || null;
  }, [rombels, teacherRombelId]);

  // Students for Class Attendance
  const classStudents = useMemo(() => {
    if (!classRombelId) return [];
    const fromMembers = members.filter((m) => m.rombelId === classRombelId);
    if (fromMembers.length > 0) {
      return fromMembers.map((m) => ({
        nis: m.nis,
        studentName: m.studentName,
        gender: m.gender,
      }));
    }
    // Fallback: match by rombel name in students collection
    if (activeClassRombel) {
      const fromStudents = students.filter(
        (s) => s.className?.toLowerCase() === activeClassRombel.name.toLowerCase()
      );
      if (fromStudents.length > 0) {
        return fromStudents.map((s) => ({
          nis: s.nis,
          studentName: s.name,
          gender: (s.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
        }));
      }
    }
    return [];
  }, [classRombelId, members, students, activeClassRombel]);

  // Students for Teacher Attendance
  const teacherStudents = useMemo(() => {
    if (!teacherRombelId) return [];
    const fromMembers = members.filter((m) => m.rombelId === teacherRombelId);
    if (fromMembers.length > 0) {
      return fromMembers.map((m) => ({
        nis: m.nis,
        studentName: m.studentName,
        gender: m.gender,
      }));
    }
    if (activeTeacherRombel) {
      const fromStudents = students.filter(
        (s) => s.className?.toLowerCase() === activeTeacherRombel.name.toLowerCase()
      );
      if (fromStudents.length > 0) {
        return fromStudents.map((s) => ({
          nis: s.nis,
          studentName: s.name,
          gender: (s.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
        }));
      }
    }
    return [];
  }, [teacherRombelId, members, students, activeTeacherRombel]);

  // Days in selected Month
  const daysInSelectedMonth = useMemo(() => {
    return new Date(classYear, classMonthIndex + 1, 0).getDate();
  }, [classYear, classMonthIndex]);

  // Day list with day initials for Class Attendance
  const monthDayList = useMemo(() => {
    const arr: Array<{ day: number; isSunday: boolean; dayInitial: string }> = [];
    const initials = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // 0 = Minggu
    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const dt = new Date(classYear, classMonthIndex, d);
      const dayOfWeek = dt.getDay();
      arr.push({
        day: d,
        isSunday: dayOfWeek === 0,
        dayInitial: initials[dayOfWeek],
      });
    }
    return arr;
  }, [classYear, classMonthIndex, daysInSelectedMonth]);

  // Presets for margin
  const applyMarginPreset = (preset: 'compact' | 'normal' | 'wide') => {
    setMarginPreset(preset);
    if (preset === 'compact') {
      setMargins({ top: 8, bottom: 8, left: 10, right: 8 });
    } else if (preset === 'normal') {
      setMargins({ top: 12, bottom: 12, left: 15, right: 12 });
    } else {
      setMargins({ top: 18, bottom: 18, left: 20, right: 18 });
    }
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Export Class Attendance Sheet to Excel
  const handleExportClassExcel = () => {
    const rombelName = activeClassRombel ? activeClassRombel.name : 'Kelas';
    const monthName = MONTHS_LIST[classMonthIndex]?.label || 'Bulan';
    const homeroom = customHomeroom || activeClassRombel?.homeroomTeacherName || '-';

    exportMonthlyClassAttendanceSheetToExcel(
      rombelName,
      monthName,
      classYear,
      daysInSelectedMonth,
      classStudents,
      homeroom,
      classAcademicYear,
      classSemester
    );
  };

  // Export Teacher Attendance Sheet to Excel
  const handleExportTeacherExcel = () => {
    const rombelName = activeTeacherRombel ? activeTeacherRombel.name : 'Kelas';
    exportTeacherSubjectAttendanceSheetToExcel(
      teacherName || 'Guru',
      teacherSubject,
      rombelName,
      meetingCount,
      teacherStudents,
      teacherAcademicYear,
      teacherSemester
    );
  };

  // Paper width / height calculations
  const paperDimensions = useMemo(() => {
    // A4: 210 x 297 mm, F4: 215 x 330 mm
    if (paperSize === 'F4') {
      return orientation === 'landscape'
        ? { width: '330mm', minHeight: '215mm' }
        : { width: '215mm', minHeight: '330mm' };
    }
    return orientation === 'landscape'
      ? { width: '297mm', minHeight: '210mm' }
      : { width: '210mm', minHeight: '297mm' };
  }, [paperSize, orientation]);

  return (
    <div className="space-y-6">
      {/* Dynamic @page margin stylesheet for crisp printing */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4'} ${orientation};
            margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP HEADER */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Pencetakan Absensi Siswa</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
                  Format Cetak Kertas Resmi
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pembuatan dan pencetakan lembar daftar hadir fisik untuk kelas bulanan dan pegangan guru tatap muka
              </p>
            </div>
          </div>
        </div>

        {/* Primary Submenu Selector: Absensi Kelas vs Absensi Pegangan Guru */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setSubTab('class')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'class'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>1. Absensi Kelas (Bulanan)</span>
          </button>

          <button
            onClick={() => setSubTab('teacher')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === 'teacher'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>2. Absensi Pegangan Guru (Mata Pelajaran)</span>
          </button>
        </div>
      </div>

      {/* FILTER & CONFIGURATION BAR */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>
              {subTab === 'class'
                ? 'Pengaturan Dokumen: Daftar Hadir Bulanan Kelas'
                : 'Pengaturan Dokumen: Daftar Hadir Mata Pelajaran Pegangan Guru'}
            </span>
          </span>
          <span className="text-[11px] text-slate-400">
            {subTab === 'class'
              ? `${classStudents.length} Siswa Terdaftar di Rombel`
              : `${teacherStudents.length} Siswa Terdaftar di Rombel`}
          </span>
        </div>

        {/* SECTION A CONTROLS: ABSENSI KELAS */}
        {subTab === 'class' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Rombel Selector */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Kelas / Rombel *
              </label>
              <select
                value={classRombelId}
                onChange={(e) => {
                  setClassRombelId(e.target.value);
                  const found = rombels.find((r) => r.id === e.target.value);
                  if (found) {
                    setClassAcademicYear(found.academicYear || classAcademicYear);
                    setClassSemester(found.semester || classSemester);
                    setCustomHomeroom(found.homeroomTeacherName || '');
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {(rombels.some((r) => r.academicYear === classAcademicYear)
                  ? rombels.filter((r) => r.academicYear === classAcademicYear)
                  : rombels
                ).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Tingkat {r.gradeLevel} • {r.academicYear})
                  </option>
                ))}
              </select>
            </div>

            {/* Bulan Selector */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bulan Absensi *
              </label>
              <select
                value={classMonthIndex}
                onChange={(e) => setClassMonthIndex(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {MONTHS_LIST.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({new Date(classYear, m.value + 1, 0).getDate()} Hari)
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun Masehi */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Masehi
              </label>
              <input
                type="number"
                value={classYear}
                onChange={(e) => setClassYear(Number(e.target.value) || new Date().getFullYear())}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>

            {/* Tahun Pelajaran */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Pelajaran
              </label>
              <select
                value={classAcademicYear}
                onChange={(e) => setClassAcademicYear(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {Array.from(new Set([...academicYearNames, ...rombels.map((r) => r.academicYear)]))
                  .sort()
                  .reverse()
                  .map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Semester
              </label>
              <select
                value={classSemester}
                onChange={(e) => setClassSemester(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>
        )}

        {/* SECTION B CONTROLS: ABSENSI PEGANGAN GURU */}
        {subTab === 'teacher' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            {/* Teacher Selector */}
            <div className="lg:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Guru Pengampu *
              </label>
              <select
                value={teacherId}
                onChange={(e) => handleTeacherSelect(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.nip ? `(NIP: ${t.nip})` : ''} - {t.subject || 'Pengajar'}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mata Pelajaran *
              </label>
              <input
                type="text"
                value={teacherSubject}
                onChange={(e) => setTeacherSubject(e.target.value)}
                placeholder="Contoh: Matematika"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>

            {/* Rombel Selector */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Kelas / Rombel *
              </label>
              <select
                value={teacherRombelId}
                onChange={(e) => {
                  setTeacherRombelId(e.target.value);
                  const found = rombels.find((r) => r.id === e.target.value);
                  if (found) {
                    setTeacherAcademicYear(found.academicYear || teacherAcademicYear);
                    setTeacherSemester(found.semester || teacherSemester);
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {(rombels.some((r) => r.academicYear === teacherAcademicYear)
                  ? rombels.filter((r) => r.academicYear === teacherAcademicYear)
                  : rombels
                ).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Tingkat {r.gradeLevel} • {r.academicYear})
                  </option>
                ))}
              </select>
            </div>

            {/* Meeting Count Config */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Pertemuan *
              </label>
              <select
                value={meetingCount}
                onChange={(e) => setMeetingCount(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-blue-600"
              >
                <option value={12}>12 Pertemuan</option>
                <option value={14}>14 Pertemuan</option>
                <option value={16}>16 Pertemuan (Standar)</option>
                <option value={18}>18 Pertemuan</option>
                <option value={20}>20 Pertemuan</option>
                <option value={24}>24 Pertemuan</option>
                <option value={32}>32 Pertemuan</option>
              </select>
            </div>

            {/* Tahun Pelajaran & Semester */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Pelajaran & Semester
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={teacherAcademicYear}
                  onChange={(e) => setTeacherAcademicYear(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  {Array.from(new Set([...academicYearNames, ...rombels.map((r) => r.academicYear)]))
                    .sort()
                    .reverse()
                    .map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                </select>
                <select
                  value={teacherSemester}
                  onChange={(e) => setTeacherSemester(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* PRINTING & PAPER CONTROLS STRIP */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Paper Size */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-500">Kertas:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="font-bold bg-transparent outline-none cursor-pointer"
              >
                <option value="F4">F4 / Folio (215 x 330 mm)</option>
                <option value="A4">A4 (210 x 297 mm)</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-500">Orientasi:</span>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="font-bold bg-transparent outline-none cursor-pointer"
              >
                <option value="landscape">Landscape (Direkomendasikan)</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>

            {/* Margins */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-500">Margin:</span>
              <select
                value={marginPreset}
                onChange={(e) => applyMarginPreset(e.target.value as any)}
                className="font-bold bg-transparent outline-none cursor-pointer"
              >
                <option value="compact">Sempit / Kompak (10mm)</option>
                <option value="normal">Standar (15mm)</option>
                <option value="wide">Lebar (20mm)</option>
              </select>
            </div>

            {/* Kop Surat with two logos toggle */}
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showTwoLogos}
                onChange={(e) => setShowTwoLogos(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Kop Surat 2 Logo</span>
            </label>
          </div>

          {/* Action Buttons: Export Excel, Print / Download PDF */}
          <div className="flex items-center gap-2">
            <button
              onClick={subTab === 'class' ? handleExportClassExcel : handleExportTeacherExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer"
              title="Unduh Format Spreadsheet Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition shadow-md cursor-pointer"
              title="Cetak langsung ke printer atau Simpan sebagai PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (VISIBLE ON SCREEN & PRINTED VIA BROWSER) */}
      <div className="bg-slate-200/70 dark:bg-slate-950 p-2 sm:p-6 rounded-2xl overflow-x-auto shadow-inner print:p-0 print:bg-white print:shadow-none print:rounded-none">
        <div
          className="bg-white text-slate-900 mx-auto shadow-2xl print:shadow-none border border-slate-300 print:border-none"
          style={{
            width: paperDimensions.width,
            minHeight: paperDimensions.minHeight,
            paddingTop: `${margins.top}mm`,
            paddingBottom: `${margins.bottom}mm`,
            paddingLeft: `${margins.left}mm`,
            paddingRight: `${margins.right}mm`,
            boxSizing: 'border-box',
          }}
        >
          {/* ========================================================================= */}
          {/* DOCUMENT A: ABSENSI KELAS (BULANAN) */}
          {/* ========================================================================= */}
          {subTab === 'class' && (
            <div className="space-y-3 font-serif">
              {/* Kop Surat Dua Logo Resmi SMAS Ma'arif 05 */}
              <KopSuratView />

              {/* Title Header */}
              <div className="text-center my-2">
                <h2 className="text-sm sm:text-base font-black tracking-wider uppercase underline">
                  DAFTAR HADIR PESERTA DIDIK (ABSENSI KELAS)
                </h2>
                <p className="text-xs font-bold mt-0.5 tracking-wide uppercase">
                  BULAN {MONTHS_LIST[classMonthIndex]?.label.toUpperCase()} {classYear} — TAHUN PELAJARAN {classAcademicYear}
                </p>
              </div>

              {/* Identity Row */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans pb-2 border-b border-slate-300">
                <div className="space-y-0.5">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Satuan Pendidikan</span>
                    <span className="font-bold">: {settings.schoolName || "SMAS MA'ARIF 05 PADANG RATU"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Kelas / Rombel</span>
                    <span className="font-bold">: {activeClassRombel ? activeClassRombel.name : '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Wali Kelas</span>
                    <span className="font-bold">: {customHomeroom || activeClassRombel?.homeroomTeacherName || '-'}</span>
                  </div>
                </div>

                <div className="space-y-0.5 text-right sm:text-left sm:pl-12">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Tahun Pelajaran</span>
                    <span className="font-bold">: {classAcademicYear}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Semester</span>
                    <span className="font-bold">: {classSemester.toUpperCase()}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Jumlah Siswa</span>
                    <span className="font-bold">
                      : {classStudents.length} Orang (L: {classStudents.filter((s) => s.gender === 'L').length}, P: {classStudents.filter((s) => s.gender === 'P').length})
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-center border-collapse border-2 border-black font-sans text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b-2 border-black">
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-7">No</th>
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-20">NIS</th>
                      <th rowSpan={2} className="border border-black px-2 py-1.5 text-left min-w-[170px]">Nama Peserta Didik</th>
                      <th rowSpan={2} className="border border-black px-1 py-1.5 w-7">L/P</th>
                      <th colSpan={daysInSelectedMonth} className="border border-black py-1">
                        Tanggal Bulan {MONTHS_LIST[classMonthIndex]?.label} {classYear}
                      </th>
                      <th colSpan={4} className="border border-black py-1 w-20">Rekap</th>
                      <th rowSpan={2} className="border border-black px-2 py-1.5 min-w-[80px]">Ket</th>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-[9px] border-b-2 border-black">
                      {monthDayList.map((item) => (
                        <th
                          key={item.day}
                          className={`border border-black py-0.5 px-0.5 min-w-[16px] max-w-[20px] ${
                            item.isSunday ? 'bg-rose-100 text-rose-700 font-black' : ''
                          }`}
                          title={`Tanggal ${item.day}`}
                        >
                          {item.day}
                        </th>
                      ))}
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-emerald-50 text-emerald-800">H</th>
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-blue-50 text-blue-800">S</th>
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-amber-50 text-amber-800">I</th>
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-rose-50 text-rose-800">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={daysInSelectedMonth + 9}
                          className="py-8 text-center text-slate-400 italic font-sans"
                        >
                          Belum ada siswa terdaftar pada rombel {activeClassRombel?.name || ''}. Silakan pilih rombel lain atau masukkan siswa melalui menu Data Rombongan Belajar.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((s, idx) => (
                        <tr key={idx} className="border-b border-black hover:bg-slate-50">
                          <td className="border border-black py-1.5 px-1 font-bold">{idx + 1}</td>
                          <td className="border border-black py-1.5 px-1 font-mono">{s.nis || '-'}</td>
                          <td className="border border-black py-1.5 px-2 text-left font-semibold truncate max-w-[200px]">
                            {s.studentName}
                          </td>
                          <td className="border border-black py-1.5 px-1 font-bold">{s.gender}</td>

                          {/* Empty cells for handwritten H, S, I, A */}
                          {monthDayList.map((item) => (
                            <td
                              key={item.day}
                              className={`border border-black p-0 h-6 ${
                                item.isSunday ? 'bg-slate-100/70' : ''
                              }`}
                            />
                          ))}

                          {/* Recap blank boxes */}
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6" />
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legend & Instructions */}
              <div className="flex flex-wrap items-center justify-between text-[10px] font-sans pt-1">
                <div className="flex items-center gap-4 text-slate-700">
                  <span className="font-bold">Kode Kehadiran:</span>
                  <span><strong>H</strong> = Hadir</span>
                  <span><strong>S</strong> = Sakit</span>
                  <span><strong>I</strong> = Izin</span>
                  <span><strong>A</strong> = Alpa / Tanpa Keterangan</span>
                </div>
                <div className="text-slate-500 italic">
                  * Lembar absensi ini wajib disimpan dan diisi rapi di ruang kelas
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="mt-8 grid grid-cols-2 gap-12 text-xs font-sans text-center break-inside-avoid">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-16" />
                  <p className="font-bold underline uppercase">
                    {settings.headmasterName || 'M. FATKHUR ROZI, S.Pd.I'}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    NIP. {settings.headmasterNip || '-'}
                  </p>
                </div>

                <div>
                  <p>
                    {signatureCity}, {signatureDate}
                  </p>
                  <p className="font-bold">Wali Kelas</p>
                  <div className="h-16" />
                  <p className="font-bold underline uppercase">
                    {customHomeroom || activeClassRombel?.homeroomTeacherName || 'Wali Kelas'}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    NIP/NUPTK: -
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOCUMENT B: ABSENSI PEGANGAN GURU (PERTEMUAN MATA PELAJARAN) */}
          {/* ========================================================================= */}
          {subTab === 'teacher' && (
            <div className="space-y-3 font-serif">
              {/* Kop Surat Dua Logo */}
              <KopSuratView />

              {/* Title Header */}
              <div className="text-center my-2">
                <h2 className="text-sm sm:text-base font-black tracking-wider uppercase underline">
                  DAFTAR HADIR PESERTA DIDIK (PEGANGAN GURU)
                </h2>
                <p className="text-xs font-bold mt-0.5 tracking-wide uppercase">
                  MATA PELAJARAN: {teacherSubject.toUpperCase()} — SEMESTER {teacherSemester.toUpperCase()} T.A. {teacherAcademicYear}
                </p>
              </div>

              {/* Identity Row */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans pb-2 border-b border-slate-300">
                <div className="space-y-0.5">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Nama Guru</span>
                    <span className="font-black">: {teacherName || 'Guru Pengampu'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">NIP / NUPTK</span>
                    <span className="font-mono">: {teacherNip || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Mata Pelajaran</span>
                    <span className="font-bold text-blue-700">: {teacherSubject}</span>
                  </div>
                </div>

                <div className="space-y-0.5 text-right sm:text-left sm:pl-12">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Kelas / Rombel</span>
                    <span className="font-bold">: {activeTeacherRombel ? activeTeacherRombel.name : '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Tahun Pelajaran</span>
                    <span className="font-bold">: {teacherAcademicYear} ({teacherSemester})</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-600">Target Pertemuan</span>
                    <span className="font-bold">: {meetingCount} Pertemuan Tatap Muka</span>
                  </div>
                </div>
              </div>

              {/* Attendance Table by Meetings */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-center border-collapse border-2 border-black font-sans text-[10px] leading-tight">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b-2 border-black">
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-7">No</th>
                      <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-20">NIS</th>
                      <th rowSpan={2} className="border border-black px-2 py-1.5 text-left min-w-[170px]">Nama Peserta Didik</th>
                      <th rowSpan={2} className="border border-black px-1 py-1.5 w-7">L/P</th>
                      <th colSpan={meetingCount} className="border border-black py-1">
                        Tatap Muka / Pertemuan Ke-
                      </th>
                      <th colSpan={4} className="border border-black py-1 w-20">Rekapitulasi</th>
                      <th rowSpan={2} className="border border-black px-2 py-1.5 min-w-[80px]">Ket</th>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-[9px] border-b-2 border-black">
                      {Array.from({ length: meetingCount }, (_, i) => i + 1).map((m) => (
                        <th key={m} className="border border-black py-0.5 px-0.5 min-w-[18px]">
                          P{m}
                        </th>
                      ))}
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-emerald-50 text-emerald-800">H</th>
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-blue-50 text-blue-800">S</th>
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-amber-50 text-amber-800">I</th>
                      <th className="border border-black px-0.5 py-0.5 w-5 bg-rose-50 text-rose-800">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={meetingCount + 9}
                          className="py-8 text-center text-slate-400 italic font-sans"
                        >
                          Belum ada siswa terdaftar pada rombel {activeTeacherRombel?.name || ''}. Silakan pilih rombel lain.
                        </td>
                      </tr>
                    ) : (
                      teacherStudents.map((s, idx) => (
                        <tr key={idx} className="border-b border-black hover:bg-slate-50">
                          <td className="border border-black py-1.5 px-1 font-bold">{idx + 1}</td>
                          <td className="border border-black py-1.5 px-1 font-mono">{s.nis || '-'}</td>
                          <td className="border border-black py-1.5 px-2 text-left font-semibold truncate max-w-[200px]">
                            {s.studentName}
                          </td>
                          <td className="border border-black py-1.5 px-1 font-bold">{s.gender}</td>

                          {/* Empty cells for handwritten meeting check */}
                          {Array.from({ length: meetingCount }, (_, i) => i + 1).map((m) => (
                            <td key={m} className="border border-black p-0 h-6" />
                          ))}

                          {/* Recap blank boxes */}
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6 bg-slate-50/50" />
                          <td className="border border-black p-0 h-6" />
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legend & Instructions */}
              <div className="flex flex-wrap items-center justify-between text-[10px] font-sans pt-1">
                <div className="flex items-center gap-4 text-slate-700">
                  <span className="font-bold">Kode Kehadiran:</span>
                  <span><strong>H</strong> = Hadir</span>
                  <span><strong>S</strong> = Sakit</span>
                  <span><strong>I</strong> = Izin</span>
                  <span><strong>A</strong> = Alpa</span>
                </div>
                <div className="text-slate-500 italic">
                  * Lembar ini wajib dibawa guru saat mengajar dan disinkronkan dengan Buku Nilai / Buku Pegangan Guru
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="mt-8 grid grid-cols-2 gap-12 text-xs font-sans text-center break-inside-avoid">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-16" />
                  <p className="font-bold underline uppercase">
                    {settings.headmasterName || 'M. FATKHUR ROZI, S.Pd.I'}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    NIP. {settings.headmasterNip || '-'}
                  </p>
                </div>

                <div>
                  <p>
                    {signatureCity}, {signatureDate}
                  </p>
                  <p className="font-bold">Guru Mata Pelajaran</p>
                  <div className="h-16" />
                  <p className="font-bold underline uppercase">
                    {teacherName || 'Guru Pengampu'}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    NIP. {teacherNip || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
