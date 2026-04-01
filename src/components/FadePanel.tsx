'use client';

import { useState, useEffect } from 'react';

interface FadePanelProps {
  children: React.ReactNode;
  duration?: 200 | 300 | 400;
}

export function FadePanel({ children, duration = 300 }: FadePanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const durationClass =
    duration === 200 ? 'duration-200' :
    duration === 400 ? 'duration-400' :
    'duration-300';

  return (
    <div className={`transition-opacity ease-in-out ${durationClass} ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}
