'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWrongAnswers, removeWrongAnswer, clearWrongAnswers } from '@/lib/storage';

interface Question {
  id: number;
  topic: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
}

interface WrongAnswersModeProps {
  questions: Question[];
}

export default function WrongAnswersMode({ questions }: WrongAnswersModeProps) {
  const [wrongMap, setWrongMap] = useState<Record<number, { selectedAnswer: string; timestamp: number }>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const stored = getWrongAnswers();
    const map: Record<number, { selectedAnswer: string; timestamp: number }> = {};
    Object.values(stored).forEach((w: unknown) => {
      const wrong = w as { questionId: number; selectedAnswer: string; timestamp: number };
      map[wrong.questionId] = { selectedAnswer: wrong.selectedAnswer, timestamp: wrong.timestamp };
    });
    setWrongMap(map);
  }, []);

  const wrongIds = Object.keys(wrongMap).map(Number);
  const wrongQuestions = wrongIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as Question[];

  const handleRemove = (id: number) => {
    removeWrongAnswer(id);
    setWrongMap((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setExpanded(null);
  };

  const handleClearAll = () => {
    clearWrongAnswers();
    setWrongMap({});
    setExpanded(null);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  if (wrongQuestions.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-8 text-center">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="text-xl font-bold text-white mb-2">No Mistakes Yet</h2>
        <p className="text-white/40 text-sm">
          Wrong answers will appear here so you can review them later.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-bold text-base">Mistakes Bank</h2>
          <p className="text-white/40 text-xs">{wrongQuestions.length} question{wrongQuestions.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleClearAll}
          className="text-xs text-red-400 border border-red-400/50 rounded-lg px-3 py-1.5 hover:bg-red-400/10 transition-colors"
        >
          Clear All
        </button>
      </div>

      {cleared && (
        <motion.p
          className="text-green-400 text-sm text-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          All mistakes cleared.
        </motion.p>
      )}

      {/* Mistake list */}
      <div className="space-y-3">
        <AnimatePresence>
          {wrongQuestions.map((q) => {
            const info = wrongMap[q.id];
            const isOpen = expanded === q.id;

            return (
              <motion.div
                key={q.id}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {/* Row */}
                <button
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                  onClick={() => setExpanded(isOpen ? null : q.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm font-medium truncate">{q.question}</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {q.topic} · You answered:{' '}
                      <span className="text-red-400">{info?.selectedAnswer}</span>
                    </p>
                  </div>
                  <span className="text-white/30 text-lg shrink-0">›</span>
                </button>

                {/* Expanded */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      className="px-4 pb-4 border-t border-[#2a2a2a] pt-3 space-y-3"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {/* All options */}
                      <div className="space-y-2">
                        {Object.entries(q.options).map(([label, text]) => {
                          const isCorrect = label === q.correctAnswer;
                          const isWrong = label === info?.selectedAnswer;
                          return (
                            <div
                              key={label}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                isCorrect
                                  ? 'bg-green-900/40 border border-green-700 text-green-300'
                                  : isWrong
                                  ? 'bg-red-900/40 border border-red-700 text-red-300'
                                  : 'bg-[#0f0f0f] border border-[#2a2a2a] text-white/30'
                              }`}
                            >
                              <span className="font-bold w-4">{label}.</span>
                              <span className="flex-1">{text}</span>
                              {isCorrect && <span className="text-green-400 text-xs">✓ Correct</span>}
                              {isWrong && <span className="text-red-400 text-xs">✗ Your answer</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <p className="text-white/40 text-xs italic leading-relaxed">
                          {q.explanation}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRemove(q.id)}
                          className="flex-1 min-h-10 text-xs text-green-400 border border-green-400/40 rounded-lg hover:bg-green-400/10 transition-colors"
                        >
                          Mark as Reviewed
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
