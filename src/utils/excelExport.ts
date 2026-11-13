import * as XLSX from 'xlsx';
import { Student, Teacher, Staff, StudentInvoice } from '../types';

export function exportStudentsToExcel(students: Student[], filename = 'Data_Peserta_Didik_SMA_Maarif_05.xlsx') {
  const data = students.map((s, idx) => ({
    'No': idx + 1,
    'NIS': s.nis,
    'NISN': s.nisn,
    'Nama Lengkap': s.name,
    'L/P': s.gender,
    'Kelas': s.className,
    'Status': s.status,
    'Tempat Lahir': s.birthPlace,
    'Tanggal Lahir': s.birthDate,
    'Agama': s.religion,
    'No HP Siswa': s.phone,
    'Alamat Siswa': s.address,
    'Nama Ayah': s.fatherName,
    'Nama Ibu': s.motherName,
    'Pekerjaan Ortu': s.parentJob,
    'No HP Ortu': s.parentPhone,
    'Tahun Masuk': s.entryYear,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, filename);
}

export function downloadStudentTemplate() {
  const template = [
    {
      'NIS': '20260001',
      'NISN': '0071234567',
      'Nama Lengkap': 'Achmad Zaky Pratama',
      'L/P': 'L',
      'Kelas': 'X-1 (Fase E)',
      'Status': 'Aktif',
      'Tempat Lahir': 'Padang Ratu',
      'Tanggal Lahir': '2010-05-10',
      'Agama': 'Islam',
      'No HP Siswa': '081234567890',
      'Alamat Siswa': 'Jl. Raya Padang Ratu No. 10',
      'Nama Ayah': 'Abdullah',
      'Nama Ibu': 'Fatimah',
      'Pekerjaan Ortu': 'Wiraswasta',
      'No HP Ortu': '081398765432',
      'Tahun Masuk': '2026',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');
  XLSX.writeFile(workbook, 'Template_Import_Siswa_SITUS.xlsx');
}

export function downloadTeacherTemplate() {
  const template = [
    {
      'Nama Lengkap': 'Ahmad Fauzi, S.Pd.',
      'NIP': '198501012010011001',
      'NUPTK': '1234567890123456',
      'NIK': '1802010101850001',
      'L/P': 'L',
      'Jabatan': 'Guru Mapel',
      'Mata Pelajaran': 'Matematika',
      'Status Kepegawaian': 'GTY',
      'Pendidikan Terakhir': 'S1',
      'Jurusan': 'Pendidikan Matematika',
      'No HP': '081234567890',
      'Email': 'guru@smamaarif05.sch.id',
      'Alamat': 'Kampung Surabaya, Padang Ratu',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Guru');
  XLSX.writeFile(workbook, 'Template_Import_Guru_SITUS.xlsx');
}

export function downloadStaffTemplate() {
  const template = [
    {
      'Nama Lengkap': 'Siti Aminah, S.Kom.',
      'NIP': '-',
      'NIK': '1802014502900001',
      'L/P': 'P',
      'Jabatan / Tugas': 'Staf Tata Usaha',
      'Status Kepegawaian': 'PTY',
      'No HP': '081298765432',
      'Email': 'staf@smamaarif05.sch.id',
      'Alamat': 'Kampung Surabaya, Padang Ratu',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Tendik');
  XLSX.writeFile(workbook, 'Template_Import_Tendik_SITUS.xlsx');
}

export function exportTeachersToExcel(teachers: Teacher[], filename = 'Data_Guru_SMA_Maarif_05.xlsx') {
  const data = teachers.map((t, idx) => ({
    'No': idx + 1,
    'Nama Lengkap': t.name,
    'NIP': t.nip,
    'NUPTK': t.nuptk,
    'NIK': t.nik,
    'L/P': t.gender,
    'Jabatan': t.position,
    'Mata Pelajaran': t.subject,
    'Status Kepegawaian': t.employeeStatus,
    'Pendidikan Terakhir': t.lastEducation,
    'Jurusan': t.major,
    'No HP': t.phone,
    'Email': t.email,
    'Alamat': t.address,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');
  XLSX.writeFile(workbook, filename);
}

export function exportStaffToExcel(staffList: Staff[], filename = 'Data_Tenaga_Kependidikan_SMA_Maarif_05.xlsx') {
  const data = staffList.map((s, idx) => ({
    'No': idx + 1,
    'Nama Lengkap': s.name,
    'NIP': s.nip,
    'NIK': s.nik,
    'L/P': s.gender,
    'Jabatan / Tugas': s.position,
    'Status Kepegawaian': s.employeeStatus,
    'No HP': s.phone,
    'Email': s.email,
    'Alamat': s.address,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tenaga Kependidikan');
  XLSX.writeFile(workbook, filename);
}

export function downloadInvoiceTemplate() {
  const template = [
    {
      'NIS': '20260001',
      'Nama Siswa': 'Achmad Zaky Pratama',
      'Kelas': 'X-1 (Fase E)',
      'Kategori Tagihan': 'SPP',
      'Nominal': 150000,
      'Jatuh Tempo': '2026-08-10',
      'Keterangan': 'SPP Bulan Agustus 2026',
    },
    {
      'NIS': '20260002',
      'Nama Siswa': 'Aisyah Putri Maharani',
      'Kelas': 'X-1 (Fase E)',
      'Kategori Tagihan': 'Daftar Ulang',
      'Nominal': 350000,
      'Jatuh Tempo': '2026-08-15',
      'Keterangan': 'Daftar Ulang Semester Ganjil 2026/2027',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Tagihan');
  XLSX.writeFile(workbook, 'Template_Import_Tagihan_Siswa.xlsx');
}

function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const DEFAULT_HEADER_HINTS = [
  'nama',
  'namalengkap',
  'namasiswa',
  'namapesertadidik',
  'nis',
  'nisn',
  'nip',
  'nuptk',
  'nik',
  'kelas',
  'rombel',
  'namarombel',
  'tahunpelajaran',
  'tahunajaran',
  'tingkat',
  'walikelas',
  'lp',
  'jeniskelamin',
  'jabatan',
  'matapelajaran',
  'kategoritagihan',
  'nominal',
];

export function pickExcelCell(row: Record<string, any>, ...aliases: string[]): string {
  if (!row || typeof row !== 'object') return '';
  // Direct key match first
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }
  // Normalized case/punctuation-insensitive match
  const normalizedMap = new Map<string, any>();
  for (const [k, v] of Object.entries(row)) {
    const nk = normalizeHeaderKey(k);
    if (nk && !normalizedMap.has(nk)) {
      normalizedMap.set(nk, v);
    }
  }
  for (const alias of aliases) {
    const val = normalizedMap.get(normalizeHeaderKey(alias));
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

export function parseExcelGender(val: any): 'L' | 'P' {
  const s = String(val ?? '').trim().toUpperCase();
  if (s === 'P' || s.startsWith('PEREMPUAN') || s === 'PR' || s === 'WANITA' || s === 'FEMALE' || s === 'F') {
    return 'P';
  }
  return 'L';
}

export function parseExcelNumber(val: any, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const cleaned = String(val ?? '').replace(/[^\d-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && cleaned !== '' ? parsed : fallback;
}

export function formatExcelImportError(err: any): string {
  const msg = String(err?.message || err || '');
  const code = String(err?.code || '');
  if (
    code === 'permission-denied' ||
    msg.toLowerCase().includes('missing or insufficient permissions') ||
    msg.toLowerCase().includes('permission')
  ) {
    return 'Akses simpan ke database ditolak. Pastikan Anda sudah login menggunakan akun Google / Email resmi (bukan mode demo) dan akun berstatus Aktif.';
  }
  return msg || 'Terjadi kesalahan yang tidak diketahui saat mengimpor file Excel.';
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsArrayBuffer(file);
  });
}

export async function readExcelFile(
  file: File,
  extraHeaderHints: string[] = []
): Promise<Record<string, any>[]> {
  if (!file) throw new Error('Tidak ada file yang dipilih.');
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
    throw new Error(`Format file ".${ext || '?'}" tidak didukung. Gunakan file Excel (.xlsx, .xls) atau .csv.`);
  }

  let workbook: XLSX.WorkBook;
  try {
    if (ext === 'csv') {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const firstLine = text.split(/\r?\n/)[0] || '';
      const semiCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      workbook = XLSX.read(text, {
        type: 'string',
        FS: semiCount > commaCount ? ';' : ',',
        raw: false,
      });
    } else {
      const buffer = await readFileAsArrayBuffer(file);
      workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    }
  } catch (err: any) {
    throw new Error(
      `File "${file.name}" tidak dapat dibaca sebagai dokumen Excel (${err?.message || 'format rusak / terproteksi kata sandi'}).`
    );
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki sheet/lembar kerja.');
  }

  const hintsSet = new Set([
    ...DEFAULT_HEADER_HINTS,
    ...extraHeaderHints.map((h) => normalizeHeaderKey(h)),
  ]);

  // Scan sheets until we find one with actual tabular rows
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    if (!matrix || matrix.length === 0) continue;

    // Auto-detect header row within the first 15 non-empty rows
    let headerRowIdx = 0;
    let bestScore = -1;
    const scanLimit = Math.min(matrix.length, 15);

    for (let r = 0; r < scanLimit; r++) {
      const cells = (matrix[r] || []).map((c) => String(c ?? '').trim());
      const nonEmptyCount = cells.filter(Boolean).length;
      if (nonEmptyCount === 0) continue;

      let matchScore = 0;
      for (const cell of cells) {
        const nk = normalizeHeaderKey(cell);
        if (nk && hintsSet.has(nk)) matchScore += 10;
        else if (nk && (nk.includes('nama') || nk.includes('nis') || nk.includes('kelas') || nk.includes('rombel'))) {
          matchScore += 5;
        }
      }
      // Slight preference for rows with more columns if no keyword matched
      const totalScore = matchScore + (nonEmptyCount >= 2 ? 1 : 0);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        headerRowIdx = r;
      }
    }

    const rawHeaders = (matrix[headerRowIdx] || []).map((h, idx) => {
      const cleaned = String(h ?? '').replace(/^\uFEFF/, '').trim();
      return cleaned || `__COL_${idx + 1}`;
    });

    // Deduplicate identical header names if any
    const seenHeaders: Record<string, number> = {};
    const uniqueHeaders = rawHeaders.map((h) => {
      if (!seenHeaders[h]) {
        seenHeaders[h] = 1;
        return h;
      }
      seenHeaders[h] += 1;
      return `${h}_${seenHeaders[h]}`;
    });

    const parsedRows: Record<string, any>[] = [];
    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const rowArr = matrix[r] || [];
      const rowObj: Record<string, any> = {};
      let hasValue = false;

      for (let c = 0; c < uniqueHeaders.length; c++) {
        const val = rowArr[c] !== undefined && rowArr[c] !== null ? String(rowArr[c]).trim() : '';
        rowObj[uniqueHeaders[c]] = val;
        if (val !== '') hasValue = true;
      }

      if (hasValue) {
        parsedRows.push(rowObj);
      }
    }

    if (parsedRows.length > 0) {
      return parsedRows;
    }
  }

  throw new Error(
    'File Excel tidak memiliki baris data (hanya header kosong atau seluruh sel kosong). Pastikan file berisi minimal 1 baris data di bawah baris judul kolom.'
  );
}

// ROMBEL EXCEL FUNCTIONS
export function downloadRombelTemplate() {
  const template = [
    {
      'Tahun Pelajaran': '2026/2027',
      'Semester': 'Ganjil',
      'Tingkat': 'X',
      'Nama Rombel': 'X-1 (Fase E)',
      'Wali Kelas': 'Ahmad Fauzi, S.Pd.',
      'NIS': '20260001',
      'NISN': '0071234567',
      'Nama Siswa': 'Achmad Zaky Pratama',
      'Jenis Kelamin': 'L',
      'Keterangan': 'Aktif'
    },
    {
      'Tahun Pelajaran': '2026/2027',
      'Semester': 'Ganjil',
      'Tingkat': 'X',
      'Nama Rombel': 'X-1 (Fase E)',
      'Wali Kelas': 'Ahmad Fauzi, S.Pd.',
      'NIS': '20260002',
      'NISN': '0071234568',
      'Nama Siswa': 'Aisyah Putri Maharani',
      'Jenis Kelamin': 'P',
      'Keterangan': 'Aktif'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Rombel');
  XLSX.writeFile(workbook, 'Template_Data_Rombel_SMAS_Maarif_05.xlsx');
}

export function exportRombelMembersToExcel(
  rombelName: string,
  academicYear: string,
  members: Array<{
    nis: string;
    nisn: string;
    studentName: string;
    gender: 'L' | 'P';
    notes?: string;
  }>,
  homeroomTeacher?: string
) {
  const data = members.map((m, idx) => ({
    'No': idx + 1,
    'NIS': m.nis,
    'NISN': m.nisn,
    'Nama Siswa': m.studentName,
    'L/P': m.gender,
    'Rombel': rombelName,
    'Tahun Pelajaran': academicYear,
    'Wali Kelas': homeroomTeacher || '-',
    'Keterangan': m.notes || 'Aktif',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Anggota Rombel');
  const safeName = rombelName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(workbook, `Daftar_Rombel_${safeName}_${academicYear.replace('/', '-')}.xlsx`);
}

// ATTENDANCE EXCEL FUNCTIONS
export function exportAttendanceDailyToExcel(
  rombelName: string,
  date: string,
  records: Array<{
    nis: string;
    studentName: string;
    gender: 'L' | 'P';
    status: 'H' | 'S' | 'I' | 'A';
    notes?: string;
  }>
) {
  const data = records.map((r, idx) => ({
    'No': idx + 1,
    'NIS': r.nis,
    'Nama Siswa': r.studentName,
    'L/P': r.gender,
    'Status': r.status === 'H' ? 'Hadir' : r.status === 'S' ? 'Sakit' : r.status === 'I' ? 'Izin' : 'Alpa',
    'H': r.status === 'H' ? 1 : 0,
    'S': r.status === 'S' ? 1 : 0,
    'I': r.status === 'I' ? 1 : 0,
    'A': r.status === 'A' ? 1 : 0,
    'Keterangan': r.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Absensi Harian');
  const safeName = rombelName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(workbook, `Absensi_${safeName}_${date}.xlsx`);
}

export function exportAttendanceRecapToExcel(
  rombelName: string,
  periodName: string,
  recapList: Array<{
    nis: string;
    studentName: string;
    gender: 'L' | 'P';
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    total: number;
    persentase: number;
  }>
) {
  const data = recapList.map((r, idx) => ({
    'No': idx + 1,
    'NIS': r.nis,
    'Nama Siswa': r.studentName,
    'L/P': r.gender,
    'Hadir (H)': r.hadir,
    'Sakit (S)': r.sakit,
    'Izin (I)': r.izin,
    'Alpa (A)': r.alpa,
    'Total Hari': r.total,
    'Persentase Kehadiran (%)': `${r.persentase}%`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
  const safeName = rombelName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(workbook, `Rekap_Absensi_${safeName}_${periodName.replace(/[\s/]/g, '_')}.xlsx`);
}

// TEACHER BOOK GRADES EXCEL
export function exportTeacherGradesToExcel(
  subject: string,
  rombelName: string,
  academicYear: string,
  assessments: Array<{ id: string; code: string; name: string }>,
  rows: Array<{
    nis: string;
    studentName: string;
    gender: 'L' | 'P';
    scores: Record<string, number>;
    finalScore: number;
    predicate: string;
  }>
) {
  const data = rows.map((row, idx) => {
    const item: Record<string, any> = {
      'No': idx + 1,
      'NIS': row.nis,
      'Nama Siswa': row.studentName,
      'L/P': row.gender,
    };
    assessments.forEach((a) => {
      item[a.code] = row.scores[a.id] ?? '-';
    });
    item['Nilai Akhir'] = Math.round(row.finalScore * 10) / 10;
    item['Predikat'] = row.predicate;
    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Nilai');
  const safeName = `${subject}_${rombelName}`.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(workbook, `Buku_Nilai_${safeName}_${academicYear.replace('/', '-')}.xlsx`);
}

// 1. PENCETAKAN ABSENSI KELAS (BULANAN) - EXCEL FORMAT
export function exportMonthlyClassAttendanceSheetToExcel(
  rombelName: string,
  monthName: string,
  year: number | string,
  daysInMonth: number,
  students: Array<{
    nis: string;
    studentName: string;
    gender: 'L' | 'P';
  }>,
  homeroomTeacher: string = '',
  academicYear: string = '2026/2027',
  semester: string = 'Ganjil'
) {
  const data = students.map((s, idx) => {
    const row: Record<string, any> = {
      'No': idx + 1,
      'NIS': s.nis,
      'Nama Siswa': s.studentName,
      'L/P': s.gender,
    };
    for (let day = 1; day <= daysInMonth; day++) {
      row[String(day)] = ''; // blank cell for handwritten H/S/I/A
    }
    row['H'] = '';
    row['S'] = '';
    row['I'] = '';
    row['A'] = '';
    row['Keterangan'] = '';
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const colWidths: { wch: number }[] = [
    { wch: 5 },  // No
    { wch: 12 }, // NIS
    { wch: 28 }, // Nama Siswa
    { wch: 6 },  // L/P
  ];
  for (let day = 1; day <= daysInMonth; day++) {
    colWidths.push({ wch: 4 });
  }
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 15 });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Absensi_${monthName}`);
  const safeRombel = rombelName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(workbook, `Absensi_Kelas_${safeRombel}_${monthName}_${year}.xlsx`);
}

// 2. PENCETAKAN ABSENSI PEGANGAN GURU (PERTEMUAN) - EXCEL FORMAT
export function exportTeacherSubjectAttendanceSheetToExcel(
  teacherName: string,
  subject: string,
  rombelName: string,
  meetingCount: number,
  students: Array<{
    nis: string;
    studentName: string;
    gender: 'L' | 'P';
  }>,
  academicYear: string = '2026/2027',
  semester: string = 'Ganjil'
) {
  const data = students.map((s, idx) => {
    const row: Record<string, any> = {
      'No': idx + 1,
      'NIS': s.nis,
      'Nama Siswa': s.studentName,
      'L/P': s.gender,
    };
    for (let m = 1; m <= meetingCount; m++) {
      row[`P${m}`] = ''; // blank cell for handwritten meeting presence
    }
    row['H'] = '';
    row['S'] = '';
    row['I'] = '';
    row['A'] = '';
    row['Keterangan'] = '';
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  const colWidths: { wch: number }[] = [
    { wch: 5 },  // No
    { wch: 12 }, // NIS
    { wch: 28 }, // Nama Siswa
    { wch: 6 },  // L/P
  ];
  for (let m = 1; m <= meetingCount; m++) {
    colWidths.push({ wch: 5 });
  }
  colWidths.push({ wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 15 });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Absensi Guru');
  const safeSubject = subject.replace(/[/\\?%*:|"<>]/g, '_');
  const safeRombel = rombelName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(workbook, `Absensi_Guru_${safeSubject}_${safeRombel}_${academicYear.replace('/', '-')}.xlsx`);
}


