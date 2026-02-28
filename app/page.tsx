import { auth, signOut } from "@/auth";
import Dashboard from "./components/Dashboard";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome, {session?.user?.name}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5"
            >
              Sign out
            </button>
          </form>
        </div>
        <Dashboard />
      </div>
    </main>
  );
}