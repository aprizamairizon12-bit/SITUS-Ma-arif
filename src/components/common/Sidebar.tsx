import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  Award,
  FileText,
  Inbox,
  Send,
  CreditCard,
  FileEdit,
  Archive,
  BarChart3,
  ShieldCheck,
  Building,
  Settings,
  Database,
  CalendarCheck,
  CalendarRange,
  BookOpen,
  Printer,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavItemKey =
  | 'dashboard'
  | 'academic_years'
  | 'print_class_attendance'
  | 'print_teacher_attendance'
  | 'rombels'
  | 'attendance'
  | 'teacher_book'
  | 'students'
  | 'teachers'
  | 'staff'
  | 'classes'
  | 'alumni'
  | 'letters'
  | 'incoming_letters'
  | 'outgoing_letters'
  | 'invoices'
  | 'editor'
  | 'archives'
  | 'reports'
  | 'users'
  | 'kop_settings'
  | 'app_settings'
  | 'backup';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen, onClose }) => {
  const { logout, profile } = useAuth();

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdminTU = profile?.role === 'admin_tu' || isSuperAdmin;
  const isGuru = profile?.role === 'guru';

  const menuSections = [
    {
      title: 'MENU UTAMA',
      items: [
        { key: 'dashboard' as NavItemKey, label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'PENCETAKAN ABSENSI',
      items: [
        { key: 'print_class_attendance' as NavItemKey, label: 'Absensi Kelas (Bulanan)', icon: CalendarCheck },
        { key: 'print_teacher_attendance' as NavItemKey, label: 'Absensi Pegangan Guru', icon: Printer },
      ],
    },
    {
      title: 'AKADEMIK & KELAS',
      items: [
        ...(isAdminTU || profile?.role === 'kepala_sekolah' || profile?.role === 'operator'
          ? [{ key: 'academic_years' as NavItemKey, label: 'Manajemen Tahun Pelajaran', icon: CalendarRange }]
          : []),
        { key: 'rombels' as NavItemKey, label: 'Data Rombongan Belajar', icon: Layers },
        { key: 'attendance' as NavItemKey, label: 'Rekap Presensi Digital', icon: CalendarCheck },
        { key: 'teacher_book' as NavItemKey, label: 'Buku Pegangan Guru', icon: BookOpen },
      ],
    },
    {
      title: 'MANAJEMEN DATA SEKOLAH',
      items: [
        { key: 'students' as NavItemKey, label: 'Data Peserta Didik', icon: Users },
        { key: 'teachers' as NavItemKey, label: 'Data Guru', icon: GraduationCap },
        { key: 'staff' as NavItemKey, label: 'Data Tenaga Kependidikan', icon: Briefcase },
        { key: 'alumni' as NavItemKey, label: 'Data Alumni', icon: Award },
      ],
    },
    {
      title: 'PERSURATAN & DOKUMEN',
      items: [
        { key: 'letters' as NavItemKey, label: 'Pembuatan Surat', icon: FileText },
        { key: 'incoming_letters' as NavItemKey, label: 'Surat Masuk', icon: Inbox },
        { key: 'outgoing_letters' as NavItemKey, label: 'Surat Keluar', icon: Send },
        { key: 'invoices' as NavItemKey, label: 'Surat Tagihan Siswa', icon: CreditCard },
        { key: 'editor' as NavItemKey, label: 'Editor Dokumen (Word)', icon: FileEdit },
        { key: 'archives' as NavItemKey, label: 'Arsip Digital', icon: Archive },
      ],
    },
    {
      title: 'LAPORAN & SISTEM',
      items: [
        { key: 'reports' as NavItemKey, label: 'Laporan Administrasi', icon: BarChart3 },
        ...(isSuperAdmin ? [{ key: 'users' as NavItemKey, label: 'Pengguna & Hak Akses', icon: ShieldCheck }] : []),
        ...(isAdminTU ? [{ key: 'kop_settings' as NavItemKey, label: 'Pengaturan Kop Surat', icon: Building }] : []),
        ...(isAdminTU ? [{ key: 'app_settings' as NavItemKey, label: 'Pengaturan Aplikasi', icon: Settings }] : []),
        ...(isSuperAdmin ? [{ key: 'backup' as NavItemKey, label: 'Backup & Restore', icon: Database }] : []),
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-gradient-to-b from-[#070e24] via-[#0b1636] to-[#040713] text-slate-100 flex flex-col border-r border-blue-900/40 transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* App Logo & Header */}
        <div className="p-4 flex items-center justify-between border-b border-blue-900/40 bg-[#09122c]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/10 p-0.5 flex items-center justify-center border border-amber-400/50 shadow-md shadow-amber-500/10">
              <img src="/logo_sekolah.png" alt="Logo SMAS Ma'arif 05" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-lg tracking-wider">SITUS</span>
                <span className="text-[10px] bg-gradient-to-r from-amber-400/20 to-emerald-400/20 text-amber-300 border border-amber-400/50 px-2 py-0.2 rounded-full font-bold">
                  v2.5
                </span>
              </div>
              <p className="text-[11px] text-emerald-300 font-bold tracking-tight">
                SMAS Ma'arif 05 Padang Ratu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-black tracking-widest text-blue-300/70 uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onSelectTab(item.key);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold shadow-lg shadow-blue-600/35 border-l-2 border-amber-400'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-blue-300'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Logout */}
        <div className="p-3 border-t border-blue-900/40 bg-[#080d1a]">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
};
