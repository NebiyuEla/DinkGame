import React, { useEffect, useState } from 'react';
import DinkLogo from '@/components/DinkLogo';

export default function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 1500);
    const t2 = setTimeout(() => onDone(), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`fixed inset-0 z-[9999] dink-orange-field flex flex-col items-center justify-center transition-opacity duration-500 ${hiding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <DinkLogo transparent size="xl" className="rounded-none shadow-none animate-splash" />
    </div>
  );
}
