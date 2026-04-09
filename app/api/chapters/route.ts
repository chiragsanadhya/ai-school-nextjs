import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subjectId");

  if (!subjectId) {
    return NextResponse.json(
      { error: "subjectId is required" },
      { status: 400 },
    );
  }

  try {
    const data = await prisma.chapter.findMany({
      where: { subject_id: subjectId },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
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
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const raw =
    body && typeof body === "object"
      ? (body as {
          name?: unknown;
          subjectId?: unknown;
          order?: unknown;
          pdfUrl?: unknown;
        })
      : null;
  const name =
    typeof raw?.name === "string" ? raw.name : undefined;
  const subjectId =
    typeof raw?.subjectId === "string" ? raw.subjectId : undefined;
  const pdfUrl =
    typeof raw?.pdfUrl === "string" ? raw.pdfUrl : undefined;
  const order = raw?.order;

  if (
    name === undefined ||
    name === "" ||
    subjectId === undefined ||
    subjectId === "" ||
    pdfUrl === undefined ||
    pdfUrl === "" ||
    typeof order !== "number" ||
    !Number.isFinite(order)
  ) {
    return NextResponse.json(
      { error: "name, subjectId, order and pdfUrl are required" },
      { status: 400 },
    );
  }

  try {
    const data = await prisma.chapter.create({
      data: {
        name,
        subject_id: subjectId,
        order: Math.trunc(order),
        pdf_url: pdfUrl,
      },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
