import React, { useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';

const COLORS = ['#7C3AED', '#2563EB', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];

function MiniConfetti({ active }) {
  const canvasRef = useRef(null);
  const pRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    pRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 60,
      w: Math.random() * 9 + 4,
      h: Math.random() * 5 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: Math.random() * 5 + 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.18,
      drift: (Math.random() - 0.5) * 2.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pRef.current.forEach(p => {
        p.y += p.speed; p.x += p.drift; p.angle += p.spin;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      pRef.current = pRef.current.filter(p => p.y < canvas.height + 20);
      if (pRef.current.length > 0) animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />;
}

// Sound via Web Audio API
function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.3);
    });
  } catch (e) {}
}

function playWrongSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

function playWinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const melody = [523, 659, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t); osc.stop(t + 0.35);
    });
  } catch (e) {}
}

export { playCorrectSound, playWrongSound, playWinSound };

// Correct answer burst overlay
export function CorrectBurst({ points, onDone }) {
  useEffect(() => {
    playCorrectSound();
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <MiniConfetti active />
      <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
        <div className="animate-bounce-in flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-correct-green flex items-center justify-center shadow-2xl glow-green">
            <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="bg-correct-green/90 px-5 py-2 rounded-full">
            <span className="font-game font-black text-white text-lg">+{points} pts</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Win celebration
export function WinCelebration({ onDone }) {
  useEffect(() => {
    playWinSound();
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <MiniConfetti active />
      <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
        <div className="animate-bounce-in text-center px-8">
          <div className="w-24 h-24 rounded-full gradient-gold flex items-center justify-center mx-auto mb-4 glow-gold shadow-2xl">
            <Trophy size={44} className="text-white" />
          </div>
          <h2 className="font-game font-black text-3xl text-foreground">You Won!</h2>
          <p className="text-muted-foreground mt-1 font-medium">Incredible performance!</p>
        </div>
      </div>
    </>
  );
}

// Import Trophy for WinCelebration
import { Trophy } from 'lucide-react';