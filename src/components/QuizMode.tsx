'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProgress, saveProgress, saveHighScore, getHighScores } from '@/lib/storage';

interface Question {
  id: number;
  topic: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
}

interface QuizModeProps {
  questions: Question[];
}

export default function QuizMode({ questions }: QuizModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
    correctAnswer?: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
  }, []);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const optionLabels = Object.keys(currentQuestion.options);

  const handleAnswer = async (answer: string) => {
    if (answered) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    try {
      const res = await fetch(`/api/quiz?review=${isReviewMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, selectedAnswer: answer }),
      });
      const data = await res.json();
      setFeedback(data);

      if (data.correct) {
        setScore((s) => {
          const next = s + 1;
          // Update high score for this topic
          const hs = getHighScores();
          const topic = currentQuestion.topic;
          if (next > (hs[topic] || 0)) {
            saveHighScore(topic, next);
          }
          return next;
        });
      }

      // Mark completed in progress
      const prog = getProgress();
      if (!prog.completedQuestions.includes(String(currentQuestion.id))) {
        saveProgress({
          completedQuestions: [...prog.completedQuestions, String(currentQuestion.id)],
          scoresByTopic: { ...prog.scoresByTopic, [currentQuestion.topic]: score + (data.correct ? 1 : 0) },
        });
      }
    } catch {
      // Network error — fail gracefully
    }
  };

  const handleNext = () => {
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setFeedback(null);
    setAnswered(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setAnswered(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setScore(0);
    setAnswered(false);
  };

  const isCorrect = feedback?.correct === true;
  const isWrong = answered && feedback?.correct === false;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      {/* Sticky progress bar */}
      <div className="mb-6">
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#22d3ee] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: prefersReduced ? 0 : 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={() => setIsReviewMode((m) => !m)}
            className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
              isReviewMode
                ? 'border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10'
                : 'border-[#2a2a2a] text-white/40 hover:text-white/70'
            }`}
          >
            {isReviewMode ? 'Review ON' : 'Review'}
          </button>
          <span className="text-[#22d3ee] text-xs font-mono">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Score + topic */}
      <div className="flex justify-between items-start mb-6">
        <span className="text-white/50 text-xs">{currentQuestion.topic}</span>
        <span className="text-white/30 text-xs">
          Score: {score}
        </span>
      </div>

      {/* Question card */}
      <motion.div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-8"
        animate={
          isWrong && !prefersReduced
            ? { x: [0, -5, 5, -5, 5, 0] }
            : isCorrect && !prefersReduced
            ? { scale: [1, 1.02, 1] }
            : {}
        }
        transition={
          isWrong
            ? { duration: 0.4 }
            : isCorrect
            ? { duration: 0.5 }
            : {}
        }
      >
        <p className="text-gray-100 text-xl font-bold leading-relaxed">
          {currentQuestion.question}
        </p>
      </motion.div>

      {/* Answer buttons */}
      <div className="space-y-3 mb-6">
        <AnimatePresence mode="wait">
          {optionLabels.map((label) => {
            const optionText = currentQuestion.options[label];
            if (!optionText) return null;

            let bgClass = 'bg-[#1a1a1a] border-[#2a2a2a]';
            let textClass = 'text-gray-100';
            let disabled = false;

            if (feedback) {
              if (label === currentQuestion.correctAnswer) {
                // Always highlight correct answer in bright green
                bgClass = 'bg-green-600 border-green-400';
                textClass = 'text-white';
                disabled = true;
              } else if (label === selectedAnswer && !feedback.correct) {
                bgClass = 'bg-red-900/60 border-red-500';
                textClass = 'text-white/70';
                disabled = true;
              } else {
                bgClass = 'bg-[#1a1a1a] border-[#2a2a2a]';
                textClass = 'text-white/30';
                disabled = true;
              }
            }

            return (
              <motion.button
                key={label}
                onClick={() => handleAnswer(label)}
                disabled={answered || disabled}
                className={`
                  w-full min-h-12 rounded-xl border-2 text-left
                  flex items-center gap-3 px-4 py-3
                  transition-colors active:scale-95
                  ${bgClass} ${textClass}
                  ${!answered ? 'hover:border-[#22d3ee] cursor-pointer' : 'cursor-default'}
                `}
                whileTap={!answered && !prefersReduced ? { scale: 0.97 } : {}}
                initial={false}
                animate={
                  isCorrect && label === selectedAnswer && !prefersReduced
                    ? { backgroundColor: ['#1a1a1a', '#22c55e40', '#1a1a1a'] }
                    : {}
                }
                transition={{ duration: 0.5 }}
              >
                <span className="font-bold text-sm w-5 shrink-0">{label}.</span>
                <span className="text-sm leading-snug">{optionText}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Feedback panel */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            className={`rounded-2xl p-4 mb-6 border ${
              isCorrect
                ? 'bg-green-900/30 border-green-700'
                : 'bg-red-900/30 border-red-700'
            }`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: prefersReduced ? 0 : 0.25 }}
          >
            <p className={`font-bold text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-gray-300 mt-1 text-sm leading-relaxed">
              {feedback.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="min-h-12 px-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white/70 active:scale-95 transition-transform text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>

        {currentIndex === questions.length - 1 && answered ? (
          <button
            onClick={handleRestart}
            className="flex-1 min-h-12 bg-[#a855f7] text-white rounded-xl font-bold active:scale-95 transition-transform text-sm"
          >
            Restart
          </button>
        ) : answered ? (
          <button
            onClick={handleNext}
            className="flex-1 min-h-12 bg-[#22d3ee] text-[#0f0f0f] rounded-xl font-bold active:scale-95 transition-transform text-sm"
          >
            Next →
          </button>
        ) : (
          <div className="flex-1 min-h-12 bg-[#2a2a2a] rounded-xl flex items-center justify-center text-white/30 text-sm">
            Pick an answer
          </div>
        )}
      </div>
    </div>
  );
}
