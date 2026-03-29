'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getProgress, saveProgress,
  addWrongAnswer, removeWrongAnswer,
  recordStudySession,
  saveLastSession,
} from '@/lib/storage';

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
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [resetFlash, setResetFlash] = useState(false); // R5: brief "Reset!" confirmation
  // R6: local shuffled copy
  const [shuffled, setShuffled] = useState<Question[] | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
  }, []);

  // Mid-session reset on topic change
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setScore(0);
    setSessionScore(0);
    setAnswered(false);
    setSessionDone(false);
    setShuffled(null);
  }, [questions]);

  // Use shuffled copy if available, otherwise original
  const displayQuestions = shuffled ?? questions;

  // Reset shuffled when topic changes
  useEffect(() => {
    setShuffled(null);
  }, [questions]);

  const currentQuestion = displayQuestions[currentIndex];
  const progress = displayQuestions.length > 0 ? ((currentIndex + 1) / displayQuestions.length) * 100 : 0;
  const optionLabels = Object.keys(currentQuestion?.options ?? {});

  useEffect(() => {
    if (!answered && !sessionDone && currentQuestion) {
      saveLastSession(currentQuestion.id, currentQuestion.topic);
    }
  }, [currentIndex, currentQuestion, answered, sessionDone]);

  // R3: Optimistic UI — set visual state BEFORE fetch
  const handleAnswer = async (answer: string) => {
    if (answered || sessionDone || !currentQuestion) return;

    // Immediate feedback — user sees button highlight instantly
    setSelectedAnswer(answer);
    setAnswered(true);

    // Fire-and-forget API call — only updates feedback state
    fetch(`/api/quiz?review=${isReviewMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: currentQuestion.id, selectedAnswer: answer }),
    })
      .then((r) => r.json())
      .then((data) => {
        setFeedback(data);
        if (data.correct) {
          setScore((s) => s + 1);
          setSessionScore((s) => s + 1);
          removeWrongAnswer(currentQuestion.id);
        } else {
          if (!isReviewMode) {
            addWrongAnswer({
              questionId: currentQuestion.id,
              topic: currentQuestion.topic,
              question: currentQuestion.question,
              selectedAnswer: answer,
              correctAnswer: currentQuestion.correctAnswer,
              explanation: currentQuestion.explanation || '',
              timestamp: Date.now(),
            });
          }
        }
        const prog = getProgress();
        if (!prog.completedQuestions.includes(String(currentQuestion.id))) {
          saveProgress({
            completedQuestions: [...prog.completedQuestions, String(currentQuestion.id)],
            scoresByTopic: { ...prog.scoresByTopic, [currentQuestion.topic]: score + (data.correct ? 1 : 0) },
          });
        }
      })
      .catch(() => {
        // Network error — leave selected state, clear answered to let user retry
        setSelectedAnswer(null);
        setAnswered(false);
        setFeedback(null);
      });
  };

  // R4: Per-question reset
  const handleResetQuestion = () => {
    setSelectedAnswer(null);
    setFeedback(null);
    setAnswered(false);
  };

  // R5: Full quiz reset
  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setScore(0);
    setSessionScore(0);
    setAnswered(false);
    setSessionDone(false);
    setResetFlash(true);
    setTimeout(() => setResetFlash(false), 1500);
  };

  // R6: Fisher-Yates shuffle
  const handleShuffle = () => {
    if (answered || sessionDone) return;
    const arr = [...displayQuestions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffled(arr);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setScore(0);
    setSessionScore(0);
    setAnswered(false);
    setSessionDone(false);
  };

  const handleNext = () => {
    if (currentIndex < displayQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setAnswered(false);
    } else {
      recordStudySession(currentQuestion.topic, sessionScore, displayQuestions.length);
      setSessionScore(0);
      setSessionDone(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setAnswered(false);
    }
  };

  const isCorrect = feedback?.correct === true;
  const isWrong = answered && feedback?.correct === false;

  if (displayQuestions.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 text-lg leading-relaxed">No questions in this topic.</p>
          <p className="text-gray-500 text-sm mt-2">Pick another topic above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#22d3ee] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: prefersReduced ? 0 : 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          {/* R6 Shuffle + R5 Reset All — left group */}
          <div className="flex gap-1.5">
            <button
              onClick={handleShuffle}
              disabled={answered || sessionDone}
              title="Shuffle questions"
              className="text-xs px-3 py-1 rounded-lg border border-[#2a2a2a] text-white/40 hover:text-white hover:border-[#22d3ee]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              🔀 Shuffle
            </button>
            <button
              onClick={handleRestart}
              title="Reset all"
              className="text-xs px-3 py-1 rounded-lg border border-[#2a2a2a] text-white/40 hover:text-white disabled:opacity-30 transition-colors"
            >
              🔄 Reset All
            </button>
          </div>
          {/* R3 Review toggle */}
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
        </div>
        {/* R5 Reset flash */}
        <AnimatePresence>
          {resetFlash && (
            <motion.p
              className="text-green-400 text-xs text-center mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Reset!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Counter row */}
      <div className="flex justify-between items-start mb-6">
        <span className="text-white/50 text-xs">{currentQuestion.topic}</span>
        <div className="flex gap-3 items-center">
          <span className="text-[#22d3ee] text-xs font-mono">
            {currentIndex + 1} / {displayQuestions.length}
          </span>
          <span className="text-white/30 text-xs">Score: {score}</span>
        </div>
      </div>

      {/* Question card */}
      <motion.div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-8"
        animate={
          isReviewMode && isWrong && !prefersReduced
            ? { x: [0, -5, 5, -5, 5, 0] }
            : isReviewMode && isCorrect && !prefersReduced
            ? { scale: [1, 1.02, 1] }
            : {}
        }
        transition={isReviewMode && isWrong ? { duration: 0.4 } : isReviewMode && isCorrect ? { duration: 0.5 } : {}}
      >
        <p className="text-gray-100 text-xl font-bold leading-relaxed">
          {currentQuestion.question}
        </p>
      </motion.div>

      {/* Answer buttons */}
      <div className="space-y-3 mb-6">
        {optionLabels.map((label) => {
          const optionText = currentQuestion.options[label];
          if (!optionText) return null;

          let bgClass = 'bg-[#1a1a1a] border-[#2a2a2a]';
          let textClass = 'text-gray-100';

          if (feedback && isReviewMode) {
            if (label === currentQuestion.correctAnswer) {
              bgClass = 'bg-green-600 border-green-400';
              textClass = 'text-white';
            } else if (label === selectedAnswer && !feedback.correct) {
              bgClass = 'bg-red-900/60 border-red-500';
              textClass = 'text-white/70';
            } else {
              bgClass = 'bg-[#1a1a1a] border-[#2a2a2a]';
              textClass = 'text-white/30';
            }
          } else if (answered && !isReviewMode) {
            // Review OFF: neutral gray after tap, no color feedback
            bgClass = 'bg-[#1a1a1a] border-[#2a2a2a]';
            textClass = label === selectedAnswer ? 'text-gray-100' : 'text-white/30';
          } else if (selectedAnswer === label) {
            // Selected state before API responds — immediate feedback
            bgClass = 'bg-blue-800 border-blue-500';
            textClass = 'text-white';
          }

          return (
            <motion.button
              key={label}
              onClick={() => handleAnswer(label)}
              disabled={answered || sessionDone}
              className={`
                w-full min-h-12 rounded-xl border-2 text-left
                flex items-center gap-3 px-4 py-3
                transition-colors active:scale-95
                ${bgClass} ${textClass}
                ${!answered && !sessionDone ? 'hover:border-[#22d3ee] cursor-pointer' : 'cursor-default'}
              `}
              whileTap={!answered && !sessionDone && !prefersReduced ? { scale: 0.97 } : {}}
            >
              <span className="font-bold text-sm w-5 shrink-0">{label}.</span>
              <span className="text-sm leading-snug">{optionText}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback panel — only in Review ON mode */}
      <AnimatePresence>
        {isReviewMode && feedback && (
          <motion.div
            className={`rounded-2xl p-4 mb-4 border ${
              isCorrect ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'
            }`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: prefersReduced ? 0 : 0.25 }}
          >
            <p className={`font-bold text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-gray-300 mt-1 text-sm leading-relaxed">{feedback.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* R4: Reset Question button — only when answered */}
      <AnimatePresence>
        {answered && !sessionDone && feedback && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <button
              onClick={handleResetQuestion}
              className="w-full min-h-10 text-xs text-orange-400 border border-orange-400/50 rounded-xl hover:bg-orange-400/10 transition-colors"
            >
              🔄 Reset Question
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session done */}
      <AnimatePresence>
        {sessionDone && (
          <motion.div
            className="rounded-2xl p-6 mb-6 border border-[#22d3ee] bg-[#1a1a1a]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-[#22d3ee] font-bold text-lg text-center mb-2">Quiz Complete!</p>
            <p className="text-white/60 text-center text-sm mb-1">
              Final Score
            </p>
            <p className="text-white font-bold text-2xl text-center mb-4">
              {score} / {displayQuestions.length}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {}}
                className="w-full min-h-10 text-xs text-[#a855f7] border border-[#a855f7]/50 rounded-xl hover:bg-[#a855f7]/10 transition-colors"
              >
                View Detailed Feedback
              </button>
              <button
                onClick={handleRestart}
                className="w-full min-h-12 bg-[#22d3ee] text-[#0f0f0f] rounded-xl font-bold active:scale-95 transition-transform text-sm"
              >
                Retake Quiz
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0 || sessionDone}
          className="min-h-12 px-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white/70 active:scale-95 transition-transform text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>

        {sessionDone ? (
          <button
            onClick={handleRestart}
            className="flex-1 min-h-12 bg-[#a855f7] text-white rounded-xl font-bold active:scale-95 transition-transform text-sm"
          >
            Restart
          </button>
        ) : answered ? (
          isReviewMode ? (
            feedback && (
              <button
                onClick={handleNext}
                className="flex-1 min-h-12 bg-[#22d3ee] text-[#0f0f0f] rounded-xl font-bold active:scale-95 transition-transform text-sm"
              >
                {currentIndex === displayQuestions.length - 1 ? 'Finish' : 'Next →'}
              </button>
            )
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 min-h-12 bg-[#22d3ee] text-[#0f0f0f] rounded-xl font-bold active:scale-95 transition-transform text-sm"
            >
              {currentIndex === displayQuestions.length - 1 ? 'Finish' : 'Next →'}
            </button>
          )
        ) : (
          <div className="flex-1 min-h-12 bg-[#2a2a2a] rounded-xl flex items-center justify-center text-white/30 text-sm">
            Pick an answer
          </div>
        )}
      </div>
    </div>
  );
}
