import React from 'react';
import { Menu, Sun, Moon, Bell, Shield, UserCheck, CalendarRange } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { PWAInstallButton } from './PWAInstallButton';
import { UserRole } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isDarkMode, onToggleDarkMode }) => {
  const { profile, loginAsDemoRole } = useAuth();
  const { activeYearName, activeSemester } = useAcademicYear();

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    super_admin: { label: 'Super Admin', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900' },
    admin_tu: { label: 'Admin TU', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900' },
    kepala_sekolah: { label: 'Kepala Sekolah', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
    operator: { label: 'Operator Dapodik', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' },
    guru: { label: 'Guru Pengampu', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900' },
  };

  const currentRole = profile?.role || 'super_admin';

  return (
    <header className="h-16 bg-white/85 dark:bg-[#0a1226]/85 backdrop-blur-md border-b border-slate-200/90 dark:border-blue-900/30 px-4 flex items-center justify-between sticky top-0 z-30 transition-all shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 p-0.5 border border-amber-400/40 shadow-xs flex items-center justify-center">
            <img src="/logo_sekolah.png" alt="Logo Sekolah" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-700 dark:from-white dark:via-blue-200 dark:to-blue-400 tracking-tight text-base sm:text-lg">
                SITUS
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                SMAS Ma'arif 05 Padang Ratu
              </span>
              <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold font-mono tabular-nums">
                <CalendarRange className="w-3 h-3" />
                <span>TA {activeYearName} • {activeSemester}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Quick Role Switcher for seamless evaluation of all 4 RBAC levels */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl text-xs border border-slate-200 dark:border-slate-700">
          <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ml-1.5" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Hak Akses:</span>
          {(['super_admin', 'admin_tu', 'kepala_sekolah', 'operator'] as UserRole[]).map((r) => {
            const isActive = currentRole === r;
            return (
              <button
                key={r}
                onClick={() => loginAsDemoRole(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  isActive
                    ? r === 'super_admin'
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                      : r === 'admin_tu'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : r === 'kepala_sekolah'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                      : 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/80'
                }`}
              >
                {r === 'super_admin' ? 'Super Admin' : r === 'admin_tu' ? 'Admin TU' : r === 'kepala_sekolah' ? 'Kepsek' : 'Operator'}
              </button>
            );
          })}
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile summary */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {profile?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[150px]">
              {profile?.displayName || 'Admin'}
            </p>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border ${roleLabels[currentRole].color}`}>
              {roleLabels[currentRole].label}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
