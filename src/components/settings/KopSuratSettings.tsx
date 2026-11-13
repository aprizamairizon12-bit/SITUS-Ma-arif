import React, { useState } from 'react';
import { Building, Upload, Save, RotateCcw, Check, Eye } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { KopSuratView } from '../common/KopSuratView';
import { SchoolSetting } from '../../types';

export const KopSuratSettings: React.FC = () => {
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const [form, setForm] = useState<SchoolSetting>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (field: keyof SchoolSetting, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoLeftUrl' | 'logoRightUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleChange(field, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {isSaved && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Pengaturan Kop Surat berhasil disimpan secara permanen ke database!</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-600" />
            <span>Pengaturan Kop Surat Resmi Sekolah</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesuaikan logo kiri dan kanan, ukuran logo, identitas yayasan, dan alamat resmi SMAS Ma'arif 05 Padang Ratu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <Eye className="w-4 h-4" />
          <span>Pratinjau Langsung (Real-time Preview Kop Surat)</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
          <KopSuratView customSettings={form} />
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs">
        {/* Section 1: Logo Settings */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
            Pengaturan Dua Logo (Kiri & Kanan)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Kiri */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Logo Sebelah Kiri (Lembaga / Yayasan)</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center p-1 border">
                  <img src={form.logoLeftUrl || '/icon.svg'} alt="Logo Kiri" className="max-h-full object-contain" />
                </div>
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo Kiri</span>
                  <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoLeftUrl')} className="hidden" />
                </label>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Lebar Logo Kiri: {form.logoLeftWidth || 75}px</label>
                <input
                  type="range"
                  min="50"
                  max="120"
                  value={form.logoLeftWidth || 75}
                  onChange={(e) => handleChange('logoLeftWidth', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Logo Kanan */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Logo Sebelah Kanan (Sekolah)</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center p-1 border">
                  <img src={form.logoRightUrl || '/icon.svg'} alt="Logo Kanan" className="max-h-full object-contain" />
                </div>
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo Kanan</span>
                  <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoRightUrl')} className="hidden" />
                </label>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Lebar Logo Kanan: {form.logoRightWidth || 75}px</label>
                <input
                  type="range"
                  min="50"
                  max="120"
                  value={form.logoRightWidth || 75}
                  onChange={(e) => handleChange('logoRightWidth', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Identitas Sekolah pada Kop */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
            Teks Identitas Kop Surat Resmi
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Badan Pelaksana (Baris 1)
                </label>
                <input
                  type="text"
                  required
                  value={form.foundationLine1 || ''}
                  onChange={(e) => handleChange('foundationLine1', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none uppercase font-bold"
                  placeholder="BADAN PELAKSANA PENYELENGGARA PENDIDIKAN"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lembaga Yayasan (Baris 2)
                </label>
                <input
                  type="text"
                  required
                  value={form.foundationLine2 || ''}
                  onChange={(e) => handleChange('foundationLine2', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none uppercase font-bold"
                  placeholder="LEMBAGA PENDIDIKAN MA’ARIF NU KAMPUNG SURABAYA"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nama Resmi Sekolah (Judul Utama Kop - Baris 3)
              </label>
              <input
                type="text"
                required
                value={form.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none uppercase font-extrabold text-blue-900 dark:text-blue-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NSS</label>
                <input
                  type="text"
                  value={form.nss || ''}
                  onChange={(e) => handleChange('nss', e.target.value)}
                  placeholder="30.2.12.02.12.050"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NIS</label>
                <input
                  type="text"
                  value={form.nisCode || ''}
                  onChange={(e) => handleChange('nisCode', e.target.value)}
                  placeholder="2.12.050"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">NPSN</label>
                <input
                  type="text"
                  value={form.npsn}
                  onChange={(e) => handleChange('npsn', e.target.value)}
                  placeholder="10801956"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Status Akreditasi</label>
                <input
                  type="text"
                  value={form.accreditationStatus || 'Terakreditasi B'}
                  onChange={(e) => handleChange('accreditationStatus', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-semibold text-blue-700"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Alamat Jalan & Desa/Kampung</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Jalan KH. Wahid Hasyim Kampung Surabaya"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kecamatan</label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kabupaten</label>
                <input
                  type="text"
                  value={form.regency}
                  onChange={(e) => handleChange('regency', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kode Pos</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan Kop Surat</span>
          </button>
        </div>
      </form>
    </div>
  );
};
