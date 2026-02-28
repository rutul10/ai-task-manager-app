type Task = {
  id: number;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  createdAt: string;
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

export default function TaskList({
  tasks,
  onDelete,
  onStatusChange,
}: {
  tasks: Task[];
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  if (tasks.length === 0)
    return <p className="text-gray-400 text-sm">No tasks yet. Create one!</p>;

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{task.title}</p>
            {task.description && (
              <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
            )}
            <div className="flex gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[task.status]}`}>
                {task.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end shrink-0">
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              className="text-xs border rounded px-1 py-0.5 text-gray-600"
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <button
              onClick={() => onDelete(task.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}