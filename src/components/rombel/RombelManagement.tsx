import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Printer,
  Edit2,
  Trash2,
  Users,
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  GraduationCap,
  Calendar,
  BookOpen,
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
  writeBatch,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rombel, RombelMember, Student, Teacher } from '../../types';
import {
  downloadRombelTemplate,
  exportRombelMembersToExcel,
  readExcelFile,
  pickExcelCell,
  parseExcelGender,
  formatExcelImportError,
} from '../../utils/excelExport';
import { KopSuratView } from '../common/KopSuratView';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { useAppAnimation } from '../../context/AnimationContext';
import { motion, AnimatePresence } from 'motion/react';

export const RombelManagement: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const { activeYearName, activeSemester, academicYearNames } = useAcademicYear();
  const { animationsEnabled } = useAppAnimation();

  // Data state
  const [rombels, setRombels] = useState<Rombel[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [members, setMembers] = useState<RombelMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(activeYearName || settings.academicYear || '2026/2027');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep filter synced when active academic year updates
  useEffect(() => {
    if (activeYearName) {
      setSelectedAcademicYear(activeYearName);
    }
  }, [activeYearName]);

  // Active / Selected Rombel for Member Management
  const [activeRombel, setActiveRombel] = useState<Rombel | null>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRombel, setEditingRombel] = useState<Rombel | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState<RombelMember | null>(null);
  const [targetRombelId, setTargetRombelId] = useState('');
  const [isPrintRosterOpen, setIsPrintRosterOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Print paper setting
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'F4'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printMargins, setPrintMargins] = useState({ top: 15, bottom: 15, left: 20, right: 15 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rombel Form Data
  const initialRombelForm = {
    name: '',
    gradeLevel: 'X' as 'X' | 'XI' | 'XII',
    academicYear: activeYearName || settings.academicYear || '2026/2027',
    semester: activeSemester || ('Ganjil' as 'Ganjil' | 'Genap'),
    homeroomTeacherId: '',
    homeroomTeacherName: '',
    room: '',
    capacity: 36,
    curriculum: 'Kurikulum Merdeka' as 'Kurikulum Merdeka' | 'Kurikulum 2013',
  };
  const [formData, setFormData] = useState(initialRombelForm);

  // Subscribe to Rombels
  useEffect(() => {
    const qRombels = query(collection(db, 'rombels'), orderBy('name', 'asc'));
    const unsubRombels = onSnapshot(qRombels, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Rombel));
      setRombels(docs);
      setLoading(false);
    });

    const qTeachers = query(collection(db, 'teachers'), orderBy('name', 'asc'));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher));
      setTeachers(docs);
    });

    const qStudents = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      setStudents(docs);
    });

    const qMembers = query(collection(db, 'rombel_members'), orderBy('studentName', 'asc'));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RombelMember));
      setMembers(docs);
    });

    return () => {
      unsubRombels();
      unsubTeachers();
      unsubStudents();
      unsubMembers();
    };
  }, []);

  // Filtered Rombels
  const filteredRombels = useMemo(() => {
    return rombels.filter((r) => {
      const matchYear = !selectedAcademicYear || r.academicYear === selectedAcademicYear;
      const matchGrade = selectedGrade === 'ALL' || r.gradeLevel === selectedGrade;
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.homeroomTeacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.room.toLowerCase().includes(searchQuery.toLowerCase());
      return matchYear && matchGrade && matchSearch;
    });
  }, [rombels, selectedAcademicYear, selectedGrade, searchQuery]);

  // Current active rombel members
  const activeMembers = useMemo(() => {
    if (!activeRombel) return [];
    return members.filter((m) => m.rombelId === activeRombel.id);
  }, [activeRombel, members]);

  // Available students not in current active rombel
  const candidateStudents = useMemo(() => {
    if (!activeRombel) return [];
    const enrolledStudentIds = new Set(
      members
        .filter((m) => m.academicYear === activeRombel.academicYear)
        .map((m) => m.studentId)
    );
    return students.filter((s) => !enrolledStudentIds.has(s.id));
  }, [students, members, activeRombel]);

  // Available academic years
  const academicYears = useMemo(() => {
    const set = new Set<string>(academicYearNames);
    rombels.forEach((r) => set.add(r.academicYear));
    if (settings.academicYear) set.add(settings.academicYear);
    return Array.from(set).sort().reverse();
  }, [academicYearNames, rombels, settings.academicYear]);

  // Handlers for Rombel CRUD
  const handleOpenAdd = () => {
    setFormData({
      ...initialRombelForm,
      academicYear: selectedAcademicYear || activeYearName || settings.academicYear || '2026/2027',
      semester: activeSemester || 'Ganjil',
    });
    setEditingRombel(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (r: Rombel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingRombel(r);
    setFormData({
      name: r.name,
      gradeLevel: r.gradeLevel,
      academicYear: r.academicYear,
      semester: r.semester || 'Ganjil',
      homeroomTeacherId: r.homeroomTeacherId || '',
      homeroomTeacherName: r.homeroomTeacherName || '',
      room: r.room || '',
      capacity: r.capacity || 36,
      curriculum: r.curriculum || 'Kurikulum Merdeka',
    });
    setIsFormOpen(true);
  };

  const handleSaveRombel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama Rombel wajib diisi!');
      return;
    }

    try {
      const selectedTeacher = teachers.find((t) => t.id === formData.homeroomTeacherId);
      const homeroomTeacherName = selectedTeacher ? selectedTeacher.name : formData.homeroomTeacherName;

      if (editingRombel) {
        await updateDoc(doc(db, 'rombels', editingRombel.id), {
          ...formData,
          homeroomTeacherName,
          updatedAt: new Date().toISOString(),
        });
        if (activeRombel?.id === editingRombel.id) {
          setActiveRombel({
            ...activeRombel,
            ...formData,
            homeroomTeacherName,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        const docRef = await addDoc(collection(db, 'rombels'), {
          ...formData,
          homeroomTeacherName,
          studentCount: 0,
          maleCount: 0,
          femaleCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setActiveRombel({
          id: docRef.id,
          ...formData,
          homeroomTeacherName,
          studentCount: 0,
          maleCount: 0,
          femaleCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error saving rombel:', err);
      alert('Gagal menyimpan rombel.');
    }
  };

  const handleDeleteRombel = async (r: Rombel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Hapus rombel "${r.name}"? Data anggota di rombel ini juga akan terhapus, namun data induk siswa tetap aman.`)) {
      return;
    }

    try {
      // Delete rombel members
      const q = query(collection(db, 'rombel_members'), where('rombelId', '==', r.id));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'rombels', r.id));
      await batch.commit();

      if (activeRombel?.id === r.id) {
        setActiveRombel(null);
      }
    } catch (err) {
      console.error('Error deleting rombel:', err);
      alert('Gagal menghapus rombel.');
    }
  };

  // Add Student to Active Rombel
  const handleAddStudentToRombel = async (student: Student) => {
    if (!activeRombel) return;

    // Check if already in rombel
    const exists = members.some(
      (m) =>
        m.rombelId === activeRombel.id &&
        m.studentId === student.id
    );
    if (exists) {
      alert(`Siswa ${student.name} sudah terdaftar di rombel ini!`);
      return;
    }

    try {
      const memberDoc: Omit<RombelMember, 'id'> = {
        rombelId: activeRombel.id,
        rombelName: activeRombel.name,
        academicYear: activeRombel.academicYear,
        semester: activeRombel.semester,
        studentId: student.id,
        nis: student.nis || '',
        nisn: student.nisn || '',
        studentName: student.name,
        gender: student.gender as 'L' | 'P',
        joinedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'rombel_members'), memberDoc);

      // Recalculate stats
      const newActiveMembers = [...activeMembers, { ...memberDoc, id: 'temp' }];
      const maleCount = newActiveMembers.filter((m) => m.gender === 'L').length;
      const femaleCount = newActiveMembers.filter((m) => m.gender === 'P').length;

      await updateDoc(doc(db, 'rombels', activeRombel.id), {
        studentCount: newActiveMembers.length,
        maleCount,
        femaleCount,
        updatedAt: new Date().toISOString(),
      });

      // Also sync student className
      await updateDoc(doc(db, 'students', student.id), {
        className: activeRombel.name,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error adding student to rombel:', err);
      alert('Gagal memasukkan siswa ke rombel.');
    }
  };

  // Remove Student from Rombel (without deleting master student record)
  const handleRemoveMember = async (member: RombelMember) => {
    if (!activeRombel) return;
    if (
      !window.confirm(
        `Keluarkan ${member.studentName} (${member.nis}) dari rombel ${activeRombel.name}? Data induk siswa tetap utuh.`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'rombel_members', member.id));

      const updatedMembers = activeMembers.filter((m) => m.id !== member.id);
      const maleCount = updatedMembers.filter((m) => m.gender === 'L').length;
      const femaleCount = updatedMembers.filter((m) => m.gender === 'P').length;

      await updateDoc(doc(db, 'rombels', activeRombel.id), {
        studentCount: updatedMembers.length,
        maleCount,
        femaleCount,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error removing student from rombel:', err);
      alert('Gagal mengeluarkan siswa dari rombel.');
    }
  };

  // Transfer Student to Another Rombel
  const handleOpenTransfer = (member: RombelMember) => {
    setStudentToTransfer(member);
    setTargetRombelId('');
    setIsTransferOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!studentToTransfer || !targetRombelId || !activeRombel) return;
    const target = rombels.find((r) => r.id === targetRombelId);
    if (!target) return;

    try {
      // 1. Update member doc to target rombel
      await updateDoc(doc(db, 'rombel_members', studentToTransfer.id), {
        rombelId: target.id,
        rombelName: target.name,
        academicYear: target.academicYear,
        semester: target.semester,
      });

      // 2. Update student className
      await updateDoc(doc(db, 'students', studentToTransfer.studentId), {
        className: target.name,
      });

      // 3. Recount source rombel
      const updatedSrcMembers = activeMembers.filter((m) => m.id !== studentToTransfer.id);
      await updateDoc(doc(db, 'rombels', activeRombel.id), {
        studentCount: updatedSrcMembers.length,
        maleCount: updatedSrcMembers.filter((m) => m.gender === 'L').length,
        femaleCount: updatedSrcMembers.filter((m) => m.gender === 'P').length,
      });

      // 4. Recount target rombel
      const targetExistingMembers = members.filter((m) => m.rombelId === target.id);
      const newTargetMembers = [...targetExistingMembers, studentToTransfer];
      await updateDoc(doc(db, 'rombels', target.id), {
        studentCount: newTargetMembers.length,
        maleCount: newTargetMembers.filter((m) => m.gender === 'L').length,
        femaleCount: newTargetMembers.filter((m) => m.gender === 'P').length,
      });

      setIsTransferOpen(false);
      setStudentToTransfer(null);
      alert(`Berhasil memindahkan ${studentToTransfer.studentName} ke ${target.name}`);
    } catch (err) {
      console.error('Error transferring student:', err);
      alert('Gagal memindahkan siswa.');
    }
  };

  // Excel Import for Rombel
  const normalizeGradeLevel = (rawGrade: string, rombelName: string): 'X' | 'XI' | 'XII' => {
    const g = String(rawGrade || '').trim().toUpperCase();
    if (g === 'XII' || g === '12' || g.includes('XII')) return 'XII';
    if (g === 'XI' || g === '11' || g.includes('XI')) return 'XI';
    if (g === 'X' || g === '10' || g.includes('X')) return 'X';
    const r = String(rombelName || '').trim().toUpperCase();
    if (r.startsWith('XII') || r.startsWith('12')) return 'XII';
    if (r.startsWith('XI') || r.startsWith('11')) return 'XI';
    return 'X';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readExcelFile(file, [
        'tahun pelajaran',
        'nama rombel',
        'rombel',
        'nama siswa',
        'nis',
        'tingkat',
        'wali kelas',
      ]);
      const errors: string[] = [];
      const parsed: any[] = [];
      const seenKeysInFile = new Set<string>();

      data.forEach((row, idx) => {
        const rowNum = idx + 2;
        const rombelName = pickExcelCell(row, 'Nama Rombel', 'Rombel', 'Kelas');
        const academicYear = pickExcelCell(row, 'Tahun Pelajaran', 'Tahun Ajaran') || selectedAcademicYear || activeYearName || '2026/2027';
        const rawSemester = pickExcelCell(row, 'Semester');
        const semester: 'Ganjil' | 'Genap' = rawSemester.toLowerCase().includes('genap') ? 'Genap' : 'Ganjil';
        const rawNis = pickExcelCell(row, 'NIS', 'No Induk', 'NIPD');
        const nisn = pickExcelCell(row, 'NISN') || '-';
        const studentName = pickExcelCell(row, 'Nama Siswa', 'Nama Lengkap', 'Nama Peserta Didik', 'Nama');
        const nis = rawNis || (studentName ? `IMP-${academicYear.split('/')[0] || '2026'}-${String(idx + 1).padStart(3, '0')}` : '');
        const gender = parseExcelGender(pickExcelCell(row, 'Jenis Kelamin', 'L/P', 'JK', 'Gender'));
        const gradeLevel = normalizeGradeLevel(pickExcelCell(row, 'Tingkat', 'Jenjang', 'Grade'), rombelName);
        const homeroomTeacher = pickExcelCell(row, 'Wali Kelas', 'Walas');
        const notes = pickExcelCell(row, 'Keterangan', 'Catatan') || 'Aktif';

        if (!rombelName) errors.push(`Baris ${rowNum}: Nama Rombel kosong`);
        if (!studentName) errors.push(`Baris ${rowNum}: Nama Siswa kosong`);
        if (!rawNis && studentName) errors.push(`Baris ${rowNum}: NIS kosong (akan dibuatkan NIS otomatis: ${nis})`);

        const dupKey = `${academicYear}_${nis || studentName.toLowerCase()}`;
        if (studentName && seenKeysInFile.has(dupKey)) {
          errors.push(`Baris ${rowNum}: Siswa "${studentName}" (${nis}) terdeteksi ganda pada file untuk TA ${academicYear}`);
        } else if (studentName) {
          seenKeysInFile.add(dupKey);
        }

        if (rombelName || studentName) {
          parsed.push({
            rowNum,
            rombelName,
            academicYear,
            semester,
            gradeLevel,
            homeroomTeacher,
            nis,
            nisn,
            studentName,
            gender,
            notes,
            isValid: Boolean(rombelName && studentName && nis),
          });
        }
      });

      if (parsed.length === 0) {
        const headers = Object.keys(data[0] || {}).filter((k) => !k.startsWith('__COL_')).slice(0, 6).join(', ');
        showNotify(
          `Tidak ditemukan kolom Rombel/Siswa yang sesuai.${headers ? ` Kolom terbaca: ${headers}` : ''}`,
          'error'
        );
        return;
      }

      setImportPreview(parsed);
      setImportErrors(errors);
      setIsImportOpen(true);
    } catch (err: any) {
      console.error('Failed reading excel:', err);
      showNotify('Gagal membaca file Excel: ' + formatExcelImportError(err), 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      e.target.value = '';
    }
  };

  const handleProcessImport = async () => {
    const validRows = importPreview.filter((item) => item.rombelName && item.studentName && item.nis);
    if (validRows.length === 0) {
      showNotify('Tidak ada baris valid untuk disimpan (pastikan Nama Rombel dan Nama Siswa terisi).', 'error');
      return;
    }

    setImporting(true);

    try {
      const now = new Date().toISOString();
      // Group valid rows by academicYear + rombelName
      const rombelGroups: Record<string, any[]> = {};
      validRows.forEach((item) => {
        const key = `${item.academicYear}__${String(item.rombelName).trim().toLowerCase()}`;
        if (!rombelGroups[key]) rombelGroups[key] = [];
        rombelGroups[key].push(item);
      });

      // Local tracking maps so multiple groups in the same file don't duplicate students/members
      const knownStudentsByNis = new Map<string, Student>();
      students.forEach((s) => {
        if (s.nis) knownStudentsByNis.set(String(s.nis).trim(), s);
      });

      const enrolledStudentYearSet = new Set<string>();
      members.forEach((m) => {
        enrolledStudentYearSet.add(`${m.academicYear}__${m.studentId}`);
      });

      let importedStudentsCount = 0;
      let importedMembersCount = 0;
      let skippedDuplicateCount = 0;

      for (const key of Object.keys(rombelGroups)) {
        const group = rombelGroups[key];
        const sample = group[0];
        const safeRombelName = String(sample.rombelName || '').trim();
        const safeAcademicYear = String(sample.academicYear || selectedAcademicYear || '2026/2027').trim();

        // 1. Find or create rombel
        let rombel = rombels.find(
          (r) =>
            r.academicYear === safeAcademicYear &&
            String(r.name || '').trim().toLowerCase() === safeRombelName.toLowerCase()
        );

        let rombelId = rombel?.id;
        if (!rombel) {
          const matchedTeacher = teachers.find(
            (t) => t.name.toLowerCase() === String(sample.homeroomTeacher || '').trim().toLowerCase()
          );
          const newRombelDoc = await addDoc(collection(db, 'rombels'), {
            name: safeRombelName,
            gradeLevel: sample.gradeLevel || 'X',
            academicYear: safeAcademicYear,
            semester: sample.semester || 'Ganjil',
            homeroomTeacherId: matchedTeacher?.id || '',
            homeroomTeacherName: sample.homeroomTeacher || '',
            room: '',
            capacity: 36,
            studentCount: 0,
            maleCount: 0,
            femaleCount: 0,
            curriculum: 'Kurikulum Merdeka',
            createdAt: now,
            updatedAt: now,
          });
          rombelId = newRombelDoc.id;
        }

        if (!rombelId) continue;

        let addedInThisRombel = 0;
        let addedMaleInThisRombel = 0;
        let addedFemaleInThisRombel = 0;

        // 2. Add members avoiding duplicate enrollment in same academic year
        for (const item of group) {
          const itemNis = String(item.nis || '').trim();
          let student = knownStudentsByNis.get(itemNis);
          let studentId = student?.id;

          if (!student) {
            const entryYear = safeAcademicYear.includes('/') ? safeAcademicYear.split('/')[0] : '2026';
            const studentPayload: Omit<Student, 'id'> = {
              nis: itemNis,
              nisn: String(item.nisn || '-'),
              name: String(item.studentName).trim(),
              gender: item.gender === 'P' ? 'P' : 'L',
              className: safeRombelName,
              status: 'Aktif',
              entryYear: entryYear || '2026',
              birthPlace: 'Padang Ratu',
              birthDate: '2010-01-01',
              religion: 'Islam',
              phone: '-',
              address: 'Padang Ratu, Lampung Tengah',
              fatherName: '-',
              motherName: '-',
              parentJob: '-',
              parentAddress: 'Padang Ratu, Lampung Tengah',
              parentPhone: '-',
              createdAt: now,
              updatedAt: now,
            };
            const newStudentDoc = await addDoc(collection(db, 'students'), studentPayload);
            studentId = newStudentDoc.id;
            knownStudentsByNis.set(itemNis, { id: studentId, ...studentPayload });
            importedStudentsCount++;
          }

          if (!studentId) continue;

          const enrollKey = `${safeAcademicYear}__${studentId}`;
          if (enrolledStudentYearSet.has(enrollKey)) {
            skippedDuplicateCount++;
            continue;
          }

          enrolledStudentYearSet.add(enrollKey);
          await addDoc(collection(db, 'rombel_members'), {
            rombelId,
            rombelName: safeRombelName,
            academicYear: safeAcademicYear,
            semester: sample.semester || 'Ganjil',
            studentId,
            nis: itemNis,
            nisn: String(item.nisn || '-'),
            studentName: String(item.studentName).trim(),
            gender: item.gender === 'P' ? 'P' : 'L',
            notes: item.notes || 'Aktif',
            joinedAt: now,
          });
          importedMembersCount++;
          addedInThisRombel++;
          if (item.gender === 'P') addedFemaleInThisRombel++;
          else addedMaleInThisRombel++;
        }

        // 3. Accurate recount combining existing members + newly added members
        const existingRombelMembers = members.filter((m) => m.rombelId === rombelId);
        const totalCount = existingRombelMembers.length + addedInThisRombel;
        const maleCount = existingRombelMembers.filter((m) => m.gender === 'L').length + addedMaleInThisRombel;
        const femaleCount = existingRombelMembers.filter((m) => m.gender === 'P').length + addedFemaleInThisRombel;

        await updateDoc(doc(db, 'rombels', rombelId), {
          studentCount: totalCount,
          maleCount,
          femaleCount,
          updatedAt: now,
        });
      }

      setIsImportOpen(false);
      setImportPreview([]);
      setImportErrors([]);
      showNotify(
        `Impor Excel selesai: ${importedMembersCount} anggota rombel disimpan${
          importedStudentsCount > 0 ? ` (${importedStudentsCount} siswa baru ditambahkan ke master)` : ''
        }${skippedDuplicateCount > 0 ? `, ${skippedDuplicateCount} duplikat dilewati` : ''}.`
      );
    } catch (err: any) {
      console.error('Import error:', err);
      showNotify('Gagal memproses impor data: ' + formatExcelImportError(err), 'error');
    } finally {
      setImporting(false);
    }
  };

  // Export current active rombel to Excel
  const handleExportRombel = () => {
    if (!activeRombel) {
      alert('Pilih salah satu rombel terlebih dahulu untuk mengekspor.');
      return;
    }
    exportRombelMembersToExcel(
      activeRombel.name,
      activeRombel.academicYear,
      activeMembers,
      activeRombel.homeroomTeacherName
    );
  };

  // Print Roster
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold text-white max-w-md ${
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Data Rombongan Belajar (Rombel)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {filteredRombels.length} Rombel
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Struktur kelas, wali kelas, kuota, pembagian siswa, dan riwayat rombel SMAS Ma'arif 05 Padang Ratu
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadRombelTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            title="Download Format Template Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Template Excel</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
          </label>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Rombel Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Academic Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tahun:</span>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
            >
              {academicYears.map((yr) => (
                <option key={yr} value={yr} className="dark:bg-slate-900">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['ALL', 'X', 'XI', 'XII'] as const).map((gr) => (
              <button
                key={gr}
                onClick={() => setSelectedGrade(gr)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  selectedGrade === gr
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {gr === 'ALL' ? 'Semua Tingkat' : `Kelas ${gr}`}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari rombel, wali kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Two-Column Layout: Left = Rombels Cards, Right = Active Rombel Detail & Members */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Rombels (4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span>DAFTAR ROMBEL ({filteredRombels.length})</span>
            <span>Klik rombel untuk kelola siswa</span>
          </div>

          {filteredRombels.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400">
              <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-semibold">Belum ada rombel di filter ini</p>
              <button
                onClick={handleOpenAdd}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Rombel Baru Sekarang</span>
              </button>
            </div>
          ) : (
            filteredRombels.map((r) => {
              const isSelected = activeRombel?.id === r.id;
              const rMembers = members.filter((m) => m.rombelId === r.id);
              const countMale = rMembers.filter((m) => m.gender === 'L').length;
              const countFemale = rMembers.filter((m) => m.gender === 'P').length;
              const totalCount = rMembers.length;

              return (
                <div
                  key={r.id}
                  onClick={() => setActiveRombel(r)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-xs'
                  }`}
                >
                  {/* Left Accent indicator */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isSelected
                        ? 'bg-amber-400'
                        : r.gradeLevel === 'X'
                        ? 'bg-blue-500'
                        : r.gradeLevel === 'XI'
                        ? 'bg-indigo-500'
                        : 'bg-purple-500'
                    }`}
                  />

                  <div className="flex items-start justify-between gap-3 pl-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {r.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Tingkat {r.gradeLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Wali: <strong className="text-slate-700 dark:text-slate-200">{r.homeroomTeacherName || 'Belum Ditentukan'}</strong></span>
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Ruang: {r.room || '-'} • TA: {r.academicYear} ({r.semester})
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleOpenEdit(r, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                        title="Edit Rombel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteRombel(r, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                        title="Hapus Rombel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Student Stats Badges */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs pl-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{totalCount} / {r.capacity || 36} Siswa</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-semibold">
                      <span className="text-blue-600 dark:text-blue-400">L: {countMale}</span>
                      <span className="text-pink-600 dark:text-pink-400">P: {countFemale}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail & Member Roster (7 cols) */}
        <div className="lg:col-span-7">
          {activeRombel ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Header Banner of Selected Rombel */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 border-b border-blue-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {activeRombel.curriculum}
                      </span>
                      <span className="text-xs text-blue-200">
                        Tahun Ajaran {activeRombel.academicYear} - Semester {activeRombel.semester}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight mt-1">
                      {activeRombel.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200 mt-2">
                      <span>Wali Kelas: <strong>{activeRombel.homeroomTeacherName || 'Belum Ditentukan'}</strong></span>
                      <span>Ruang: <strong>{activeRombel.room || '-'}</strong></span>
                      <span>Kapasitas: <strong>{activeRombel.capacity || 36}</strong></span>
                    </div>
                  </div>

                  {/* Actions for this Rombel */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsAddStudentOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Tambah Siswa</span>
                    </button>
                    <button
                      onClick={handleExportRombel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                      title="Export Daftar Siswa Rombel ke Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export</span>
                    </button>
                    <button
                      onClick={() => setIsPrintRosterOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                      title="Cetak Daftar Rombel Resmi dengan Kop Surat"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-300" />
                      <span>Cetak</span>
                    </button>
                  </div>
                </div>

                {/* Counter pills */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-[10px] text-blue-200 uppercase font-bold">Total Siswa</div>
                    <div className="text-lg font-black">{activeMembers.length}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-[10px] text-blue-300 uppercase font-bold">Laki-Laki (L)</div>
                    <div className="text-lg font-black text-blue-300">
                      {activeMembers.filter((m) => m.gender === 'L').length}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-[10px] text-pink-300 uppercase font-bold">Perempuan (P)</div>
                    <div className="text-lg font-black text-pink-300">
                      {activeMembers.filter((m) => m.gender === 'P').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Daftar Siswa Terdaftar ({activeMembers.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Format: No, NIS, NISN, Nama Siswa, L/P, Keterangan, Aksi
                  </span>
                </div>

                {activeMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-semibold">Belum ada siswa di rombel {activeRombel.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Klik "Tambah Siswa" untuk memasukkan peserta didik dari database atau gunakan tombol "Import Excel".
                    </p>
                    <button
                      onClick={() => setIsAddStudentOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Pilih Siswa dari Database</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase font-black text-[10px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3">NIS</th>
                          <th className="py-2.5 px-3">NISN</th>
                          <th className="py-2.5 px-3">Nama Siswa</th>
                          <th className="py-2.5 px-2 text-center">L/P</th>
                          <th className="py-2.5 px-3">Keterangan</th>
                          <th className="py-2.5 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeMembers.map((m, idx) => (
                          <tr
                            key={m.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-2 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {m.nis || '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">
                              {m.nisn || '-'}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              {m.studentName}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                                  m.gender === 'L'
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    : 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300'
                                }`}
                              >
                                {m.gender}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">
                              {m.notes || 'Aktif'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenTransfer(m)}
                                  className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                                  title="Pindahkan Siswa ke Rombel Lain"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(m)}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Keluarkan dari Rombel (Data Induk Tidak Dihapus)"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              <Layers className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Pilih Rombongan Belajar
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Silakan klik salah satu rombel di kolom sebelah kiri untuk mengelola siswa, melihat statistik, mencetak daftar rombel resmi, atau mengekspor ke Excel.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Tambah / Edit Rombel */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>{editingRombel ? 'Edit Identitas Rombel' : 'Buat Rombel Baru'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRombel} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Pelajaran *
                  </label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  >
                    {academicYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Semester *
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Kelas *
                  </label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    required
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Rombel / Kelas *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: X-1 (Fase E) / XI MIPA 1"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Wali Kelas (Guru)
                </label>
                <select
                  value={formData.homeroomTeacherId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    const teacher = teachers.find((t) => t.id === tid);
                    setFormData({
                      ...formData,
                      homeroomTeacherId: tid,
                      homeroomTeacherName: teacher ? teacher.name : '',
                    });
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Pilih Wali Kelas dari Data Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.nip ? `(NIP: ${t.nip})` : ''} - {t.subject || 'Pengajar'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ruang Kelas
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="Contoh: R. 01 / Gedung A Lt. 2"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kapasitas Maksimal
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 36 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kurikulum
                </label>
                <select
                  value={formData.curriculum}
                  onChange={(e) => setFormData({ ...formData, curriculum: e.target.value as any })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                  <option value="Kurikulum 2013">Kurikulum 2013</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah Siswa ke Rombel dari Database */}
      {isAddStudentOpen && activeRombel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  <span>Masukkan Siswa ke {activeRombel.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pilih siswa dari database induk yang belum terdaftar di tahun ajaran {activeRombel.academicYear}
                </p>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List candidate students */}
            <div className="flex-1 overflow-y-auto my-3 divide-y divide-slate-100 dark:divide-slate-800">
              {candidateStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">Semua siswa di database sudah terdaftar pada tahun ajaran ini.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tambahkan siswa baru melalui menu "Data Peserta Didik" atau "Import Excel".
                  </p>
                </div>
              ) : (
                candidateStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition rounded-xl"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {s.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            s.gender === 'L' ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'text-pink-600 bg-pink-50 dark:bg-pink-950/40'
                          }`}
                        >
                          {s.gender}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        NIS: {s.nis || '-'} • NISN: {s.nisn || '-'} • Kelas Sebelumnya: {s.className || '-'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddStudentToRombel(s)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambahkan</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Pindahkan Siswa ke Rombel Lain */}
      {isTransferOpen && studentToTransfer && activeRombel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <span>Pindahkan Siswa</span>
              </h3>
              <button
                onClick={() => setIsTransferOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  {studentToTransfer.studentName}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  NIS: {studentToTransfer.nis} • Rombel Asal: <strong>{activeRombel.name}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Rombel Tujuan ({activeRombel.academicYear}) *
                </label>
                <select
                  value={targetRombelId}
                  onChange={(e) => setTargetRombelId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Pilih Rombel Tujuan --</option>
                  {rombels
                    .filter((r) => r.id !== activeRombel.id && r.academicYear === activeRombel.academicYear)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Tingkat {r.gradeLevel} - {r.studentCount || 0} Siswa)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsTransferOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
              >
                Batal
              </button>
              <button
                disabled={!targetRombelId}
                onClick={handleExecuteTransfer}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md cursor-pointer"
              >
                Pindahkan Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Import Excel Preview */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Preview Import Data Rombel Excel</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ditemukan {importPreview.length} baris data siswa rombel
                </p>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importErrors.length > 0 && (
              <div className="my-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Perhatian Validasi:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {importErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>...dan {importErrors.length - 5} catatan lainnya.</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex-1 overflow-y-auto my-3 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2">Baris</th>
                    <th className="p-2">Rombel</th>
                    <th className="p-2">Tingkat</th>
                    <th className="p-2">Tahun Ajaran</th>
                    <th className="p-2">NIS</th>
                    <th className="p-2">Nama Siswa</th>
                    <th className="p-2 text-center">L/P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {importPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 text-slate-400">{item.rowNum}</td>
                      <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{item.rombelName}</td>
                      <td className="p-2">{item.gradeLevel}</td>
                      <td className="p-2">{item.academicYear}</td>
                      <td className="p-2 font-mono">{item.nis}</td>
                      <td className="p-2 font-semibold text-slate-900 dark:text-white">{item.studentName}</td>
                      <td className="p-2 text-center">{item.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
              >
                Batal
              </button>
              <button
                disabled={importing || importPreview.length === 0}
                onClick={handleProcessImport}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {importing ? (
                  <span>Memproses...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Konfirmasi & Simpan ke Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Print Official Roster with Kop Surat & Margin Controls */}
      {isPrintRosterOpen && activeRombel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:p-0">
            {/* Toolbar (hidden on print) */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  <span>Cetak Daftar Rombongan Belajar Resmi</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lengkap dengan Kop Surat SMAS Ma'arif 05, rekapitulasi, dan lembar pengesahan
                </p>
              </div>

              {/* Print Margins & Paper Size */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={printPaperSize}
                  onChange={(e) => setPrintPaperSize(e.target.value as any)}
                  className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="A4">Kertas A4</option>
                  <option value="F4">Kertas F4 / Folio</option>
                </select>

                <select
                  value={printOrientation}
                  onChange={(e) => setPrintOrientation(e.target.value as any)}
                  className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="portrait">Potrait</option>
                  <option value="landscape">Landscape</option>
                </select>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>

                <button
                  onClick={() => setIsPrintRosterOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview to Print */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 print:bg-white print:p-0">
              <div
                className="bg-white text-slate-900 mx-auto shadow-lg print:shadow-none p-8"
                style={{
                  width: printOrientation === 'portrait' ? '210mm' : '297mm',
                  minHeight: printOrientation === 'portrait' ? '297mm' : '210mm',
                  paddingTop: `${printMargins.top}mm`,
                  paddingBottom: `${printMargins.bottom}mm`,
                  paddingLeft: `${printMargins.left}mm`,
                  paddingRight: `${printMargins.right}mm`,
                }}
              >
                {/* Official Institutional Kop Surat */}
                <KopSuratView customSettings={settings} />

                {/* Title */}
                <div className="text-center my-4">
                  <h2 className="text-sm font-black uppercase tracking-wider underline">
                    DAFTAR PESERTA DIDIK ROMBONGAN BELAJAR
                  </h2>
                  <p className="text-xs font-bold mt-1">
                    TAHUN PELAJARAN {activeRombel.academicYear} - SEMESTER {activeRombel.semester.toUpperCase()}
                  </p>
                </div>

                {/* Rombel Identity Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-2 bg-slate-50 border border-slate-300 rounded">
                  <div>
                    <div><strong>Kelas / Rombel:</strong> {activeRombel.name}</div>
                    <div><strong>Tingkat:</strong> Kelas {activeRombel.gradeLevel}</div>
                    <div><strong>Kurikulum:</strong> {activeRombel.curriculum}</div>
                  </div>
                  <div>
                    <div><strong>Wali Kelas:</strong> {activeRombel.homeroomTeacherName || '-'}</div>
                    <div><strong>Ruang Belajar:</strong> {activeRombel.room || '-'}</div>
                    <div><strong>Jumlah Siswa:</strong> {activeMembers.length} (L: {activeMembers.filter((m) => m.gender === 'L').length}, P: {activeMembers.filter((m) => m.gender === 'P').length})</div>
                  </div>
                </div>

                {/* Table of Students */}
                <table className="w-full text-xs border-collapse border border-slate-800">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-bold">
                      <th className="border border-slate-800 py-1.5 px-2 w-10 text-center">No</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-24 text-center">NIS</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-28 text-center">NISN</th>
                      <th className="border border-slate-800 py-1.5 px-3 text-left">Nama Siswa</th>
                      <th className="border border-slate-800 py-1.5 px-2 w-12 text-center">L/P</th>
                      <th className="border border-slate-800 py-1.5 px-3 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMembers.map((m, idx) => (
                      <tr key={m.id}>
                        <td className="border border-slate-800 py-1 px-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center font-mono">{m.nis}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center font-mono">{m.nisn}</td>
                        <td className="border border-slate-800 py-1 px-3 font-semibold">{m.studentName}</td>
                        <td className="border border-slate-800 py-1 px-2 text-center">{m.gender}</td>
                        <td className="border border-slate-800 py-1 px-3 text-[11px]">{m.notes || 'Aktif'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Gender Breakdown Summary */}
                <div className="mt-4 text-xs font-semibold flex items-center justify-between border-t border-b border-slate-300 py-1.5">
                  <span>Rekapitulasi Siswa:</span>
                  <div className="flex gap-4">
                    <span>Laki-Laki: <strong>{activeMembers.filter((m) => m.gender === 'L').length} Orang</strong></span>
                    <span>Perempuan: <strong>{activeMembers.filter((m) => m.gender === 'P').length} Orang</strong></span>
                    <span>Total: <strong>{activeMembers.length} Orang</strong></span>
                  </div>
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
