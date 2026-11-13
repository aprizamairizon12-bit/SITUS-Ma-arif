import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginAsDemoRole: (role: UserRole) => Promise<void>;
  updateRole: (userId: string, newRole: UserRole) => Promise<void>;
  toggleUserActive: (userId: string, currentStatus: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync Firebase Auth user and Firestore user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Determine initial role
            const isSuperAdminEmail = user.email === 'aprizamairizon12@gmail.com';
            const initialRole: UserRole = isSuperAdminEmail ? 'super_admin' : 'admin_tu';

            const newProfile: UserProfile = {
              id: user.uid,
              email: user.email || 'user@smamaarif05.sch.id',
              displayName: user.displayName || 'Staf Tata Usaha',
              role: initialRole,
              isActive: true,
              avatarUrl: user.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };

            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback profile for uninterrupted operation
          setProfile({
            id: user.uid,
            email: user.email || 'admin@smamaarif05.sch.id',
            displayName: user.displayName || 'Administrator',
            role: 'super_admin',
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // If not logged in, check if a demo session exists in sessionStorage
        const savedDemoRole = sessionStorage.getItem('situs_demo_role') as UserRole | null;
        if (savedDemoRole) {
          setProfile({
            id: 'demo_' + savedDemoRole,
            email: `${savedDemoRole}@smamaarif05padangratu.sch.id`,
            displayName: getDemoName(savedDemoRole),
            role: savedDemoRole,
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        } else {
          // Default to Super Admin for immediate convenient access
          const defaultRole: UserRole = 'super_admin';
          setProfile({
            id: 'default_super_admin',
            email: 'aprizamairizon12@gmail.com',
            displayName: 'Ahmad Fauzi, S.Kom. (Super Admin)',
            role: defaultRole,
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function getDemoName(role: UserRole): string {
    switch (role) {
      case 'super_admin':
        return 'Administrator Sistem (Super Admin)';
      case 'admin_tu':
        return 'Ahmad Fauzi, S.Kom. (Admin Tata Usaha)';
      case 'kepala_sekolah':
        return 'H. M. Syaifullah, S.Pd.I., M.Pd. (Kepala Sekolah)';
      case 'operator':
        return 'Muhammad Rizki, S.T. (Operator Dapodik)';
      case 'guru':
        return 'Guru Pengampu Mata Pelajaran';
      default:
        return 'Pengguna Terdaftar';
    }
  }

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      sessionStorage.removeItem('situs_demo_role');
    } catch (err) {
      console.error("Google sign in error:", err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      sessionStorage.removeItem('situs_demo_role');
    } catch (err) {
      console.error("Email sign in error:", err);
      throw err;
    }
  };

  const loginAsDemoRole = async (role: UserRole) => {
    sessionStorage.setItem('situs_demo_role', role);
    const demoProf: UserProfile = {
      id: 'demo_' + role,
      email: `${role}@smamaarif05padangratu.sch.id`,
      displayName: getDemoName(role),
      role: role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setProfile(demoProf);
  };

  const updateRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      if (profile && profile.id === userId) {
        setProfile({ ...profile, role: newRole });
      }
    } catch (e) {
      console.error("Failed to update role:", e);
    }
  };

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
    } catch (e) {
      console.error("Failed to toggle status:", e);
    }
  };

  const logout = async () => {
    sessionStorage.removeItem('situs_demo_role');
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error", err);
    }
    // Set to guest state
    setProfile(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return roles.includes(profile.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        loginWithGoogle,
        loginWithEmail,
        loginAsDemoRole,
        updateRole,
        toggleUserActive,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
