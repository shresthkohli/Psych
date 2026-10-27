import { useState, useEffect, useRef } from 'react';
import { soundManager } from '../lib/audio';

export interface CountdownState {
  secondsLeft: number;
  formattedTime: string;
  isUrgent: boolean; // < 30s
  isCritical: boolean; // < 10s
  isExpired: boolean;
  progressPercent: number; // 0 to 100
}

/**
 * Server-authoritative countdown timer hook.
 * Recalculates directly from phaseDeadline - Date.now().
 * Pauses if isPaused is true.
 * Triggers sound effects at urgency thresholds (<10s) and expiration if enabled.
 *
 * CRITICAL FIX: Stale timer prevention.
 * `isExpired` is strictly derived from `(deadline > 0 && !isPaused && Date.now() >= deadline)`.
 * It is mathematically impossible for a new future deadline to report `isExpired: true`.
 * `secondsLeft` is immediately synchronized whenever `deadline` changes.
 */
export function useCountdown(
  deadline: number,
  totalDurationSeconds: number = 120,
  isPaused: boolean = false,
  onExpire?: () => void
): CountdownState {
  const computeSecondsLeft = (dl: number) => {
    if (!dl) return totalDurationSeconds;
    return Math.max(0, Math.ceil((dl - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(() => computeSecondsLeft(deadline));

  // Synchronize state synchronously during render when deadline changes to eliminate 1-render lag
  const prevDeadlineRef = useRef(deadline);
  if (prevDeadlineRef.current !== deadline) {
    prevDeadlineRef.current = deadline;
    setSecondsLeft(computeSecondsLeft(deadline));
  }

  const hasExpiredRef = useRef(false);
  const lastSoundSecondRef = useRef<number>(-1);

  // Compute live remaining values directly from deadline and Date.now()
  const now = Date.now();
  const isExpired = Boolean(deadline > 0 && !isPaused && now >= deadline);
  const currentMs = !deadline ? totalDurationSeconds * 1000 : Math.max(0, deadline - now);
  const effectiveSecondsLeft = deadline > 0 ? Math.max(0, Math.ceil(currentMs / 1000)) : secondsLeft;

  useEffect(() => {
    if (!deadline || isPaused) {
      return;
    }

    const calculate = () => {
      const remainingMs = deadline - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(secs);

      // Sound triggers
      if (secs <= 10 && secs > 0 && secs !== lastSoundSecondRef.current) {
        lastSoundSecondRef.current = secs;
        soundManager.playUrgentTick();
      }

      if (remainingMs <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        soundManager.playTimeUp();
        if (onExpire) {
          onExpire();
        }
      }
    };

    // Calculate immediately
    calculate();

    const interval = setInterval(calculate, 250);
    return () => clearInterval(interval);
  }, [deadline, isPaused, onExpire]);

  // Reset expired ref when deadline changes
  useEffect(() => {
    hasExpiredRef.current = false;
    lastSoundSecondRef.current = -1;
  }, [deadline]);

  const mins = Math.floor(effectiveSecondsLeft / 60);
  const secs = effectiveSecondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const totalMs = totalDurationSeconds * 1000;
  const progressPercent = Math.min(100, Math.max(0, (currentMs / totalMs) * 100));

  return {
    secondsLeft: effectiveSecondsLeft,
    formattedTime,
    isUrgent: effectiveSecondsLeft <= 30 && effectiveSecondsLeft > 10,
    isCritical: effectiveSecondsLeft <= 10 && effectiveSecondsLeft > 0,
    isExpired,
    progressPercent,
  };
}
