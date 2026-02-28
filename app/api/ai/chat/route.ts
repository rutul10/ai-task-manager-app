import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getModel } from "@/lib/gemini";
import { toolHandlers } from "@/lib/tools";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();

    const model = getModel();
    const chat = model.startChat();

    let response = await chat.sendMessage(message);

    // Agentic loop — keep going while Gemini wants to call tools
    while (true) {
      const candidate = response.response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      const toolCalls = parts.filter((p) => p.functionCall);

      if (toolCalls.length === 0) break;

      // Execute all tool calls
      const toolResults = await Promise.all(
        toolCalls.map(async (part) => {
          const { name, args } = part.functionCall!;
          const handler = toolHandlers[name];
          const result = handler ? await handler(args) : { error: "Unknown tool" };
          return {
            functionResponse: {
              name,
              response: { result },
            },
          };
        })
      );

      // Send results back to Gemini
      response = await chat.sendMessage(toolResults as any);
    }

    const text = response.response.text();
    return NextResponse.json({ reply: text });
  } catch (error: any) {
    const status = error?.status ?? 500;
    const message =
      status === 429
        ? "Gemini API rate limit exceeded. Please wait and try again."
        : error?.message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status });
  }
}