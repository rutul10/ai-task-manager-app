import { auth } from "@/auth";

/**
 * Resolves the authenticated user email from either:
 * 1. A NextAuth session (browser / cookie-based)
 * 2. An MCP API key passed via Authorization + x-user-email headers (MCP server)
 */
export async function resolveUserEmail(req: Request): Promise<string | null> {
  const session = await auth();
  if (session?.user?.email) return session.user.email;

  const authHeader = req.headers.get("authorization");
  const userEmail = req.headers.get("x-user-email");

  if (
    authHeader === `Bearer ${process.env.MCP_API_KEY}` &&
    process.env.MCP_API_KEY &&
    userEmail
  ) {
    return userEmail;
  }

  return null;
}
