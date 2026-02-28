import { NextResponse } from "next/server";
import { prisma }  from "@/lib/prisma";

export async function GET() {
    const tasks = await prisma.task.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
}

export async function POST(request: Request) {
    const body = await request.json();
    const task = await prisma.task.create({
        data: {
            title: body.title,
            description: body.description,
            priority: body.priority ?? "medium",
            status: body.status ?? "todo",
        },
    });
    return NextResponse.json(task, { status: 201 });
}