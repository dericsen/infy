import {
  SaleRecord,
  MenuItem,
  Station,
  ForecastConfig,
  DEFAULT_FORECAST_CONFIG,
  ContextualDishAdjustment
} from '../types';

export interface DataSufficiencyStatus {
  isSufficient: boolean;
  totalDays: number;
  sameWeekdayCount: number;
  excludedInvalidCount: number;
  excludedClosedCount: number;
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
  wmaBias: number;
  accuracyImprovementPct: number;
  forecastBias: 'Over-forecasting' | 'Under-forecasting' | 'Balanced';
  evaluationNote: string;
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
  confidenceScore: number;
  rationale: string;
  riskOfWaste: 'Low' | 'Medium' | 'High';
  predictionSource: 'ai-assisted' | 'deterministic-fallback' | 'closed-day';
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === dateStr;
}

export function getDayOfWeekFromIso(dateStr: string): number {
  if (!isValidIsoDate(dateStr)) return 0;
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function addDaysIso(dateStr: string, deltaDays: number): string {
  const base = new Date(`${dateStr}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

export function isClosedServiceDate(
  dateStr: string,
  config: Pick<ForecastConfig, 'closedWeekdays' | 'closedDates'>
): boolean {
  if (!isValidIsoDate(dateStr)) return false;
  if (config.closedDates.includes(dateStr)) return true;
  const dow = getDayOfWeekFromIso(dateStr);
  return config.closedWeekdays.includes(dow);
}

export function sanitizeHistoricalRecords(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  config: Pick<ForecastConfig, 'closedWeekdays' | 'closedDates'>
): {
  validRecords: SaleRecord[];
  excludedInvalidCount: number;
  excludedClosedCount: number;
} {
  let excludedInvalidCount = 0;
  let excludedClosedCount = 0;
  const byDate = new Map<string, SaleRecord>();

  for (const r of salesHistory) {
    if (!r || r.menuItemId !== dishId) continue;
    if (!isValidIsoDate(r.date)) {
      excludedInvalidCount += 1;
      continue;
    }
    if (r.date >= targetDate) {
      continue;
    }
    if (!Number.isFinite(r.quantitySold) || r.quantitySold < 0) {
      excludedInvalidCount += 1;
      continue;
    }
    if (isClosedServiceDate(r.date, config)) {
      excludedClosedCount += 1;
      continue;
    }

    const normalizedDow = getDayOfWeekFromIso(r.date);
    const existing = byDate.get(r.date);
    if (existing) {
      byDate.set(r.date, {
        ...existing,
        dayOfWeek: normalizedDow,
        quantitySold: existing.quantitySold + r.quantitySold,
        revenue: existing.revenue + (Number.isFinite(r.revenue) && r.revenue >= 0 ? r.revenue : 0)
      });
    } else {
      byDate.set(r.date, {
        ...r,
        dayOfWeek: normalizedDow,
        revenue: Number.isFinite(r.revenue) && r.revenue >= 0 ? r.revenue : 0
      });
    }
  }

  const validRecords = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  return { validRecords, excludedInvalidCount, excludedClosedCount };
}

export function evaluateDataSufficiency(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  config: ForecastConfig = DEFAULT_FORECAST_CONFIG
): DataSufficiencyStatus {
  const targetDayOfWeek = getDayOfWeekFromIso(targetDate);
  const { validRecords, excludedInvalidCount, excludedClosedCount } = sanitizeHistoricalRecords(
    salesHistory,
    dishId,
    targetDate,
    config
  );

  const sameWeekdayRecords = validRecords.filter(r => r.dayOfWeek === targetDayOfWeek);
  const totalDays = validRecords.length;
  const sameWeekdayCount = sameWeekdayRecords.length;

  if (sameWeekdayCount >= config.lookbackWeeks && totalDays >= 28) {
    return {
      isSufficient: true,
      totalDays,
      sameWeekdayCount,
      excludedInvalidCount,
      excludedClosedCount,
      status: 'optimal',
      message: `Optimal depth: ${sameWeekdayCount} matching weekday cycles across ${totalDays} operating days.`
    };
  }

  if (sameWeekdayCount >= 2 && totalDays >= 14) {
    return {
      isSufficient: true,
      totalDays,
      sameWeekdayCount,
      excludedInvalidCount,
      excludedClosedCount,
      status: 'moderate',
      message: `Moderate depth: ${sameWeekdayCount} matching weekdays across ${totalDays} operating days. Wider confidence intervals applied.`
    };
  }

  return {
    isSufficient: false,
    totalDays,
    sameWeekdayCount,
    excludedInvalidCount,
    excludedClosedCount,
    status: 'insufficient',
    message: `Limited history (${sameWeekdayCount} matching weekdays, ${totalDays} days). Transparent fallback baseline applied.`
  };
}

export function calculateNaiveBaseline(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  config: ForecastConfig = DEFAULT_FORECAST_CONFIG
): number {
  const { validRecords } = sanitizeHistoricalRecords(salesHistory, dishId, targetDate, config);
  if (validRecords.length === 0) return config.defaultColdStartBaseline;

  const sevenDaysAgo = addDaysIso(targetDate, -7);
  const matched = validRecords.find(r => r.date === sevenDaysAgo);
  if (matched) return Math.round(matched.quantitySold);

  const targetDow = getDayOfWeekFromIso(targetDate);
  const sameDow = validRecords.find(r => r.dayOfWeek === targetDow);
  if (sameDow) return Math.round(sameDow.quantitySold);

  return Math.round(validRecords[0].quantitySold);
}

export function calculateWeightedMovingAverage(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  config: ForecastConfig = DEFAULT_FORECAST_CONFIG
): { baseForecast: number; stdDev: number; historicalPoints: number[] } {
  const targetDayOfWeek = getDayOfWeekFromIso(targetDate);
  const { validRecords } = sanitizeHistoricalRecords(salesHistory, dishId, targetDate, config);

  const sameDayRecords = validRecords
    .filter(r => r.dayOfWeek === targetDayOfWeek)
    .slice(0, config.lookbackWeeks);

  if (sameDayRecords.length === 0) {
    const recentRecords = validRecords.slice(0, 14);
    if (recentRecords.length === 0) {
      return {
        baseForecast: config.defaultColdStartBaseline,
        stdDev: Math.max(3, Math.round(config.defaultColdStartBaseline * 0.25)),
        historicalPoints: []
      };
    }

    const quantities = recentRecords.map(r => r.quantitySold);
    const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
    return {
      baseForecast: Math.max(0, Math.round(mean)),
      stdDev: Math.max(2, Math.round(Math.sqrt(variance) * 10) / 10),
      historicalPoints: quantities
    };
  }

  const quantities = sameDayRecords.map(r => r.quantitySold);
  const configuredWeights = config.weekdayWeights.length >= quantities.length
    ? config.weekdayWeights.slice(0, quantities.length)
    : quantities.map((_, idx) => Math.max(0.05, 1 / (idx + 1)));

  const weightSum = configuredWeights.reduce((sum, w) => sum + w, 0);
  if (weightSum <= 0) {
    const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    return {
      baseForecast: Math.round(mean),
      stdDev: 2.5,
      historicalPoints: quantities
    };
  }

  let weightedSum = 0;
  for (let i = 0; i < quantities.length; i++) {
    weightedSum += quantities[i] * configuredWeights[i];
  }

  const baseForecast = Math.max(0, Math.round(weightedSum / weightSum));
  const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
  const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
  const sampleFactor = quantities.length < 3 ? 1.35 : 1.0;
  const stdDev = Math.max(1.5, Math.sqrt(variance) * sampleFactor);

  return { baseForecast, stdDev, historicalPoints: quantities };
}

export function calculateRecentTrendModifier(
  salesHistory: SaleRecord[],
  dishId: string,
  targetDate: string,
  config: ForecastConfig = DEFAULT_FORECAST_CONFIG
): number {
  const { validRecords } = sanitizeHistoricalRecords(salesHistory, dishId, targetDate, config);
  const recentRecords = validRecords.slice(0, 7);
  const earlierRecords = validRecords.slice(7, 14);

  if (recentRecords.length < 5 || earlierRecords.length < 5) return 0;

  const recentAvg = recentRecords.reduce((sum, r) => sum + r.quantitySold, 0) / recentRecords.length;
  const earlierAvg = earlierRecords.reduce((sum, r) => sum + r.quantitySold, 0) / earlierRecords.length;

  if (earlierAvg <= 0) return 0;

  const trendDelta = (recentAvg - earlierAvg) / earlierAvg;
  return Math.max(-0.10, Math.min(0.10, Math.round(trendDelta * 100) / 100));
}

export function evaluateBacktestMetrics(
  salesHistory: SaleRecord[],
  dishId: string,
  dishName: string,
  lookbackDays: number = 14,
  config: ForecastConfig = DEFAULT_FORECAST_CONFIG
): ModelAccuracyEvaluation {
  const sanitized = salesHistory
    .filter(
      r =>
        r &&
        r.menuItemId === dishId &&
        isValidIsoDate(r.date) &&
        Number.isFinite(r.quantitySold) &&
        r.quantitySold >= 0 &&
        !isClosedServiceDate(r.date, config)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sanitized.length < 15) {
    return {
      dishId,
      dishName,
      evaluatedDaysCount: 0,
      naiveMae: 0,
      naiveMape: 0,
      wmaMae: 0,
      wmaMape: 0,
      wmaRmse: 0,
      wmaBias: 0,
      accuracyImprovementPct: 0,
      forecastBias: 'Balanced',
      evaluationNote: `Requires at least 15 operating days for rolling-origin evaluation (${sanitized.length} available).`
    };
  }

  const windowSize = Math.min(lookbackDays, sanitized.length - 7);
  const testRecords = sanitized.slice(sanitized.length - windowSize);

  let naiveTotalError = 0;
  let naiveTotalPctError = 0;
  let wmaTotalError = 0;
  let wmaTotalPctError = 0;
  let wmaSquaredErrorSum = 0;
  let wmaBiasSum = 0;
  let validEvalCount = 0;

  for (const actual of testRecords) {
    const historyBeforeDate = sanitized.filter(r => r.date < actual.date);
    if (historyBeforeDate.length === 0) continue;

    const naivePred = calculateNaiveBaseline(historyBeforeDate, dishId, actual.date, config);
    const { baseForecast } = calculateWeightedMovingAverage(historyBeforeDate, dishId, actual.date, config);

    const naiveErr = Math.abs(naivePred - actual.quantitySold);
    const wmaErr = Math.abs(baseForecast - actual.quantitySold);

    naiveTotalError += naiveErr;
    naiveTotalPctError += naiveErr / Math.max(1, actual.quantitySold);
    wmaTotalError += wmaErr;
    wmaTotalPctError += wmaErr / Math.max(1, actual.quantitySold);
    wmaSquaredErrorSum += Math.pow(wmaErr, 2);
    wmaBiasSum += baseForecast - actual.quantitySold;
    validEvalCount += 1;
  }

  if (validEvalCount === 0) {
    return {
      dishId,
      dishName,
      evaluatedDaysCount: 0,
      naiveMae: 0,
      naiveMape: 0,
      wmaMae: 0,
      wmaMape: 0,
      wmaRmse: 0,
      wmaBias: 0,
      accuracyImprovementPct: 0,
      forecastBias: 'Balanced',
      evaluationNote: 'Insufficient strictly prior observations for evaluation.'
    };
  }

  const naiveMae = Math.round((naiveTotalError / validEvalCount) * 10) / 10;
  const naiveMape = Math.round((naiveTotalPctError / validEvalCount) * 1000) / 10;
  const wmaMae = Math.round((wmaTotalError / validEvalCount) * 10) / 10;
  const wmaMape = Math.round((wmaTotalPctError / validEvalCount) * 1000) / 10;
  const wmaRmse = Math.round(Math.sqrt(wmaSquaredErrorSum / validEvalCount) * 10) / 10;
  const wmaBias = Math.round((wmaBiasSum / validEvalCount) * 10) / 10;

  const accuracyImprovementPct = naiveMape > 0
    ? Math.round(((naiveMape - wmaMape) / naiveMape) * 1000) / 10
    : 0;

  const forecastBias = wmaBias > 1.2
    ? 'Over-forecasting'
    : wmaBias < -1.2
    ? 'Under-forecasting'
    : 'Balanced';

  return {
    dishId,
    dishName,
    evaluatedDaysCount: validEvalCount,
    naiveMae,
    naiveMape,
    wmaMae,
    wmaMape,
    wmaRmse,
    wmaBias,
    accuracyImprovementPct,
    forecastBias,
    evaluationNote: `Evaluated across ${validEvalCount} out-of-sample days without lookahead leakage.`
  };
}

export function calculateHeuristicContextModifier(
  dish: MenuItem,
  dayOfWeek: number,
  weather: { condition: string; temperatureC: number; precipChance: number },
  eventContext: string
): { modifierPct: number; rationaleParts: string[] } {
  let modifierPct = 0;
  const rationaleParts: string[] = [];

  if (weather.condition === 'Rain' || weather.condition === 'Storm' || weather.precipChance >= 60) {
    if (dish.station === 'Saute') {
      modifierPct += 0.16;
      rationaleParts.push('Rain & cool temp (+16% warm saute entrees)');
    } else if (dish.station === 'Garde Manger') {
      modifierPct -= 0.14;
      rationaleParts.push('Precipitation reduces cold salad walk-ins (-14%)');
    } else if (dish.station === 'Bakery') {
      modifierPct += 0.05;
      rationaleParts.push('Comfort bread accompaniment demand (+5%)');
    }
  } else if ((weather.condition === 'Clear' && weather.temperatureC >= 22) || weather.temperatureC >= 28) {
    if (dish.station === 'Garde Manger') {
      modifierPct += 0.18;
      rationaleParts.push('Warm clear weather lifts cold salads (+18%)');
    } else if (dish.station === 'Saute') {
      modifierPct -= 0.08;
      rationaleParts.push('Warm weather moderates heavy cream pasta (-8%)');
    }
  }

  const lowerEvent = eventContext.toLowerCase();
  if (lowerEvent.includes('friday') || lowerEvent.includes('payday') || dayOfWeek === 5) {
    if (dish.id.includes('steak') || dish.station === 'Grill') {
      modifierPct += 0.12;
      rationaleParts.push('Friday protein & grill uplift (+12%)');
    }
  }

  if (lowerEvent.includes('theater') || lowerEvent.includes('fair') || lowerEvent.includes('holiday') || lowerEvent.includes('marathon')) {
    modifierPct += 0.10;
    rationaleParts.push('Local foot-traffic event boost (+10%)');
  }

  return { modifierPct, rationaleParts };
}

export function clampAdjustmentMultiplier(
  rawMultiplier: number,
  maxDecreasePct: number,
  maxIncreasePct: number
): number {
  if (!Number.isFinite(rawMultiplier)) return 0;
  const minClamp = -1 * (Math.max(0, maxDecreasePct) / 100);
  const maxClamp = Math.max(0, maxIncreasePct) / 100;
  return Math.max(minClamp, Math.min(maxClamp, rawMultiplier));
}

export function generateComprehensiveForecast(
  dish: MenuItem,
  salesHistory: SaleRecord[],
  targetDate: string,
  weather: { condition: string; temperatureC: number; precipChance: number },
  eventContext: string,
  config: ForecastConfig = DEFAULT_FORECAST_CONFIG,
  aiAdjustment?: ContextualDishAdjustment | null
): DishForecastResult {
  const dayOfWeek = getDayOfWeekFromIso(targetDate);
  const dataSufficiency = evaluateDataSufficiency(salesHistory, dish.id, targetDate, config);
  const naivePrediction = calculateNaiveBaseline(salesHistory, dish.id, targetDate, config);
  const { baseForecast, stdDev } = calculateWeightedMovingAverage(salesHistory, dish.id, targetDate, config);

  const stationBuffer = (config.stationBuffers[dish.station] ?? 8) / 100;

  if (isClosedServiceDate(targetDate, config)) {
    return {
      dishId: dish.id,
      dishName: dish.name,
      station: dish.station,
      category: dish.category,
      targetDate,
      dayOfWeek,
      isClosedDay: true,
      dataSufficiency,
      naivePrediction: 0,
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
      confidenceScore: 1,
      rationale: 'Restaurant configured as closed for this service date. Prep par set to 0.',
      riskOfWaste: 'Low',
      predictionSource: 'closed-day'
    };
  }

  const trendAdjustmentPct = calculateRecentTrendModifier(salesHistory, dish.id, targetDate, config);

  let rawModifierPct: number;
  let rationale: string;
  let riskOfWaste: 'Low' | 'Medium' | 'High';
  let predictionSource: 'ai-assisted' | 'deterministic-fallback' = 'deterministic-fallback';

  if (aiAdjustment) {
    rawModifierPct = aiAdjustment.suggestedMultiplier + trendAdjustmentPct * 0.5;
    rationale = aiAdjustment.rationale;
    riskOfWaste = aiAdjustment.riskOfWaste;
    predictionSource = 'ai-assisted';
  } else {
    const heuristic = calculateHeuristicContextModifier(dish, dayOfWeek, weather, eventContext);
    rawModifierPct = trendAdjustmentPct + heuristic.modifierPct;
    const rationaleParts: string[] = [];
    if (trendAdjustmentPct !== 0) {
      rationaleParts.push(
        `7-day trend (${trendAdjustmentPct > 0 ? '+' : ''}${Math.round(trendAdjustmentPct * 100)}%)`
      );
    }
    rationaleParts.push(...heuristic.rationaleParts);
    if (!dataSufficiency.isSufficient) {
      rationaleParts.push('Cold-start baseline fallback active');
    }
    rationale = rationaleParts.length > 0
      ? `${rationaleParts.join('; ')}.`
      : 'Steady 4-week same-weekday baseline forecast.';
    riskOfWaste = rawModifierPct < -0.10 || dish.station === 'Bakery'
      ? 'High'
      : rawModifierPct > 0.15
      ? 'Medium'
      : 'Low';
  }

  const clampedModifierPct = clampAdjustmentMultiplier(
    rawModifierPct,
    config.maxDecreasePct,
    config.maxIncreasePct
  );

  const expectedSales = Math.max(0, Math.round(baseForecast * (1 + clampedModifierPct)));
  const effectiveStdDev = dataSufficiency.status === 'optimal'
    ? stdDev
    : dataSufficiency.status === 'moderate'
    ? stdDev * 1.25
    : Math.max(stdDev * 1.5, baseForecast * 0.25);

  const z80 = 1.28;
  const z95 = 1.96;
  const interval80Min = Math.max(0, Math.round(expectedSales - z80 * effectiveStdDev));
  const interval80Max = Math.round(expectedSales + z80 * effectiveStdDev);
  const interval95Min = Math.max(0, Math.round(expectedSales - z95 * effectiveStdDev));
  const interval95Max = Math.round(expectedSales + z95 * effectiveStdDev);

  const extraUncertaintyBuffer = dataSufficiency.isSufficient ? 0 : 0.03;
  const effectiveBuffer = stationBuffer + extraUncertaintyBuffer;
  const recommendedPrep = expectedSales > 0 ? Math.ceil(expectedSales * (1 + effectiveBuffer)) : 0;

  const cv = baseForecast > 0 ? effectiveStdDev / baseForecast : 0.5;
  const depthPenalty = dataSufficiency.status === 'optimal' ? 0 : dataSufficiency.status === 'moderate' ? 0.12 : 0.28;
  const confidenceScore = Math.max(0.35, Math.min(0.96, Math.round((0.95 - cv * 0.6 - depthPenalty) * 100) / 100));

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
    contextModifierPct: Math.round(rawModifierPct * 100) / 100,
    clampedModifierPct: Math.round(clampedModifierPct * 100) / 100,
    expectedSales,
    confidenceInterval80: [interval80Min, interval80Max],
    confidenceInterval95: [interval95Min, interval95Max],
    safetyBufferPct: Math.round(effectiveBuffer * 1000) / 1000,
    recommendedPrep,
    historicalVolatilityStdDev: Math.round(effectiveStdDev * 10) / 10,
    confidenceScore,
    rationale,
    riskOfWaste,
    predictionSource
  };
}
