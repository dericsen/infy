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
  seasonalModifierPct: number;
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

export interface DailyForecastSummary {
  date: string;
  dayLabel: string;
  shortDateLabel: string;
  isClosedDay: boolean;
  totalExpectedSales: number;
  totalRecommendedPrep: number;
  dishForecasts: DishForecastResult[];
}

export interface DishMultiDayRow {
  dishId: string;
  dishName: string;
  station: Station;
  category: string;
  historicalAvg: number;
  dataStatus: DataSufficiencyStatus['status'];
  totalDaysHistory: number;
  yearsCovered: number;
  totalHorizonExpected: number;
  totalHorizonPrep: number;
  dailyResults: DishForecastResult[];
}

export interface MultiDayForecastBundle {
  startDate: string;
  horizonDays: number;
  days: DailyForecastSummary[];
  dishMatrices: DishMultiDayRow[];
  totalExpectedPortions: number;
  totalRecommendedPrep: number;
}

export function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return isoDate;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function suggestForecastStartDate(salesRecords: SaleRecord[]): string {
  if (salesRecords.length === 0) {
    return new Date().toISOString().split('T')[0];
  }
  let maxDate = salesRecords[0].date;
  for (let i = 1; i < salesRecords.length; i++) {
    if (salesRecords[i].date > maxDate) {
      maxDate = salesRecords[i].date;
    }
  }
  return addDaysIso(maxDate, 1);
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
    message: `Limited history (${sameWeekdayCount} matching weekday records). Using transparent baseline prediction.`
  };
}

export function calculateNaiveBaseline(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  closedDays: ClosedDayRecord[] = []
): number {
  const closedSet = getClosedDateSet(closedDays);
  const dateStr = addDaysIso(targetDate, -7);

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

export function calculateYearOverYearSeasonalModifier(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  closedDays: ClosedDayRecord[] = []
): { modifierPct: number; matchedYears: number } {
  const closedSet = getClosedDateSet(closedDays);
  const dishRecords = salesHistory.filter(
    r => r.menuItemId === dishId && r.date < targetDate && !closedSet.has(r.date)
  );
  const dailyAggregates = aggregateByDate(dishRecords);
  if (dailyAggregates.length < 45) {
    return { modifierPct: 0, matchedYears: 0 };
  }

  const targetYear = Number(targetDate.slice(0, 4));
  const monthDay = targetDate.slice(4);
  const seasonalSignals: number[] = [];

  for (let yearsBack = 1; yearsBack <= 3; yearsBack++) {
    const priorYear = targetYear - yearsBack;
    const priorYearPrefix = `${priorYear}-`;
    const yearRecords = dailyAggregates.filter(r => r.date.startsWith(priorYearPrefix));
    if (yearRecords.length < 30) continue;

    const anchorDate = `${priorYear}${monthDay}`;
    const windowStart = addDaysIso(anchorDate, -7);
    const windowEnd = addDaysIso(anchorDate, 7);
    const windowRecords = yearRecords.filter(r => r.date >= windowStart && r.date <= windowEnd);
    if (windowRecords.length < 3) continue;

    const yearAvg = yearRecords.reduce((sum, r) => sum + r.quantitySold, 0) / yearRecords.length;
    if (yearAvg <= 0) continue;

    const windowAvg = windowRecords.reduce((sum, r) => sum + r.quantitySold, 0) / windowRecords.length;
    const ratio = (windowAvg - yearAvg) / yearAvg;
    seasonalSignals.push(Math.max(-0.15, Math.min(0.15, ratio)));
  }

  if (seasonalSignals.length === 0) {
    return { modifierPct: 0, matchedYears: 0 };
  }

  const avgSignal = seasonalSignals.reduce((s, v) => s + v, 0) / seasonalSignals.length;
  return {
    modifierPct: Math.round(avgSignal * 100) / 100,
    matchedYears: seasonalSignals.length
  };
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
      seasonalModifierPct: 0,
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

  const yoySeasonal = calculateYearOverYearSeasonalModifier(salesHistory, dish.id, targetDate, closedDays);

  const minClamp = -1 * (limitPct / 100);
  const maxClamp = limitPct / 100;

  let contextModifierPct = trendAdjustmentPct + yoySeasonal.modifierPct;
  const rationaleParts: string[] = [];
  let adjustmentSource: 'gemini' | 'statistical_heuristic' = 'statistical_heuristic';
  let riskOfWaste: 'Low' | 'Medium' | 'High' = 'Low';

  if (options?.geminiAdjustment) {
    adjustmentSource = 'gemini';
    contextModifierPct = options.geminiAdjustment.suggestedMultiplier + yoySeasonal.modifierPct;
    rationaleParts.push(options.geminiAdjustment.rationale);
    if (yoySeasonal.modifierPct !== 0) {
      rationaleParts.push(`Prior-year seasonal (${yoySeasonal.modifierPct > 0 ? '+' : ''}${Math.round(yoySeasonal.modifierPct * 100)}%)`);
    }
    riskOfWaste = options.geminiAdjustment.riskOfWaste;
  } else {
    if (trendAdjustmentPct !== 0) {
      rationaleParts.push(`7-day trend (${trendAdjustmentPct > 0 ? '+' : ''}${Math.round(trendAdjustmentPct * 100)}%)`);
    }

    if (yoySeasonal.modifierPct !== 0) {
      rationaleParts.push(
        `${yoySeasonal.matchedYears}y seasonal window (${yoySeasonal.modifierPct > 0 ? '+' : ''}${Math.round(yoySeasonal.modifierPct * 100)}%)`
      );
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
    ? (yoySeasonal.modifierPct !== 0
      ? `Baseline average with ${yoySeasonal.matchedYears}-year seasonal cue.`
      : 'Limited history: baseline statistical estimate applied without downward reduction.')
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
    seasonalModifierPct: yoySeasonal.modifierPct,
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

export function extractDishesFromSales(
  salesHistory: SaleRecord[],
  existingMenuItems: MenuItem[]
): MenuItem[] {
  const activeExisting = existingMenuItems.filter(m => m.isActive);
  const byId = new Map<string, MenuItem>(activeExisting.map(m => [m.id, m]));
  const byName = new Map<string, MenuItem>(activeExisting.map(m => [m.name.toLowerCase(), m]));

  const discovered = new Map<string, {
    id: string;
    name: string;
    station: Station;
    restaurantId: string;
    totalQty: number;
    totalRev: number;
  }>();

  for (const s of salesHistory) {
    if (byId.has(s.menuItemId) || byName.has(s.dishName.toLowerCase())) {
      continue;
    }
    const key = s.menuItemId;
    const prev = discovered.get(key);
    if (prev) {
      prev.totalQty += s.quantitySold;
      prev.totalRev += s.revenue;
    } else {
      discovered.set(key, {
        id: s.menuItemId,
        name: s.dishName,
        station: s.station || 'Grill',
        restaurantId: s.restaurantId || 'rst_rustic_table',
        totalQty: s.quantitySold,
        totalRev: s.revenue
      });
    }
  }

  const synthesized: MenuItem[] = Array.from(discovered.values()).map(d => {
    const avgPrice = d.totalQty > 0 && d.totalRev > 0
      ? Math.round((d.totalRev / d.totalQty) * 100) / 100
      : 15;
    return {
      id: d.id,
      restaurantId: d.restaurantId,
      name: d.name,
      category: 'Uploaded Menu',
      station: d.station,
      sellingPrice: avgPrice,
      targetCost: Math.round(avgPrice * 0.3 * 100) / 100,
      isActive: true,
      isDemonstrationData: false,
      ingredients: []
    };
  });

  if (salesHistory.length > 0 && synthesized.length > 0) {
    const salesDishIds = new Set(salesHistory.map(s => s.menuItemId));
    const matchedExisting = activeExisting.filter(m => salesDishIds.has(m.id));
    if (matchedExisting.length === 0) {
      return synthesized;
    }
    return [...matchedExisting, ...synthesized];
  }

  return activeExisting;
}

export function generateMultiDayForecast(params: {
  dishes: MenuItem[];
  salesRecords: SaleRecord[];
  startDate: string;
  horizonDays: number;
  weather: { condition: string; temperatureC: number; precipChance: number };
  eventContext: string;
  closedDays: ClosedDayRecord[];
  settings: AppSettings;
  geminiTargetDate?: string;
  geminiAdjustments?: GeminiDishAdjustment[];
}): MultiDayForecastBundle {
  const {
    dishes,
    salesRecords,
    startDate,
    horizonDays,
    weather,
    eventContext,
    closedDays,
    settings,
    geminiTargetDate,
    geminiAdjustments
  } = params;

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days: DailyForecastSummary[] = [];
  const perDishDaily = new Map<string, DishForecastResult[]>();

  for (const dish of dishes) {
    perDishDaily.set(dish.id, []);
  }

  let totalExpectedPortions = 0;
  let totalRecommendedPrep = 0;

  for (let offset = 0; offset < horizonDays; offset++) {
    const targetDate = addDaysIso(startDate, offset);
    const dObj = new Date(targetDate);
    const dayName = weekdayNames[dObj.getUTCDay()] || '';
    const shortDateLabel = `${dayName} ${targetDate.slice(5)}`;
    const dayLabel = dObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });

    const dishForecasts = dishes.map(dish => {
      const geminiAdjustment =
        geminiTargetDate === targetDate && geminiAdjustments
          ? geminiAdjustments.find(a => a.dishId === dish.id)
          : undefined;

      const res = generateComprehensiveForecast(
        dish,
        salesRecords,
        targetDate,
        weather,
        eventContext,
        {
          closedDays,
          settings,
          geminiAdjustment
        }
      );

      perDishDaily.get(dish.id)?.push(res);
      return res;
    });

    const dayExpected = dishForecasts.reduce((s, r) => s + r.expectedSales, 0);
    const dayPrep = dishForecasts.reduce((s, r) => s + r.recommendedPrep, 0);
    const isClosedDay = dishForecasts.length > 0 && dishForecasts.every(r => r.isClosedDay);

    totalExpectedPortions += dayExpected;
    totalRecommendedPrep += dayPrep;

    days.push({
      date: targetDate,
      dayLabel,
      shortDateLabel,
      isClosedDay,
      totalExpectedSales: dayExpected,
      totalRecommendedPrep: dayPrep,
      dishForecasts
    });
  }

  const dishMatrices: DishMultiDayRow[] = dishes.map(dish => {
    const dailyResults = perDishDaily.get(dish.id) || [];
    const dishSales = salesRecords.filter(s => s.menuItemId === dish.id);
    const byDate = aggregateByDate(dishSales);
    const yearsSet = new Set(byDate.map(r => r.date.slice(0, 4)));
    const avgHist = byDate.length > 0
      ? Math.round((byDate.reduce((s, r) => s + r.quantitySold, 0) / byDate.length) * 10) / 10
      : 0;

    const firstDay = dailyResults[0];
    return {
      dishId: dish.id,
      dishName: dish.name,
      station: dish.station,
      category: dish.category,
      historicalAvg: avgHist,
      dataStatus: firstDay ? firstDay.dataSufficiency.status : 'insufficient',
      totalDaysHistory: byDate.length,
      yearsCovered: yearsSet.size,
      totalHorizonExpected: dailyResults.reduce((s, r) => s + r.expectedSales, 0),
      totalHorizonPrep: dailyResults.reduce((s, r) => s + r.recommendedPrep, 0),
      dailyResults
    };
  });

  dishMatrices.sort((a, b) => b.totalHorizonExpected - a.totalHorizonExpected);

  return {
    startDate,
    horizonDays,
    days,
    dishMatrices,
    totalExpectedPortions,
    totalRecommendedPrep
  };
}
