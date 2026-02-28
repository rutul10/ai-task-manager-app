import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

import { randomBytes } from "crypto";
import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { IncomingMessage, ServerResponse } from "http";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const NEXT_APP_URL = process.env.NEXT_APP_URL ?? "http://localhost:3000";
const MCP_API_KEY = process.env.MCP_API_KEY!;
const MCP_PORT = parseInt(process.env.MCP_PORT ?? "3001");
const MCP_BASE_URL = process.env.MCP_BASE_URL ?? `http://localhost:${MCP_PORT}`;

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const registeredClients = new Map<string, OAuthClientInformationFull>();

// google state → pending MCP auth params
const pendingAuth = new Map<
  string,
  { codeChallenge: string; clientId: string; redirectUri: string; mcpState?: string }
>();

// our auth code → { codeChallenge, clientId, email }
const authCodes = new Map<
  string,
  { codeChallenge: string; clientId: string; email: string }
>();

// access token → session
const accessTokens = new Map<
  string,
  { email: string; clientId: string; expiresAt: number }
>();

// ---------------------------------------------------------------------------
// OAuth provider — delegates user identity to Google, issues our own tokens
// ---------------------------------------------------------------------------

const provider: OAuthServerProvider = {
  get clientsStore() {
    return {
      getClient(clientId: string) {
        return registeredClients.get(clientId);
      },
      registerClient(
        client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
      ) {
        const full: OAuthClientInformationFull = {
          ...client,
          client_id: randomBytes(16).toString("hex"),
          client_id_issued_at: Math.floor(Date.now() / 1000),
        };
        registeredClients.set(full.client_id, full);
        return full;
      },
    };
  },

  // Step 1: MCP client hits /authorize → we redirect to Google
  async authorize(client, params, res) {
    const googleState = randomBytes(16).toString("hex");
    pendingAuth.set(googleState, {
      codeChallenge: params.codeChallenge,
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      mcpState: params.state,
    });

    const googleParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${MCP_BASE_URL}/callback`,
      response_type: "code",
      scope: "openid email profile",
      state: googleState,
    });

    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${googleParams}`
    );
  },

  // Step 3: SDK calls this during token exchange to validate PKCE
  async challengeForAuthorizationCode(_client, authorizationCode) {
    const entry = authCodes.get(authorizationCode);
    if (!entry) throw new Error("Invalid authorization code");
    return entry.codeChallenge;
  },

  // Step 4: SDK calls this after PKCE validation — issue our access token
  async exchangeAuthorizationCode(client, authorizationCode) {
    const entry = authCodes.get(authorizationCode);
    if (!entry) throw new Error("Invalid authorization code");
    authCodes.delete(authorizationCode);

    const token = randomBytes(32).toString("hex");
    accessTokens.set(token, {
      email: entry.email,
      clientId: client.client_id,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 hours
    });

    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: 60 * 60 * 8,
    } as OAuthTokens;
  },

  async exchangeRefreshToken() {
    throw new Error("Refresh tokens not supported");
  },

  async verifyAccessToken(token): Promise<AuthInfo> {
    const session = accessTokens.get(token);
    if (!session || session.expiresAt < Math.floor(Date.now() / 1000)) {
      accessTokens.delete(token);
      throw new Error("Invalid or expired token");
    }
    return {
      token,
      clientId: session.clientId,
      scopes: ["tasks"],
      expiresAt: session.expiresAt,
      extra: { email: session.email },
    };
  },

  async revokeToken(_client, request) {
    accessTokens.delete(request.token);
  },
};

// ---------------------------------------------------------------------------
// MCP Server factory — one per request, scoped to the authenticated user
// ---------------------------------------------------------------------------

function createMcpServer(userEmail: string): McpServer {
  const apiHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${MCP_API_KEY}`,
    "x-user-email": userEmail,
  };

  const server = new McpServer({ name: "task-manager", version: "1.0.0" });

  server.registerTool("list_tasks", { description: "Get all tasks" }, async () => {
    const res = await fetch(`${NEXT_APP_URL}/api/tasks`, { headers: apiHeaders });
    return { content: [{ type: "text", text: JSON.stringify(await res.json(), null, 2) }] };
  });

  server.registerTool(
    "create_task",
    {
      description: "Create a new task",
      inputSchema: {
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      },
    },
    async ({ title, description, priority }) => {
      const res = await fetch(`${NEXT_APP_URL}/api/tasks`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ title, description, priority }),
      });
      return { content: [{ type: "text", text: JSON.stringify(await res.json(), null, 2) }] };
    }
  );

  server.registerTool(
    "update_task_status",
    {
      description: "Update the status of a task",
      inputSchema: {
        id: z.number(),
        status: z.enum(["todo", "in_progress", "done"]),
      },
    },
    async ({ id, status }) => {
      const res = await fetch(`${NEXT_APP_URL}/api/tasks/${id}`, {
        method: "PATCH",
        headers: apiHeaders,
        body: JSON.stringify({ status }),
      });
      return { content: [{ type: "text", text: JSON.stringify(await res.json(), null, 2) }] };
    }
  );

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task by ID",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => {
      await fetch(`${NEXT_APP_URL}/api/tasks/${id}`, { method: "DELETE", headers: apiHeaders });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// 1. MCP OAuth endpoints: /.well-known/oauth-authorization-server, /authorize,
//    /token, /register, /revoke
app.use(mcpAuthRouter({ provider, issuerUrl: new URL(MCP_BASE_URL) }));

// 2. Google OAuth callback (custom route — Google sends the user back here)
//    NOTE: http://localhost:3001/callback must be added to your Google Cloud
//    Console → OAuth 2.0 Client → Authorized redirect URIs
app.get("/callback", async (req, res) => {
  const { code, state: googleState } = req.query as { code: string; state: string };

  const pending = pendingAuth.get(googleState);
  if (!pending) {
    res.status(400).send("Invalid or expired state");
    return;
  }
  pendingAuth.delete(googleState);

  // Exchange Google auth code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${MCP_BASE_URL}/callback`,
      grant_type: "authorization_code",
    }),
  });

  const googleTokens = (await tokenRes.json()) as { access_token: string };

  // Get authenticated user's email
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${googleTokens.access_token}` },
  });
  const user = (await userRes.json()) as { email: string };

  // Create our auth code for the MCP client to exchange
  const authCode = randomBytes(32).toString("hex");
  authCodes.set(authCode, {
    codeChallenge: pending.codeChallenge,
    clientId: pending.clientId,
    email: user.email,
  });

  // Redirect back to the MCP client with the auth code
  const callbackParams = new URLSearchParams({ code: authCode });
  if (pending.mcpState) callbackParams.set("state", pending.mcpState);
  res.redirect(`${pending.redirectUri}?${callbackParams}`);
});

// 3. MCP endpoint — protected by Bearer token
const bearerAuth = requireBearerAuth({ verifier: provider });

app.all("/mcp", bearerAuth, async (req, res) => {
  const email = req.auth?.extra?.email as string;
  const server = createMcpServer(email);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await server.connect(transport);
  await transport.handleRequest(
    req as unknown as IncomingMessage & { auth?: AuthInfo },
    res as unknown as ServerResponse,
    req.body
  );

  res.on("finish", () => server.close());
});

app.listen(MCP_PORT, () => {
  console.error(`MCP server running at ${MCP_BASE_URL}`);
  console.error(`MCP endpoint: ${MCP_BASE_URL}/mcp`);
});
