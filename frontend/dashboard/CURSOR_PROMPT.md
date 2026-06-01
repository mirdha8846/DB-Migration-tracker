# ════════════════════════════════════════════════════════════════
#  FRONTEND: dashboard (Next.js 14)
#  ROLE: Web UI for SchemaGuard
# ════════════════════════════════════════════════════════════════

# ── CURSOR PROMPT ───────────────────────────────────────────────
"""
Create a Next.js 14 (App Router) dashboard for SchemaGuard with TypeScript and Tailwind CSS.

FOLDER STRUCTURE:
src/
├── app/
│   ├── layout.tsx                    # Root layout, fonts, providers
│   ├── page.tsx                      # Redirect to /login or /dashboard
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx                # Sidebar + topbar shell
│       ├── dashboard/page.tsx        # Overview: stats + recent migrations
│       ├── projects/
│       │   ├── page.tsx              # Project list
│       │   ├── new/page.tsx          # Create project form
│       │   └── [id]/
│       │       ├── page.tsx          # Project detail
│       │       ├── repos/page.tsx    # Registered repos
│       │       ├── migrations/page.tsx
│       │       └── graph/page.tsx    # Dependency graph viz
│       ├── migrations/
│       │   └── [id]/
│       │       └── page.tsx          # Migration detail + full report
│       └── advisor/
│           └── page.tsx              # AI chat interface (Agent 3)
├── components/
│   ├── ui/                           # Shadcn components
│   ├── RiskBadge.tsx                 # Color-coded LOW/MEDIUM/HIGH/CRITICAL
│   ├── ImpactReport.tsx              # Full report display
│   ├── DependencyGraph.tsx           # D3.js force graph
│   ├── MigrationTimeline.tsx
│   └── AdvisorChat.tsx               # Chat UI for Agent 3
├── lib/
│   ├── api.ts                        # Axios client, base URL, auth header
│   ├── auth.ts                       # JWT decode, store in localStorage
│   └── utils.ts
└── types/
    └── index.ts                      # All TypeScript interfaces

KEY PAGES:

1. Dashboard Overview (/dashboard):
   - 4 stat cards: Total Migrations, Critical Risks, Affected Services, Projects
   - Recent migrations table with RiskBadge
   - Mini chart: migrations by risk level over last 30 days (use recharts)

2. Migration Detail (/migrations/[id]):
   - Migration file content (syntax highlighted)
   - Changes table: changeType | table | column | risk
   - AI Explanation section (markdown rendered)
   - Affected Services accordion (expand to see file paths + fix)
   - Deploy Order numbered list

3. Dependency Graph (/projects/[id]/graph):
   - D3.js force-directed graph
   - Nodes: tables (blue) + services (green)
   - Edges: usage relationships
   - Click node → show details sidebar

4. AI Advisor (/advisor):
   - Chat interface like ChatGPT
   - Messages with markdown support
   - Code blocks with syntax highlighting
   - "Sources referenced" chips below each AI response
   - Select project from dropdown

API CLIENT (lib/api.ts):
  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  })
  // Interceptor: add Authorization: Bearer {token} from localStorage
  // Interceptor: on 401 → redirect to /login

RISK BADGE COLORS:
  CRITICAL → red background, red text
  HIGH     → orange background, orange text
  MEDIUM   → yellow background, yellow text
  LOW      → green background, green text

USE shadcn/ui for: Button, Card, Table, Badge, Dialog, Input, Select, Tabs
USE recharts for: BarChart on dashboard
USE D3.js for: dependency graph
USE react-markdown for: AI response rendering
"""

# ── SETUP COMMANDS ───────────────────────────────────────────────
# npx create-next-app@latest dashboard --typescript --tailwind --app --src-dir
# cd dashboard
# npx shadcn@latest init
# npm install axios recharts d3 react-markdown @types/d3
