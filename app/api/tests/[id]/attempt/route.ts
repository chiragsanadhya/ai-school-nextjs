import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isNonEmptyAnswersObject(v: unknown): v is Record<string, string> {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v as object).length > 0
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id: testId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const raw =
    body && typeof body === "object"
      ? (body as { answers?: unknown })
      : null;
  const answersPayload = raw?.answers;

  if (!isNonEmptyAnswersObject(answersPayload)) {
    return NextResponse.json({ error: "answers are required" }, { status: 400 });
  }

  const answers = answersPayload;

  try {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const questions = test.questions;
    let correct = 0;
    for (const q of questions) {
      const selected = answers[q.id];
      const normalized =
        typeof selected === "string" ? selected.trim().toUpperCase() : "";
      if (normalized === q.correct_answer) {
        correct += 1;
      }
    }

    const total = questions.length;
    const score = total === 0 ? 0 : Math.round((correct / total) * 100);

    const attempt = await prisma.testAttempt.create({
      data: {
        test_id: testId,
        user_id: userId,
        answers,
        score,
      },
    });

    const results = questions.map((q) => {
      const selected = answers[q.id];
      const normalized =
        typeof selected === "string" ? selected.trim().toUpperCase() : "";
      return {
        questionId: q.id,
        question_text: q.question_text,
        selectedAnswer: typeof selected === "string" ? selected : "",
        correctAnswer: q.correct_answer,
        isCorrect: normalized === q.correct_answer,
        explanation: q.explanation,
      };
    });

    return NextResponse.json(
      {
        data: {
          attemptId: attempt.id,
          score,
          total: questions.length,
          correct,
          results,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id: testId } = await params;

  try {
    const data = await prisma.testAttempt.findMany({
      where: {
        test_id: testId,
        user_id: userId,
      },
      orderBy: { submitted_at: "desc" },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
