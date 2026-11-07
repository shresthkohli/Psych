import React, { useState, useEffect } from 'react';
import type { ServiceResult } from '../../types/game';
import { GAME_LIMITS } from '../../constants/gameLimits';

export const MaxPlayersControl: React.FC<{
  value?: number;
  onSave: (n: number) => Promise<ServiceResult>;
}> = ({ value, onSave }) => {
  const [input, setInput] = useState<number>(value ?? GAME_LIMITS.DEFAULT_MAX_PLAYERS);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInput(value ?? GAME_LIMITS.DEFAULT_MAX_PLAYERS);
  }, [value]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await onSave(input);
      setError(res.success ? null : res.error ?? 'Could not update.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1 pt-1 pb-2">
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Max players
        </label>
        <input
          type="number"
          min={GAME_LIMITS.MIN_PLAYERS_LIMIT}
          max={GAME_LIMITS.MAX_PLAYERS_CAP}
          value={input}
          onChange={(e) => setInput(Number(e.target.value))}
          className="w-24 p-2 bg-psych-black border border-neutral-700 rounded-xl text-white text-sm focus:border-psych-yellow focus:outline-none"
        />
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="px-3 py-2 bg-psych-yellow hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-psych-black font-extrabold text-xs rounded-xl uppercase"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {error && <p className="text-xs text-psych-red">{error}</p>}
    </div>
  );
};

