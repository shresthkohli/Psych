import React, { useState } from 'react';
import { Pencil, Check, X, Plus, Sparkles } from 'lucide-react';
import type { Room, QuestionDoc, ServiceResult } from '../../types/game';
import { GAME_LIMITS } from '../../constants/gameLimits';
import {
  getAddQuestionBlockReason,
  getStartBlockReason,
  getQuestionCount,
  isQuestionEditable,
  validateTotalRounds,
} from '../../lib/questionRules';

export interface QuestionManagerProps {
  room: Room;
  questions: QuestionDoc[];
  onAdd: (text: string) => Promise<ServiceResult>;
  onEdit: (roundNumber: number, text: string) => Promise<ServiceResult>;
  onChangeTotalRounds: (n: number) => Promise<ServiceResult>;
  onOpenAiHelper?: () => void;
}

export const QuestionManager: React.FC<QuestionManagerProps> = ({
  room,
  questions,
  onAdd,
  onEdit,
  onChangeTotalRounds,
  onOpenAiHelper,
}) => {
  const [editingRoundNumber, setEditingRoundNumber] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [newQuestionText, setNewQuestionText] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [totalRoundsError, setTotalRoundsError] = useState<string | null>(null);
  const [totalRoundsSaving, setTotalRoundsSaving] = useState(false);

  const startReason = getStartBlockReason(room);
  const addBlockReason = getAddQuestionBlockReason(room);

  const handleStartEdit = (q: QuestionDoc) => {
    setEditingRoundNumber(q.roundNumber);
    setEditDraft(q.text);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingRoundNumber(null);
    setEditDraft('');
    setEditError(null);
  };

  const handleSaveEdit = async (roundNumber: number) => {
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await onEdit(roundNumber, editDraft);
      if (res.success) {
        setEditingRoundNumber(null);
        setEditDraft('');
      } else {
        setEditError(res.error ?? 'Could not edit question.');
      }
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not edit question.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addBlockReason || addSaving) return;
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await onAdd(newQuestionText);
      if (res.success) {
        setNewQuestionText('');
      } else {
        setAddError(res.error ?? 'Could not add question.');
      }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not add question.');
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-outwit-cardBg border border-outwit-borderDark rounded-2xl p-5 space-y-4">
      {/* 1. Header & Counter */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Questions</h2>
        <span className="font-mono text-sm font-bold text-outwit-yellow">
          {getQuestionCount(room)} / {GAME_LIMITS.MAX_QUESTIONS_PER_GAME}
        </span>
      </div>

      {/* 2. Status line */}
      <div className="text-xs">
        {room.status === 'LOBBY' && room.currentRoundNumber === 1 ? (
          startReason ? (
            <p className="text-outwit-yellow font-medium">{startReason}</p>
          ) : (
            <p className="text-green-400 font-medium">Ready to start — you can keep adding questions during the game.</p>
          )
        ) : (
          <p className="text-neutral-400">
            {getQuestionCount(room)} of {room.settings.totalRounds} planned questions typed.
          </p>
        )}
      </div>

      {/* 3. Total Rounds Stepper */}
      {room.status !== 'GAME_FINISHED' && (
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">Total Rounds</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={totalRoundsSaving || validateTotalRounds(room.settings.totalRounds - 1, room) !== null}
                onClick={async () => {
                  setTotalRoundsSaving(true);
                  setTotalRoundsError(null);
                  const res = await onChangeTotalRounds(room.settings.totalRounds - 1);
                  if (!res.success) setTotalRoundsError(res.error ?? 'Failed to update total rounds.');
                  setTotalRoundsSaving(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold"
              >
                −
              </button>
              <span className="font-mono text-sm font-bold text-white px-2">
                {room.settings.totalRounds}
              </span>
              <button
                type="button"
                disabled={totalRoundsSaving || validateTotalRounds(room.settings.totalRounds + 1, room) !== null}
                onClick={async () => {
                  setTotalRoundsSaving(true);
                  setTotalRoundsError(null);
                  const res = await onChangeTotalRounds(room.settings.totalRounds + 1);
                  if (!res.success) setTotalRoundsError(res.error ?? 'Failed to update total rounds.');
                  setTotalRoundsSaving(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold"
              >
                +
              </button>
            </div>
          </div>
          {totalRoundsError && <p className="text-xs text-outwit-red">{totalRoundsError}</p>}
        </div>
      )}

      {/* 4. Questions List */}
      <div className="space-y-2">
        {questions.length === 0 ? (
          <p className="text-xs text-neutral-500 italic py-2">No questions yet. Type your first question below.</p>
        ) : (
          questions.map((q) => {
            const editable = isQuestionEditable(q.roundNumber, room.currentRoundNumber, room.status);
            const isEditing = editingRoundNumber === q.roundNumber;
            const tag = !editable
              ? 'Asked'
              : q.roundNumber === room.currentRoundNumber
              ? 'Next up'
              : 'Upcoming';

            return (
              <div key={q.id} className="p-3 bg-outwit-black rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-outwit-yellow font-mono text-xs font-bold">
                      Round {q.roundNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        tag === 'Asked'
                          ? 'bg-neutral-800 text-neutral-400'
                          : tag === 'Next up'
                          ? 'bg-outwit-yellow/20 text-outwit-yellow border border-outwit-yellow/40'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {tag}
                    </span>
                  </div>
                  {editable && !isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(q)}
                      className="p-1 text-neutral-400 hover:text-white transition-colors"
                      title="Edit question"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={GAME_LIMITS.MAX_QUESTION_LENGTH}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="flex-1 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none p-3"
                      />
                      <button
                        type="button"
                        disabled={editSaving}
                        onClick={() => handleSaveEdit(q.roundNumber)}
                        className="p-3 bg-outwit-yellow hover:bg-yellow-400 text-outwit-black font-extrabold rounded-xl"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={editSaving}
                        onClick={handleCancelEdit}
                        className="p-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {editError && <p className="text-xs text-outwit-red">{editError}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-200">{q.text}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Add Question Form */}
      <form onSubmit={handleAddSubmit} className="space-y-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            maxLength={GAME_LIMITS.MAX_QUESTION_LENGTH}
            disabled={addBlockReason !== null || addSaving}
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder={`Type question ${getQuestionCount(room) + 1}...`}
            className="flex-1 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none p-3 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={addBlockReason !== null || addSaving}
            className="px-4 py-3 bg-outwit-yellow hover:bg-yellow-400 text-outwit-black font-extrabold rounded-xl flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed text-sm uppercase"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
        {addBlockReason && <p className="text-xs text-outwit-yellow">{addBlockReason}</p>}
        {addError && <p className="text-xs text-outwit-red">{addError}</p>}
        {onOpenAiHelper && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              disabled={addBlockReason !== null}
              onClick={onOpenAiHelper}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-outwit-yellow border border-outwit-yellow/40 font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed text-xs uppercase"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get questions from AI</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

