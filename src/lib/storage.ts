// Storage keys
const PROGRESS_KEY = 'study_progress';
const HIGHSCORES_KEY = 'study_highscores';
const WRONG_ANSWERS_KEY = 'study_wrong_answers';
const STREAKS_KEY = 'study_streaks';
const LAST_SESSION_KEY = 'study_last_session';

// Types
export interface StudyProgress {
  completedQuestions: string[];
  scoresByTopic: Record<string, number>;
}

export interface HighScores {
  [topic: string]: number;
}

export interface WrongAnswer {
  questionId: number;
  topic: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  timestamp: number;
}

export interface WrongAnswersStore {
  [questionId: number]: WrongAnswer;
}

export interface StreakData {
  [topic: string]: {
    dayCount: number;
    lastStudyDate: string; // YYYY-MM-DD
    totalScore: number;
    totalPossible: number;
  };
}

export interface LastSession {
  questionId: number;
  topic: string;
  timestamp: number;
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
  return Object.values(data as Record<string, unknown>).every((v) => typeof v === 'number');
}

// Progress functions
export function getProgress(): StudyProgress {
  if (typeof window === 'undefined') {
    return { completedQuestions: [], scoresByTopic: {} };
  }
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return { completedQuestions: [], scoresByTopic: {} };
    const parsed = JSON.parse(stored);
    if (!isValidProgress(parsed)) return { completedQuestions: [], scoresByTopic: {} };
    return parsed;
  } catch {
    return { completedQuestions: [], scoresByTopic: {} };
  }
}

export function saveProgress(progress: StudyProgress): void {
  if (typeof window === 'undefined') return;
  try {
    if (!isValidProgress(progress)) return;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }
}

// High scores
export function getHighScores(): HighScores {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(HIGHSCORES_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!isValidHighScores(parsed)) return {};
    return parsed;
  } catch { return {}; }
}

export function saveHighScore(topic: string, score: number): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getHighScores();
    current[topic] = score;
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(current));
  } catch { /* ignore */ }
}

// Wrong answers
export function getWrongAnswers(): WrongAnswersStore {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(WRONG_ANSWERS_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch { return {}; }
}

export function addWrongAnswer(wrong: WrongAnswer): void {
  if (typeof window === 'undefined') return;
  try {
    const store = getWrongAnswers();
    store[wrong.questionId] = wrong;
    localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export function removeWrongAnswer(questionId: number): void {
  if (typeof window === 'undefined') return;
  try {
    const store = getWrongAnswers();
    delete store[questionId];
    localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export function clearWrongAnswers(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WRONG_ANSWERS_KEY);
  } catch { /* ignore */ }
}

// Streaks
export function getStreaks(): StreakData {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STREAKS_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch { return {}; }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function recordStudySession(topic: string, score: number, possible: number): void {
  if (typeof window === 'undefined') return;
  try {
    const streaks = getStreaks();
    const today = todayStr();
    const yesterday = yesterdayStr();
    const pct = possible > 0 ? score / possible : 0;

    if (!streaks[topic]) {
      streaks[topic] = { dayCount: 1, lastStudyDate: today, totalScore: score, totalPossible: possible };
    } else {
      const prev = streaks[topic];

      // Reset streak if scored below 80% OR missed more than 1 day gap
      if (pct < 0.8 || prev.lastStudyDate !== yesterday) {
        streaks[topic] = { dayCount: 1, lastStudyDate: today, totalScore: score, totalPossible: possible };
      } else {
        streaks[topic] = {
          dayCount: prev.dayCount + 1,
          lastStudyDate: today,
          totalScore: prev.totalScore + score,
          totalPossible: prev.totalPossible + possible,
        };
      }
    }

    localStorage.setItem(STREAKS_KEY, JSON.stringify(streaks));
  } catch { /* ignore */ }
}

export function getStreak(topic: string): number {
  const streaks = getStreaks();
  const today = todayStr();
  const yesterday = yesterdayStr();
  const entry = streaks[topic];
  if (!entry) return 0;
  // If last study was today or yesterday, streak is valid
  if (entry.lastStudyDate === today || entry.lastStudyDate === yesterday) {
    return entry.dayCount;
  }
  return 0; // expired
}

// Last session (for resume)
export function getLastSession(): LastSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LAST_SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch { return null; }
}

export function saveLastSession(questionId: number, topic: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ questionId, topic, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

export function clearLastSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LAST_SESSION_KEY);
  } catch { /* ignore */ }
}
