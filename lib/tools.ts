import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function getSessionEmail(): Promise<string> {
  const session = await auth();
  return session?.user?.email ?? "unknown";
}

export async function list_tasks() {
  const email = await getSessionEmail();
  const tasks = await prisma.task.findMany({
    where: { userEmail: email },
    orderBy: { createdAt: "desc" },
  });
  return tasks;
}

export async function create_task(args: {
  title: string;
  description?: string;
  priority?: string;
}) {
  const email = await getSessionEmail();
  const task = await prisma.task.create({
    data: {
      title: args.title,
      description: args.description ?? null,
      priority: args.priority ?? "medium",
      userId: email,
      userEmail: email,
    },
  });
  return task;
}

export async function update_task_status(args: { id: number; status: string }) {
  const email = await getSessionEmail();
  const task = await prisma.task.update({
    where: { id: args.id, userEmail: email },
    data: { status: args.status },
  });
  return task;
}

export async function delete_task(args: { id: number }) {
  const email = await getSessionEmail();
  await prisma.task.delete({ where: { id: args.id, userEmail: email } });
  return { success: true, id: args.id };
}

export const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  list_tasks,
  create_task,
  update_task_status,
  delete_task,
};