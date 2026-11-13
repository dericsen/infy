import { z } from 'zod';
import {
  DEFAULT_FORECAST_CONFIG,
  ForecastConfig,
  Ingredient,
  InventoryRecord,
  MenuItem,
  PredictionRecord,
  PrepChecklistItem,
  PrepSheetRecord,
  Restaurant,
  SaleRecord,
  WasteRecord
} from '../types';
import {
  BENCHMARK_INGREDIENTS,
  BENCHMARK_MENU_ITEMS,
  BENCHMARK_RESTAURANT,
  INITIAL_BENCHMARK_SALES
} from '../data/benchmarkData';
import {
  idbClear,
  idbClearAll,
  idbDelete,
  idbGetAll,
  idbGetById,
  idbPut,
  idbPutBulk
} from './indexedDb';

export interface SettingsDocument {
  id: string;
  restaurantId: string;
  forecastConfig: ForecastConfig;
  updatedAt: number;
}

export const INITIAL_DEMO_WASTE_RECORDS: WasteRecord[] = [
  {
    id: 'wst_1',
    restaurantId: 'rst_rustic_table',
    date: '2026-11-11',
    itemId: 'mnu_grill_salmon',
    itemType: 'menu_item',
    name: 'Wood-Fired Atlantic Salmon',
    quantity: 3,
    unit: 'portions',
    unitCost: 7.90,
    totalLossCost: 23.70,
    reason: 'Overproduction',
    loggedBy: 'Chef Marco',
    station: 'Grill'
  },
  {
    id: 'wst_2',
    restaurantId: 'rst_rustic_table',
    date: '2026-11-11',
    itemId: 'mnu_bakery_sourdough_loaf',
    itemType: 'menu_item',
    name: 'Country Sourdough Batard',
    quantity: 4,
    unit: 'portions',
    unitCost: 1.40,
    totalLossCost: 5.60,
    reason: 'Expired',
    loggedBy: 'Leo (Station Cook)',
    station: 'Bakery'
  },
  {
    id: 'wst_3',
    restaurantId: 'rst_rustic_table',
    date: '2026-11-10',
    itemId: 'mnu_salad_caesar',
    itemType: 'menu_item',
    name: 'Artisan Caesar Salad',
    quantity: 3,
    unit: 'portions',
    unitCost: 2.90,
    totalLossCost: 8.70,
    reason: 'Overproduction',
    loggedBy: 'Chef Marco',
    station: 'Garde Manger'
  }
];

export interface IRestaurantRepository {
  getById(id: string): Promise<Restaurant | null>;
  save(restaurant: Restaurant): Promise<void>;
}

export interface IMenuRepository {
  list(restaurantId: string): Promise<MenuItem[]>;
  getById(id: string): Promise<MenuItem | null>;
  save(item: MenuItem): Promise<void>;
  bulkSave(items: MenuItem[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IIngredientRepository {
  list(restaurantId: string): Promise<Ingredient[]>;
  getById(id: string): Promise<Ingredient | null>;
  save(ingredient: Ingredient): Promise<void>;
  bulkSave(ingredients: Ingredient[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IInventoryRepository {
  list(restaurantId: string): Promise<InventoryRecord[]>;
  save(record: InventoryRecord): Promise<void>;
  bulkSave(records: InventoryRecord[]): Promise<void>;
}

export interface ISalesRepository {
  listAll(restaurantId: string): Promise<SaleRecord[]>;
  save(record: SaleRecord): Promise<void>;
  saveBulk(records: SaleRecord[]): Promise<void>;
  clearAll(restaurantId: string): Promise<void>;
}

export interface IWasteRepository {
  listAll(restaurantId: string): Promise<WasteRecord[]>;
  save(record: WasteRecord): Promise<void>;
  bulkSave(records: WasteRecord[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPredictionRepository {
  listAll(restaurantId: string): Promise<PredictionRecord[]>;
  getByDate(restaurantId: string, targetDate: string): Promise<PredictionRecord | null>;
  save(prediction: PredictionRecord): Promise<void>;
}

export interface IPrepSheetRepository {
  getSheetByDate(restaurantId: string, businessDate: string): Promise<PrepSheetRecord | null>;
  saveSheet(sheet: PrepSheetRecord): Promise<void>;
  listChecklistByDate(businessDate: string, prepSheetId?: string): Promise<PrepChecklistItem[]>;
  saveChecklistItem(item: PrepChecklistItem): Promise<void>;
  saveChecklistBulk(items: PrepChecklistItem[]): Promise<void>;
  clearChecklistForDate(businessDate: string, prepSheetId?: string): Promise<void>;
}

export interface ISettingsRepository {
  get(restaurantId: string): Promise<ForecastConfig>;
  save(restaurantId: string, config: ForecastConfig): Promise<void>;
}

export const restaurantRepository: IRestaurantRepository = {
  async getById(id: string) {
    return idbGetById<Restaurant>('restaurants', id);
  },
  async save(restaurant: Restaurant) {
    await idbPut('restaurants', { ...restaurant, updatedAt: Date.now() });
  }
};

export const menuRepository: IMenuRepository = {
  async list(restaurantId: string) {
    const all = await idbGetAll<MenuItem>('menu_items');
    return all.filter(item => item.restaurantId === restaurantId);
  },
  async getById(id: string) {
    return idbGetById<MenuItem>('menu_items', id);
  },
  async save(item: MenuItem) {
    await idbPut('menu_items', item);
  },
  async bulkSave(items: MenuItem[]) {
    await idbPutBulk('menu_items', items);
  },
  async delete(id: string) {
    await idbDelete('menu_items', id);
  }
};

export const ingredientRepository: IIngredientRepository = {
  async list(restaurantId: string) {
    const all = await idbGetAll<Ingredient>('ingredients');
    return all.filter(item => item.restaurantId === restaurantId);
  },
  async getById(id: string) {
    return idbGetById<Ingredient>('ingredients', id);
  },
  async save(ingredient: Ingredient) {
    await idbPut('ingredients', ingredient);
  },
  async bulkSave(ingredients: Ingredient[]) {
    await idbPutBulk('ingredients', ingredients);
  },
  async delete(id: string) {
    await idbDelete('ingredients', id);
  }
};

export const inventoryRepository: IInventoryRepository = {
  async list(restaurantId: string) {
    const all = await idbGetAll<InventoryRecord>('inventory_records');
    return all
      .filter(r => r.restaurantId === restaurantId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  async save(record: InventoryRecord) {
    await idbPut('inventory_records', record);
  },
  async bulkSave(records: InventoryRecord[]) {
    await idbPutBulk('inventory_records', records);
  }
};

export const salesRepository: ISalesRepository = {
  async listAll(restaurantId: string) {
    const all = await idbGetAll<SaleRecord>('sales_records');
    return all
      .filter(r => r.restaurantId === restaurantId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
  async save(record: SaleRecord) {
    await idbPut('sales_records', record);
  },
  async saveBulk(records: SaleRecord[]) {
    await idbPutBulk('sales_records', records);
  },
  async clearAll(restaurantId: string) {
    const current = await this.listAll(restaurantId);
    for (const r of current) {
      await idbDelete('sales_records', r.id);
    }
  }
};

export const wasteRepository: IWasteRepository = {
  async listAll(restaurantId: string) {
    const all = await idbGetAll<WasteRecord>('waste_records');
    return all
      .filter(r => r.restaurantId === restaurantId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
  async save(record: WasteRecord) {
    await idbPut('waste_records', record);
  },
  async bulkSave(records: WasteRecord[]) {
    await idbPutBulk('waste_records', records);
  },
  async delete(id: string) {
    await idbDelete('waste_records', id);
  }
};

export const predictionRepository: IPredictionRepository = {
  async listAll(restaurantId: string) {
    const all = await idbGetAll<PredictionRecord>('predictions');
    return all
      .filter(p => p.restaurantId === restaurantId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async getByDate(restaurantId: string, targetDate: string) {
    const all = await this.listAll(restaurantId);
    return all.find(p => p.targetDate === targetDate) || null;
  },
  async save(prediction: PredictionRecord) {
    await idbPut('predictions', prediction);
  }
};

export const prepSheetRepository: IPrepSheetRepository = {
  async getSheetByDate(restaurantId: string, businessDate: string) {
    const id = `prep_${businessDate}_${restaurantId}`;
    return idbGetById<PrepSheetRecord>('prep_sheets', id);
  },
  async saveSheet(sheet: PrepSheetRecord) {
    await idbPut('prep_sheets', sheet);
  },
  async listChecklistByDate(businessDate: string, prepSheetId?: string) {
    const all = await idbGetAll<PrepChecklistItem>('prep_checklists');
    return all.filter(
      item =>
        item.businessDate === businessDate &&
        (!prepSheetId || item.prepSheetId === prepSheetId)
    );
  },
  async saveChecklistItem(item: PrepChecklistItem) {
    await idbPut('prep_checklists', item);
  },
  async saveChecklistBulk(items: PrepChecklistItem[]) {
    await idbPutBulk('prep_checklists', items);
  },
  async clearChecklistForDate(businessDate: string, prepSheetId?: string) {
    const items = await this.listChecklistByDate(businessDate, prepSheetId);
    for (const item of items) {
      await idbDelete('prep_checklists', item.id);
    }
  }
};

export const settingsRepository: ISettingsRepository = {
  async get(restaurantId: string) {
    const doc = await idbGetById<SettingsDocument>('settings', `cfg_${restaurantId}`);
    if (!doc) return { ...DEFAULT_FORECAST_CONFIG };
    return {
      ...DEFAULT_FORECAST_CONFIG,
      ...doc.forecastConfig,
      stationBuffers: {
        ...DEFAULT_FORECAST_CONFIG.stationBuffers,
        ...(doc.forecastConfig?.stationBuffers || {})
      }
    };
  },
  async save(restaurantId: string, config: ForecastConfig) {
    const doc: SettingsDocument = {
      id: `cfg_${restaurantId}`,
      restaurantId,
      forecastConfig: config,
      updatedAt: Date.now()
    };
    await idbPut('settings', doc);
  }
};

function tryParseLegacyLocalStorage<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function initializeDatabase(restaurantId: string = 'rst_rustic_table'): Promise<{
  restaurant: Restaurant;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  salesRecords: SaleRecord[];
  wasteRecords: WasteRecord[];
  inventoryRecords: InventoryRecord[];
  predictions: PredictionRecord[];
  forecastConfig: ForecastConfig;
}> {
  let restaurant = await restaurantRepository.getById(restaurantId);
  let menuItems = await menuRepository.list(restaurantId);
  let ingredients = await ingredientRepository.list(restaurantId);
  let salesRecords = await salesRepository.listAll(restaurantId);
  let wasteRecords = await wasteRepository.listAll(restaurantId);

  if (!restaurant || menuItems.length === 0 || ingredients.length === 0) {
    const legacyMenu = tryParseLegacyLocalStorage<MenuItem[]>('wl_menu_items');
    const legacyIngredients = tryParseLegacyLocalStorage<Ingredient[]>('wl_ingredients');
    const legacySales = tryParseLegacyLocalStorage<SaleRecord[]>('wl_sales_records');
    const legacyWaste = tryParseLegacyLocalStorage<WasteRecord[]>('wl_waste_records');

    restaurant = BENCHMARK_RESTAURANT;
    menuItems = legacyMenu && legacyMenu.length > 0 ? legacyMenu : BENCHMARK_MENU_ITEMS;
    ingredients = legacyIngredients && legacyIngredients.length > 0 ? legacyIngredients : BENCHMARK_INGREDIENTS;
    salesRecords = legacySales && legacySales.length > 0 ? legacySales : INITIAL_BENCHMARK_SALES;
    wasteRecords = legacyWaste && legacyWaste.length > 0 ? legacyWaste : INITIAL_DEMO_WASTE_RECORDS;

    await restaurantRepository.save(restaurant);
    await menuRepository.bulkSave(menuItems);
    await ingredientRepository.bulkSave(ingredients);
    await salesRepository.saveBulk(salesRecords);
    await wasteRepository.bulkSave(wasteRecords);
    await settingsRepository.save(restaurantId, DEFAULT_FORECAST_CONFIG);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wl_menu_items');
      localStorage.removeItem('wl_ingredients');
      localStorage.removeItem('wl_sales_records');
      localStorage.removeItem('wl_waste_records');
    }
  }

  const inventoryRecords = await inventoryRepository.list(restaurantId);
  const predictions = await predictionRepository.listAll(restaurantId);
  const forecastConfig = await settingsRepository.get(restaurantId);

  return {
    restaurant,
    menuItems,
    ingredients,
    salesRecords,
    wasteRecords,
    inventoryRecords,
    predictions,
    forecastConfig
  };
}

export async function resetDatabaseToBenchmark(restaurantId: string = 'rst_rustic_table') {
  await idbClearAll();

  await restaurantRepository.save(BENCHMARK_RESTAURANT);
  await menuRepository.bulkSave(BENCHMARK_MENU_ITEMS);
  await ingredientRepository.bulkSave(BENCHMARK_INGREDIENTS);
  await salesRepository.saveBulk(INITIAL_BENCHMARK_SALES);
  await wasteRepository.bulkSave(INITIAL_DEMO_WASTE_RECORDS);
  await settingsRepository.save(restaurantId, DEFAULT_FORECAST_CONFIG);

  return {
    restaurant: BENCHMARK_RESTAURANT,
    menuItems: BENCHMARK_MENU_ITEMS,
    ingredients: BENCHMARK_INGREDIENTS,
    salesRecords: INITIAL_BENCHMARK_SALES,
    wasteRecords: INITIAL_DEMO_WASTE_RECORDS,
    inventoryRecords: [] as InventoryRecord[],
    predictions: [] as PredictionRecord[],
    forecastConfig: DEFAULT_FORECAST_CONFIG
  };
}

const SnapshotSchema = z.object({
  version: z.string().optional(),
  restaurant: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
      concept: z.string(),
      currency: z.string(),
      stations: z.array(z.enum(['Grill', 'Saute', 'Garde Manger', 'Bakery'])),
      isDemo: z.boolean(),
      version: z.string()
    })
    .optional(),
  menuItems: z.array(
    z.object({
      id: z.string().min(1),
      restaurantId: z.string().min(1),
      name: z.string().min(1),
      category: z.string(),
      station: z.enum(['Grill', 'Saute', 'Garde Manger', 'Bakery']),
      sellingPrice: z.number().nonnegative(),
      targetCost: z.number().nonnegative(),
      isActive: z.boolean(),
      ingredients: z.array(
        z.object({
          id: z.string(),
          menuItemId: z.string(),
          ingredientId: z.string(),
          ingredientName: z.string(),
          quantity: z.number().positive(),
          unit: z.enum(['kg', 'g', 'L', 'ml', 'pcs'])
        })
      )
    })
  ),
  ingredients: z.array(
    z.object({
      id: z.string().min(1),
      restaurantId: z.string().min(1),
      name: z.string().min(1),
      category: z.enum(['Protein', 'Produce', 'Dairy', 'Dry Goods', 'Bakery', 'Pantry']),
      unit: z.enum(['kg', 'g', 'L', 'ml', 'pcs']),
      unitCost: z.number().nonnegative(),
      currentStock: z.number().nonnegative(),
      safetyStock: z.number().nonnegative(),
      shelfLifeDays: z.number().positive()
    })
  ),
  salesRecords: z.array(
    z.object({
      id: z.string().min(1),
      restaurantId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dayOfWeek: z.number().int().min(0).max(6),
      menuItemId: z.string().min(1),
      dishName: z.string().min(1),
      station: z.enum(['Grill', 'Saute', 'Garde Manger', 'Bakery']),
      quantitySold: z.number().nonnegative(),
      revenue: z.number().nonnegative(),
      mealPeriod: z.enum(['All Day', 'Lunch', 'Dinner']),
      weatherCondition: z.string(),
      temperatureC: z.number(),
      eventTag: z.string(),
      isDemonstrationData: z.boolean()
    })
  ),
  wasteRecords: z.array(
    z.object({
      id: z.string().min(1),
      restaurantId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      itemId: z.string().min(1),
      itemType: z.enum(['menu_item', 'ingredient']),
      name: z.string().min(1),
      quantity: z.number().positive(),
      unit: z.string(),
      unitCost: z.number().nonnegative(),
      totalLossCost: z.number().nonnegative(),
      reason: z.enum(['Overproduction', 'Expired', 'Prep Mistake', 'Quality Defect']),
      loggedBy: z.string(),
      station: z.enum(['Grill', 'Saute', 'Garde Manger', 'Bakery']).optional()
    })
  ),
  forecastConfig: z
    .object({
      lookbackWeeks: z.number().int().min(1).max(12),
      weekdayWeights: z.array(z.number().positive()).min(1),
      maxDecreasePct: z.number().min(0).max(60),
      maxIncreasePct: z.number().min(0).max(60),
      stationBuffers: z.object({
        Grill: z.number().min(0).max(30),
        Saute: z.number().min(0).max(30),
        'Garde Manger': z.number().min(0).max(30),
        Bakery: z.number().min(0).max(30)
      }),
      closedWeekdays: z.array(z.number().int().min(0).max(6)),
      closedDates: z.array(z.string()),
      defaultColdStartBaseline: z.number().min(1).max(500)
    })
    .optional()
});

export async function exportDatabaseSnapshot(restaurantId: string = 'rst_rustic_table') {
  const restaurant = (await restaurantRepository.getById(restaurantId)) || BENCHMARK_RESTAURANT;
  const menuItems = await menuRepository.list(restaurantId);
  const ingredients = await ingredientRepository.list(restaurantId);
  const salesRecords = await salesRepository.listAll(restaurantId);
  const wasteRecords = await wasteRepository.listAll(restaurantId);
  const inventoryRecords = await inventoryRepository.list(restaurantId);
  const predictions = await predictionRepository.listAll(restaurantId);
  const forecastConfig = await settingsRepository.get(restaurantId);
  const prepChecklists = await idbGetAll<PrepChecklistItem>('prep_checklists');
  const prepSheets = await idbGetAll<PrepSheetRecord>('prep_sheets');

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    restaurant,
    menuItems,
    ingredients,
    salesRecords,
    wasteRecords,
    inventoryRecords,
    predictions,
    prepSheets,
    prepChecklists,
    forecastConfig
  };
}

export async function importDatabaseSnapshot(
  jsonText: string,
  restaurantId: string = 'rst_rustic_table'
): Promise<{
  ok: true;
  data: Awaited<ReturnType<typeof initializeDatabase>>;
} | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'Selected file is not valid JSON.' };
  }

  const parsed = SnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      error: `Snapshot validation failed at ${firstIssue?.path.join('.') || 'root'}: ${firstIssue?.message || 'invalid schema'}.`
    };
  }

  const d = parsed.data;
  await idbClear('menu_items');
  await idbClear('ingredients');
  await idbClear('sales_records');
  await idbClear('waste_records');

  const rest = d.restaurant || BENCHMARK_RESTAURANT;
  await restaurantRepository.save(rest);
  await menuRepository.bulkSave(d.menuItems as MenuItem[]);
  await ingredientRepository.bulkSave(d.ingredients as Ingredient[]);
  await salesRepository.saveBulk(d.salesRecords as SaleRecord[]);
  await wasteRepository.bulkSave(d.wasteRecords as WasteRecord[]);

  if (d.forecastConfig) {
    await settingsRepository.save(restaurantId, d.forecastConfig as ForecastConfig);
  }

  const data = await initializeDatabase(restaurantId);
  return { ok: true, data };
}
