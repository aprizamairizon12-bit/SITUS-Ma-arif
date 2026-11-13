import React, { useState, useEffect } from 'react';
import { BarChart3, Printer, Download, Users, Mail, CreditCard, Archive, Layers } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { KopSuratView } from '../common/KopSuratView';
import { useSettings } from '../../context/SettingsContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import * as XLSX from 'xlsx';

export const AdministrativeReports: React.FC = () => {
  const { settings } = useSettings();
  const { activeYearName, activeSemester, academicYearNames } = useAcademicYear();
  const [selectedYear, setSelectedYear] = useState<string>(activeYearName);

  const [students, setStudents] = useState<any[]>([]);
  const [rombels, setRombels] = useState<any[]>([]);
  const [rombelMembers, setRombelMembers] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (activeYearName) setSelectedYear(activeYearName);
  }, [activeYearName]);

  useEffect(() => {
    const unsubS = onSnapshot(collection(db, 'students'), (snap) => setStudents(snap.docs.map(d => d.data())));
    const unsubR = onSnapshot(collection(db, 'rombels'), (snap) => setRombels(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubRM = onSnapshot(collection(db, 'rombel_members'), (snap) => setRombelMembers(snap.docs.map(d => d.data())));
    const unsubT = onSnapshot(collection(db, 'teachers'), (snap) => setTeachers(snap.docs.map(d => d.data())));
    const unsubSt = onSnapshot(collection(db, 'staff'), (snap) => setStaffList(snap.docs.map(d => d.data())));
    const unsubIn = onSnapshot(collection(db, 'incomingLetters'), (snap) => setIncoming(snap.docs.map(d => d.data())));
    const unsubOut = onSnapshot(collection(db, 'outgoingLetters'), (snap) => setOutgoing(snap.docs.map(d => d.data())));
    const unsubInv = onSnapshot(collection(db, 'studentInvoices'), (snap) => setInvoices(snap.docs.map(d => d.data())));

    return () => {
      unsubS(); unsubR(); unsubRM(); unsubT(); unsubSt(); unsubIn(); unsubOut(); unsubInv();
    };
  }, []);

  // Historical rombel members for selectedYear if available, else fallback to active students
  const yearRombelMembers = rombelMembers.filter((m) => m.academicYear === selectedYear);
  const yearRombels = rombels.filter((r) => r.academicYear === selectedYear);

  const filteredIncoming = incoming.filter((i) => !i.academicYear || i.academicYear === selectedYear);
  const filteredOutgoing = outgoing.filter((o) => !o.academicYear || o.academicYear === selectedYear);
  const filteredInvoices = invoices.filter((inv) => !inv.academicYear || inv.academicYear === selectedYear);

  // Compute breakdown by class (use historical rombel_members if recorded for selectedYear, else master students when viewing activeYear)
  const classBreakdown = (() => {
    if (yearRombelMembers.length > 0) {
      return yearRombelMembers.reduce((acc: Record<string, { total: number; L: number; P: number }>, m) => {
        const cls = m.rombelName || 'Tanpa Rombel';
        if (!acc[cls]) acc[cls] = { total: 0, L: 0, P: 0 };
        acc[cls].total += 1;
        if (m.gender === 'P') acc[cls].P += 1;
        else acc[cls].L += 1;
        return acc;
      }, {});
    }
    if (yearRombels.length > 0 && selectedYear !== activeYearName) {
      return yearRombels.reduce((acc: Record<string, { total: number; L: number; P: number }>, r) => {
        acc[r.name] = { total: r.studentCount || 0, L: r.maleCount || 0, P: r.femaleCount || 0 };
        return acc;
      }, {});
    }
    return students
      .filter((s) => s.status === 'Aktif')
      .reduce((acc: Record<string, { total: number; L: number; P: number }>, s) => {
        const cls = s.className || 'Tanpa Kelas';
        if (!acc[cls]) acc[cls] = { total: 0, L: 0, P: 0 };
        acc[cls].total += 1;
        if (s.gender === 'P') acc[cls].P += 1;
        else acc[cls].L += 1;
        return acc;
      }, {});
  })();

  const totalMale = Object.values(classBreakdown).reduce((acc, c) => acc + c.L, 0);
  const totalFemale = Object.values(classBreakdown).reduce((acc, c) => acc + c.P, 0);
  const totalStudentsInReport = totalMale + totalFemale;

  const exportSummaryExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Siswa per Kelas
    const classData = Object.entries(classBreakdown).map(([cls, stat], idx) => ({
      No: idx + 1,
      'Kelas / Rombel': cls,
      'Laki-Laki': stat.L,
      Perempuan: stat.P,
      'Total Siswa': stat.total,
    }));
    const ws1 = XLSX.utils.json_to_sheet(classData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Siswa');

    // Sheet 2: Rekap Surat
    const lettersData = [
      { Jenis: 'Surat Masuk', Total: incoming.length },
      { Jenis: 'Surat Keluar', Total: outgoing.length },
      { Jenis: 'Surat Tagihan Siswa', Total: invoices.length },
    ];
    const ws2 = XLSX.utils.json_to_sheet(lettersData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Rekap Surat');

    XLSX.writeFile(wb, `Laporan_Statistik_TU_SMA_Maarif_05_${new Date().getFullYear()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Laporan Statistik & Rekapitulasi Administrasi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan data berkala kesiswaan, kepegawaian, surat masuk, dan surat keluar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
          >
            {academicYearNames.map((yr) => (
              <option key={yr} value={yr}>
                TA {yr}
              </option>
            ))}
          </select>
          <button
            onClick={exportSummaryExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="printable-area bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs">
        <KopSuratView />

        <div className="text-center my-6">
          <h2 className="text-base font-extrabold uppercase tracking-wide underline">
            LAPORAN BULANAN REKAPITULASI ADMINISTRASI TATA USAHA
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            SMAS MA&apos;ARIF 05 PADANG RATU • TAHUN PELAJARAN {selectedYear} ({activeSemester})
          </p>
        </div>

        {/* Section 1: Kesiswaan */}
        <div className="space-y-3 mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-1 border-b border-slate-300">
            A. Rekapitulasi Keadaan Peserta Didik Berdasarkan Kelas
          </h3>
          <table className="w-full border-collapse border border-slate-900 text-xs text-center">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                <th className="border border-slate-900 p-2 w-10">No</th>
                <th className="border border-slate-900 p-2 text-left">Tingkat / Kelas / Rombel</th>
                <th className="border border-slate-900 p-2 w-24">Laki-Laki</th>
                <th className="border border-slate-900 p-2 w-24">Perempuan</th>
                <th className="border border-slate-900 p-2 w-28">Jumlah Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(classBreakdown).map(([cls, stat], idx) => (
                <tr key={cls} className="border-b border-slate-900">
                  <td className="border border-slate-900 p-2">{idx + 1}</td>
                  <td className="border border-slate-900 p-2 text-left font-bold">{cls}</td>
                  <td className="border border-slate-900 p-2">{stat.L}</td>
                  <td className="border border-slate-900 p-2">{stat.P}</td>
                  <td className="border border-slate-900 p-2 font-bold">{stat.total}</td>
                </tr>
              ))}
              <tr className="font-extrabold bg-slate-100 dark:bg-slate-800">
                <td colSpan={2} className="border border-slate-900 p-2 text-center">JUMLAH KESELURUHAN</td>
                <td className="border border-slate-900 p-2">{totalMale}</td>
                <td className="border border-slate-900 p-2">{totalFemale}</td>
                <td className="border border-slate-900 p-2">{totalStudentsInReport} Siswa</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Kepegawaian & Persuratan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
          <div>
            <h3 className="font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-1 border-b border-slate-300 mb-3">
              B. Rekapitulasi Sumber Daya Pendidik & Staf
            </h3>
            <table className="w-full border-collapse border border-slate-900 text-center">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="border border-slate-900 p-2 text-left">Jumlah Guru / Pendidik</td>
                  <td className="border border-slate-900 p-2 font-bold">{teachers.length} Orang</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="border border-slate-900 p-2 text-left">Jumlah Tenaga Kependidikan / TU</td>
                  <td className="border border-slate-900 p-2 font-bold">{staffList.length} Orang</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="border border-slate-900 p-2 text-left">Total Sumber Daya Manusia</td>
                  <td className="border border-slate-900 p-2">{teachers.length + staffList.length} Orang</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-bold uppercase tracking-wider text-slate-900 dark:text-white pb-1 border-b border-slate-300 mb-3">
              C. Rekapitulasi Lalu Lintas Dokumen & Persuratan
            </h3>
            <table className="w-full border-collapse border border-slate-900 text-center">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="border border-slate-900 p-2 text-left">Total Surat Masuk Tercatat</td>
                  <td className="border border-slate-900 p-2 font-bold">{filteredIncoming.length} Berkas</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="border border-slate-900 p-2 text-left">Total Surat Keluar Diterbitkan</td>
                  <td className="border border-slate-900 p-2 font-bold">{filteredOutgoing.length} Berkas</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="border border-slate-900 p-2 text-left">Total Surat Tagihan Siswa</td>
                  <td className="border border-slate-900 p-2 font-bold">{filteredInvoices.length} Lembar</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tanda Tangan Pengesahan */}
        <div className="mt-12 flex justify-between text-xs px-4">
          <div className="text-center w-56 space-y-1">
            <p className="invisible">Space</p>
            <p>Mengetahui,<br />Kepala Tata Usaha,</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{settings.tuHeadName}</p>
            <p>NIP. {settings.tuHeadNip}</p>
          </div>

          <div className="text-center w-64 space-y-1">
            <p>Padang Ratu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p>Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'},</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{settings.headmasterName}</p>
            <p>NIP. {settings.headmasterNip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
