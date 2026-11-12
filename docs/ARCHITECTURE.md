# System Architecture & Technical Specifications
## Project: WasteLess (Infy) — AI Restaurant Waste & Overproduction Platform
### Document Reference: TECH-SPEC-001
**Status:** Approved Architecture — Ready for Stage 03 Implementation Planning

---

### 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER CLIENT (SPA)                           │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     PRESENTATION LAYER (React 19)                     │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │  Dashboard   │ │  Prediction  │ │  Prep Sheet  │ │  Menu & BOM  │  │  │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘  │  │
│  │  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐  │  │
│  │  │ Inventory    │ │ Sales Ingest │ │ Waste Logs   │ │ Settings     │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │                  DOMAIN & APPLICATION SERVICE LAYER                   │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────┐   ┌───────────────────────────────┐  │  │
│  │  │ Statistical Forecast Engine │   │ Recipe & BOM Decomposer       │  │  │
│  │  │ - 4-Week Weighted Moving Avg│   │ - Gross vs Net Ingredient Req │  │  │
│  │  │ - Day-of-week Seasonality   │   │ - Par Level & Waste Estimator │  │  │
│  │  └──────────────┬──────────────┘   └───────────────┬───────────────┘  │  │
│  │                 │                                  │                  │  │
│  │                 │  ┌────────────────────────────┐  │                  │  │
│  │                 └─►│  Hybrid Prediction Service │◄─┘                  │  │
│  │                    │  - Bounded AI Adjustment   │                     │  │
│  │                    │  - Audit Trail & Overrides │                     │  │
│  │                    └─────────────┬──────────────┘                     │  │
│  └──────────────────────────────────┼────────────────────────────────────┘  │
│                                     │                                       │
│  ┌──────────────────────────────────▼────────────────────────────────────┐  │
│  │               DATA ACCESS LAYER (Repository Pattern)                  │  │
│  │                                                                       │  │
│  │  ┌───────────────────────┐ ┌───────────────────────┐                  │  │
│  │  │ IRestaurantRepository │ │ IIngredientRepository │                  │  │
│  │  ├───────────────────────┤ ├───────────────────────┤                  │  │
│  │  │ IMenuRepository       │ │ IInventoryRepository  │                  │  │
│  │  ├───────────────────────┤ ├───────────────────────┤                  │  │
│  │  │ ISalesRepository      │ │ IPredictionRepository │                  │  │
│  │  └───────────┬───────────┘ └───────────┬───────────┘                  │  │
│  └──────────────┼─────────────────────────┼──────────────────────────────┘  │
│                 │                         │                                 │
│  ┌──────────────▼─────────────────────────▼──────────────────────────────┐  │
│  │               LOCAL PERSISTENCE ENGINE (Browser IndexedDB)            │  │
│  │  Database: `wasteless_db_v1`                                          │  │
│  │  Stores: restaurants, menu_items, ingredients, recipes_bom,           │  │
│  │          inventory_records, sales_records, waste_records, predictions │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ HTTPS POST /api/forecast/contextualize
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NODE.JS / EXPRESS PROXY SERVER                      │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Route: POST /api/forecast/contextualize                            │   │
│   │  - Payload Validation & Sanitization (Zod Schema)                   │   │
│   │  - External Weather & Calendar Enrichment                           │   │
│   │  - @google/genai SDK Integration (Gemini 2.5 Flash / Flash-Lite)    │   │
│   │  - Output Bounding & Constraint Validation                          │   │
│   │  - Secure Server-Side GEMINI_API_KEY Handling                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Component Architecture

The frontend is constructed using a decoupled modular structure:

1. **State & Repositories (`/src/data/`):**
   - Pure TypeScript repository implementations interacting with IndexedDB via a typed wrapper.
   - Clean domain entities with validation schemas.

2. **Domain Engines (`/src/engine/`):**
   - `StatisticalForecastEngine`: Zero-dependency, pure mathematical forecasting unit.
   - `BOMDecompositionEngine`: Multiplies predicted dish portions by ingredient quantities and calculates deficit against available on-hand stock.
   - `PredictionAdjustmentValidator`: Bounds all LLM adjustment multipliers strictly within [-30%, +35%] to protect kitchens from catastrophic overproduction.

3. **Presentation Components (`/src/components/`):**
   - `common/`: Atomic UI primitives (Buttons, Badges, Inputs, Modals, Cards, StatWidgets).
   - `layout/`: Top navigation, sidebar navigation, station selector, contextual header.
   - `modules/`:
     - `DashboardModule`: KPI overview, daily alert cards, quick actions.
     - `MenuModule`: Menu catalog, dish editor, recipe BOM builder.
     - `IngredientModule`: Ingredient catalog, unit definitions, safety stock targets.
     - `InventoryModule`: Stock intake, physical counts, stockout warnings.
     - `SalesModule`: Daily sales ledger, CSV upload, benchmark sample data switch.
     - `PredictionModule`: External conditions simulator (weather/events), baseline vs AI adjustment viewer, audit trail.
     - `PrepSheetModule`: Station-grouped prep sheets, printable checklist, manager override controls.
     - `WasteModule`: Discard logger with reason codes, financial waste trend charts.
     - `SettingsModule`: Store profile, prediction bounds configuration, JSON backup/restore.

---

### 3. Data Flow Diagram

```
[ User Inputs Weather / Event ] ──► [ Trigger Forecast Request ]
                                              │
        ┌─────────────────────────────────────┴─────────────────────────────────────┐
        ▼                                                                           ▼
[ 1. Query Sales History ]                                         [ 2. Check Network Status ]
(IndexedDB ISalesRepository)                                                        │
        │                                                     ┌─────────────────────┴─────────────────────┐
        ▼                                                     ▼                                           ▼
[ Calculate 4-Week Weighted Moving Avg ]                 [ ONLINE ]                                  [ OFFLINE ]
Base Forecast per Menu Item                                   │                                           │
        │                                                     ▼                                           ▼
        │                                       [ Call Express Proxy Route ]                [ Fallback to Statistical Engine ]
        │                                       (POST /api/forecast/contextualize)          Apply deterministic rulebook
        │                                                     │                             (e.g., Rain = +10% soups, -15% cold)
        │                                                     ▼                             Modifier capped [-20%, +20%]
        │                                       [ Gemini Contextual Analysis ]                            │
        │                                       Analyzes temp, rain, weekday, events                      │
        │                                       Outputs delta % and rationale                             │
        │                                                     │                                           │
        ├─────────────────────────────────────────────────────┴───────────────────────────────────────────┤
        ▼
[ 3. Bounded Adjustment Enforcer ]
Rule: Final Forecast = Base * (1 + clamp(Adjustment, -0.30, +0.35))
Audit Record: { baseQuantity, aiModifier, clampedModifier, rationale, timestamp }
        │
        ▼
[ 4. Recipe BOM Decomposition ]
For each menu item:
  Gross Ingredient Req = Final Forecast * Ingredient Portions in Recipe
  Net Ingredient Req = max(0, Gross Ingredient Req - Current On-Hand Stock)
        │
        ▼
[ 5. Persist to IPredictionRepository & Render Daily Prep Sheet ]
```

---

### 4. Database Schema for IndexedDB (`wasteless_db_v1`)

The database utilizes standard IndexedDB object stores with explicit indices for performant querying:

#### Store 1: `restaurants`
- `id` (string, primary key) — e.g., "rst_rustic_table"
- `name` (string) — "The Rustic Table"
- `concept` (string) — "Fast Casual Bistro"
- `currency` (string) — "USD"
- `stations` (array of strings) — `["Grill", "Saute", "Garde Manger", "Bakery"]`
- `isDemo` (boolean) — true for benchmark dataset
- `createdAt` (number), `updatedAt` (number)

#### Store 2: `ingredients`
- `id` (string, primary key) — e.g., "ing_chicken_breast"
- `restaurantId` (string, index)
- `name` (string) — "Free-Range Chicken Breast"
- `category` (string) — "Protein" | "Produce" | "Dairy" | "Dry Goods" | "Bakery"
- `unit` (string) — "kg" | "g" | "L" | "ml" | "pcs"
- `unitCost` (number) — e.g., 8.50 ($/kg)
- `currentStock` (number) — current recorded physical quantity
- `safetyStock` (number) — minimum par level before reorder warning
- `shelfLifeDays` (number) — standard shelf life
- `updatedAt` (number)

#### Store 3: `menu_items`
- `id` (string, primary key) — e.g., "mnu_chicken_bowl"
- `restaurantId` (string, index)
- `name` (string) — "Signature Grilled Chicken Bowl"
- `category` (string) — "Bowls" | "Mains" | "Salads" | "Bakery"
- `station` (string, index) — "Grill" | "Saute" | "Garde Manger" | "Bakery"
- `sellingPrice` (number) — e.g., 16.50
- `targetCost` (number) — e.g., 4.75
- `isActive` (boolean)
- `updatedAt` (number)

#### Store 4: `recipes_bom`
- `id` (string, primary key) — composite `item_ingredient`
- `menuItemId` (string, index)
- `ingredientId` (string, index)
- `quantity` (number) — portion quantity in ingredient unit
- `unit` (string)

#### Store 5: `sales_records`
- `id` (string, primary key) — `rec_{date}_{menuItemId}`
- `restaurantId` (string, index)
- `date` (string, index) — "YYYY-MM-DD"
- `dayOfWeek` (number, index) — 0 (Sun) to 6 (Sat)
- `menuItemId` (string, index)
- `quantitySold` (number)
- `revenue` (number)
- `mealPeriod` (string) — "All Day" | "Lunch" | "Dinner"
- `weatherCondition` (string)
- `temperatureC` (number)
- `eventTag` (string)
- `isDemonstrationData` (boolean)

#### Store 6: `waste_records`
- `id` (string, primary key)
- `restaurantId` (string, index)
- `date` (string, index)
- `itemId` (string) — menu item or ingredient ID
- `itemType` (string) — "menu_item" | "ingredient"
- `name` (string)
- `quantity` (number)
- `unit` (string)
- `unitCost` (number)
- `totalLossCost` (number)
- `reason` (string) — "Overproduction" | "Expired" | "Prep Mistake" | "Quality Defect"
- `loggedBy` (string)

#### Store 7: `predictions`
- `id` (string, primary key) — `pred_{date}_{restaurantId}`
- `restaurantId` (string, index)
- `targetDate` (string, index)
- `weatherForecast` (object) — `{ condition: string, tempC: number, precipChance: number }`
- `eventContext` (string)
- `itemPredictions` (array of objects):
  - `menuItemId` (string)
  - `dishName` (string)
  - `station` (string)
  - `baseCalculated` (number)
  - `aiAdjusted` (number)
  - `recommendedPrep` (number)
  - `managerOverride` (number | null)
  - `safetyBufferPct` (number)
  - `confidenceScore` (number)
  - `rationale` (string)
  - `requiredIngredients` (array of `{ ingredientId, name, grossQty, netQty, unit, currentStock }`)
- `createdAt` (number)

---

### 5. Repository Interface Specifications

```typescript
export interface IRestaurantRepository {
  getById(id: string): Promise<Restaurant | null>;
  save(restaurant: Restaurant): Promise<void>;
  resetToDemo(): Promise<void>;
}

export interface IMenuRepository {
  list(restaurantId: string): Promise<MenuItem[]>;
  getById(id: string): Promise<MenuItem | null>;
  save(item: MenuItem): Promise<void>;
  delete(id: string): Promise<void>;
  getRecipeBOM(menuItemId: string): Promise<RecipeBOMItem[]>;
  saveRecipeBOM(menuItemId: string, ingredients: RecipeBOMItem[]): Promise<void>;
}

export interface IIngredientRepository {
  list(restaurantId: string): Promise<Ingredient[]>;
  getById(id: string): Promise<Ingredient | null>;
  save(ingredient: Ingredient): Promise<void>;
  bulkSave(ingredients: Ingredient[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ISalesRepository {
  listByDateRange(restaurantId: string, startDate: string, endDate: string): Promise<SaleRecord[]>;
  listByMenuItemAndDayOfWeek(restaurantId: string, menuItemId: string, dayOfWeek: number): Promise<SaleRecord[]>;
  saveBulk(records: SaleRecord[]): Promise<void>;
  clearAll(restaurantId: string): Promise<void>;
}

export interface IWasteRepository {
  listByDateRange(restaurantId: string, startDate: string, endDate: string): Promise<WasteRecord[]>;
  save(record: WasteRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPredictionRepository {
  getByDate(restaurantId: string, date: string): Promise<PredictionRecord | null>;
  save(prediction: PredictionRecord): Promise<void>;
  updateOverride(predictionId: string, menuItemId: string, overrideQty: number): Promise<void>;
}
```

---

### 6. Forecasting Algorithm Specification

#### 6.1 Statistical Base Calculation (4-Week Weighted Moving Average)
For any target date $T$ with day-of-week $W = \text{dayOfWeek}(T)$:
1. Retrieve historical sales for each active menu item on the same day-of-week $W$ for the previous 4 weeks:
   $S = [s_1, s_2, s_3, s_4]$ where $s_1$ is 1 week ago, $s_2$ is 2 weeks ago, etc.
2. If less than 4 data points exist, use available points normalized by weight.
3. Apply standard recency weights:
   $W_{weights} = [0.40, 0.30, 0.20, 0.10]$
4. $\text{BaseSales} = \frac{\sum (s_i \cdot w_i)}{\sum w_i}$
5. Standard Deviation ($\sigma$) is computed across the historical sample to gauge baseline demand volatility.

#### 6.2 External Adjustment & Boundary Constraints
Let $\delta_{AI} \in [-0.30, +0.35]$ be the contextual demand modifier:
$$\text{ExpectedSales} = \text{round}(\text{BaseSales} \times (1 + \delta_{AI}))$$

#### 6.3 Preparation Quantity & Buffer
Kitchen safety par buffer $B$ is set based on station perishability:
- Bakery / Fresh Pastry: $B = 0.05$ (5% buffer — high waste risk if unsold)
- Grill / Fresh Proteins: $B = 0.08$ (8% buffer)
- Garde Manger / Cold Salads: $B = 0.05$ (5% buffer)
- Braises / Soups (multi-day stability): $B = 0.12$ (12% buffer)

$$\text{RecommendedPrep} = \lceil \text{ExpectedSales} \times (1 + B) \rceil$$

---

### 7. Gemini Integration Contract

#### Request Payload (`POST /api/forecast/contextualize`)
```json
{
  "targetDate": "2026-11-13",
  "dayOfWeek": "Friday",
  "weatherForecast": {
    "condition": "Heavy Rain",
    "temperatureC": 12,
    "precipitationProbability": 85
  },
  "eventContext": "City Marathon weekend + Payday Friday",
  "dishes": [
    {
      "id": "mnu_chicken_bowl",
      "name": "Grilled Chicken Rice Bowl",
      "station": "Grill",
      "category": "Mains",
      "baseSales": 42,
      "recentAverage": 40
    },
    {
      "id": "mnu_french_onion_soup",
      "name": "Slow-Simmered Onion Soup",
      "station": "Saute",
      "category": "Soups",
      "baseSales": 18,
      "recentAverage": 17
    }
  ]
}
```

#### Response Contract
```json
{
  "modelVersion": "gemini-2.5-flash",
  "generalAssessment": "Cold temperatures and heavy rain favor warm, savory comfort foods like soups and braised dishes (+20% to +25%), while reducing foot traffic for light cold bowls (-10%).",
  "adjustments": [
    {
      "dishId": "mnu_chicken_bowl",
      "suggestedMultiplier": -0.08,
      "rationale": "Rain suppresses walk-in cold grain bowls; patrons skew towards hot entrees.",
      "riskOfWaste": "Medium"
    },
    {
      "dishId": "mnu_french_onion_soup",
      "suggestedMultiplier": 0.22,
      "rationale": "12°C temperature drop and rainfall drive significant demand surge for hot starters.",
      "riskOfWaste": "Low"
    }
  ]
}
```

#### Bounding Assertion
Server and client enforce:
`multiplier = Math.max(-0.30, Math.min(0.35, payloadMultiplier))`

---

### 8. Offline Behavior Specification

1. **Autonomous Operation:** The entire application functions 100% offline using IndexedDB and client-side calculations.
2. **Heuristic Offline Fallback Table:**
   - Rain (>60% precip): Soups & Hot Line +15%, Cold Salads -20%
   - Heatwave (>28°C): Cold Salads +20%, Hot Soups -25%
   - Friday/Saturday: All stations +15%
   - Sunday Evening: -10% across fresh bakery
3. **Connectivity Indicator:** An unintrusive status indicator alerts the user whether predictions are "AI Enhanced" (online) or "Deterministic Heuristic" (offline), ensuring zero operational halts.

---

### 9. Error Handling & Data Validation Strategy

- **Input Validation:** Zod schemas validate menu prices (> 0), ingredient unit costs (> 0), recipe quantities (> 0), and sales records.
- **Fail-Safe Fallbacks:** Any failed AI request falls back smoothly to the statistical base without blocking the kitchen prep sheet.
- **Recipe Integrity:** Deleting an ingredient referenced in an active menu item triggers a blocking confirmation dialog.

---

### 10. Testing Strategy

1. **Unit Tests:**
   - Statistical weighted average calculation with varying data windows.
   - Clamp validation on AI adjustment multipliers.
   - Recipe BOM gross vs net requirement decomposition.
2. **Integration Verification:**
   - IndexedDB store upgrades and index lookups.
   - Demo restaurant initialization and data reset.
   - CSV parser error handling with malformed lines.
