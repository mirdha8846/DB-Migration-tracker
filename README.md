# SchemaGuard

Database migration risk analysis platform — monorepo.

## Structure

See `00_PROJECT_STRUCTURE.md` in the repo docs for the full layout.

## Quick start

```bash
# Infrastructure
docker-compose up -d
psql -U sg_user -d schemaguard -f scripts/seed-db.sql

# Frontend dashboard
cd frontend/dashboard
npm install
npm run dev
```

## Design reference

Stitch UI designs live at `../stitch_vibrant_coffee_glass_ui./stitch_vibrant_coffee_glass_ui/`.
Dashboard tokens: `frontend/dashboard/src/styles/design-tokens.css`.
