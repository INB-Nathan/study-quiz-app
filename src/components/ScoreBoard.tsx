'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getHighScores } from '@/lib/storage';

interface Question {
  id: number;
  topic: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
}

interface ScoreBoardProps {
  questions: Question[];
}

const TOPICS = ['System Integ SA1', 'System Integ SA2', 'System Integ SA3', 'System Integ SA4'];

const MAX_QUESTIONS: Record<string, number> = {
  'System Integ SA1': 116,
  'System Integ SA2': 161,
  'System Integ SA3': 102,
  'System Integ SA4': 179,
};

export default function ScoreBoard({ questions }: ScoreBoardProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
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

  // Only show topics that have questions in the current filter
  const visibleTopics = TOPICS.filter((t) => questions.some((q) => q.topic === t));

  // Empty state
  if (visibleTopics.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 text-lg leading-relaxed">No high scores yet.</p>
          <p className="text-gray-500 text-sm mt-2">Take a quiz to see your scores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#22d3ee]">🏆 High Scores</h1>
        <button
          onClick={clearScores}
          className="text-xs text-red-400 border border-red-400/50 rounded-lg px-3 py-1.5 hover:bg-red-400/10 transition-colors"
        >
          Clear Scores
        </button>
      </div>

      {cleared && (
        <motion.p
          className="text-green-400 text-sm text-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Scores cleared.
        </motion.p>
      )}

      <div className="space-y-3">
        {visibleTopics.map((topic) => {
          const score = scores[topic] ?? 0;
          const total = MAX_QUESTIONS[topic] ?? 0;
          const pct = total > 0 ? Math.round((score / total) * 100) : 0;

          return (
            <div
              key={topic}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{topic}</span>
                <span className="text-[#22d3ee] font-bold text-lg">
                  {score}
                  <span className="text-white/40 text-sm font-normal">/{total}</span>
                </span>
              </div>
              <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                <motion.div
                  className="bg-[#22d3ee] h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
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
  );
}
