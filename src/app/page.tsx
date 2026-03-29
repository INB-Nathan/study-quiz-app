'use client';

import { useState, useEffect } from 'react';
import QuizMode from '@/components/QuizMode';
import FlashcardMode from '@/components/FlashcardMode';
import WrongAnswersMode from '@/components/WrongAnswersMode';
import ScoreBoard from '@/components/ScoreBoard';
import { getLastSession, clearLastSession, getStreak, getStreaks } from '@/lib/storage';

type View = 'quiz' | 'flashcards' | 'mistakes' | 'scores';

interface Question {
  id: number;
  topic: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
}

const TOPICS = ['System Integ SA1', 'System Integ SA2', 'System Integ SA3', 'System Integ SA4'];

export default function Home() {
  const [view, setView] = useState<View>('quiz');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Resume session
  const [lastSession, setLastSession] = useState<{ questionId: number; topic: string } | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  // Streak
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem('study_access_key');
    if (stored) setIsAuthenticated(true);

    fetch('/questions.json')
      .then((r) => r.json())
      .then((data) => setQuestions(data))
      .catch(() => {});

    // Load last session
    const ls = getLastSession();
    if (ls) setLastSession(ls);

    // Load streaks
    const s = getStreaks();
    const active: Record<string, number> = {};
    TOPICS.forEach((t) => {
      active[t] = getStreak(t);
    });
    setStreaks(active);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('study_access_key', key);
        setIsAuthenticated(true);
      } else {
        setError('Invalid access key. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = (resumeIndex: number) => {
    setLastSession(null);
    setResumeLoading(false);
    setView('quiz');
    // QuizMode will start at the resumed index
    // We signal this by scrolling to quiz section
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#22d3ee]">🔔 Study Quiz</h1>
            <p className="text-white/60 text-sm">Enter your access key to begin.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ACCESS_KEY"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-white placeholder-white/40 focus:border-[#22d3ee] focus:outline-none focus:ring-1 focus:ring-[#22d3ee] min-h-[44px]"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !key}
              className="w-full rounded-lg bg-[#22d3ee] text-[#0f0f0f] font-semibold py-3 hover:bg-[#06b6d4] transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Find question index for resume
  const resumeQuestionIndex = lastSession
    ? questions.findIndex((q) => q.id === lastSession.questionId)
    : -1;

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f0f]">
      {/* Streak banner */}
      {Object.values(streaks).some((s) => s > 0) && (
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-2">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {TOPICS.map((t) =>
              streaks[t] > 0 ? (
                <span key={t} className="text-xs text-orange-400 whitespace-nowrap shrink-0">
                  🔥 {streaks[t]}d · {t.replace('System Integ ', '')}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Resume banner */}
      {lastSession && resumeQuestionIndex >= 0 && view !== 'quiz' && (
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/70 shrink-0">
              Resume where you left off?
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { clearLastSession(); setLastSession(null); }}
                className="text-xs text-white/30 hover:text-white/60 px-2 py-1.5 rounded-lg border border-[#2a2a2a] transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => { setView('quiz'); setLastSession(null); }}
                className="text-xs text-[#22d3ee] border border-[#22d3ee]/50 px-3 py-1.5 rounded-lg hover:bg-[#22d3ee]/10 transition-colors"
              >
                Resume Q{resumeQuestionIndex + 1}
              </button>
            </div>
          </div>
          <p className="text-xs text-white/30 mt-1">{lastSession.topic}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex border-b border-[#2a2a2a]">
        {(['quiz', 'flashcards', 'mistakes', 'scores'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors min-h-[44px] ${
              view === v
                ? 'text-[#22d3ee] border-b-2 border-[#22d3ee]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {v === 'mistakes' ? 'Mistakes' : v}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1">
        {view === 'quiz' && questions.length > 0 && (
          <QuizMode questions={questions} />
        )}
        {view === 'flashcards' && questions.length > 0 && (
          <FlashcardMode questions={questions} />
        )}
        {view === 'mistakes' && questions.length > 0 && (
          <WrongAnswersMode questions={questions} />
        )}
        {view === 'scores' && <ScoreBoard />}
      </main>
    </div>
  );
}
