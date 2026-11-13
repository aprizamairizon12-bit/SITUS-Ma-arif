import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SchoolSetting } from '../types';
import { DEFAULT_SCHOOL_SETTINGS } from '../utils/sampleData';

interface SettingsContextType {
  settings: SchoolSetting;
  loading: boolean;
  updateSettings: (newSettings: Partial<SchoolSetting>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SchoolSetting>(DEFAULT_SCHOOL_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'profile');

    const unsubscribe = onSnapshot(settingsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.schoolName !== DEFAULT_SCHOOL_SETTINGS.schoolName || !data.foundationLine1) {
          const merged = { ...DEFAULT_SCHOOL_SETTINGS, ...data, schoolName: DEFAULT_SCHOOL_SETTINGS.schoolName, foundationLine1: DEFAULT_SCHOOL_SETTINGS.foundationLine1, foundationLine2: DEFAULT_SCHOOL_SETTINGS.foundationLine2, nss: DEFAULT_SCHOOL_SETTINGS.nss, nisCode: DEFAULT_SCHOOL_SETTINGS.nisCode, npsn: DEFAULT_SCHOOL_SETTINGS.npsn, accreditationStatus: DEFAULT_SCHOOL_SETTINGS.accreditationStatus, logoLeftUrl: DEFAULT_SCHOOL_SETTINGS.logoLeftUrl, logoRightUrl: DEFAULT_SCHOOL_SETTINGS.logoRightUrl };
          setDoc(settingsDocRef, merged, { merge: true }).catch(() => {});
          setSettings(merged as SchoolSetting);
        } else {
          setSettings({ ...DEFAULT_SCHOOL_SETTINGS, ...data } as SchoolSetting);
        }
      } else {
        // Bootstrap default settings into Firestore
        setDoc(settingsDocRef, DEFAULT_SCHOOL_SETTINGS).catch(err => {
          console.warn("Could not save initial settings to Firestore (will use local fallback):", err);
        });
        setSettings(DEFAULT_SCHOOL_SETTINGS);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Settings listener fallback:", error);
      setSettings(DEFAULT_SCHOOL_SETTINGS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<SchoolSetting>) => {
    const updated = {
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);

    try {
      const settingsDocRef = doc(db, 'settings', 'profile');
      await setDoc(settingsDocRef, updated, { merge: true });
    } catch (e) {
      console.error("Failed to update settings in Firestore:", e);
    }
  };

  const resetToDefaults = async () => {
    try {
      const settingsDocRef = doc(db, 'settings', 'profile');
      await setDoc(settingsDocRef, DEFAULT_SCHOOL_SETTINGS);
      setSettings(DEFAULT_SCHOOL_SETTINGS);
    } catch (e) {
      console.error("Failed to reset settings:", e);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, resetToDefaults }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
