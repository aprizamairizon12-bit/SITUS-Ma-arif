import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarRange,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  History,
  ArrowRightLeft,
  ArrowRight,
  GraduationCap,
  Layers,
  Users,
  Check,
  X,
  AlertTriangle,
  Search,
  BookOpen,
  FileText,
  CalendarCheck,
  Archive,
  Sparkles,
  UserPlus,
  Copy,
  ShieldAlert,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  doc,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAcademicYear, YearUsageBreakdown } from '../../context/AcademicYearContext';
import { useAuth } from '../../context/AuthContext';
import {
  AcademicYear,
  Rombel,
  RombelMember,
  Student,
  Teacher,
  Alumni,
} from '../../types';

interface YearHistorySnapshot {
  year: AcademicYear;
  rombels: Rombel[];
  rombelMembersCount: number;
  attendanceCount: number;
  teacherBooksCount: number;
  journalsCount: number;
  gradesCount: number;
  lettersCount: number;
  archivesCount: number;
  invoicesCount: number;
}

type TransitionAction = 'PROMOTE' | 'ASSIGN' | 'GRADUATE' | 'SKIP';

interface StudentTransitionItem {
  studentId: string;
  nis: string;
  nisn: string;
  studentName: string;
  gender: 'L' | 'P';
  sourceRombelName: string;
  sourceGrade: 'X' | 'XI' | 'XII';
  action: TransitionAction;
  targetRombelId: string;
}

interface CopiedRombelDraft {
  selected: boolean;
  name: string;
  gradeLevel: 'X' | 'XI' | 'XII';
  semester: 'Ganjil' | 'Genap';
  homeroomTeacherId: string;
  homeroomTeacherName: string;
  room: string;
  capacity: number;
  curriculum: 'Kurikulum Merdeka' | 'Kurikulum 2013';
}

export const AcademicYearManagement: React.FC = () => {
  const { profile } = useAuth();
  const {
    academicYears,
    activeAcademicYear,
    activeYearName,
    activeSemester,
    loading,
    addAcademicYear,
    updateAcademicYear,
    activateAcademicYear,
    deactivateAcademicYear,
    changeSemester,
    checkYearUsage,
    deleteAcademicYear,
  } = useAcademicYear();

  // Reference data for integration, history, and transition
  const [rombels, setRombels] = useState<Rombel[]>([]);
  const [rombelMembers, setRombelMembers] = useState<RombelMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [alumniList, setAlumniList] = useState<Alumni[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Aktif' | 'Tidak Aktif'>('ALL');

  // Toast / Alert Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Add / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const currentYearNum = Math.max(2026, new Date().getFullYear());
  const [formStartYear, setFormStartYear] = useState<number>(currentYearNum);
  const [formEndYear, setFormEndYear] = useState<number>(currentYearNum + 1);
  const [formEndYearManual, setFormEndYearManual] = useState<boolean>(false);
  const [formSemester, setFormSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [formStartDate, setFormStartDate] = useState<string>(`${currentYearNum}-07-13`);
  const [formEndDate, setFormEndDate] = useState<string>(`${currentYearNum + 1}-06-19`);
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Tidak Aktif'>('Tidak Aktif');
  const [formNotes, setFormNotes] = useState<string>('');

  // History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySnapshot, setHistorySnapshot] = useState<YearHistorySnapshot | null>(null);

  // Transition / Perpindahan Tahun Pelajaran Modal
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [transitionStep, setTransitionStep] = useState<'rombels' | 'students' | 'new_students' | 'confirm'>('rombels');
  const [sourceYearName, setSourceYearName] = useState<string>('');
  const [targetYearName, setTargetYearName] = useState<string>('');
  const [copyRombelDrafts, setCopyRombelDrafts] = useState<CopiedRombelDraft[]>([]);
  const [newRombelQuickName, setNewRombelQuickName] = useState('');
  const [newRombelQuickGrade, setNewRombelQuickGrade] = useState<'X' | 'XI' | 'XII'>('X');
  const [newRombelQuickTeacherId, setNewRombelQuickTeacherId] = useState('');
  const [newRombelQuickRoom, setNewRombelQuickRoom] = useState('');

  // Student transition rows
  const [studentTransitions, setStudentTransitions] = useState<StudentTransitionItem[]>([]);
  const [transitionGradeFilter, setTransitionGradeFilter] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [transitionSearch, setTransitionSearch] = useState('');
  const [selectedNewStudentIds, setSelectedNewStudentIds] = useState<string[]>([]);
  const [newStudentTargetRombelId, setNewStudentTargetRombelId] = useState<string>('');
  const [activateTargetAfterTransition, setActivateTargetAfterTransition] = useState<boolean>(false);
  const [executingTransition, setExecutingTransition] = useState<boolean>(false);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  useEffect(() => {
    const unsubRombels = onSnapshot(query(collection(db, 'rombels'), orderBy('name', 'asc')), (snap) => {
      setRombels(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rombel)));
    });
    const unsubMembers = onSnapshot(query(collection(db, 'rombel_members'), orderBy('studentName', 'asc')), (snap) => {
      setRombelMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RombelMember)));
    });
    const unsubStudents = onSnapshot(query(collection(db, 'students'), orderBy('name', 'asc')), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
    });
    const unsubTeachers = onSnapshot(query(collection(db, 'teachers'), orderBy('name', 'asc')), (snap) => {
      setTeachers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher)));
    });
    const unsubAlumni = onSnapshot(collection(db, 'alumni'), (snap) => {
      setAlumniList(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alumni)));
    });

    return () => {
      unsubRombels();
      unsubMembers();
      unsubStudents();
      unsubTeachers();
      unsubAlumni();
    };
  }, []);

  // Auto-form Academic Year Name
  const autoYearName = `${formStartYear}/${formEndYear}`;

  // Filtered list of Academic Years
  const filteredYears = useMemo(() => {
    return academicYears.filter((y) => {
      const matchSearch =
        !searchQuery ||
        y.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (y.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || y.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [academicYears, searchQuery, statusFilter]);

  // Quick live rombel count per academic year
  const rombelCountByYear = useMemo(() => {
    const map: Record<string, number> = {};
    rombels.forEach((r) => {
      map[r.academicYear] = (map[r.academicYear] || 0) + 1;
    });
    return map;
  }, [rombels]);

  const memberCountByYear = useMemo(() => {
    const map: Record<string, number> = {};
    rombelMembers.forEach((m) => {
      map[m.academicYear] = (map[m.academicYear] || 0) + 1;
    });
    return map;
  }, [rombelMembers]);

  // Open Add Form
  const handleOpenAdd = () => {
    const highestStart =
      academicYears.length > 0 ? Math.max(...academicYears.map((y) => y.startYear)) + 1 : currentYearNum;
    setEditingYear(null);
    setFormStartYear(highestStart);
    setFormEndYear(highestStart + 1);
    setFormEndYearManual(false);
    setFormSemester('Ganjil');
    setFormStartDate(`${highestStart}-07-15`);
    setFormEndDate(`${highestStart + 1}-06-20`);
    setFormStatus('Tidak Aktif');
    setFormNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (y: AcademicYear) => {
    setEditingYear(y);
    setFormStartYear(y.startYear);
    setFormEndYear(y.endYear);
    setFormEndYearManual(y.endYear !== y.startYear + 1);
    setFormSemester(y.activeSemester);
    setFormStartDate(y.startDate);
    setFormEndDate(y.endDate);
    setFormStatus(y.status);
    setFormNotes(y.notes || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleStartYearChange = (val: number) => {
    setFormStartYear(val);
    if (!formEndYearManual && val > 2000) {
      setFormEndYear(val + 1);
      setFormStartDate(`${val}-07-15`);
      setFormEndDate(`${val + 1}-06-20`);
    }
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formStartYear || !formEndYear || formEndYear <= formStartYear) {
      setFormError('Tahun akhir harus lebih besar dari tahun awal (contoh: 2026 dan 2027).');
      return;
    }
    if (!formStartDate || !formEndDate || formEndDate <= formStartDate) {
      setFormError('Tanggal berakhir harus lebih besar dari tanggal mulai tahun pelajaran.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        startYear: formStartYear,
        endYear: formEndYear,
        name: autoYearName,
        activeSemester: formSemester,
        startDate: formStartDate,
        endDate: formEndDate,
        status: formStatus,
        notes: formNotes.trim(),
      };

      if (editingYear) {
        await updateAcademicYear(editingYear.id, payload);
        await addDoc(collection(db, 'activityLogs'), {
          userId: profile?.id || 'admin',
          userName: profile?.displayName || 'Admin TU',
          action: `Memperbarui Tahun Pelajaran ${autoYearName} (${formSemester})`,
          module: 'Tahun Pelajaran',
          details: `Status: ${formStatus}`,
          timestamp: new Date().toISOString(),
        });
        notify(`Tahun pelajaran ${autoYearName} berhasil diperbarui.`);
      } else {
        await addAcademicYear(payload);
        await addDoc(collection(db, 'activityLogs'), {
          userId: profile?.id || 'admin',
          userName: profile?.displayName || 'Admin TU',
          action: `Menambahkan Tahun Pelajaran Baru ${autoYearName}`,
          module: 'Tahun Pelajaran',
          details: `Semester: ${formSemester}, Status: ${formStatus}`,
          timestamp: new Date().toISOString(),
        });
        notify(`Tahun pelajaran ${autoYearName} berhasil ditambahkan.`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan tahun pelajaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (y: AcademicYear) => {
    if (
      !window.confirm(
        `Aktifkan Tahun Pelajaran ${y.name} (Semester ${y.activeSemester}) sebagai tahun berjalan?\n\nTahun pelajaran yang sebelumnya aktif akan otomatis dinonaktifkan, dan seluruh data historis tetap tersimpan aman.`
      )
    ) {
      return;
    }
    try {
      await activateAcademicYear(y.id);
      await addDoc(collection(db, 'activityLogs'), {
        userId: profile?.id || 'admin',
        userName: profile?.displayName || 'Admin TU',
        action: `Mengaktifkan Tahun Pelajaran ${y.name} (${y.activeSemester})`,
        module: 'Tahun Pelajaran',
        details: 'Seluruh modul otomatis menjadikan tahun ini sebagai default',
        timestamp: new Date().toISOString(),
      });
      notify(`Tahun Pelajaran ${y.name} (${y.activeSemester}) sekarang AKTIF di seluruh modul.`);
    } catch (err: any) {
      notify(err?.message || 'Gagal mengaktifkan tahun pelajaran.', 'error');
    }
  };

  const handleDeactivate = async (y: AcademicYear) => {
    if (!window.confirm(`Nonaktifkan status aktif untuk Tahun Pelajaran ${y.name}?`)) return;
    try {
      await deactivateAcademicYear(y.id);
      notify(`Tahun Pelajaran ${y.name} telah dinonaktifkan.`);
    } catch (err: any) {
      notify(err?.message || 'Gagal menonaktifkan tahun pelajaran.', 'error');
    }
  };

  const handleToggleSemester = async (y: AcademicYear, semester: 'Ganjil' | 'Genap') => {
    if (y.activeSemester === semester) return;
    try {
      await changeSemester(y.id, semester);
      notify(`Semester aktif pada TA ${y.name} diubah ke ${semester}.`);
    } catch (err: any) {
      notify(err?.message || 'Gagal mengubah semester.', 'error');
    }
  };

  const handleDelete = async (y: AcademicYear) => {
    if (!window.confirm(`Hapus Tahun Pelajaran ${y.name}? Penghapusan hanya diizinkan jika belum digunakan pada data sekolah.`)) {
      return;
    }
    try {
      await deleteAcademicYear(y);
      await addDoc(collection(db, 'activityLogs'), {
        userId: profile?.id || 'admin',
        userName: profile?.displayName || 'Admin TU',
        action: `Menghapus Tahun Pelajaran ${y.name}`,
        module: 'Tahun Pelajaran',
        details: 'Tahun pelajaran belum terpakai dihapus oleh Admin',
        timestamp: new Date().toISOString(),
      });
      notify(`Tahun pelajaran ${y.name} berhasil dihapus.`);
    } catch (err: any) {
      notify(err?.message || 'Gagal menghapus tahun pelajaran.', 'error');
    }
  };

  // Open History Snapshot Modal for a Year
  const handleOpenHistory = async (y: AcademicYear) => {
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const yearRombels = rombels.filter((r) => r.academicYear === y.name);
      const usage: YearUsageBreakdown = await checkYearUsage(y.name);

      // Count journals & grades tied to teacherBooks in this year
      const booksSnap = await getDocs(query(collection(db, 'teacher_books'), where('academicYear', '==', y.name)));
      const bookIds = booksSnap.docs.map((d) => d.id);
      let journalsCount = 0;
      let gradesCount = 0;

      if (bookIds.length > 0) {
        const [journalsSnap, gradesSnap] = await Promise.all([
          getDocs(collection(db, 'teaching_journals')),
          getDocs(collection(db, 'grade_records')),
        ]);
        const bookSet = new Set(bookIds);
        journalsCount = journalsSnap.docs.filter((d) => bookSet.has(d.data().teacherBookId)).length;
        gradesCount = gradesSnap.docs.filter((d) => bookSet.has(d.data().teacherBookId)).length;
      }

      setHistorySnapshot({
        year: y,
        rombels: yearRombels,
        rombelMembersCount: usage.rombelMembers,
        attendanceCount: usage.attendance,
        teacherBooksCount: usage.teacherBooks,
        journalsCount,
        gradesCount,
        lettersCount: usage.createdLetters + usage.incomingLetters + usage.outgoingLetters,
        archivesCount: usage.archives,
        invoicesCount: usage.invoices,
      });
    } catch (err) {
      console.error('History check error:', err);
      setHistorySnapshot({
        year: y,
        rombels: rombels.filter((r) => r.academicYear === y.name),
        rombelMembersCount: memberCountByYear[y.name] || 0,
        attendanceCount: 0,
        teacherBooksCount: 0,
        journalsCount: 0,
        gradesCount: 0,
        lettersCount: 0,
        archivesCount: 0,
        invoicesCount: 0,
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // TRANSITION / PERPINDAHAN TAHUN PELAJARAN WIZARD LOGIC
  // --------------------------------------------------------------------------
  const targetYearRombels = useMemo(() => {
    return rombels.filter((r) => r.academicYear === targetYearName);
  }, [rombels, targetYearName]);

  const sourceYearRombels = useMemo(() => {
    return rombels.filter((r) => r.academicYear === sourceYearName);
  }, [rombels, sourceYearName]);

  const buildCopyDraftsFromSource = (srcYear: string, tgtYear: string) => {
    const src = rombels.filter((r) => r.academicYear === srcYear);
    const existingTargetNames = new Set(
      rombels.filter((r) => r.academicYear === tgtYear).map((r) => r.name.toLowerCase())
    );

    const drafts: CopiedRombelDraft[] = src.map((r) => ({
      selected: !existingTargetNames.has(r.name.toLowerCase()),
      name: r.name,
      gradeLevel: r.gradeLevel,
      semester: 'Ganjil',
      homeroomTeacherId: r.homeroomTeacherId || '',
      homeroomTeacherName: r.homeroomTeacherName || '',
      room: r.room || '',
      capacity: r.capacity || 36,
      curriculum: r.curriculum || 'Kurikulum Merdeka',
    }));
    setCopyRombelDrafts(drafts);
  };

  const detectGradeFromClassName = (cls: string): 'X' | 'XI' | 'XII' => {
    const up = (cls || '').toUpperCase().trim();
    if (up.startsWith('XII')) return 'XII';
    if (up.startsWith('XI')) return 'XI';
    return 'X';
  };

  const suggestTargetRombel = (
    sourceGrade: 'X' | 'XI' | 'XII',
    sourceRombelName: string,
    targetList: Rombel[]
  ): { action: TransitionAction; targetRombelId: string } => {
    if (sourceGrade === 'XII') {
      return { action: 'GRADUATE', targetRombelId: '' };
    }
    const nextGrade: 'XI' | 'XII' = sourceGrade === 'X' ? 'XI' : 'XII';
    const candidates = targetList.filter((r) => r.gradeLevel === nextGrade);
    if (candidates.length === 0) {
      return { action: 'PROMOTE', targetRombelId: targetList[0]?.id || '' };
    }

    // Try smart name pairing (e.g. X-1 -> XI ..., XI MIPA 1 -> XII MIPA 1)
    const suffix = sourceRombelName.replace(/^X(II|I)?[\s-]*/i, '').toLowerCase();
    const matched =
      candidates.find((c) => c.name.toLowerCase().includes(suffix) && suffix.length > 0) ||
      candidates[0];
    return { action: 'PROMOTE', targetRombelId: matched.id };
  };

  const buildStudentTransitions = (srcYear: string, tgtYear: string) => {
    const tgtRombels = rombels.filter((r) => r.academicYear === tgtYear);
    const srcMembers = rombelMembers.filter((m) => m.academicYear === srcYear);
    const alreadyInTarget = new Set(
      rombelMembers.filter((m) => m.academicYear === tgtYear).map((m) => m.studentId)
    );

    const items: StudentTransitionItem[] = [];

    if (srcMembers.length > 0) {
      const seen = new Set<string>();
      srcMembers.forEach((m) => {
        if (seen.has(m.studentId) || alreadyInTarget.has(m.studentId)) return;
        seen.add(m.studentId);
        const master = students.find((s) => s.id === m.studentId);
        if (master && master.status !== 'Aktif') return;
        const srcRombel = rombels.find((r) => r.id === m.rombelId);
        const srcGrade = srcRombel?.gradeLevel || detectGradeFromClassName(m.rombelName);
        const suggestion = suggestTargetRombel(srcGrade, m.rombelName, tgtRombels);
        items.push({
          studentId: m.studentId,
          nis: m.nis,
          nisn: m.nisn,
          studentName: m.studentName,
          gender: m.gender,
          sourceRombelName: m.rombelName,
          sourceGrade: srcGrade,
          action: suggestion.action,
          targetRombelId: suggestion.targetRombelId,
        });
      });
    } else {
      // Fallback: use active master students when rombel_members wasn't populated yet
      students
        .filter((s) => s.status === 'Aktif' && !alreadyInTarget.has(s.id))
        .forEach((s) => {
          const srcGrade = detectGradeFromClassName(s.className);
          const suggestion = suggestTargetRombel(srcGrade, s.className, tgtRombels);
          items.push({
            studentId: s.id,
            nis: s.nis,
            nisn: s.nisn,
            studentName: s.name,
            gender: s.gender,
            sourceRombelName: s.className || 'Belum Ada Rombel',
            sourceGrade: srcGrade,
            action: suggestion.action,
            targetRombelId: suggestion.targetRombelId,
          });
        });
    }

    setStudentTransitions(items);
  };

  const handleOpenTransition = () => {
    const src = activeYearName;
    const otherYear = academicYears.find((y) => y.name !== src)?.name || src;
    setSourceYearName(src);
    setTargetYearName(otherYear);
    setTransitionStep('rombels');
    buildCopyDraftsFromSource(src, otherYear);
    buildStudentTransitions(src, otherYear);
    setSelectedNewStudentIds([]);
    setActivateTargetAfterTransition(false);
    setIsTransitionOpen(true);
  };

  // Update drafts & transition rows when source/target changes
  const handleChangeTransitionYears = (newSrc: string, newTgt: string) => {
    setSourceYearName(newSrc);
    setTargetYearName(newTgt);
    buildCopyDraftsFromSource(newSrc, newTgt);
    buildStudentTransitions(newSrc, newTgt);
  };

  // Save copied/new rombel structure into target academic year
  const handleCreateTargetRombelsFromDrafts = async () => {
    const selected = copyRombelDrafts.filter((d) => d.selected && d.name.trim());
    if (selected.length === 0) {
      notify('Pilih minimal 1 rombel untuk disalin atau lanjutkan ke tahap siswa.', 'error');
      return;
    }

    const existingNames = new Set(targetYearRombels.map((r) => r.name.toLowerCase()));
    const toCreate = selected.filter((d) => !existingNames.has(d.name.trim().toLowerCase()));

    if (toCreate.length === 0) {
      notify('Semua rombel terpilih sudah ada di tahun pelajaran tujuan.');
      setTransitionStep('students');
      return;
    }

    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      toCreate.forEach((d) => {
        const teacherObj = teachers.find((t) => t.id === d.homeroomTeacherId);
        const ref = doc(collection(db, 'rombels'));
        batch.set(ref, {
          name: d.name.trim(),
          gradeLevel: d.gradeLevel,
          academicYear: targetYearName,
          semester: d.semester,
          homeroomTeacherId: d.homeroomTeacherId || '',
          homeroomTeacherName: teacherObj ? teacherObj.name : d.homeroomTeacherName || '-',
          room: d.room || '',
          capacity: Number(d.capacity) || 36,
          studentCount: 0,
          maleCount: 0,
          femaleCount: 0,
          curriculum: d.curriculum,
          createdAt: now,
          updatedAt: now,
        });
      });
      await batch.commit();

      await addDoc(collection(db, 'activityLogs'), {
        userId: profile?.id || 'admin',
        userName: profile?.displayName || 'Admin TU',
        action: `Menyalin ${toCreate.length} Struktur Rombel ke TA ${targetYearName}`,
        module: 'Tahun Pelajaran',
        details: `Sumber: ${sourceYearName}`,
        timestamp: now,
      });

      notify(`${toCreate.length} rombel baru berhasil dibuat untuk TA ${targetYearName}!`);
      setTransitionStep('students');
    } catch (err: any) {
      notify('Gagal menyalin struktur rombel: ' + err.message, 'error');
    }
  };

  // Re-evaluate smart target rombels when targetYearRombels updates (e.g. after step 1)
  useEffect(() => {
    if (!isTransitionOpen || targetYearRombels.length === 0) return;
    setStudentTransitions((prev) =>
      prev.map((item) => {
        if (item.action === 'GRADUATE' || item.action === 'SKIP') return item;
        if (item.targetRombelId && targetYearRombels.some((r) => r.id === item.targetRombelId)) {
          return item;
        }
        const suggestion = suggestTargetRombel(item.sourceGrade, item.sourceRombelName, targetYearRombels);
        return {
          ...item,
          targetRombelId: suggestion.targetRombelId,
        };
      })
    );
    if (!newStudentTargetRombelId && targetYearRombels.length > 0) {
      setNewStudentTargetRombelId(targetYearRombels[0].id);
    }
  }, [targetYearRombels, isTransitionOpen]);

  const handleQuickAddTargetRombel = async () => {
    if (!newRombelQuickName.trim() || !targetYearName) return;
    const exists = targetYearRombels.some(
      (r) => r.name.toLowerCase() === newRombelQuickName.trim().toLowerCase()
    );
    if (exists) {
      notify(`Rombel "${newRombelQuickName}" sudah ada di TA ${targetYearName}.`, 'error');
      return;
    }

    const teacherObj = teachers.find((t) => t.id === newRombelQuickTeacherId);
    const now = new Date().toISOString();
    await addDoc(collection(db, 'rombels'), {
      name: newRombelQuickName.trim(),
      gradeLevel: newRombelQuickGrade,
      academicYear: targetYearName,
      semester: 'Ganjil',
      homeroomTeacherId: newRombelQuickTeacherId || '',
      homeroomTeacherName: teacherObj ? teacherObj.name : '-',
      room: newRombelQuickRoom.trim() || '',
      capacity: 36,
      studentCount: 0,
      maleCount: 0,
      femaleCount: 0,
      curriculum: 'Kurikulum Merdeka',
      createdAt: now,
      updatedAt: now,
    });

    setNewRombelQuickName('');
    setNewRombelQuickRoom('');
    notify(`Rombel "${newRombelQuickName.trim()}" ditambahkan ke TA ${targetYearName}.`);
  };

  // Candidates for "Masukkan Siswa Baru" into target year (not yet enrolled in target year)
  const unenrolledTargetStudents = useMemo(() => {
    const enrolledInTarget = new Set(
      rombelMembers.filter((m) => m.academicYear === targetYearName).map((m) => m.studentId)
    );
    return students.filter((s) => s.status === 'Aktif' && !enrolledInTarget.has(s.id));
  }, [students, rombelMembers, targetYearName]);

  const handleEnrollNewStudentsToTarget = async () => {
    if (selectedNewStudentIds.length === 0 || !newStudentTargetRombelId) {
      notify('Pilih rombel tujuan dan minimal 1 siswa.', 'error');
      return;
    }
    const targetRombel = targetYearRombels.find((r) => r.id === newStudentTargetRombelId);
    if (!targetRombel) return;

    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const chosen = students.filter((s) => selectedNewStudentIds.includes(s.id));

      chosen.forEach((s) => {
        const memRef = doc(collection(db, 'rombel_members'));
        batch.set(memRef, {
          rombelId: targetRombel.id,
          rombelName: targetRombel.name,
          academicYear: targetRombel.academicYear,
          semester: targetRombel.semester || 'Ganjil',
          studentId: s.id,
          nis: s.nis,
          nisn: s.nisn || '-',
          studentName: s.name,
          gender: s.gender,
          notes: 'Dimasukkan pada persiapan tahun pelajaran',
          joinedAt: now,
        });
        batch.update(doc(db, 'students', s.id), {
          className: targetRombel.name,
          updatedAt: now,
        });
      });

      const currentMembers = rombelMembers.filter((m) => m.rombelId === targetRombel.id);
      const totalAll = currentMembers.length + chosen.length;
      const maleAll =
        currentMembers.filter((m) => m.gender === 'L').length +
        chosen.filter((s) => s.gender === 'L').length;
      const femaleAll = totalAll - maleAll;

      batch.update(doc(db, 'rombels', targetRombel.id), {
        studentCount: totalAll,
        maleCount: maleAll,
        femaleCount: femaleAll,
        updatedAt: now,
      });

      await batch.commit();
      setSelectedNewStudentIds([]);
      notify(`${chosen.length} siswa berhasil dimasukkan ke rombel ${targetRombel.name} (${targetYearName}).`);
    } catch (err: any) {
      notify('Gagal memasukkan siswa: ' + err.message, 'error');
    }
  };

  // Filtered transition table
  const filteredTransitions = useMemo(() => {
    return studentTransitions.filter((t) => {
      const matchGrade = transitionGradeFilter === 'ALL' || t.sourceGrade === transitionGradeFilter;
      const matchSearch =
        !transitionSearch ||
        t.studentName.toLowerCase().includes(transitionSearch.toLowerCase()) ||
        t.nis.includes(transitionSearch) ||
        t.sourceRombelName.toLowerCase().includes(transitionSearch.toLowerCase());
      return matchGrade && matchSearch;
    });
  }, [studentTransitions, transitionGradeFilter, transitionSearch]);

  // Transition summary stats
  const transitionSummary = useMemo(() => {
    const promoteCount = studentTransitions.filter(
      (i) => (i.action === 'PROMOTE' || i.action === 'ASSIGN') && i.targetRombelId
    ).length;
    const graduateCount = studentTransitions.filter((i) => i.action === 'GRADUATE').length;
    const skipCount = studentTransitions.filter((i) => i.action === 'SKIP' || ((i.action === 'PROMOTE' || i.action === 'ASSIGN') && !i.targetRombelId)).length;
    return { promoteCount, graduateCount, skipCount };
  }, [studentTransitions]);

  const handleExecuteTransition = async () => {
    if (!targetYearName || sourceYearName === targetYearName) {
      notify('Tahun pelajaran asal dan tujuan harus berbeda.', 'error');
      return;
    }

    setExecutingTransition(true);
    try {
      const now = new Date().toISOString();
      const targetYearObj = academicYears.find((y) => y.name === targetYearName);
      const graduationYearStr = String(
        academicYears.find((y) => y.name === sourceYearName)?.endYear || new Date().getFullYear()
      );

      // Chunk writes cleanly (max ~400 ops per batch)
      const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
      const rombelAddedCounts: Record<string, { total: number; male: number }> = {};

      for (const item of studentTransitions) {
        if ((item.action === 'PROMOTE' || item.action === 'ASSIGN') && item.targetRombelId) {
          const targetRombel = targetYearRombels.find((r) => r.id === item.targetRombelId);
          if (!targetRombel) continue;

          if (!rombelAddedCounts[targetRombel.id]) {
            rombelAddedCounts[targetRombel.id] = { total: 0, male: 0 };
          }
          rombelAddedCounts[targetRombel.id].total += 1;
          if (item.gender === 'L') rombelAddedCounts[targetRombel.id].male += 1;

          ops.push((batch) => {
            const memRef = doc(collection(db, 'rombel_members'));
            batch.set(memRef, {
              rombelId: targetRombel.id,
              rombelName: targetRombel.name,
              academicYear: targetYearName,
              semester: targetRombel.semester || 'Ganjil',
              studentId: item.studentId,
              nis: item.nis,
              nisn: item.nisn || '-',
              studentName: item.studentName,
              gender: item.gender,
              notes:
                item.action === 'PROMOTE'
                  ? `Kenaikan kelas dari ${item.sourceRombelName} (${sourceYearName})`
                  : `Penempatan rombel dari ${item.sourceRombelName} (${sourceYearName})`,
              joinedAt: now,
            });
            batch.update(doc(db, 'students', item.studentId), {
              className: targetRombel.name,
              updatedAt: now,
            });
          });
        } else if (item.action === 'GRADUATE') {
          const master = students.find((s) => s.id === item.studentId);
          const alreadyAlumni = alumniList.some(
            (a) => a.nis === item.nis || (a.nisn && a.nisn === item.nisn && a.nisn !== '-')
          );
          ops.push((batch) => {
            batch.update(doc(db, 'students', item.studentId), {
              status: 'Lulus',
              updatedAt: now,
            });
            if (!alreadyAlumni) {
              const alumRef = doc(collection(db, 'alumni'));
              batch.set(alumRef, {
                name: item.studentName,
                nis: item.nis,
                nisn: item.nisn || '-',
                graduationYear: graduationYearStr,
                phone: master?.phone || '',
                email: '',
                currentActivity: 'Lulus SMA Ma’arif 05 Padang Ratu',
                address: master?.address || 'Padang Ratu, Lampung Tengah',
                createdAt: now,
              });
            }
          });
        }
      }

      // Update counts on affected target rombels
      Object.entries(rombelAddedCounts).forEach(([rid, added]) => {
        const existingMembers = rombelMembers.filter((m) => m.rombelId === rid);
        const total = existingMembers.length + added.total;
        const male = existingMembers.filter((m) => m.gender === 'L').length + added.male;
        const female = total - male;
        ops.push((batch) => {
          batch.update(doc(db, 'rombels', rid), {
            studentCount: total,
            maleCount: male,
            femaleCount: female,
            updatedAt: now,
          });
        });
      });

      // Execute in chunks of 200 ops (each op can contain 2 writes)
      for (let i = 0; i < ops.length; i += 200) {
        const chunk = ops.slice(i, i + 200);
        const batch = writeBatch(db);
        chunk.forEach((fn) => fn(batch));
        await batch.commit();
      }

      if (activateTargetAfterTransition && targetYearObj) {
        await activateAcademicYear(targetYearObj.id);
      }

      await addDoc(collection(db, 'activityLogs'), {
        userId: profile?.id || 'admin',
        userName: profile?.displayName || 'Admin TU',
        action: `Eksekusi Perpindahan Tahun Pelajaran ${sourceYearName} → ${targetYearName}`,
        module: 'Tahun Pelajaran',
        details: `${transitionSummary.promoteCount} siswa ditempatkan/naik kelas, ${transitionSummary.graduateCount} siswa lulus. Data tahun ${sourceYearName} tetap tersimpan.`,
        timestamp: now,
      });

      notify(
        `Perpindahan tahun pelajaran selesai: ${transitionSummary.promoteCount} siswa masuk rombel baru & ${transitionSummary.graduateCount} siswa diluluskan.`
      );
      setIsTransitionOpen(false);
    } catch (err: any) {
      notify('Gagal mengeksekusi perpindahan tahun pelajaran: ' + err.message, 'error');
    } finally {
      setExecutingTransition(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl shadow-xl flex items-start gap-2.5 text-xs font-semibold border ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Manajemen Tahun Pelajaran
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pengaturan tahun pelajaran aktif, pergantian semester, arsip riwayat tahunan, dan perpindahan rombel & kenaikan kelas terpadu
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenTransition}
            className="whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Perpindahan Tahun Pelajaran</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="whitespace-nowrap shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tahun Pelajaran</span>
          </button>
        </div>
      </div>

      {/* Active Year Highlight + KPI Grid (Single-Elevation, Zero Nested Sandwiches) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>Tahun Pelajaran Aktif</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-2">
            {activeYearName}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Default otomatis di seluruh modul SITUS
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
            <span>Semester Aktif</span>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {activeSemester}
            </span>
            {activeAcademicYear && (
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-[11px] font-bold">
                <button
                  onClick={() => handleToggleSemester(activeAcademicYear, 'Ganjil')}
                  className={`px-2.5 py-1 cursor-pointer transition ${
                    activeSemester === 'Ganjil'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Ganjil
                </button>
                <button
                  onClick={() => handleToggleSemester(activeAcademicYear, 'Genap')}
                  className={`px-2.5 py-1 cursor-pointer transition ${
                    activeSemester === 'Genap'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Genap
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Klik Ganjil/Genap untuk pergantian semester
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>Total Tahun Pelajaran</span>
            <History className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-2">
            {academicYears.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Riwayat tahun ajaran tersimpan permanen
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>Rombel Tahun Aktif</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-2">
            {rombelCountByYear[activeYearName] || 0}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {memberCountByYear[activeYearName] || 0} siswa terdaftar pada TA {activeYearName}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari tahun pelajaran (misal: 2026/2027) atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          {(['ALL', 'Aktif', 'Tidak Aktif'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Academic Years Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Tahun Pelajaran</th>
                <th className="py-3 px-4">Semester Aktif</th>
                <th className="py-3 px-4">Tanggal Mulai</th>
                <th className="py-3 px-4">Tanggal Selesai</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4 text-center"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-6 mx-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-28" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                    <td className="py-3.5 px-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-20 mx-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-44 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredYears.length > 0 ? (
                filteredYears.map((y, idx) => {
                  const isActive = y.status === 'Aktif';
                  const rCount = rombelCountByYear[y.name] || 0;
                  return (
                    <tr
                      key={y.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isActive ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-sm text-slate-900 dark:text-white font-mono tabular-nums">
                          {y.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {rCount} Rombel • {memberCountByYear[y.name] || 0} Anggota Siswa
                          {y.notes ? ` • ${y.notes}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-[11px] font-bold">
                          <button
                            onClick={() => handleToggleSemester(y, 'Ganjil')}
                            className={`px-2.5 py-1 cursor-pointer transition ${
                              y.activeSemester === 'Ganjil'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Ganjil
                          </button>
                          <button
                            onClick={() => handleToggleSemester(y, 'Genap')}
                            className={`px-2.5 py-1 cursor-pointer transition ${
                              y.activeSemester === 'Genap'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Genap
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {y.startDate}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {y.endDate}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tidak Aktif</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isActive ? (
                            <button
                              onClick={() => handleDeactivate(y)}
                              className="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer transition"
                              title="Nonaktifkan Tahun Pelajaran"
                            >
                              Nonaktifkan
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(y)}
                              className="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer transition flex items-center gap-1"
                              title="Jadikan Tahun Pelajaran Aktif"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aktifkan</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenHistory(y)}
                            className="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] cursor-pointer transition flex items-center gap-1"
                            title="Lihat Riwayat Data Tahun Pelajaran"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Riwayat</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(y)}
                            className="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] cursor-pointer transition flex items-center gap-1"
                            title="Edit Tahun Pelajaran"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDelete(y)}
                            className="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer transition flex items-center gap-1"
                            title="Hapus (Hanya jika belum digunakan)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
                      Belum ada tahun pelajaran yang sesuai filter pencarian.
                    </p>
                    <button
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Tahun Pelajaran Pertama</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preservation Notice Footer */}
      <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Jaminan Keamanan Data Historis & Konsistensi Sistem</p>
          <p className="text-[11px] opacity-90 leading-relaxed">
            Hanya <strong>satu</strong> tahun pelajaran yang boleh berstatus <strong>Aktif</strong> pada satu waktu. Saat Admin mengaktifkan tahun pelajaran baru, seluruh data rombel, anggota kelas, absensi, nilai, jurnal mengajar, surat, dan arsip pada tahun pelajaran sebelumnya <strong>tetap tersimpan utuh</strong> dan dapat dibuka kembali kapan saja melalui tombol <strong>Riwayat</strong> atau filter tahun pelajaran di masing-masing modul.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: TAMBAH / EDIT TAHUN PELAJARAN                                  */}
      {/* ===================================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-blue-600" />
                <span>{editingYear ? `Edit Tahun Pelajaran (${editingYear.name})` : 'Tambah Tahun Pelajaran Baru'}</span>
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveYear} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tahun Awal *
                  </label>
                  <input
                    type="number"
                    min={2015}
                    max={2099}
                    required
                    value={formStartYear}
                    onChange={(e) => handleStartYearChange(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tahun Akhir *
                  </label>
                  <input
                    type="number"
                    min={2016}
                    max={2100}
                    required
                    value={formEndYear}
                    onChange={(e) => {
                      setFormEndYearManual(true);
                      setFormEndYear(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <span className="font-semibold text-blue-800 dark:text-blue-300">
                  Nama Tahun Pelajaran (Otomatis):
                </span>
                <span className="text-base font-black font-mono text-blue-900 dark:text-white">
                  {autoYearName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Semester Aktif *
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value as 'Ganjil' | 'Genap')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Aktif' | 'Tidak Aktif')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold outline-none"
                  >
                    <option value="Tidak Aktif">Tidak Aktif</option>
                    <option value="Aktif">Aktif (Tahun Berjalan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Mulai Tahun Pelajaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Berakhir Tahun Pelajaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Kurikulum Merdeka Fase E & F"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              {formStatus === 'Aktif' && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                  Memilih status <strong>Aktif</strong> akan otomatis menonaktifkan tahun pelajaran lain yang sedang aktif dan menjadikan <strong>{autoYearName}</strong> sebagai tahun default di semua modul.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : editingYear ? 'Simpan Perubahan' : 'Simpan Tahun Pelajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RIWAYAT DATA TAHUN PELAJARAN                                   */}
      {/* ===================================================================== */}
      {historyModalOpen && historySnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>Riwayat & Arsip Tahun Pelajaran {historySnapshot.year.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periode {historySnapshot.year.startDate} s.d. {historySnapshot.year.endDate} • Semester {historySnapshot.year.activeSemester}
                </p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Memuat statistik arsip tahun pelajaran {historySnapshot.year.name}...
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      <span>Rombel</span>
                    </div>
                    <div className="text-xl font-black font-mono tabular-nums mt-1 text-slate-900 dark:text-white">
                      {historySnapshot.rombels.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Siswa Rombel</span>
                    </div>
                    <div className="text-xl font-black font-mono tabular-nums mt-1 text-slate-900 dark:text-white">
                      {historySnapshot.rombelMembersCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>Rekap Absensi</span>
                    </div>
                    <div className="text-xl font-black font-mono tabular-nums mt-1 text-slate-900 dark:text-white">
                      {historySnapshot.attendanceCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Buku Guru / Jurnal</span>
                    </div>
                    <div className="text-xl font-black font-mono tabular-nums mt-1 text-slate-900 dark:text-white">
                      {historySnapshot.teacherBooksCount} / {historySnapshot.journalsCount}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Rekam Nilai Siswa:</span>
                    <span className="font-black font-mono tabular-nums">{historySnapshot.gradesCount}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Dokumen Surat:</span>
                    <span className="font-black font-mono tabular-nums">{historySnapshot.lettersCount}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Arsip & Tagihan:</span>
                    <span className="font-black font-mono tabular-nums">
                      {historySnapshot.archivesCount + historySnapshot.invoicesCount}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    Daftar Rombel & Wali Kelas pada TA {historySnapshot.year.name}
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2.5">Kelas / Rombel</th>
                          <th className="p-2.5 text-center">Tingkat</th>
                          <th className="p-2.5">Wali Kelas</th>
                          <th className="p-2.5 text-center">Siswa (L/P)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {historySnapshot.rombels.length > 0 ? (
                          historySnapshot.rombels.map((r) => (
                            <tr key={r.id}>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">{r.name}</td>
                              <td className="p-2.5 text-center font-mono">{r.gradeLevel}</td>
                              <td className="p-2.5">{r.homeroomTeacherName || '-'}</td>
                              <td className="p-2.5 text-center font-mono tabular-nums">
                                {r.studentCount} ({r.maleCount}L / {r.femaleCount}P)
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400">
                              Belum ada rombel tercatat pada tahun pelajaran {historySnapshot.year.name}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PERPINDAHAN TAHUN PELAJARAN (WIZARD 4 LANGKAH)                */}
      {/* ===================================================================== */}
      {isTransitionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                  <span>Persiapan & Perpindahan Tahun Pelajaran Baru</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Salin struktur rombel, tentukan wali kelas baru, proses kenaikan kelas (X → XI → XII), penempatan siswa, & kelulusan kelas XII tanpa menghapus data tahun lama.
                </p>
              </div>
              <button onClick={() => setIsTransitionOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source -> Target Selector + Step Tabs */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-500">Tahun Asal:</span>
                <select
                  value={sourceYearName}
                  onChange={(e) => handleChangeTransitionYears(e.target.value, targetYearName)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold font-mono"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.name}>
                      {y.name} ({y.status})
                    </option>
                  ))}
                </select>
                <ArrowRight className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-slate-500">Tahun Tujuan:</span>
                <select
                  value={targetYearName}
                  onChange={(e) => handleChangeTransitionYears(sourceYearName, e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold font-mono"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.name}>
                      {y.name} ({y.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl font-bold">
                {[
                  { key: 'rombels', label: '1. Struktur Rombel' },
                  { key: 'students', label: '2. Kenaikan & Kelulusan' },
                  { key: 'new_students', label: '3. Siswa Baru' },
                  { key: 'confirm', label: '4. Konfirmasi' },
                ].map((st) => (
                  <button
                    key={st.key}
                    onClick={() => setTransitionStep(st.key as any)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition text-[11px] ${
                      transitionStep === st.key
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step Body */}
            <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
              {sourceYearName === targetYearName && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Tahun Asal dan Tahun Tujuan saat ini sama ({sourceYearName}). Silakan tambah atau pilih Tahun Pelajaran baru sebagai Tahun Tujuan terlebih dahulu.
                  </span>
                </div>
              )}

              {/* STEP 1: STRUKTUR ROMBEL & WALI KELAS */}
              {transitionStep === 'rombels' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Salin Struktur Rombel & Tentukan Wali Kelas TA {targetYearName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Rombel sudah ada di TA {targetYearName}: <strong>{targetYearRombels.length} kelas</strong>. Centang rombel dari TA {sourceYearName} untuk disalin atau tambah rombel baru di bawah.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateTargetRombelsFromDrafts}
                      disabled={sourceYearName === targetYearName || copyRombelDrafts.length === 0}
                      className="whitespace-nowrap px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Buat Struktur Rombel Terpilih</span>
                    </button>
                  </div>

                  {/* Table of source rombels to copy */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2.5 w-10 text-center">Pilih</th>
                          <th className="p-2.5">Nama Rombel Baru</th>
                          <th className="p-2.5 w-24">Tingkat</th>
                          <th className="p-2.5">Wali Kelas Tahun Baru</th>
                          <th className="p-2.5 w-28">Ruang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {copyRombelDrafts.length > 0 ? (
                          copyRombelDrafts.map((d, idx) => (
                            <tr key={idx}>
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={d.selected}
                                  onChange={(e) => {
                                    const copy = [...copyRombelDrafts];
                                    copy[idx].selected = e.target.checked;
                                    setCopyRombelDrafts(copy);
                                  }}
                                  className="w-4 h-4 rounded cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={d.name}
                                  onChange={(e) => {
                                    const copy = [...copyRombelDrafts];
                                    copy[idx].name = e.target.value;
                                    setCopyRombelDrafts(copy);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                />
                              </td>
                              <td className="p-2.5">
                                <select
                                  value={d.gradeLevel}
                                  onChange={(e) => {
                                    const copy = [...copyRombelDrafts];
                                    copy[idx].gradeLevel = e.target.value as any;
                                    setCopyRombelDrafts(copy);
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                >
                                  <option value="X">X</option>
                                  <option value="XI">XI</option>
                                  <option value="XII">XII</option>
                                </select>
                              </td>
                              <td className="p-2.5">
                                <select
                                  value={d.homeroomTeacherId}
                                  onChange={(e) => {
                                    const copy = [...copyRombelDrafts];
                                    const tObj = teachers.find((t) => t.id === e.target.value);
                                    copy[idx].homeroomTeacherId = e.target.value;
                                    copy[idx].homeroomTeacherName = tObj ? tObj.name : '';
                                    setCopyRombelDrafts(copy);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                >
                                  <option value="">-- Pilih Wali Kelas --</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={d.room}
                                  onChange={(e) => {
                                    const copy = [...copyRombelDrafts];
                                    copy[idx].room = e.target.value;
                                    setCopyRombelDrafts(copy);
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              Belum ada rombel pada tahun pelajaran asal ({sourceYearName}). Gunakan formulir cepat di bawah untuk membuat rombel baru di TA {targetYearName}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Create New Rombel for Target Year */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200">
                      Tambah Rombel Baru Secara Langsung untuk TA {targetYearName}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Rombel (misal: X-3)"
                        value={newRombelQuickName}
                        onChange={(e) => setNewRombelQuickName(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      />
                      <select
                        value={newRombelQuickGrade}
                        onChange={(e) => setNewRombelQuickGrade(e.target.value as any)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="X">Tingkat X</option>
                        <option value="XI">Tingkat XI</option>
                        <option value="XII">Tingkat XII</option>
                      </select>
                      <select
                        value={newRombelQuickTeacherId}
                        onChange={(e) => setNewRombelQuickTeacherId(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="">-- Wali Kelas --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Ruang (misal: R.07)"
                        value={newRombelQuickRoom}
                        onChange={(e) => setNewRombelQuickRoom(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddTargetRombel}
                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      >
                        + Tambah Rombel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: KENAIKAN KELAS, PINDAH ROMBEL & KELULUSAN */}
              {transitionStep === 'students' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Kenaikan Kelas (X → XI, XI → XII), Penempatan Rombel, & Kelulusan XII
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Tinjau rencana perpindahan tiap siswa. Siswa kelas XII otomatis disarankan status <strong>Lulus</strong> (dipindahkan ke database Alumni).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Cari nama / NIS..."
                        value={transitionSearch}
                        onChange={(e) => setTransitionSearch(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                      />
                      <select
                        value={transitionGradeFilter}
                        onChange={(e) => setTransitionGradeFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      >
                        <option value="ALL">Semua Tingkat</option>
                        <option value="X">Kelas X</option>
                        <option value="XI">Kelas XI</option>
                        <option value="XII">Kelas XII</option>
                      </select>
                    </div>
                  </div>

                  {targetYearRombels.length === 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                      Belum ada rombel di tahun pelajaran tujuan ({targetYearName}). Kembali ke langkah <strong>1. Struktur Rombel</strong> untuk membuat/menyalin kelas terlebih dahulu.
                    </div>
                  )}

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2.5 w-10 text-center">No</th>
                          <th className="p-2.5">Siswa (NIS)</th>
                          <th className="p-2.5">Asal ({sourceYearName})</th>
                          <th className="p-2.5 w-44">Tindakan Perpindahan</th>
                          <th className="p-2.5">Rombel Tujuan ({targetYearName})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTransitions.length > 0 ? (
                          filteredTransitions.map((item, idx) => (
                            <tr key={item.studentId}>
                              <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900 dark:text-white">{item.studentName}</div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  NIS: {item.nis} • {item.gender}
                                </div>
                              </td>
                              <td className="p-2.5">
                                <span className="font-semibold">{item.sourceRombelName}</span>
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                                  Tingkat {item.sourceGrade}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <select
                                  value={item.action}
                                  onChange={(e) => {
                                    const nextAction = e.target.value as TransitionAction;
                                    setStudentTransitions((prev) =>
                                      prev.map((row) =>
                                        row.studentId === item.studentId
                                          ? { ...row, action: nextAction }
                                          : row
                                      )
                                    );
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                >
                                  <option value="PROMOTE">Naik Kelas</option>
                                  <option value="ASSIGN">Pindah / Tetap Rombel</option>
                                  <option value="GRADUATE">Luluskan (Alumni)</option>
                                  <option value="SKIP">Lewati (Jangan Proses)</option>
                                </select>
                              </td>
                              <td className="p-2.5">
                                {item.action === 'GRADUATE' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold text-[11px]">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span>Status: Lulus & Masuk Alumni</span>
                                  </span>
                                ) : item.action === 'SKIP' ? (
                                  <span className="text-slate-400 italic">Tidak dipindahkan</span>
                                ) : (
                                  <select
                                    value={item.targetRombelId}
                                    onChange={(e) => {
                                      const rid = e.target.value;
                                      setStudentTransitions((prev) =>
                                        prev.map((row) =>
                                          row.studentId === item.studentId
                                            ? { ...row, targetRombelId: rid }
                                            : row
                                        )
                                      );
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                                  >
                                    <option value="">-- Pilih Rombel Tujuan --</option>
                                    {targetYearRombels.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.name} (Tingkat {r.gradeLevel})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              Tidak ada siswa yang perlu dipindahkan dari TA {sourceYearName}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 3: MASUKKAN SISWA BARU KE ROMBEL TAHUN BARU */}
              {transitionStep === 'new_students' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Masukkan Siswa Baru / Belum Terdaftar ke Rombel TA {targetYearName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Menampilkan peserta didik aktif di database induk yang belum terdaftar pada rombel manapun di TA {targetYearName}.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        Rombel Tujuan ({targetYearName}):
                      </span>
                      <select
                        value={newStudentTargetRombelId}
                        onChange={(e) => setNewStudentTargetRombelId(e.target.value)}
                        className="flex-1 max-w-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="">-- Pilih Rombel --</option>
                        {targetYearRombels.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Tingkat {r.gradeLevel})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleEnrollNewStudentsToTarget}
                      disabled={selectedNewStudentIds.length === 0 || !newStudentTargetRombelId}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Masukkan {selectedNewStudentIds.length} Siswa ke Rombel</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2.5 w-10 text-center">Pilih</th>
                          <th className="p-2.5">NIS</th>
                          <th className="p-2.5">Nama Siswa</th>
                          <th className="p-2.5 text-center">L/P</th>
                          <th className="p-2.5">Kelas Saat Ini</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {unenrolledTargetStudents.length > 0 ? (
                          unenrolledTargetStudents.map((s) => (
                            <tr key={s.id}>
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedNewStudentIds.includes(s.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedNewStudentIds((prev) => [...prev, s.id]);
                                    } else {
                                      setSelectedNewStudentIds((prev) => prev.filter((id) => id !== s.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5 font-mono">{s.nis}</td>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                              <td className="p-2.5 text-center font-bold">{s.gender}</td>
                              <td className="p-2.5">{s.className}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400">
                              Seluruh peserta didik aktif sudah masuk ke rombel di TA {targetYearName}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 4: KONFIRMASI ADMIN */}
              {transitionStep === 'confirm' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                    <h4 className="font-black text-sm text-blue-900 dark:text-blue-200">
                      Ringkasan Eksekusi Perpindahan Tahun Pelajaran ({sourceYearName} → {targetYearName})
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Harap periksa kembali ringkasan berikut sebelum konfirmasi. Proses ini aman dan <strong>tidak menghapus data tahun {sourceYearName}</strong>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
                      <div className="text-slate-500 font-semibold">Naik Kelas / Masuk Rombel Baru</div>
                      <div className="text-2xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                        {transitionSummary.promoteCount} Siswa
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20">
                      <div className="text-slate-500 font-semibold">Diluluskan (XII → Alumni)</div>
                      <div className="text-2xl font-black font-mono tabular-nums text-purple-700 dark:text-purple-400 mt-1">
                        {transitionSummary.graduateCount} Siswa
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-500 font-semibold">Dilewati / Belum Dipilih</div>
                      <div className="text-2xl font-black font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-1">
                        {transitionSummary.skipCount} Siswa
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activateTargetAfterTransition}
                      onChange={(e) => setActivateTargetAfterTransition(e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Langsung Aktifkan Tahun Pelajaran {targetYearName} setelah perpindahan selesai
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Jika dicentang, {targetYearName} otomatis menjadi Tahun Pelajaran Aktif di seluruh modul SITUS.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                Rombel Tahun {targetYearName}: <strong>{targetYearRombels.length}</strong> kelas siap menerima siswa
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransitionOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>

                {transitionStep !== 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (transitionStep === 'rombels') setTransitionStep('students');
                      else if (transitionStep === 'students') setTransitionStep('new_students');
                      else if (transitionStep === 'new_students') setTransitionStep('confirm');
                    }}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Lanjut</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={executingTransition || sourceYearName === targetYearName}
                    onClick={handleExecuteTransition}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {executingTransition
                        ? 'Memproses Perpindahan...'
                        : 'Konfirmasi & Eksekusi Perpindahan'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
