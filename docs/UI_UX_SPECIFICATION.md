# UI/UX Design System & Screen Specifications
## Project: WasteLess (Infy) — AI Restaurant Waste & Overproduction Platform
### Document Reference: UI-SPEC-001
**Status:** In Review — Awaiting Stakeholder Approval

---

### 1. Visual Identity & Design System

#### 1.1 Brand Color Palette
- **Primary Brand (Emerald/Forest Green):**
  - `primary-50`: `#ecfdf5` (Light badge / hover background)
  - `primary-100`: `#d1fae5` (Selected row background)
  - `primary-500`: `#10b981` (Interactive focus & success accent)
  - `primary-600`: `#059669` (Primary CTA buttons, active state)
  - `primary-700`: `#047857` (Primary button hover)
  - `primary-900`: `#064e3b` (Sidebar header accent)
- **Neutrals (Slate/Zinc):**
  - `bg-surface`: `#ffffff` (Card & modal background)
  - `bg-canvas`: `#f8fafc` (Dashboard background)
  - `border-subtle`: `#e2e8f0` (Borders, table dividers)
  - `text-primary`: `#0f172a` (Headings, primary body)
  - `text-secondary`: `#475569` (Subtitles, metadata, table headers)
  - `text-muted`: `#94a3b8` (Timestamps, placeholders)
- **Functional Semantics:**
  - `accent-amber`: `#d97706` (Moderate overproduction risk, stock reorder alert)
  - `accent-rose`: `#e11d48` (High waste risk, stockout alert, error)
  - `accent-blue`: `#2563eb` (AI recommendation badge, external weather tag)

#### 1.2 Typography Hierarchy
- **Font Family:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Display Heading:** `text-2xl font-bold tracking-tight text-slate-900`
- **Section Heading:** `text-lg font-semibold text-slate-800`
- **Card Title / Metric Label:** `text-xs font-semibold uppercase tracking-wider text-slate-500`
- **Metric Value:** `text-3xl font-bold tracking-tight text-slate-900 font-tabular-nums`
- **Body Regular:** `text-sm font-normal text-slate-700 leading-relaxed`
- **Table Data / Kitchen Par:** `text-sm font-medium text-slate-900 font-tabular-nums`

#### 1.3 Layout & Spatial Architecture
- **Sidebar Navigation:** Fixed 240px width desktop navigation with brand badge, station quick-filter, and restaurant switcher.
- **Top Context Bar:** 64px height bar displaying active restaurant profile ("The Rustic Table"), current kitchen shift (Lunch / Dinner / All Day), offline/online status indicator, and quick actions ("Generate Next-Day Prep", "Log Waste").
- **Content Canvas:** Max-width 1440px with 24px responsive padding (`p-6`). Responsive 12-column CSS grid system with consistent `gap-6`.
- **Card Standard:** Background white, `border border-slate-200`, `rounded-xl`, subtle shadow `shadow-xs hover:shadow-sm`, consistent `p-5` inner padding.

---

### 2. Screen Specifications (10 Core MVP Screens)

---

#### Screen 1: Authentication & Workspace Selector (Login / Demo Access)
- **Layout Structure:**
  - Split viewport: Left side (40% width) featuring product narrative, food waste reduction stats, and kitchen station photography; Right side (60% width) containing clean authentication card and 1-click **"Enter Demo: The Rustic Table"** access.
- **Main Components:**
  - Email/Password form fields with client validation.
  - One-click **"Launch The Rustic Table Benchmark Restaurant"** quick-start card.
  - Station role selector: General Manager vs. Kitchen Chef mode.
- **User Interactions:**
  - Clicking demo access preloads the IndexedDB database with 30 days of sales history, full recipe BOMs, and real ingredient inventory.
- **Empty State:** Clean login form with pre-filled demo button.
- **Loading State:** Button spinner with "Initializing database and kitchen models...".
- **Error State:** Red inline error banner (`border-rose-200 bg-rose-50 text-rose-700`) if local storage fails or invalid inputs.

---

#### Screen 2: Main Operational Dashboard
- **Layout Structure:**
  - 4-metric KPI ribbon across the top (Today's Forecasted Sales, Recommended Total Prep Portions, Estimated Daily Waste Cost, Active Stockout Warnings).
  - Two-column main layout: Left column (70% width) displaying Next-Day Prep Summary & Station Par Levels; Right column (30% width) displaying External Context Widget (Tomorrow's weather, rain %, local events) and Recent Waste Alerts.
- **Main Components:**
  - `KpiMetricCard` (tabular numbers with trend delta vs. last week).
  - `NextDayPrepBanner` with 1-click "Open Station Prep Sheet" button.
  - `WeatherEventForecastCard` showing weather icon, temperature, rain chance, and scheduled local foot-traffic events.
  - `WasteRiskRadar` highlighting top 3 items at risk of overproduction.
- **User Interactions:**
  - Click on any station card jumps directly to the filtered prep sheet.
  - Toggle between Today and Tomorrow's service plan.
- **Empty State:** "No active menu items found. Start by reviewing the preloaded menu or creating your first dish."
- **Loading State:** Shimmer skeleton cards for KPI widgets and table rows.
- **Error State:** Non-blocking warning banner with retry button.

---

#### Screen 3: Sales Overview & Ingestion Ledger
- **Layout Structure:**
  - Header with date range picker (Last 7 Days, Last 30 Days, Custom) and "Import Sales CSV" button.
  - Summary stats: Total Revenue, Average Daily Portions Sold, Top Selling Dishes.
  - Interactive daily sales ledger table with filtering by day-of-week and meal period.
- **Main Components:**
  - CSV file dropzone modal with column mapping preview (Date, Dish Name, Quantity Sold, Meal Period).
  - Demonstration Data Badge ("Demo Data Active" with 1-click reset).
  - Historical sales chart (daily portion volume with weekend and rain indicators).
- **User Interactions:**
  - Drag-and-drop CSV upload with instant parsing and validation.
  - Filter ledger by dish or kitchen station.
- **Empty State:** Dropzone with sample CSV template download link.
- **Loading State:** Table skeleton rows with pulse animation.
- **Error State:** CSV parsing error modal highlighting exact invalid row numbers.

---

#### Screen 4: Menu & Recipe BOM Management
- **Layout Structure:**
  - Split screen or master-detail: Left panel lists menu items grouped by kitchen station; Right panel displays selected menu item details, selling price, food cost %, and the interactive Recipe Bill of Materials (BOM) table.
- **Main Components:**
  - Dish catalog cards with station badges (Grill, Saute, Garde Manger, Bakery).
  - Recipe BOM builder: Add ingredient, specify quantity and unit, view calculated food cost vs. retail price.
  - Safety buffer slider per dish (default 5%–12%).
- **User Interactions:**
  - Add/Edit menu item modal with station assignment.
  - Real-time food cost percentage recalculation as ingredients and portion sizes change.
- **Empty State:** "No menu items configured. Click 'Add Menu Item' or load benchmark catalog."
- **Loading State:** Recipe table shimmer.
- **Error State:** Modal validation warning if required BOM ingredients are missing.

---

#### Screen 5: Ingredient Management
- **Layout Structure:**
  - Top action bar with Search, Category Filter (Protein, Produce, Dairy, Dry Goods, Bakery), and "Add Ingredient" button.
  - High-density data table displaying: Ingredient Name, Category, Unit, Unit Cost, Current On-Hand Stock, Safety Par, and Linked Recipes count.
- **Main Components:**
  - Ingredient creation modal with unit dropdown (kg, g, L, ml, pcs).
  - Cost per unit editor.
  - Recipe usage badge (showing which dishes consume this ingredient).
- **User Interactions:**
  - Quick inline edit for unit costs.
  - Click ingredient row to see inventory history and consumption rate.
- **Empty State:** "No ingredients found in this category."
- **Loading State:** Table skeleton loader.
- **Error State:** Guard dialog preventing deletion of an ingredient tied to active recipes.

---

#### Screen 6: Inventory Management & Stock Intake
- **Layout Structure:**
  - 3-column overview: Total Inventory Valuation ($), Items Below Safety Par (Deficit Warning), and Expiring Soon Items.
  - Stock intake & count sheet with station sorting.
- **Main Components:**
  - "Quick Stock Update" modal for rapid morning physical count entry.
  - Deficit alert badges with direct calculation of prep shortages.
  - Physical vs. Theoretical stock variance tracker.
- **User Interactions:**
  - Increment/decrement physical stock counters with instant auto-save to IndexedDB.
- **Empty State:** "All inventory pars are healthy. No items below minimum threshold."
- **Loading State:** Shimmering table rows.
- **Error State:** Error banner if stock updates fail validation.

---

#### Screen 7: AI Prediction & Contextual Demand Dashboard
- **Layout Structure:**
  - Top: Tomorrow's date selector with simulated external condition controls (Weather condition selector, Temperature slider, Rain probability, Event tag: Concert / Game / Holiday / None).
  - Mid: AI Contextual Summary card showing Gemini 2.5 Flash assessment and demand modifiers.
  - Bottom: Comparative forecast table: Baseline 4-Week Moving Average vs. AI Adjusted Sales vs. Overproduction Risk Score.
- **Main Components:**
  - External scenario simulator slider/dropdowns.
  - "Generate AI Contextual Forecast" primary CTA button.
  - Transparent formula inspection tooltip on each number showing exact math and audit trail.
  - Safety boundary clamp indicator (showing adjustments bounded within -30% to +35%).
- **User Interactions:**
  - Adjust simulated weather from Sunny to Heavy Rain and observe dynamic model response.
  - Click any dish row to inspect detailed rationale generated by Gemini.
- **Empty State:** "Click 'Generate Forecast' to run statistical and AI prediction models for tomorrow."
- **Loading State:** Dedicated loading state: "Calculating 4-week moving average... Analyzing weather & event context with Gemini..." with progress bar.
- **Error State / Offline Fallback:** Unintrusive banner: "External AI API unreachable. Operating in deterministic offline mode using statistical heuristics."

---

#### Screen 8: Daily Preparation Recommendations (Kitchen Station Prep Sheet)
- **Layout Structure:**
  - Kitchen-optimized tablet-friendly view with high contrast and minimum 48px tap targets.
  - Station tab bar: All Stations | Grill | Saute | Garde Manger / Salad | Bakery.
  - Action buttons: "Print Prep Sheet", "Accept All Recommendations", "Export PDF/CSV".
- **Main Components:**
  - Station prep cards with large checkboxes for cooks.
  - Dual quantity indicators: Recommended Finished Portions (e.g., "35 bowls") AND Decomposed Net Raw Ingredients Required (e.g., "6.3 kg chicken breast, 1.8 kg jasmine rice").
  - Manager override input field on every dish (allowing chef to increase/decrease par).
  - Deficit warnings highlighting raw ingredients that require immediate thawing or prep.
- **User Interactions:**
  - Checking off completed prep items marks row with green check and strikes through text.
  - Typing an override number immediately recalculates raw ingredient quantities.
- **Empty State:** "No prep tasks generated for this station today."
- **Loading State:** Full-page prep sheet skeleton.
- **Error State:** Red toast notification on save failure.

---

#### Screen 9: Food Waste Analytics & ROI Tracker
- **Layout Structure:**
  - Header: Time filter (7 Days, 30 Days, 90 Days) and "Log End-of-Day Waste" primary button.
  - Top: 3 Financial Impact Cards (Total Waste Cost ($), Waste Reduction vs. Baseline (%), Estimated Money Saved ($)).
  - Charts section: Waste cost trend over time, Waste by Reason Code (Overproduction vs. Spoilage vs. Prep Error), Waste by Kitchen Station.
  - Bottom: Waste incident ledger with reason codes and cost per incident.
- **Main Components:**
  - Quick Waste Logging Modal (Dish/Ingredient, Quantity discarded, Reason code).
  - Financial ROI calculator comparing actual waste against unadjusted static par levels.
  - Environmental Impact Badge (kg of food waste prevented, CO2e offset).
- **User Interactions:**
  - Filter ledger by waste reason code to analyze kitchen training issues.
  - Add quick waste record in under 15 seconds.
- **Empty State:** "No waste logged for the selected period. Click 'Log End-of-Day Waste' to record discarded items."
- **Loading State:** Skeleton charts and table rows.
- **Error State:** Error banner if analytics cannot be aggregated.

---

#### Screen 10: Restaurant Settings & Configuration
- **Layout Structure:**
  - Tabbed settings panel: General Restaurant Profile | Kitchen Stations | Forecasting Safety Rails | Data Management (Backup/Restore).
- **Main Components:**
  - Restaurant profile form (Name, Concept, Currency symbol).
  - Station manager (Add/remove stations: Grill, Saute, Garde Manger, Bakery).
  - Prediction bounding sliders: Max allowed AI decrease (default 30%), Max allowed AI increase (default 35%), Safety par buffers.
  - Backup & Restore: Export entire IndexedDB database to JSON, Import backup JSON, Reset to "The Rustic Table" demonstration data.
- **User Interactions:**
  - Export database snapshot with 1 click.
  - Adjust safety bounds and see instantaneous validation.
- **Empty State:** N/A (always displays current configuration).
- **Loading State:** Form field disabled states during import/export.
- **Error State:** Modal warning for invalid JSON backup files.
