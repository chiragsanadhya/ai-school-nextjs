import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }

  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
