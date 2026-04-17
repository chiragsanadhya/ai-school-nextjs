import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateText } from "@/lib/gemini";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function isDifficulty(v: unknown): v is (typeof DIFFICULTIES)[number] {
  return (
    typeof v === "string" &&
    DIFFICULTIES.includes(v as (typeof DIFFICULTIES)[number])
  );
}

type ParsedQuestion = {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
};

function isParsedQuestion(item: unknown): item is ParsedQuestion {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  if (typeof o.question_text !== "string" || o.question_text.length === 0) {
    return false;
  }
  if (!Array.isArray(o.options) || o.options.length !== 4) return false;
  if (!o.options.every((x) => typeof x === "string" && x.length > 0)) {
    return false;
  }
  if (typeof o.correct_answer !== "string") return false;
  const letter = o.correct_answer.trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(letter)) return false;
  if (typeof o.explanation !== "string" || o.explanation.length === 0) {
    return false;
  }
  return true;
}

function normalizeQuestion(item: ParsedQuestion): ParsedQuestion {
  return {
    ...item,
    correct_answer: item.correct_answer.trim().toUpperCase(),
  };
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

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
      ? (body as {
          chapterId?: unknown;
          selectedSubtopics?: unknown;
          numQuestions?: unknown;
          difficulty?: unknown;
        })
      : null;

  const chapterId =
    typeof raw?.chapterId === "string" ? raw.chapterId : undefined;
  const selectedSubtopics = raw?.selectedSubtopics;
  const numQuestionsRaw = raw?.numQuestions;
  const difficulty = raw?.difficulty;

  const subtopicsOk =
    Array.isArray(selectedSubtopics) &&
    selectedSubtopics.length > 0 &&
    selectedSubtopics.every(
      (item): item is string => typeof item === "string" && item.length > 0,
    );

  const numQuestionsOk =
    typeof numQuestionsRaw === "number" &&
    Number.isInteger(numQuestionsRaw) &&
    numQuestionsRaw >= 1 &&
    numQuestionsRaw <= 20;

  if (
    chapterId === undefined ||
    chapterId === "" ||
    !subtopicsOk ||
    !numQuestionsOk ||
    !isDifficulty(difficulty)
  ) {
    return NextResponse.json(
      {
        error:
          "chapterId, selectedSubtopics, numQuestions and difficulty are required",
      },
      { status: 400 },
    );
  }

  const numQuestions = numQuestionsRaw;

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { name: true },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const prompt = `You are an expert teacher creating a multiple choice test for students.
 Chapter: ${chapter.name}
 Subtopics to cover: ${selectedSubtopics.join(", ")}
 Number of questions: ${numQuestions}
 Difficulty: ${difficulty} (easy = straightforward recall, medium = application based, hard = analytical and tricky)
 Generate exactly ${numQuestions} MCQ questions.
 Each question must have exactly 4 options labeled A, B, C, D.
 Return ONLY a valid JSON array with no explanation, no markdown, no backticks.
 Each item in the array must have these exact keys:
 question_text, options (array of 4 strings like ["A. ...", "B. ...", "C. ...", "D. ..."]), correct_answer (just the letter: "A", "B", "C" or "D"), explanation (one sentence)`;

    const rawText = await generateText(prompt);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    if (
      !Array.isArray(parsed) ||
      parsed.length !== numQuestions ||
      !parsed.every(isParsedQuestion)
    ) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const questionsInput = parsed.map(normalizeQuestion);

    const data = await prisma.$transaction(async (tx) => {
      const test = await tx.test.create({
        data: {
          user_id: userId,
          chapter_id: chapterId,
          selected_subtopics: selectedSubtopics,
          num_questions: numQuestions,
          difficulty,
        },
      });

      await tx.testQuestion.createMany({
        data: questionsInput.map((q, order) => ({
          test_id: test.id,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          order,
        })),
      });

      const questions = await tx.testQuestion.findMany({
        where: { test_id: test.id },
        orderBy: { order: "asc" },
      });

      return { ...test, questions };
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const chapterId = request.nextUrl.searchParams.get("chapterId");

  if (!chapterId) {
    return NextResponse.json(
      { error: "chapterId is required" },
      { status: 400 },
    );
  }

  try {
    const data = await prisma.test.findMany({
      where: { chapter_id: chapterId },
      orderBy: { created_at: "desc" },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
