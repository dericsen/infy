export type Station = 'Grill' | 'Saute' | 'Garde Manger' | 'Bakery';

export type MeasurementUnit = 'kg' | 'g' | 'L' | 'ml' | 'pcs';

export type WasteReason = 'Overproduction' | 'Expired' | 'Prep Mistake' | 'Quality Defect';

export type StockMovementType = 'addition' | 'reduction' | 'adjustment' | 'sale_deduction';

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

export interface Restaurant {
  id: string;
  name: string;
  concept: string;
  currency: string;
  stations: Station[];
  isDemo: boolean;
  version: string;
}

export interface Ingredient {
  id: string;
  restaurantId: string;
  name: string;
  category: 'Protein' | 'Produce' | 'Dairy' | 'Dry Goods' | 'Bakery' | 'Pantry';
  unit: MeasurementUnit;
  unitCost: number;
  currentStock: number;
  safetyStock: number;
  shelfLifeDays: number;
  expirationDate?: string;
  isAvailable?: boolean;
  isDemonstrationData?: boolean;
}

export interface RecipeBOMItem {
  id: string;
  menuItemId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: MeasurementUnit;
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
  prepInstructions?: string;
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

export interface ClosedDayRecord {
  id: string;
  restaurantId: string;
  date: string;
  reason: string;
}

export interface StockMovementRecord {
  id: string;
  restaurantId: string;
  ingredientId: string;
  ingredientName: string;
  type: StockMovementType;
  delta: number;
  previousStock: number;
  newStock: number;
  unit: MeasurementUnit;
  reason: string;
  date: string;
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

export interface AppSettings {
  id: string;
  restaurantId: string;
  restaurantName: string;
  concept: string;
  currency: string;
  aiAdjustmentLimitPct: number;
  stationBuffers: Record<Station, number>;
  updatedAt: number;
}

export interface PrepChecklistItem {
  id: string;
  prepSheetId: string;
  businessDate: string;
  station: Station;
  taskId: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  isDemonstrationData: boolean;
}

export interface GeminiDishAdjustment {
  dishId: string;
  suggestedMultiplier: number;
  rationale: string;
  riskOfWaste: 'Low' | 'Medium' | 'High';
}

export interface ContextualAnalysisResult {
  cacheKey: string;
  targetDate: string;
  modelVersion: string;
  adjustmentLimitPct: number;
  generalAssessment: string;
  adjustments: GeminiDishAdjustment[];
  isFallback: boolean;
  fallbackReason?: string;
  generatedAt: string;
}

export interface DishIngredientBreakdown {
  ingredientId: string;
  ingredientName: string;
  portionQuantity: number;
  portionUnit: MeasurementUnit;
  convertedPerPortion: number;
  stockUnit: MeasurementUnit;
  grossForDish: number;
  currentStock: number;
  unitCompatible: boolean;
  compatibilityWarning?: string;
}

export interface DishPreparationRecommendation {
  menuItemId: string;
  dishName: string;
  station: Station;
  category: string;
  predictedPortions: number;
  recommendedPrep: number;
  effectivePrep: number;
  isOverridden: boolean;
  safetyBufferPct: number;
  confidenceInterval80: [number, number];
  dataStatus: 'optimal' | 'moderate' | 'insufficient' | 'closed';
  riskOfWaste: 'Low' | 'Medium' | 'High';
  prepInstructions?: string;
  missingRecipeWarning?: string;
  reasoning: string;
  ingredients: DishIngredientBreakdown[];
  hasShortage: boolean;
  hasUnitWarning: boolean;
}

export interface IngredientProcurementSummary {
  ingredientId: string;
  ingredientName: string;
  category: string;
  stockUnit: MeasurementUnit;
  grossRequired: number;
  availableStock: number;
  safetyStock: number;
  netRequired: number;
  surplusAfterPrep: number;
  isShortage: boolean;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
  shelfLifeDays: number;
  expirationDate?: string;
  sharedAcrossDishes: string[];
  hasUnitWarning: boolean;
  unitWarningMessage?: string;
  procurementAction: 'Sufficient — Do Not Order' | 'Shortage — Procure / Prep Net Qty' | 'Expiring Soon — Prioritize Use' | 'Unit Mismatch — Verify Recipe';
}

export interface PrepSheetRecommendationBundle {
  prepSheetId: string;
  businessDate: string;
  shift: 'All Day' | 'Lunch' | 'Dinner';
  isClosedDay: boolean;
  itemRecommendations: DishPreparationRecommendation[];
  ingredientSummaries: IngredientProcurementSummary[];
  totalPredictedPortions: number;
  totalRecommendedPrep: number;
  totalShortagesCount: number;
  missingRecipesCount: number;
  expiringSoonCount: number;
}
