import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateText } from "@/lib/gemini";

const NOTE_LENGTHS = ["short", "medium", "long"] as const;
const LANGUAGE_LEVELS = ["easy", "medium", "advanced"] as const;

function isNoteLength(v: unknown): v is (typeof NOTE_LENGTHS)[number] {
  return typeof v === "string" && NOTE_LENGTHS.includes(v as (typeof NOTE_LENGTHS)[number]);
}

function isLanguageLevel(v: unknown): v is (typeof LANGUAGE_LEVELS)[number] {
  return (
    typeof v === "string" &&
    LANGUAGE_LEVELS.includes(v as (typeof LANGUAGE_LEVELS)[number])
  );
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
          length?: unknown;
          languageLevel?: unknown;
        })
      : null;

  const chapterId =
    typeof raw?.chapterId === "string" ? raw.chapterId : undefined;
  const selectedSubtopics = raw?.selectedSubtopics;
  const length = raw?.length;
  const languageLevel = raw?.languageLevel;

  const subtopicsOk =
    Array.isArray(selectedSubtopics) &&
    selectedSubtopics.length > 0 &&
    selectedSubtopics.every(
      (item): item is string => typeof item === "string" && item.length > 0,
    );

  if (
    chapterId === undefined ||
    chapterId === "" ||
    !subtopicsOk ||
    !isNoteLength(length) ||
    !isLanguageLevel(languageLevel)
  ) {
    return NextResponse.json(
      {
        error:
          "chapterId, selectedSubtopics, length and languageLevel are required",
      },
      { status: 400 },
    );
  }

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { name: true },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const prompt = `You are an expert teacher creating study notes for students.
 Chapter: ${chapter.name}
 Subtopics to cover: ${selectedSubtopics.join(", ")}
 Notes length: ${length} (short = ~200 words, medium = ~400 words, long = ~700 words)
 Language level: ${languageLevel} (easy = simple language for beginners, medium = standard textbook language, advanced = technical and detailed)
 Generate well-structured study notes covering only the given subtopics.
 Use clear headings for each subtopic.
 Return only the notes content, no extra commentary.`;

    const content = await generateText(prompt);

    const data = await prisma.note.create({
      data: {
        user_id: userId,
        chapter_id: chapterId,
        selected_subtopics: selectedSubtopics,
        length,
        language_level: languageLevel,
        content,
      },
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
    const data = await prisma.note.findMany({
      where: { chapter_id: chapterId },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
