import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

export async function GET() {
  try {
    const response = await generateText("Say hello in one sentence");
    return NextResponse.json({ response });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
