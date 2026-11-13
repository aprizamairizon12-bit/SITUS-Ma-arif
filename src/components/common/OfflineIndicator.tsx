import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:right-auto md:max-w-md z-50 flex items-center gap-3 rounded-xl bg-amber-500 text-slate-950 px-4 py-3 shadow-xl border border-amber-600 animate-bounce">
      <div className="p-2 bg-amber-600/30 rounded-lg">
        <WifiOff className="w-5 h-5 text-slate-950" />
      </div>
      <div className="text-xs">
        <p className="font-bold">Koneksi Internet Terputus</p>
        <p className="opacity-90">Mode luring aktif. Data perubahan baru tidak tersimpan ke server online sampai koneksi terhubung kembali.</p>
      </div>
    </div>
  );
};
