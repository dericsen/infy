# Backend and Database Architecture Specification
## Project: WasteLess (Infy) — Stage 04 Backend & Database Engineering
### Document Reference: BACKEND-DB-001
**Status:** Architecture Proposal & Entity Schema Definition

---

### 1. Technology Selection & Architectural Rationale

For the WasteLess restaurant operations platform, **Cloud Firestore and Firebase Authentication** represent the optimal database and identity tier within the Google AI Studio ecosystem for the following technical reasons:

1. **Native Restaurant Tenant Isolation:**
   - Multi-tenant architecture modeled via subcollections under `/restaurants/{restaurantId}`.
   - Security rules enforce that users can only read or write documents belonging to their assigned `restaurantId`.

2. **Kitchen Offline Resilience:**
   - Commercial kitchens and walk-in freezers suffer frequent Wi-Fi dropouts.
   - Firestore's built-in client offline cache allows reads and writes to queue locally and synchronize seamlessly upon reconnection, satisfying ADR-001 and ADR-004.

3. **Secure Identity Without Secret Exposure:**
   - Firebase Auth handles identity verification client-side with short-lived JWT tokens.
   - No backend database passwords, service connection strings, or production credentials are ever bundled or exposed in frontend code.

4. **Real-Time Kitchen Sync:**
   - Real-time `onSnapshot` listeners allow prep sheet task check-offs by station cooks to reflect instantaneously on the head chef's dashboard across devices.

---

### 2. Entity Design & Relationships (11 Core Entities)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                 USERS                                  │
│  /users/{userId}                                                       │
│  - uid, email, displayName, restaurantId, role (owner|manager|chef)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Belongs to
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              RESTAURANTS                               │
│  /restaurants/{restaurantId}                                           │
│  - id, name, concept, currency, stations, ownerId, createdAt           │
└───────┬──────────────┬──────────────┬──────────────┬─────────────┬─────┘
        │              │              │              │             │
        ▼              ▼              ▼              ▼             ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌───────────┐┌───────────┐
│  MENU ITEMS  ││ INGREDIENTS  ││SALES SUMMARY ││PREDICTIONS││WASTE LOGS │
│  /menu_items ││ /ingredients ││/daily_sales  ││/forecasts ││/waste_logs│
└───────┬──────┘└──────┬───────┘└──────────────┘└─────┬─────┘└───────────┘
        │              │                              │
        │ Contains BOM │                              │ Decomposes
        └───────┬──────┘                              ▼
                ▼                       ┌───────────────────────────┐
        ┌──────────────┐                │   PREPARATION SHEETS &    │
        │ RECIPES BOM  │                │    STATION CHECKLISTS     │
        │  /recipes    │                │      /prep_sheets         │
        └──────────────┘                └───────────────────────────┘
```

#### Entity 1: `User`
- **Path:** `/users/{userId}`
- **Fields:**
  - `id`: string (Firebase Auth UID)
  - `email`: string (validated email format)
  - `displayName`: string
  - `restaurantId`: string (foreign key to `/restaurants/{restaurantId}`)
  - `role`: string ('owner' | 'general_manager' | 'head_chef' | 'line_cook')
  - `createdAt`: timestamp
  - `updatedAt`: timestamp

#### Entity 2: `Restaurant`
- **Path:** `/restaurants/{restaurantId}`
- **Fields:**
  - `id`: string (e.g., 'rst_rustic_table')
  - `name`: string (e.g., 'The Rustic Table')
  - `concept`: string ('Bistro & Seasonal Kitchen')
  - `currency`: string ('USD' | 'EUR' | 'GBP')
  - `stations`: array of strings (['Grill', 'Saute', 'Garde Manger', 'Bakery'])
  - `ownerId`: string (User UID)
  - `isDemonstrationData`: boolean
  - `settings`: map:
    - `maxDecreasePct`: number (default 30)
    - `maxIncreasePct`: number (default 35)
    - `safetyBuffers`: map of station -> percentage
  - `createdAt`: timestamp

#### Entity 3: `MenuItem`
- **Path:** `/restaurants/{restaurantId}/menu_items/{menuItemId}`
- **Fields:**
  - `id`: string (e.g., 'mnu_grill_chicken_bowl')
  - `restaurantId`: string
  - `name`: string (e.g., 'Charred Chicken Rice Bowl')
  - `category`: string ('Signature Bowls' | 'Mains' | 'Salads' | 'Bakery')
  - `station`: string ('Grill' | 'Saute' | 'Garde Manger' | 'Bakery')
  - `sellingPrice`: number (> 0)
  - `targetCost`: number (> 0)
  - `isActive`: boolean
  - `isDemonstrationData`: boolean
  - `createdAt`: timestamp

#### Entity 4: `Ingredient`
- **Path:** `/restaurants/{restaurantId}/ingredients/{ingredientId}`
- **Fields:**
  - `id`: string (e.g., 'ing_chicken')
  - `restaurantId`: string
  - `name`: string (e.g., 'Free-Range Chicken Breast')
  - `category`: string ('Protein' | 'Produce' | 'Dairy' | 'Dry Goods' | 'Bakery' | 'Pantry')
  - `unit`: string ('kg' | 'g' | 'L' | 'ml' | 'pcs')
  - `unitCost`: number (> 0)
  - `currentStock`: number (>= 0)
  - `safetyStock`: number (>= 0)
  - `shelfLifeDays`: number (> 0)
  - `isDemonstrationData`: boolean
  - `updatedAt`: timestamp

#### Entity 5: `RecipeBOM` (Ingredient Quantities per Dish)
- **Path:** `/restaurants/{restaurantId}/menu_items/{menuItemId}/recipe_bom/{bomId}`
- **Fields:**
  - `id`: string
  - `menuItemId`: string
  - `ingredientId`: string (foreign key to `/ingredients/{ingredientId}`)
  - `ingredientName`: string
  - `portionQuantity`: number (> 0, e.g. 0.22 kg)
  - `unit`: string ('kg' | 'g' | 'L' | 'ml' | 'pcs')

#### Entity 6: `InventoryRecord` (Physical Counts & Intake Audit)
- **Path:** `/restaurants/{restaurantId}/inventory_records/{recordId}`
- **Fields:**
  - `id`: string
  - `restaurantId`: string
  - `date`: string ('YYYY-MM-DD')
  - `counts`: array of `{ ingredientId, ingredientName, recordedStock, previousStock, unit, variance }`
  - `totalValuation`: number
  - `deficitCount`: number
  - `recordedBy`: string (User UID)
  - `timestamp`: timestamp

#### Entity 7: `SalesTransaction` (POS Line Items)
- **Path:** `/restaurants/{restaurantId}/sales_transactions/{txnId}`
- **Fields:**
  - `id`: string
  - `restaurantId`: string
  - `timestamp`: timestamp
  - `date`: string ('YYYY-MM-DD')
  - `mealPeriod`: string ('Lunch' | 'Dinner')
  - `items`: array of `{ menuItemId, dishName, quantity, unitPrice, lineTotal }`
  - `totalAmount`: number
  - `source`: string ('pos_csv_import' | 'manual_entry' | 'pos_webhook')
  - `isDemonstrationData`: boolean

#### Entity 8: `DailySalesSummary` (Aggregated Day Ledger)
- **Path:** `/restaurants/{restaurantId}/daily_sales/{summaryId}`
- **Fields:**
  - `id`: string (format: `{date}_{station}`)
  - `restaurantId`: string
  - `date`: string ('YYYY-MM-DD')
  - `dayOfWeek`: number (0-6)
  - `station`: string ('Grill' | 'Saute' | 'Garde Manger' | 'Bakery' | 'All')
  - `totalPortionsSold`: number
  - `totalRevenue`: number
  - `dishBreakdown`: map of `menuItemId` -> `{ dishName, quantitySold, revenue }`
  - `weatherCondition`: string ('Clear' | 'Rain' | 'Cloudy' | 'Storm')
  - `temperatureC`: number
  - `eventTag`: string
  - `isDemonstrationData`: boolean

#### Entity 9: `Prediction` (Forecast Runs & Audit Trail)
- **Path:** `/restaurants/{restaurantId}/predictions/{predictionId}`
- **Fields:**
  - `id`: string (format: `pred_{date}`)
  - `restaurantId`: string
  - `targetDate`: string ('YYYY-MM-DD')
  - `weatherForecast`: map `{ condition, temperatureC, precipitationProbability }`
  - `eventContext`: string
  - `baselineAlgorithm`: string ('4-week weighted moving average by day-of-week')
  - `isOfflineFallback`: boolean
  - `dishes`: array of:
    - `menuItemId`: string
    - `dishName`: string
    - `station`: string
    - `baseForecast`: number
    - `aiModifier`: number (bounded [-0.30, +0.35])
    - `adjustedSales`: number
    - `safetyBufferPct`: number
    - `recommendedPrep`: number
    - `rationale`: string
    - `riskLevel`: string ('Low' | 'Medium' | 'High')
  - `createdAt`: timestamp

#### Entity 10: `PreparationRecommendation` (Station Prep Sheets & Checklists)
- **Path:** `/restaurants/{restaurantId}/prep_sheets/{prepSheetId}`
- **Fields:**
  - `id`: string (format: `sheet_{date}`)
  - `restaurantId`: string
  - `businessDate`: string ('YYYY-MM-DD')
  - `shift`: string ('All Day' | 'Lunch' | 'Dinner')
  - `stationTasks`: map of `station` -> array of:
    - `taskId`: string
    - `menuItemId`: string
    - `dishName`: string
    - `recommendedPrepPortions`: number
    - `managerOverride`: number | null
    - `effectivePrepPortions`: number
    - `isCompleted`: boolean
    - `completedAt`: string | null
    - `completedBy`: string | null
    - `requiredIngredients`: array of:
      - `ingredientId`: string
      - `ingredientName`: string
      - `grossQuantity`: number
      - `currentStock`: number
      - `netQuantity`: number
      - `unit`: string
  - `updatedAt`: timestamp

#### Entity 11: `FoodWasteRecord` (Shift Discard Ledger)
- **Path:** `/restaurants/{restaurantId}/waste_records/{recordId}`
- **Fields:**
  - `id`: string
  - `restaurantId`: string
  - `date`: string ('YYYY-MM-DD')
  - `itemId`: string
  - `itemType`: string ('menu_item' | 'ingredient')
  - `name`: string
  - `quantity`: number (> 0)
  - `unit`: string ('portions' | 'kg' | 'L')
  - `unitCost`: number
  - `totalLossCost`: number
  - `reason`: string ('Overproduction' | 'Expired' | 'Prep Mistake' | 'Quality Defect')
  - `station`: string
  - `loggedBy`: string
  - `notes`: string
  - `createdAt`: timestamp

---

### 3. Data Validation Strategy

1. **Client & Repository Layer (Zod Schemas):**
   - All models validated prior to transmission to Firestore.
   - Non-negative numbers for quantities, portions, and currency amounts.
   - Date formats strictly matching `YYYY-MM-DD`.

2. **Database Security Layer (`firestore.rules`):**
   - Attribute-Based Access Control (ABAC): Every document must belong to the user's authorized `restaurantId`.
   - Immutable fields: `createdAt`, `restaurantId`, and `ownerId` cannot be mutated after creation.
   - Bounded AI adjustments: Multipliers strictly capped between `-0.30` and `+0.35`.

---

### 4. Implementation Phasing

- **Step 1:** Provision Firestore & Auth via AI Studio confirmation UI (`show_aistudio_ui: "firebase_setup"`).
- **Step 2:** Generate `firebase-blueprint.json` reflecting the 11 entities.
- **Step 3:** Generate zero-trust `firestore.rules` with ESLint validation.
- **Step 4:** Implement repository services connecting the frontend to Firestore.
