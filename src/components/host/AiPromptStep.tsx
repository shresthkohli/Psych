import React, { useRef, useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { GAME_LIMITS } from '../../constants/gameLimits';
import {
  MOODS,
  BRUTALITY_LEVELS,
  NATURES,
  DEFAULT_MOOD_ID,
  DEFAULT_BRUTALITY_ID,
  DEFAULT_NATURE_ID,
  AiPromptOption,
} from '../../constants/aiPromptOptions';
import { buildAiQuestionPrompt } from '../../lib/aiPrompt';

export interface AiPromptStepProps {
  eventLabel: string;
  roomName: string;
  maxAnswerWords: number;
  nicknames: string[];
  remainingSlots: number;
  onNext: () => void;
}

const OptionGroup: React.FC<{
  label: string;
  options: readonly AiPromptOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ label, options, selectedId, onSelect }) => (
  <div className="space-y-1.5">
    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.id === selectedId;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              active
                ? 'bg-psych-yellow text-psych-black border-psych-yellow'
                : 'bg-psych-black text-neutral-300 border-neutral-700 hover:border-neutral-500'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

export const AiPromptStep: React.FC<AiPromptStepProps> = ({
  eventLabel,
  roomName,
  maxAnswerWords,
  nicknames,
  remainingSlots,
  onNext,
}) => {
  const maxCount = Math.max(1, remainingSlots);
  const [moodId, setMoodId] = useState(DEFAULT_MOOD_ID);
  const [brutalityId, setBrutalityId] = useState(DEFAULT_BRUTALITY_ID);
  const [natureId, setNatureId] = useState(DEFAULT_NATURE_ID);
  const [count, setCount] = useState(() => Math.min(GAME_LIMITS.DEFAULT_AI_QUESTION_COUNT, maxCount));
  const [context, setContext] = useState('');
  const [includeTopics, setIncludeTopics] = useState('');
  const [avoidTopics, setAvoidTopics] = useState('');
  const [includeNicknames, setIncludeNicknames] = useState(true);
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const promptText = buildAiQuestionPrompt({
    moodId,
    brutalityId,
    natureId,
    count,
    eventLabel,
    roomName,
    maxAnswerWords,
    context,
    includeTopics,
    avoidTopics,
    nicknames: includeNicknames ? nicknames : [],
  });

  const handleCopy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(promptText);
      ok = true;
    } catch {
      if (promptRef.current) {
        promptRef.current.select();
        ok = document.execCommand('copy');
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <OptionGroup label="Mood" options={MOODS} selectedId={moodId} onSelect={setMoodId} />
        <OptionGroup label="Brutality" options={BRUTALITY_LEVELS} selectedId={brutalityId} onSelect={setBrutalityId} />
        <OptionGroup label="Type of questions" options={NATURES} selectedId={natureId} onSelect={setNatureId} />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300" htmlFor="ai-q-count">
          Number of questions
        </label>
        <input
          id="ai-q-count"
          type="number"
          min={1}
          max={maxCount}
          value={count}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (!Number.isNaN(parsed)) setCount(Math.min(maxCount, Math.max(1, Math.floor(parsed))));
          }}
          className="w-20 bg-psych-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-psych-yellow focus:outline-none"
        />
        <span className="text-xs text-neutral-400">({remainingSlots} slots left)</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-300" htmlFor="ai-q-context">
          About your group / inside jokes
        </label>
        <textarea
          id="ai-q-context"
          rows={2}
          maxLength={GAME_LIMITS.AI_CONTEXT_MAX_LENGTH}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Inside jokes, favourite hangouts, running gags, recent events..."
          className="w-full bg-psych-black border border-neutral-700 rounded-xl p-2.5 text-sm text-white focus:border-psych-yellow focus:outline-none"
        />
        <p className="text-[11px] text-neutral-400">
          The more specific you are (places, events, running jokes, group nicknames), the less generic the questions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-300" htmlFor="ai-q-include">
            Topics to include
          </label>
          <input
            id="ai-q-include"
            type="text"
            maxLength={GAME_LIMITS.AI_TOPICS_MAX_LENGTH}
            value={includeTopics}
            onChange={(e) => setIncludeTopics(e.target.value)}
            className="w-full bg-psych-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-psych-yellow focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-300" htmlFor="ai-q-avoid">
            Topics to avoid
          </label>
          <input
            id="ai-q-avoid"
            type="text"
            maxLength={GAME_LIMITS.AI_TOPICS_MAX_LENGTH}
            value={avoidTopics}
            onChange={(e) => setAvoidTopics(e.target.value)}
            className="w-full bg-psych-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-psych-yellow focus:outline-none"
          />
        </div>
      </div>

      <label className="flex items-start gap-2 cursor-pointer text-xs text-neutral-300">
        <input
          type="checkbox"
          checked={includeNicknames}
          onChange={(e) => setIncludeNicknames(e.target.checked)}
          className="mt-0.5 accent-psych-yellow"
        />
        <span>
          <strong className="text-white">Include player nicknames</strong> — Nicknames are pasted into the AI chat you
          choose. Untick if you'd rather not share them.
        </span>
      </label>

      <div className="space-y-1.5 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-psych-yellow">Generated Prompt</span>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-xs uppercase flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy prompt'}</span>
          </button>
        </div>
        <textarea
          ref={promptRef}
          readOnly
          rows={5}
          value={promptText}
          className="w-full bg-psych-black border border-neutral-700 rounded-xl p-2.5 text-xs font-mono text-neutral-200 focus:outline-none"
        />
        <p className="text-[11px] text-neutral-400">
          Paste this prompt into ChatGPT, Gemini, Claude or any AI chat. It will give you a CSV file. Come back here
          and upload it.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold rounded-xl text-sm uppercase flex items-center gap-1.5"
        >
          <span>Next: upload the CSV</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

