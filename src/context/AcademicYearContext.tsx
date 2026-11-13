import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AcademicYear } from '../types';
import { useSettings } from './SettingsContext';

export interface YearUsageBreakdown {
  rombels: number;
  rombelMembers: number;
  attendance: number;
  teacherBooks: number;
  createdLetters: number;
  incomingLetters: number;
  outgoingLetters: number;
  archives: number;
  invoices: number;
  total: number;
}

interface AcademicYearContextType {
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear | null;
  activeYearName: string;
  activeSemester: 'Ganjil' | 'Genap';
  academicYearNames: string[];
  loading: boolean;
  addAcademicYear: (data: Omit<AcademicYear, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateAcademicYear: (id: string, data: Partial<Omit<AcademicYear, 'id' | 'createdAt'>>) => Promise<void>;
  activateAcademicYear: (id: string, semester?: 'Ganjil' | 'Genap') => Promise<void>;
  deactivateAcademicYear: (id: string) => Promise<void>;
  changeSemester: (id: string, semester: 'Ganjil' | 'Genap') => Promise<void>;
  checkYearUsage: (yearName: string) => Promise<YearUsageBreakdown>;
  deleteAcademicYear: (year: AcademicYear) => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

const DEFAULT_FALLBACK_YEAR: AcademicYear = {
  id: 'fallback_2026_2027',
  startYear: 2026,
  endYear: 2027,
  name: '2026/2027',
  activeSemester: 'Ganjil',
  startDate: '2026-07-13',
  endDate: '2027-06-19',
  status: 'Aktif',
  notes: 'Tahun pelajaran awal sistem SITUS SMAS Ma’arif 05 Padang Ratu',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const AcademicYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seededOnce, setSeededOnce] = useState<boolean>(false);
  const [migratedTo2026, setMigratedTo2026] = useState<boolean>(false);

  useEffect(() => {
    const qYears = collection(db, 'academic_years');
    const unsub = onSnapshot(
      qYears,
      async (snapshot) => {
        if (snapshot.empty && !seededOnce) {
          setSeededOnce(true);
          try {
            const parsedSettingStart = parseInt((settings.academicYear || '').split('/')[0] || '0', 10);
            const startY = parsedSettingStart >= 2026 ? parsedSettingStart : 2026;
            const endY = startY + 1;
            const initialName = `${startY}/${endY}`;
            const now = new Date().toISOString();

            const batch = writeBatch(db);
            const refActive = doc(collection(db, 'academic_years'));
            batch.set(refActive, {
              startYear: startY,
              endYear: endY,
              name: initialName,
              activeSemester: settings.activeSemester || 'Ganjil',
              startDate: `${startY}-07-13`,
              endDate: `${endY}-06-19`,
              status: 'Aktif',
              notes: 'Tahun pelajaran aktif bawaan sistem',
              createdAt: now,
              updatedAt: now,
            });

            const refNext = doc(collection(db, 'academic_years'));
            batch.set(refNext, {
              startYear: startY + 1,
              endYear: endY + 1,
              name: `${startY + 1}/${endY + 1}`,
              activeSemester: 'Ganjil',
              startDate: `${startY + 1}-07-12`,
              endDate: `${endY + 1}-06-18`,
              status: 'Tidak Aktif',
              notes: 'Persiapan tahun pelajaran berikutnya',
              createdAt: now,
              updatedAt: now,
            });

            await batch.commit();
            if (settings.academicYear !== initialName) {
              await updateSettings({
                academicYear: initialName,
                activeSemester: settings.activeSemester || 'Ganjil',
              });
            }
            return;
          } catch (err) {
            console.warn('Auto-seed academic_years note:', err);
          }
        }

        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as AcademicYear))
          .sort((a, b) => {
            if (b.startYear !== a.startYear) return b.startYear - a.startYear;
            return b.name.localeCompare(a.name);
          });

        // One-time migration: if Firestore only holds old auto-seeded pre-2026 defaults (e.g. 2024/2025, 2025/2026)
        // and does not yet have 2026/2027, start the academic years cleanly from 2026/2027 without deleting used historical data.
        const has2026OrNewer = list.some((y) => y.startYear >= 2026);
        const isOnlyOldAutoSeeds =
          list.length > 0 &&
          list.every(
            (y) =>
              y.startYear < 2026 &&
              (y.name === '2024/2025' ||
                y.name === '2025/2026' ||
                (y.notes || '').includes('bawaan sistem') ||
                (y.notes || '').includes('Persiapan tahun pelajaran'))
          );

        if (!has2026OrNewer && isOnlyOldAutoSeeds && !migratedTo2026) {
          setMigratedTo2026(true);
          try {
            const now = new Date().toISOString();
            const batch = writeBatch(db);

            for (const oldYear of list) {
              const usage = await checkYearUsage(oldYear.name);
              if (usage.total === 0) {
                batch.delete(doc(db, 'academic_years', oldYear.id));
              } else if (oldYear.status === 'Aktif') {
                batch.update(doc(db, 'academic_years', oldYear.id), {
                  status: 'Tidak Aktif',
                  updatedAt: now,
                });
              }
            }

            const ref2026 = doc(collection(db, 'academic_years'));
            batch.set(ref2026, {
              startYear: 2026,
              endYear: 2027,
              name: '2026/2027',
              activeSemester: 'Ganjil',
              startDate: '2026-07-13',
              endDate: '2027-06-19',
              status: 'Aktif',
              notes: 'Tahun pelajaran aktif bawaan sistem',
              createdAt: now,
              updatedAt: now,
            });

            const ref2027 = doc(collection(db, 'academic_years'));
            batch.set(ref2027, {
              startYear: 2027,
              endYear: 2028,
              name: '2027/2028',
              activeSemester: 'Ganjil',
              startDate: '2027-07-12',
              endDate: '2028-06-18',
              status: 'Tidak Aktif',
              notes: 'Persiapan tahun pelajaran berikutnya',
              createdAt: now,
              updatedAt: now,
            });

            await batch.commit();
            await updateSettings({
              academicYear: '2026/2027',
              activeSemester: 'Ganjil',
            });
            return;
          } catch (err) {
            console.warn('Migration to 2026/2027 note:', err);
          }
        }

        setAcademicYears(list);
        setLoading(false);
      },
      (err) => {
        console.warn('AcademicYear listener fallback:', err);
        setAcademicYears([DEFAULT_FALLBACK_YEAR]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [seededOnce, migratedTo2026, settings.academicYear, settings.activeSemester]);

  const activeAcademicYear = useMemo(() => {
    const found = academicYears.find((y) => y.status === 'Aktif');
    if (found) return found;
    if (academicYears.length > 0) return null;
    return DEFAULT_FALLBACK_YEAR;
  }, [academicYears]);

  const activeYearName = useMemo(() => {
    return activeAcademicYear?.name || settings.academicYear || '2026/2027';
  }, [activeAcademicYear, settings.academicYear]);

  const activeSemester: 'Ganjil' | 'Genap' = useMemo(() => {
    return activeAcademicYear?.activeSemester || settings.activeSemester || 'Ganjil';
  }, [activeAcademicYear, settings.activeSemester]);

  const academicYearNames = useMemo(() => {
    const set = new Set<string>();
    academicYears.forEach((y) => set.add(y.name));
    if (academicYears.length === 0 && settings.academicYear) {
      set.add(settings.academicYear);
    }
    if (set.size === 0) set.add('2026/2027');
    return Array.from(set).sort().reverse();
  }, [academicYears, settings.academicYear]);

  const addAcademicYear = async (data: Omit<AcademicYear, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const normalizedName = data.name.trim();
    const exists = academicYears.some((y) => y.name.trim().toLowerCase() === normalizedName.toLowerCase());
    if (exists) {
      throw new Error(`Tahun pelajaran "${normalizedName}" sudah terdaftar.`);
    }

    const now = new Date().toISOString();
    if (data.status === 'Aktif') {
      const batch = writeBatch(db);
      academicYears.forEach((y) => {
        if (y.status === 'Aktif') {
          batch.update(doc(db, 'academic_years', y.id), {
            status: 'Tidak Aktif',
            updatedAt: now,
          });
        }
      });
      const newRef = doc(collection(db, 'academic_years'));
      batch.set(newRef, {
        ...data,
        name: normalizedName,
        createdAt: now,
        updatedAt: now,
      });
      await batch.commit();
      await updateSettings({
        academicYear: normalizedName,
        activeSemester: data.activeSemester,
      });
      return newRef.id;
    } else {
      const created = await addDoc(collection(db, 'academic_years'), {
        ...data,
        name: normalizedName,
        createdAt: now,
        updatedAt: now,
      });
      return created.id;
    }
  };

  const updateAcademicYear = async (id: string, data: Partial<Omit<AcademicYear, 'id' | 'createdAt'>>) => {
    if (data.name) {
      const normalizedName = data.name.trim();
      const exists = academicYears.some(
        (y) => y.id !== id && y.name.trim().toLowerCase() === normalizedName.toLowerCase()
      );
      if (exists) {
        throw new Error(`Tahun pelajaran "${normalizedName}" sudah ada.`);
      }
      data = { ...data, name: normalizedName };
    }

    const now = new Date().toISOString();
    if (data.status === 'Aktif') {
      const batch = writeBatch(db);
      academicYears.forEach((y) => {
        if (y.id !== id && y.status === 'Aktif') {
          batch.update(doc(db, 'academic_years', y.id), {
            status: 'Tidak Aktif',
            updatedAt: now,
          });
        }
      });
      batch.update(doc(db, 'academic_years', id), {
        ...data,
        updatedAt: now,
      });
      await batch.commit();

      const target = academicYears.find((y) => y.id === id);
      await updateSettings({
        academicYear: data.name || target?.name || settings.academicYear,
        activeSemester: data.activeSemester || target?.activeSemester || 'Ganjil',
      });
    } else {
      await updateDoc(doc(db, 'academic_years', id), {
        ...data,
        updatedAt: now,
      });
      const target = academicYears.find((y) => y.id === id);
      if (target?.status === 'Aktif' && (data.name || data.activeSemester)) {
        await updateSettings({
          academicYear: data.name || target.name,
          activeSemester: data.activeSemester || target.activeSemester,
        });
      }
    }
  };

  const activateAcademicYear = async (id: string, semester?: 'Ganjil' | 'Genap') => {
    const target = academicYears.find((y) => y.id === id);
    if (!target) throw new Error('Data tahun pelajaran tidak ditemukan.');

    const now = new Date().toISOString();
    const targetSemester = semester || target.activeSemester || 'Ganjil';
    const batch = writeBatch(db);

    academicYears.forEach((y) => {
      if (y.id === id) {
        batch.update(doc(db, 'academic_years', y.id), {
          status: 'Aktif',
          activeSemester: targetSemester,
          updatedAt: now,
        });
      } else if (y.status === 'Aktif') {
        batch.update(doc(db, 'academic_years', y.id), {
          status: 'Tidak Aktif',
          updatedAt: now,
        });
      }
    });

    await batch.commit();
    await updateSettings({
      academicYear: target.name,
      activeSemester: targetSemester,
    });
  };

  const deactivateAcademicYear = async (id: string) => {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'academic_years', id), {
      status: 'Tidak Aktif',
      updatedAt: now,
    });
  };

  const changeSemester = async (id: string, semester: 'Ganjil' | 'Genap') => {
    const target = academicYears.find((y) => y.id === id);
    if (!target) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'academic_years', id), {
      activeSemester: semester,
      updatedAt: now,
    });
    if (target.status === 'Aktif') {
      await updateSettings({
        academicYear: target.name,
        activeSemester: semester,
      });
    }
  };

  const checkYearUsage = async (yearName: string): Promise<YearUsageBreakdown> => {
    const [
      rombelsSnap,
      membersSnap,
      attendanceSnap,
      booksSnap,
      createdLettersSnap,
      incomingSnap,
      outgoingSnap,
      archivesSnap,
      invoicesSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'rombels'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'rombel_members'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'class_attendance'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'teacher_books'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'createdLetters'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'incomingLetters'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'outgoingLetters'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'archives'), where('academicYear', '==', yearName))),
      getDocs(query(collection(db, 'studentInvoices'), where('academicYear', '==', yearName))),
    ]);

    const breakdown: YearUsageBreakdown = {
      rombels: rombelsSnap.size,
      rombelMembers: membersSnap.size,
      attendance: attendanceSnap.size,
      teacherBooks: booksSnap.size,
      createdLetters: createdLettersSnap.size,
      incomingLetters: incomingSnap.size,
      outgoingLetters: outgoingSnap.size,
      archives: archivesSnap.size,
      invoices: invoicesSnap.size,
      total:
        rombelsSnap.size +
        membersSnap.size +
        attendanceSnap.size +
        booksSnap.size +
        createdLettersSnap.size +
        incomingSnap.size +
        outgoingSnap.size +
        archivesSnap.size +
        invoicesSnap.size,
    };

    return breakdown;
  };

  const deleteAcademicYear = async (year: AcademicYear) => {
    if (year.status === 'Aktif') {
      throw new Error('Tahun pelajaran yang sedang aktif tidak dapat dihapus. Nonaktifkan atau aktifkan tahun lain terlebih dahulu.');
    }

    const usage = await checkYearUsage(year.name);
    if (usage.total > 0) {
      throw new Error(
        `Tahun pelajaran ${year.name} sudah digunakan pada ${usage.total} data (Rombel: ${usage.rombels}, Siswa Rombel: ${usage.rombelMembers}, Presensi: ${usage.attendance}, Buku Guru: ${usage.teacherBooks}, Persuratan/Arsip: ${
          usage.createdLetters + usage.incomingLetters + usage.outgoingLetters + usage.archives + usage.invoices
        }) dan tidak boleh dihapus demi menjaga arsip historis.`
      );
    }

    await deleteDoc(doc(db, 'academic_years', year.id));
  };

  return (
    <AcademicYearContext.Provider
      value={{
        academicYears,
        activeAcademicYear,
        activeYearName,
        activeSemester,
        academicYearNames,
        loading,
        addAcademicYear,
        updateAcademicYear,
        activateAcademicYear,
        deactivateAcademicYear,
        changeSemester,
        checkYearUsage,
        deleteAcademicYear,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  return ctx;
};
