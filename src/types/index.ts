export type Station = 'Grill' | 'Saute' | 'Garde Manger' | 'Bakery';

export type WasteReason = 'Overproduction' | 'Expired' | 'Prep Mistake' | 'Quality Defect';

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
  unit: 'kg' | 'g' | 'L' | 'ml' | 'pcs';
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
  unit: 'kg' | 'g' | 'L' | 'ml' | 'pcs';
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
  itemPredictions: ItemPrediction[];
  isOfflineFallback: boolean;
  createdAt: number;
}

export interface PrepChecklistItem {
  id: string;
  prepSheetId: string;
  businessDate: string;
  station: Station;
  taskId: string;
  completed: boolean;
  completedAt?: string;
}
