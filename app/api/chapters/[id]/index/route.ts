import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import prisma from "@/lib/prisma";
import { generateEmbedding } from "@/lib/gemini";

const CHUNK_SIZE = 500;
const OVERLAP = 100;
const MIN_CHUNK_LENGTH = 50;

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  const step = CHUNK_SIZE - OVERLAP;
  for (let i = 0; i < text.length; i += step) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    if (chunk.length >= MIN_CHUNK_LENGTH) {
      chunks.push(chunk);
    }
  }
  return chunks;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const existingCount = await prisma.chapterChunk.count({
      where: { chapter_id: id },
    });

    if (existingCount > 0) {
      return NextResponse.json({
        message: "Already indexed",
        cached: true,
      });
    }

    const pdfResponse = await fetch(chapter.pdf_url);
    if (!pdfResponse.ok) {
      throw new Error(`PDF fetch failed: ${pdfResponse.status}`);
    }

    const buffer = Buffer.from(await pdfResponse.arrayBuffer());

    const parser = new PDFParse({ data: buffer });
    let fullText: string;
    try {
      const parsed = await parser.getText();
      fullText = parsed.text;
    } finally {
      await parser.destroy();
    }

    const textChunks = splitIntoChunks(fullText);

    for (let index = 0; index < textChunks.length; index++) {
      const content = textChunks[index]!;
      const embedding = await generateEmbedding(content);
      const embeddingStr = `[${embedding.join(",")}]`;

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "ChapterChunk" (id, chapter_id, content, embedding, chunk_index, created_at)
          VALUES (gen_random_uuid()::text, ${id}, ${content}, ${embeddingStr}::vector, ${index}, NOW())
        `,
      );
    }

    return NextResponse.json(
      {
        message: "Indexed successfully",
        chunks: textChunks.length,
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
