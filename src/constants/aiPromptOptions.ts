export interface AiPromptOption {
  readonly id: string;
  readonly label: string;
  readonly instruction: string;
}

export const DEFAULT_MOOD_ID = 'funny';
export const DEFAULT_BRUTALITY_ID = 'medium';
export const DEFAULT_NATURE_ID = 'mixed';

export const MOODS: readonly AiPromptOption[] = [
  { id: 'funny', label: 'Funny', instruction: 'light, silly and laugh-out-loud' },
  { id: 'chaotic', label: 'Chaotic', instruction: 'random, absurd and unpredictable' },
  { id: 'wholesome', label: 'Wholesome', instruction: 'warm, friendly and feel-good' },
  { id: 'dramatic', label: 'Dramatic', instruction: 'over-the-top, theatrical and exaggerated' },
  { id: 'nostalgic', label: 'Nostalgic', instruction: "throwback, memories and 'remember when' energy" },
] as const;

export const BRUTALITY_LEVELS: readonly AiPromptOption[] = [
  { id: 'gentle', label: 'Gentle', instruction: 'very light teasing only; nobody should feel embarrassed' },
  { id: 'medium', label: 'Medium', instruction: 'playful roasting; slightly embarrassing but everyone laughs' },
  { id: 'savage', label: 'Savage', instruction: 'sharp roasts and awkward confessions; uncomfortable but still friendly' },
  { id: 'unhinged', label: 'Unhinged', instruction: 'maximum chaos and boldness, while still obeying every safety rule below' },
] as const;

export const NATURES: readonly AiPromptOption[] = [
  { id: 'roast', label: 'Roasts & call-outs', instruction: 'questions that gently roast habits, choices and situations of the group' },
  { id: 'hypothetical', label: 'Hypotheticals', instruction: 'what-would-you-do / what-would-happen-if scenarios' },
  { id: 'confession', label: 'Confessions & stories', instruction: 'embarrassing-story and confession style questions' },
  { id: 'insidejokes', label: 'Inside jokes & group life', instruction: "questions built on the group's places, events, running jokes and shared experiences" },
  { id: 'pop', label: 'Pop culture & imagination', instruction: 'creative, pop-culture and imagination style questions' },
  { id: 'mixed', label: 'A mix of everything', instruction: 'a balanced mix of roasts, hypotheticals, confessions and group-life questions' },
] as const;

