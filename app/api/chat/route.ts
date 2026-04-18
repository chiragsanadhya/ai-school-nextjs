import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateEmbedding, generateText } from "@/lib/gemini";

type ChunkRow = {
  id: string;
  content: string;
  chunk_index: number;
  similarity: number;
};

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
          sessionId?: unknown;
          message?: unknown;
        })
      : null;

  const chapterId =
    typeof raw?.chapterId === "string" ? raw.chapterId : undefined;
  const message = typeof raw?.message === "string" ? raw.message : undefined;
  const sessionIdRaw = raw?.sessionId;

  if (
    chapterId === undefined ||
    chapterId === "" ||
    message === undefined ||
    message === ""
  ) {
    return NextResponse.json(
      { error: "chapterId and message are required" },
      { status: 400 },
    );
  }

  const sessionIdFromBody =
    typeof sessionIdRaw === "string" && sessionIdRaw.length > 0
      ? sessionIdRaw
      : undefined;

  try {
    let sessionId: string;

    if (sessionIdFromBody === undefined) {
      const chatSession = await prisma.chatSession.create({
        data: {
          user_id: userId,
          chapter_id: chapterId,
        },
      });
      sessionId = chatSession.id;
    } else {
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionIdFromBody },
      });
      if (!chatSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      sessionId = chatSession.id;
    }

    await prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        role: "user",
        content: message,
      },
    });

    const embedding = await generateEmbedding(message);
    const embeddingStr = `[${embedding.join(",")}]`;

    const chunks = (await prisma.$queryRaw`
      SELECT id, content, chunk_index,
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM "ChapterChunk"
      WHERE chapter_id = ${chapterId}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT 5
    `) as ChunkRow[];

    const context = chunks
      .map((c: ChunkRow, i: number) => "Chunk " + (i + 1) + ": " + c.content)
      .join("\n\n");

    const prompt = `You are a helpful study assistant. Answer the student's question based only on the context provided below.
If the answer is not in the context, say 'I could not find this in the chapter.'

Context:
${context}

Student Question: ${message}

Provide a clear and helpful answer.`;

    const answer = await generateText(prompt);

    const citations = chunks.map((c: ChunkRow) => ({
      chunkId: c.id,
      chunkIndex: c.chunk_index,
      snippet: c.content.slice(0, 100),
    }));

    await prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        role: "assistant",
        content: answer,
        citations,
      },
    });

    return NextResponse.json(
      { data: { sessionId, answer, citations } },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ data: { session, messages } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
