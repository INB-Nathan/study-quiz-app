'use client';

import { useState, useEffect } from 'react';
import QuizMode from '@/components/QuizMode';
import FlashcardMode from '@/components/FlashcardMode';
import ScoreBoard from '@/components/ScoreBoard';

type View = 'quiz' | 'flashcards' | 'scores';

interface Question {
  id: number;
  topic: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
}

export default function Home() {
  const [view, setView] = useState<View>('quiz');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem('study_access_key');
    if (stored) setIsAuthenticated(true);
    // Fetch questions for offline SW cache
    fetch('/questions.json')
      .then((r) => r.json())
      .then((data) => setQuestions(data))
      .catch(() => {});
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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#22d3ee]">🔔 Study Quiz</h1>
            <p className="text-white/60 text-sm">
              Enter your access key to begin.
            </p>
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
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
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

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f0f]">
      {/* Nav */}
      <nav className="flex border-b border-[#2a2a2a]">
        {(['quiz', 'flashcards', 'scores'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors min-h-[44px] ${
              view === v
                ? 'text-[#22d3ee] border-b-2 border-[#22d3ee]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {v}
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
        {view === 'scores' && <ScoreBoard />}
      </main>
    </div>
  );
}
