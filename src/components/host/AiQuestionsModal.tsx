import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { AiPromptStep } from './AiPromptStep';
import { AiImportStep } from './AiImportStep';

export interface AiQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventLabel: string;
  roomName: string;
  maxAnswerWords: number;
  nicknames: string[];
  remainingSlots: number;
  existingTexts: string[];
  onImport: (texts: string[]) => Promise<{ success: boolean; error?: string }>;
}

export const AiQuestionsModal: React.FC<AiQuestionsModalProps> = ({
  isOpen,
  onClose,
  eventLabel,
  roomName,
  maxAnswerWords,
  nicknames,
  remainingSlots,
  existingTexts,
  onImport,
}) => {
  const [step, setStep] = useState<'prompt' | 'upload'>('prompt');
  const [addedCount, setAddedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('prompt');
    setAddedCount(null);
    onClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-psych-dark border-2 border-psych-yellow rounded-2xl shadow-brutal p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-psych-yellow/10 rounded-lg border border-psych-yellow/30 text-psych-yellow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-extrabold text-white tracking-tight">AI QUESTION HELPER</h2>
              <p className="text-xs text-neutral-400">
                {addedCount !== null
                  ? 'Import complete'
                  : step === 'prompt'
                    ? 'Step 1 of 2: Build prompt'
                    : 'Step 2 of 2: Import CSV'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 max-h-[75vh] overflow-y-auto pr-1">
          {addedCount !== null ? (
            <div className="py-6 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-base font-bold text-white">Added {addedCount} questions</p>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl uppercase"
              >
                Close
              </button>
            </div>
          ) : step === 'prompt' ? (
            <AiPromptStep
              eventLabel={eventLabel}
              roomName={roomName}
              maxAnswerWords={maxAnswerWords}
              nicknames={nicknames}
              remainingSlots={remainingSlots}
              onNext={() => setStep('upload')}
            />
          ) : (
            <AiImportStep
              existingTexts={existingTexts}
              remainingSlots={remainingSlots}
              onImport={onImport}
              onBack={() => setStep('prompt')}
              onDone={(count) => setAddedCount(count)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

