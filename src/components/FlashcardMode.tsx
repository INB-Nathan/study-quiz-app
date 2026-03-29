'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSeenIds(new Set(JSON.parse(stored)));
    }
  }, []);

  const currentQuestion = questions[currentIndex];

  const markAsSeen = (id: number) => {
    const newSeen = new Set(seenIds);
    newSeen.add(id);
    setSeenIds(newSeen);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSeen]));
  };

  const handleNext = () => {
    markAsSeen(currentQuestion.id);
    setIsRevealed(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setIsRevealed(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(questions.length - 1);
    }
  };

  const handleReveal = () => {
    setIsRevealed(true);
    markAsSeen(currentQuestion.id);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-gray-400 text-sm">{currentQuestion.topic}</span>
        <span className="text-gray-500 text-sm">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-8 min-h-64 cursor-pointer transition-all hover:border-gray-600"
        onClick={!isRevealed ? handleReveal : undefined}
      >
        <p className="text-white text-xl text-center leading-relaxed">
          {currentQuestion.question}
        </p>

        {isRevealed && (
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-gray-300 text-center text-lg">
              <span className="text-green-400 font-semibold">{currentQuestion.correctAnswer}</span>
              {' - '}
              {currentQuestion.options[currentQuestion.correctAnswer]}
            </p>
            {currentQuestion.explanation && (
              <p className="text-gray-500 text-center mt-4 text-sm italic">
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {!isRevealed && (
        <p className="text-gray-500 text-center mt-4 text-sm">
          Tap card to reveal answer
        </p>
      )}

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePrev}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          Previous
        </button>

        {isRevealed ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Next Card
          </button>
        ) : (
          <button
            onClick={handleReveal}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
          >
            Reveal Answer
          </button>
        )}
      </div>

      <div className="mt-6 text-center text-gray-500 text-sm">
        {seenIds.size} cards seen
      </div>
    </div>
  );
}