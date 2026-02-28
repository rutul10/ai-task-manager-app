import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
        <p className="text-sm text-gray-500">Sign in to manage your tasks</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}