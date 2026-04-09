import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.chapter.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "At least one field required" },
      { status: 400 },
    );
  }

  const raw = body as Record<string, unknown>;
  const hasName = "name" in raw;
  const hasOrder = "order" in raw;
  const hasPdfUrl = "pdfUrl" in raw;

  if (!hasName && !hasOrder && !hasPdfUrl) {
    return NextResponse.json(
      { error: "At least one field required" },
      { status: 400 },
    );
  }

  const data: { name?: string; order?: number; pdf_url?: string } = {};

  if (hasName) {
    if (typeof raw.name !== "string") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    data.name = raw.name;
  }

  if (hasOrder) {
    if (typeof raw.order !== "number" || !Number.isFinite(raw.order)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    data.order = Math.trunc(raw.order);
  }

  if (hasPdfUrl) {
    if (typeof raw.pdfUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    data.pdf_url = raw.pdfUrl;
  }

  try {
    const updated = await prisma.chapter.update({
      where: { id },
      data,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
