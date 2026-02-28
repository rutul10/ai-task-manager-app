import { GoogleGenerativeAI, Tool } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "list_tasks",
        description: "Get all tasks from the database",
        parameters: {
          type: "object" as any,
          properties: {},
          required: [],
        },
      },
      {
        name: "create_task",
        description: "Create a new task",
        parameters: {
          type: "object" as any,
          properties: {
            title: { type: "string" as any, description: "Task title" },
            description: { type: "string" as any, description: "Optional description" },
            priority: { type: "string" as any, description: "low | medium | high" },
          },
          required: ["title"],
        },
      },
      {
        name: "update_task_status",
        description: "Update the status of a task",
        parameters: {
          type: "object" as any,
          properties: {
            id: { type: "number" as any, description: "Task ID" },
            status: { type: "string" as any, description: "todo | in_progress | done" },
          },
          required: ["id", "status"],
        },
      },
      {
        name: "delete_task",
        description: "Delete a task by ID",
        parameters: {
          type: "object" as any,
          properties: {
            id: { type: "number" as any, description: "Task ID" },
          },
          required: ["id"],
        },
      },
    ],
  },
];

export function getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools,
    systemInstruction:
      "You are a helpful task manager assistant. Use the available tools to help users manage their tasks. Always confirm what actions you took.",
  });
}