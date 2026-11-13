import React, { useState } from 'react';
import { Database, Download, Upload, RefreshCw, CheckCircle, AlertTriangle, FileArchive, Shield } from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useSettings } from '../../context/SettingsContext';

export const BackupRestore: React.FC = () => {
  const { settings } = useSettings();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const collectionsToBackup = [
    'academic_years',
    'students',
    'teachers',
    'staff',
    'classes',
    'rombels',
    'rombel_members',
    'class_attendance',
    'teacher_books',
    'grade_assessments',
    'grade_records',
    'teaching_journals',
    'learning_objectives',
    'alumni',
    'incomingLetters',
    'outgoingLetters',
    'createdLetters',
    'studentInvoices',
    'archives',
    'settings',
  ];

  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    try {
      const backupData: Record<string, any[]> = {
        metadata: [
          {
            appName: 'SITUS SMAS Ma\'arif 05 Padang Ratu',
            timestamp: new Date().toISOString(),
            version: '2.5',
          },
        ],
      };

      for (const colName of collectionsToBackup) {
        const snap = await getDocs(collection(db, colName));
        backupData[colName] = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SITUS_Backup_SMA_Maarif_05_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNotification({
        message: 'Backup database berhasil diunduh ke komputer Anda.',
        type: 'success',
      });
    } catch (err: any) {
      setNotification({
        message: 'Gagal melakukan backup: ' + err.message,
        type: 'error',
      });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('PERINGATAN: Memulihkan database dari file backup akan menimpa data yang ada. Lanjutkan pemulihan data?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      for (const colName of collectionsToBackup) {
        if (Array.isArray(backupData[colName])) {
          for (const item of backupData[colName]) {
            const docId = item._docId || 'restored_' + Date.now();
            const { _docId, ...docContent } = item;
            await setDoc(doc(db, colName, docId), docContent, { merge: true });
          }
        }
      }

      setNotification({
        message: 'Pemulihan data (Restore) database berhasil diselesaikan!',
        type: 'success',
      });
    } catch (err: any) {
      setNotification({
        message: 'Gagal memulihkan database: ' + err.message,
        type: 'error',
      });
    } finally {
      setIsRestoring(false);
      e.target.value = '';
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold transition ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          <span>Cadangan & Pemulihan Sistem (Backup & Restore)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Amankan seluruh data sekolah ke format terenkripsi JSON dan pulihkan data kapan saja diperlukan
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cadangkan Seluruh Database Online
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Mengunduh seluruh berkas data peserta didik, guru, staf, rombel, buku agenda surat masuk & keluar, dokumen tersimpan, serta pengaturan kop surat ke dalam satu file arsip JSON terstruktur.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleBackupDatabase}
              disabled={isBackingUp}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isBackingUp ? 'Sedang Mengekstrak Data...' : 'Mulai Cadangkan Database (Download JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pulihkan Database dari File Cadangan
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Unggah file cadangan JSON yang sebelumnya diunduh untuk memulihkan seluruh data dan pengaturan secara otomatis ke Firebase Firestore.
            </p>
          </div>

          <div className="pt-2">
            <label className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Sedang Memulihkan...' : 'Pilih File Cadangan (Restore JSON)'}</span>
              <input type="file" accept=".json" onChange={handleRestoreDatabase} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <strong>Perlindungan Keamanan Tingkat Tinggi:</strong> SITUS SMAS Ma'arif 05 Padang Ratu mengadopsi keamanan Firebase Cloud Firestore dengan aturan hak akses berbasis peran (RBAC). Pencadangan berkala dianjurkan dilakukan minimal 1 bulan sekali atau menjelang akhir semester.
        </div>
      </div>
    </div>
  );
};
