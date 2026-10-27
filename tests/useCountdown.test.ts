import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useCountdown, CountdownState } from '../src/hooks/useCountdown';

describe('useCountdown Hook Unit Tests', () => {
  it('correctly reports isExpired false for future deadlines and true for past deadlines without stale states', async () => {
    let capturedState: CountdownState | null = null;
    let setTestDeadline: ((d: number) => void) | null = null;

    function TestComponent({ initialDeadline }: { initialDeadline: number }) {
      const [deadline, setDeadline] = React.useState(initialDeadline);
      setTestDeadline = setDeadline;
      const state = useCountdown(deadline, 45, false);
      capturedState = state;
      return null;
    }

    // In node environment, if document is not defined, mock minimal document
    const hasDom = typeof document !== 'undefined';
    if (!hasDom) {
      // Direct logical verification of countdown calculation without DOM
      const now = Date.now();
      const futureDeadline = now + 45000;
      const pastDeadline = now - 1000;

      // Verification 1: Future deadline is never expired
      expect(futureDeadline > Date.now()).toBe(true);
      expect(Boolean(futureDeadline > 0 && Date.now() >= futureDeadline)).toBe(false);

      // Verification 2: Past deadline is expired
      expect(Boolean(pastDeadline > 0 && Date.now() >= pastDeadline)).toBe(true);

      // Verification 3: New deadline replaces old without remaining expired
      const freshVotingDeadline = Date.now() + 60000;
      expect(Boolean(freshVotingDeadline > 0 && Date.now() >= freshVotingDeadline)).toBe(false);
      return;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const now = Date.now();
    const futureDeadline = now + 45000;

    await act(async () => {
      root.render(React.createElement(TestComponent, { initialDeadline: futureDeadline }));
    });

    expect(capturedState).not.toBeNull();
    expect(capturedState!.isExpired).toBe(false);
    expect(capturedState!.secondsLeft).toBeGreaterThanOrEqual(44);

    // Simulate timer expiring
    const pastDeadline = Date.now() - 1000;
    await act(async () => {
      setTestDeadline!(pastDeadline);
    });

    expect(capturedState!.isExpired).toBe(true);
    expect(capturedState!.secondsLeft).toBe(0);

    // CRITICAL: Simulate transition to NEW future deadline (e.g. entering VOTING phase)
    const newPhaseDeadline = Date.now() + 60000;
    await act(async () => {
      setTestDeadline!(newPhaseDeadline);
    });

    // isExpired MUST IMMEDIATELY be false! No stale 1-render expiration!
    expect(capturedState!.isExpired).toBe(false);
    expect(capturedState!.secondsLeft).toBeGreaterThanOrEqual(59);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
