import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object"
      ? (body as { chapterId?: unknown })
      : null;
  const chapterId =
    typeof raw?.chapterId === "string" ? raw.chapterId : undefined;
  if (!chapterId) {
    return NextResponse.json({ error: "chapterId is required" }, { status: 400 });
  }

  try {
    const data = await prisma.userProgress.upsert({
      where: {
        user_id_chapter_id: {
          user_id: userId,
          chapter_id: chapterId,
        },
      },
      create: {
        user_id: userId,
        chapter_id: chapterId,
        is_completed: false,
      },
      update: {
        last_opened_at: new Date(),
      },
    });
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
