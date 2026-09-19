import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

const ColdStartBanner = () => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'waking' | 'ready'

  useEffect(() => {
    const handleWaking = () => {
      setStatus('waking');
    };

    const handleReady = () => {
      setStatus('ready');
      const timer = setTimeout(() => {
        setStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('backend-waking-up', handleWaking);
    window.addEventListener('backend-ready', handleReady);

    return () => {
      window.removeEventListener('backend-waking-up', handleWaking);
      window.removeEventListener('backend-ready', handleReady);
    };
  }, []);

  if (status === 'idle') return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      {status === 'waking' ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/90 text-white backdrop-blur-md shadow-xl border border-amber-500/30 text-xs sm:text-sm font-medium">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </div>
          <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>Waking up cloud server (Render free tier)... Almost ready!</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/90 text-emerald-200 backdrop-blur-md shadow-xl border border-emerald-500/30 text-xs sm:text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Server online & ready! 🚀</span>
        </div>
      )}
    </div>
  );
};

export default ColdStartBanner;
