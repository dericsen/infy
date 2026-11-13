import {
  MenuItem,
  Ingredient,
  DishIngredientBreakdown,
  DishPreparationRecommendation,
  IngredientProcurementSummary,
  PrepSheetRecommendationBundle
} from '../types';
import { DishForecastResult } from './forecastingEngine';
import { convertQuantity } from './unitConversion';

function getDaysUntilExpiration(expirationDate: string | undefined, businessDate: string): number | null {
  if (!expirationDate) return null;
  const exp = new Date(expirationDate);
  const biz = new Date(businessDate);
  if (Number.isNaN(exp.getTime()) || Number.isNaN(biz.getTime())) return null;
  const diffMs = exp.getTime() - biz.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function generatePreparationRecommendations(params: {
  prepSheetId: string;
  businessDate: string;
  shift: 'All Day' | 'Lunch' | 'Dinner';
  forecasts: DishForecastResult[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  overrides: Record<string, number>;
}): PrepSheetRecommendationBundle {
  const { prepSheetId, businessDate, shift, forecasts, menuItems, ingredients, overrides } = params;

  const isClosedDay = forecasts.length > 0 && forecasts.every(f => f.isClosedDay);
  const ingredientMap = new Map<string, Ingredient>(ingredients.map(i => [i.id, i]));

  const grossAccumulator = new Map<string, { gross: number; dishes: Set<string>; hasUnitWarning: boolean; warningMsg?: string }>();
  const itemRecommendations: DishPreparationRecommendation[] = [];

  let totalPredictedPortions = 0;
  let totalRecommendedPrep = 0;
  let missingRecipesCount = 0;

  for (const dish of menuItems) {
    if (!dish.isActive) continue;

    const forecast = forecasts.find(f => f.dishId === dish.id);
    const predictedPortions = forecast ? forecast.expectedSales : 0;
    const recommendedPrep = forecast ? forecast.recommendedPrep : 0;
    const overrideVal = overrides[dish.id];
    const effectivePrep = isClosedDay
      ? 0
      : overrideVal !== undefined && Number.isFinite(overrideVal)
      ? Math.max(0, Math.round(overrideVal))
      : recommendedPrep;

    const isOverridden = !isClosedDay && overrideVal !== undefined && overrideVal !== recommendedPrep;

    totalPredictedPortions += predictedPortions;
    totalRecommendedPrep += effectivePrep;

    const hasRecipe = Array.isArray(dish.ingredients) && dish.ingredients.length > 0;
    let missingRecipeWarning: string | undefined;
    if (!hasRecipe) {
      missingRecipeWarning = 'Missing recipe BOM: attach raw ingredients in Menu Management to compute prep quantities.';
      missingRecipesCount += 1;
    }

    const breakdown: DishIngredientBreakdown[] = [];
    let dishHasUnitWarning = false;

    for (const bom of dish.ingredients) {
      const stockIng = ingredientMap.get(bom.ingredientId);
      if (!stockIng) {
        dishHasUnitWarning = true;
        breakdown.push({
          ingredientId: bom.ingredientId,
          ingredientName: bom.ingredientName,
          portionQuantity: bom.quantity,
          portionUnit: bom.unit,
          convertedPerPortion: 0,
          stockUnit: bom.unit,
          grossForDish: 0,
          currentStock: 0,
          unitCompatible: false,
          compatibilityWarning: `Ingredient "${bom.ingredientName}" missing from ingredient catalog.`
        });
        continue;
      }

      const conversion = convertQuantity(bom.quantity, bom.unit, stockIng.unit);
      if (!conversion.compatible) {
        dishHasUnitWarning = true;
        breakdown.push({
          ingredientId: stockIng.id,
          ingredientName: stockIng.name,
          portionQuantity: bom.quantity,
          portionUnit: bom.unit,
          convertedPerPortion: 0,
          stockUnit: stockIng.unit,
          grossForDish: 0,
          currentStock: stockIng.currentStock,
          unitCompatible: false,
          compatibilityWarning: conversion.error
        });

        const acc = grossAccumulator.get(stockIng.id) || {
          gross: 0,
          dishes: new Set<string>(),
          hasUnitWarning: false
        };
        acc.dishes.add(dish.name);
        acc.hasUnitWarning = true;
        acc.warningMsg = conversion.error;
        grossAccumulator.set(stockIng.id, acc);
        continue;
      }

      const grossForDish = Math.round(conversion.value * effectivePrep * 1000) / 1000;
      breakdown.push({
        ingredientId: stockIng.id,
        ingredientName: stockIng.name,
        portionQuantity: bom.quantity,
        portionUnit: bom.unit,
        convertedPerPortion: conversion.value,
        stockUnit: stockIng.unit,
        grossForDish,
        currentStock: stockIng.currentStock,
        unitCompatible: true
      });

      const acc = grossAccumulator.get(stockIng.id) || {
        gross: 0,
        dishes: new Set<string>(),
        hasUnitWarning: false
      };
      acc.gross = Math.round((acc.gross + grossForDish) * 1000) / 1000;
      acc.dishes.add(dish.name);
      grossAccumulator.set(stockIng.id, acc);
    }

    const dishHasShortage = breakdown.some(b => b.unitCompatible && b.grossForDish > b.currentStock);

    const reasoningParts: string[] = [];
    if (forecast) {
      reasoningParts.push(forecast.rationale);
    }
    if (isOverridden) {
      reasoningParts.push(`Chef manual override adjusted prep from ${recommendedPrep} to ${effectivePrep} portions.`);
    }
    if (dishHasShortage) {
      reasoningParts.push('One or more raw ingredients have insufficient on-hand inventory.');
    }

    itemRecommendations.push({
      menuItemId: dish.id,
      dishName: dish.name,
      station: dish.station,
      category: dish.category,
      predictedPortions,
      recommendedPrep,
      effectivePrep,
      isOverridden,
      safetyBufferPct: forecast ? forecast.safetyBufferPct : 0.08,
      confidenceInterval80: forecast ? forecast.confidenceInterval80 : [predictedPortions, predictedPortions],
      dataStatus: forecast?.isClosedDay ? 'closed' : (forecast?.dataSufficiency.status || 'insufficient'),
      riskOfWaste: forecast?.riskOfWaste || 'Medium',
      prepInstructions: dish.prepInstructions,
      missingRecipeWarning,
      reasoning: reasoningParts.join(' '),
      ingredients: breakdown,
      hasShortage: dishHasShortage,
      hasUnitWarning: dishHasUnitWarning
    });
  }

  const ingredientSummaries: IngredientProcurementSummary[] = [];
  let totalShortagesCount = 0;
  let expiringSoonCount = 0;

  for (const ing of ingredients) {
    const usage = grossAccumulator.get(ing.id);
    if (!usage && ing.currentStock >= ing.safetyStock) {
      const daysToExp = getDaysUntilExpiration(ing.expirationDate, businessDate);
      if (daysToExp !== null && daysToExp <= 2) {
        expiringSoonCount += 1;
      }
      continue;
    }

    const grossRequired = usage ? Math.round(usage.gross * 100) / 100 : 0;
    const availableStock = Math.round(ing.currentStock * 100) / 100;
    const netRequired = Math.max(0, Math.round((grossRequired - availableStock) * 100) / 100);
    const surplusAfterPrep = Math.max(0, Math.round((availableStock - grossRequired) * 100) / 100);

    const isShortage = netRequired > 0;
    const isLowStock = surplusAfterPrep < ing.safetyStock;
    const daysToExp = getDaysUntilExpiration(ing.expirationDate, businessDate);
    const isExpired = daysToExp !== null && daysToExp <= 0;
    const isExpiringSoon = daysToExp !== null && daysToExp <= 2;

    if (isShortage) totalShortagesCount += 1;
    if (isExpiringSoon) expiringSoonCount += 1;

    const hasUnitWarning = Boolean(usage?.hasUnitWarning);
    let procurementAction: IngredientProcurementSummary['procurementAction'] = 'Sufficient — Do Not Order';
    if (hasUnitWarning) {
      procurementAction = 'Unit Mismatch — Verify Recipe';
    } else if (isShortage) {
      procurementAction = 'Shortage — Procure / Prep Net Qty';
    } else if (isExpiringSoon) {
      procurementAction = 'Expiring Soon — Prioritize Use';
    }

    ingredientSummaries.push({
      ingredientId: ing.id,
      ingredientName: ing.name,
      category: ing.category,
      stockUnit: ing.unit,
      grossRequired,
      availableStock,
      safetyStock: ing.safetyStock,
      netRequired,
      surplusAfterPrep,
      isShortage,
      isLowStock,
      isExpiringSoon,
      isExpired,
      shelfLifeDays: ing.shelfLifeDays,
      expirationDate: ing.expirationDate,
      sharedAcrossDishes: usage ? Array.from(usage.dishes) : [],
      hasUnitWarning,
      unitWarningMessage: usage?.warningMsg,
      procurementAction
    });
  }

  ingredientSummaries.sort((a, b) => {
    if (a.isShortage !== b.isShortage) return a.isShortage ? -1 : 1;
    if (a.isExpiringSoon !== b.isExpiringSoon) return a.isExpiringSoon ? -1 : 1;
    return b.grossRequired - a.grossRequired;
  });

  return {
    prepSheetId,
    businessDate,
    shift,
    isClosedDay,
    itemRecommendations,
    ingredientSummaries,
    totalPredictedPortions,
    totalRecommendedPrep,
    totalShortagesCount,
    missingRecipesCount,
    expiringSoonCount
  };
}
