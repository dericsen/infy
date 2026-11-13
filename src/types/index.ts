export type Station = 'Grill' | 'Saute' | 'Garde Manger' | 'Bakery';

export type WasteReason = 'Overproduction' | 'Expired' | 'Prep Mistake' | 'Quality Defect';

export type UnitType = 'kg' | 'g' | 'L' | 'ml' | 'pcs';

export type AppRoute =
  | 'dashboard'
  | 'prep-sheet'
  | 'prediction'
  | 'menu'
  | 'ingredients'
  | 'inventory'
  | 'sales'
  | 'waste'
  | 'settings';

export interface ForecastConfig {
  lookbackWeeks: number;
  weekdayWeights: number[];
  maxDecreasePct: number;
  maxIncreasePct: number;
  stationBuffers: Record<Station, number>;
  closedWeekdays: number[];
  closedDates: string[];
  defaultColdStartBaseline: number;
}

export const DEFAULT_FORECAST_CONFIG: ForecastConfig = {
  lookbackWeeks: 4,
  weekdayWeights: [0.40, 0.30, 0.20, 0.10],
  maxDecreasePct: 30,
  maxIncreasePct: 35,
  stationBuffers: {
    Grill: 8,
    Saute: 10,
    'Garde Manger': 5,
    Bakery: 5
  },
  closedWeekdays: [],
  closedDates: [],
  defaultColdStartBaseline: 15
};

export interface Restaurant {
  id: string;
  name: string;
  concept: string;
  currency: string;
  stations: Station[];
  isDemo: boolean;
  version: string;
  updatedAt?: number;
}

export interface Ingredient {
  id: string;
  restaurantId: string;
  name: string;
  category: 'Protein' | 'Produce' | 'Dairy' | 'Dry Goods' | 'Bakery' | 'Pantry';
  unit: UnitType;
  unitCost: number;
  currentStock: number;
  safetyStock: number;
  shelfLifeDays: number;
  isDemonstrationData?: boolean;
}

export interface RecipeBOMItem {
  id: string;
  menuItemId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: UnitType;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  station: Station;
  sellingPrice: number;
  targetCost: number;
  isActive: boolean;
  isDemonstrationData?: boolean;
  ingredients: RecipeBOMItem[];
}

export interface SaleRecord {
  id: string;
  restaurantId: string;
  date: string;
  dayOfWeek: number;
  menuItemId: string;
  dishName: string;
  station: Station;
  quantitySold: number;
  revenue: number;
  mealPeriod: 'All Day' | 'Lunch' | 'Dinner';
  weatherCondition: string;
  temperatureC: number;
  eventTag: string;
  isDemonstrationData: boolean;
}

export interface InventoryRecord {
  id: string;
  restaurantId: string;
  ingredientId: string;
  ingredientName: string;
  type: 'intake' | 'count_adjustment' | 'sale_deduction' | 'waste';
  delta: number;
  previousStock: number;
  newStock: number;
  unit: UnitType;
  note?: string;
  timestamp: string;
}

export interface WasteRecord {
  id: string;
  restaurantId: string;
  date: string;
  itemId: string;
  itemType: 'menu_item' | 'ingredient';
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalLossCost: number;
  reason: WasteReason;
  loggedBy: string;
  station?: Station;
}

export interface RequiredIngredientRequirement {
  ingredientId: string;
  name: string;
  grossRequired: number;
  currentStock: number;
  netRequired: number;
  unit: string;
}

export interface ItemPrediction {
  menuItemId: string;
  dishName: string;
  station: Station;
  baseCalculated: number;
  aiAdjusted: number;
  recommendedPrep: number;
  managerOverride: number | null;
  safetyBufferPct: number;
  confidenceScore: number;
  rationale: string;
  riskOfWaste: 'Low' | 'Medium' | 'High';
  requiredIngredients: RequiredIngredientRequirement[];
}

export interface PredictionRecord {
  id: string;
  restaurantId: string;
  targetDate: string;
  weatherForecast: {
    condition: string;
    temperatureC: number;
    precipitationProbability: number;
  };
  eventContext: string;
  generalAssessment?: string;
  modelVersion?: string;
  itemPredictions: ItemPrediction[];
  isOfflineFallback: boolean;
  createdAt: number;
}

export interface PrepSheetRecord {
  id: string;
  restaurantId: string;
  businessDate: string;
  overrides: Record<string, number>;
  updatedAt: number;
}

export interface PrepChecklistItem {
  id: string;
  prepSheetId: string;
  businessDate: string;
  station: Station;
  taskId: string;
  dishName?: string;
  completed: boolean;
  completedAt?: string;
}

export interface ContextualDishAdjustment {
  dishId: string;
  suggestedMultiplier: number;
  clampedMultiplier: number;
  rationale: string;
  riskOfWaste: 'Low' | 'Medium' | 'High';
}

export interface ContextualForecastResponse {
  modelVersion: string;
  generalAssessment: string;
  adjustments: ContextualDishAdjustment[];
  isOfflineFallback: boolean;
  fallbackReason?: string;
}
