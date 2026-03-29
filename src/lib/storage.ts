// Storage keys
const PROGRESS_KEY = 'study_progress';
const HIGHSCORES_KEY = 'study_highscores';

// Types
export interface StudyProgress {
  completedQuestions: string[];
  scoresByTopic: Record<string, number>;
}

export interface HighScores {
  [topic: string]: number;
}

// Schema validation helpers
function isValidProgress(data: unknown): data is StudyProgress {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.completedQuestions) &&
    typeof obj.scoresByTopic === 'object' &&
    obj.scoresByTopic !== null
  );
}

function isValidHighScores(data: unknown): data is HighScores {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return Object.values(obj).every((v) => typeof v === 'number');
}

// Progress functions
export function getProgress(): StudyProgress {
  if (typeof window === 'undefined') {
    return { completedQuestions: [], scoresByTopic: {} };
  }

  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) {
      return { completedQuestions: [], scoresByTopic: {} };
    }
    const parsed = JSON.parse(stored);
    if (!isValidProgress(parsed)) {
      return { completedQuestions: [], scoresByTopic: {} };
    }
    return parsed;
  } catch {
    return { completedQuestions: [], scoresByTopic: {} };
  }
}

export function saveProgress(progress: StudyProgress): void {
  if (typeof window === 'undefined') return;

  try {
    if (!isValidProgress(progress)) {
      return;
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore write errors
  }
}

// High scores functions
export function getHighScores(): HighScores {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(HIGHSCORES_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    if (!isValidHighScores(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function saveHighScore(topic: string, score: number): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getHighScores();
    current[topic] = score;
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(current));
  } catch {
    // Ignore write errors
  }
}
