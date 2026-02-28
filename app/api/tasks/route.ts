import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUserEmail } from "@/lib/mcp-auth";

export async function GET(req: Request) {
  try {
    const email = await resolveUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const email = await resolveUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? "medium",
        status: body.status ?? "todo",
        userId: email,
        userEmail: email,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
