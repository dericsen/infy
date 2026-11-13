import { Ingredient, MenuItem, Station, UnitType } from '../types';
import { DishForecastResult } from './forecastingEngine';

export interface DishIngredientBreakdown {
  ingredientId: string;
  ingredientName: string;
  portionQuantity: number;
  portionUnit: UnitType;
  grossInStockUnit: number;
  stockUnit: UnitType;
  unitConversionApplied: boolean;
  unitCompatible: boolean;
  currentStock: number;
  estimatedLineCost: number;
}

export interface DishPrepPlan {
  dishId: string;
  dishName: string;
  category: string;
  station: Station;
  baseForecast: number;
  expectedSales: number;
  recommendedPrep: number;
  effectivePrep: number;
  isOverridden: boolean;
  safetyBufferPct: number;
  riskOfWaste: 'Low' | 'Medium' | 'High';
  rationale: string;
  missingRecipe: boolean;
  ingredientBreakdowns: DishIngredientBreakdown[];
}

export interface AggregatedIngredientRequirement {
  ingredientId: string;
  ingredientName: string;
  category: Ingredient['category'];
  stockUnit: UnitType;
  grossRequired: number;
  currentStock: number;
  safetyStock: number;
  netRequired: number;
  shortageDeficit: number;
  isShortage: boolean;
  belowSafetyAfterPrep: boolean;
  shelfLifeDays: number;
  perishabilityWarning: string | null;
  usedByDishes: Array<{ dishId: string; dishName: string; station: Station; quantity: number }>;
  estimatedGrossCost: number;
}

export interface StationPrepSummary {
  station: Station;
  dishCount: number;
  totalExpectedSales: number;
  totalRecommendedPrep: number;
  totalEffectivePrep: number;
  highRiskCount: number;
}

export interface PrepSheetDecompositionResult {
  businessDate: string;
  dishPlans: DishPrepPlan[];
  aggregatedIngredients: AggregatedIngredientRequirement[];
  stationSummaries: StationPrepSummary[];
  totalPortionsToPrep: number;
  totalShortageIngredients: number;
  totalEstimatedIngredientCost: number;
  recommendations: string[];
}

export function convertQuantityUnit(
  quantity: number,
  fromUnit: UnitType,
  toUnit: UnitType
): { value: number; compatible: boolean; converted: boolean } {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { value: 0, compatible: true, converted: false };
  }
  if (fromUnit === toUnit) {
    return { value: quantity, compatible: true, converted: false };
  }
  if (fromUnit === 'g' && toUnit === 'kg') {
    return { value: quantity / 1000, compatible: true, converted: true };
  }
  if (fromUnit === 'kg' && toUnit === 'g') {
    return { value: quantity * 1000, compatible: true, converted: true };
  }
  if (fromUnit === 'ml' && toUnit === 'L') {
    return { value: quantity / 1000, compatible: true, converted: true };
  }
  if (fromUnit === 'L' && toUnit === 'ml') {
    return { value: quantity * 1000, compatible: true, converted: true };
  }
  return { value: quantity, compatible: false, converted: false };
}

function roundQuantity(val: number): number {
  return Math.round(val * 100) / 100;
}

export function decomposePrepSheet(
  businessDate: string,
  menuItems: MenuItem[],
  ingredients: Ingredient[],
  forecasts: DishForecastResult[],
  overrides: Record<string, number>
): PrepSheetDecompositionResult {
  const ingredientMap = new Map<string, Ingredient>(ingredients.map(i => [i.id, i]));
  const forecastMap = new Map<string, DishForecastResult>(forecasts.map(f => [f.dishId, f]));

  const aggregatedMap = new Map<
    string,
    {
      ingredient: Ingredient;
      grossRequired: number;
      usedByDishes: Array<{ dishId: string; dishName: string; station: Station; quantity: number }>;
    }
  >();

  const dishPlans: DishPrepPlan[] = [];
  const activeMenu = menuItems.filter(m => m.isActive !== false);

  for (const dish of activeMenu) {
    const forecast = forecastMap.get(dish.id);
    const baseForecast = forecast ? forecast.baseStatisticalForecast : 0;
    const expectedSales = forecast ? forecast.expectedSales : 0;
    const recommendedPrep = forecast ? forecast.recommendedPrep : 0;
    const safetyBufferPct = forecast ? forecast.safetyBufferPct : 0.08;
    const overrideVal = overrides[dish.id];
    const hasOverride = typeof overrideVal === 'number' && Number.isFinite(overrideVal) && overrideVal >= 0;
    const effectivePrep = hasOverride ? Math.round(overrideVal) : recommendedPrep;
    const isOverridden = hasOverride && effectivePrep !== recommendedPrep;

    const ingredientBreakdowns: DishIngredientBreakdown[] = [];

    for (const bom of dish.ingredients || []) {
      const rawIng = ingredientMap.get(bom.ingredientId);
      const stockUnit = rawIng ? rawIng.unit : bom.unit;
      const rawGross = bom.quantity * effectivePrep;
      const conversion = convertQuantityUnit(rawGross, bom.unit, stockUnit);
      const grossInStockUnit = roundQuantity(conversion.value);
      const currentStock = rawIng ? rawIng.currentStock : 0;
      const unitCost = rawIng ? rawIng.unitCost : 0;

      ingredientBreakdowns.push({
        ingredientId: bom.ingredientId,
        ingredientName: rawIng ? rawIng.name : bom.ingredientName,
        portionQuantity: bom.quantity,
        portionUnit: bom.unit,
        grossInStockUnit,
        stockUnit,
        unitConversionApplied: conversion.converted,
        unitCompatible: conversion.compatible,
        currentStock,
        estimatedLineCost: roundQuantity(grossInStockUnit * unitCost)
      });

      if (rawIng && conversion.compatible && grossInStockUnit > 0) {
        const existing = aggregatedMap.get(rawIng.id);
        if (existing) {
          existing.grossRequired = roundQuantity(existing.grossRequired + grossInStockUnit);
          existing.usedByDishes.push({
            dishId: dish.id,
            dishName: dish.name,
            station: dish.station,
            quantity: grossInStockUnit
          });
        } else {
          aggregatedMap.set(rawIng.id, {
            ingredient: rawIng,
            grossRequired: grossInStockUnit,
            usedByDishes: [
              {
                dishId: dish.id,
                dishName: dish.name,
                station: dish.station,
                quantity: grossInStockUnit
              }
            ]
          });
        }
      }
    }

    dishPlans.push({
      dishId: dish.id,
      dishName: dish.name,
      category: dish.category,
      station: dish.station,
      baseForecast,
      expectedSales,
      recommendedPrep,
      effectivePrep,
      isOverridden,
      safetyBufferPct,
      riskOfWaste: forecast ? forecast.riskOfWaste : 'Low',
      rationale: forecast ? forecast.rationale : 'No historical forecast available.',
      missingRecipe: !dish.ingredients || dish.ingredients.length === 0,
      ingredientBreakdowns
    });
  }

  const aggregatedIngredients: AggregatedIngredientRequirement[] = Array.from(aggregatedMap.values())
    .map(entry => {
      const { ingredient, grossRequired, usedByDishes } = entry;
      const netRequired = Math.max(0, roundQuantity(grossRequired - ingredient.currentStock));
      const shortageDeficit = netRequired;
      const isShortage = ingredient.currentStock < grossRequired;
      const remainingAfterPrep = roundQuantity(ingredient.currentStock - grossRequired);
      const belowSafetyAfterPrep = !isShortage && remainingAfterPrep < ingredient.safetyStock;

      let perishabilityWarning: string | null = null;
      if (ingredient.shelfLifeDays <= 2) {
        perishabilityWarning = `${ingredient.shelfLifeDays}-day shelf life: prep strictly to batch par to avoid spoilage.`;
      } else if (ingredient.shelfLifeDays <= 3 && grossRequired > 0) {
        perishabilityWarning = `Short ${ingredient.shelfLifeDays}-day window: prioritize FIFO rotation.`;
      }

      return {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category,
        stockUnit: ingredient.unit,
        grossRequired,
        currentStock: ingredient.currentStock,
        safetyStock: ingredient.safetyStock,
        netRequired,
        shortageDeficit,
        isShortage,
        belowSafetyAfterPrep,
        shelfLifeDays: ingredient.shelfLifeDays,
        perishabilityWarning,
        usedByDishes,
        estimatedGrossCost: roundQuantity(grossRequired * ingredient.unitCost)
      };
    })
    .sort((a, b) => {
      if (a.isShortage !== b.isShortage) return a.isShortage ? -1 : 1;
      return b.netRequired - a.netRequired || b.grossRequired - a.grossRequired;
    });

  const stations: Station[] = ['Grill', 'Saute', 'Garde Manger', 'Bakery'];
  const stationSummaries: StationPrepSummary[] = stations.map(station => {
    const stationDishes = dishPlans.filter(d => d.station === station);
    return {
      station,
      dishCount: stationDishes.length,
      totalExpectedSales: stationDishes.reduce((s, d) => s + d.expectedSales, 0),
      totalRecommendedPrep: stationDishes.reduce((s, d) => s + d.recommendedPrep, 0),
      totalEffectivePrep: stationDishes.reduce((s, d) => s + d.effectivePrep, 0),
      highRiskCount: stationDishes.filter(d => d.riskOfWaste === 'High').length
    };
  });

  const totalPortionsToPrep = dishPlans.reduce((s, d) => s + d.effectivePrep, 0);
  const totalShortageIngredients = aggregatedIngredients.filter(i => i.isShortage).length;
  const totalEstimatedIngredientCost = roundQuantity(
    aggregatedIngredients.reduce((s, i) => s + i.estimatedGrossCost, 0)
  );

  const recommendations: string[] = [];
  if (totalShortageIngredients > 0) {
    const topShortages = aggregatedIngredients
      .filter(i => i.isShortage)
      .slice(0, 3)
      .map(i => `${i.ingredientName} (${i.netRequired} ${i.stockUnit} short)`)
      .join(', ');
    recommendations.push(`Morning purchasing alert: ${totalShortageIngredients} ingredient(s) short of full prep par (${topShortages}).`);
  }

  const shortShelfLifeItems = aggregatedIngredients.filter(i => i.shelfLifeDays <= 2 && i.grossRequired > 0);
  if (shortShelfLifeItems.length > 0) {
    recommendations.push(
      `Stage ${shortShelfLifeItems.map(i => i.ingredientName).join(', ')} in two smaller split batches due to <= 2-day shelf life.`
    );
  }

  const missingRecipeDishes = dishPlans.filter(d => d.missingRecipe);
  if (missingRecipeDishes.length > 0) {
    recommendations.push(
      `${missingRecipeDishes.length} active dish(es) lack recipe BOM ingredients and are excluded from raw stock calculations.`
    );
  }

  if (recommendations.length === 0 && totalPortionsToPrep > 0) {
    recommendations.push('All projected ingredient requirements are covered by current walk-in and dry storage stock.');
  }

  return {
    businessDate,
    dishPlans,
    aggregatedIngredients,
    stationSummaries,
    totalPortionsToPrep,
    totalShortageIngredients,
    totalEstimatedIngredientCost,
    recommendations
  };
}
