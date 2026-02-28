"use client";

import { useEffect, useState } from "react";
import TaskList from "./TaskList";
import TaskForm from "./TaskForm";
import AIChat from "./AIChat";
import WeeklySummary from "./WeeklySummary";

type Task = {
  id: number;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  createdAt: string;
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);

  async function loadTasks() {
    const res = await fetch("/api/tasks");
    if (!res.ok) return;
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  }

  async function handleStatusChange(id: number, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadTasks();
  }

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel — AI */}
      <div className="space-y-6">
        <WeeklySummary />
        <AIChat />
      </div>

      {/* Right Panel — Task Manager */}
      <div className="space-y-6">
        <TaskForm onCreated={loadTasks} />
        <TaskList
          tasks={tasks}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}