# AI Task Manager

A full-stack AI-powered task management application with a built-in conversational AI assistant and a standalone MCP (Model Context Protocol) server for tool-based integrations.

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React framework (App Router) |
| **React** | 19.2.3 | UI library |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **TypeScript** | 5.9.3 | Type safety across the entire codebase |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 16.1.6 | REST API (`/api/tasks`, `/api/ai/chat`) |
| **NextAuth.js** | 5.0 (beta) | Authentication via Google OAuth |
| **Prisma ORM** | 7.4.2 | Database access & schema management |
| **Neon (Serverless Postgres)** | 1.0.2 | PostgreSQL database via `@neondatabase/serverless` + `@prisma/adapter-neon` |

### AI

| Technology | Purpose |
|------------|---------|
| **Google Gemini** (`@google/generative-ai`) | Conversational AI assistant with function calling |
| **Agentic tool loop** | Gemini autonomously calls tools (list, create, update, delete tasks) in a loop until the user's request is fulfilled |

### MCP Server

| Technology | Version | Purpose |
|------------|---------|---------|
| **@modelcontextprotocol/sdk** | 1.27.1 | MCP protocol implementation |
| **Express** | 5.x | HTTP server for the MCP endpoint |
| **Zod** | — | Input schema validation for MCP tools |

### Dev Tooling

| Tool | Purpose |
|------|---------|
| **ESLint** | Linting |
| **dotenv-cli** | Environment variable management |
| **tsx** | TypeScript execution for the MCP server |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App                       │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │Dashboard │  │ TaskForm │  │    AI Chat        │ │
│  │TaskList  │  │          │  │  (Gemini Agent)   │ │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘ │
│       │              │                 │            │
│  ┌────▼──────────────▼─────────────────▼──────────┐ │
│  │            Next.js API Routes                  │ │
│  │  /api/tasks    /api/tasks/[id]   /api/ai/chat  │ │
│  └────────────────────┬───────────────────────────┘ │
│                       │                             │
│  ┌────────────────────▼───────────────────────────┐ │
│  │         Prisma ORM + Neon Adapter              │ │
│  └────────────────────┬───────────────────────────┘ │
└───────────────────────┼─────────────────────────────┘
                        │
                ┌───────▼───────┐
                │  Neon Postgres │
                └───────▲───────┘
                        │
┌───────────────────────┼─────────────────────────────┐
│            MCP Server (Express :3001)               │
│                                                     │
│  OAuth2 (Google) ─► Bearer Auth ─► MCP Tools        │
│                                                     │
│  Tools: list_tasks, create_task,                    │
│         update_task_status, delete_task             │
│                                                     │
│  Calls Next.js API internally via fetch             │
└─────────────────────────────────────────────────────┘
```

---

## MCP Server

The project includes a standalone **Model Context Protocol (MCP)** server in the `mcp-server/` directory. This allows any MCP-compatible client (e.g., VS Code, Claude Desktop, or custom agents) to manage tasks through a standardized tool interface.

### How it works

1. **OAuth2 with Google** — The MCP server implements its own OAuth2 flow, delegating user identity to Google. When an MCP client connects, the user authenticates via Google, and the server issues its own Bearer tokens scoped to that user.

2. **Streamable HTTP transport** — Uses the `StreamableHTTPServerTransport` from the MCP SDK, exposing a single `/mcp` endpoint.

3. **Per-request server instances** — Each request creates a fresh `McpServer` scoped to the authenticated user's email, ensuring proper data isolation.

### Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_tasks` | Get all tasks for the authenticated user | — |
| `create_task` | Create a new task | `title` (required), `description`, `priority` (low/medium/high) |
| `update_task_status` | Update a task's status | `id` (required), `status` (todo/in_progress/done) |
| `delete_task` | Delete a task by ID | `id` (required) |

### Connecting from VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "task-manager": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### Running the MCP Server

```bash
cd mcp-server
npm install
npm run dev    # starts on port 3001
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- Google Cloud OAuth 2.0 credentials
- A Gemini API key

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
AUTH_SECRET=...              # random string for NextAuth
MCP_API_KEY=...              # shared key for MCP→API auth
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start the Next.js app
npm run dev

# In a separate terminal, start the MCP server
cd mcp-server && npm run dev
```

The app runs on `http://localhost:3000` and the MCP server on `http://localhost:3001`.

---

## Database Schema

```prisma
model Task {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  priority    String   @default("medium")   // low | medium | high
  status      String   @default("todo")     // todo | in_progress | done
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  userId      String
  userEmail   String
}
```

---

## License

MIT
