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
 */
export function useCountdown(
  deadline: number,
  totalDurationSeconds: number = 120,
  isPaused: boolean = false,
  onExpire?: () => void
): CountdownState {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!deadline) return totalDurationSeconds;
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  });

  const hasExpiredRef = useRef(false);
  const lastSoundSecondRef = useRef<number>(-1);

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

      if (secs === 0 && !hasExpiredRef.current) {
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

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const totalMs = totalDurationSeconds * 1000;
  const currentMs = Math.max(0, deadline - Date.now());
  const progressPercent = Math.min(100, Math.max(0, (currentMs / totalMs) * 100));

  return {
    secondsLeft,
    formattedTime,
    isUrgent: secondsLeft <= 30 && secondsLeft > 10,
    isCritical: secondsLeft <= 10 && secondsLeft > 0,
    isExpired: secondsLeft === 0,
    progressPercent,
  };
}
