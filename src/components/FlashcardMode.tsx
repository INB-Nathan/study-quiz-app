'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProgress, saveProgress } from '@/lib/storage';

interface Question {
  id: number;
  topic: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
}

interface FlashcardModeProps {
  questions: Question[];
}

const STORAGE_KEY = 'flashcard_seen_ids';

export default function FlashcardMode({ questions }: FlashcardModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSeenIds(new Set(JSON.parse(stored)));
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
  }, []);

  // Reset on topic change
  useEffect(() => {
    setCurrentIndex(0);
    setIsRevealed(false);
  }, [questions]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const markAsSeen = (id: number) => {
    const newSeen = new Set(seenIds);
    newSeen.add(id);
    setSeenIds(newSeen);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSeen]));
    const prog = getProgress();
    if (!prog.completedQuestions.includes(String(id))) {
      saveProgress({
        completedQuestions: [...prog.completedQuestions, String(id)],
        scoresByTopic: prog.scoresByTopic,
      });
    }
  };

  const handleNext = () => {
    if (currentQuestion) markAsSeen(currentQuestion.id);
    setIsRevealed(false);
    setCurrentIndex((i) => (i < questions.length - 1 ? i + 1 : 0));
  };

  const handlePrev = () => {
    setIsRevealed(false);
    setCurrentIndex((i) => (i > 0 ? i - 1 : questions.length - 1));
  };

  const handleReveal = () => {
    if (currentQuestion) markAsSeen(currentQuestion.id);
    setIsRevealed(true);
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 text-lg leading-relaxed">No flashcards in this topic.</p>
          <p className="text-gray-500 text-sm mt-2">Pick another topic above.</p>
        </div>
      </div>
    );
  }

  // R1: Conditional rendering — NO back face during flip, no backfaceVisibility trick
  // R2: Back face shows all options in grid with correct highlighted green
  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#22d3ee] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: prefersReduced ? 0 : 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-white/50 text-xs">{currentQuestion.topic}</span>
          <span className="text-[#22d3ee] text-xs font-mono">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Card — conditional: show question OR answer, never both during transition */}
      <div className="mb-8">
        {!isRevealed ? (
          // FRONT: Question only
          <motion.div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 min-h-64 flex flex-col items-center justify-center cursor-pointer"
            onClick={handleReveal}
            animate={prefersReduced ? {} : { scale: [1, 0.98, 1] }}
            transition={{ duration: 0.15 }}
            whileTap={prefersReduced ? {} : { scale: 0.97 }}
          >
            <p className="text-gray-100 text-xl font-bold leading-relaxed text-center">
              {currentQuestion.question}
            </p>
            <p className="text-white/30 text-sm mt-6">Tap to reveal answer</p>
          </motion.div>
        ) : (
          // BACK: Answer + all options grid + explanation
          <motion.div
            className="bg-[#1a1a1a] border-2 border-[#22d3ee] rounded-2xl p-6 min-h-64"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReduced ? 0 : 0.3 }}
          >
            {/* Correct answer header */}
            <p className="text-[#22d3ee] text-center font-bold text-base mb-4">
              Answer: {currentQuestion.correctAnswer}
            </p>

            {/* All options grid — R2 */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(currentQuestion.options).map(([key, value]) => {
                const isCorrect = key === currentQuestion.correctAnswer;
                return (
                  <div
                    key={key}
                    className={`p-2 rounded-lg text-xs text-center ${
                      isCorrect
                        ? 'bg-green-600/30 border border-green-400 text-green-100'
                        : 'bg-[#2a2a2a] text-white/50'
                    }`}
                  >
                    <span className="font-bold">{key}.</span> {value}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {currentQuestion.explanation && (
              <p className="text-white/40 text-xs italic text-center leading-relaxed">
                {currentQuestion.explanation}
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          className="flex-1 min-h-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white font-medium active:scale-95 transition-transform text-sm"
        >
          ← Prev
        </button>

        {isRevealed ? (
          <button
            onClick={handleNext}
            className="flex-1 min-h-12 bg-[#22d3ee] text-[#0f0f0f] rounded-xl font-bold active:scale-95 transition-transform text-sm"
          >
            Next Card
          </button>
        ) : (
          <button
            onClick={handleReveal}
            className="flex-1 min-h-12 bg-[#22c55e] text-[#0f0f0f] rounded-xl font-bold active:scale-95 transition-transform text-sm"
          >
            Reveal
          </button>
        )}
      </div>

      {/* Seen count */}
      <p className="text-center text-white/30 text-xs mt-6">
        {seenIds.size} of {questions.length} cards seen
      </p>
    </div>
  );
}
