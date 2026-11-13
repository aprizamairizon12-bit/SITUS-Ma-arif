import React from 'react';
import { Student, Teacher, SchoolSetting } from '../../types';

export interface TemplateFieldDef {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'number';
  placeholder?: string;
  defaultValue?: string;
}

export interface LetterTemplateDef {
  key: string;
  label: string;
  title: string;
  target: 'student' | 'teacher' | 'general';
  category: string;
  defaultFields: Record<string, string>;
  fields: TemplateFieldDef[];
  renderPreview: (props: {
    student?: Student;
    teacher?: Teacher;
    settings: SchoolSetting;
    extra: Record<string, string>;
    letterNumber: string;
    letterDate: string;
  }) => React.ReactNode;
  getDocxText: (props: {
    student?: Student;
    teacher?: Teacher;
    settings: SchoolSetting;
    extra: Record<string, string>;
    letterNumber: string;
    letterDate: string;
  }) => string;
}

export const LETTER_TEMPLATES: LetterTemplateDef[] = [
  // 1. SURAT KETERANGAN AKTIF SEKOLAH
  {
    key: 'ket_aktif',
    label: 'Surat Keterangan Aktif Sekolah',
    title: 'SURAT KETERANGAN AKTIF SEKOLAH',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      keperluan: 'Kelengkapan administrasi pengajuan beasiswa pendidikan',
    },
    fields: [
      { key: 'keperluan', label: 'Keperluan Surat Keterangan', type: 'text', placeholder: 'Contoh: Persyaratan pembuatan rekening bank / beasiswa' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kecamatan Padang Ratu, Kabupaten Lampung Tengah, menerangkan dengan sebenarnya bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Lengkap</td><td className="w-4">:</td><td className="font-bold">{student?.name || '-'}</td></tr>
            <tr><td className="py-1">Nomor Induk Siswa (NIS)</td><td>:</td><td className="font-mono">{student?.nis || '-'}</td></tr>
            <tr><td className="py-1">NISN</td><td>:</td><td className="font-mono">{student?.nisn || '-'}</td></tr>
            <tr><td className="py-1">Jenis Kelamin</td><td>:</td><td>{student?.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</td></tr>
            <tr><td className="py-1">Tempat, Tanggal Lahir</td><td>:</td><td>{student?.birthPlace}, {student?.birthDate}</td></tr>
            <tr><td className="py-1">Kelas / Rombel</td><td>:</td><td className="font-bold">{student?.className || '-'}</td></tr>
            <tr><td className="py-1">Nama Orang Tua / Wali</td><td>:</td><td>{student?.fatherName || student?.motherName || '-'}</td></tr>
            <tr><td className="py-1">Alamat Peserta Didik</td><td>:</td><td>{student?.address || '-'}</td></tr>
          </tbody>
        </table>
        <p>
          Adalah benar-benar peserta didik yang terdaftar dan aktif mengikuti kegiatan pembelajaran pada {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} Tahun Pelajaran {settings.academicYear}.
        </p>
        <p>
          Surat keterangan ini diberikan kepada yang bersangkutan atas permohonannya untuk dipergunakan sebagai: <strong>{extra.keperluan || 'Kelengkapan administrasi'}</strong>.
        </p>
        <p>
          Demikian surat keterangan aktif ini dibuat dengan sebenarnya dan penuh rasa tanggung jawab agar dapat dipergunakan sebagaimana mestinya.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Yang bertanda tangan di bawah ini Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kecamatan Padang Ratu, Kabupaten Lampung Tengah, menerangkan dengan sebenarnya bahwa:
Nama Lengkap: ${student?.name || '-'}
NIS / NISN: ${student?.nis || '-'} / ${student?.nisn || '-'}
Jenis Kelamin: ${student?.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
Tempat, Tanggal Lahir: ${student?.birthPlace}, ${student?.birthDate}
Kelas / Rombel: ${student?.className}
Nama Orang Tua / Wali: ${student?.fatherName || student?.motherName}
Alamat: ${student?.address}

Adalah benar-benar peserta didik yang terdaftar dan aktif mengikuti kegiatan pembelajaran pada ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} Tahun Pelajaran ${settings.academicYear}.
Surat keterangan ini diberikan kepada yang bersangkutan untuk keperluan: ${extra.keperluan || 'Kelengkapan administrasi'}.

Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.`
  },

  // 2. SURAT KETERANGAN KELAKUAN BAIK
  {
    key: 'ket_kelakuan_baik',
    label: 'Surat Keterangan Kelakuan Baik',
    title: 'SURAT KETERANGAN KELAKUAN BAIK',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      keperluan: 'Pendaftaran Seleksi Calon Anggota Kepolisian RI (Polri) / TNI / Perguruan Tinggi',
      catatanDisiplin: 'Selama menempuh pendidikan senantiasa menunjukkan akhlak terpuji, mematuhi seluruh tata tertib sekolah, tidak pernah terlibat tindak kriminal, tawuran antar pelajar, miras, maupun penyalahgunaan narkotika.',
    },
    fields: [
      { key: 'keperluan', label: 'Tujuan Penggunaan', placeholder: 'Contoh: Persyaratan Seleksi TNI-POLRI / SNBP PTN' },
      { key: 'catatanDisiplin', label: 'Catatan Kedisiplinan & Perilaku', type: 'textarea' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kabupaten Lampung Tengah, menerangkan bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Lengkap</td><td className="w-4">:</td><td className="font-bold">{student?.name || '-'}</td></tr>
            <tr><td className="py-1">NIS / NISN</td><td>:</td><td className="font-mono">{student?.nis} / {student?.nisn}</td></tr>
            <tr><td className="py-1">Tempat, Tanggal Lahir</td><td>:</td><td>{student?.birthPlace}, {student?.birthDate}</td></tr>
            <tr><td className="py-1">Jenis Kelamin</td><td>:</td><td>{student?.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</td></tr>
            <tr><td className="py-1">Agama</td><td>:</td><td>{student?.religion || 'Islam'}</td></tr>
            <tr><td className="py-1">Kelas</td><td>:</td><td className="font-bold">{student?.className}</td></tr>
            <tr><td className="py-1">Alamat</td><td>:</td><td>{student?.address}</td></tr>
          </tbody>
        </table>
        <p>
          Berdasarkan data catatan BK dan ketertiban sekolah, menerangkan bahwa siswa yang bersangkutan:
        </p>
        <div className="p-3 bg-slate-50 border border-slate-300 rounded font-serif italic text-slate-800">
          "{extra.catatanDisiplin || 'Selama menjadi peserta didik pada sekolah kami, yang bersangkutan senantiasa berkelakuan baik, patuh terhadap tata tertib sekolah, serta tidak pernah melakukan pelanggaran hukum atau tindak pidana.'}"
        </div>
        <p>
          Surat keterangan kelakuan baik ini diterbitkan untuk dipergunakan sebagai: <strong>{extra.keperluan || 'Persyaratan administrasi'}</strong>.
        </p>
        <p>
          Demikian surat keterangan ini diberikan agar dapat dipergunakan dengan penuh rasa tanggung jawab.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Yang bertanda tangan di bawah ini Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kabupaten Lampung Tengah, menerangkan bahwa:
Nama Lengkap: ${student?.name}
NIS / NISN: ${student?.nis} / ${student?.nisn}
Tempat, Tanggal Lahir: ${student?.birthPlace}, ${student?.birthDate}
Jenis Kelamin: ${student?.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
Kelas: ${student?.className}
Alamat: ${student?.address}

Berdasarkan catatan buku bimbingan konseling dan ketertiban sekolah, yang bersangkutan selama belajar pada lembaga kami senantiasa berkelakuan baik, mematuhi tata tertib sekolah, dan tidak pernah terlibat tindak pidana.
Catatan: ${extra.catatanDisiplin}
Keperluan: ${extra.keperluan}

Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.`
  },

  // 3. SURAT KETERANGAN LULUS (SKL)
  {
    key: 'ket_lulus',
    label: 'Surat Keterangan Lulus (SKL)',
    title: 'SURAT KETERANGAN LULUS',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      nomorIjazah: 'DN-12/M-SMA/K-13/2025/001452',
      nilaiRataRata: '86.75',
      programKeahlian: 'Peminatan Matematika dan Ilmu Pengetahuan Alam (MIPA)',
      tanggalRapat: new Date().toISOString().split('T')[0],
    },
    fields: [
      { key: 'nilaiRataRata', label: 'Nilai Rata-rata Ijazah / Ujian Sekolah', placeholder: '86.75' },
      { key: 'nomorIjazah', label: 'Nomor Seri Ijazah (Jika ada)' },
      { key: 'programKeahlian', label: 'Peminatan / Program Studi' },
      { key: 'tanggalRapat', label: 'Tanggal Rapat Pleno Kelulusan', type: 'date' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kabupaten Lampung Tengah, berdasarkan kriteria kelulusan peserta didik dan hasil Rapat Pleno Dewan Guru tanggal {extra.tanggalRapat || 'Mei 2025'}, dengan ini menerangkan bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Lengkap</td><td className="w-4">:</td><td className="font-bold">{student?.name}</td></tr>
            <tr><td className="py-1">Nomor Induk Siswa (NIS)</td><td>:</td><td className="font-mono">{student?.nis}</td></tr>
            <tr><td className="py-1">NISN</td><td>:</td><td className="font-mono">{student?.nisn}</td></tr>
            <tr><td className="py-1">Tempat, Tanggal Lahir</td><td>:</td><td>{student?.birthPlace}, {student?.birthDate}</td></tr>
            <tr><td className="py-1">Program / Peminatan</td><td>:</td><td>{extra.programKeahlian || student?.className}</td></tr>
            <tr><td className="py-1">Nilai Rata-Rata Ujian</td><td>:</td><td className="font-bold font-mono">{extra.nilaiRataRata || '85.50'}</td></tr>
          </tbody>
        </table>
        <div className="p-3 my-4 bg-slate-100 text-center font-bold text-base border-2 border-black uppercase tracking-widest">
          DINYATAKAN LULUS
        </div>
        <p>
          Dari satuan pendidikan {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} Tahun Pelajaran {settings.academicYear}.
        </p>
        <p>
          Surat Keterangan ini bersifat resmi dan berlaku sebagai pengganti Ijazah sementara sampai dengan diterbitkannya blangko Ijazah asli dari Kementerian Pendidikan Dasar dan Menengah RI.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} menerangkan bahwa berdasarkan kriteria kelulusan dan hasil rapat pleno dewan guru:
Nama Lengkap: ${student?.name}
NIS / NISN: ${student?.nis} / ${student?.nisn}
Tempat, Tanggal Lahir: ${student?.birthPlace}, ${student?.birthDate}
Peminatan: ${extra.programKeahlian || student?.className}
Nilai Rata-rata: ${extra.nilaiRataRata}

DINYATAKAN LULUS
Dari satuan pendidikan ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} Tahun Pelajaran ${settings.academicYear}.
Surat keterangan ini sah dipergunakan sebagai pengganti sementara ijazah asli.`
  },

  // 4. SURAT KETERANGAN PINDAH SEKOLAH
  {
    key: 'ket_pindah',
    label: 'Surat Keterangan Pindah Sekolah',
    title: 'SURAT KETERANGAN PINDAH SEKOLAH',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      sekolahTujuan: 'SMA Negeri 1 Pringsewu',
      kabupatenTujuan: 'Kabupaten Pringsewu, Provinsi Lampung',
      alasanPindah: 'Mengikuti kepindahan tugas kedinasan dan domisili orang tua',
      kelasLanjutan: 'XI (Sebelas) Fase F',
    },
    fields: [
      { key: 'sekolahTujuan', label: 'Nama Sekolah Tujuan Mutasi' },
      { key: 'kabupatenTujuan', label: 'Kabupaten / Kota Sekolah Tujuan' },
      { key: 'alasanPindah', label: 'Alasan Kepindahan / Mutasi' },
      { key: 'kelasLanjutan', label: 'Tingkat Kelas Lanjutan' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kabupaten Lampung Tengah, menerangkan bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Peserta Didik</td><td className="w-4">:</td><td className="font-bold">{student?.name}</td></tr>
            <tr><td className="py-1">NIS / NISN</td><td>:</td><td className="font-mono">{student?.nis} / {student?.nisn}</td></tr>
            <tr><td className="py-1">Tingkat / Kelas</td><td>:</td><td>{student?.className}</td></tr>
            <tr><td className="py-1">Jenis Kelamin</td><td>:</td><td>{student?.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}</td></tr>
            <tr><td className="py-1">Nama Orang Tua / Wali</td><td>:</td><td>{student?.fatherName || student?.motherName}</td></tr>
          </tbody>
        </table>
        <p>
          Sesuai dengan surat permohonan pindah sekolah dari orang tua/wali murid tanggal yang bersangkutan, dengan ini memberikan persetujuan pindah ke:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Sekolah Tujuan</td><td className="w-4">:</td><td className="font-bold">{extra.sekolahTujuan}</td></tr>
            <tr><td className="py-1">Kabupaten / Kota</td><td>:</td><td>{extra.kabupatenTujuan}</td></tr>
            <tr><td className="py-1">Diterima di Tingkat Kelas</td><td>:</td><td>{extra.kelasLanjutan}</td></tr>
            <tr><td className="py-1">Alasan Pindah</td><td>:</td><td>{extra.alasanPindah}</td></tr>
          </tbody>
        </table>
        <p>
          Bersama surat ini disertakan Buku Rapor dan Surat Permohonan Mutasi. Yang bersangkutan tidak lagi memiliki tanggungan pinjaman buku perpustakaan maupun keuangan sekolah.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Yang bertanda tangan di bawah ini Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} menerangkan bahwa:
Nama: ${student?.name}
NIS / NISN: ${student?.nis} / ${student?.nisn}
Kelas: ${student?.className}

Memberikan persetujuan pindah sekolah kepada yang bersangkutan menuju:
Sekolah Tujuan: ${extra.sekolahTujuan}
Daerah Tujuan: ${extra.kabupatenTujuan}
Alasan Kepindahan: ${extra.alasanPindah}

Demikian surat keterangan pindah ini dibuat agar dapat dipergunakan sebagaimana mestinya.`
  },

  // 5. SURAT KETERANGAN PENGHASILAN ORANG TUA
  {
    key: 'ket_penghasilan',
    label: 'Surat Keterangan Penghasilan Ortu',
    title: 'SURAT KETERANGAN PENGHASILAN ORANG TUA',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      penghasilanOrtu: 'Rp 1.850.000,-',
      penghasilanTerbilang: 'Satu Juta Delapan Ratus Lima Puluh Ribu Rupiah',
      tanggunganAnak: '3 (Tiga) Orang',
      keperluan: 'Kelengkapan Berkas Pengajuan Program KIP Kuliah / Beasiswa Mahasiswa Baru',
    },
    fields: [
      { key: 'penghasilanOrtu', label: 'Rata-rata Penghasilan per Bulan', placeholder: 'Rp 1.850.000,-' },
      { key: 'penghasilanTerbilang', label: 'Nominal Terbilang' },
      { key: 'tanggunganAnak', label: 'Jumlah Tanggungan Keluarga' },
      { key: 'keperluan', label: 'Keperluan Surat' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kabupaten Lampung Tengah, menerangkan bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Orang Tua / Wali</td><td className="w-4">:</td><td className="font-bold">{student?.fatherName || student?.motherName || 'Kuswanto'}</td></tr>
            <tr><td className="py-1">Pekerjaan</td><td>:</td><td>{student?.parentJob || 'Petani / Wiraswasta'}</td></tr>
            <tr><td className="py-1">Alamat Orang Tua</td><td>:</td><td>{student?.parentAddress || student?.address}</td></tr>
            <tr><td className="py-1">Orang Tua dari Siswa</td><td>:</td><td className="font-bold">{student?.name} (NISN: {student?.nisn})</td></tr>
            <tr><td className="py-1">Kelas</td><td>:</td><td>{student?.className}</td></tr>
          </tbody>
        </table>
        <p>
          Berdasarkan data formulir biodata pendaftaran dan surat pernyataan orang tua yang bersangkutan, menerangkan bahwa rata-rata penghasilan orang tua siswa per bulan adalah:
        </p>
        <div className="p-3 bg-slate-50 border border-slate-300 rounded font-semibold text-center text-sm">
          {extra.penghasilanOrtu} <em>({extra.penghasilanTerbilang})</em>
        </div>
        <p>
          Dengan jumlah tanggungan keluarga sebanyak <strong>{extra.tanggunganAnak}</strong> anak.
        </p>
        <p>
          Surat keterangan ini dibuat sebagai: <strong>{extra.keperluan}</strong>.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Yang bertanda tangan di bawah ini Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} menerangkan bahwa orang tua dari siswa:
Nama Siswa: ${student?.name} (NISN: ${student?.nisn})
Nama Orang Tua: ${student?.fatherName || student?.motherName}
Pekerjaan: ${student?.parentJob}
Alamat: ${student?.address}

Memiliki rata-rata penghasilan per bulan sebesar: ${extra.penghasilanOrtu} (${extra.penghasilanTerbilang}) dengan jumlah tanggungan ${extra.tanggunganAnak}.
Keperluan: ${extra.keperluan}.

Demikian surat keterangan penghasilan ini dibuat dengan sebenarnya.`
  },

  // 6. SURAT KETERANGAN TIDAK MAMPU (SKTM)
  {
    key: 'ket_tidak_mampu',
    label: 'Surat Rekomendasi Tidak Mampu (SKTM)',
    title: 'SURAT KETERANGAN REKOMENDASI TIDAK MAMPU',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      nomorSktmDesa: '400/018/DS-SR/I/2025',
      keperluan: 'Pengajuan Keringanan Biaya Pendidikan / Permohonan Bantuan KIP & PIP',
      keteranganEkonomi: 'Berasal dari keluarga ekonomi prasejahtera yang berpenghasilan tidak menentu dan layak mendapatkan pertimbangan bantuan biaya pendidikan.',
    },
    fields: [
      { key: 'nomorSktmDesa', label: 'Nomor SKTM dari Desa / Kelurahan' },
      { key: 'keperluan', label: 'Keperluan Rekomendasi' },
      { key: 'keteranganEkonomi', label: 'Uraian Kondisi Ekonomi', type: 'textarea' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, berdasarkan Surat Keterangan Tidak Mampu dari Kepala Kampung Nomor: {extra.nomorSktmDesa}, menerangkan bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Siswa</td><td className="w-4">:</td><td className="font-bold">{student?.name}</td></tr>
            <tr><td className="py-1">NISN / NIS</td><td>:</td><td className="font-mono">{student?.nisn} / {student?.nis}</td></tr>
            <tr><td className="py-1">Kelas</td><td>:</td><td>{student?.className}</td></tr>
            <tr><td className="py-1">Nama Orang Tua</td><td>:</td><td>{student?.fatherName || student?.motherName}</td></tr>
            <tr><td className="py-1">Pekerjaan Orang Tua</td><td>:</td><td>{student?.parentJob || 'Buruh / Petani'}</td></tr>
            <tr><td className="py-1">Alamat</td><td>:</td><td>{student?.address}</td></tr>
          </tbody>
        </table>
        <p>
          Adalah benar peserta didik aktif pada {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} yang {extra.keteranganEkonomi}.
        </p>
        <p>
          Oleh karena itu, pihak sekolah merekomendasikan yang bersangkutan untuk mendapatkan: <strong>{extra.keperluan}</strong>.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} menerangkan bahwa:
Nama Siswa: ${student?.name}
NISN: ${student?.nisn}
Kelas: ${student?.className}
Orang Tua: ${student?.fatherName || student?.motherName}

Adalah benar peserta didik dari keluarga kurang mampu ekonomi. Surat ini dibuat untuk keperluan: ${extra.keperluan}.`
  },

  // 7. SURAT KETERANGAN PERNAH SEKOLAH
  {
    key: 'ket_pernah_sekolah',
    label: 'Surat Keterangan Pernah Sekolah',
    title: 'SURAT KETERANGAN PERNAH BELAJAR',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      tahunMasuk: '2022',
      tahunBerhenti: '2024',
      kelasTerakhir: 'XI (Sebelas) MIPA',
      alasanBerhenti: 'Mengikuti mutasi domisili orang tua ke luar kabupaten',
    },
    fields: [
      { key: 'tahunMasuk', label: 'Tahun Masuk' },
      { key: 'tahunBerhenti', label: 'Tahun Terakhir / Berhenti' },
      { key: 'kelasTerakhir', label: 'Kelas Terakhir yang Ditempuh' },
      { key: 'alasanBerhenti', label: 'Keterangan Berhenti / Mutasi' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, menerangkan bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Lengkap</td><td className="w-4">:</td><td className="font-bold">{student?.name}</td></tr>
            <tr><td className="py-1">NIS / NISN</td><td>:</td><td className="font-mono">{student?.nis} / {student?.nisn}</td></tr>
            <tr><td className="py-1">Tempat, Tanggal Lahir</td><td>:</td><td>{student?.birthPlace}, {student?.birthDate}</td></tr>
            <tr><td className="py-1">Nama Orang Tua</td><td>:</td><td>{student?.fatherName || student?.motherName}</td></tr>
          </tbody>
        </table>
        <p>
          Menerangkan bahwa peserta didik tersebut di atas pernah terdaftar dan menempuh pendidikan pada {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} dari tahun {extra.tahunMasuk} sampai dengan tahun {extra.tahunBerhenti}, dengan kelas terakhir <strong>{extra.kelasTerakhir}</strong>.
        </p>
        <p>
          Alasan berhenti: <em>{extra.alasanBerhenti}</em>.
        </p>
        <p>
          Demikian surat keterangan pernah sekolah ini dibuat untuk dipergunakan sebagaimana mestinya.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} menerangkan bahwa:
Nama: ${student?.name}
NIS/NISN: ${student?.nis}/${student?.nisn}
Pernah belajar pada sekolah kami tahun ${extra.tahunMasuk} s.d. ${extra.tahunBerhenti} kelas terakhir ${extra.kelasTerakhir}.
Alasan: ${extra.alasanBerhenti}.`
  },

  // 8. SURAT KETERANGAN KEHILANGAN DOKUMEN
  {
    key: 'ket_kehilangan',
    label: 'Surat Keterangan Kehilangan Dokumen',
    title: 'SURAT KETERANGAN KEHILANGAN DOKUMEN SEKOLAH',
    target: 'student',
    category: '1. SURAT KETERANGAN',
    defaultFields: {
      namaDokumenHilang: 'Buku Rapor Asli Siswa Semester 1 s.d. Semester 4',
      nomorLaporanPolisi: 'LP/B/18/I/2025/SPKT/Polsek Padang Ratu',
      tanggalKehilangan: '12 Januari 2025',
    },
    fields: [
      { key: 'namaDokumenHilang', label: 'Nama Dokumen yang Hilang' },
      { key: 'nomorLaporanPolisi', label: 'Nomor Surat Laporan Kepolisian' },
      { key: 'tanggalKehilangan', label: 'Perkiraan Tanggal Kehilangan' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, berdasarkan Surat Tanda Penerimaan Laporan Kehilangan dari Kepolisian Sektor Padang Ratu Nomor: <strong>{extra.nomorLaporanPolisi}</strong>, menerangkan bahwa:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Pemegang Dokumen</td><td className="w-4">:</td><td className="font-bold">{student?.name}</td></tr>
            <tr><td className="py-1">NIS / NISN</td><td>:</td><td className="font-mono">{student?.nis} / {student?.nisn}</td></tr>
            <tr><td className="py-1">Kelas</td><td>:</td><td>{student?.className}</td></tr>
            <tr><td className="py-1">Alamat</td><td>:</td><td>{student?.address}</td></tr>
          </tbody>
        </table>
        <p>
          Telah melaporkan kehilangan dokumen resmi sekolah berupa: <strong>{extra.namaDokumenHilang}</strong> yang diperkirakan hilang pada tanggal {extra.tanggalKehilangan}.
        </p>
        <p>
          Berdasarkan verifikasi pada buku induk register dan arsip tata usaha sekolah, dokumen tersebut di atas benar-benar pernah diterbitkan secara sah oleh {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}.
        </p>
        <p>
          Surat keterangan ini diberikan sebagai bukti pengganti laporan untuk penerbitan dokumen duplikat / legalisir arsip sekolah.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} menerangkan bahwa:
Nama: ${student?.name}
NIS/NISN: ${student?.nis}/${student?.nisn}
Telah melaporkan kehilangan dokumen: ${extra.namaDokumenHilang} berdasarkan nomor laporan kepolisian ${extra.nomorLaporanPolisi}.
Dokumen tersebut sah tercatat pada arsip sekolah.`
  },

  // 9. SURAT TUGAS
  {
    key: 'surat_tugas',
    label: 'Surat Tugas (ST)',
    title: 'SURAT TUGAS',
    target: 'teacher',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      tujuanTugas: 'Mengikuti Bimbingan Teknis Implementasi Kurikulum Merdeka dan Pemanfaatan Platform Merdeka Mengajar (PMM)',
      tempatTugas: 'Balai Penjaminan Mutu Pendidikan (BPMP) Provinsi Lampung, Jl. Gatot Subroto No. 44, Bandar Lampung',
      tanggalMulai: new Date().toISOString().split('T')[0],
      tanggalSelesai: new Date().toISOString().split('T')[0],
    },
    fields: [
      { key: 'tujuanTugas', label: 'Tujuan / Uraian Penugasan', type: 'textarea' },
      { key: 'tempatTugas', label: 'Tempat / Lokasi Pelaksanaan Tugas' },
      { key: 'tanggalMulai', label: 'Tanggal Mulai', type: 'date' },
      { key: 'tanggalSelesai', label: 'Tanggal Selesai', type: 'date' },
    ],
    renderPreview: ({ teacher, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, dengan ini memberikan tugas kedinasan kepada:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Pegawai / Guru</td><td className="w-4">:</td><td className="font-bold">{teacher?.name}</td></tr>
            <tr><td className="py-1">NIP / NUPTK</td><td>:</td><td className="font-mono">{teacher?.nip || '-'} / {teacher?.nuptk || '-'}</td></tr>
            <tr><td className="py-1">Jabatan</td><td>:</td><td>{teacher?.position}</td></tr>
            <tr><td className="py-1">Mata Pelajaran</td><td>:</td><td>{teacher?.subject}</td></tr>
          </tbody>
        </table>
        <p>Untuk melaksanakan penugasan sebagai berikut:</p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Uraian Tugas</td><td className="w-4">:</td><td className="font-bold">{extra.tujuanTugas}</td></tr>
            <tr><td className="py-1">Tempat Pelaksanaan</td><td>:</td><td>{extra.tempatTugas}</td></tr>
            <tr><td className="py-1">Waktu Pelaksanaan</td><td>:</td><td>{extra.tanggalMulai} s.d. {extra.tanggalSelesai}</td></tr>
          </tbody>
        </table>
        <p>
          Demikian surat tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh rasa tanggung jawab serta melaporkan hasil pelaksanaannya kepada Kepala Sekolah setelah selesai.
        </p>
      </div>
    ),
    getDocxText: ({ teacher, settings, extra }) => `Kepala ${settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} menugaskan kepada:
Nama: ${teacher?.name}
NIP/NUPTK: ${teacher?.nip}/${teacher?.nuptk}
Jabatan: ${teacher?.position}
Tugas: ${extra.tujuanTugas}
Tempat: ${extra.tempatTugas}
Waktu: ${extra.tanggalMulai} s.d. ${extra.tanggalSelesai}.`
  },

  // 10. SURAT PERINTAH TUGAS (SPT)
  {
    key: 'spt',
    label: 'Surat Perintah Tugas (SPT)',
    title: 'SURAT PERINTAH TUGAS',
    target: 'teacher',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      dasarHukum: 'Surat Edaran Kepala Dinas Pendidikan Provinsi Lampung Nomor 420/890/V.01/2025 Perihal Pendampingan Akreditasi Satuan Pendidikan',
      tujuanTugas: 'Menjadi Pendamping Teknis Pelaksanaan Visitasi Akreditasi Sekolah',
      tempatTugas: 'Kampus SMAS Ma\'arif 05 Padang Ratu',
      tanggalMulai: new Date().toISOString().split('T')[0],
      tanggalSelesai: new Date().toISOString().split('T')[0],
    },
    fields: [
      { key: 'dasarHukum', label: 'Dasar Surat / Regulasi', type: 'textarea' },
      { key: 'tujuanTugas', label: 'Perintah Pelaksanaan Tugas' },
      { key: 'tempatTugas', label: 'Lokasi Tugas' },
      { key: 'tanggalMulai', label: 'Tanggal Mulai', type: 'date' },
      { key: 'tanggalSelesai', label: 'Tanggal Selesai', type: 'date' },
    ],
    renderPreview: ({ teacher, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          <strong>DASAR:</strong> {extra.dasarHukum}
        </p>
        <p className="text-center font-bold tracking-wider my-2">MEMERINTAHKAN:</p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Pegawai</td><td className="w-4">:</td><td className="font-bold">{teacher?.name}</td></tr>
            <tr><td className="py-1">NIP / NIK</td><td>:</td><td className="font-mono">{teacher?.nip || '-'} / {teacher?.nik || '-'}</td></tr>
            <tr><td className="py-1">Pangkat / Golongan</td><td>:</td><td>Penata Muda Tk. I / III.b</td></tr>
            <tr><td className="py-1">Jabatan</td><td>:</td><td>{teacher?.position}</td></tr>
          </tbody>
        </table>
        <p><strong>UNTUK:</strong></p>
        <ol className="list-decimal ml-6 space-y-1">
          <li>Melaksanakan tugas kedinasan: <strong>{extra.tujuanTugas}</strong></li>
          <li>Tempat pelaksanaan di: <strong>{extra.tempatTugas}</strong></li>
          <li>Waktu pelaksanaan tugas pada tanggal: <strong>{extra.tanggalMulai} s.d. {extra.tanggalSelesai}</strong></li>
          <li>Melaporkan hasil pelaksanaan tugas secara tertulis kepada Kepala Sekolah.</li>
        </ol>
      </div>
    ),
    getDocxText: ({ teacher, settings, extra }) => `SURAT PERINTAH TUGAS
Dasar: ${extra.dasarHukum}
Memerintahkan Kepada:
Nama: ${teacher?.name}
NIP: ${teacher?.nip}
Jabatan: ${teacher?.position}
Untuk: ${extra.tujuanTugas} di ${extra.tempatTugas} tanggal ${extra.tanggalMulai} s.d. ${extra.tanggalSelesai}.`
  },

  // 11. SURAT PERINTAH PERJALANAN DINAS (SPPD)
  {
    key: 'sppd',
    label: 'Surat Perintah Perjalanan Dinas (SPPD)',
    title: 'SURAT PERINTAH PERJALANAN DINAS (SPPD)',
    target: 'teacher',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      tingkatBiaya: 'Tingkat B',
      maksudPerjalanan: 'Menghadiri Rapat Koordinasi MKKS SMA dan Sosialisasi Bantuan Operasional Sekolah (BOS) Tahun 2025',
      alatAngkut: 'Kendaraan Darat / Operasional Dinas',
      tempatBerangkat: 'SMAS Ma\'arif 05 Padang Ratu',
      tempatTujuan: 'Dinas Pendidikan Kabupaten Lampung Tengah, Gunung Sugih',
      lamaPerjalanan: '1 (Satu) Hari',
      tanggalBerangkat: new Date().toISOString().split('T')[0],
      tanggalKembali: new Date().toISOString().split('T')[0],
      bebanAnggaran: 'Dana BOSP / Komite SMAS Ma\'arif 05 Padang Ratu',
      mataAnggaran: '5.2.2.04 Belanja Perjalanan Dinas',
    },
    fields: [
      { key: 'maksudPerjalanan', label: 'Maksud Perjalanan Dinas', type: 'textarea' },
      { key: 'tempatBerangkat', label: 'Tempat Berangkat' },
      { key: 'tempatTujuan', label: 'Tempat Tujuan' },
      { key: 'lamaPerjalanan', label: 'Lama Perjalanan (Hari)' },
      { key: 'alatAngkut', label: 'Alat Angkutan yang Digunakan' },
      { key: 'bebanAnggaran', label: 'Pembebanan Anggaran' },
    ],
    renderPreview: ({ teacher, settings, extra }) => (
      <div className="text-[11px] sm:text-xs leading-relaxed space-y-3">
        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <td className="border border-black p-1.5 w-8 text-center">1.</td>
              <td className="border border-black p-1.5 w-60">Pejabat Berwenang yang Memberi Perintah</td>
              <td className="border border-black p-1.5">Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">2.</td>
              <td className="border border-black p-1.5">Nama Pegawai yang Diperintahkan</td>
              <td className="border border-black p-1.5 font-bold">{teacher?.name}</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">3.</td>
              <td className="border border-black p-1.5">
                a. Pangkat dan Golongan<br />
                b. Jabatan / Instansi<br />
                c. Tingkat Biaya Perjalanan Dinas
              </td>
              <td className="border border-black p-1.5">
                a. Penata Muda Tk. I / III.b<br />
                b. {teacher?.position} / {settings.schoolName}<br />
                c. {extra.tingkatBiaya || 'Tingkat B'}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">4.</td>
              <td className="border border-black p-1.5">Maksud Perjalanan Dinas</td>
              <td className="border border-black p-1.5 font-medium">{extra.maksudPerjalanan}</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">5.</td>
              <td className="border border-black p-1.5">Alat Angkutan yang Dipergunakan</td>
              <td className="border border-black p-1.5">{extra.alatAngkut}</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">6.</td>
              <td className="border border-black p-1.5">
                a. Tempat Berangkat<br />
                b. Tempat Tujuan
              </td>
              <td className="border border-black p-1.5">
                a. {extra.tempatBerangkat}<br />
                b. {extra.tempatTujuan}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">7.</td>
              <td className="border border-black p-1.5">
                a. Lamanya Perjalanan Dinas<br />
                b. Tanggal Berangkat<br />
                c. Tanggal Harus Kembali
              </td>
              <td className="border border-black p-1.5">
                a. {extra.lamaPerjalanan}<br />
                b. {extra.tanggalBerangkat}<br />
                c. {extra.tanggalKembali}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">8.</td>
              <td className="border border-black p-1.5">Pembebanan Anggaran</td>
              <td className="border border-black p-1.5">
                Instansi: {extra.bebanAnggaran}<br />
                Mata Anggaran: {extra.mataAnggaran}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">9.</td>
              <td className="border border-black p-1.5">Keterangan Lain-lain</td>
              <td className="border border-black p-1.5">Dilaksanakan sesuai dengan ketentuan yang berlaku</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
    getDocxText: ({ teacher, settings, extra }) => `SURAT PERINTAH PERJALANAN DINAS (SPPD)
1. Pejabat Pemberi Perintah: Kepala ${settings.schoolName}
2. Nama Pegawai: ${teacher?.name}
3. Jabatan: ${teacher?.position}
4. Maksud: ${extra.maksudPerjalanan}
5. Angkutan: ${extra.alatAngkut}
6. Berangkat: ${extra.tempatBerangkat} -> Tujuan: ${extra.tempatTujuan}
7. Lama: ${extra.lamaPerjalanan}
8. Pembebanan: ${extra.bebanAnggaran}`
  },

  // 12. SURAT UNDANGAN RESMI
  {
    key: 'undangan',
    label: 'Surat Undangan Resmi',
    title: 'SURAT UNDANGAN',
    target: 'general',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      lampiran: '-',
      perihalUndangan: 'Undangan Rapat Pleno Komite & Sosialisasi Program Sekolah Semester Genap',
      kepadaYth: 'Bapak/Ibu Orang Tua / Wali Murid Kelas X, XI, dan XII',
      hariTanggal: 'Sabtu, 25 Januari 2025',
      waktuAcara: '08.30 WIB s.d. Selesai',
      tempatAcara: 'Gedung Serbaguna SMAS Ma\'arif 05 Padang Ratu',
      agendaAcara: '1. Evaluasi Capaian Pembelajaran Siswa Semester Ganjil\n2. Sosialisasi Program Persiapan Ujian Sekolah Kelas XII\n3. Pembahasan Program Pengembangan Sarana Prasarana Sekolah',
    },
    fields: [
      { key: 'kepadaYth', label: 'Tujuan Surat (Kepada Yth)' },
      { key: 'perihalUndangan', label: 'Perihal Undangan' },
      { key: 'hariTanggal', label: 'Hari & Tanggal Acara' },
      { key: 'waktuAcara', label: 'Waktu Pelaksanaan' },
      { key: 'tempatAcara', label: 'Tempat Acara' },
      { key: 'agendaAcara', label: 'Susunan Agenda Rapat', type: 'textarea' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <div className="flex justify-between">
          <div>
            <p>Lampiran : {extra.lampiran || '-'}</p>
            <p>Perihal : <strong>{extra.perihalUndangan}</strong></p>
          </div>
          <div>
            <p>Kepada Yth.</p>
            <p className="font-bold">{extra.kepadaYth}</p>
            <p>di - Tempat</p>
          </div>
        </div>
        <p><em>Assalamu’alaikum Warahmatullahi Wabarakatuh,</em></p>
        <p>
          Puji syukur senantiasa kita panjatkan ke hadirat Allah SWT atas limpahan rahmat dan karunia-Nya. Dalam rangka meningkatkan mutu pembelajaran serta koordinasi antara pihak sekolah dengan komite dan orang tua siswa, dengan ini kami mengundang Bapak/Ibu untuk hadir pada:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-40 py-1 font-semibold">Hari / Tanggal</td><td className="w-4">:</td><td>{extra.hariTanggal}</td></tr>
            <tr><td className="py-1 font-semibold">Waktu</td><td>:</td><td>{extra.waktuAcara}</td></tr>
            <tr><td className="py-1 font-semibold">Tempat</td><td>:</td><td>{extra.tempatAcara}</td></tr>
            <tr><td className="py-1 font-semibold align-top">Agenda Rapat</td><td className="align-top">:</td><td className="whitespace-pre-line">{extra.agendaAcara}</td></tr>
          </tbody>
        </table>
        <p>
          Mengingat pentingnya agenda tersebut, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya.
        </p>
        <p>
          Demikian surat undangan ini kami sampaikan, atas perhatian dan kerja sama yang baik kami ucapkan terima kasih.
        </p>
        <p><em>Wassalamu’alaikum Warahmatullahi Wabarakatuh.</em></p>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `SURAT UNDANGAN
Kepada Yth. ${extra.kepadaYth}
Perihal: ${extra.perihalUndangan}

Dengan hormat, mengundang untuk hadir pada:
Hari / Tanggal: ${extra.hariTanggal}
Waktu: ${extra.waktuAcara}
Tempat: ${extra.tempatAcara}
Agenda:
${extra.agendaAcara}

Demikian undangan ini kami sampaikan.`
  },

  // 13. SURAT PEMBERITAHUAN
  {
    key: 'pemberitahuan',
    label: 'Surat Pemberitahuan',
    title: 'SURAT PEMBERITAHUAN',
    target: 'general',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      kepadaYth: 'Bapak/Ibu Orang Tua / Wali Peserta Didik SMAS Ma\'arif 05 Padang Ratu',
      perihal: 'Pemberitahuan Pelaksanaan Asesmen Sumatif & Jadwal Libur Sekolah',
      isiPemberitahuan: 'Diberitahukan kepada seluruh Orang Tua/Wali murid bahwa Asesmen Sumatif Akhir Semester akan diselenggarakan pada tanggal 02 s.d. 14 Juni 2025. Sehubungan dengan hal tersebut, mohon bimbingan dan pengawasan belajar putra/putri di rumah.',
      tenggatAdministrasi: 'Penyelesaian administrasi keuangan sekolah paling lambat tanggal 28 Mei 2025.',
    },
    fields: [
      { key: 'kepadaYth', label: 'Tujuan Pemberitahuan' },
      { key: 'perihal', label: 'Perihal Surat' },
      { key: 'isiPemberitahuan', label: 'Isi Pokok Pemberitahuan', type: 'textarea' },
      { key: 'tenggatAdministrasi', label: 'Catatan Tambahan / Tenggat Waktu' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <div className="flex justify-between">
          <div>
            <p>Perihal : <strong>{extra.perihal}</strong></p>
          </div>
          <div>
            <p>Kepada Yth.</p>
            <p className="font-bold">{extra.kepadaYth}</p>
            <p>di - Tempat</p>
          </div>
        </div>
        <p><em>Assalamu’alaikum Warahmatullahi Wabarakatuh,</em></p>
        <p>
          Berdasarkan kalender pendidikan satuan pendidikan {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'} Tahun Pelajaran {settings.academicYear}, bersama ini kami beritahukan beberapa hal sebagai berikut:
        </p>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded whitespace-pre-line">
          {extra.isiPemberitahuan}
        </div>
        <p>
          Catatan: {extra.tenggatAdministrasi}
        </p>
        <p>
          Demikian pemberitahuan ini kami sampaikan untuk menjadi perhatian dan dapat dilaksanakan bersama dengan penuh tanggung jawab.
        </p>
        <p><em>Wassalamu’alaikum Warahmatullahi Wabarakatuh.</em></p>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `SURAT PEMBERITAHUAN
Kepada Yth. ${extra.kepadaYth}
Perihal: ${extra.perihal}

${extra.isiPemberitahuan}
Catatan: ${extra.tenggatAdministrasi}`
  },

  // 14. SURAT PERMOHONAN
  {
    key: 'permohonan',
    label: 'Surat Permohonan',
    title: 'SURAT PERMOHONAN',
    target: 'general',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      kepadaYth: 'Kepala Kepolisian Sektor (Kapolsek) Padang Ratu',
      perihal: 'Permohonan Narasumber Sosialisasi Tertib Lalu Lintas & Pencegahan Kenakalan Remaja',
      uraianPermohonan: 'Sehubungan dengan program Pembinaan Karakter dan Disiplin Siswa SMAS Ma\'arif 05 Padang Ratu, bersama ini kami memohon kesediaan Bapak/Ibu untuk menugaskan narasumber pada kegiatan penyuluhan yang akan kami selenggarakan.',
      hariTanggal: 'Senin, 17 Februari 2025',
      waktu: 'Pukul 08.00 WIB s.d. 10.30 WIB',
      tempat: 'Aula Utama SMAS Ma\'arif 05 Padang Ratu',
      kontakPerson: 'Ahmad Fauzi, S.Kom. (0812-7344-9911)',
    },
    fields: [
      { key: 'kepadaYth', label: 'Tujuan Permohonan (Kepada Yth)' },
      { key: 'perihal', label: 'Perihal Permohonan' },
      { key: 'uraianPermohonan', label: 'Uraian Permohonan', type: 'textarea' },
      { key: 'hariTanggal', label: 'Waktu Pelaksanaan' },
      { key: 'kontakPerson', label: 'Contact Person Panitia' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <div className="flex justify-between">
          <div><p>Perihal : <strong>{extra.perihal}</strong></p></div>
          <div><p>Kepada Yth. <br /><span className="font-bold">{extra.kepadaYth}</span><br />di - Tempat</p></div>
        </div>
        <p>Dengan hormat,</p>
        <p>{extra.uraianPermohonan}</p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-40 py-1 font-semibold">Hari / Tanggal</td><td className="w-4">:</td><td>{extra.hariTanggal}</td></tr>
            <tr><td className="py-1 font-semibold">Waktu</td><td>:</td><td>{extra.waktu}</td></tr>
            <tr><td className="py-1 font-semibold">Tempat</td><td>:</td><td>{extra.tempat}</td></tr>
            <tr><td className="py-1 font-semibold">Narahubung</td><td>:</td><td>{extra.kontakPerson}</td></tr>
          </tbody>
        </table>
        <p>
          Besar harapan kami permohonan ini dapat dikabulkan. Atas perkenan dan kerja sama yang baik, kami haturkan terima kasih.
        </p>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `SURAT PERMOHONAN
Kepada Yth. ${extra.kepadaYth}
Perihal: ${extra.perihal}

${extra.uraianPermohonan}
Waktu: ${extra.hariTanggal}
Tempat: ${extra.tempat}
Kontak: ${extra.kontakPerson}`
  },

  // 15. SURAT REKOMENDASI
  {
    key: 'rekomendasi',
    label: 'Surat Rekomendasi',
    title: 'SURAT REKOMENDASI',
    target: 'student',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      tujuanRekomendasi: 'Mengikuti Seleksi Kompetisi Sains Madrasah / Olimpiade Sains Nasional (OSN) Tingkat Kabupaten Lampung Tengah',
      prestasi: 'Juara I Lomba Cepat Tepat Tingkat Kecamatan dan Aktif sebagai Pengurus OSIS Bidang Riset',
      kualifikasi: 'Memiliki integritas tinggi, dedikasi, minat bakat unggul, dan kepribadian yang luhur',
    },
    fields: [
      { key: 'tujuanRekomendasi', label: 'Tujuan Rekomendasi (Lomba/Beasiswa)', type: 'textarea' },
      { key: 'prestasi', label: 'Capaian Prestasi / Kualifikasi' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini Kepala {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, Kabupaten Lampung Tengah, memberikan rekomendasi kepada:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Siswa</td><td className="w-4">:</td><td className="font-bold">{student?.name}</td></tr>
            <tr><td className="py-1">NIS / NISN</td><td>:</td><td className="font-mono">{student?.nis} / {student?.nisn}</td></tr>
            <tr><td className="py-1">Kelas</td><td>:</td><td className="font-bold">{student?.className}</td></tr>
            <tr><td className="py-1">Capaian / Prestasi</td><td>:</td><td>{extra.prestasi}</td></tr>
          </tbody>
        </table>
        <p>
          Berdasarkan evaluasi akademik dan kepribadian, siswa tersebut di atas kami rekomendasikan dengan penuh keyakinan untuk:
        </p>
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded font-semibold text-blue-900">
          {extra.tujuanRekomendasi}
        </div>
        <p>
          Demikian surat rekomendasi ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya oleh pihak yang berwenang.
        </p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `SURAT REKOMENDASI
Kepala ${settings.schoolName} memberikan rekomendasi kepada:
Nama: ${student?.name}
NIS/NISN: ${student?.nis}/${student?.nisn}
Untuk: ${extra.tujuanRekomendasi}
Prestasi: ${extra.prestasi}.`
  },

  // 16. SURAT PENGANTAR BERKAS
  {
    key: 'pengantar',
    label: 'Surat Pengantar',
    title: 'SURAT PENGANTAR BERKAS RESMI',
    target: 'general',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      kepadaYth: 'Kepala Cabang Dinas Pendidikan Wilayah VII Provinsi Lampung',
      berkas1: 'Laporan Bulanan Keadaan Siswa dan Ketenagaan Bulan Januari 2025',
      banyak1: '1 (Satu) Berkas',
      ket1: 'Disampaikan dengan hormat untuk diketahui',
      berkas2: 'Usulan Siswa Penerima Program Indonesia Pintar (PIP) Termin I',
      banyak2: '2 (Dua) Rangkap',
      ket2: 'Mohon untuk diproses lebih lanjut',
      berkas3: 'Surat Pertanggungjawaban Mutlak (SPTJM) Dapodik',
      banyak3: '1 (Satu) Eksemplar',
      ket3: 'Sebagai laporan berkala satuan pendidikan',
    },
    fields: [
      { key: 'kepadaYth', label: 'Tujuan Pengantar Berkas' },
      { key: 'berkas1', label: 'Item Berkas 1' },
      { key: 'banyak1', label: 'Jumlah Berkas 1' },
      { key: 'berkas2', label: 'Item Berkas 2' },
      { key: 'banyak2', label: 'Jumlah Berkas 2' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4">
        <div className="flex justify-end">
          <div className="text-left">
            <p>Kepada Yth.</p>
            <p className="font-bold">{extra.kepadaYth}</p>
            <p>di - Tempat</p>
          </div>
        </div>
        <p>Bersama ini kami kirimkan berkas administrasi sebagai berikut:</p>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 w-10 text-center">No</th>
              <th className="border border-black p-2">Jenis Berkas yang Dikirimkan</th>
              <th className="border border-black p-2 w-32 text-center">Banyaknya</th>
              <th className="border border-black p-2 w-48">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 text-center">1.</td>
              <td className="border border-black p-2 font-medium">{extra.berkas1}</td>
              <td className="border border-black p-2 text-center">{extra.banyak1}</td>
              <td className="border border-black p-2 text-xs">{extra.ket1}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 text-center">2.</td>
              <td className="border border-black p-2 font-medium">{extra.berkas2}</td>
              <td className="border border-black p-2 text-center">{extra.banyak2}</td>
              <td className="border border-black p-2 text-xs">{extra.ket2}</td>
            </tr>
            {extra.berkas3 && (
              <tr>
                <td className="border border-black p-2 text-center">3.</td>
                <td className="border border-black p-2 font-medium">{extra.berkas3}</td>
                <td className="border border-black p-2 text-center">{extra.banyak3}</td>
                <td className="border border-black p-2 text-xs">{extra.ket3}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p>Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `SURAT PENGANTAR
Kepada Yth. ${extra.kepadaYth}
Daftar Berkas:
1. ${extra.berkas1} | Jumlah: ${extra.banyak1}
2. ${extra.berkas2} | Jumlah: ${extra.banyak2}`
  },

  // 17. SURAT PANGGILAN ORANG TUA
  {
    key: 'panggilan_ortu',
    label: 'Surat Panggilan Orang Tua',
    title: 'SURAT PANGGILAN ORANG TUA / WALI',
    target: 'student',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      panggilanKe: 'Panggilan Ke-1 (Pertama)',
      hariTanggal: 'Kamis, 30 Januari 2025',
      waktu: 'Pukul 09.00 WIB',
      menemui: 'Guru Bimbingan Konseling (BK) dan Wali Kelas',
      tempat: 'Ruang Bimbingan Konseling SMAS Ma\'arif 05 Padang Ratu',
      keperluan: 'Membicarakan perkembangan kedisiplinan dan absensi kehadiran belajar putra/putri Bapak/Ibu.',
    },
    fields: [
      { key: 'panggilanKe', label: 'Tingkat Panggilan (Ke-1, Ke-2)' },
      { key: 'hariTanggal', label: 'Hari / Tanggal Menghadap' },
      { key: 'waktu', label: 'Waktu' },
      { key: 'menemui', label: 'Pihak yang Ditemui' },
      { key: 'keperluan', label: 'Alasan / Uraian Masalah', type: 'textarea' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <div className="flex justify-between">
          <div><p>Sifat: <strong>Penting / Rahasia</strong> ({extra.panggilanKe})</p></div>
          <div>
            <p>Kepada Yth. <br />Orang Tua / Wali dari:<br /><span className="font-bold">{student?.name} (Kelas {student?.className})</span><br />di - Tempat</p>
          </div>
        </div>
        <p><em>Assalamu’alaikum Warahmatullahi Wabarakatuh,</em></p>
        <p>
          Demi kelancaran proses pendidikan dan pembinaan karakter putra/putri Bapak/Ibu di {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}, dengan ini kami mengharapkan kehadiran Bapak/Ibu pada:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-40 py-1 font-semibold">Hari / Tanggal</td><td className="w-4">:</td><td>{extra.hariTanggal}</td></tr>
            <tr><td className="py-1 font-semibold">Waktu</td><td>:</td><td>{extra.waktu}</td></tr>
            <tr><td className="py-1 font-semibold">Tempat</td><td>:</td><td>{extra.tempat}</td></tr>
            <tr><td className="py-1 font-semibold">Menemui</td><td>:</td><td>{extra.menemui}</td></tr>
            <tr><td className="py-1 font-semibold align-top">Hal / Keperluan</td><td className="align-top">:</td><td>{extra.keperluan}</td></tr>
          </tbody>
        </table>
        <p>
          Mengingat sangat pentingnya hal tersebut demi masa depan pendidikan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu secara langsung (tidak diwakilkan).
        </p>
        <p><em>Wassalamu’alaikum Warahmatullahi Wabarakatuh.</em></p>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `SURAT PANGGILAN ORANG TUA (${extra.panggilanKe})
Kepada Yth. Orang Tua dari ${student?.name} (Kelas ${student?.className})
Mengharap kehadiran pada:
Hari/Tanggal: ${extra.hariTanggal}
Waktu: ${extra.waktu}
Menemui: ${extra.menemui} di ${extra.tempat}
Keperluan: ${extra.keperluan}.`
  },

  // 18. SURAT KEPUTUSAN (SK) KEPALA SEKOLAH
  {
    key: 'sk_kepsek',
    label: 'Surat Keputusan (SK) Kepala Sekolah',
    title: 'SURAT KEPUTUSAN KEPALA SEKOLAH',
    target: 'general',
    category: '2. SURAT TUGAS & KEDINASAN',
    defaultFields: {
      tentang: 'PEMBAGIAN TUGAS GURU DALAM PROSES BELAJAR MENGAJAR DAN BIMBINGAN TAHUN PELAJARAN 2026/2027',
      menimbang: 'a. Bahwa untuk memperlancar jalannya proses belajar mengajar pada SMAS Ma\'arif 05 Padang Ratu perlu menetapkan pembagian tugas kerja guru;\nb. Bahwa yang namanya tercantum dalam keputusan ini dipandang cakap dan memenuhi syarat untuk melaksanakan tugas.',
      mengingat: '1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;\n2. Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 12 Tahun 2024 tentang Kurikulum;\n3. Anggaran Dasar dan Anggaran Rumah Tangga Lembaga Pendidikan Ma\'arif NU.',
      diktumKesatu: 'Menetapkan Pembagian Tugas Mengajar Guru dan Tugas Tambahan sebagaimana tercantum dalam lampiran keputusan ini.',
      diktumKedua: 'Masing-masing guru wajib melaporkan pelaksanaan tugasnya secara berkala kepada Kepala Sekolah.',
      diktumKetiga: 'Keputusan ini berlaku sejak tanggal ditetapkan dan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.',
    },
    fields: [
      { key: 'tentang', label: 'Tentang Keputusan SK', type: 'textarea' },
      { key: 'menimbang', label: 'Konsideran Menimbang', type: 'textarea' },
      { key: 'mengingat', label: 'Konsideran Mengingat', type: 'textarea' },
      { key: 'diktumKesatu', label: 'Diktum KESATU' },
      { key: 'diktumKedua', label: 'Diktum KEDUA' },
      { key: 'diktumKetiga', label: 'Diktum KETIGA' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <div className="text-center">
          <p className="font-bold">KEPUTUSAN KEPALA {settings.schoolName || 'SMAS MA’ARIF 05 PADANG RATU'}</p>
          <p className="font-bold uppercase mt-1">TENTANG</p>
          <p className="font-bold text-sm uppercase max-w-lg mx-auto">{extra.tentang}</p>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-28 py-1 font-bold align-top">MENIMBANG</td>
              <td className="w-4 align-top">:</td>
              <td className="whitespace-pre-line">{extra.menimbang}</td>
            </tr>
            <tr>
              <td className="py-1 font-bold align-top">MENGINGAT</td>
              <td className="align-top">:</td>
              <td className="whitespace-pre-line">{extra.mengingat}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-center font-bold tracking-widest my-2">MEMUTUSKAN:</p>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="w-28 py-1 font-bold align-top">MENETAPKAN</td>
              <td className="w-4 align-top">:</td>
              <td>Keputusan Kepala Sekolah tentang {extra.tentang}</td>
            </tr>
            <tr>
              <td className="py-1 font-bold align-top">KESATU</td>
              <td className="align-top">:</td>
              <td>{extra.diktumKesatu}</td>
            </tr>
            <tr>
              <td className="py-1 font-bold align-top">KEDUA</td>
              <td className="align-top">:</td>
              <td>{extra.diktumKedua}</td>
            </tr>
            <tr>
              <td className="py-1 font-bold align-top">KETIGA</td>
              <td className="align-top">:</td>
              <td>{extra.diktumKetiga}</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `SURAT KEPUTUSAN KEPALA SEKOLAH
Tentang: ${extra.tentang}
Menimbang: ${extra.menimbang}
Mengingat: ${extra.mengingat}
MEMUTUSKAN:
KESATU: ${extra.diktumKesatu}
KEDUA: ${extra.diktumKedua}
KETIGA: ${extra.diktumKetiga}`
  },

  // 19. BERITA ACARA
  {
    key: 'berita_acara',
    label: 'Berita Acara Rapat / Kegiatan',
    title: 'BERITA ACARA KEGIATAN RESMI',
    target: 'general',
    category: '3. DOKUMEN KEGIATAN SEKOLAH',
    defaultFields: {
      hariTanggal: 'Senin tanggal Dua Puluh bulan Januari tahun Dua Ribu Dua Puluh Lima (20-01-2025)',
      tempat: 'Gedung Pertemuan SMAS Ma\'arif 05 Padang Ratu',
      kegiatan: 'Pelaksanaan Rapat Pleno Penetapan Kelulusan Ujian Sekolah Tahun Pelajaran 2026/2027',
      pihak1: 'H. M. Syaifullah, S.Pd.I., M.Pd. (Kepala Sekolah)',
      pihak2: 'Rahmat Hidayat, M.Si. (Ketua Panitia Ujian)',
      hasilPelaksanaan: 'Telah melaksanakan verifikasi nilai seluruh peserta didik kelas XII yang berjumlah 89 siswa, dan dinyatakan seluruhnya memenuhi kriteria kelulusan dengan predikat memuaskan tanpa kendala yang berarti.',
    },
    fields: [
      { key: 'hariTanggal', label: 'Waktu Lengkap (Hari, Tanggal, Bulan, Tahun)' },
      { key: 'tempat', label: 'Tempat Pelaksanaan' },
      { key: 'kegiatan', label: 'Nama Kegiatan' },
      { key: 'hasilPelaksanaan', label: 'Hasil Pelaksanaan Kegiatan', type: 'textarea' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Pada hari ini, <strong>{extra.hariTanggal}</strong>, bertempat di {extra.tempat}, telah diselenggarakan kegiatan: <strong>{extra.kegiatan}</strong>.
        </p>
        <p>Pelaksanaan kegiatan tersebut dihadiri oleh segenap Dewan Guru dan Staf Tata Usaha dengan hasil sebagai berikut:</p>
        <div className="p-3 bg-slate-50 border border-slate-300 rounded whitespace-pre-line font-serif">
          {extra.hasilPelaksanaan}
        </div>
        <p>
          Demikian Berita Acara ini dibuat dalam rangkap yang cukup dengan sebenarnya untuk dipergunakan sebagai dokumen pertanggungjawaban resmi sekolah.
        </p>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `BERITA ACARA
Hari/Tanggal: ${extra.hariTanggal}
Tempat: ${extra.tempat}
Kegiatan: ${extra.kegiatan}
Hasil: ${extra.hasilPelaksanaan}`
  },

  // 20. NOTULEN RAPAT
  {
    key: 'notulen_rapat',
    label: 'Notulen Rapat Dinas',
    title: 'NOTULEN RAPAT DINAS SEKOLAH',
    target: 'general',
    category: '3. DOKUMEN KEGIATAN SEKOLAH',
    defaultFields: {
      hariTanggal: 'Rabu, 22 Januari 2025',
      waktu: 'Pukul 09.00 - 12.00 WIB',
      tempat: 'Ruang Guru SMAS Ma\'arif 05 Padang Ratu',
      pimpinanRapat: 'H. M. Syaifullah, S.Pd.I., M.Pd. (Kepala Sekolah)',
      notulis: 'Dewi Anggraini, A.Md.',
      agenda: 'Koordinasi Kesiapan Asesmen Bakat Minat (ABM) dan Penertiban Administrasi Guru',
      isiRapat: '1. Pembukaan oleh Kepala Sekolah dilanjutkan pengarahan tentang pentingnya kedisiplinan administrasi.\n2. Pembahasan sarana laboratorium komputer untuk pelaksanaan asesmen online.\n3. Penetapan batas waktu pengumpulan perangkat ajar guru pada tanggal 05 Februari 2025.\n4. Tanya jawab dan penetapan kesimpulan rapat.',
    },
    fields: [
      { key: 'agenda', label: 'Agenda Rapat' },
      { key: 'hariTanggal', label: 'Hari / Tanggal' },
      { key: 'pimpinanRapat', label: 'Pimpinan Rapat' },
      { key: 'notulis', label: 'Notulis' },
      { key: 'isiRapat', label: 'Jalannya Rapat & Keputusan', type: 'textarea' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4">
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <tbody>
            <tr><td className="p-2 border font-bold w-40 bg-slate-100">Agenda Rapat</td><td className="p-2 border">{extra.agenda}</td></tr>
            <tr><td className="p-2 border font-bold bg-slate-100">Hari / Tanggal</td><td className="p-2 border">{extra.hariTanggal}</td></tr>
            <tr><td className="p-2 border font-bold bg-slate-100">Waktu / Tempat</td><td className="p-2 border">{extra.waktu} / {extra.tempat}</td></tr>
            <tr><td className="p-2 border font-bold bg-slate-100">Pimpinan Rapat</td><td className="p-2 border">{extra.pimpinanRapat}</td></tr>
            <tr><td className="p-2 border font-bold bg-slate-100">Notulis</td><td className="p-2 border">{extra.notulis}</td></tr>
          </tbody>
        </table>
        <p className="font-bold">HASIL DAN KEPUTUSAN RAPAT:</p>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded whitespace-pre-line text-xs">
          {extra.isiRapat}
        </div>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `NOTULEN RAPAT
Agenda: ${extra.agenda}
Hari/Tanggal: ${extra.hariTanggal}
Pimpinan: ${extra.pimpinanRapat} | Notulis: ${extra.notulis}
Hasil:
${extra.isiRapat}`
  },

  // 21. DAFTAR HADIR RESMI KEGIATAN
  {
    key: 'daftar_hadir',
    label: 'Daftar Hadir Resmi Kegiatan',
    title: 'DAFTAR HADIR KEGIATAN RESMI',
    target: 'general',
    category: '3. DOKUMEN KEGIATAN SEKOLAH',
    defaultFields: {
      kegiatan: 'Rapat Kerja Dewan Guru dan Karyawan SMAS Ma\'arif 05 Padang Ratu',
      hariTanggal: 'Senin, 13 Januari 2025',
      tempat: 'Ruang Serbaguna SMAS Ma\'arif 05 Padang Ratu',
    },
    fields: [
      { key: 'kegiatan', label: 'Nama Kegiatan' },
      { key: 'hariTanggal', label: 'Hari & Tanggal Pelaksanaan' },
      { key: 'tempat', label: 'Tempat Kegiatan' },
    ],
    renderPreview: ({ settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4">
        <table className="w-full text-xs">
          <tbody>
            <tr><td className="w-32 font-bold py-0.5">Kegiatan</td><td>: {extra.kegiatan}</td></tr>
            <tr><td className="font-bold py-0.5">Hari / Tanggal</td><td>: {extra.hariTanggal}</td></tr>
            <tr><td className="font-bold py-0.5">Tempat</td><td>: {extra.tempat}</td></tr>
          </tbody>
        </table>
        <table className="w-full border-collapse border border-black text-xs mt-2">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 w-10 text-center">No</th>
              <th className="border border-black p-2">Nama Pegawai / Peserta</th>
              <th className="border border-black p-2 w-44">Jabatan / NIP</th>
              <th className="border border-black p-2 w-36 text-center">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i}>
                <td className="border border-black p-3 text-center">{i}.</td>
                <td className="border border-black p-3"></td>
                <td className="border border-black p-3"></td>
                <td className="border border-black p-3 text-xs text-slate-400">
                  {i % 2 === 1 ? `${i}. ........` : `\u00A0\u00A0\u00A0\u00A0${i}. ........`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    getDocxText: ({ settings, extra }) => `DAFTAR HADIR
Kegiatan: ${extra.kegiatan}
Hari/Tanggal: ${extra.hariTanggal}
Tempat: ${extra.tempat}`
  },

  // 22. SURAT PERNYATAAN SISWA / TANGGUNG JAWAB MUTLAK
  {
    key: 'pernyataan',
    label: 'Surat Pernyataan Tanggung Jawab',
    title: 'SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)',
    target: 'student',
    category: '3. DOKUMEN KEGIATAN SEKOLAH',
    defaultFields: {
      judulPernyataan: 'SURAT PERNYATAAN KETAATAN TATA TERTIB SEKOLAH',
      isiPernyataan: '1. Senantiasa menaati seluruh tata tertib dan peraturan yang berlaku di SMAS Ma\'arif 05 Padang Ratu.\n2. Menjaga nama baik almamater, guru, dan Lembaga Pendidikan Ma\'arif NU di dalam maupun di luar lingkungan sekolah.\n3. Tidak terlibat tawuran pelajar, narkoba, miras, perjudian, serta tindakan melanggar hukum lainnya.\n4. Bersedia menerima sanksi tegas hingga dikembalikan kepada orang tua apabila melanggar pernyataan ini.',
    },
    fields: [
      { key: 'judulPernyataan', label: 'Judul Pernyataan' },
      { key: 'isiPernyataan', label: 'Butir-butir Pernyataan', type: 'textarea' },
    ],
    renderPreview: ({ student, settings, extra }) => (
      <div className="text-xs sm:text-sm leading-relaxed space-y-4 text-justify">
        <p>
          Yang bertanda tangan di bawah ini saya peserta didik {settings.schoolName || 'SMAS Ma\'arif 05 Padang Ratu'}:
        </p>
        <table className="w-full ml-4 border-collapse">
          <tbody>
            <tr><td className="w-48 py-1">Nama Siswa</td><td className="w-4">:</td><td className="font-bold">{student?.name}</td></tr>
            <tr><td className="py-1">NIS / NISN</td><td>:</td><td className="font-mono">{student?.nis} / {student?.nisn}</td></tr>
            <tr><td className="py-1">Kelas</td><td>:</td><td>{student?.className}</td></tr>
            <tr><td className="py-1">Nama Orang Tua</td><td>:</td><td>{student?.fatherName || student?.motherName}</td></tr>
            <tr><td className="py-1">Alamat</td><td>:</td><td>{student?.address}</td></tr>
          </tbody>
        </table>
        <p>Dengan sadar dan sungguh-sungguh menyatakan bahwa saya:</p>
        <div className="p-3 bg-slate-50 border border-slate-300 rounded whitespace-pre-line text-xs sm:text-sm">
          {extra.isiPernyataan}
        </div>
        <p>
          Demikian surat pernyataan ini saya buat dengan sebenarnya atas persetujuan orang tua/wali murid, tanpa ada paksaan dari pihak mana pun.
        </p>
        <div className="mt-8 flex justify-between text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p className="font-semibold">Orang Tua / Wali Murid,</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{student?.fatherName || student?.motherName || '( .................................... )'}</p>
          </div>
          <div>
            <p>Padang Ratu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-semibold">Yang Membuat Pernyataan,</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 border border-dashed border-slate-300 px-2 py-1">Materai 10.000</span>
            </div>
            <p className="font-bold underline">{student?.name || '( .................................... )'}</p>
          </div>
        </div>
      </div>
    ),
    getDocxText: ({ student, settings, extra }) => `SURAT PERNYATAAN
Nama Siswa: ${student?.name}
NIS/NISN: ${student?.nis}/${student?.nisn}
Isi Pernyataan:
${extra.isiPernyataan}`
  },
];
