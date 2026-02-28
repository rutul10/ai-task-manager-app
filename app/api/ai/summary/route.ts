import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getModel } from "@/lib/gemini";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userEmail: session.user.email },
    orderBy: { createdAt: "desc" },
  });

  if (tasks.length === 0) {
    return NextResponse.json({ summary: "You have no tasks yet!" });
  }

  const model = getModel();
  const prompt = `
    Here are my current tasks:
    ${JSON.stringify(tasks, null, 2)}

    Please give me a concise weekly summary including:
    - Overall progress (how many done vs in progress vs todo)
    - High priority items that need attention
    - Any tasks that have been sitting in todo for a while
    - A motivational closing line

    Keep it friendly and concise, like a helpful assistant checking in.
  `;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const summary = result.response.text();
      return NextResponse.json({ summary });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: "Failed to generate summary. Please try again later." },
        { status: err.status === 429 ? 429 : 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Failed to generate summary after multiple retries." },
    { status: 429 }
  );
}