import React, { useEffect, useState } from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  Inbox,
  Send,
  Archive,
  PlusCircle,
  FileText,
  Printer,
  Upload,
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarRange,
  BookOpen,
  CheckCircle2,
  Clock,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { collection, onSnapshot, query, limit, orderBy, addDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { NavItemKey } from '../common/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_STAFF, INITIAL_CLASSES } from '../../utils/sampleData';

interface DashboardProps {
  onNavigate: (tab: NavItemKey) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { activeYearName, activeSemester } = useAcademicYear();
  const [counts, setCounts] = useState({
    students: 0,
    teachers: 0,
    staff: 0,
    rombels: 0,
    teacherBooks: 0,
    journals: 0,
    incoming: 0,
    outgoing: 0,
    archives: 0,
    gradeX: 0,
    gradeXI: 0,
    gradeXII: 0,
  });

  const [todayAttendance, setTodayAttendance] = useState({
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpa: 0,
    total: 0,
    percentage: 100,
  });

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isInitializingData, setIsInitializingData] = useState(false);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to live counts from Firestore
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      let gX = 0;
      let gXI = 0;
      let gXII = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        const cls = String(data.className || '').toUpperCase();
        if (cls.startsWith('XII')) gXII++;
        else if (cls.startsWith('XI')) gXI++;
        else gX++;
      });
      setCounts((prev) => ({
        ...prev,
        students: snap.size,
        gradeX: gX,
        gradeXI: gXI,
        gradeXII: gXII,
      }));
      if (snap.empty && !isInitializingData) {
        seedInitialFirestoreData();
      }
    });

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setCounts((prev) => ({ ...prev, teachers: snap.size }));
    });

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      setCounts((prev) => ({ ...prev, staff: snap.size }));
    });

    const unsubRombels = onSnapshot(collection(db, 'rombels'), (snap) => {
      const activeRombelsCount = snap.docs.filter((d) => d.data().academicYear === activeYearName).length;
      setCounts((prev) => ({ ...prev, rombels: activeRombelsCount || snap.size }));
    });

    const unsubTeacherBooks = onSnapshot(collection(db, 'teacher_books'), (snap) => {
      const activeBooksCount = snap.docs.filter((d) => d.data().academicYear === activeYearName).length;
      setCounts((prev) => ({ ...prev, teacherBooks: activeBooksCount || snap.size }));
    });

    const unsubJournals = onSnapshot(collection(db, 'teaching_journals'), (snap) => {
      setCounts((prev) => ({ ...prev, journals: snap.size }));
    });

    // Today's attendance
    const todayStr = new Date().toISOString().split('T')[0];
    const unsubAtt = onSnapshot(
      query(collection(db, 'class_attendance'), where('date', '==', todayStr)),
      (snap) => {
        let h = 0, s = 0, i = 0, a = 0;
        snap.docs.forEach((doc) => {
          const st = doc.data().status;
          if (st === 'H') h++;
          else if (st === 'S') s++;
          else if (st === 'I') i++;
          else if (st === 'A') a++;
        });
        const total = snap.size;
        const percentage = total > 0 ? Math.round((h / total) * 100) : 100;
        setTodayAttendance({ hadir: h, sakit: s, izin: i, alpa: a, total, percentage });
      }
    );

    const unsubIncoming = onSnapshot(collection(db, 'incomingLetters'), (snap) => {
      setCounts((prev) => ({ ...prev, incoming: snap.size }));
    });

    const unsubOutgoing = onSnapshot(collection(db, 'outgoingLetters'), (snap) => {
      setCounts((prev) => ({ ...prev, outgoing: snap.size }));
    });

    const unsubArchives = onSnapshot(collection(db, 'archives'), (snap) => {
      setCounts((prev) => ({ ...prev, archives: snap.size }));
    });

    const unsubLogs = onSnapshot(
      query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(6)),
      (snap) => {
        const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRecentActivities(logs);
      },
      () => {
        setRecentActivities([
          { action: 'Pembuatan Surat Keterangan Siswa', userName: 'Ahmad Fauzi', time: '10 menit lalu', module: 'Surat' },
          { action: 'Pengarsipan Dokumen Akreditasi', userName: 'Dewi Anggraini', time: '1 jam lalu', module: 'Arsip' },
          { action: 'Pencatatan Surat Masuk Disdikbud', userName: 'Muhammad Rizki', time: '3 jam lalu', module: 'Surat Masuk' },
          { action: 'Penerbitan Surat Tugas MKKS', userName: 'Ahmad Fauzi', time: 'Kemarin', module: 'Surat Tugas' },
        ]);
      }
    );

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubStaff();
      unsubRombels();
      unsubTeacherBooks();
      unsubJournals();
      unsubAtt();
      unsubIncoming();
      unsubOutgoing();
      unsubArchives();
      unsubLogs();
    };
  }, [activeYearName]);

  const seedInitialFirestoreData = async () => {
    try {
      setIsInitializingData(true);
      const studentsSnap = await getDocs(collection(db, 'students'));
      if (studentsSnap.empty) {
        for (const s of INITIAL_STUDENTS) {
          await addDoc(collection(db, 'students'), s);
        }
        for (const t of INITIAL_TEACHERS) {
          await addDoc(collection(db, 'teachers'), t);
        }
        for (const st of INITIAL_STAFF) {
          await addDoc(collection(db, 'staff'), st);
        }
        for (const c of INITIAL_CLASSES) {
          await addDoc(collection(db, 'classes'), c);
        }
        await addDoc(collection(db, 'incomingLetters'), {
          letterNumber: '421/045/Disdikbud/2025',
          letterDate: '2025-01-15',
          receivedDate: '2025-01-16',
          sender: 'Dinas Pendidikan dan Kebudayaan Prov. Lampung',
          subject: 'Pemberitahuan Asesmen Bakat Minat (ABM) SMA/SMK Tahun 2025',
          disposition: 'Waka Kurikulum untuk ditindaklanjuti',
          fileName: 'Surat_Edaran_ABM_2025.pdf',
          createdAt: new Date().toISOString(),
        });
        await addDoc(collection(db, 'outgoingLetters'), {
          letterNumber: '421.3/012/SMAS-M.05/TU/I/2025',
          letterDate: '2025-01-18',
          recipient: 'Orang Tua / Wali Murid Kelas XII',
          subject: 'Undangan Rapat Persiapan Ujian Sekolah & Kelulusan',
          signatory: 'H. M. Syaifullah, S.Pd.I., M.Pd.',
          fileName: 'Undangan_Rapat_Wali_Murid.pdf',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("Auto seed note:", e);
    } finally {
      setIsInitializingData(false);
    }
  };

  const statCards = [
    {
      title: 'Peserta Didik',
      count: counts.students,
      unit: `${counts.gradeX} (X) • ${counts.gradeXI} (XI) • ${counts.gradeXII} (XII)`,
      icon: Users,
      gradient: 'from-blue-600 via-indigo-600 to-blue-700',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
      glow: 'group-hover:shadow-blue-500/20',
      link: 'students' as NavItemKey,
    },
    {
      title: 'Rombongan Belajar',
      count: counts.rombels,
      unit: 'Kelas X, XI, XII',
      icon: Layers,
      gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
      glow: 'group-hover:shadow-purple-500/20',
      link: 'rombels' as NavItemKey,
    },
    {
      title: 'Guru & Pendidik',
      count: counts.teachers,
      unit: 'Tenaga Pendidik',
      icon: GraduationCap,
      gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
      glow: 'group-hover:shadow-emerald-500/20',
      link: 'teachers' as NavItemKey,
    },
    {
      title: 'Buku Pegangan Guru',
      count: counts.teacherBooks,
      unit: `${counts.journals} Jurnal Terisi`,
      icon: BookOpen,
      gradient: 'from-amber-500 via-orange-500 to-amber-600',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
      glow: 'group-hover:shadow-amber-500/20',
      link: 'teacher_book' as NavItemKey,
    },
    {
      title: 'Presensi Hari Ini',
      count: `${todayAttendance.percentage}%`,
      unit: `${todayAttendance.hadir} Hadir / ${todayAttendance.total || counts.students}`,
      icon: CalendarCheck,
      gradient: 'from-teal-600 via-emerald-600 to-teal-700',
      badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900',
      glow: 'group-hover:shadow-teal-500/20',
      link: 'attendance' as NavItemKey,
    },
    {
      title: 'Surat Masuk',
      count: counts.incoming,
      unit: 'Buku Agenda',
      icon: Inbox,
      gradient: 'from-cyan-600 via-sky-600 to-blue-600',
      badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900',
      glow: 'group-hover:shadow-cyan-500/20',
      link: 'incoming_letters' as NavItemKey,
    },
    {
      title: 'Surat Keluar',
      count: counts.outgoing,
      unit: 'Dokumen Terbit',
      icon: Send,
      gradient: 'from-rose-600 via-pink-600 to-rose-700',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900',
      glow: 'group-hover:shadow-rose-500/20',
      link: 'outgoing_letters' as NavItemKey,
    },
    {
      title: 'Arsip Digital',
      count: counts.archives,
      unit: 'Dokumen Fisik & Scan',
      icon: Archive,
      gradient: 'from-indigo-600 via-slate-700 to-slate-900',
      badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
      glow: 'group-hover:shadow-indigo-500/20',
      link: 'archives' as NavItemKey,
    },
  ];

  const adminCalendar = [
    { date: '15 Jan', title: 'Rapat Koordinasi TU & Pimpinan Sekolah', tag: 'Internal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    { date: '22 Jan', title: 'Sinkronisasi Data EMIS & Dapodik Semester Genap', tag: 'Dapodik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
    { date: '01 Feb', title: 'Penerbitan Rekap Surat Tagihan Pembiayaan Siswa', tag: 'Administrasi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
    { date: '10 Feb', title: 'Pengarsipan Digital Berkas Ijazah & Raport Siswa', tag: 'Kearsipan', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  ];

  return (
    <div className="space-y-6">
      {/* High-Impact Vibrant Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#070e24] via-[#0d1d4d] to-[#15347a] p-6 sm:p-8 text-white shadow-2xl border border-blue-700/40">
        {/* Glow Spheres */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-12 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/40 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SITUS Cloud Firestore Terhubung & Terenkripsi</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Selamat Datang,{' '}
              <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                {profile?.displayName || 'Staf Tata Usaha'}
              </span>!
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal">
              Sistem Informasi Tata Usaha Sekolah Terpadu (SITUS) <strong>SMAS Ma’arif 05 Padang Ratu</strong> siap memfasilitasi administrasi siswa, rombongan belajar, presensi kelas, buku pegangan guru, persuratan resmi, dan kearsipan digital.
            </p>
          </div>

          {/* Real-time Clock & Date Lockup */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2 p-4 rounded-2xl bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/15">
            <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-base sm:text-lg">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{currentTime || '08:00:00 WIB'}</span>
            </div>
            <p className="text-[11px] text-blue-200 font-medium">
              {currentDate || 'Memuat tanggal...'}
            </p>
            <button
              onClick={() => onNavigate('academic_years')}
              className="text-[11px] text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-400/50 px-3 py-1 rounded-full font-bold font-mono tabular-nums flex items-center gap-1.5 transition cursor-pointer"
              title="Kelola Tahun Pelajaran"
            >
              <CalendarRange className="w-3.5 h-3.5 text-emerald-300" />
              <span>Tahun Pelajaran {activeYearName} ({activeSemester})</span>
            </button>
          </div>
        </div>

        {/* Decorative School Logo Watermark */}
        <div className="absolute -right-8 -bottom-10 opacity-15 pointer-events-none">
          <img src="/logo_sekolah.png" alt="" className="w-72 h-72 object-contain" />
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Pintasan Akses Utama Tata Usaha & Akademik</span>
          </p>
          <span className="text-[11px] text-slate-400">Pintasan 1-Klik</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('rombels')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-200/60 dark:from-purple-950/40 dark:to-purple-900/30 dark:hover:from-purple-900/50 dark:hover:to-purple-800/40 border border-purple-200/80 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 transition-all group cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02]"
          >
            <span className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-md shadow-purple-600/30 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold">Data Rombel</span>
            <span className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-0.5">Kelas & Pembagian</span>
          </button>

          <button
            onClick={() => onNavigate('attendance')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-teal-50 to-teal-100/50 hover:from-teal-100 hover:to-teal-200/60 dark:from-teal-950/40 dark:to-teal-900/30 dark:hover:from-teal-900/50 dark:hover:to-teal-800/40 border border-teal-200/80 dark:border-teal-800/60 text-teal-900 dark:text-teal-200 transition-all group cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02]"
          >
            <span className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-2 shadow-md shadow-teal-600/30 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold">Absensi Kelas</span>
            <span className="text-[10px] text-teal-600/80 dark:text-teal-400 mt-0.5">Presensi H & S & I & A</span>
          </button>

          <button
            onClick={() => onNavigate('teacher_book')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/50 hover:from-amber-100 hover:to-amber-200/60 dark:from-amber-950/40 dark:to-amber-900/30 dark:hover:from-amber-900/50 dark:hover:to-amber-800/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 transition-all group cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02]"
          >
            <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold">Buku Guru</span>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-0.5">Nilai & Jurnal</span>
          </button>

          <button
            onClick={() => onNavigate('students')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/60 dark:from-blue-950/40 dark:to-blue-900/30 dark:hover:from-blue-900/50 dark:hover:to-blue-800/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 transition-all group cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02]"
          >
            <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-md shadow-blue-600/30 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold">Data Siswa</span>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400 mt-0.5">Induk Siswa</span>
          </button>

          <button
            onClick={() => onNavigate('letters')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-200/60 dark:from-emerald-950/40 dark:to-emerald-900/30 dark:hover:from-emerald-900/50 dark:hover:to-emerald-800/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 transition-all group cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02]"
          >
            <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-md shadow-emerald-600/30 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold">Buat Surat</span>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">22 Template Resmi</span>
          </button>

          <button
            onClick={() => onNavigate('archives')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-rose-50 to-rose-100/50 hover:from-rose-100 hover:to-rose-200/60 dark:from-rose-950/40 dark:to-rose-900/30 dark:hover:from-rose-900/50 dark:hover:to-rose-800/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 transition-all group cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02]"
          >
            <span className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-2 shadow-md shadow-rose-600/30 group-hover:scale-110 transition-transform">
              <Archive className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold">Arsip Digital</span>
            <span className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5">Dokumen Sekolah</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Akademik & Presensi Harian */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribusi Siswa Tingkat X, XI, XII */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600">
                  <Layers className="w-4 h-4" />
                </span>
                <span>Distribusi Siswa per Tingkat Kelas</span>
              </h3>
              <span className="text-[11px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full">
                {counts.students} Total Siswa
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Kelas X */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Kelas X (Fase E)</span>
                  <span className="text-blue-600 dark:text-blue-400">{counts.gradeX} Siswa</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${counts.students > 0 ? (counts.gradeX / counts.students) * 100 : 33}%` }}
                  />
                </div>
              </div>

              {/* Kelas XI */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Kelas XI (Fase F)</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{counts.gradeXI} Siswa</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${counts.students > 0 ? (counts.gradeXI / counts.students) * 100 : 33}%` }}
                  />
                </div>
              </div>

              {/* Kelas XII */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Kelas XII (Tingkat Akhir)</span>
                  <span className="text-purple-600 dark:text-purple-400">{counts.gradeXII} Siswa</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${counts.students > 0 ? (counts.gradeXII / counts.students) * 100 : 34}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total {counts.rombels} Rombongan Belajar</span>
            <button
              onClick={() => onNavigate('rombels')}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
            >
              Kelola Rombel & Siswa →
            </button>
          </div>
        </div>

        {/* Rekap Presensi Hari Ini */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600">
                  <CalendarCheck className="w-4 h-4" />
                </span>
                <span>Rekap Kehadiran Siswa Hari Ini</span>
              </h3>
              <span className="text-[11px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">
                {todayAttendance.percentage}% Hadir
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Hadir (H)</div>
                <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-1">{todayAttendance.hadir}</div>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60">
                <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Sakit (S)</div>
                <div className="text-xl font-black text-blue-800 dark:text-blue-200 mt-1">{todayAttendance.sakit}</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Izin (I)</div>
                <div className="text-xl font-black text-amber-800 dark:text-amber-200 mt-1">{todayAttendance.izin}</div>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
                <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Alpa (A)</div>
                <div className="text-xl font-black text-rose-800 dark:text-rose-200 mt-1">{todayAttendance.alpa}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-medium">Pencetakan Lembar Fisik:</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('print_class_attendance')}
                className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Absensi Kelas</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                onClick={() => onNavigate('print_teacher_attendance')}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Absensi Guru</span>
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Vibrant High-Density Statistical Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Statistik Realtime Database Sekolah</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Cloud Firestore Aktif</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigate(card.link)}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 group cursor-pointer ${card.glow}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${card.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="mt-3.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                    {card.count}
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {card.title}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {card.unit}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Calendar & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar of Administrative Activities */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <span>Agenda Tata Usaha</span>
            </h3>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
              Bulan Ini
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {adminCalendar.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-colors">
                <div className="w-12 text-center py-1.5 px-1 bg-gradient-to-b from-blue-600 to-indigo-700 text-white rounded-xl shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">{item.date.split(' ')[1]}</span>
                  <span className="text-sm font-black block font-mono">{item.date.split(' ')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    {item.title}
                  </p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 ${item.color}`}>
                    {item.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities with Rich Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Activity className="w-4 h-4" />
              </span>
              <span>Aktivitas Tata Usaha Terkini</span>
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Realtime Feed</span>
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.length > 0 ? (
              recentActivities.map((act, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {act.action || act.details}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Oleh <span className="font-semibold text-slate-700 dark:text-slate-300">{act.userName || 'Petugas TU'}</span> • Modul:{' '}
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium">
                          {act.module || 'Sistem'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono font-medium whitespace-nowrap">
                    {act.time || (act.timestamp ? new Date(act.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Hari ini')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada aktivitas baru tercatat.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
