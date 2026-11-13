import {
  ForecastConfig,
  Ingredient,
  MenuItem,
  PredictionRecord,
  SaleRecord,
  Station,
  WasteRecord
} from '../types';
import {
  addDaysIso,
  DishForecastResult,
  generateComprehensiveForecast
} from './forecastingEngine';

export interface StationMetric {
  station: Station;
  dishesCount: number;
  expectedPortions: number;
  prepPortions: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface RiskDishMetric {
  dishId: string;
  name: string;
  station: Station;
  reason: string;
  riskLevel: 'High' | 'Medium';
  minIngredientShelfLifeDays: number;
  recentWasteLoss: number;
}

export interface DailySalesPoint {
  date: string;
  portions: number;
  revenue: number;
}

export interface DailyWastePoint {
  date: string;
  lossCost: number;
  portions: number;
}

export interface ForecastVsActualPoint {
  date: string;
  predictedPortions: number;
  actualPortions: number;
  variancePct: number;
}

export interface DashboardAnalytics {
  forecasts: DishForecastResult[];
  usingSavedPrediction: boolean;
  predictionModelLabel: string;
  totalExpectedSales: number;
  totalRecommendedPrep: number;
  bufferPortions: number;
  demandChangeVsLastWeekPct: number | null;
  lastWeekSameDayPortions: number;
  avgDailyWasteCost: number;
  totalWasteCost: number;
  wastePctOfRevenue: number;
  wasteCountDays: number;
  deficitIngredients: Ingredient[];
  stationMetrics: StationMetric[];
  highRiskDishes: RiskDishMetric[];
  dailySalesSeries: DailySalesPoint[];
  dailyWasteSeries: DailyWastePoint[];
  forecastVsActual: ForecastVsActualPoint[];
  distinctHistoryDays: number;
  avgDataSufficiencyPct: number;
  overproductionSharePct: number;
}

export function computeDashboardAnalytics(params: {
  businessDate: string;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  salesRecords: SaleRecord[];
  wasteRecords: WasteRecord[];
  predictions: PredictionRecord[];
  forecastConfig: ForecastConfig;
}): DashboardAnalytics {
  const {
    businessDate,
    menuItems,
    ingredients,
    salesRecords,
    wasteRecords,
    predictions,
    forecastConfig
  } = params;

  const activeDishes = menuItems.filter(m => m.isActive !== false);
  const savedForDate = predictions.find(p => p.targetDate === businessDate) || null;
  const ingMap = new Map(ingredients.map(i => [i.id, i]));

  const forecasts: DishForecastResult[] = activeDishes.map(dish => {
    const savedItem = savedForDate?.itemPredictions.find(ip => ip.menuItemId === dish.id);
    if (savedItem && savedForDate) {
      const denom = Math.max(1, savedItem.baseCalculated);
      const savedAdj = savedItem.aiAdjusted > 0
        ? {
            dishId: dish.id,
            suggestedMultiplier: (savedItem.aiAdjusted - savedItem.baseCalculated) / denom,
            clampedMultiplier: (savedItem.aiAdjusted - savedItem.baseCalculated) / denom,
            rationale: savedItem.rationale,
            riskOfWaste: savedItem.riskOfWaste
          }
        : undefined;

      return generateComprehensiveForecast(
        dish,
        salesRecords,
        businessDate,
        {
          condition: savedForDate.weatherForecast.condition,
          temperatureC: savedForDate.weatherForecast.temperatureC,
          precipChance: savedForDate.weatherForecast.precipitationProbability
        },
        savedForDate.eventContext,
        forecastConfig,
        savedForDate.isOfflineFallback ? undefined : savedAdj
      );
    }

    return generateComprehensiveForecast(
      dish,
      salesRecords,
      businessDate,
      { condition: 'Clear', temperatureC: 20, precipChance: 10 },
      'Regular Service',
      forecastConfig
    );
  });

  const totalExpectedSales = forecasts.reduce((s, f) => s + f.expectedSales, 0);
  const totalRecommendedPrep = forecasts.reduce((s, f) => s + f.recommendedPrep, 0);
  const bufferPortions = totalRecommendedPrep - totalExpectedSales;

  const sevenDaysAgo = addDaysIso(businessDate, -7);
  const lastWeekRecords = salesRecords.filter(r => r.date === sevenDaysAgo);
  const lastWeekSameDayPortions = lastWeekRecords.reduce((s, r) => s + r.quantitySold, 0);
  const demandChangeVsLastWeekPct = lastWeekSameDayPortions > 0
    ? Math.round(((totalExpectedSales - lastWeekSameDayPortions) / lastWeekSameDayPortions) * 1000) / 10
    : null;

  const totalWasteCost = Math.round(wasteRecords.reduce((s, w) => s + w.totalLossCost, 0) * 100) / 100;
  const distinctWasteDates = Array.from(new Set(wasteRecords.map(w => w.date))).sort();
  const wasteCountDays = distinctWasteDates.length;
  const avgDailyWasteCost = wasteCountDays > 0
    ? Math.round((totalWasteCost / wasteCountDays) * 100) / 100
    : 0;

  const totalSalesRevenue = salesRecords.reduce((s, r) => s + r.revenue, 0);
  const wastePctOfRevenue = totalSalesRevenue > 0
    ? Math.round((totalWasteCost / totalSalesRevenue) * 10000) / 100
    : 0;

  const overproductionLoss = wasteRecords
    .filter(w => w.reason === 'Overproduction')
    .reduce((s, w) => s + w.totalLossCost, 0);
  const overproductionSharePct = totalWasteCost > 0
    ? Math.round((overproductionLoss / totalWasteCost) * 100)
    : 0;

  const deficitIngredients = ingredients.filter(i => i.currentStock < i.safetyStock);

  const stations: Station[] = ['Grill', 'Saute', 'Garde Manger', 'Bakery'];
  const stationMetrics: StationMetric[] = stations.map(station => {
    const stationDishes = activeDishes.filter(d => d.station === station);
    const stationForecasts = forecasts.filter(f => f.station === station);
    const expectedPortions = stationForecasts.reduce((s, f) => s + f.expectedSales, 0);
    const prepPortions = stationForecasts.reduce((s, f) => s + f.recommendedPrep, 0);
    const highCount = stationForecasts.filter(f => f.riskOfWaste === 'High').length;
    const medCount = stationForecasts.filter(f => f.riskOfWaste === 'Medium').length;
    const riskLevel: 'Low' | 'Medium' | 'High' = highCount > 0 ? 'High' : medCount > 0 ? 'Medium' : 'Low';

    return {
      station,
      dishesCount: stationDishes.length,
      expectedPortions,
      prepPortions,
      riskLevel
    };
  });

  const highRiskDishes: RiskDishMetric[] = activeDishes
    .map(dish => {
      const shelfLives = (dish.ingredients || [])
        .map(b => ingMap.get(b.ingredientId)?.shelfLifeDays ?? 7);
      const minShelfLife = shelfLives.length > 0 ? Math.min(...shelfLives) : 7;
      const recentWasteLoss = wasteRecords
        .filter(w => w.itemId === dish.id)
        .reduce((s, w) => s + w.totalLossCost, 0);
      const forecast = forecasts.find(f => f.dishId === dish.id);

      const reasons: string[] = [];
      if (minShelfLife <= 2) {
        reasons.push(`${minShelfLife}-day raw ingredient shelf life`);
      } else if (minShelfLife <= 3) {
        reasons.push(`${minShelfLife}-day perishable ingredient window`);
      }
      if (dish.station === 'Bakery') {
        reasons.push('Daily fresh-bake turnover target');
      }
      if (recentWasteLoss > 0) {
        reasons.push(`$${recentWasteLoss.toFixed(2)} logged waste loss`);
      }
      if (forecast && forecast.clampedModifierPct < -0.05) {
        reasons.push(`Projected demand drop (${Math.round(forecast.clampedModifierPct * 100)}%)`);
      }

      const isHigh = minShelfLife <= 2 || recentWasteLoss >= 15 || forecast?.riskOfWaste === 'High';
      const isMedium = !isHigh && (minShelfLife <= 3 || recentWasteLoss > 0 || forecast?.riskOfWaste === 'Medium');

      return {
        dishId: dish.id,
        name: dish.name,
        station: dish.station,
        reason: reasons.length > 0 ? reasons.join(' · ') : 'Monitor end-of-shift par variance',
        riskLevel: (isHigh ? 'High' : 'Medium') as 'High' | 'Medium',
        minIngredientShelfLifeDays: minShelfLife,
        recentWasteLoss,
        score: (isHigh ? 100 : isMedium ? 50 : 0) + recentWasteLoss + (10 - Math.min(10, minShelfLife))
      };
    })
    .filter(item => item.score > 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score: _score, ...rest }) => rest);

  const salesByDateMap = new Map<string, DailySalesPoint>();
  for (const s of salesRecords) {
    const prev = salesByDateMap.get(s.date) || { date: s.date, portions: 0, revenue: 0 };
    prev.portions += s.quantitySold;
    prev.revenue = Math.round((prev.revenue + s.revenue) * 100) / 100;
    salesByDateMap.set(s.date, prev);
  }
  const dailySalesSeries = Array.from(salesByDateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const wasteByDateMap = new Map<string, DailyWastePoint>();
  for (const w of wasteRecords) {
    const prev = wasteByDateMap.get(w.date) || { date: w.date, lossCost: 0, portions: 0 };
    prev.lossCost = Math.round((prev.lossCost + w.totalLossCost) * 100) / 100;
    prev.portions += w.quantity;
    wasteByDateMap.set(w.date, prev);
  }
  const dailyWasteSeries = Array.from(wasteByDateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const forecastVsActual: ForecastVsActualPoint[] = [];
  for (const pred of predictions) {
    const actualOnDate = salesByDateMap.get(pred.targetDate);
    if (!actualOnDate) continue;
    const predictedPortions = pred.itemPredictions.reduce((s, ip) => s + ip.aiAdjusted, 0);
    const variancePct = actualOnDate.portions > 0
      ? Math.round(((predictedPortions - actualOnDate.portions) / actualOnDate.portions) * 1000) / 10
      : 0;
    forecastVsActual.push({
      date: pred.targetDate,
      predictedPortions,
      actualPortions: actualOnDate.portions,
      variancePct
    });
  }

  const distinctHistoryDays = salesByDateMap.size;
  const avgDataSufficiencyPct = forecasts.length > 0
    ? Math.round((forecasts.reduce((s, f) => s + f.confidenceScore, 0) / forecasts.length) * 100)
    : 0;

  return {
    forecasts,
    usingSavedPrediction: Boolean(savedForDate),
    predictionModelLabel: savedForDate
      ? savedForDate.isOfflineFallback
        ? '4-Week WMA + Local Heuristic'
        : `4-Week WMA + Gemini (${savedForDate.modelVersion || 'gemini-4-hydrogen'})`
      : '4-Week Statistical WMA Baseline',
    totalExpectedSales,
    totalRecommendedPrep,
    bufferPortions,
    demandChangeVsLastWeekPct,
    lastWeekSameDayPortions,
    avgDailyWasteCost,
    totalWasteCost,
    wastePctOfRevenue,
    wasteCountDays,
    deficitIngredients,
    stationMetrics,
    highRiskDishes,
    dailySalesSeries,
    dailyWasteSeries,
    forecastVsActual,
    distinctHistoryDays,
    avgDataSufficiencyPct,
    overproductionSharePct
  };
}
