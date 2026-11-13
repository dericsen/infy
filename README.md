# WasteLess (Infy)

WasteLess (Infy) is a restaurant food waste and overproduction prediction platform designed for single-location commercial kitchens. It connects daily sales history, recipe Bills of Materials (BOM), live inventory counts, and external demand context into deterministic station preparation recommendations and procurement plans.

## Core Capabilities

### 1. Hybrid Sales Forecasting Engine
- **Deterministic Statistical Baseline**: Computes a 4-week day-of-week weighted moving average (`0.40`, `0.30`, `0.20`, `0.10`) with a bounded 7-day trend modifier, explicit data sufficiency checks (`optimal`, `moderate`, `insufficient`), and widened 80% / 95% confidence bands when historical depth is limited.
- **Zero Future Data Leakage**: Historical calculations strictly filter records prior to the target business date and exclude closed restaurant days.
- **Rolling-Origin Backtesting**: Evaluates 14-day historical predictions against a same-day-last-week naive baseline using MAE, MAPE, RMSE, and forecast bias metrics.

### 2. Server-Side Gemini Contextual Intelligence
- **Contextual Demand Analysis (`POST /api/forecast/contextualize`)**: Analyzes weather conditions, temperature, precipitation probability, day of week, and local calendar events server-side via `@google/genai`.
- **Bounded Safety Rails**: All AI multipliers are strictly clamped both server-side and client-side within configurable symmetric bounds (default `±15%`).
- **Offline Resilience & Caching**: Caches contextual analyses in IndexedDB (`30 min` TTL) and automatically falls back to deterministic local statistical forecasts when offline or when the Gemini API is unavailable.

### 3. Deterministic Preparation & Procurement Recommendations
- **Recipe BOM Decomposition**: Converts portion units (`kg`/`g`, `L`/`ml`, `pcs`) to stock units, rejects incompatible units with explicit warnings, and flags active dishes missing recipe definitions.
- **Cross-Dish Ingredient Aggregation**: Aggregates gross ingredient demand across shared dishes, compares against live on-hand inventory, and computes `Net Required = max(0, Gross - Available)` alongside post-prep surplus and expiration alerts.

### 4. Daily Prep Sheet & Kitchen Checklist
- **Station-Grouped Execution**: Organizes recommended prep quantities across `Grill`, `Saute`, `Garde Manger`, and `Bakery` stations with chef par overrides and prep instructions.
- **Isolated Persistent Checklists**: Saves checklist progress (`completedAt`, `completedBy`) and par overrides in IndexedDB isolated per `prepSheetId` (date, shift, and sheet revision), supporting printable prep sheets and explicit sheet resets.

### 5. Restaurant, Inventory & Waste Management
- **Menu & Ingredients Catalog**: Full CRUD with active/disabled dish toggles, prep instructions, unit cost tracking, expiration dates, and referential delete guards.
- **Inventory & Stock Movement Ledger**: Supports morning physical count commits, supplier stock additions, reductions, and manual adjustments with negative-stock validation and an auditable `StockMovementRecord` ledger.
- **Sales Ledger & Closed Days**: Supports individual shift order recording with automatic unit-converted BOM stock deduction, POS CSV file import with row-level validation, historical record editing, and closed-day scheduling.
- **Waste Tracking & Backups**: Logs shift discard events by reason code (`Overproduction`, `Expired`, `Prep Mistake`, `Quality Defect`), supports full JSON backup export/import, and includes a configurable benchmark dataset (*The Rustic Table*: 30 days of sales, 12 dishes, 20 ingredients, 4 stations).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express (`server.ts`) with Vite middleware in development and static serving in production
- **AI Integration**: `@google/genai` (server-side only via `/api/forecast/contextualize`)
- **Persistence & Auth**: IndexedDB (`wasteless_db_v1`) primary store with repository abstraction, optional Firebase Auth & Firestore integration (`firebase.ts`, `firestore.rules`)
- **Testing**: Vitest (`vitest run`)

## Project Structure

```text
├── docs/                       # Product requirements, architecture, database & forecasting specs
├── server.ts                   # Express server, API validation, and Gemini contextualization route
├── firestore.rules             # Firestore security rules
├── src/
│   ├── components/
│   │   ├── common/             # Reusable UI primitives (Button, Badge, Card, Modal, StatCard)
│   │   ├── layout/             # AppLayout, Sidebar, Header
│   │   └── views/              # Dashboard, PrepSheet, Prediction, Menu, Ingredients, Inventory, Sales, Waste, Settings
│   ├── data/                   # Benchmark dataset definitions (The Rustic Table)
│   ├── db/                     # IndexedDB wrapper and typed repository layer
│   ├── engine/                 # Forecasting engine, unit conversion, and recommendation engine
│   ├── services/               # Contextual forecast client, Firebase auth, and Firestore data service
│   ├── types/                  # Domain TypeScript interfaces
│   └── App.tsx                 # Application state orchestration
└── tests/
    └── wasteless.test.ts       # Unit & integration test suite
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `GEMINI_API_KEY`: Server-side Gemini API key (optional; deterministic local forecasting and fallback remain operational without it).
- `APP_URL`: Application base URL if required by deployment environment.

### Running Locally
Start the unified Express + Vite development server on port `3000`:
```bash
npm run dev
```

### Available Scripts
- `npm run dev` — Starts Express + Vite middleware on port `3000`
- `npm run build` — Builds the production frontend bundle into `dist/`
- `npm run start` — Starts the production server
- `npm run lint` — Runs TypeScript type-checking (`tsc --noEmit`)
- `npm test` — Executes the Vitest test suite (`vitest run`)

## Additional Documentation
Detailed engineering and product documentation is available in `/docs`:
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/BACKEND_DATABASE_DESIGN.md`
- `docs/FORECASTING_METHODOLOGY.md`
- `docs/UI_UX_SPECIFICATION.md`
