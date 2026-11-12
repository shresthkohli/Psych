import { GAME_LIMITS } from '../constants/gameLimits';
import { validateQuestionText } from './questionRules';

export interface ImportPreview {
  accepted: string[];
  skipped: { text: string; reason: string }[];
}

/**
 * Parse a CSV or line-based text payload into candidate question strings.
 * Uses dynamic import so papaparse stays out of the main application bundle.
 */
export async function parseQuestionCsv(text: string): Promise<string[]> {
  const Papa = (await import('papaparse')).default;
  const maxRows = GAME_LIMITS.MAX_QUESTIONS_PER_GAME * 4;

  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: 'greedy',
    comments: '#',
    preview: maxRows + 1,
  });

  if (result.data.length === 0 && text.length > 0 && result.errors.length > 0) {
    throw new Error('Could not read this file as CSV.');
  }

  const rows = result.data.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const noBom = rowIndex === 0 && colIndex === 0 ? cell.replace(/^\uFEFF/, '') : cell;
      return noBom.replace(/[\r\n]+/g, ' ').trim();
    }),
  );

  if (rows.length === 0) return [];

  const headerColIdx = rows[0].findIndex((cell) => {
    const lower = cell.toLowerCase();
    return lower === 'question' || lower === 'questions';
  });

  const hasHeader = headerColIdx !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const extracted: string[] = [];

  for (const row of dataRows) {
    let chosen: string;
    if (hasHeader) {
      chosen = row[headerColIdx] ?? '';
    } else if (row.length >= 2 && /^\d+$/.test(row[0])) {
      chosen = row[1] ?? '';
    } else {
      chosen = row.join(', ');
    }

    const cleaned = chosen.replace(/^\d+[.)]\s+/, '').trim();
    if (cleaned.length > 0) {
      extracted.push(cleaned);
      if (extracted.length >= maxRows) break;
    }
  }

  return extracted;
}

/** Validate, deduplicate, and slot-limit candidate questions against existing room questions. */
export function prepareImport(
  rawQuestions: string[],
  existingTexts: string[],
  remainingSlots: number,
): ImportPreview {
  const accepted: string[] = [];
  const skipped: { text: string; reason: string }[] = [];
  const seen = new Set(existingTexts.map((t) => t.trim().replace(/\s+/g, ' ').toLowerCase()));
  const slotCap = Math.max(0, remainingSlots);

  for (const raw of rawQuestions) {
    const v = validateQuestionText(raw);
    if (!v.valid) {
      skipped.push({ text: raw, reason: v.error ?? 'Invalid question.' });
      continue;
    }

    const key = v.clean.toLowerCase();
    if (seen.has(key)) {
      skipped.push({ text: v.clean, reason: 'Duplicate question.' });
      continue;
    }

    if (accepted.length >= slotCap) {
      skipped.push({
        text: v.clean,
        reason: `No free question slots left (maximum ${GAME_LIMITS.MAX_QUESTIONS_PER_GAME}).`,
      });
      continue;
    }

    seen.add(key);
    accepted.push(v.clean);
  }

  return { accepted, skipped };
}
