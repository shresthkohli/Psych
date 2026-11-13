import React, { useState } from 'react';
import { Upload, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { GAME_LIMITS } from '../../constants/gameLimits';
import { parseQuestionCsv, prepareImport, ImportPreview } from '../../lib/questionCsv';

export interface AiImportStepProps {
  existingTexts: string[];
  remainingSlots: number;
  onImport: (texts: string[]) => Promise<{ success: boolean; error?: string }>;
  onBack: () => void;
  onDone: (addedCount: number) => void;
}

export const AiImportStep: React.FC<AiImportStepProps> = ({
  existingTexts,
  remainingSlots,
  onImport,
  onBack,
  onDone,
}) => {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const maxKb = Math.round(GAME_LIMITS.MAX_IMPORT_FILE_BYTES / 1024);

  const runPipeline = async (rawText: string) => {
    setReading(true);
    setParseError(null);
    setImportError(null);
    setPreview(null);
    try {
      const parsed = await parseQuestionCsv(rawText);
      setPreview(prepareImport(parsed, existingTexts, remainingSlots));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Could not read CSV.');
    } finally {
      setReading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > GAME_LIMITS.MAX_IMPORT_FILE_BYTES) {
      setPreview(null);
      setImportError(null);
      setParseError(`File is too large. Maximum allowed size is ${maxKb} KB.`);
      return;
    }
    const content = await file.text();
    await runPipeline(content);
  };

  const handleAddClick = async () => {
    if (!preview || preview.accepted.length === 0 || saving) return;
    setSaving(true);
    setImportError(null);
    const res = await onImport(preview.accepted);
    setSaving(false);
    if (res.success) {
      onDone(preview.accepted.length);
    } else {
      setImportError(res.error ?? 'Failed to add questions.');
    }
  };

  const acceptedCount = preview?.accepted.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300" htmlFor="ai-csv-file">
          Upload CSV file (max {maxKb} KB)
        </label>
        <label
          htmlFor="ai-csv-file"
          className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-neutral-700 hover:border-outwit-yellow bg-outwit-black cursor-pointer text-sm text-neutral-300"
        >
          <Upload className="w-4 h-4 text-outwit-yellow" />
          <span>Choose .csv or .txt file</span>
          <input
            id="ai-csv-file"
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setPasteOpen((prev) => !prev)}
          className="text-xs font-bold text-outwit-yellow hover:underline"
        >
          {pasteOpen ? 'Hide pasted text' : 'Paste CSV text instead'}
        </button>
        {pasteOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              rows={4}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste CSV text returned by AI..."
              className="w-full bg-outwit-black border border-neutral-700 rounded-xl p-2.5 text-xs font-mono text-white focus:border-outwit-yellow focus:outline-none"
            />
            <button
              type="button"
              disabled={reading || pastedText.trim().length === 0}
              onClick={() => runPipeline(pastedText)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold disabled:opacity-40"
            >
              Read text
            </button>
          </div>
        )}
      </div>

      {reading && <p className="text-xs text-outwit-yellow">Reading...</p>}
      {parseError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-outwit-red/10 border border-outwit-red/40 text-xs text-outwit-red">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {preview && (
        <div className="space-y-3 p-3 rounded-xl bg-outwit-black border border-neutral-800">
          {acceptedCount === 0 ? (
            <p className="text-xs font-bold text-outwit-red">No usable questions found</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready to add ({acceptedCount})</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-200 max-h-40 overflow-y-auto">
                {preview.accepted.map((q, idx) => (
                  <li key={`${idx}-${q}`}>{q}</li>
                ))}
              </ol>
            </div>
          )}

          {preview.skipped.length > 0 && (
            <details className="text-xs text-neutral-400" open={acceptedCount === 0}>
              <summary className="cursor-pointer font-bold text-neutral-400">
                Skipped ({preview.skipped.length})
              </summary>
              <ul className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
                {preview.skipped.map((item, idx) => (
                  <li key={idx} className="text-[11px] text-neutral-500">
                    <span className="text-neutral-400">{item.text || '(empty)'}</span> — {item.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {importError && <p className="text-xs text-outwit-red">{importError}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button
          type="button"
          disabled={acceptedCount === 0 || saving || reading}
          onClick={handleAddClick}
          className="px-4 py-2.5 rounded-xl bg-outwit-yellow hover:bg-yellow-400 text-outwit-black font-extrabold text-sm uppercase disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding...' : `Add ${acceptedCount} questions`}
        </button>
      </div>
    </div>
  );
};

