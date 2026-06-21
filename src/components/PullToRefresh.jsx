import React, { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      e.preventDefault();
      setPullY(Math.min(dy * 0.5, THRESHOLD));
    }
  };

  const handleTouchEnd = async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPullY(0);
    startY.current = null;
  };

  const indicatorOpacity = Math.min(pullY / THRESHOLD, 1);
  const spin = refreshing || pullY >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehaviorY: 'none' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200"
        style={{ height: pullY > 0 || refreshing ? (refreshing ? THRESHOLD : pullY) : 0, opacity: indicatorOpacity }}
      >
        <div className={`w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center ${spin ? 'animate-spin' : ''}`}>
          <RefreshCw size={14} className="text-primary" />
        </div>
      </div>
      {children}
    </div>
  );
}