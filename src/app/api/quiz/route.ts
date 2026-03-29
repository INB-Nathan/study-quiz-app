import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const QUESTIONS_PATH = path.join(process.cwd(), 'public/questions.json');

interface Question {
  id: number;
  topic: string;
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
  explanation: string;
}

function getQuestions(): Question[] {
  const fileContents = fs.readFileSync(QUESTIONS_PATH, 'utf8');
  return JSON.parse(fileContents);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, selectedAnswer } = body;

    if (questionId === undefined || selectedAnswer === undefined) {
      return NextResponse.json(
        { error: 'Missing questionId or selectedAnswer' },
        { status: 400 }
      );
    }

    const validAnswers = ['A', 'B', 'C', 'D', 'E'];
    if (!validAnswers.includes(selectedAnswer.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid selectedAnswer. Must be A, B, C, D, or E' },
        { status: 400 }
      );
    }

    const questions = getQuestions();
    const question = questions.find((q) => q.id === questionId);

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const isCorrect = question.correctAnswer === selectedAnswer.toUpperCase();
    const isReview = request.nextUrl.searchParams.get('review') === 'true';

    return NextResponse.json({
      correct: isCorrect,
      explanation: question.explanation,
      correctAnswer: isReview ? question.correctAnswer : undefined
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}