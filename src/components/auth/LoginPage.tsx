import React, { useState } from 'react';
import { Shield, KeyRound, Mail, ArrowRight, UserCheck, AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginWithGoogle, loginAsDemoRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setErrorMsg('Login gagal: Periksa kembali email dan kata sandi Anda atau gunakan akses instan di bawah.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg('Google Sign-in gagal: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (role: UserRole) => {
    loginAsDemoRole(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1128] via-[#101f42] to-[#0d162d] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        {/* App Logo & School Header */}
        <div className="text-center space-y-2">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-xl border border-amber-400/40 flex items-center justify-center">
            <img src="/logo_sekolah.png" alt="Logo SMAS Ma'arif 05" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-blue-950 dark:text-white">
              SITUS
            </h1>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              SMAS MA'ARIF 05 PADANG RATU
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Sistem Informasi Tata Usaha Sekolah Terpadu
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Alamat Email / NIP
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="nama@smamaarif05.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Kata Sandi (Password)
              </label>
              <button
                type="button"
                onClick={() => alert('Silakan hubungi Super Admin Tata Usaha untuk mengatur ulang kata sandi Anda.')}
                className="text-[10px] text-blue-600 hover:underline"
              >
                Lupa Password?
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Sedang Masuk...' : 'Masuk ke Sistem'}</span>
          </button>
        </form>

        {/* Google Sign-in */}
        <div className="pt-2">
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
            <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              atau
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Masuk dengan Google Workspace</span>
          </button>
        </div>

        {/* 1-Click Instant Role Demo Login for Evaluators & Verification */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-500 text-center mb-2">
            Akses Cepat Pengujian Peran (1-Klik):
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => handleQuickDemo('super_admin')}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900 cursor-pointer text-center"
            >
              Super Admin
            </button>
            <button
              onClick={() => handleQuickDemo('admin_tu')}
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900 cursor-pointer text-center"
            >
              Admin Tata Usaha
            </button>
            <button
              onClick={() => handleQuickDemo('kepala_sekolah')}
              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900 cursor-pointer text-center"
            >
              Kepala Sekolah
            </button>
            <button
              onClick={() => handleQuickDemo('operator')}
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900 cursor-pointer text-center"
            >
              Operator Dapodik
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
