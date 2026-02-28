import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    const task = await prisma.task.update({
        where: { id: parseInt(id) },
        data: body,
    });
    return NextResponse.json(task);
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await prisma.task.delete({
        where: { id: parseInt(id) },
    });
    return new NextResponse(null, { status: 204 });
}
