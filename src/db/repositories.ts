import {
  MenuItem,
  Ingredient,
  SaleRecord,
  WasteRecord,
  StockMovementRecord,
  ClosedDayRecord,
  PrepChecklistItem,
  AppSettings,
  ContextualAnalysisResult
} from '../types';
import {
  STORES,
  idbGetAll,
  idbGet,
  idbPut,
  idbPutMany,
  idbDelete,
  idbClearStore,
  idbClearAllStores
} from './indexedDb';
import {
  BENCHMARK_MENU_ITEMS,
  BENCHMARK_INGREDIENTS,
  INITIAL_BENCHMARK_SALES,
  INITIAL_WASTE_RECORDS,
  DEFAULT_APP_SETTINGS
} from '../data/benchmarkData';

export interface PrepOverrideRecord {
  id: string;
  prepSheetId: string;
  overrides: Record<string, number>;
  updatedAt: number;
}

export interface CachedContextRecord extends ContextualAnalysisResult {
  id: string;
}

export const MenuRepository = {
  async list(): Promise<MenuItem[]> {
    return idbGetAll<MenuItem>(STORES.MENU_ITEMS);
  },
  async save(item: MenuItem): Promise<void> {
    return idbPut(STORES.MENU_ITEMS, item);
  },
  async saveMany(items: MenuItem[]): Promise<void> {
    return idbPutMany(STORES.MENU_ITEMS, items);
  },
  async remove(id: string): Promise<void> {
    return idbDelete(STORES.MENU_ITEMS, id);
  }
};

export const IngredientRepository = {
  async list(): Promise<Ingredient[]> {
    return idbGetAll<Ingredient>(STORES.INGREDIENTS);
  },
  async save(ingredient: Ingredient): Promise<void> {
    return idbPut(STORES.INGREDIENTS, ingredient);
  },
  async saveMany(ingredients: Ingredient[]): Promise<void> {
    return idbPutMany(STORES.INGREDIENTS, ingredients);
  },
  async remove(id: string): Promise<void> {
    return idbDelete(STORES.INGREDIENTS, id);
  }
};

export const SalesRepository = {
  async list(): Promise<SaleRecord[]> {
    return idbGetAll<SaleRecord>(STORES.SALES_RECORDS);
  },
  async save(record: SaleRecord): Promise<void> {
    return idbPut(STORES.SALES_RECORDS, record);
  },
  async saveMany(records: SaleRecord[]): Promise<void> {
    return idbPutMany(STORES.SALES_RECORDS, records);
  },
  async remove(id: string): Promise<void> {
    return idbDelete(STORES.SALES_RECORDS, id);
  }
};

export const WasteRepository = {
  async list(): Promise<WasteRecord[]> {
    return idbGetAll<WasteRecord>(STORES.WASTE_RECORDS);
  },
  async save(record: WasteRecord): Promise<void> {
    return idbPut(STORES.WASTE_RECORDS, record);
  },
  async saveMany(records: WasteRecord[]): Promise<void> {
    return idbPutMany(STORES.WASTE_RECORDS, records);
  }
};

export const StockMovementRepository = {
  async list(): Promise<StockMovementRecord[]> {
    const items = await idbGetAll<StockMovementRecord>(STORES.STOCK_MOVEMENTS);
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  async save(record: StockMovementRecord): Promise<void> {
    return idbPut(STORES.STOCK_MOVEMENTS, record);
  }
};

export const ClosedDayRepository = {
  async list(): Promise<ClosedDayRecord[]> {
    return idbGetAll<ClosedDayRecord>(STORES.CLOSED_DAYS);
  },
  async save(record: ClosedDayRecord): Promise<void> {
    return idbPut(STORES.CLOSED_DAYS, record);
  },
  async remove(id: string): Promise<void> {
    return idbDelete(STORES.CLOSED_DAYS, id);
  }
};

export const PrepChecklistRepository = {
  async listByPrepSheet(prepSheetId: string): Promise<PrepChecklistItem[]> {
    const all = await idbGetAll<PrepChecklistItem>(STORES.PREP_CHECKLISTS);
    return all.filter(item => item.prepSheetId === prepSheetId);
  },
  async saveItem(item: PrepChecklistItem): Promise<void> {
    return idbPut(STORES.PREP_CHECKLISTS, item);
  },
  async clearPrepSheet(prepSheetId: string): Promise<void> {
    const all = await idbGetAll<PrepChecklistItem>(STORES.PREP_CHECKLISTS);
    const matching = all.filter(item => item.prepSheetId === prepSheetId);
    await Promise.all(matching.map(item => idbDelete(STORES.PREP_CHECKLISTS, item.id)));
  }
};

export const PrepOverrideRepository = {
  async getByPrepSheet(prepSheetId: string): Promise<Record<string, number>> {
    const record = await idbGet<PrepOverrideRecord>(STORES.PREP_OVERRIDES, prepSheetId);
    return record ? record.overrides : {};
  },
  async saveForPrepSheet(prepSheetId: string, overrides: Record<string, number>): Promise<void> {
    return idbPut<PrepOverrideRecord>(STORES.PREP_OVERRIDES, {
      id: prepSheetId,
      prepSheetId,
      overrides,
      updatedAt: Date.now()
    });
  },
  async clearPrepSheet(prepSheetId: string): Promise<void> {
    return idbDelete(STORES.PREP_OVERRIDES, prepSheetId);
  }
};

export const SettingsRepository = {
  async get(restaurantId: string): Promise<AppSettings> {
    const found = await idbGet<AppSettings>(STORES.SETTINGS, `settings_${restaurantId}`);
    return found || DEFAULT_APP_SETTINGS;
  },
  async save(settings: AppSettings): Promise<void> {
    return idbPut(STORES.SETTINGS, settings);
  }
};

export const ContextualCacheRepository = {
  async get(cacheKey: string): Promise<CachedContextRecord | null> {
    return idbGet<CachedContextRecord>(STORES.CONTEXTUAL_CACHE, cacheKey);
  },
  async save(record: ContextualAnalysisResult): Promise<void> {
    return idbPut<CachedContextRecord>(STORES.CONTEXTUAL_CACHE, {
      ...record,
      id: record.cacheKey
    });
  },
  async clear(): Promise<void> {
    return idbClearStore(STORES.CONTEXTUAL_CACHE);
  }
};

export async function initializeDatabaseIfEmpty(): Promise<{
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  salesRecords: SaleRecord[];
  wasteRecords: WasteRecord[];
  stockMovements: StockMovementRecord[];
  closedDays: ClosedDayRecord[];
  settings: AppSettings;
}> {
  const existingMenu = await MenuRepository.list();
  const existingIngredients = await IngredientRepository.list();

  if (existingMenu.length === 0 && existingIngredients.length === 0) {
    await MenuRepository.saveMany(BENCHMARK_MENU_ITEMS);
    await IngredientRepository.saveMany(BENCHMARK_INGREDIENTS);
    await SalesRepository.saveMany(INITIAL_BENCHMARK_SALES);
    await WasteRepository.saveMany(INITIAL_WASTE_RECORDS);
    await SettingsRepository.save(DEFAULT_APP_SETTINGS);
  }

  const [menuItems, ingredients, salesRecords, wasteRecords, stockMovements, closedDays, settings] = await Promise.all([
    MenuRepository.list(),
    IngredientRepository.list(),
    SalesRepository.list(),
    WasteRepository.list(),
    StockMovementRepository.list(),
    ClosedDayRepository.list(),
    SettingsRepository.get('rst_rustic_table')
  ]);

  return {
    menuItems,
    ingredients,
    salesRecords,
    wasteRecords,
    stockMovements,
    closedDays,
    settings
  };
}

export async function resetDatabaseToBenchmark(): Promise<{
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  salesRecords: SaleRecord[];
  wasteRecords: WasteRecord[];
  stockMovements: StockMovementRecord[];
  closedDays: ClosedDayRecord[];
  settings: AppSettings;
}> {
  await idbClearAllStores();
  await MenuRepository.saveMany(BENCHMARK_MENU_ITEMS);
  await IngredientRepository.saveMany(BENCHMARK_INGREDIENTS);
  await SalesRepository.saveMany(INITIAL_BENCHMARK_SALES);
  await WasteRepository.saveMany(INITIAL_WASTE_RECORDS);
  await SettingsRepository.save(DEFAULT_APP_SETTINGS);

  return {
    menuItems: BENCHMARK_MENU_ITEMS,
    ingredients: BENCHMARK_INGREDIENTS,
    salesRecords: INITIAL_BENCHMARK_SALES,
    wasteRecords: INITIAL_WASTE_RECORDS,
    stockMovements: [],
    closedDays: [],
    settings: DEFAULT_APP_SETTINGS
  };
}
