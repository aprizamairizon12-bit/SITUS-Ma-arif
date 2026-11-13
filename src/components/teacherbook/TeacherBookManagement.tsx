import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Users,
  CalendarCheck,
  Award,
  FileText,
  Bookmark,
  Printer,
  Download,
  FileSpreadsheet,
  Check,
  X,
  Search,
  Filter,
  Save,
  ChevronRight,
  Calculator,
  Sliders,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  TeacherBook,
  GradeAssessment,
  GradeRecord,
  TeachingJournal,
  LearningObjective,
  Rombel,
  RombelMember,
  Teacher,
  AssessmentType,
} from '../../types';
import { KopSuratView } from '../common/KopSuratView';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { exportTeacherGradesToExcel } from '../../utils/excelExport';

export const TeacherBookManagement: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const { activeYearName, activeSemester, academicYearNames } = useAcademicYear();
  const [selectedBookYear, setSelectedBookYear] = useState<string>(activeYearName || 'ALL');

  useEffect(() => {
    if (activeYearName) {
      setSelectedBookYear(activeYearName);
    }
  }, [activeYearName]);

  // Primary data states
  const [books, setBooks] = useState<TeacherBook[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rombels, setRombels] = useState<Rombel[]>([]);
  const [activeBookId, setActiveBookId] = useState<string>('');

  // Sub-tab view inside Teacher Book
  type SubTab = 'identity' | 'students' | 'attendance' | 'grades' | 'journal' | 'cptp' | 'recap' | 'print';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('identity');

  // Book content data
  const [assessments, setAssessments] = useState<GradeAssessment[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [learningObjectives, setLearningObjectives] = useState<LearningObjective[]>([]);
  const [rombelMembers, setRombelMembers] = useState<RombelMember[]>([]);

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<TeacherBook | null>(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<GradeAssessment | null>(null);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<TeachingJournal | null>(null);
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<LearningObjective | null>(null);

  // Print booklet customization
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'F4'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printSections, setPrintSections] = useState({
    cover: true,
    identity: true,
    students: true,
    attendance: true,
    journal: true,
    grades: true,
    recap: true,
  });

  // Inline grades draft: studentId_assessmentId -> score
  const [gradesDraft, setGradesDraft] = useState<Record<string, number>>({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradesSavedAlert, setGradesSavedAlert] = useState(false);

  // Form State for Teacher Book
  const initialBookForm = {
    teacherId: '',
    teacherName: '',
    teacherNip: '',
    teacherNuptk: '',
    subject: 'Bahasa Indonesia',
    gradeLevel: 'X' as 'X' | 'XI' | 'XII',
    rombelId: '',
    rombelName: '',
    academicYear: activeYearName || settings.academicYear || '2026/2027',
    semester: activeSemester || ('Ganjil' as 'Ganjil' | 'Genap'),
    schoolName: settings.schoolName || "SMAS MA'ARIF 05 PADANG RATU",
    kkm: 75,
    formula: 'RATA_RATA' as 'RATA_RATA' | 'BOBOT_KOMPONEN',
    weightAssignments: 30,
    weightDailyExams: 30,
    weightMidExam: 20,
    weightFinalExam: 20,
    notes: '',
  };
  const [bookFormData, setBookFormData] = useState(initialBookForm);

  // Form State for Assessment column
  const initialAssessmentForm = {
    code: 'PH 1',
    name: 'Penilaian Harian 1',
    type: 'PH' as AssessmentType,
    date: new Date().toISOString().split('T')[0],
    weight: 1,
    maxScore: 100,
    notes: '',
  };
  const [assessmentFormData, setAssessmentFormData] = useState(initialAssessmentForm);

  // Form State for Teaching Journal
  const initialJournalForm = {
    date: new Date().toISOString().split('T')[0],
    dayName: 'Senin',
    periodHours: 'Jam 1 - 2 (07.30 - 09.00)',
    topic: '',
    learningObjective: '',
    activities: '',
    method: 'Problem Based Learning & Diskusi Kelompok',
    attendancePresent: 30,
    attendanceSick: 0,
    attendancePermit: 0,
    attendanceAbsent: 0,
    teacherNotes: '',
  };
  const [journalFormData, setJournalFormData] = useState(initialJournalForm);

  // Form State for CP/TP
  const initialObjectiveForm = {
    element: 'Pemahaman & Keterampilan Proses',
    cp: '',
    tp: '',
    materials: '',
    assessmentTechnique: 'Tes Tertulis & Observasi Kinerja',
    progressDescription: '',
  };
  const [objectiveFormData, setObjectiveFormData] = useState(initialObjectiveForm);

  // Subscribe to Teachers and Rombels
  useEffect(() => {
    const unsubTeachers = onSnapshot(query(collection(db, 'teachers'), orderBy('name', 'asc')), (snap) => {
      setTeachers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher)));
    });

    const unsubRombels = onSnapshot(query(collection(db, 'rombels'), orderBy('name', 'asc')), (snap) => {
      setRombels(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rombel)));
    });

    return () => {
      unsubTeachers();
      unsubRombels();
    };
  }, []);

  // Subscribe to Teacher Books
  useEffect(() => {
    const qBooks = query(collection(db, 'teacher_books'), orderBy('updatedAt', 'desc'));
    const unsubBooks = onSnapshot(qBooks, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherBook));
      setBooks(docs);
      if (docs.length > 0 && !activeBookId) {
        setActiveBookId(docs[0].id);
      }
    });

    return () => unsubBooks();
  }, [activeBookId]);

  // Active Selected Book
  const activeBook = useMemo(() => {
    return books.find((b) => b.id === activeBookId) || null;
  }, [books, activeBookId]);

  // Load content of active teacher book
  useEffect(() => {
    if (!activeBookId || !activeBook) return;

    // Load Rombel Members
    const qMembers = query(
      collection(db, 'rombel_members'),
      where('rombelId', '==', activeBook.rombelId),
      orderBy('studentName', 'asc')
    );
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      setRombelMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RombelMember)));
    });

    // Load Assessments
    const qAssessments = query(
      collection(db, 'grade_assessments'),
      where('teacherBookId', '==', activeBookId),
      orderBy('order', 'asc')
    );
    const unsubAssessments = onSnapshot(qAssessments, (snap) => {
      setAssessments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GradeAssessment)));
    });

    // Load Grades
    const qGrades = query(
      collection(db, 'grade_records'),
      where('teacherBookId', '==', activeBookId)
    );
    const unsubGrades = onSnapshot(qGrades, (snap) => {
      const records = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GradeRecord));
      setGradeRecords(records);

      const draft: Record<string, number> = {};
      records.forEach((r) => {
        draft[`${r.studentId}_${r.assessmentId}`] = r.score;
      });
      setGradesDraft(draft);
    });

    // Load Journals
    const qJournals = query(
      collection(db, 'teaching_journals'),
      where('teacherBookId', '==', activeBookId),
      orderBy('date', 'desc')
    );
    const unsubJournals = onSnapshot(qJournals, (snap) => {
      setJournals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeachingJournal)));
    });

    // Load Objectives
    const qObjectives = query(
      collection(db, 'learning_objectives'),
      where('teacherBookId', '==', activeBookId),
      orderBy('createdAt', 'asc')
    );
    const unsubObjectives = onSnapshot(qObjectives, (snap) => {
      setLearningObjectives(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LearningObjective)));
    });

    return () => {
      unsubMembers();
      unsubAssessments();
      unsubGrades();
      unsubJournals();
      unsubObjectives();
    };
  }, [activeBookId, activeBook]);

  // RBAC + Academic Year Filter for Books: Guru can only see their own book, admin/TU/kepsek can supervise all
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchYear = selectedBookYear === 'ALL' || b.academicYear === selectedBookYear;
      if (!matchYear) return false;
      if (profile?.role === 'guru') {
        return (
          b.teacherName.toLowerCase() === profile.displayName?.toLowerCase() ||
          b.teacherId === profile.id
        );
      }
      return true;
    });
  }, [books, profile, selectedBookYear]);

  useEffect(() => {
    if (filteredBooks.length > 0 && !filteredBooks.some((b) => b.id === activeBookId)) {
      setActiveBookId(filteredBooks[0].id);
    } else if (filteredBooks.length === 0) {
      setActiveBookId('');
    }
  }, [filteredBooks, activeBookId]);

  // Handlers for Teacher Book CRUD
  const handleOpenAddBook = () => {
    setEditingBook(null);
    setBookFormData({
      ...initialBookForm,
      academicYear: (selectedBookYear !== 'ALL' ? selectedBookYear : activeYearName) || settings.academicYear || '2026/2027',
      semester: activeSemester || 'Ganjil',
      schoolName: settings.schoolName || "SMAS MA'ARIF 05 PADANG RATU",
    });
    setIsBookModalOpen(true);
  };

  const handleOpenEditBook = (b: TeacherBook) => {
    setEditingBook(b);
    setBookFormData({
      teacherId: b.teacherId,
      teacherName: b.teacherName,
      teacherNip: b.teacherNip || '',
      teacherNuptk: b.teacherNuptk || '',
      subject: b.subject,
      gradeLevel: b.gradeLevel,
      rombelId: b.rombelId,
      rombelName: b.rombelName,
      academicYear: b.academicYear,
      semester: b.semester,
      schoolName: b.schoolName,
      kkm: b.kkm || 75,
      formula: b.formula || 'RATA_RATA',
      weightAssignments: b.weightAssignments || 30,
      weightDailyExams: b.weightDailyExams || 30,
      weightMidExam: b.weightMidExam || 20,
      weightFinalExam: b.weightFinalExam || 20,
      notes: b.notes || '',
    });
    setIsBookModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookFormData.subject || !bookFormData.rombelId) {
      alert('Mata pelajaran dan Rombel wajib dipilih!');
      return;
    }

    try {
      const selectedRombel = rombels.find((r) => r.id === bookFormData.rombelId);
      const selectedTeacher = teachers.find((t) => t.id === bookFormData.teacherId);

      const payload = {
        ...bookFormData,
        rombelName: selectedRombel ? selectedRombel.name : bookFormData.rombelName,
        teacherName: selectedTeacher ? selectedTeacher.name : bookFormData.teacherName,
        teacherNip: selectedTeacher?.nip || bookFormData.teacherNip,
        teacherNuptk: selectedTeacher?.nuptk || bookFormData.teacherNuptk,
        updatedAt: new Date().toISOString(),
      };

      if (editingBook) {
        await updateDoc(doc(db, 'teacher_books', editingBook.id), payload);
      } else {
        const docRef = await addDoc(collection(db, 'teacher_books'), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        setActiveBookId(docRef.id);
      }
      setIsBookModalOpen(false);
    } catch (err) {
      console.error('Error saving teacher book:', err);
      alert('Gagal menyimpan buku pegangan guru.');
    }
  };

  const handleDeleteBook = async (book: TeacherBook) => {
    if (
      !window.confirm(
        `Hapus Buku Pegangan Guru "${book.subject} - ${book.rombelName}"? Seluruh data nilai, jurnal, dan CP/TP di buku ini akan terhapus.`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'teacher_books', book.id));
      if (activeBookId === book.id) {
        setActiveBookId('');
      }
    } catch (err) {
      console.error('Error deleting book:', err);
      alert('Gagal menghapus buku pegangan guru.');
    }
  };

  // Add / Edit Assessment Column
  const handleOpenAddAssessment = () => {
    setEditingAssessment(null);
    setAssessmentFormData({
      ...initialAssessmentForm,
    });
    setIsAssessmentModalOpen(true);
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;

    try {
      if (editingAssessment) {
        await updateDoc(doc(db, 'grade_assessments', editingAssessment.id), {
          ...assessmentFormData,
        });
      } else {
        await addDoc(collection(db, 'grade_assessments'), {
          ...assessmentFormData,
          teacherBookId: activeBook.id,
          order: assessments.length + 1,
          createdAt: new Date().toISOString(),
        });
      }
      setIsAssessmentModalOpen(false);
    } catch (err) {
      console.error('Error saving assessment:', err);
      alert('Gagal menyimpan item penilaian.');
    }
  };

  const handleDeleteAssessment = async (a: GradeAssessment) => {
    if (!window.confirm(`Hapus kolom penilaian "${a.name}" (${a.code})? Data nilai siswa pada kolom ini akan ikut terhapus.`)) {
      return;
    }
    await deleteDoc(doc(db, 'grade_assessments', a.id));
  };

  // Save Inline Grades to Firestore
  const handleSaveInlineGrades = async () => {
    if (!activeBook) return;
    setSavingGrades(true);

    try {
      const promises: Promise<any>[] = [];

      rombelMembers.forEach((m) => {
        assessments.forEach((a) => {
          const key = `${m.studentId}_${a.id}`;
          const score = gradesDraft[key];
          if (score !== undefined) {
            const recordDocId = `${activeBook.id}_${a.id}_${m.studentId}`;
            promises.push(
              setDoc(
                doc(db, 'grade_records', recordDocId),
                {
                  teacherBookId: activeBook.id,
                  assessmentId: a.id,
                  studentId: m.studentId,
                  nis: m.nis,
                  studentName: m.studentName,
                  gender: m.gender,
                  score: Number(score),
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              )
            );
          }
        });
      });

      await Promise.all(promises);
      setSavingGrades(false);
      setGradesSavedAlert(true);
      setTimeout(() => setGradesSavedAlert(false), 3000);
    } catch (err) {
      console.error('Error saving grades:', err);
      alert('Gagal menyimpan nilai.');
      setSavingGrades(false);
    }
  };

  // Handlers for Teaching Journal
  const handleOpenAddJournal = () => {
    setEditingJournal(null);
    setJournalFormData({
      ...initialJournalForm,
      attendancePresent: rombelMembers.length,
    });
    setIsJournalModalOpen(true);
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;

    try {
      const payload = {
        ...journalFormData,
        teacherBookId: activeBook.id,
        teacherId: activeBook.teacherId,
        teacherName: activeBook.teacherName,
        subject: activeBook.subject,
        rombelName: activeBook.rombelName,
        createdAt: new Date().toISOString(),
      };

      if (editingJournal) {
        await updateDoc(doc(db, 'teaching_journals', editingJournal.id), payload);
      } else {
        await addDoc(collection(db, 'teaching_journals'), payload);
      }
      setIsJournalModalOpen(false);
    } catch (err) {
      console.error('Error saving journal:', err);
      alert('Gagal menyimpan jurnal mengajar.');
    }
  };

  const handleDeleteJournal = async (j: TeachingJournal) => {
    if (window.confirm(`Hapus jurnal tanggal ${j.date} topik "${j.topic}"?`)) {
      await deleteDoc(doc(db, 'teaching_journals', j.id));
    }
  };

  // Handlers for CP/TP
  const handleOpenAddObjective = () => {
    setEditingObjective(null);
    setObjectiveFormData(initialObjectiveForm);
    setIsObjectiveModalOpen(true);
  };

  const handleSaveObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;

    try {
      const payload = {
        ...objectiveFormData,
        teacherBookId: activeBook.id,
        createdAt: new Date().toISOString(),
      };

      if (editingObjective) {
        await updateDoc(doc(db, 'learning_objectives', editingObjective.id), payload);
      } else {
        await addDoc(collection(db, 'learning_objectives'), payload);
      }
      setIsObjectiveModalOpen(false);
    } catch (err) {
      console.error('Error saving CP/TP:', err);
      alert('Gagal menyimpan CP & TP.');
    }
  };

  const handleDeleteObjective = async (obj: LearningObjective) => {
    if (window.confirm('Hapus Tujuan Pembelajaran ini?')) {
      await deleteDoc(doc(db, 'learning_objectives', obj.id));
    }
  };

  // Grade Calculations per Student
  const studentGradeSummary = useMemo(() => {
    if (!activeBook || rombelMembers.length === 0) return [];

    return rombelMembers.map((m) => {
      const scores: Record<string, number> = {};
      let totalWeighted = 0;
      let totalWeight = 0;
      let simpleSum = 0;
      let assessedCount = 0;

      assessments.forEach((a) => {
        const key = `${m.studentId}_${a.id}`;
        const score = gradesDraft[key];
        if (score !== undefined) {
          scores[a.id] = score;
          simpleSum += score;
          totalWeighted += score * (a.weight || 1);
          totalWeight += a.weight || 1;
          assessedCount++;
        }
      });

      let finalScore = 0;
      if (assessedCount > 0) {
        if (activeBook.formula === 'BOBOT_KOMPONEN' && totalWeight > 0) {
          finalScore = totalWeighted / totalWeight;
        } else {
          finalScore = simpleSum / assessedCount;
        }
      }

      // Predicate based on KKM (default 75)
      const kkm = activeBook.kkm || 75;
      let predicate = 'D';
      if (finalScore >= 90) predicate = 'A';
      else if (finalScore >= 80) predicate = 'B';
      else if (finalScore >= kkm) predicate = 'C';
      else predicate = 'D';

      return {
        nis: m.nis,
        studentName: m.studentName,
        gender: m.gender,
        scores,
        finalScore,
        predicate,
      };
    });
  }, [activeBook, rombelMembers, assessments, gradesDraft]);

  // Overall Class Statistics (Average, Max, Min)
  const classGradeStats = useMemo(() => {
    if (studentGradeSummary.length === 0) return { avg: 0, max: 0, min: 0 };
    const validScores = studentGradeSummary
      .map((s) => s.finalScore)
      .filter((s) => s > 0);

    if (validScores.length === 0) return { avg: 0, max: 0, min: 0 };

    const sum = validScores.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / validScores.length) * 10) / 10;
    const max = Math.max(...validScores);
    const min = Math.min(...validScores);

    return { avg, max, min };
  }, [studentGradeSummary]);

  // Export Grades to Excel
  const handleExportGradesExcel = () => {
    if (!activeBook) return;
    exportTeacherGradesToExcel(
      activeBook.subject,
      activeBook.rombelName,
      activeBook.academicYear,
      assessments.map((a) => ({ id: a.id, code: a.code, name: a.name })),
      studentGradeSummary
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Buku Pegangan Guru (Buku Kerja Digital)</span>
                {activeBook && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                    {activeBook.subject} • {activeBook.rombelName}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Administrasi guru lengkap: identitas, siswa, presensi, jurnal mengajar, nilai harian, CP/TP, rekapitulasi dan siap cetak resmi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddBook}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Buku Pegangan Guru</span>
          </button>
        </div>
      </div>

      {/* Book Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500 font-semibold">Tahun:</span>
            <select
              value={selectedBookYear}
              onChange={(e) => setSelectedBookYear(e.target.value)}
              className="font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tahun</option>
              {Array.from(new Set([...academicYearNames, ...books.map((b) => b.academicYear)]))
                .sort()
                .reverse()
                .map((yr) => (
                  <option key={yr} value={yr} className="dark:bg-slate-900">
                    {yr}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800 dark:text-amber-300 font-bold">Pilih Buku Pegangan:</span>
            <select
              value={activeBookId}
              onChange={(e) => setActiveBookId(e.target.value)}
              className="font-black bg-transparent text-amber-950 dark:text-amber-100 outline-none cursor-pointer"
            >
              {filteredBooks.length === 0 ? (
                <option value="">Belum ada buku pada filter ini</option>
              ) : (
                filteredBooks.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-900">
                    {b.teacherName} — {b.subject} ({b.rombelName}) [{b.academicYear}]
                  </option>
                ))
              )}
            </select>
          </div>

          {activeBook && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => handleOpenEditBook(activeBook)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                title="Edit Identitas & Formula Buku"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteBook(activeBook)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                title="Hapus Buku Pegangan Guru"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {activeBook && (
          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>KKM: <strong className="text-slate-800 dark:text-slate-200">{activeBook.kkm || 75}</strong></span>
            <span>Formula: <strong className="text-slate-800 dark:text-slate-200">{activeBook.formula === 'BOBOT_KOMPONEN' ? 'Bobot Komponen' : 'Rata-Rata'}</strong></span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeBook ? (
        <div className="space-y-4">
          {/* Sub Navigation Tabs */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-1">
            {[
              { id: 'identity', label: 'A. Identitas Guru', icon: Bookmark },
              { id: 'students', label: 'B. Peserta Didik', icon: Users },
              { id: 'attendance', label: 'C. Presensi', icon: CalendarCheck },
              { id: 'grades', label: 'D. Nilai Harian', icon: Award },
              { id: 'journal', label: 'E. Jurnal Mengajar', icon: FileText },
              { id: 'cptp', label: 'F. CP & TP', icon: Sparkles },
              { id: 'recap', label: 'G. Rekap Nilai', icon: Calculator },
              { id: 'print', label: 'H. Siap Cetak', icon: Printer },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as SubTab)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB A: IDENTITAS */}
          {activeSubTab === 'identity' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Identitas Guru & Satuan Pendidikan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data pengajar dan mata pelajaran resmi terdaftar di SMAS Ma'arif 05 Padang Ratu
                  </p>
                </div>
                <button
                  onClick={() => handleOpenEditBook(activeBook)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* School Profile */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] text-blue-600 dark:text-blue-400">
                    Satuan Pendidikan
                  </h4>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Nama Sekolah:</span>
                    <span className="font-bold">{settings.schoolName || "SMAS MA'ARIF 05 PADANG RATU"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">NPSN / NSS:</span>
                    <span className="font-mono font-semibold">10801956 / 30.2.12.02.12.050</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Status Akreditasi:</span>
                    <span className="font-bold text-emerald-600">Terakreditasi B</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Kepala Sekolah:</span>
                    <span className="font-semibold">{settings.headmasterName || "M. FATKHUR ROZI, S.Pd.I"}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Alamat:</span>
                    <span className="font-semibold text-right max-w-xs">Jl. KH. Wahid Hasyim Kampung Surabaya, Kec. Padang Ratu, Lampung Tengah</span>
                  </div>
                </div>

                {/* Teacher Profile */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] text-amber-600 dark:text-amber-400">
                    Identitas Guru Pengampu
                  </h4>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Nama Lengkap Guru:</span>
                    <span className="font-black text-sm text-slate-900 dark:text-white">{activeBook.teacherName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">NIP:</span>
                    <span className="font-mono">{activeBook.teacherNip || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">NUPTK:</span>
                    <span className="font-mono">{activeBook.teacherNuptk || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Mata Pelajaran:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{activeBook.subject}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">Tingkat / Rombel:</span>
                    <span className="font-bold">Kelas {activeBook.gradeLevel} • {activeBook.rombelName}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Tahun Ajaran / Semester:</span>
                    <span className="font-bold">{activeBook.academicYear} - Semester {activeBook.semester}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: PESERTA DIDIK */}
          {activeSubTab === 'students' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Daftar Peserta Didik ({activeBook.rombelName})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data terhubung otomatis dengan rombongan belajar {activeBook.rombelName} ({rombelMembers.length} Siswa)
                  </p>
                </div>
              </div>

              {rombelMembers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada siswa terdaftar di rombel {activeBook.rombelName}. Masukkan siswa melalui menu "Data Rombongan Belajar".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="p-2.5 w-10 text-center">No</th>
                        <th className="p-2.5 w-24">NIS</th>
                        <th className="p-2.5 w-28">NISN</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5 text-center w-12">L/P</th>
                        <th className="p-2.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rombelMembers.map((m, idx) => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono">{m.nis}</td>
                          <td className="p-2.5 font-mono text-slate-500">{m.nisn}</td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{m.studentName}</td>
                          <td className="p-2.5 text-center">{m.gender}</td>
                          <td className="p-2.5 text-slate-500">{m.notes || 'Aktif'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB C: PRESENSI */}
          {activeSubTab === 'attendance' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Presensi Mata Pelajaran ({activeBook.subject})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pencatatan presensi siswa terpadu dengan absensi rombel {activeBook.rombelName}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5 w-24">NIS</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5 text-center w-12">L/P</th>
                      <th className="p-2.5 text-center">Pertemuan 1</th>
                      <th className="p-2.5 text-center">Pertemuan 2</th>
                      <th className="p-2.5 text-center">Pertemuan 3</th>
                      <th className="p-2.5 text-center">Pertemuan 4</th>
                      <th className="p-2.5 text-center">Pertemuan 5</th>
                      <th className="p-2.5 text-center">Rekap Hadir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rombelMembers.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono">{m.nis}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{m.studentName}</td>
                        <td className="p-2.5 text-center">{m.gender}</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">H</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">H</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">H</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">H</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">H</td>
                        <td className="p-2.5 text-center font-black text-blue-600">100%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB D: DAFTAR NILAI HARIAN (DYNAMIC COLUMNS) */}
          {activeSubTab === 'grades' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Daftar Nilai Harian Tanpa Batas Kolom</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                      {assessments.length} Asesmen
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Guru bebas menambah kolom penilaian: PH, Tugas, Praktik, Proyek, Portofolio, STS, SAS
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleOpenAddAssessment}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Kolom Nilai</span>
                  </button>

                  <button
                    disabled={savingGrades || assessments.length === 0}
                    onClick={handleSaveInlineGrades}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingGrades ? 'Menyimpan...' : 'Simpan Semua Nilai'}</span>
                  </button>
                </div>
              </div>

              {gradesSavedAlert && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Nilai siswa berhasil disimpan ke database!</span>
                </div>
              )}

              {assessments.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Belum ada kolom penilaian
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik tombol "Tambah Kolom Nilai" di atas untuk menambahkan PH 1, Tugas 1, Praktik, STS, SAS, dll.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-black text-[10px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">No</th>
                        <th className="py-3 px-3 w-24 sticky left-10 bg-slate-50 dark:bg-slate-800 z-10">NIS</th>
                        <th className="py-3 px-3 min-w-[180px] sticky left-34 bg-slate-50 dark:bg-slate-800 z-10">Nama Siswa</th>
                        <th className="py-3 px-2 text-center w-12">L/P</th>

                        {/* Dynamic Assessment Columns */}
                        {assessments.map((a) => (
                          <th key={a.id} className="py-2.5 px-3 text-center min-w-[90px] group border-l border-slate-200 dark:border-slate-800">
                            <div className="flex flex-col items-center">
                              <span className="font-black text-slate-900 dark:text-white">{a.code}</span>
                              <span className="text-[9px] text-slate-400 font-normal">{a.type} (w:{a.weight || 1})</span>
                              <button
                                onClick={() => handleDeleteAssessment(a)}
                                className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition mt-0.5"
                                title="Hapus kolom ini"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                        ))}

                        <th className="py-3 px-3 text-center min-w-[80px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-black border-l border-amber-200">
                          Nilai Akhir
                        </th>
                        <th className="py-3 px-3 text-center min-w-[70px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-black">
                          Predikat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {studentGradeSummary.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-center font-bold text-slate-400 sticky left-0 bg-white dark:bg-slate-900 z-10">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold sticky left-10 bg-white dark:bg-slate-900 z-10">
                            {m.nis}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white sticky left-34 bg-white dark:bg-slate-900 z-10 truncate max-w-[200px]">
                            {m.studentName}
                          </td>
                          <td className="py-2 px-2 text-center text-[10px] font-bold">
                            {m.gender}
                          </td>

                          {/* Editable Score Inputs */}
                          {assessments.map((a) => {
                            const key = `${m.nis ? rombelMembers.find((rm) => rm.nis === m.nis)?.studentId : ''}_${a.id}`;
                            const student = rombelMembers.find((rm) => rm.nis === m.nis);
                            const studentKey = student ? `${student.studentId}_${a.id}` : '';
                            const val = gradesDraft[studentKey] ?? '';

                            return (
                              <td key={a.id} className="py-1 px-2 text-center border-l border-slate-100 dark:border-slate-800">
                                <input
                                  type="number"
                                  min="0"
                                  max={a.maxScore || 100}
                                  value={val}
                                  onChange={(e) => {
                                    const num = e.target.value === '' ? undefined : Number(e.target.value);
                                    setGradesDraft((prev) => ({
                                      ...prev,
                                      [studentKey]: num as any,
                                    }));
                                  }}
                                  placeholder="0"
                                  className="w-16 py-1 px-1.5 text-center font-mono font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                            );
                          })}

                          {/* Computed Final Score */}
                          <td className="py-2 px-3 text-center font-black text-xs bg-amber-50/50 dark:bg-amber-950/20 border-l border-amber-200">
                            {Math.round(m.finalScore * 10) / 10 || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-black text-xs bg-amber-50/50 dark:bg-amber-950/20">
                            <span
                              className={`px-2 py-0.5 rounded font-black ${
                                m.predicate === 'A'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.predicate === 'B'
                                  ? 'bg-blue-100 text-blue-800'
                                  : m.predicate === 'C'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {m.predicate}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB E: JURNAL MENGAJAR */}
          {activeSubTab === 'journal' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Jurnal Mengajar Harian Guru ({journals.length} Pertemuan)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Catatan materi pokok, TP, kegiatan, metode, presensi kehadiran, dan catatan evaluasi
                  </p>
                </div>

                <button
                  onClick={handleOpenAddJournal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Jurnal Mengajar</span>
                </button>
              </div>

              {journals.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada jurnal mengajar tercatat. Klik tombol "Tambah Jurnal Mengajar" untuk membuat entri pertemuan pertama.
                </div>
              ) : (
                <div className="space-y-3">
                  {journals.map((j, idx) => (
                    <div
                      key={j.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2 relative group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            Pertemuan #{journals.length - idx}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                            {j.dayName}, {j.date}
                          </span>
                          <span className="text-slate-400">• {j.periodHours}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingJournal(j);
                              setJournalFormData({ ...j } as any);
                              setIsJournalModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteJournal(j)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Materi: {j.topic}
                      </div>

                      {j.learningObjective && (
                        <div className="text-slate-600 dark:text-slate-300">
                          <strong>Tujuan Pembelajaran (TP):</strong> {j.learningObjective}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                        <div><strong>Kegiatan:</strong> {j.activities || '-'}</div>
                        <div><strong>Metode:</strong> {j.method || '-'}</div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-3 font-semibold">
                          <span className="text-emerald-600">Hadir: {j.attendancePresent || 0}</span>
                          <span className="text-blue-600">Sakit: {j.attendanceSick || 0}</span>
                          <span className="text-amber-600">Izin: {j.attendancePermit || 0}</span>
                          <span className="text-rose-600">Alpa: {j.attendanceAbsent || 0}</span>
                        </div>
                        {j.teacherNotes && <div>Catatan: <em>{j.teacherNotes}</em></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB F: CAPAIAN & TUJUAN PEMBELAJARAN (CP & TP) */}
          {activeSubTab === 'cptp' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Capaian & Tujuan Pembelajaran (CP & TP)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pemetaan elemen, capaian pembelajaran, tujuan pembelajaran, materi, dan instrumen asesmen
                  </p>
                </div>

                <button
                  onClick={handleOpenAddObjective}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah CP & TP</span>
                </button>
              </div>

              {learningObjectives.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada Capaian & Tujuan Pembelajaran (CP & TP) yang diinputkan.
                </div>
              ) : (
                <div className="space-y-3">
                  {learningObjectives.map((obj, idx) => (
                    <div
                      key={obj.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          Elemen: {obj.element}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingObjective(obj);
                              setObjectiveFormData({ ...obj } as any);
                              setIsObjectiveModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteObjective(obj)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <strong>Capaian Pembelajaran (CP):</strong>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">{obj.cp}</p>
                      </div>

                      <div>
                        <strong>Tujuan Pembelajaran (TP):</strong>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">{obj.tp}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-4 text-slate-500 text-[11px]">
                        <span>Materi: <strong>{obj.materials || '-'}</strong></span>
                        <span>Teknik Asesmen: <strong>{obj.assessmentTechnique || '-'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB G: REKAPITULASI & ANALISIS NILAI */}
          {activeSubTab === 'recap' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Rekapitulasi & Analisis Nilai Siswa
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ringkasan capaian kompetensi, rata-rata kelas, dan distribusi predikat nilai
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportGradesExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Rekap Excel</span>
                  </button>
                </div>
              </div>

              {/* Statistical Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-300">Rata-Rata Kelas</div>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-200 mt-1">{classGradeStats.avg}</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-300">Nilai Tertinggi</div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-200 mt-1">{classGradeStats.max}</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-300">Nilai Terendah</div>
                  <div className="text-2xl font-black text-rose-700 dark:text-rose-200 mt-1">{classGradeStats.min}</div>
                </div>
              </div>

              {/* Table of Recap */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5 w-24">NIS</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5 text-center w-12">L/P</th>
                      <th className="p-2.5 text-center">Nilai Akhir</th>
                      <th className="p-2.5 text-center">Predikat</th>
                      <th className="p-2.5">Keterangan Capaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {studentGradeSummary.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono">{m.nis}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{m.studentName}</td>
                        <td className="p-2.5 text-center">{m.gender}</td>
                        <td className="p-2.5 text-center font-black text-sm">
                          {Math.round(m.finalScore * 10) / 10 || '-'}
                        </td>
                        <td className="p-2.5 text-center font-black">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              m.predicate === 'A'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.predicate === 'B'
                                ? 'bg-blue-100 text-blue-800'
                                : m.predicate === 'C'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {m.predicate}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {m.finalScore >= (activeBook.kkm || 75)
                            ? 'Mencapai kriteria ketuntasan tujuan pembelajaran'
                            : 'Perlu bimbingan dan perbaikan pembelajaran'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB H: BUKU SIAP CETAK (COVER, IDENTITAS, SISWA, PRESENSI, JURNAL, NILAI, PENGATURAN KERTAS A4/F4) */}
          {activeSubTab === 'print' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-6">
              {/* Controls bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                    Opsi Cetak Buku Pegangan Guru
                  </h4>
                  <p className="text-xs text-slate-400">
                    Pilih ukuran kertas, orientasi, dan centang bagian dokumen yang ingin dicetak
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={printPaperSize}
                    onChange={(e) => setPrintPaperSize(e.target.value as any)}
                    className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value="A4">Kertas A4 (210 x 297 mm)</option>
                    <option value="F4">Kertas F4 / Folio (215 x 330 mm)</option>
                  </select>

                  <select
                    value={printOrientation}
                    onChange={(e) => setPrintOrientation(e.target.value as any)}
                    className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value="portrait">Orientasi Portrait</option>
                    <option value="landscape">Orientasi Landscape</option>
                  </select>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Sekarang / Simpan PDF</span>
                  </button>
                </div>
              </div>

              {/* Section Checkboxes */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.cover}
                    onChange={(e) => setPrintSections({ ...printSections, cover: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span>1. Halaman Cover</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.identity}
                    onChange={(e) => setPrintSections({ ...printSections, identity: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span>2. Identitas Guru</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.students}
                    onChange={(e) => setPrintSections({ ...printSections, students: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span>3. Peserta Didik</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.journal}
                    onChange={(e) => setPrintSections({ ...printSections, journal: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span>4. Jurnal Mengajar</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.grades}
                    onChange={(e) => setPrintSections({ ...printSections, grades: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span>5. Daftar Nilai</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.recap}
                    onChange={(e) => setPrintSections({ ...printSections, recap: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <span>6. Rekapitulasi</span>
                </label>
              </div>

              {/* Printable Pages Container */}
              <div className="bg-slate-200 dark:bg-slate-950 p-4 rounded-2xl overflow-y-auto max-h-[800px] print:max-h-none print:p-0 print:bg-white">
                {/* 1. COVER PAGE */}
                {printSections.cover && (
                  <div className="bg-white text-slate-900 p-12 mx-auto shadow-md mb-8 print:shadow-none print:mb-0 print:break-after-page flex flex-col justify-between items-center text-center w-[210mm] min-h-[297mm]">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-widest font-black text-slate-500">
                        LEMBAGA PENDIDIKAN MA’ARIF NU KAMPUNG SURABAYA
                      </p>
                      <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                        SMAS MA’ARIF 05 PADANG RATU
                      </h1>
                      <p className="text-xs text-slate-600">
                        NSS: 30.2.12.02.12.050 • NPSN: 10801956 • Status: Terakreditasi B
                      </p>
                    </div>

                    <div className="my-8">
                      <div className="w-40 h-40 mx-auto">
                        <img
                          src="/logo_sekolah.png"
                          alt="Logo SMAS Ma'arif 05"
                          className="w-full h-full object-contain drop-shadow-md"
                        />
                      </div>
                      <div className="mt-8 border-y-2 border-slate-900 py-4 max-w-md mx-auto">
                        <h2 className="text-xl font-black tracking-wide uppercase">
                          BUKU PEGANGAN GURU
                        </h2>
                        <p className="text-xs font-bold mt-1 tracking-wider text-slate-600 uppercase">
                          BUKU KERJA & ADMINISTRASI PEMBELAJARAN
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 max-w-sm w-full text-xs text-left bg-slate-50 p-4 border border-slate-300 rounded-lg">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">Mata Pelajaran:</span>
                        <span className="font-black text-slate-900">{activeBook.subject}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">Kelas / Rombel:</span>
                        <span className="font-bold">{activeBook.rombelName} (Kelas {activeBook.gradeLevel})</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">Tahun Pelajaran:</span>
                        <span className="font-bold">{activeBook.academicYear} (Semester {activeBook.semester})</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-500">Nama Guru:</span>
                        <span className="font-black text-slate-900">{activeBook.teacherName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">NIP / NUPTK:</span>
                        <span className="font-mono">{activeBook.teacherNip || activeBook.teacherNuptk || '-'}</span>
                      </div>
                    </div>

                    <div className="mt-8 text-xs text-slate-500">
                      PADANG RATU, LAMPUNG TENGAH
                    </div>
                  </div>
                )}

                {/* 2. DAFTAR SISWA & NILAI HARIAN */}
                {printSections.grades && (
                  <div className="bg-white text-slate-900 p-8 mx-auto shadow-md mb-8 print:shadow-none print:mb-0 print:break-after-page w-[210mm] min-h-[297mm]">
                    <KopSuratView customSettings={settings} />

                    <div className="text-center my-4">
                      <h2 className="text-sm font-black uppercase tracking-wider underline">
                        DAFTAR NILAI HARIAN PESERTA DIDIK
                      </h2>
                      <p className="text-xs font-bold mt-1">
                        MATA PELAJARAN: {activeBook.subject.toUpperCase()} • ROMBEL: {activeBook.rombelName}
                      </p>
                    </div>

                    <table className="w-full text-xs border-collapse border border-slate-800">
                      <thead>
                        <tr className="bg-slate-200 font-bold">
                          <th className="border border-slate-800 py-1.5 px-2 w-8 text-center">No</th>
                          <th className="border border-slate-800 py-1.5 px-2 w-20 text-center">NIS</th>
                          <th className="border border-slate-800 py-1.5 px-3 text-left">Nama Siswa</th>
                          <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">L/P</th>
                          {assessments.map((a) => (
                            <th key={a.id} className="border border-slate-800 py-1.5 px-2 text-center">
                              {a.code}
                            </th>
                          ))}
                          <th className="border border-slate-800 py-1.5 px-2 text-center">NA</th>
                          <th className="border border-slate-800 py-1.5 px-2 text-center">Pred</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentGradeSummary.map((m, idx) => (
                          <tr key={idx}>
                            <td className="border border-slate-800 py-1 px-2 text-center">{idx + 1}</td>
                            <td className="border border-slate-800 py-1 px-2 text-center font-mono">{m.nis}</td>
                            <td className="border border-slate-800 py-1 px-3 font-semibold">{m.studentName}</td>
                            <td className="border border-slate-800 py-1 px-2 text-center">{m.gender}</td>
                            {assessments.map((a) => (
                              <td key={a.id} className="border border-slate-800 py-1 px-2 text-center font-mono">
                                {m.scores[a.id] ?? '-'}
                              </td>
                            ))}
                            <td className="border border-slate-800 py-1 px-2 text-center font-bold">
                              {Math.round(m.finalScore * 10) / 10 || '-'}
                            </td>
                            <td className="border border-slate-800 py-1 px-2 text-center font-black">
                              {m.predicate}
                            </td>
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
                        <p className="font-bold">Guru Mata Pelajaran</p>
                        <div className="h-16" />
                        <p className="font-bold underline uppercase">{activeBook.teacherName}</p>
                        <p className="text-[10px]">NIP. {activeBook.teacherNip || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Belum Ada Buku Pegangan Guru yang Dipilih
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Silakan buat Buku Pegangan Guru baru dengan mengklik tombol "Buat Buku Pegangan Guru" di atas.
          </p>
        </div>
      )}

      {/* MODAL 1: Tambah / Edit Buku Pegangan Guru */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>{editingBook ? 'Edit Buku Pegangan Guru' : 'Buat Buku Pegangan Guru Baru'}</span>
              </h3>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Guru Pengampu *
                </label>
                <select
                  value={bookFormData.teacherId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    const teacher = teachers.find((t) => t.id === tid);
                    setBookFormData({
                      ...bookFormData,
                      teacherId: tid,
                      teacherName: teacher ? teacher.name : '',
                      teacherNip: teacher?.nip || '',
                      teacherNuptk: teacher?.nuptk || '',
                      subject: teacher?.subject || bookFormData.subject,
                    });
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                >
                  <option value="">-- Pilih Guru dari Database --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.nip ? `(NIP: ${t.nip})` : ''} - {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    value={bookFormData.subject}
                    onChange={(e) => setBookFormData({ ...bookFormData, subject: e.target.value })}
                    placeholder="Contoh: Matematika, Bahasa Indonesia"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rombel / Kelas Sasaran *
                  </label>
                  <select
                    value={bookFormData.rombelId}
                    onChange={(e) => {
                      const rid = e.target.value;
                      const rombel = rombels.find((r) => r.id === rid);
                      setBookFormData({
                        ...bookFormData,
                        rombelId: rid,
                        rombelName: rombel ? rombel.name : '',
                        gradeLevel: rombel ? rombel.gradeLevel : 'X',
                        academicYear: rombel ? rombel.academicYear : bookFormData.academicYear,
                        semester: rombel ? rombel.semester : bookFormData.semester,
                      });
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="">-- Pilih Rombel --</option>
                    {rombels.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Tingkat {r.gradeLevel} - {r.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Pelajaran
                  </label>
                  <select
                    value={bookFormData.academicYear}
                    onChange={(e) => setBookFormData({ ...bookFormData, academicYear: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {Array.from(new Set([...academicYearNames, bookFormData.academicYear].filter(Boolean)))
                      .sort()
                      .reverse()
                      .map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Semester
                  </label>
                  <select
                    value={bookFormData.semester}
                    onChange={(e) => setBookFormData({ ...bookFormData, semester: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    KKM / Kriteria Ketuntasan
                  </label>
                  <input
                    type="number"
                    value={bookFormData.kkm}
                    onChange={(e) => setBookFormData({ ...bookFormData, kkm: Number(e.target.value) || 75 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Formula Perhitungan Nilai Akhir
                </label>
                <select
                  value={bookFormData.formula}
                  onChange={(e) => setBookFormData({ ...bookFormData, formula: e.target.value as any })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="RATA_RATA">Rata-Rata Sederhana Seluruh Nilai (Simple Average)</option>
                  <option value="BOBOT_KOMPONEN">Berdasarkan Bobot Penilaian (Weighted Average)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md cursor-pointer"
                >
                  Simpan Buku Pegangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah Kolom Penilaian (Assessment) */}
      {isAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Tambah Kolom Penilaian</span>
              </h3>
              <button
                onClick={() => setIsAssessmentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Kolom *
                  </label>
                  <input
                    type="text"
                    value={assessmentFormData.code}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, code: e.target.value })}
                    placeholder="Contoh: PH 1, Tugas 1, STS"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Asesmen
                  </label>
                  <select
                    value={assessmentFormData.type}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, type: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="PH">Penilaian Harian (PH)</option>
                    <option value="TUGAS">Tugas Mandiri/Kelompok</option>
                    <option value="PRAKTIK">Praktik / Unjuk Kerja</option>
                    <option value="PROYEK">Proyek</option>
                    <option value="PORTOFOLIO">Portofolio</option>
                    <option value="STS">Sumatif Tengah Semester (STS)</option>
                    <option value="SAS">Sumatif Akhir Semester (SAS)</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Asesmen / Materi Pokok *
                </label>
                <input
                  type="text"
                  value={assessmentFormData.name}
                  onChange={(e) => setAssessmentFormData({ ...assessmentFormData, name: e.target.value })}
                  placeholder="Contoh: Teks Eksplanasi / Fungsi Eksponen"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bobot Penilaian
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assessmentFormData.weight}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, weight: Number(e.target.value) || 1 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Skor Maksimal
                  </label>
                  <input
                    type="number"
                    value={assessmentFormData.maxScore}
                    onChange={(e) => setAssessmentFormData({ ...assessmentFormData, maxScore: Number(e.target.value) || 100 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  Tambahkan Kolom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Tambah / Edit Jurnal Mengajar */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>{editingJournal ? 'Edit Jurnal Mengajar' : 'Catat Jurnal Mengajar Baru'}</span>
              </h3>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournal} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pertemuan *
                  </label>
                  <input
                    type="date"
                    value={journalFormData.date}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
                      setJournalFormData({ ...journalFormData, date: e.target.value, dayName });
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Pertemuan
                  </label>
                  <input
                    type="text"
                    value={journalFormData.periodHours}
                    onChange={(e) => setJournalFormData({ ...journalFormData, periodHours: e.target.value })}
                    placeholder="Contoh: Jam 1 - 3 (07.30 - 09.45)"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Materi Pokok / Topik Pembelajaran *
                </label>
                <input
                  type="text"
                  value={journalFormData.topic}
                  onChange={(e) => setJournalFormData({ ...journalFormData, topic: e.target.value })}
                  placeholder="Contoh: Eksplorasi Konsep Eksponensial"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tujuan Pembelajaran (TP)
                </label>
                <textarea
                  rows={2}
                  value={journalFormData.learningObjective}
                  onChange={(e) => setJournalFormData({ ...journalFormData, learningObjective: e.target.value })}
                  placeholder="Contoh: Peserta didik dapat menyelesaikan masalah eksponensial dalam kehidupan sehari-hari"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kegiatan Pembelajaran
                </label>
                <textarea
                  rows={2}
                  value={journalFormData.activities}
                  onChange={(e) => setJournalFormData({ ...journalFormData, activities: e.target.value })}
                  placeholder="Contoh: Pendahuluan apersepsi, presentasi kelompok, diskusi materi, dan refleksi"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Pembelajaran
                </label>
                <input
                  type="text"
                  value={journalFormData.method}
                  onChange={(e) => setJournalFormData({ ...journalFormData, method: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 mb-1">Hadir</label>
                  <input
                    type="number"
                    value={journalFormData.attendancePresent}
                    onChange={(e) => setJournalFormData({ ...journalFormData, attendancePresent: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-600 mb-1">Sakit</label>
                  <input
                    type="number"
                    value={journalFormData.attendanceSick}
                    onChange={(e) => setJournalFormData({ ...journalFormData, attendanceSick: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-600 mb-1">Izin</label>
                  <input
                    type="number"
                    value={journalFormData.attendancePermit}
                    onChange={(e) => setJournalFormData({ ...journalFormData, attendancePermit: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-rose-600 mb-1">Alpa</label>
                  <input
                    type="number"
                    value={journalFormData.attendanceAbsent}
                    onChange={(e) => setJournalFormData({ ...journalFormData, attendanceAbsent: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Guru / Evaluasi
                </label>
                <input
                  type="text"
                  value={journalFormData.teacherNotes}
                  onChange={(e) => setJournalFormData({ ...journalFormData, teacherNotes: e.target.value })}
                  placeholder="Keterangan respons siswa, kendala, atau tindak lanjut"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Tambah / Edit CP & TP */}
      {isObjectiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>{editingObjective ? 'Edit CP & TP' : 'Tambah Capaian & Tujuan Pembelajaran'}</span>
              </h3>
              <button
                onClick={() => setIsObjectiveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveObjective} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Elemen CP *
                </label>
                <input
                  type="text"
                  value={objectiveFormData.element}
                  onChange={(e) => setObjectiveFormData({ ...objectiveFormData, element: e.target.value })}
                  placeholder="Contoh: Pemahaman Sains / Menyimak & Berbicara"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Capaian Pembelajaran (CP) *
                </label>
                <textarea
                  rows={3}
                  value={objectiveFormData.cp}
                  onChange={(e) => setObjectiveFormData({ ...objectiveFormData, cp: e.target.value })}
                  placeholder="Rumusan Capaian Pembelajaran pada fase/tingkat ini"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tujuan Pembelajaran (TP) *
                </label>
                <textarea
                  rows={3}
                  value={objectiveFormData.tp}
                  onChange={(e) => setObjectiveFormData({ ...objectiveFormData, tp: e.target.value })}
                  placeholder="Rumusan Tujuan Pembelajaran spesifik"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Materi & Teknik Asesmen
                </label>
                <input
                  type="text"
                  value={objectiveFormData.materials}
                  onChange={(e) => setObjectiveFormData({ ...objectiveFormData, materials: e.target.value })}
                  placeholder="Materi pokok dan teknik asesmen"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsObjectiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                >
                  Simpan CP & TP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
