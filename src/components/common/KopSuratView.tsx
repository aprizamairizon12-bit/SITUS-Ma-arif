import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { SchoolSetting } from '../../types';

interface KopSuratViewProps {
  customSettings?: SchoolSetting;
  hideLine?: boolean;
}

export const KopSuratView: React.FC<KopSuratViewProps> = ({ customSettings, hideLine = false }) => {
  const { settings: globalSettings } = useSettings();
  const settings = customSettings || globalSettings;

  return (
    <div className="w-full text-slate-900 select-none pb-2" style={{ fontFamily: settings.kopFont || 'Times New Roman' }}>
      <div className="flex items-center justify-between gap-4 px-2">
        {/* Logo Kiri */}
        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: `${settings.logoLeftWidth || 85}px` }}>
          <img
            src={settings.logoLeftUrl || '/logo_sekolah.png'}
            alt="Logo Lembaga"
            className="object-contain"
            style={{ width: `${settings.logoLeftWidth || 85}px`, maxHeight: '95px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo_sekolah.png';
            }}
          />
        </div>

        {/* Teks Identitas Sekolah */}
        <div className="flex-1 text-center space-y-0.5 px-1">
          <h4 className="text-[11px] sm:text-[13px] font-bold tracking-wider uppercase text-slate-800 leading-tight">
            {settings.foundationLine1 || 'BADAN PELAKSANA PENYELENGGARA PENDIDIKAN'}
          </h4>
          <h3 className="text-[12px] sm:text-[14px] font-bold tracking-wide uppercase text-slate-900 leading-tight">
            {settings.foundationLine2 || 'LEMBAGA PENDIDIKAN MA’ARIF NU KAMPUNG SURABAYA'}
          </h3>
          <h1 className="text-base sm:text-2xl font-black tracking-wide uppercase text-slate-950 font-serif leading-tight py-0.5">
            {settings.schoolName || 'SMAS MA’ARIF 05 PADANG RATU'}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-800 leading-tight font-medium">
            Alamat : {settings.address} Kec. Padang Ratu Kab. Lampung Tengah Kode Pos {settings.postalCode} Provinsi Lampung
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-800 leading-tight font-medium">
            NSS : {settings.nss || '30.2.12.02.12.050'} &nbsp;&nbsp; NIS : {settings.nisCode || '2.12.050'} &nbsp;&nbsp; NPSN : {settings.npsn || '10801956'} &nbsp;&nbsp; Status : {settings.accreditationStatus || 'Terakreditasi B'}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-800 leading-tight font-medium">
            Website : {settings.website || 'smamaarif05padangratu.sch.id'} &nbsp;&nbsp;&nbsp; E-mail : {settings.email || 'smamaarif05@gmail.com'}
          </p>
        </div>

        {/* Logo Kanan */}
        <div className="flex-shrink-0 flex items-center justify-center" style={{ width: `${settings.logoRightWidth || 85}px` }}>
          <img
            src={settings.logoRightUrl || '/logo_sekolah.png'}
            alt="Logo Sekolah"
            className="object-contain"
            style={{ width: `${settings.logoRightWidth || 85}px`, maxHeight: '95px' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo_sekolah.png';
            }}
          />
        </div>
      </div>

      {/* Double Border Kop Surat Indonesia */}
      {!hideLine && (
        <div className="mt-2.5 pt-0.5 border-t-2 border-black border-b-[3px] border-b-black"></div>
      )}
    </div>
  );
};
