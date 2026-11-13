import {
  SaleRecord,
  MenuItem,
  Station,
  ClosedDayRecord,
  AppSettings,
  GeminiDishAdjustment
} from '../types';

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
  isClosedDay: boolean;
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
  adjustmentSource: 'gemini' | 'statistical_heuristic' | 'closed';
  riskOfWaste: 'Low' | 'Medium' | 'High';
}

function getClosedDateSet(closedDays: ClosedDayRecord[]): Set<string> {
  return new Set(closedDays.map(c => c.date));
}

export function evaluateDataSufficiency(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  closedDays: ClosedDayRecord[] = []
): DataSufficiencyStatus {
  const target = new Date(targetDate);
  const targetDayOfWeek = target.getDay();
  const closedSet = getClosedDateSet(closedDays);

  const validRecords = salesHistory.filter(
    r => r.menuItemId === dishId && r.date < targetDate && !closedSet.has(r.date)
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
      message: `Optimal data depth: ${sameWeekdayCount} full same-weekday cycles across ${totalDays} operating days.`
    };
  }

  if (sameWeekdayCount >= 2 && totalDays >= 14) {
    return {
      isSufficient: true,
      totalDays,
      sameWeekdayCount,
      status: 'moderate',
      message: `Moderate data depth: ${sameWeekdayCount} same-weekday records available. Uncertainty band widened.`
    };
  }

  return {
    isSufficient: false,
    totalDays,
    sameWeekdayCount,
    status: 'insufficient',
    message: `Insufficient history (${sameWeekdayCount} matching weekday records). Using transparent baseline prediction.`
  };
}

export function calculateNaiveBaseline(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  closedDays: ClosedDayRecord[] = []
): number {
  const closedSet = getClosedDateSet(closedDays);
  const target = new Date(targetDate);
  const sevenDaysAgo = new Date(target);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const matched = salesHistory.filter(
    r => r.menuItemId === dishId && r.date === dateStr && !closedSet.has(r.date)
  );

  if (matched.length > 0) {
    return matched.reduce((sum, r) => sum + r.quantitySold, 0);
  }

  const validRecords = salesHistory
    .filter(r => r.menuItemId === dishId && r.date < targetDate && !closedSet.has(r.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  return validRecords.length > 0 ? validRecords[0].quantitySold : 16;
}

function aggregateByDate(records: SaleRecord[]): { date: string; dayOfWeek: number; quantitySold: number }[] {
  const byDate = new Map<string, { date: string; dayOfWeek: number; quantitySold: number }>();
  for (const r of records) {
    const existing = byDate.get(r.date);
    if (existing) {
      existing.quantitySold += r.quantitySold;
    } else {
      byDate.set(r.date, {
        date: r.date,
        dayOfWeek: r.dayOfWeek,
        quantitySold: r.quantitySold
      });
    }
  }
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function calculateWeightedMovingAverage(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  closedDays: ClosedDayRecord[] = []
): { baseForecast: number; stdDev: number; historicalPoints: number[] } {
  const closedSet = getClosedDateSet(closedDays);
  const target = new Date(targetDate);
  const targetDayOfWeek = target.getDay();

  const dishRecords = salesHistory.filter(
    r => r.menuItemId === dishId && r.date < targetDate && !closedSet.has(r.date)
  );
  const dailyAggregates = aggregateByDate(dishRecords);

  const sameDayRecords = dailyAggregates
    .filter(r => r.dayOfWeek === targetDayOfWeek)
    .slice(0, 4);

  if (sameDayRecords.length === 0) {
    const recentAll = dailyAggregates.slice(0, 14);
    if (recentAll.length === 0) {
      return { baseForecast: 16, stdDev: 4.5, historicalPoints: [16] };
    }
    const mean = recentAll.reduce((sum, r) => sum + r.quantitySold, 0) / recentAll.length;
    return {
      baseForecast: Math.max(1, Math.round(mean)),
      stdDev: 4.0,
      historicalPoints: recentAll.map(r => r.quantitySold)
    };
  }

  const quantities = sameDayRecords.map(r => r.quantitySold);
  const weights = [0.40, 0.30, 0.20, 0.10].slice(0, quantities.length);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  let weightedSum = 0;
  for (let i = 0; i < quantities.length; i++) {
    weightedSum += quantities[i] * weights[i];
  }

  const baseForecast = Math.max(1, Math.round(weightedSum / weightSum));
  const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
  const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
  const stdDev = Math.max(1.5, Math.sqrt(variance));

  return { baseForecast, stdDev, historicalPoints: quantities };
}

export function calculateRecentTrendModifier(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  closedDays: ClosedDayRecord[] = []
): number {
  const closedSet = getClosedDateSet(closedDays);
  const dishRecords = salesHistory.filter(
    r => r.menuItemId === dishId && r.date < targetDate && !closedSet.has(r.date)
  );
  const dailyAggregates = aggregateByDate(dishRecords);

  const recentRecords = dailyAggregates.slice(0, 7);
  const earlierRecords = dailyAggregates.slice(7, 14);

  if (recentRecords.length < 4 || earlierRecords.length < 4) return 0;

  const recentAvg = recentRecords.reduce((sum, r) => sum + r.quantitySold, 0) / recentRecords.length;
  const earlierAvg = earlierRecords.reduce((sum, r) => sum + r.quantitySold, 0) / earlierRecords.length;

  if (earlierAvg === 0) return 0;

  const trendDelta = (recentAvg - earlierAvg) / earlierAvg;
  return Math.max(-0.08, Math.min(0.08, Math.round(trendDelta * 100) / 100));
}

export function evaluateBacktestMetrics(
  salesHistory: SaleRecord[],
  dishId: string,
  dishName: string,
  lookbackDays: number = 14,
  closedDays: ClosedDayRecord[] = []
): ModelAccuracyEvaluation {
  const closedSet = getClosedDateSet(closedDays);
  const dishRecords = salesHistory.filter(
    r => r.menuItemId === dishId && !closedSet.has(r.date)
  );
  const records = aggregateByDate(dishRecords).sort((a, b) => a.date.localeCompare(b.date));

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
    const historyBeforeDate = dishRecords.filter(r => r.date < actual.date);
    const naivePred = calculateNaiveBaseline(historyBeforeDate, dishId, actual.date, closedDays);
    const { baseForecast } = calculateWeightedMovingAverage(historyBeforeDate, dishId, actual.date, closedDays);

    const naiveErr = Math.abs(naivePred - actual.quantitySold);
    const wmaErr = Math.abs(baseForecast - actual.quantitySold);

    naiveTotalError += naiveErr;
    naiveTotalPctError += naiveErr / Math.max(1, actual.quantitySold);

    wmaTotalError += wmaErr;
    wmaTotalPctError += wmaErr / Math.max(1, actual.quantitySold);
    wmaSquaredErrorSum += Math.pow(wmaErr, 2);
    wmaBiasSum += baseForecast - actual.quantitySold;
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
  options?: {
    closedDays?: ClosedDayRecord[];
    settings?: AppSettings;
    geminiAdjustment?: GeminiDishAdjustment;
  }
): DishForecastResult {
  const closedDays = options?.closedDays || [];
  const limitPct = options?.settings?.aiAdjustmentLimitPct ?? 15;
  const stationBufferPct = ((options?.settings?.stationBuffers?.[dish.station] ?? (dish.station === 'Bakery' || dish.station === 'Garde Manger' ? 5 : dish.station === 'Saute' ? 10 : 8)) / 100);

  const target = new Date(targetDate);
  const dayOfWeek = target.getDay();
  const closedEntry = closedDays.find(c => c.date === targetDate);
  const dataSufficiency = evaluateDataSufficiency(salesHistory, dish.id, targetDate, closedDays);
  const naivePrediction = calculateNaiveBaseline(salesHistory, dish.id, targetDate, closedDays);
  const { baseForecast, stdDev } = calculateWeightedMovingAverage(salesHistory, dish.id, targetDate, closedDays);

  if (closedEntry) {
    return {
      dishId: dish.id,
      dishName: dish.name,
      station: dish.station,
      category: dish.category,
      targetDate,
      dayOfWeek,
      isClosedDay: true,
      dataSufficiency,
      naivePrediction,
      baseStatisticalForecast: baseForecast,
      trendAdjustmentPct: 0,
      contextModifierPct: 0,
      clampedModifierPct: 0,
      expectedSales: 0,
      confidenceInterval80: [0, 0],
      confidenceInterval95: [0, 0],
      safetyBufferPct: 0,
      recommendedPrep: 0,
      historicalVolatilityStdDev: Math.round(stdDev * 10) / 10,
      rationale: `Restaurant marked closed on ${targetDate} (${closedEntry.reason}). Zero prep recommended.`,
      adjustmentSource: 'closed',
      riskOfWaste: 'Low'
    };
  }

  const trendAdjustmentPct = dataSufficiency.status === 'insufficient'
    ? 0
    : calculateRecentTrendModifier(salesHistory, dish.id, targetDate, closedDays);

  const minClamp = -1 * (limitPct / 100);
  const maxClamp = limitPct / 100;

  let contextModifierPct = trendAdjustmentPct;
  let rationaleParts: string[] = [];
  let adjustmentSource: 'gemini' | 'statistical_heuristic' = 'statistical_heuristic';
  let riskOfWaste: 'Low' | 'Medium' | 'High' = 'Low';

  if (options?.geminiAdjustment) {
    adjustmentSource = 'gemini';
    contextModifierPct = options.geminiAdjustment.suggestedMultiplier;
    rationaleParts.push(options.geminiAdjustment.rationale);
    riskOfWaste = options.geminiAdjustment.riskOfWaste;
  } else {
    if (trendAdjustmentPct !== 0) {
      rationaleParts.push(`7-day trend (${trendAdjustmentPct > 0 ? '+' : ''}${Math.round(trendAdjustmentPct * 100)}%)`);
    }

    if (weather.condition === 'Rain' || weather.condition === 'Storm' || weather.precipChance >= 60) {
      if (dish.station === 'Saute') {
        contextModifierPct += 0.12;
        rationaleParts.push('Rain & cool temp (+12% warm entrees)');
      } else if (dish.station === 'Garde Manger') {
        contextModifierPct -= 0.12;
        rationaleParts.push('Precipitation suppresses cold salads (-12%)');
      } else if (dish.station === 'Bakery') {
        contextModifierPct += 0.04;
        rationaleParts.push('Steady bakery accompaniment (+4%)');
      }
    } else if (weather.condition === 'Clear' && weather.temperatureC >= 22) {
      if (dish.station === 'Garde Manger') {
        contextModifierPct += 0.12;
        rationaleParts.push('Warm sunny weather boosts cold salads (+12%)');
      } else if (dish.station === 'Saute') {
        contextModifierPct -= 0.06;
        rationaleParts.push('Warm weather moderates heavy pasta (-6%)');
      }
    }

    if (eventContext.includes('Friday') || eventContext.includes('Payday') || dayOfWeek === 5) {
      if (dish.station === 'Grill') {
        contextModifierPct += 0.08;
        rationaleParts.push('Friday service protein demand (+8%)');
      }
    }
  }

  const clampedModifierPct = Math.round(Math.max(minClamp, Math.min(maxClamp, contextModifierPct)) * 1000) / 1000;
  const effectiveModifier = dataSufficiency.status === 'insufficient'
    ? Math.max(0, clampedModifierPct)
    : clampedModifierPct;

  const expectedSales = Math.max(1, Math.round(baseForecast * (1 + effectiveModifier)));

  const uncertaintyFactor = dataSufficiency.status === 'optimal' ? 1 : dataSufficiency.status === 'moderate' ? 1.35 : 1.75;
  const effectiveStdDev = stdDev * uncertaintyFactor;

  const interval80Min = Math.max(1, Math.round(expectedSales - 1.28 * effectiveStdDev));
  const interval80Max = Math.round(expectedSales + 1.28 * effectiveStdDev);
  const interval95Min = Math.max(1, Math.round(expectedSales - 1.96 * effectiveStdDev));
  const interval95Max = Math.round(expectedSales + 1.96 * effectiveStdDev);

  const recommendedPrep = Math.ceil(expectedSales * (1 + stationBufferPct));

  if (!options?.geminiAdjustment) {
    riskOfWaste = effectiveModifier <= -0.08 || dish.station === 'Bakery'
      ? 'High'
      : effectiveModifier >= 0.10
      ? 'Medium'
      : 'Low';
  }

  const baseRationale = dataSufficiency.status === 'insufficient'
    ? 'Limited history: baseline statistical estimate applied without downward reduction.'
    : rationaleParts.length > 0
    ? rationaleParts.join('; ')
    : 'Steady 4-week day-of-week statistical baseline.';

  return {
    dishId: dish.id,
    dishName: dish.name,
    station: dish.station,
    category: dish.category,
    targetDate,
    dayOfWeek,
    isClosedDay: false,
    dataSufficiency,
    naivePrediction,
    baseStatisticalForecast: baseForecast,
    trendAdjustmentPct,
    contextModifierPct: Math.round(contextModifierPct * 1000) / 1000,
    clampedModifierPct: effectiveModifier,
    expectedSales,
    confidenceInterval80: [interval80Min, interval80Max],
    confidenceInterval95: [interval95Min, interval95Max],
    safetyBufferPct: stationBufferPct,
    recommendedPrep,
    historicalVolatilityStdDev: Math.round(effectiveStdDev * 10) / 10,
    rationale: baseRationale,
    adjustmentSource,
    riskOfWaste
  };
}
