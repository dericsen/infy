import { SaleRecord, MenuItem, Station } from '../types';

export interface DataSufficiencyStatus {
  isSufficient: boolean;
  totalDays: number;
  sameWeekdayCount: number;
  status: 'optimal' | 'moderate' | 'insufficient';
  message: string;
}

export interface ModelAccuracyEvaluation {
  dishId: string;
  dishName: string;
  evaluatedDaysCount: number;
  naiveMae: number;
  naiveMape: number;
  wmaMae: number;
  wmaMape: number;
  wmaRmse: number;
  accuracyImprovementPct: number;
  forecastBias: 'Over-forecasting' | 'Under-forecasting' | 'Balanced';
}

export interface DishForecastResult {
  dishId: string;
  dishName: string;
  station: Station;
  category: string;
  targetDate: string;
  dayOfWeek: number;
  dataSufficiency: DataSufficiencyStatus;
  naivePrediction: number;
  baseStatisticalForecast: number;
  trendAdjustmentPct: number;
  contextModifierPct: number;
  clampedModifierPct: number;
  expectedSales: number;
  confidenceInterval80: [number, number];
  confidenceInterval95: [number, number];
  safetyBufferPct: number;
  recommendedPrep: number;
  historicalVolatilityStdDev: number;
  rationale: string;
  riskOfWaste: 'Low' | 'Medium' | 'High';
}

export function evaluateDataSufficiency(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string
): DataSufficiencyStatus {
  const target = new Date(targetDate);
  const targetDayOfWeek = target.getDay();

  const validRecords = salesHistory.filter(
    r => r.menuItemId === dishId && r.date < targetDate
  );

  const distinctDates = Array.from(new Set(validRecords.map(r => r.date)));
  const sameWeekdayRecords = validRecords.filter(r => r.dayOfWeek === targetDayOfWeek);

  const totalDays = distinctDates.length;
  const sameWeekdayCount = sameWeekdayRecords.length;

  if (sameWeekdayCount >= 4 && totalDays >= 28) {
    return {
      isSufficient: true,
      totalDays,
      sameWeekdayCount,
      status: 'optimal',
      message: `Optimal data depth: ${sameWeekdayCount} full same-weekday cycles across ${totalDays} total operating days.`
    };
  }

  if (sameWeekdayCount >= 2 && totalDays >= 14) {
    return {
      isSufficient: true,
      totalDays,
      sameWeekdayCount,
      status: 'moderate',
      message: `Moderate data depth: ${sameWeekdayCount} same-weekday records available. Standard error bands expanded.`
    };
  }

  return {
    isSufficient: false,
    totalDays,
    sameWeekdayCount,
    status: 'insufficient',
    message: `Insufficient history (${sameWeekdayCount} matching days). Using category baseline and wider safety par.`
  };
}

export function calculateNaiveBaseline(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string
): number {
  const target = new Date(targetDate);
  const sevenDaysAgo = new Date(target);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const matched = salesHistory.find(
    r => r.menuItemId === dishId && r.date === dateStr
  );

  if (matched) return matched.quantitySold;

  const validRecords = salesHistory
    .filter(r => r.menuItemId === dishId && r.date < targetDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  return validRecords.length > 0 ? validRecords[0].quantitySold : 20;
}

export function calculateWeightedMovingAverage(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string
): { baseForecast: number; stdDev: number; historicalPoints: number[] } {
  const target = new Date(targetDate);
  const targetDayOfWeek = target.getDay();

  const sameDayRecords = salesHistory
    .filter(r => r.menuItemId === dishId && r.dayOfWeek === targetDayOfWeek && r.date < targetDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  if (sameDayRecords.length === 0) {
    const allDishRecords = salesHistory
      .filter(r => r.menuItemId === dishId && r.date < targetDate)
      .slice(0, 14);

    if (allDishRecords.length === 0) {
      return { baseForecast: 20, stdDev: 5, historicalPoints: [20] };
    }

    const mean = allDishRecords.reduce((sum, r) => sum + r.quantitySold, 0) / allDishRecords.length;
    return { baseForecast: Math.round(mean), stdDev: 4, historicalPoints: allDishRecords.map(r => r.quantitySold) };
  }

  const quantities = sameDayRecords.map(r => r.quantitySold);
  const weights = [0.40, 0.30, 0.20, 0.10].slice(0, quantities.length);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  let weightedSum = 0;
  for (let i = 0; i < quantities.length; i++) {
    weightedSum += quantities[i] * weights[i];
  }

  const baseForecast = Math.round(weightedSum / weightSum);

  const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
  const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
  const stdDev = Math.max(1.5, Math.sqrt(variance));

  return { baseForecast, stdDev, historicalPoints: quantities };
}

export function calculateRecentTrendModifier(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string
): number {
  const recentRecords = salesHistory
    .filter(r => r.menuItemId === dishId && r.date < targetDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  if (recentRecords.length < 5) return 0;

  const earlierRecords = salesHistory
    .filter(r => r.menuItemId === dishId && r.date < targetDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(7, 14);

  if (earlierRecords.length < 5) return 0;

  const recentAvg = recentRecords.reduce((sum, r) => sum + r.quantitySold, 0) / recentRecords.length;
  const earlierAvg = earlierRecords.reduce((sum, r) => sum + r.quantitySold, 0) / earlierRecords.length;

  if (earlierAvg === 0) return 0;

  const trendDelta = (recentAvg - earlierAvg) / earlierAvg;
  return Math.max(-0.10, Math.min(0.10, Math.round(trendDelta * 100) / 100));
}

export function evaluateBacktestMetrics(
  salesHistory: SaleRecord[],
  dishId: string,
  dishName: string,
  lookbackDays: number = 14
): ModelAccuracyEvaluation {
  const records = salesHistory
    .filter(r => r.menuItemId === dishId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (records.length < 15) {
    return {
      dishId,
      dishName,
      evaluatedDaysCount: 0,
      naiveMae: 0,
      naiveMape: 0,
      wmaMae: 0,
      wmaMape: 0,
      wmaRmse: 0,
      accuracyImprovementPct: 0,
      forecastBias: 'Balanced'
    };
  }

  const testRecords = records.slice(records.length - lookbackDays);
  let naiveTotalError = 0;
  let naiveTotalPctError = 0;
  let wmaTotalError = 0;
  let wmaTotalPctError = 0;
  let wmaSquaredErrorSum = 0;
  let wmaBiasSum = 0;

  testRecords.forEach(actual => {
    const historyBeforeDate = records.filter(r => r.date < actual.date);
    const naivePred = calculateNaiveBaseline(historyBeforeDate, dishId, actual.date);
    const { baseForecast } = calculateWeightedMovingAverage(historyBeforeDate, dishId, actual.date);

    const naiveErr = Math.abs(naivePred - actual.quantitySold);
    const wmaErr = Math.abs(baseForecast - actual.quantitySold);

    naiveTotalError += naiveErr;
    naiveTotalPctError += (naiveErr / Math.max(1, actual.quantitySold));

    wmaTotalError += wmaErr;
    wmaTotalPctError += (wmaErr / Math.max(1, actual.quantitySold));
    wmaSquaredErrorSum += Math.pow(wmaErr, 2);
    wmaBiasSum += (baseForecast - actual.quantitySold);
  });

  const count = testRecords.length;
  const naiveMae = Math.round((naiveTotalError / count) * 10) / 10;
  const naiveMape = Math.round((naiveTotalPctError / count) * 1000) / 10;
  const wmaMae = Math.round((wmaTotalError / count) * 10) / 10;
  const wmaMape = Math.round((wmaTotalPctError / count) * 1000) / 10;
  const wmaRmse = Math.round(Math.sqrt(wmaSquaredErrorSum / count) * 10) / 10;

  const accuracyImprovementPct = naiveMape > 0
    ? Math.round(((naiveMape - wmaMape) / naiveMape) * 1000) / 10
    : 0;

  const avgBias = wmaBiasSum / count;
  const forecastBias = avgBias > 1.2
    ? 'Over-forecasting'
    : avgBias < -1.2
    ? 'Under-forecasting'
    : 'Balanced';

  return {
    dishId,
    dishName,
    evaluatedDaysCount: count,
    naiveMae,
    naiveMape,
    wmaMae,
    wmaMape,
    wmaRmse,
    accuracyImprovementPct,
    forecastBias
  };
}

export function generateComprehensiveForecast(
  dish: MenuItem,
  salesHistory: SaleRecord[],
  targetDate: string,
  weather: { condition: string; temperatureC: number; precipChance: number },
  eventContext: string,
  safetyBounds: { maxDecreasePct: number; maxIncreasePct: number } = { maxDecreasePct: 30, maxIncreasePct: 35 }
): DishForecastResult {
  const target = new Date(targetDate);
  const dayOfWeek = target.getDay();

  const dataSufficiency = evaluateDataSufficiency(salesHistory, dish.id, targetDate);
  const naivePrediction = calculateNaiveBaseline(salesHistory, dish.id, targetDate);
  const { baseForecast, stdDev } = calculateWeightedMovingAverage(salesHistory, dish.id, targetDate);
  const trendAdjustmentPct = calculateRecentTrendModifier(salesHistory, dish.id, targetDate);

  let contextModifierPct = trendAdjustmentPct;
  let rationaleParts: string[] = [];

  if (trendAdjustmentPct !== 0) {
    rationaleParts.push(`7-day trajectory (${trendAdjustmentPct > 0 ? '+' : ''}${Math.round(trendAdjustmentPct * 100)}%)`);
  }

  if (weather.condition === 'Rain' || weather.condition === 'Storm' || weather.precipChance >= 60) {
    if (dish.station === 'Saute') {
      contextModifierPct += 0.16;
      rationaleParts.push(`Rain & cool temp (+16% warm comfort entrees)`);
    } else if (dish.station === 'Garde Manger') {
      contextModifierPct -= 0.14;
      rationaleParts.push(`Precipitation suppresses cold salad walk-ins (-14%)`);
    } else if (dish.station === 'Bakery') {
      contextModifierPct += 0.05;
      rationaleParts.push(`Accompaniment dinner bread surge (+5%)`);
    }
  } else if (weather.condition === 'Clear' && weather.temperatureC >= 22) {
    if (dish.station === 'Garde Manger') {
      contextModifierPct += 0.18;
      rationaleParts.push(`Warm sunny weather boosts cold salads (+18%)`);
    } else if (dish.station === 'Saute') {
      contextModifierPct -= 0.08;
      rationaleParts.push(`Warm weather moderates heavy pasta demand (-8%)`);
    }
  }

  if (eventContext.includes('Friday') || eventContext.includes('Payday') || dayOfWeek === 5) {
    if (dish.id.includes('steak') || dish.station === 'Grill') {
      contextModifierPct += 0.18;
      rationaleParts.push(`Payday/Friday prime protein surge (+18%)`);
    }
  }

  const minClamp = -1 * (safetyBounds.maxDecreasePct / 100);
  const maxClamp = safetyBounds.maxIncreasePct / 100;
  const clampedModifierPct = Math.max(minClamp, Math.min(maxClamp, contextModifierPct));

  const expectedSales = Math.max(4, Math.round(baseForecast * (1 + clampedModifierPct)));

  const z80 = 1.28;
  const z95 = 1.96;
  const interval80Min = Math.max(1, Math.round(expectedSales - z80 * stdDev));
  const interval80Max = Math.round(expectedSales + z80 * stdDev);
  const interval95Min = Math.max(1, Math.round(expectedSales - z95 * stdDev));
  const interval95Max = Math.round(expectedSales + z95 * stdDev);

  let safetyBufferPct = 0.08;
  if (dish.station === 'Bakery') safetyBufferPct = 0.05;
  if (dish.station === 'Garde Manger') safetyBufferPct = 0.05;
  if (dish.station === 'Saute') safetyBufferPct = 0.10;

  const recommendedPrep = Math.ceil(expectedSales * (1 + safetyBufferPct));

  const riskOfWaste: 'Low' | 'Medium' | 'High' =
    clampedModifierPct < -0.10 || dish.station === 'Bakery'
      ? 'High'
      : clampedModifierPct > 0.15
      ? 'Medium'
      : 'Low';

  const rationale = rationaleParts.length > 0
    ? rationaleParts.join('; ') + '.'
    : 'Steady seasonal baseline forecast.';

  return {
    dishId: dish.id,
    dishName: dish.name,
    station: dish.station,
    category: dish.category,
    targetDate,
    dayOfWeek,
    dataSufficiency,
    naivePrediction,
    baseStatisticalForecast: baseForecast,
    trendAdjustmentPct,
    contextModifierPct: Math.round(contextModifierPct * 100) / 100,
    clampedModifierPct: Math.round(clampedModifierPct * 100) / 100,
    expectedSales,
    confidenceInterval80: [interval80Min, interval80Max],
    confidenceInterval95: [interval95Min, interval95Max],
    safetyBufferPct,
    recommendedPrep,
    historicalVolatilityStdDev: Math.round(stdDev * 10) / 10,
    rationale,
    riskOfWaste
  };
}
