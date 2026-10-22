import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { CountdownState } from '../../hooks/useCountdown';

interface UrgencyTimerProps {
  countdown: CountdownState;
  label?: string;
  isPaused?: boolean;
}

export const UrgencyTimer: React.FC<UrgencyTimerProps> = ({
  countdown,
  label = 'TIME REMAINING',
  isPaused = false,
}) => {
  const { formattedTime, secondsLeft, isUrgent, isCritical, progressPercent } = countdown;

  return (
    <div
      className={`relative w-full rounded-xl border-2 transition-colors overflow-hidden ${
        isPaused
          ? 'bg-neutral-900 border-neutral-700'
          : isCritical
          ? 'bg-psych-red/10 border-psych-red shadow-brutal-red animate-pulse'
          : isUrgent
          ? 'bg-psych-yellow/10 border-psych-yellow shadow-brutal'
          : 'bg-psych-cardBg border-psych-borderDark'
      }`}
    >
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertTriangle className="w-4 h-4 text-psych-red animate-bounce" />
          ) : (
            <Clock className={`w-4 h-4 ${isUrgent ? 'text-psych-yellow' : 'text-neutral-400'}`} />
          )}
          <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400">
            {isPaused ? 'TIMER PAUSED' : label}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span
            className={`font-mono font-black text-2xl md:text-3xl tracking-tight transition-colors ${
              isCritical
                ? 'text-psych-red'
                : isUrgent
                ? 'text-psych-yellow'
                : 'text-white'
            }`}
          >
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Progress line */}
      <div className="w-full h-1.5 bg-neutral-800">
        <div
          className={`h-full transition-all duration-300 ease-linear ${
            isCritical
              ? 'bg-psych-red'
              : isUrgent
              ? 'bg-psych-yellow'
              : 'bg-neutral-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
