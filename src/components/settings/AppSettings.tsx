import React, { useState } from 'react';
import { Settings, Save, Check, Shield, Sparkles } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAppAnimation } from '../../context/AnimationContext';
import { SchoolSetting } from '../../types';

export const AppSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { animationsEnabled, setAnimationsEnabled, animationSpeed, setAnimationSpeed, reducedMotion } = useAppAnimation();
  const [form, setForm] = useState<SchoolSetting>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (field: keyof SchoolSetting, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {isSaved && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Pengaturan aplikasi berhasil disimpan ke Firestore!</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <span>Pengaturan Aplikasi & Konfigurasi Administrasi</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur penandatangan surat dinas, tahun pelajaran berjalan, format nomor surat, dan opsi tagihan
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs">
        {/* Identitas Pejabat Penandatangan */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
            Identitas Pejabat Penandatangan Surat
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nama Kepala Sekolah & Gelar
              </label>
              <input
                type="text"
                required
                value={form.headmasterName}
                onChange={(e) => handleChange('headmasterName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={form.headmasterNip}
                onChange={(e) => handleChange('headmasterNip', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nama Kepala Tata Usaha & Gelar
              </label>
              <input
                type="text"
                required
                value={form.tuHeadName}
                onChange={(e) => handleChange('tuHeadName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                NIP Kepala Tata Usaha
              </label>
              <input
                type="text"
                value={form.tuHeadNip}
                onChange={(e) => handleChange('tuHeadNip', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Konfigurasi Sistem Persuratan */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
            Konfigurasi Penomoran Surat & Tahun Pelajaran
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tahun Pelajaran Berjalan
              </label>
              <input
                type="text"
                required
                placeholder="2026/2027"
                value={form.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Format Penomoran Surat Otomatis
              </label>
              <input
                type="text"
                required
                placeholder="421.3/{nomor}/SMA-M.05/TU/{bulan-romawi}/{tahun}"
                value={form.letterNumberFormat}
                onChange={(e) => handleChange('letterNumberFormat', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Variabel tersedia: &#123;nomor&#125;, &#123;bulan-romawi&#125;, &#123;tahun&#125;</p>
            </div>
          </div>
        </div>

        {/* Pengaturan Kategori Tagihan */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
            Pengaturan Modul Surat Tagihan
          </h3>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Tampilkan Kategori Tagihan "Seragam"
              </span>
              <span className="text-[11px] text-slate-500">
                Aktifkan jika sekolah menerbitkan surat tagihan biaya seragam peserta didik
              </span>
            </div>
            <input
              type="checkbox"
              checked={form.showUniformBilling}
              onChange={(e) => handleChange('showUniformBilling', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Pengaturan Animasi & Efek Antarmuka */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Pengaturan Animasi & Efek Transisi Antarmuka</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Aktifkan Animasi Transisi Halaman & Kartu
                </span>
                <span className="text-[11px] text-slate-500">
                  Memberikan efek visual halus (fade & slide) saat berpindah modul atau membuka formulir
                </span>
              </div>
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Kecepatan Animasi Transisi
                </span>
                <span className="text-[11px] text-slate-500">
                  Pilih durasi transisi antarmuka sesuai kenyamanan perangkat
                </span>
              </div>
              <select
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(e.target.value as any)}
                className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              >
                <option value="fast">Cepat (Ringan & Cepat)</option>
                <option value="normal">Normal (Seimbang)</option>
                <option value="slow">Halus (Sinematik)</option>
              </select>
            </div>

            {reducedMotion && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs">
                ℹ️ Terdeteksi pengaturan sistem <strong>Prefers-Reduced-Motion</strong> aktif di perangkat Anda. Animasi gerak otomatis disederhanakan demi kenyamanan aksesibilitas.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan Aplikasi</span>
          </button>
        </div>
      </form>
    </div>
  );
};
