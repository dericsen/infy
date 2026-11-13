import { Restaurant, Ingredient, MenuItem, SaleRecord } from '../types';

export const BENCHMARK_METADATA = {
  datasetId: 'rst_rustic_table_v1',
  version: '1.0.0',
  name: 'The Rustic Table Benchmark Dataset',
  archetype: 'Fast Casual Bistro & Grill',
  generatedDate: '2026-11-12',
  description: 'Verified 30-day simulated historical operational dataset for single-location kitchen benchmarking',
  isDemonstrationData: true
};

export const BENCHMARK_RESTAURANT: Restaurant = {
  id: 'rst_rustic_table',
  name: 'The Rustic Table',
  concept: 'Bistro & Seasonal Kitchen',
  currency: '$',
  stations: ['Grill', 'Saute', 'Garde Manger', 'Bakery'],
  isDemo: true,
  version: '1.0.0'
};

export const BENCHMARK_INGREDIENTS: Ingredient[] = [
  { id: 'ing_chicken', restaurantId: 'rst_rustic_table', name: 'Free-Range Chicken Breast', category: 'Protein', unit: 'kg', unitCost: 9.50, currentStock: 18.5, safetyStock: 8.0, shelfLifeDays: 3, isDemonstrationData: true },
  { id: 'ing_beef_sirloin', restaurantId: 'rst_rustic_table', name: 'Prime Sirloin Steak', category: 'Protein', unit: 'kg', unitCost: 19.80, currentStock: 12.0, safetyStock: 6.0, shelfLifeDays: 4, isDemonstrationData: true },
  { id: 'ing_salmon', restaurantId: 'rst_rustic_table', name: 'Atlantic Salmon Fillet', category: 'Protein', unit: 'kg', unitCost: 22.00, currentStock: 9.0, safetyStock: 5.0, shelfLifeDays: 2, isDemonstrationData: true },
  { id: 'ing_tofu', restaurantId: 'rst_rustic_table', name: 'Organic Firm Tofu', category: 'Protein', unit: 'kg', unitCost: 4.20, currentStock: 14.0, safetyStock: 4.0, shelfLifeDays: 7, isDemonstrationData: true },
  { id: 'ing_jasmine_rice', restaurantId: 'rst_rustic_table', name: 'Jasmine Rice', category: 'Dry Goods', unit: 'kg', unitCost: 2.10, currentStock: 45.0, safetyStock: 15.0, shelfLifeDays: 90, isDemonstrationData: true },
  { id: 'ing_penne_pasta', restaurantId: 'rst_rustic_table', name: 'Artisan Penne Pasta', category: 'Dry Goods', unit: 'kg', unitCost: 2.80, currentStock: 25.0, safetyStock: 10.0, shelfLifeDays: 90, isDemonstrationData: true },
  { id: 'ing_heavy_cream', restaurantId: 'rst_rustic_table', name: 'Heavy Cream 36%', category: 'Dairy', unit: 'L', unitCost: 4.50, currentStock: 12.0, safetyStock: 5.0, shelfLifeDays: 7, isDemonstrationData: true },
  { id: 'ing_butter', restaurantId: 'rst_rustic_table', name: 'Unsalted Butter', category: 'Dairy', unit: 'kg', unitCost: 7.20, currentStock: 16.0, safetyStock: 6.0, shelfLifeDays: 30, isDemonstrationData: true },
  { id: 'ing_parmesan', restaurantId: 'rst_rustic_table', name: 'Parmigiano Reggiano', category: 'Dairy', unit: 'kg', unitCost: 18.50, currentStock: 6.5, safetyStock: 3.0, shelfLifeDays: 45, isDemonstrationData: true },
  { id: 'ing_onions', restaurantId: 'rst_rustic_table', name: 'Yellow Onions', category: 'Produce', unit: 'kg', unitCost: 1.40, currentStock: 30.0, safetyStock: 10.0, shelfLifeDays: 14, isDemonstrationData: true },
  { id: 'ing_mushrooms', restaurantId: 'rst_rustic_table', name: 'Cremini Mushrooms', category: 'Produce', unit: 'kg', unitCost: 5.80, currentStock: 8.0, safetyStock: 4.0, shelfLifeDays: 4, isDemonstrationData: true },
  { id: 'ing_romaine', restaurantId: 'rst_rustic_table', name: 'Crisp Romaine Lettuce', category: 'Produce', unit: 'kg', unitCost: 3.20, currentStock: 11.0, safetyStock: 6.0, shelfLifeDays: 3, isDemonstrationData: true },
  { id: 'ing_kale', restaurantId: 'rst_rustic_table', name: 'Tuscan Lacinato Kale', category: 'Produce', unit: 'kg', unitCost: 4.00, currentStock: 7.0, safetyStock: 3.5, shelfLifeDays: 4, isDemonstrationData: true },
  { id: 'ing_cherry_tomatoes', restaurantId: 'rst_rustic_table', name: 'Heirloom Cherry Tomatoes', category: 'Produce', unit: 'kg', unitCost: 4.90, currentStock: 9.5, safetyStock: 4.0, shelfLifeDays: 4, isDemonstrationData: true },
  { id: 'ing_avocado', restaurantId: 'rst_rustic_table', name: 'Hass Avocados', category: 'Produce', unit: 'kg', unitCost: 6.50, currentStock: 7.0, safetyStock: 3.0, shelfLifeDays: 3, isDemonstrationData: true },
  { id: 'ing_olive_oil', restaurantId: 'rst_rustic_table', name: 'Extra Virgin Olive Oil', category: 'Pantry', unit: 'L', unitCost: 9.00, currentStock: 22.0, safetyStock: 8.0, shelfLifeDays: 180, isDemonstrationData: true },
  { id: 'ing_flour', restaurantId: 'rst_rustic_table', name: 'Bread Flour Unbleached', category: 'Bakery', unit: 'kg', unitCost: 1.80, currentStock: 50.0, safetyStock: 20.0, shelfLifeDays: 60, isDemonstrationData: true },
  { id: 'ing_sourdough_starter', restaurantId: 'rst_rustic_table', name: 'Active Sourdough Levain', category: 'Bakery', unit: 'kg', unitCost: 3.00, currentStock: 6.0, safetyStock: 2.0, shelfLifeDays: 5, isDemonstrationData: true },
  { id: 'ing_cane_sugar', restaurantId: 'rst_rustic_table', name: 'Pure Cane Sugar', category: 'Bakery', unit: 'kg', unitCost: 1.60, currentStock: 35.0, safetyStock: 10.0, shelfLifeDays: 180, isDemonstrationData: true },
  { id: 'ing_eggs', restaurantId: 'rst_rustic_table', name: 'Cage-Free Fresh Eggs', category: 'Dairy', unit: 'pcs', unitCost: 0.32, currentStock: 180, safetyStock: 60, shelfLifeDays: 14, isDemonstrationData: true }
];

export const BENCHMARK_MENU_ITEMS: MenuItem[] = [
  {
    id: 'mnu_grill_chicken_bowl',
    restaurantId: 'rst_rustic_table',
    name: 'Charred Chicken Rice Bowl',
    category: 'Signature Bowls',
    station: 'Grill',
    sellingPrice: 16.50,
    targetCost: 4.80,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_1', menuItemId: 'mnu_grill_chicken_bowl', ingredientId: 'ing_chicken', ingredientName: 'Free-Range Chicken Breast', quantity: 0.22, unit: 'kg' },
      { id: 'bom_2', menuItemId: 'mnu_grill_chicken_bowl', ingredientId: 'ing_jasmine_rice', ingredientName: 'Jasmine Rice', quantity: 0.12, unit: 'kg' },
      { id: 'bom_3', menuItemId: 'mnu_grill_chicken_bowl', ingredientId: 'ing_cherry_tomatoes', ingredientName: 'Heirloom Cherry Tomatoes', quantity: 0.05, unit: 'kg' },
      { id: 'bom_4', menuItemId: 'mnu_grill_chicken_bowl', ingredientId: 'ing_avocado', ingredientName: 'Hass Avocados', quantity: 0.06, unit: 'kg' }
    ]
  },
  {
    id: 'mnu_grill_steak_frites',
    restaurantId: 'rst_rustic_table',
    name: 'Grilled Sirloin Steak Plate',
    category: 'Mains',
    station: 'Grill',
    sellingPrice: 28.00,
    targetCost: 8.50,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_5', menuItemId: 'mnu_grill_steak_frites', ingredientId: 'ing_beef_sirloin', ingredientName: 'Prime Sirloin Steak', quantity: 0.28, unit: 'kg' },
      { id: 'bom_6', menuItemId: 'mnu_grill_steak_frites', ingredientId: 'ing_butter', ingredientName: 'Unsalted Butter', quantity: 0.03, unit: 'kg' },
      { id: 'bom_7', menuItemId: 'mnu_grill_steak_frites', ingredientId: 'ing_onions', ingredientName: 'Yellow Onions', quantity: 0.08, unit: 'kg' }
    ]
  },
  {
    id: 'mnu_grill_salmon',
    restaurantId: 'rst_rustic_table',
    name: 'Wood-Fired Atlantic Salmon',
    category: 'Mains',
    station: 'Grill',
    sellingPrice: 26.50,
    targetCost: 7.90,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_8', menuItemId: 'mnu_grill_salmon', ingredientId: 'ing_salmon', ingredientName: 'Atlantic Salmon Fillet', quantity: 0.20, unit: 'kg' },
      { id: 'bom_9', menuItemId: 'mnu_grill_salmon', ingredientId: 'ing_olive_oil', ingredientName: 'Extra Virgin Olive Oil', quantity: 0.02, unit: 'L' },
      { id: 'bom_10', menuItemId: 'mnu_grill_salmon', ingredientId: 'ing_kale', ingredientName: 'Tuscan Lacinato Kale', quantity: 0.08, unit: 'kg' }
    ]
  },
  {
    id: 'mnu_saute_creamy_pasta',
    restaurantId: 'rst_rustic_table',
    name: 'Tuscan Cream Penne Pasta',
    category: 'Pasta',
    station: 'Saute',
    sellingPrice: 17.50,
    targetCost: 4.20,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_11', menuItemId: 'mnu_saute_creamy_pasta', ingredientId: 'ing_penne_pasta', ingredientName: 'Artisan Penne Pasta', quantity: 0.15, unit: 'kg' },
      { id: 'bom_12', menuItemId: 'mnu_saute_creamy_pasta', ingredientId: 'ing_heavy_cream', ingredientName: 'Heavy Cream 36%', quantity: 0.10, unit: 'L' },
      { id: 'bom_13', menuItemId: 'mnu_saute_creamy_pasta', ingredientId: 'ing_parmesan', ingredientName: 'Parmigiano Reggiano', quantity: 0.04, unit: 'kg' },
      { id: 'bom_14', menuItemId: 'mnu_saute_creamy_pasta', ingredientId: 'ing_mushrooms', ingredientName: 'Cremini Mushrooms', quantity: 0.07, unit: 'kg' }
    ]
  },
  {
    id: 'mnu_saute_mushroom_risotto',
    restaurantId: 'rst_rustic_table',
    name: 'Wild Mushroom Pan Risotto',
    category: 'Mains',
    station: 'Saute',
    sellingPrice: 19.00,
    targetCost: 4.60,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_15', menuItemId: 'mnu_saute_mushroom_risotto', ingredientId: 'ing_jasmine_rice', ingredientName: 'Jasmine Rice', quantity: 0.14, unit: 'kg' },
      { id: 'bom_16', menuItemId: 'mnu_saute_mushroom_risotto', ingredientId: 'ing_mushrooms', ingredientName: 'Cremini Mushrooms', quantity: 0.12, unit: 'kg' },
      { id: 'bom_17', menuItemId: 'mnu_saute_mushroom_risotto', ingredientId: 'ing_butter', ingredientName: 'Unsalted Butter', quantity: 0.04, unit: 'kg' },
      { id: 'bom_18', menuItemId: 'mnu_saute_mushroom_risotto', ingredientId: 'ing_parmesan', ingredientName: 'Parmigiano Reggiano', quantity: 0.03, unit: 'kg' }
    ]
  },
  {
    id: 'mnu_saute_tofu_stirfry',
    restaurantId: 'rst_rustic_table',
    name: 'Crispy Garlic Tofu Saute',
    category: 'Plant Based',
    station: 'Saute',
    sellingPrice: 15.00,
    targetCost: 3.10,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_19', menuItemId: 'mnu_saute_tofu_stirfry', ingredientId: 'ing_tofu', ingredientName: 'Organic Firm Tofu', quantity: 0.20, unit: 'kg' },
      { id: 'bom_20', menuItemId: 'mnu_saute_tofu_stirfry', ingredientId: 'ing_onions', ingredientName: 'Yellow Onions', quantity: 0.06, unit: 'kg' },
      { id: 'bom_21', menuItemId: 'mnu_saute_tofu_stirfry', ingredientId: 'ing_kale', ingredientName: 'Tuscan Lacinato Kale', quantity: 0.06, unit: 'kg' },
      { id: 'bom_22', menuItemId: 'mnu_saute_tofu_stirfry', ingredientId: 'ing_olive_oil', ingredientName: 'Extra Virgin Olive Oil', quantity: 0.02, unit: 'L' }
    ]
  },
  {
    id: 'mnu_salad_caesar',
    restaurantId: 'rst_rustic_table',
    name: 'Artisan Caesar Salad',
    category: 'Salads',
    station: 'Garde Manger',
    sellingPrice: 13.50,
    targetCost: 2.90,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_23', menuItemId: 'mnu_salad_caesar', ingredientId: 'ing_romaine', ingredientName: 'Crisp Romaine Lettuce', quantity: 0.16, unit: 'kg' },
      { id: 'bom_24', menuItemId: 'mnu_salad_caesar', ingredientId: 'ing_parmesan', ingredientName: 'Parmigiano Reggiano', quantity: 0.03, unit: 'kg' },
      { id: 'bom_25', menuItemId: 'mnu_salad_caesar', ingredientId: 'ing_eggs', ingredientName: 'Cage-Free Fresh Eggs', quantity: 1, unit: 'pcs' },
      { id: 'bom_26', menuItemId: 'mnu_salad_caesar', ingredientId: 'ing_olive_oil', ingredientName: 'Extra Virgin Olive Oil', quantity: 0.03, unit: 'L' }
    ]
  },
  {
    id: 'mnu_salad_kale_avocado',
    restaurantId: 'rst_rustic_table',
    name: 'Tuscan Kale & Avocado Bowl',
    category: 'Salads',
    station: 'Garde Manger',
    sellingPrice: 14.50,
    targetCost: 3.40,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_27', menuItemId: 'mnu_salad_kale_avocado', ingredientId: 'ing_kale', ingredientName: 'Tuscan Lacinato Kale', quantity: 0.14, unit: 'kg' },
      { id: 'bom_28', menuItemId: 'mnu_salad_kale_avocado', ingredientId: 'ing_avocado', ingredientName: 'Hass Avocados', quantity: 0.08, unit: 'kg' },
      { id: 'bom_29', menuItemId: 'mnu_salad_kale_avocado', ingredientId: 'ing_cherry_tomatoes', ingredientName: 'Heirloom Cherry Tomatoes', quantity: 0.06, unit: 'kg' },
      { id: 'bom_30', menuItemId: 'mnu_salad_kale_avocado', ingredientId: 'ing_olive_oil', ingredientName: 'Extra Virgin Olive Oil', quantity: 0.02, unit: 'L' }
    ]
  },
  {
    id: 'mnu_salad_caprese',
    restaurantId: 'rst_rustic_table',
    name: 'Heirloom Tomato & Burrata Plate',
    category: 'Appetizers',
    station: 'Garde Manger',
    sellingPrice: 15.00,
    targetCost: 4.10,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_31', menuItemId: 'mnu_salad_caprese', ingredientId: 'ing_cherry_tomatoes', ingredientName: 'Heirloom Cherry Tomatoes', quantity: 0.18, unit: 'kg' },
      { id: 'bom_32', menuItemId: 'mnu_salad_caprese', ingredientId: 'ing_heavy_cream', ingredientName: 'Heavy Cream 36%', quantity: 0.05, unit: 'L' },
      { id: 'bom_33', menuItemId: 'mnu_salad_caprese', ingredientId: 'ing_olive_oil', ingredientName: 'Extra Virgin Olive Oil', quantity: 0.02, unit: 'L' }
    ]
  },
  {
    id: 'mnu_bakery_sourdough_loaf',
    restaurantId: 'rst_rustic_table',
    name: 'Country Sourdough Batard',
    category: 'Artisan Breads',
    station: 'Bakery',
    sellingPrice: 8.50,
    targetCost: 1.40,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_34', menuItemId: 'mnu_bakery_sourdough_loaf', ingredientId: 'ing_flour', ingredientName: 'Bread Flour Unbleached', quantity: 0.45, unit: 'kg' },
      { id: 'bom_35', menuItemId: 'mnu_bakery_sourdough_loaf', ingredientId: 'ing_sourdough_starter', ingredientName: 'Active Sourdough Levain', quantity: 0.10, unit: 'kg' }
    ]
  },
  {
    id: 'mnu_bakery_brioche_buns',
    restaurantId: 'rst_rustic_table',
    name: 'Golden Brioche Buns (4-Pack)',
    category: 'Pastry & Buns',
    station: 'Bakery',
    sellingPrice: 7.00,
    targetCost: 1.80,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_36', menuItemId: 'mnu_bakery_brioche_buns', ingredientId: 'ing_flour', ingredientName: 'Bread Flour Unbleached', quantity: 0.35, unit: 'kg' },
      { id: 'bom_37', menuItemId: 'mnu_bakery_brioche_buns', ingredientId: 'ing_butter', ingredientName: 'Unsalted Butter', quantity: 0.08, unit: 'kg' },
      { id: 'bom_38', menuItemId: 'mnu_bakery_brioche_buns', ingredientId: 'ing_eggs', ingredientName: 'Cage-Free Fresh Eggs', quantity: 2, unit: 'pcs' },
      { id: 'bom_39', menuItemId: 'mnu_bakery_brioche_buns', ingredientId: 'ing_cane_sugar', ingredientName: 'Pure Cane Sugar', quantity: 0.03, unit: 'kg' }
    ]
  },
  {
    id: 'mnu_bakery_focaccia',
    restaurantId: 'rst_rustic_table',
    name: 'Rosemary Sea Salt Focaccia',
    category: 'Artisan Breads',
    station: 'Bakery',
    sellingPrice: 9.00,
    targetCost: 1.60,
    isActive: true,
    isDemonstrationData: true,
    ingredients: [
      { id: 'bom_40', menuItemId: 'mnu_bakery_focaccia', ingredientId: 'ing_flour', ingredientName: 'Bread Flour Unbleached', quantity: 0.40, unit: 'kg' },
      { id: 'bom_41', menuItemId: 'mnu_bakery_focaccia', ingredientId: 'ing_olive_oil', ingredientName: 'Extra Virgin Olive Oil', quantity: 0.06, unit: 'L' }
    ]
  }
];

export function generateBenchmarkSalesHistory(): SaleRecord[] {
  const records: SaleRecord[] = [];
  const dishVolumes: Record<string, { weekday: number; weekend: number; rainMod: number }> = {
    mnu_grill_chicken_bowl: { weekday: 38, weekend: 52, rainMod: 0.95 },
    mnu_grill_steak_frites: { weekday: 18, weekend: 32, rainMod: 1.05 },
    mnu_grill_salmon: { weekday: 16, weekend: 26, rainMod: 0.95 },
    mnu_saute_creamy_pasta: { weekday: 22, weekend: 36, rainMod: 1.20 },
    mnu_saute_mushroom_risotto: { weekday: 15, weekend: 25, rainMod: 1.15 },
    mnu_saute_tofu_stirfry: { weekday: 12, weekend: 18, rainMod: 0.98 },
    mnu_salad_caesar: { weekday: 28, weekend: 34, rainMod: 0.80 },
    mnu_salad_kale_avocado: { weekday: 20, weekend: 24, rainMod: 0.78 },
    mnu_salad_caprese: { weekday: 14, weekend: 22, rainMod: 0.82 },
    mnu_bakery_sourdough_loaf: { weekday: 24, weekend: 40, rainMod: 1.05 },
    mnu_bakery_brioche_buns: { weekday: 30, weekend: 45, rainMod: 1.00 },
    mnu_bakery_focaccia: { weekday: 18, weekend: 28, rainMod: 1.05 }
  };

  const today = new Date('2026-11-12T00:00:00Z');
  for (let i = 30; i >= 1; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getUTCDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

    const isRainyDay = (i % 7 === 2) || (i === 11);
    const hasEvent = (i === 6) || (i === 20);

    const weatherCondition = isRainyDay ? 'Rain' : (i % 4 === 0 ? 'Cloudy' : 'Clear');
    const temperatureC = isRainyDay ? 13 : 21;
    const eventTag = hasEvent ? 'Nearby Theater Show' : (dayOfWeek === 5 ? 'Payday Friday' : 'Regular Service');

    BENCHMARK_MENU_ITEMS.forEach(dish => {
      const config = dishVolumes[dish.id] || { weekday: 20, weekend: 30, rainMod: 1.0 };
      const base = isWeekend ? config.weekend : config.weekday;
      const weatherMult = isRainyDay ? config.rainMod : 1.0;
      const eventMult = hasEvent ? 1.18 : 1.0;
      
      const deterministicNoise = (((i * 17 + dish.id.length * 13) % 9) - 4) * 0.03;
      const finalQuantity = Math.max(4, Math.round(base * weatherMult * eventMult * (1 + deterministicNoise)));
      const revenue = Math.round(finalQuantity * dish.sellingPrice * 100) / 100;

      records.push({
        id: `rec_${dateStr}_${dish.id}`,
        restaurantId: 'rst_rustic_table',
        date: dateStr,
        dayOfWeek,
        menuItemId: dish.id,
        dishName: dish.name,
        station: dish.station,
        quantitySold: finalQuantity,
        revenue,
        mealPeriod: 'All Day',
        weatherCondition,
        temperatureC,
        eventTag,
        isDemonstrationData: true
      });
    });
  }

  return records;
}

export const INITIAL_BENCHMARK_SALES = generateBenchmarkSalesHistory();
