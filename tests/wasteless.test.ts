import { describe, it, expect, beforeEach } from 'vitest';
import { areUnitsCompatible, convertQuantity } from '../src/engine/unitConversion';
import {
  evaluateDataSufficiency,
  generateComprehensiveForecast,
  evaluateBacktestMetrics,
  extractDishesFromSales,
  generateMultiDayForecast,
  suggestForecastStartDate
} from '../src/engine/forecastingEngine';
import * as XLSX from 'xlsx';
import {
  parseUploadedSalesCsv,
  parseUploadedExcelWorkbook,
  generateSampleMultiYearCsv,
  buildSampleMultiYearWorkbook
} from '../src/utils/salesCsv';
import { generatePreparationRecommendations } from '../src/engine/recommendationEngine';
import {
  initializeDatabaseIfEmpty,
  resetDatabaseToBenchmark,
  PrepChecklistRepository,
  PrepOverrideRepository,
  IngredientRepository,
  SettingsRepository
} from '../src/db/repositories';
import {
  BENCHMARK_MENU_ITEMS,
  BENCHMARK_INGREDIENTS,
  INITIAL_BENCHMARK_SALES,
  DEFAULT_APP_SETTINGS
} from '../src/data/benchmarkData';
import { requestContextualForecast } from '../src/services/contextualForecastService';
import { MenuItem } from '../src/types';

describe('Unit Conversion Engine', () => {
  it('converts compatible metric mass and volume units accurately', () => {
    expect(areUnitsCompatible('g', 'kg')).toBe(true);
    expect(areUnitsCompatible('ml', 'L')).toBe(true);
    expect(areUnitsCompatible('kg', 'L')).toBe(false);

    const gToKg = convertQuantity(250, 'g', 'kg');
    expect(gToKg.compatible).toBe(true);
    expect(gToKg.value).toBe(0.25);

    const mlToL = convertQuantity(500, 'ml', 'L');
    expect(mlToL.compatible).toBe(true);
    expect(mlToL.value).toBe(0.5);
  });

  it('rejects incompatible measurement units cleanly', () => {
    const invalid = convertQuantity(2, 'pcs', 'kg');
    expect(invalid.compatible).toBe(false);
    expect(invalid.error).toContain('Incompatible measurement units');
  });
});

describe('Forecasting Engine', () => {
  const salmonDish = BENCHMARK_MENU_ITEMS.find(m => m.id === 'mnu_grill_salmon')!;

  it('evaluates optimal data sufficiency for 30-day benchmark history', () => {
    const sufficiency = evaluateDataSufficiency(INITIAL_BENCHMARK_SALES, salmonDish.id, '2026-11-13');
    expect(sufficiency.status).toBe('optimal');
    expect(sufficiency.isSufficient).toBe(true);
    expect(sufficiency.totalDays).toBeGreaterThanOrEqual(28);
  });

  it('prevents future data leakage when forecasting earlier target dates', () => {
    const baseRun = generateComprehensiveForecast(
      salmonDish,
      INITIAL_BENCHMARK_SALES,
      '2026-11-06',
      { condition: 'Clear', temperatureC: 20, precipChance: 10 },
      'Regular Service'
    );

    const pollutedSales = [
      ...INITIAL_BENCHMARK_SALES,
      {
        ...INITIAL_BENCHMARK_SALES[0],
        id: 'future_spike_leak_test',
        date: '2026-11-08',
        dayOfWeek: new Date('2026-11-08').getDay(),
        menuItemId: salmonDish.id,
        quantitySold: 999
      }
    ];

    const leakedRun = generateComprehensiveForecast(
      salmonDish,
      pollutedSales,
      '2026-11-06',
      { condition: 'Clear', temperatureC: 20, precipChance: 10 },
      'Regular Service'
    );

    expect(leakedRun.baseStatisticalForecast).toBe(baseRun.baseStatisticalForecast);
    expect(leakedRun.expectedSales).toBe(baseRun.expectedSales);
  });

  it('bounds Gemini AI adjustment multipliers strictly within configured ±15% safety rails', () => {
    const highSuggested = generateComprehensiveForecast(
      salmonDish,
      INITIAL_BENCHMARK_SALES,
      '2026-11-13',
      { condition: 'Clear', temperatureC: 20, precipChance: 10 },
      'Festival',
      {
        settings: { ...DEFAULT_APP_SETTINGS, aiAdjustmentLimitPct: 15 },
        geminiAdjustment: {
          dishId: salmonDish.id,
          suggestedMultiplier: 0.85,
          rationale: 'Extreme spike test',
          riskOfWaste: 'Medium'
        }
      }
    );

    expect(highSuggested.adjustmentSource).toBe('gemini');
    expect(highSuggested.clampedModifierPct).toBe(0.15);

    const lowSuggested = generateComprehensiveForecast(
      salmonDish,
      INITIAL_BENCHMARK_SALES,
      '2026-11-13',
      { condition: 'Storm', temperatureC: 6, precipChance: 90 },
      'Storm',
      {
        settings: { ...DEFAULT_APP_SETTINGS, aiAdjustmentLimitPct: 15 },
        geminiAdjustment: {
          dishId: salmonDish.id,
          suggestedMultiplier: -0.65,
          rationale: 'Extreme drop test',
          riskOfWaste: 'High'
        }
      }
    );

    expect(lowSuggested.clampedModifierPct).toBe(-0.15);
  });

  it('produces zero expected sales and zero prep on closed restaurant days', () => {
    const closedResult = generateComprehensiveForecast(
      salmonDish,
      INITIAL_BENCHMARK_SALES,
      '2026-11-13',
      { condition: 'Clear', temperatureC: 20, precipChance: 0 },
      'Holiday',
      {
        closedDays: [{ id: 'closed_1', restaurantId: 'rst_rustic_table', date: '2026-11-13', reason: 'Thanksgiving' }],
        settings: DEFAULT_APP_SETTINGS
      }
    );

    expect(closedResult.isClosedDay).toBe(true);
    expect(closedResult.expectedSales).toBe(0);
    expect(closedResult.recommendedPrep).toBe(0);
    expect(closedResult.adjustmentSource).toBe('closed');
  });

  it('evaluates backtest accuracy metrics without crashing', () => {
    const metrics = evaluateBacktestMetrics(INITIAL_BENCHMARK_SALES, salmonDish.id, salmonDish.name, 14);
    expect(metrics.evaluatedDaysCount).toBe(14);
    expect(metrics.wmaMae).toBeGreaterThanOrEqual(0);
    expect(metrics.wmaMape).toBeGreaterThanOrEqual(0);
  });
});

describe('Upload-to-Forecast Multi-Year & Multi-Day Pipeline', () => {
  it('parses semicolon Indonesian/European CSVs with DD/MM/YYYY dates and auto-discovers custom dishes', () => {
    const customCsv = [
      'tanggal;menu;terjual;omzet',
      '10/11/2026;Nasi Goreng Kampung;42;1260',
      '11/11/2026;Nasi Goreng Kampung;38;1140',
      '12/11/2026;Nasi Goreng Kampung;45;1350',
      '12/11/2026;Es Teh Manis;60;300'
    ].join('\n');

    const parsed = parseUploadedSalesCsv(customCsv, []);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.validRecords.length).toBe(4);
    expect(parsed.minDate).toBe('2026-11-10');
    expect(parsed.maxDate).toBe('2026-11-12');
    expect(parsed.detectedDishes).toContain('Nasi Goreng Kampung');

    const startDate = suggestForecastStartDate(parsed.validRecords);
    expect(startDate).toBe('2026-11-13');

    const dishes = extractDishesFromSales(parsed.validRecords, []);
    expect(dishes.length).toBe(2);

    const bundle = generateMultiDayForecast({
      dishes,
      salesRecords: parsed.validRecords,
      startDate,
      horizonDays: 7,
      weather: { condition: 'Clear', temperatureC: 24, precipChance: 10 },
      eventContext: 'Regular Service',
      closedDays: [],
      settings: DEFAULT_APP_SETTINGS
    });

    expect(bundle.days.length).toBe(7);
    expect(bundle.days[0].date).toBe('2026-11-13');
    expect(bundle.dishMatrices.length).toBe(2);
    expect(bundle.totalExpectedPortions).toBeGreaterThan(0);
  });

  it('parses 2-year sample CSV and applies multi-year seasonal forecasting across upcoming 7 days', () => {
    const sampleCsv = generateSampleMultiYearCsv('2026-11-12');
    const parsed = parseUploadedSalesCsv(sampleCsv, []);
    expect(parsed.validRecords.length).toBe(730 * 5);
    expect(parsed.maxDate).toBe('2026-11-12');

    const dishes = extractDishesFromSales(parsed.validRecords, []);
    const bundle = generateMultiDayForecast({
      dishes,
      salesRecords: parsed.validRecords,
      startDate: suggestForecastStartDate(parsed.validRecords),
      horizonDays: 7,
      weather: { condition: 'Clear', temperatureC: 20, precipChance: 10 },
      eventContext: 'Regular Service',
      closedDays: [],
      settings: DEFAULT_APP_SETTINGS
    });

    expect(bundle.days.length).toBe(7);
    expect(bundle.dishMatrices[0].yearsCovered).toBeGreaterThanOrEqual(2);
    expect(bundle.dishMatrices[0].dailyResults[0].seasonalModifierPct).not.toBeUndefined();
  });

  it('builds and parses multi-year Excel (.xlsx) workbook accurately', () => {
    const wb = buildSampleMultiYearWorkbook('2026-11-12');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const parsed = parseUploadedExcelWorkbook(out, []);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.validRecords.length).toBe(730 * 5);
    expect(parsed.minDate).toBe('2024-11-13');
    expect(parsed.maxDate).toBe('2026-11-12');
    expect(parsed.detectedDishes).toContain('Nasi Goreng Kampung');
  });
});

describe('Deterministic Recommendation Engine', () => {
  it('computes aggregated gross, available, net required, and post-prep surplus across shared ingredients', () => {
    const testDishA: MenuItem = {
      id: 'dish_a',
      restaurantId: 'rst_rustic_table',
      name: 'Dish A',
      category: 'Mains',
      station: 'Grill',
      sellingPrice: 20,
      targetCost: 6,
      isActive: true,
      ingredients: [
        { id: 'b1', menuItemId: 'dish_a', ingredientId: 'ing_shared', ingredientName: 'Shared Olive Oil', quantity: 250, unit: 'ml' }
      ]
    };

    const testDishB: MenuItem = {
      id: 'dish_b',
      restaurantId: 'rst_rustic_table',
      name: 'Dish B',
      category: 'Mains',
      station: 'Saute',
      sellingPrice: 18,
      targetCost: 5,
      isActive: true,
      ingredients: [
        { id: 'b2', menuItemId: 'dish_b', ingredientId: 'ing_shared', ingredientName: 'Shared Olive Oil', quantity: 0.5, unit: 'L' }
      ]
    };

    const testDishNoRecipe: MenuItem = {
      id: 'dish_no_bom',
      restaurantId: 'rst_rustic_table',
      name: 'Special Soup',
      category: 'Soup',
      station: 'Saute',
      sellingPrice: 12,
      targetCost: 3,
      isActive: true,
      ingredients: []
    };

    const forecasts = [testDishA, testDishB, testDishNoRecipe].map(d =>
      generateComprehensiveForecast(
        d,
        [],
        '2026-11-13',
        { condition: 'Clear', temperatureC: 20, precipChance: 0 },
        'Regular Service',
        { settings: DEFAULT_APP_SETTINGS }
      )
    );

    const bundle = generatePreparationRecommendations({
      prepSheetId: 'prep_test_1',
      businessDate: '2026-11-13',
      shift: 'All Day',
      forecasts,
      menuItems: [testDishA, testDishB, testDishNoRecipe],
      ingredients: [
        {
          id: 'ing_shared',
          restaurantId: 'rst_rustic_table',
          name: 'Shared Olive Oil',
          category: 'Pantry',
          unit: 'L',
          unitCost: 9,
          currentStock: 10,
          safetyStock: 5,
          shelfLifeDays: 60,
          expirationDate: '2026-11-14'
        }
      ],
      overrides: { dish_a: 20, dish_b: 10 }
    });

    const summary = bundle.ingredientSummaries.find(s => s.ingredientId === 'ing_shared')!;
    expect(summary.grossRequired).toBe(10);
    expect(summary.availableStock).toBe(10);
    expect(summary.netRequired).toBe(0);
    expect(summary.surplusAfterPrep).toBe(0);
    expect(summary.sharedAcrossDishes).toEqual(['Dish A', 'Dish B']);
    expect(summary.isExpiringSoon).toBe(true);
    expect(bundle.missingRecipesCount).toBe(1);

    const shortageBundle = generatePreparationRecommendations({
      prepSheetId: 'prep_test_2',
      businessDate: '2026-11-13',
      shift: 'All Day',
      forecasts,
      menuItems: [testDishA, testDishB],
      ingredients: [
        {
          id: 'ing_shared',
          restaurantId: 'rst_rustic_table',
          name: 'Shared Olive Oil',
          category: 'Pantry',
          unit: 'L',
          unitCost: 9,
          currentStock: 4,
          safetyStock: 5,
          shelfLifeDays: 60
        }
      ],
      overrides: { dish_a: 20, dish_b: 10 }
    });

    const shortageSummary = shortageBundle.ingredientSummaries.find(s => s.ingredientId === 'ing_shared')!;
    expect(shortageSummary.grossRequired).toBe(10);
    expect(shortageSummary.netRequired).toBe(6);
    expect(shortageSummary.isShortage).toBe(true);
    expect(shortageBundle.totalShortagesCount).toBe(1);
  });
});

describe('Repository Persistence & Prep Checklist Isolation', () => {
  beforeEach(async () => {
    await resetDatabaseToBenchmark();
  });

  it('seeds benchmark records into IndexedDB fallback stores and persists updates', async () => {
    const initial = await initializeDatabaseIfEmpty();
    expect(initial.menuItems.length).toBe(12);
    expect(initial.ingredients.length).toBe(20);
    expect(initial.settings.aiAdjustmentLimitPct).toBe(15);

    const updatedIng = { ...BENCHMARK_INGREDIENTS[0], currentStock: 99 };
    await IngredientRepository.save(updatedIng);
    const list = await IngredientRepository.list();
    expect(list.find(i => i.id === updatedIng.id)?.currentStock).toBe(99);

    await SettingsRepository.save({ ...DEFAULT_APP_SETTINGS, aiAdjustmentLimitPct: 20 });
    const loadedSettings = await SettingsRepository.get('rst_rustic_table');
    expect(loadedSettings.aiAdjustmentLimitPct).toBe(20);
  });

  it('isolates prep checklist items and overrides strictly by prepSheetId', async () => {
    const sheetA = 'prep_2026-11-13_AllDay_r1';
    const sheetB = 'prep_2026-11-13_AllDay_r2';

    await PrepChecklistRepository.saveItem({
      id: `${sheetA}_mnu_grill_salmon`,
      prepSheetId: sheetA,
      businessDate: '2026-11-13',
      station: 'Grill',
      taskId: 'mnu_grill_salmon',
      isCompleted: true,
      completedAt: '2026-11-13T08:00:00Z',
      completedBy: 'Chef Marco',
      isDemonstrationData: false
    });

    await PrepOverrideRepository.saveForPrepSheet(sheetA, { mnu_grill_salmon: 45 });

    const listA = await PrepChecklistRepository.listByPrepSheet(sheetA);
    const listB = await PrepChecklistRepository.listByPrepSheet(sheetB);
    const ovA = await PrepOverrideRepository.getByPrepSheet(sheetA);
    const ovB = await PrepOverrideRepository.getByPrepSheet(sheetB);

    expect(listA.length).toBe(1);
    expect(listA[0].isCompleted).toBe(true);
    expect(listB.length).toBe(0);
    expect(ovA.mnu_grill_salmon).toBe(45);
    expect(ovB.mnu_grill_salmon).toBeUndefined();
  });
});

describe('Contextual Forecast Service Fallback', () => {
  it('returns deterministic fallback result immediately when offline mode is active', async () => {
    const forecasts = BENCHMARK_MENU_ITEMS.map(d =>
      generateComprehensiveForecast(
        d,
        INITIAL_BENCHMARK_SALES,
        '2026-11-13',
        { condition: 'Rain', temperatureC: 13, precipChance: 70 },
        'Regular Service',
        { settings: DEFAULT_APP_SETTINGS }
      )
    );

    const res = await requestContextualForecast({
      targetDate: '2026-11-13',
      weatherForecast: { condition: 'Rain', temperatureC: 13, precipitationProbability: 70 },
      eventContext: 'Regular Service',
      adjustmentLimitPct: 15,
      menuItems: BENCHMARK_MENU_ITEMS,
      statisticalForecasts: forecasts,
      simulateOffline: true
    });

    expect(res.isFallback).toBe(true);
    expect(res.adjustments.length).toBe(0);
    expect(res.modelVersion).toBe('statistical-fallback');
  });
});
