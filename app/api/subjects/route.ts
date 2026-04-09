import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const classId = request.nextUrl.searchParams.get("classId");

  if (!classId) {
    return NextResponse.json(
      { error: "classId is required" },
      { status: 400 },
    );
  }

  try {
    const data = await prisma.subject.findMany({
      where: { class_id: classId },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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
      ? (body as { name?: unknown; classId?: unknown })
      : null;
  const name =
    typeof raw?.name === "string" ? raw.name : undefined;
  const classId =
    typeof raw?.classId === "string" ? raw.classId : undefined;

  if (
    name === undefined ||
    name === "" ||
    classId === undefined ||
    classId === ""
  ) {
    return NextResponse.json(
      { error: "name and classId are required" },
      { status: 400 },
    );
  }

  try {
    const data = await prisma.subject.create({
      data: { name, class_id: classId },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
