import { useEffect, useRef, useState } from 'react';

export function useAnimatedNumber(target: number, duration: number = 600): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const initial = useRef(0);

  useEffect(() => {
    startRef.current = null;
    initial.current = value;
    let raf = 0;

    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(initial.current + (target - initial.current) * ease));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
