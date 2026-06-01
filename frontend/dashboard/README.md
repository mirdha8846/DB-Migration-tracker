# SchemaGuard Dashboard

Next.js 14 (App Router) web UI with TypeScript and Tailwind CSS.

## Stitch design mapping

| Route | Stitch screen |
|-------|---------------|
| `/dashboard` | `schemaguard_overview_latte_mix` |
| `/migrations/[id]` | `migration_risk_analysis_latte_mix` |
| `/projects/[id]/graph` | `dependency_graph_latte_mix` |
| `/advisor` | `ai_schema_advisor_latte_mix` |

Design tokens: `src/styles/design-tokens.css` (from `espresso_logic/DESIGN.md`).

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Next steps

1. `npx shadcn@latest init` — add Button, Card, Table, Badge, Dialog, Input, Select, Tabs
2. Implement pages using Stitch HTML references in repo root
3. Wire `lib/api.ts` to api-gateway at `:8080`

See `CURSOR_PROMPT.md` for full page specs.
