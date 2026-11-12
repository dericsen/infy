# Product Requirements Document (PRD)
## Project: WasteLess (Infy) — AI Restaurant Waste & Overproduction Prediction
### Stage 01: Product Discovery & Requirements Engineering
**Status:** In Review — Awaiting Stakeholder Sign-Off  
**Target Delivery:** MVP (Single-Location Restaurant)

---

### 1. Problem Statement & Root Causes

#### 1.1 The Problem
Commercial restaurants operate on razor-thin profit margins (typically 3% to 7%). Food waste accounts for 4% to 10% of purchased food before it even reaches a customer's plate. Overproduction in commercial kitchens is the leading controllable contributor: kitchen prep teams cook and portion batches based on intuition, static historical averages, or fixed rules-of-thumb that fail to account for dynamic demand swings.

#### 1.2 Root Causes of Restaurant Overproduction & Waste
1. **Demand Volatility & Static Prep Sheets:** Kitchens use fixed daily prep par levels (e.g., "prep 40 portions of braised beef every Thursday") regardless of rainy weather, public holidays, or local foot-traffic events.
2. **Disconnected Inventory vs. Recipe BOMs:** Prep cooks think in menu portions (e.g., 50 chicken bowls), but inventory is tracked in raw ingredients (e.g., kilograms of chicken breast, liters of marinade). Without Bill of Materials (BOM) decomposition, cooks over-prep raw components.
3. **Short Shelf-Life & Perishability:** Fresh produce, dairy, and par-cooked proteins spoil in 24 to 72 hours. An overproduction error on Wednesday cannot be recovered on Friday.
4. **Lack of Immediate Post-Shift Feedback:** Kitchen staff rarely record what was discarded at end-of-shift, obscuring the financial and environmental cost from decision-makers.
5. **Fear of Stockouts:** Kitchen managers prefer over-prepping to avoid the immediate embarrassment of "86-ing" (running out of) a hero dish during peak dinner rush.

---

### 2. Target Users & Personas

#### Persona 1: Chef Marco (Head Chef / Kitchen Operations Lead)
- **Role:** Leads kitchen operations, builds daily prep lists, manages line cooks.
- **Pain Points:** Spends 45 minutes every morning calculating batch sizes; feels constant tension between running out of stock during dinner service and throwing away expensive proteins at closing.
- **Goal:** A clear, confident morning prep sheet with exact batch counts, ingredient breakdowns, and adjusted prep buffers.

#### Persona 2: Sarah (Owner / General Manager)
- **Role:** Manages business finances, supplier orders, food cost percentage (CoGS), and staffing.
- **Pain Points:** Food cost is running 34% (target is 28%); unable to pinpoint whether waste comes from spoilage, over-portioning, or over-prepping.
- **Goal:** Transparent visibility into daily food waste cost ($), expected sales volume, and verified savings trends.

#### Persona 3: Leo (Prep Cook / Station Cook)
- **Role:** Executes morning and mid-day prep tasks on the line.
- **Pain Points:** Complex math or clunky software; needs simple, actionable checkboxes and unit conversions at station.
- **Goal:** Fast, station-specific checklist (e.g., "Grill Station: Prep 32 chicken breasts, slice 5 kg onions").

---

### 3. Main User Journeys

#### Journey 1: Morning Shift Prep Planning
1. **Access:** Chef opens WasteLess on a tablet or laptop before the morning shift (07:30 AM).
2. **Review Context:** The system displays tomorrow's/today's forecast, highlighting external factors: forecasted rain (18°C, heavy rain), Friday evening, and a nearby concert.
3. **Inspect Predictions:** Chef inspects predicted sales per dish, compares against baseline averages, and sees the recommended batch sizes.
4. **Adjust & Commit:** Chef can adjust any recommended quantity (with override notes) and click **"Generate Station Prep Sheet"**.
5. **Kitchen Execution:** Cooks view and complete prep station checklists with raw ingredient quantities decomposed automatically.

#### Journey 2: Daily Sales & End-of-Day Waste Logging
1. **Closing:** At shift close (10:30 PM), kitchen staff logs discarded items or unsold batch quantities.
2. **Sales Import/Entry:** Manager uploads the day's POS sales summary (or enters key item sales).
3. **Variance Review:** WasteLess calculates actual vs. predicted sales, actual food waste cost, and updates model accuracy weights for future runs.

#### Journey 3: Menu & Recipe BOM Management
1. **Setup:** Manager defines menu items with selling prices, target cost margins, and recipe ingredient breakdowns (e.g., 1 Burger = 180g beef patty, 1 brioche bun, 30g sauce, 50g lettuce).
2. **Current Stock:** Manager inputs current inventory levels and unit purchase costs.
3. **Validation:** System flags ingredient shortages before morning prep starts.

---

### 4. Functional Requirements

#### 4.1 Menu & Recipe Management (BOM)
- **FR-1.1:** Create, update, archive menu items with category, price, station (Grill, Prep, Fryer, Cold, Bakery), and active status.
- **FR-1.2:** Define recipe Bill of Materials (BOM) linking each menu item to specific raw ingredients with portion amounts and units (g, kg, ml, L, count).
- **FR-1.3:** Set minimum safety stock buffers and shelf-life expiration days for each raw ingredient.

#### 4.2 Historical Sales & Waste Data Management
- **FR-2.1:** Store historical daily item sales by date, day of week, meal period (Lunch, Dinner), and units sold.
- **FR-2.2:** Enable CSV upload of sales logs and preloaded sample dataset for immediate testing.
- **FR-2.3:** Record end-of-day waste entries: item/ingredient, quantity discarded, reason code (Overproduction, Expired/Spoiled, Prep Error, Quality Defect), and estimated cost.

#### 4.3 External Demand Factors Engine
- **FR-3.1:** Weather tracking: precipitation forecast, temperature, weather conditions (Clear, Rain, Storm, Heatwave).
- **FR-3.2:** Calendar factors: Day of week, weekends, paydays, public holidays.
- **FR-3.3:** Local event triggers: Nearby events, foot-traffic modifiers (Low, Normal, High, Very High).

#### 4.4 AI & Heuristic Prediction Engine
- **FR-4.1:** Baseline statistical forecast using 4-week weighted moving average by day-of-week.
- **FR-4.2:** Demand adjustment factor calculation combining weather impact coefficient, holiday/event coefficient, and recent 7-day trend.
- **FR-4.3:** AI-assisted reasoning: Gemini model analyzes context (weather, historical trends, seasonality, event flags) to output expected dish units, risk factors, and textual rationale for each recommendation.
- **FR-4.4:** Overproduction risk scoring: Flag items with high perishability and high demand variance as "High Risk of Waste".
- **FR-4.5:** Safety buffer recommendation: Provide conservative, balanced, and aggressive prep targets.

#### 4.5 Preparation Recommendation & Kitchen Sheets
- **FR-5.1:** Produce next-business-day prep sheet grouped by kitchen station.
- **FR-5.2:** Decompose recommended menu item quantities into exact required ingredient quantities with unit conversion.
- **FR-5.3:** Allow kitchen managers to override recommendations with 1-click accept or manual adjustments.
- **FR-5.4:** Print-friendly / mobile-friendly station checklist with completion checkboxes.

#### 4.6 Analytics & Financial Impact Dashboard
- **FR-6.1:** Financial waste tracking: Estimated dollars wasted this week/month vs. baseline.
- **FR-6.2:** Overproduction rate (% of prepared food discarded).
- **FR-6.3:** Stockout avoidance rate (% of services where no item was 86'd prematurely).
- **FR-6.4:** Forecast accuracy metric (Mean Absolute Percentage Error - MAPE / Variance).

---

### 5. Non-Functional Requirements

- **NFR-1 (Usability & Kitchen Ergonomics):** High-contrast UI, legible from 1 meter distance on a tablet, minimum 48px tap targets for wet or gloved fingers in kitchen environments.
- **NFR-2 (Performance):** Next-day prep sheet and prediction generation must complete within < 3 seconds for 50 menu items.
- **NFR-3 (Reliability & Offline-Tolerant Resilience):** Statistical heuristic fallback must run locally in the browser even if external AI APIs are temporarily unavailable.
- **NFR-4 (Data Transparency):** Clear visual separation between:
  - Raw Historical Sales (Facts)
  - Statistical Heuristic Calculations (Formulas)
  - AI Contextual Predictions (Gemini Analysis)
  - Manual Manager Overrides (Human Decision)
- **NFR-5 (Data Integrity):** Client-side validation on all numerical entries (non-negative quantities, realistic bounds, recipe ratio sums).

---

### 6. MVP Scope vs. Future Features

| Feature Area | In Scope (MVP) | Out of Scope (Post-MVP / Roadmap) |
|---|---|---|
| **Location Scope** | Single restaurant location | Multi-unit chain / central commissary kitchens |
| **Menu & BOM** | Complete menu items, stations, recipe BOM with raw ingredient breakdown | Dynamic ingredient sub-recipes (recipes inside recipes, 3+ nesting tiers) |
| **Sales Intake** | Direct CSV import & clean manual daily sales entry; preloaded benchmark datasets | Direct live OAuth API sync to Toast, Square, Clover, Lightspeed |
| **External Factors** | Weather condition selector/API, day-of-week patterns, holidays, local event flag | Automatic GPS hyper-local foot traffic radar sensor integration |
| **Prediction** | Hybrid AI + statistical engine (Gemini API contextual forecast + moving avg baseline) | Automated machine learning model training pipeline on custom cloud GPUs |
| **Prep Output** | Station-specific prep sheets with ingredient requirements & overrides | Automated supplier PO dispatch & EDI purchase order transmission |
| **Inventory** | Basic on-hand stock vs. required prep deficit calculation | Real-time IoT scale weight sensors on walk-in refrigerator shelves |
| **Staff & Auth** | Single-restaurant operational workspace with role switching (Manager / Chef) | Enterprise SSO, SAML, granular multi-tier employee RBAC |

---

### 7. Business Value Proposition

1. **Direct CoGS Reduction:** A typical $1.2M/year restaurant wastes $48,000–$96,000 annually in food. Reducing overproduction by 25% delivers $12,000–$24,000 in direct net profit recovery.
2. **Chef Time Savings:** Eliminates 30 to 45 minutes of daily manual prep math and guesswork every morning.
3. **Preserved Revenue & Guest Satisfaction:** Minimizes premature "86-ing" of high-margin signature items during unexpected demand surges.
4. **Environmental Impact:** Directly measures and reports avoided CO2e and kilograms of food diverted from municipal landfills.

---

### 8. Key Performance Indicators (KPIs)

1. **Food Waste Reduction Rate:** Target ≥ 20% reduction in logged discard weight within 30 days of consistent use.
2. **Forecast Accuracy (1 - MAPE):** Target ≥ 85% accuracy across top 20 revenue-driving menu items.
3. **Kitchen Prep Adoption:** % of daily recommended prep targets accepted without major discrepancy (>30% override).
4. **Dollar Value of Waste Prevented:** Accumulated savings tracked against previous monthly average waste baseline.
5. **Stockout Frequency:** Target < 1% of shifts experiencing unplanned item 86-ing during core operating hours.

---

### 9. Main Risks & Assumptions

| Risk | Impact | Likelihood | Mitigation Strategy |
|---|---|---|---|
| **Kitchen Adoption Friction:** Cooks find daily data entry tedious during rushed closes. | High | Medium | One-tap quick waste logging with top 5 usual suspect items and estimated portion buckets (e.g., "half tray", "5 portions"). |
| **Noisy Initial Data:** Restaurant starts with limited sales history (< 14 days). | High | High | Provide a robust heuristic default based on weekly seasonality + pre-seed option with realistic restaurant operational profile. |
| **AI Hallucination / Over-confidence:** AI predicts an extreme prep spike that causes waste. | Critical | Low | Hard-bound all predictions within safety rails (e.g., maximum +/- 35% swing from 4-week same-weekday average unless manager explicitly confirms). |
| **Network Outage in Kitchen:** Kitchen Wi-Fi drops in basement walk-in coolers. | Medium | Medium | Local browser state caching; prep sheets remain printable and exportable. |

---

### 10. Acceptance Criteria for MVP Features

#### AC-1: Menu & Recipe BOM Management
- [ ] User can view, add, edit, and disable menu items.
- [ ] Each menu item must support selling price, food cost estimate, kitchen prep station, and at least 1 ingredient BOM item.
- [ ] Deleting an ingredient warns if it is used across active menu recipes.

#### AC-2: Historical Sales & Demand Log
- [ ] User can view historical sales by date with item-by-item breakdown.
- [ ] User can import a standard CSV sales file or load a realistic sample restaurant dataset (e.g., "The Rustic Table Bistro - 30 Days").
- [ ] User can view sales correlation with weekdays, rain, and event tags.

#### AC-3: Daily Prediction & Next-Day Prep Sheet
- [ ] System generates next-day forecast displaying: Predicted Sales (portions), Recommended Prep (units), Safety Buffer, and Required Raw Ingredients.
- [ ] Explains the prediction rationale (e.g., "Friday dinner + Rainy forecast (+15% comfort food, -20% salads)").
- [ ] Kitchen manager can adjust any prep figure; totals recalculate raw ingredient requirements immediately.
- [ ] Prep sheet can be filtered by station (Grill, Saute/Hot Line, Cold/Salad, Bakery/Dessert) and checked off item by item.

#### AC-4: End-of-Day Waste Log & Impact Dashboard
- [ ] User can record end-of-day discarded portions with reason codes.
- [ ] Dashboard computes waste cost ($), waste percentage vs. prep, and trend over time.
- [ ] Financial summary displays estimated dollars saved by adhering to prep recommendations.
