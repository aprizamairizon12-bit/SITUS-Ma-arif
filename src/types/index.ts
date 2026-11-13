export type UserRole = 'super_admin' | 'admin_tu' | 'kepala_sekolah' | 'operator' | 'guru';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  teacherId?: string; // linked to Teacher ID if role is guru
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string;
  religion: string;
  address: string;
  phone: string;
  fatherName: string;
  motherName: string;
  parentJob: string;
  parentAddress: string;
  parentPhone: string;
  entryYear: string;
  className: string;
  status: 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar';
  photoUrl?: string;
  documents?: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string;
  nuptk: string;
  nik: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string;
  lastEducation: string;
  major: string;
  position: string;
  subject: string;
  employeeStatus: 'PNS' | 'GTY' | 'GTT' | 'PPPK' | 'Honorer';
  address: string;
  phone: string;
  email: string;
  photoUrl?: string;
  documents?: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  name: string;
  nip: string;
  nik: string;
  gender: 'L' | 'P';
  position: string;
  employeeStatus: 'PNS' | 'PTY' | 'PTT' | 'PPPK' | 'Honorer';
  address: string;
  phone: string;
  email: string;
  photoUrl?: string;
  documents?: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  academicYear: string;
  homeroomTeacher: string;
  room: string;
  studentCount: number;
  createdAt: string;
}

export interface Alumni {
  id: string;
  name: string;
  nis: string;
  nisn: string;
  graduationYear: string;
  phone: string;
  email: string;
  currentActivity: string;
  address: string;
  createdAt: string;
}

export interface IncomingLetter {
  id: string;
  letterNumber: string;
  letterDate: string;
  receivedDate: string;
  sender: string;
  subject: string;
  disposition: string;
  academicYear?: string;
  fileUrl?: string;
  fileName?: string;
  notes?: string;
  createdAt: string;
}

export interface OutgoingLetter {
  id: string;
  letterNumber: string;
  letterDate: string;
  recipient: string;
  subject: string;
  signatory: string;
  academicYear?: string;
  fileUrl?: string;
  fileName?: string;
  notes?: string;
  category?: string;
  createdAt: string;
}

export interface CreatedLetter {
  id: string;
  letterType: string;
  letterTypeName: string;
  letterNumber: string;
  title: string;
  date: string;
  academicYear?: string;
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  contentHtml: string;
  signeeName: string;
  signeeNip: string;
  signeeRole: string;
  paperSize: 'A4' | 'F4';
  orientation: 'portrait' | 'landscape';
  hasKop: boolean;
  status: 'draft' | 'disetujui' | 'diterbitkan';
  createdAt: string;
  updatedAt: string;
}

export interface StudentInvoice {
  id: string;
  invoiceNumber: string;
  studentId?: string;
  studentName: string;
  nis: string;
  className: string;
  academicYear?: string;
  category: 'Tunggakan' | 'Daftar Ulang' | 'SPP' | 'Ujian' | 'Seragam' | 'Lainnya';
  amount: number;
  notes?: string;
  dueDate: string;
  invoiceDate: string;
  createdAt: string;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  documentNumber: string;
  documentDate: string;
  academicYear?: string;
  category: string;
  origin: string;
  destination: string;
  description: string;
  fileUrl?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface SchoolSetting {
  id: string;
  schoolName: string;
  foundationName: string;
  foundationLine1?: string;
  foundationLine2?: string;
  npsn: string;
  nss?: string;
  nisCode?: string;
  accreditationStatus?: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  headmasterName: string;
  headmasterNip: string;
  tuHeadName: string;
  tuHeadNip: string;
  academicYear: string;
  activeSemester?: 'Ganjil' | 'Genap';
  letterNumberFormat: string;
  logoLeftUrl: string;
  logoRightUrl: string;
  logoLeftWidth: number;
  logoRightWidth: number;
  kopFont: string;
  kopBorderWidth: number;
  showUniformBilling: boolean;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  startYear: number;
  endYear: number;
  name: string; // e.g. "2026/2027"
  activeSemester: 'Ganjil' | 'Genap';
  startDate: string;
  endDate: string;
  status: 'Aktif' | 'Tidak Aktif';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

// 1. MODUL DATA ROMBONGAN BELAJAR (ROMBEL)
export interface Rombel {
  id: string;
  name: string; // e.g. "X-1 (Fase E)", "XI MIPA 1"
  gradeLevel: 'X' | 'XI' | 'XII';
  academicYear: string; // e.g. "2026/2027"
  semester: 'Ganjil' | 'Genap';
  homeroomTeacherId: string;
  homeroomTeacherName: string;
  room: string;
  capacity: number;
  studentCount: number;
  maleCount: number;
  femaleCount: number;
  curriculum: 'Kurikulum Merdeka' | 'Kurikulum 2013';
  createdAt: string;
  updatedAt: string;
}

export interface RombelMember {
  id: string;
  rombelId: string;
  rombelName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  studentId: string;
  nis: string;
  nisn: string;
  studentName: string;
  gender: 'L' | 'P';
  notes?: string;
  joinedAt: string;
}

// 2. MODUL ABSENSI KELAS
export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';

export interface ClassAttendanceRecord {
  id: string;
  rombelId: string;
  rombelName: string;
  gradeLevel: 'X' | 'XI' | 'XII';
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  date: string; // YYYY-MM-DD
  studentId: string;
  nis: string;
  studentName: string;
  gender: 'L' | 'P';
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  updatedAt: string;
}

// 3. MODUL BUKU PEGANGAN GURU
export interface TeacherBook {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherNip: string;
  teacherNuptk: string;
  subject: string;
  gradeLevel: 'X' | 'XI' | 'XII';
  rombelId: string;
  rombelName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  schoolName: string;
  kkm: number;
  formula: 'RATA_RATA' | 'BOBOT_KOMPONEN'; // formula for final score
  weightAssignments?: number;
  weightDailyExams?: number;
  weightMidExam?: number;
  weightFinalExam?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentType = 'PH' | 'TUGAS' | 'PRAKTIK' | 'PROYEK' | 'PORTOFOLIO' | 'STS' | 'SAS' | 'LAINNYA';

export interface GradeAssessment {
  id: string;
  teacherBookId: string;
  code: string; // e.g. "PH 1", "Tugas 1", "STS"
  name: string; // e.g. "Penilaian Harian 1 Eksponensial"
  type: AssessmentType;
  date: string;
  weight: number;
  maxScore: number;
  notes?: string;
  order: number;
  createdAt: string;
}

export interface GradeRecord {
  id: string;
  teacherBookId: string;
  assessmentId: string;
  studentId: string;
  nis: string;
  studentName: string;
  gender: 'L' | 'P';
  score: number;
  notes?: string;
  updatedAt: string;
}

export interface TeachingJournal {
  id: string;
  teacherBookId: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  rombelName: string;
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "Senin"
  periodHours: string; // e.g. "Jam 1 - 3 (07.30 - 09.45)"
  topic: string; // Materi pembelajaran
  learningObjective: string; // Tujuan pembelajaran
  activities: string; // Kegiatan pembelajaran
  method: string; // Metode pembelajaran (Problem Based Learning, Diskusi, dll)
  attendancePresent: number;
  attendanceSick: number;
  attendancePermit: number;
  attendanceAbsent: number;
  teacherNotes?: string;
  createdAt: string;
}

export interface LearningObjective {
  id: string;
  teacherBookId: string;
  element: string; // Elemen CP
  cp: string; // Capaian Pembelajaran
  tp: string; // Tujuan Pembelajaran
  materials: string; // Materi
  assessmentTechnique: string; // Teknik Penilaian
  progressDescription?: string; // Deskripsi perkembangan
  createdAt: string;
}

export interface AppAnimationSettings {
  enabled: boolean;
  reducedMotion: boolean;
  speed: 'normal' | 'fast' | 'slow';
}

