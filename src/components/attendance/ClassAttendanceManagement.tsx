import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Printer,
  Download,
  FileSpreadsheet,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  BarChart3,
  Layers,
  CheckSquare,
  RefreshCw,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rombel, RombelMember, Student, ClassAttendanceRecord, AttendanceStatus } from '../../types';
import { KopSuratView } from '../common/KopSuratView';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  exportAttendanceDailyToExcel,
  exportAttendanceRecapToExcel,
} from '../../utils/excelExport';

export const ClassAttendanceManagement: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const { activeYearName, activeSemester, academicYearNames } = useAcademicYear();

  // Tab views: 'daily' (pengisian harian) vs 'recap' (rekap periode)
  const [activeTab, setActiveTab] = useState<'daily' | 'recap'>('daily');

  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(activeYearName || settings.academicYear || '2026/2027');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(activeSemester || 'Ganjil');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [selectedRombelId, setSelectedRombelId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (activeYearName) setSelectedAcademicYear(activeYearName);
    if (activeSemester) setSelectedSemester(activeSemester);
  }, [activeYearName, activeSemester]);

  // Data
  const [rombels, setRombels] = useState<Rombel[]>([]);
  const [rombelMembers, setRombelMembers] = useState<RombelMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<ClassAttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<ClassAttendanceRecord[]>([]);

  // State for daily attendance entry: studentId -> AttendanceStatus
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatus>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Recap period selection
  const [recapPeriod, setRecapPeriod] = useState<'mingguan' | 'bulanan' | 'semester'>('bulanan');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Modals for Printing
  const [isPrintDailyOpen, setIsPrintDailyOpen] = useState(false);
  const [isPrintRecapOpen, setIsPrintRecapOpen] = useState(false);
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'F4'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Load Rombels
  useEffect(() => {
    const qRombels = query(collection(db, 'rombels'), orderBy('name', 'asc'));
    const unsubRombels = onSnapshot(qRombels, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Rombel));
      setRombels(docs);
      if (docs.length > 0 && !selectedRombelId) {
        setSelectedRombelId(docs[0].id);
      }
    });

    return () => unsubRombels();
  }, []);

  // Filtered Rombels list
  const availableRombels = useMemo(() => {
    return rombels.filter((r) => {
      const matchYear = !selectedAcademicYear || r.academicYear === selectedAcademicYear;
      const matchGrade = selectedGrade === 'ALL' || r.gradeLevel === selectedGrade;
      return matchYear && matchGrade;
    });
  }, [rombels, selectedAcademicYear, selectedGrade]);

  useEffect(() => {
    if (availableRombels.length > 0 && !availableRombels.some((r) => r.id === selectedRombelId)) {
      setSelectedRombelId(availableRombels[0].id);
    } else if (availableRombels.length === 0) {
      setSelectedRombelId('');
    }
  }, [availableRombels, selectedRombelId]);

  // Active selected Rombel
  const activeRombel = useMemo(() => {
    return rombels.find((r) => r.id === selectedRombelId) || null;
  }, [rombels, selectedRombelId]);

  // Load members of selected Rombel
  useEffect(() => {
    if (!selectedRombelId) {
      setRombelMembers([]);
      return;
    }
    const qMembers = query(
      collection(db, 'rombel_members'),
      where('rombelId', '==', selectedRombelId),
      orderBy('studentName', 'asc')
    );
    const unsub = onSnapshot(qMembers, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RombelMember));
      setRombelMembers(docs);
    });
    return () => unsub();
  }, [selectedRombelId]);

  // Load attendance for active rombel on selected date
  useEffect(() => {
    if (!selectedRombelId || !selectedDate) {
      setAttendanceRecords([]);
      return;
    }

    const qAtt = query(
      collection(db, 'class_attendance'),
      where('rombelId', '==', selectedRombelId),
      where('date', '==', selectedDate)
    );

    const unsub = onSnapshot(qAtt, (snapshot) => {
      const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ClassAttendanceRecord));
      setAttendanceRecords(records);

      // Populate draft
      const draft: Record<string, AttendanceStatus> = {};
      const notes: Record<string, string> = {};
      records.forEach((r) => {
        draft[r.studentId] = r.status;
        if (r.notes) notes[r.studentId] = r.notes;
      });

      // For students without record, default to 'H'
      rombelMembers.forEach((m) => {
        if (!draft[m.studentId]) {
          draft[m.studentId] = 'H';
        }
      });

      setAttendanceDraft(draft);
      setNotesDraft(notes);
    });

    return () => unsub();
  }, [selectedRombelId, selectedDate, rombelMembers]);

  // Load all attendance for active rombel (for recap calculations)
  useEffect(() => {
    if (!selectedRombelId) {
      setAllAttendance([]);
      return;
    }

    const qAll = query(
      collection(db, 'class_attendance'),
      where('rombelId', '==', selectedRombelId)
    );

    const unsub = onSnapshot(qAll, (snapshot) => {
      const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ClassAttendanceRecord));
      setAllAttendance(records);
    });

    return () => unsub();
  }, [selectedRombelId]);

  // Quick fill buttons
  const handleSetAllHadir = () => {
    const draft: Record<string, AttendanceStatus> = {};
    rombelMembers.forEach((m) => {
      draft[m.studentId] = 'H';
    });
    setAttendanceDraft(draft);
  };

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceDraft((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Save Attendance to Firestore
  const handleSaveAttendance = async () => {
    if (!activeRombel || !selectedDate || rombelMembers.length === 0) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const promises = rombelMembers.map((m) => {
        const status = attendanceDraft[m.studentId] || 'H';
        const docId = `${activeRombel.id}_${selectedDate}_${m.studentId}`;
        const record: Omit<ClassAttendanceRecord, 'id'> = {
          rombelId: activeRombel.id,
          rombelName: activeRombel.name,
          gradeLevel: activeRombel.gradeLevel,
          academicYear: activeRombel.academicYear,
          semester: activeRombel.semester || selectedSemester,
          date: selectedDate,
          studentId: m.studentId,
          nis: m.nis,
          studentName: m.studentName,
          gender: m.gender,
          status,
          notes: notesDraft[m.studentId] || '',
          recordedBy: profile?.email || 'Admin',
          recordedByName: profile?.displayName || 'Petugas TU',
          updatedAt: new Date().toISOString(),
        };

        return setDoc(doc(db, 'class_attendance', docId), record, { merge: true });
      });

      await Promise.all(promises);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Gagal menyimpan absensi.');
      setIsSaving(false);
    }
  };

  // Calculate daily summary
  const dailySummary = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    rombelMembers.forEach((m) => {
      const status = attendanceDraft[m.studentId] || 'H';
      if (status === 'H') hadir++;
      else if (status === 'S') sakit++;
      else if (status === 'I') izin++;
      else if (status === 'A') alpa++;
    });

    const total = rombelMembers.length;
    const persentase = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { hadir, sakit, izin, alpa, total, persentase };
  }, [rombelMembers, attendanceDraft]);

  // Calculate Recap Table Data
  const recapData = useMemo(() => {
    if (!activeRombel || rombelMembers.length === 0) return [];

    // Filter attendance records based on selected recap period
    let filteredRecords = allAttendance;
    if (recapPeriod === 'bulanan' && selectedMonth) {
      filteredRecords = allAttendance.filter((r) => r.date.startsWith(selectedMonth));
    } else if (recapPeriod === 'mingguan') {
      // past 7 days from selectedDate
      const baseDate = new Date(selectedDate);
      const sevenDaysAgo = new Date(baseDate);
      sevenDaysAgo.setDate(baseDate.getDate() - 7);
      const strStart = sevenDaysAgo.toISOString().split('T')[0];
      filteredRecords = allAttendance.filter((r) => r.date >= strStart && r.date <= selectedDate);
    } else if (recapPeriod === 'semester') {
      filteredRecords = allAttendance.filter(
        (r) => r.academicYear === selectedAcademicYear && r.semester === selectedSemester
      );
    }

    return rombelMembers.map((m) => {
      const studentRecords = filteredRecords.filter((r) => r.studentId === m.studentId);
      const hadir = studentRecords.filter((r) => r.status === 'H').length;
      const sakit = studentRecords.filter((r) => r.status === 'S').length;
      const izin = studentRecords.filter((r) => r.status === 'I').length;
      const alpa = studentRecords.filter((r) => r.status === 'A').length;
      const total = studentRecords.length;
      const persentase = total > 0 ? Math.round((hadir / total) * 100) : (hadir > 0 ? 100 : 0);

      return {
        nis: m.nis,
        studentName: m.studentName,
        gender: m.gender,
        hadir,
        sakit,
        izin,
        alpa,
        total,
        persentase,
      };
    });
  }, [allAttendance, rombelMembers, recapPeriod, selectedMonth, selectedDate, selectedAcademicYear, selectedSemester, activeRombel]);

  // Export Daily Attendance to Excel
  const handleExportDailyExcel = () => {
    if (!activeRombel) return;
    const records = rombelMembers.map((m) => ({
      nis: m.nis,
      studentName: m.studentName,
      gender: m.gender,
      status: attendanceDraft[m.studentId] || 'H',
      notes: notesDraft[m.studentId] || '',
    }));
    exportAttendanceDailyToExcel(activeRombel.name, selectedDate, records);
  };

  // Export Recap to Excel
  const handleExportRecapExcel = () => {
    if (!activeRombel) return;
    const periodLabel =
      recapPeriod === 'bulanan'
        ? `Bulan_${selectedMonth}`
        : recapPeriod === 'mingguan'
        ? `Mingguan_${selectedDate}`
        : `Semester_${selectedSemester}_${selectedAcademicYear}`;
    exportAttendanceRecapToExcel(activeRombel.name, periodLabel, recapData);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Absensi Kelas (Presensi Siswa)</span>
                {activeRombel && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    {activeRombel.name}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pencatatan presensi harian siswa (Hadir, Sakit, Izin, Alpa), rekapitulasi, cetak lembar absen dan unduh Excel
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Presensi Harian</span>
          </button>
          <button
            onClick={() => setActiveTab('recap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'recap'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Rekapitulasi Periode</span>
          </button>
        </div>
      </div>

      {/* Selector & Filter Strip */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Tahun Pelajaran */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-semibold">Tahun:</span>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
            >
              {Array.from(new Set([...academicYearNames, ...rombels.map((r) => r.academicYear)]))
                .sort()
                .reverse()
                .map((yr) => (
                  <option key={yr} value={yr} className="dark:bg-slate-900">
                    {yr}
                  </option>
                ))}
            </select>
          </div>

          {/* Semester */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-semibold">Semester:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as any)}
              className="font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          {/* Tingkat Kelas */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-semibold">Tingkat:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as any)}
              className="font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
          </div>

          {/* Rombel Selector */}
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-800 dark:text-emerald-300 font-bold">Rombel:</span>
            <select
              value={selectedRombelId}
              onChange={(e) => setSelectedRombelId(e.target.value)}
              className="font-black bg-transparent text-emerald-950 dark:text-emerald-100 outline-none cursor-pointer"
            >
              {availableRombels.length === 0 ? (
                <option value="">Tidak ada rombel</option>
              ) : (
                availableRombels.map((r) => (
                  <option key={r.id} value={r.id} className="dark:bg-slate-900">
                    {r.name} (Tingkat {r.gradeLevel})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date Picker (for Daily view) */}
          {activeTab === 'daily' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-400 font-semibold">Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Month Picker (for Recap view) */}
          {activeTab === 'recap' && recapPeriod === 'bulanan' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-400 font-semibold">Bulan:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Recap period select */}
          {activeTab === 'recap' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-400 font-semibold">Rentang:</span>
              <select
                value={recapPeriod}
                onChange={(e) => setRecapPeriod(e.target.value as any)}
                className="font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none"
              >
                <option value="mingguan">7 Hari Terakhir</option>
                <option value="bulanan">Per Bulan</option>
                <option value="semester">1 Semester Penuh</option>
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'daily' ? (
            <>
              <button
                onClick={handleExportDailyExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => setIsPrintDailyOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Cetak Harian</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleExportRecapExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Rekap Excel</span>
              </button>
              <button
                onClick={() => setIsPrintRecapOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>Cetak Rekap</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: DAILY ATTENDANCE */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Quick Action & Stats Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Aksi Cepat Pengisian:
              </span>
              <button
                onClick={handleSetAllHadir}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Set Semua Hadir (H)</span>
              </button>
            </div>

            {/* Daily Tally Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                H (Hadir): {dailySummary.hadir}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                S (Sakit): {dailySummary.sakit}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                I (Izin): {dailySummary.izin}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300">
                A (Alpa): {dailySummary.alpa}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                Kehadiran: {dailySummary.persentase}%
              </span>

              {/* Save Button */}
              <button
                disabled={isSaving || rombelMembers.length === 0}
                onClick={handleSaveAttendance}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition cursor-pointer ${
                  saveSuccess
                    ? 'bg-emerald-600'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Absensi'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Student Attendance List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {rombelMembers.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Belum ada siswa terdaftar pada rombel ini
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Buka menu "Data Rombongan Belajar" untuk menambahkan peserta didik ke rombel {activeRombel?.name || ''}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 uppercase font-black text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3 w-28">NIS</th>
                      <th className="py-3 px-3">Nama Siswa</th>
                      <th className="py-3 px-2 text-center w-12">L/P</th>
                      <th className="py-3 px-3 text-center w-56">Status Kehadiran</th>
                      <th className="py-3 px-3">Catatan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rombelMembers.map((m, idx) => {
                      const currentStatus = attendanceDraft[m.studentId] || 'H';
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {m.nis || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {m.studentName}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                m.gender === 'L'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                  : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                              }`}
                            >
                              {m.gender}
                            </span>
                          </td>
                          {/* Radio group for H, S, I, A */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                              {(['H', 'S', 'I', 'A'] as const).map((st) => {
                                const isSelected = currentStatus === st;
                                const colors = {
                                  H: 'bg-emerald-600 text-white shadow-xs',
                                  S: 'bg-blue-600 text-white shadow-xs',
                                  I: 'bg-amber-600 text-white shadow-xs',
                                  A: 'bg-rose-600 text-white shadow-xs',
                                };
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleSetStatus(m.studentId, st)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                      isSelected
                                        ? colors[st]
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          {/* Note input */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="Surat dokter, izin urusan keluarga, dll..."
                              value={notesDraft[m.studentId] || ''}
                              onChange={(e) =>
                                setNotesDraft({
                                  ...notesDraft,
                                  [m.studentId]: e.target.value,
                                })
                              }
                              className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECAPITULATION */}
      {activeTab === 'recap' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Rekapitulasi Kehadiran Siswa
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rombel: {activeRombel?.name || '-'} • Periode:{' '}
                  {recapPeriod === 'bulanan'
                    ? `Bulan ${selectedMonth}`
                    : recapPeriod === 'mingguan'
                    ? `7 Hari Terakhir (${selectedDate})`
                    : `Semester ${selectedSemester} ${selectedAcademicYear}`}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total Siswa: {recapData.length}
              </span>
            </div>

            {recapData.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <BarChart3 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Belum ada data presensi pada periode yang dipilih
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 uppercase font-black text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3">NIS</th>
                      <th className="py-3 px-3">Nama Siswa</th>
                      <th className="py-3 px-2 text-center w-12">L/P</th>
                      <th className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400">Hadir (H)</th>
                      <th className="py-3 px-3 text-center text-blue-600 dark:text-blue-400">Sakit (S)</th>
                      <th className="py-3 px-3 text-center text-amber-600 dark:text-amber-400">Izin (I)</th>
                      <th className="py-3 px-3 text-center text-rose-600 dark:text-rose-400">Alpa (A)</th>
                      <th className="py-3 px-3 text-center">Total Hari</th>
                      <th className="py-3 px-3 text-center">% Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recapData.map((r, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {r.nis}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {r.studentName}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-[10px]">
                          {r.gender}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {r.hadir}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                          {r.sakit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                          {r.izin}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400">
                          {r.alpa}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                          {r.total}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                              r.persentase >= 85
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : r.persentase >= 75
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {r.persentase}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PRINT DAILY ATTENDANCE */}
      {isPrintDailyOpen && activeRombel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>Cetak Lembar Absensi Harian</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintDailyOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 print:bg-white print:p-0">
              <div className="bg-white text-slate-900 p-8 mx-auto shadow-lg print:shadow-none w-[210mm] min-h-[297mm]">
                <KopSuratView customSettings={settings} />

                <div className="text-center my-4">
                  <h2 className="text-sm font-black uppercase tracking-wider underline">
                    DAFTAR HADIR PESERTA DIDIK HARIAN
                  </h2>
                  <p className="text-xs font-bold mt-1">
                    HARI/TANGGAL:{' '}
                    {new Date(selectedDate).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).toUpperCase()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-2 bg-slate-50 border border-slate-300 rounded">
                  <div>
                    <div><strong>Kelas / Rombel:</strong> {activeRombel.name}</div>
                    <div><strong>Tahun Pelajaran:</strong> {activeRombel.academicYear} ({activeRombel.semester})</div>
                  </div>
                  <div>
                    <div><strong>Wali Kelas:</strong> {activeRombel.homeroomTeacherName || '-'}</div>
                    <div><strong>Total Siswa:</strong> {rombelMembers.length} Orang</div>
                  </div>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-800">
                  <thead>
                    <tr className="bg-slate-200 font-bold">
                      <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">No</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-24 text-center">NIS</th>
                      <th className="border border-slate-800 py-1.5 px-3 text-left">Nama Siswa</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-12 text-center">L/P</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">H</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">S</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">I</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">A</th>
                      <th className="border border-slate-800 py-1.5 px-3 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rombelMembers.map((m, idx) => {
                      const st = attendanceDraft[m.studentId] || 'H';
                      return (
                        <tr key={m.id}>
                          <td className="border border-slate-800 py-1 px-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-800 py-1 px-2 text-center font-mono">{m.nis}</td>
                          <td className="border border-slate-800 py-1 px-3 font-semibold">{m.studentName}</td>
                          <td className="border border-slate-800 py-1 px-2 text-center">{m.gender}</td>
                          <td className="border border-slate-800 py-1 px-2 text-center font-bold">{st === 'H' ? '✓' : ''}</td>
                          <td className="border border-slate-800 py-1 px-2 text-center font-bold">{st === 'S' ? '✓' : ''}</td>
                          <td className="border border-slate-800 py-1 px-2 text-center font-bold">{st === 'I' ? '✓' : ''}</td>
                          <td className="border border-slate-800 py-1 px-2 text-center font-bold">{st === 'A' ? '✓' : ''}</td>
                          <td className="border border-slate-800 py-1 px-3 text-[11px]">{notesDraft[m.studentId] || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Recap Bar */}
                <div className="mt-4 p-2 bg-slate-100 border border-slate-300 text-xs flex justify-between font-semibold">
                  <span>Rekap Kehadiran:</span>
                  <span>Hadir: <strong>{dailySummary.hadir}</strong></span>
                  <span>Sakit: <strong>{dailySummary.sakit}</strong></span>
                  <span>Izin: <strong>{dailySummary.izin}</strong></span>
                  <span>Alpa: <strong>{dailySummary.alpa}</strong></span>
                  <span>Persentase: <strong>{dailySummary.persentase}%</strong></span>
                </div>

                {/* Signatures */}
                <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-center break-inside-avoid">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah</p>
                    <div className="h-16" />
                    <p className="font-bold underline uppercase">{settings.headmasterName || "M. FATKHUR ROZI, S.Pd.I"}</p>
                    <p className="text-[10px]">NIP. {settings.headmasterNip || "-"}</p>
                  </div>
                  <div>
                    <p>Padang Ratu, {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Guru Piket / Wali Kelas</p>
                    <div className="h-16" />
                    <p className="font-bold underline uppercase">{activeRombel.homeroomTeacherName || profile?.displayName || "Wali Kelas"}</p>
                    <p className="text-[10px]">Petugas Presensi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRINT RECAP ATTENDANCE */}
      {isPrintRecapOpen && activeRombel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>Cetak Rekap Kehadiran Periode</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintRecapOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 print:bg-white print:p-0">
              <div className="bg-white text-slate-900 p-8 mx-auto shadow-lg print:shadow-none w-[210mm] min-h-[297mm]">
                <KopSuratView customSettings={settings} />

                <div className="text-center my-4">
                  <h2 className="text-sm font-black uppercase tracking-wider underline">
                    REKAPITULASI KEHADIRAN PESERTA DIDIK
                  </h2>
                  <p className="text-xs font-bold mt-1">
                    PERIODE:{' '}
                    {recapPeriod === 'bulanan'
                      ? `BULAN ${selectedMonth}`
                      : recapPeriod === 'mingguan'
                      ? `7 HARI TERAKHIR`
                      : `SEMESTER ${selectedSemester.toUpperCase()} TAHUN PELAJARAN ${selectedAcademicYear}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-2 bg-slate-50 border border-slate-300 rounded">
                  <div>
                    <div><strong>Kelas / Rombel:</strong> {activeRombel.name}</div>
                    <div><strong>Tahun Pelajaran:</strong> {activeRombel.academicYear} ({activeRombel.semester})</div>
                  </div>
                  <div>
                    <div><strong>Wali Kelas:</strong> {activeRombel.homeroomTeacherName || '-'}</div>
                    <div><strong>Total Siswa:</strong> {recapData.length} Orang</div>
                  </div>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-800">
                  <thead>
                    <tr className="bg-slate-200 font-bold">
                      <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">No</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-24 text-center">NIS</th>
                      <th className="border border-slate-800 py-1.5 px-3 text-left">Nama Siswa</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-12 text-center">L/P</th>
                      <th className="border border-slate-800 py-1.5 px-2 text-center">H</th>
                      <th className="border border-slate-800 py-1.5 px-2 text-center">S</th>
                      <th className="border border-slate-800 py-1.5 px-2 text-center">I</th>
                      <th className="border border-slate-800 py-1.5 px-2 text-center">A</th>
                      <th className="border border-slate-800 py-1.5 px-2 text-center">Total</th>
                      <th className="border border-slate-800 py-1.5 px-3 text-center">% Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapData.map((r, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-800 py-1 px-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center font-mono">{r.nis}</td>
                        <td className="border border-slate-800 py-1 px-3 font-semibold">{r.studentName}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center">{r.gender}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center font-bold">{r.hadir}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center">{r.sakit}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center">{r.izin}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center">{r.alpa}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center">{r.total}</td>
                        <td className="border border-slate-800 py-1 px-3 text-center font-bold">{r.persentase}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures */}
                <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-center break-inside-avoid">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah</p>
                    <div className="h-16" />
                    <p className="font-bold underline uppercase">{settings.headmasterName || "M. FATKHUR ROZI, S.Pd.I"}</p>
                    <p className="text-[10px]">NIP. {settings.headmasterNip || "-"}</p>
                  </div>
                  <div>
                    <p>Padang Ratu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Wali Kelas</p>
                    <div className="h-16" />
                    <p className="font-bold underline uppercase">{activeRombel.homeroomTeacherName || "Wali Kelas"}</p>
                    <p className="text-[10px]">NIP/NUPTK: -</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
