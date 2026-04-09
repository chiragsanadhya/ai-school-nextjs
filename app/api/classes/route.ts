import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.class.findMany();
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
      ? (body as { name?: unknown })
      : null;
  const name = typeof raw?.name === "string" ? raw.name : undefined;

  if (name === undefined || name === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const data = await prisma.class.create({ data: { name } });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
