import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

export const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = gemini.getGenerativeModel({ model: "gemini-flash-latest" });

const embeddingModel = gemini.getGenerativeModel({
  model: "gemini-embedding-001",
});

export async function generateText(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: TaskType.RETRIEVAL_DOCUMENT
  });
  return result.embedding.values;
}
