'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const markAsSeen = (id: number) => {
    const newSeen = new Set(seenIds);
    newSeen.add(id);
    setSeenIds(newSeen);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSeen]));
    // Sync to shared progress store
    const prog = getProgress();
    if (!prog.completedQuestions.includes(String(id))) {
      saveProgress({
        completedQuestions: [...prog.completedQuestions, String(id)],
        scoresByTopic: prog.scoresByTopic,
      });
    }
  };

  const handleNext = () => {
    markAsSeen(currentQuestion.id);
    setIsRevealed(false);
    setCurrentIndex((i) => (i < questions.length - 1 ? i + 1 : 0));
  };

  const handlePrev = () => {
    setIsRevealed(false);
    setCurrentIndex((i) => (i > 0 ? i - 1 : questions.length - 1));
  };

  const handleReveal = () => {
    setIsRevealed(true);
    markAsSeen(currentQuestion.id);
  };

  // 3D flip: front shows question, back shows answer
  const cardVariants = {
    flip: { rotateY: prefersReduced ? 0 : 180 },
    unflip: { rotateY: 0 },
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      {/* Progress bar — always visible */}
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

      {/* Card — 3D flip */}
      <div className="perspective-1000 mb-8">
        <motion.div
          className="relative w-full min-h-64 cursor-pointer"
          onClick={!isRevealed ? handleReveal : undefined}
          animate={isRevealed ? 'flip' : 'unflip'}
          variants={cardVariants}
          transition={{ duration: prefersReduced ? 0 : 0.5, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-gray-100 text-xl font-bold leading-relaxed text-center">
              {currentQuestion.question}
            </p>
            {!isRevealed && (
              <p className="text-white/30 text-sm mt-6">Tap to reveal answer</p>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-[#1a1a1a] border-2 border-[#22d3ee] rounded-2xl p-8 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-[#22d3ee] text-2xl font-bold mb-4">
              {currentQuestion.correctAnswer}
            </p>
            <p className="text-gray-100 text-center text-lg leading-relaxed mb-6">
              {currentQuestion.options[currentQuestion.correctAnswer]}
            </p>
            {currentQuestion.explanation && (
              <p className="text-white/50 text-sm text-center italic leading-relaxed">
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        </motion.div>
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
