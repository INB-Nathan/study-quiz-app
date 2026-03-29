'use client';

import { useState, useEffect } from 'react';

interface HighScores {
  [topic: string]: number;
}

const TOPICS = ['System Integ SA1', 'System Integ SA2', 'System Integ SA3', 'System Integ SA4'];

export default function ScoreBoard() {
  const [scores, setScores] = useState<HighScores>({});
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('study_highscores');
    if (stored) {
      try {
        setScores(JSON.parse(stored));
      } catch {
        setScores({});
      }
    }
  }, []);

  const clearScores = () => {
    localStorage.removeItem('study_highscores');
    setScores({});
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const maxQuestions: { [key: string]: number } = {
    'System Integ SA1': 116,
    'System Integ SA2': 161,
    'System Integ SA3': 102,
    'System Integ SA4': 179,
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400 tracking-tight">
            🏆 High Scores
          </h1>
          <button
            onClick={clearScores}
            className="text-sm text-red-400 hover:text-red-300 border border-red-400 hover:border-red-300 rounded px-3 py-1.5 transition-colors"
          >
            Clear Scores
          </button>
        </div>

        {cleared && (
          <p className="text-green-400 text-sm text-center">Scores cleared.</p>
        )}

        <div className="space-y-3">
          {TOPICS.map((topic) => {
            const score = scores[topic] ?? 0;
            const total = maxQuestions[topic] ?? 0;
            const pct = total > 0 ? Math.round((score / total) * 100) : 0;

            return (
              <div
                key={topic}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{topic}</span>
                  <span className="text-cyan-400 font-bold text-lg">
                    {score}
                    <span className="text-white/40 text-sm font-normal">
                      /{total}
                    </span>
                  </span>
                </div>
                <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                  <div
                    className="bg-cyan-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-right text-xs text-white/40 mt-1">{pct}%</p>
              </div>
            );
          })}
        </div>

        {Object.keys(scores).length === 0 && (
          <p className="text-center text-white/50 text-sm mt-8">
            No scores yet. Complete a quiz to see your high scores here.
          </p>
        )}
      </div>
    </div>
  );
}
