import React, { useState, useEffect, useRef } from 'react';

export default function CountdownTimer({ targetDate, onEnd, compact = false }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!targetDate) return;
    endedRef.current = false;
    setEnded(false);

    const calculate = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        if (!endedRef.current) {
          endedRef.current = true;
          setEnded(true);
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          onEnd && onEnd();
        }
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    calculate();
    const id = setInterval(calculate, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (ended) return null;

  if (compact) {
    const { days, hours, minutes } = timeLeft;
    return (
      <span className="font-game text-primary font-bold text-sm">
        {days > 0 ? `${days}d ` : ''}{String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m
      </span>
    );
  }

  const units = [
    { label: 'DAYS', value: timeLeft.days },
    { label: 'HRS', value: timeLeft.hours },
    { label: 'MIN', value: timeLeft.minutes },
    { label: 'SEC', value: timeLeft.seconds },
  ];

  // Only show non-zero leading units
  const filtered = units.filter((u, i) => i >= units.findIndex(x => x.value > 0) || i === units.length - 1);

  return (
    <div className="flex gap-2 justify-center">
      {filtered.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="bg-card border border-border rounded-xl w-16 h-16 flex items-center justify-center shadow-sm">
            <span className="font-game text-2xl font-black text-foreground" key={value}>
              {String(value).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-1 font-bold tracking-widest">{label}</span>
        </div>
      ))}
    </div>
  );
}