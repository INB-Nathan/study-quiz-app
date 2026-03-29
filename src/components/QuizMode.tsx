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

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = async (answer: string) => {
    if (answered) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    try {
      const res = await fetch(`/api/quiz?review=${isReviewMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, selectedAnswer: answer })
      });

      const data = await res.json();
      setFeedback(data);

      if (data.correct) {
        setScore((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setAnswered(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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

  const optionLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setIsReviewMode(!isReviewMode)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            isReviewMode
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {isReviewMode ? 'Review Mode ON' : 'Review Mode'}
        </button>
        <span className="text-gray-400 text-sm">
          Score: {score}/{currentIndex + (answered ? 1 : 0)}
        </span>
      </div>

      <div className="mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-1 text-right">
          {currentIndex + 1} / {questions.length}
        </p>
      </div>

      <div className="mb-2">
        <span className="text-gray-400 text-sm">{currentQuestion.topic}</span>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
        <p className="text-white text-lg leading-relaxed">
          {currentQuestion.question}
        </p>
      </div>

      <div className="space-y-3">
        {optionLabels.map((label) => {
          const optionText = currentQuestion.options[label];
          if (!optionText) return null;

          let buttonClass = 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white';

          if (feedback) {
            if (label === currentQuestion.correctAnswer) {
              buttonClass = 'bg-green-900 border-green-500 text-white';
            } else if (label === selectedAnswer && !feedback.correct) {
              buttonClass = 'bg-red-900 border-red-500 text-white';
            } else {
              buttonClass = 'bg-gray-800 border-gray-700 text-gray-500';
            }
          } else if (selectedAnswer === label) {
            buttonClass = 'bg-blue-800 border-blue-500 text-white';
          }

          return (
            <button
              key={label}
              onClick={() => handleAnswer(label)}
              disabled={answered}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${buttonClass} ${
                !answered ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="font-semibold mr-3">{label}.</span>
              {optionText}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`mt-6 p-4 rounded-xl ${
            feedback.correct ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
          }`}
        >
          <p className={`font-semibold ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.correct ? 'Correct!' : 'Incorrect'}
          </p>
          <p className="text-gray-300 mt-2 text-sm">{feedback.explanation}</p>
        </div>
      )}

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          Previous
        </button>

        {currentIndex === questions.length - 1 && answered && (
          <button
            onClick={handleRestart}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
          >
            Restart Quiz
          </button>
        )}

        {answered && currentIndex < questions.length - 1 && (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
}