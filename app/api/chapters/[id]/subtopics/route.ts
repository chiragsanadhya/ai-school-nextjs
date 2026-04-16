import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateText } from "@/lib/gemini";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await prisma.chapterSubtopic.findMany({
      where: { chapter_id: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const existing = await prisma.chapterSubtopic.findMany({
      where: { chapter_id: id },
      orderBy: { order: "asc" },
    });

    if (existing.length > 0) {
      return NextResponse.json({ data: existing, cached: true });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const escapedName = chapter.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const prompt = `You are a curriculum expert. Given the chapter name: '${escapedName}', generate a list of 6-10 subtopics that this chapter would cover in a school textbook. Return ONLY a valid JSON array of strings, no explanation, no markdown, no backticks. Example: ["Subtopic 1","Subtopic 2"]`;

    const raw = await generateText(prompt);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      !parsed.every(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
    ) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const titles = parsed;

    await prisma.chapterSubtopic.createMany({
      data: titles.map((title, order) => ({
        chapter_id: id,
        title,
        order,
      })),
    });

    const data = await prisma.chapterSubtopic.findMany({
      where: { chapter_id: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ data, cached: false });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
