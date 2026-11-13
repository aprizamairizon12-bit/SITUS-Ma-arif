/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { AnimationProvider, useAppAnimation } from './context/AnimationContext';
import { Sidebar, NavItemKey } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { LoginPage } from './components/auth/LoginPage';
import { motion, AnimatePresence } from 'motion/react';

// Module Components
import { Dashboard } from './components/dashboard/Dashboard';
import { AcademicYearManagement } from './components/academicyear/AcademicYearManagement';
import { RombelManagement } from './components/rombel/RombelManagement';
import { StudentAttendancePrinting } from './components/attendance/StudentAttendancePrinting';
import { ClassAttendanceManagement } from './components/attendance/ClassAttendanceManagement';
import { TeacherBookManagement } from './components/teacherbook/TeacherBookManagement';
import { StudentManagement } from './components/students/StudentManagement';
import { TeacherManagement } from './components/teachers/TeacherManagement';
import { StaffManagement } from './components/staff/StaffManagement';
import { ClassManagement } from './components/classes/ClassManagement';
import { AlumniManagement } from './components/alumni/AlumniManagement';
import { LetterGenerator } from './components/letters/LetterGenerator';
import { IncomingLetters } from './components/letters/IncomingLetters';
import { OutgoingLetters } from './components/letters/OutgoingLetters';
import { StudentInvoiceManagement } from './components/invoices/StudentInvoiceManagement';
import { WordEditor } from './components/editor/WordEditor';
import { DigitalArchive } from './components/archives/DigitalArchive';
import { AdministrativeReports } from './components/reports/AdministrativeReports';
import { UserManagement } from './components/users/UserManagement';
import { KopSuratSettings } from './components/settings/KopSuratSettings';
import { AppSettings } from './components/settings/AppSettings';
import { BackupRestore } from './components/backup/BackupRestore';

const MainLayout: React.FC = () => {
  const { profile, loading } = useAuth();
  const { animationsEnabled } = useAppAnimation();
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync dark mode class on root HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070e24] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-amber-400/40 p-1.5 shadow-xl animate-pulse flex items-center justify-center">
            <img src="/logo_sekolah.png" alt="SITUS" className="w-full h-full object-contain" />
          </div>
          <p className="font-bold text-sm tracking-wide text-blue-200">Memuat SITUS SMAS Ma'arif 05 Padang Ratu...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <LoginPage />;
  }

  const renderModule = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'academic_years':
        return <AcademicYearManagement />;
      case 'print_class_attendance':
        return <StudentAttendancePrinting initialSubTab="class" />;
      case 'print_teacher_attendance':
        return <StudentAttendancePrinting initialSubTab="teacher" />;
      case 'rombels':
        return <RombelManagement />;
      case 'attendance':
        return <ClassAttendanceManagement />;
      case 'teacher_book':
        return <TeacherBookManagement />;
      case 'students':
        return <StudentManagement />;
      case 'teachers':
        return <TeacherManagement />;
      case 'staff':
        return <StaffManagement />;
      case 'classes':
        return <ClassManagement />;
      case 'alumni':
        return <AlumniManagement />;
      case 'letters':
        return <LetterGenerator />;
      case 'incoming_letters':
        return <IncomingLetters />;
      case 'outgoing_letters':
        return <OutgoingLetters />;
      case 'invoices':
        return <StudentInvoiceManagement />;
      case 'editor':
        return <WordEditor />;
      case 'archives':
        return <DigitalArchive />;
      case 'reports':
        return <AdministrativeReports />;
      case 'users':
        return <UserManagement />;
      case 'kop_settings':
        return <KopSuratSettings />;
      case 'app_settings':
        return <AppSettings />;
      case 'backup':
        return <BackupRestore />;
      default:
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={animationsEnabled ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={animationsEnabled ? { opacity: 0, y: -10 } : undefined}
              transition={{ duration: animationsEnabled ? 0.22 : 0, ease: 'easeOut' }}
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Connectivity Alert */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AcademicYearProvider>
          <AnimationProvider>
            <MainLayout />
          </AnimationProvider>
        </AcademicYearProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
