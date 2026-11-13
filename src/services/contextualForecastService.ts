import { ContextualAnalysisResult, MenuItem } from '../types';
import { ContextualCacheRepository } from '../db/repositories';
import { DishForecastResult } from '../engine/forecastingEngine';

const CACHE_TTL_MS = 30 * 60 * 1000;
const CLIENT_TIMEOUT_MS = 14000;

export function buildContextCacheKey(params: {
  targetDate: string;
  condition: string;
  temperatureC: number;
  precipChance: number;
  eventContext: string;
  adjustmentLimitPct: number;
  dishBases: { id: string; baseSales: number }[];
}): string {
  const dishSig = params.dishBases
    .map(d => `${d.id}:${d.baseSales}`)
    .sort()
    .join('|');
  return [
    params.targetDate,
    params.condition,
    params.temperatureC,
    params.precipChance,
    params.eventContext,
    params.adjustmentLimitPct,
    dishSig
  ].join('::');
}

export async function requestContextualForecast(params: {
  targetDate: string;
  weatherForecast: {
    condition: string;
    temperatureC: number;
    precipitationProbability: number;
  };
  eventContext: string;
  adjustmentLimitPct: number;
  menuItems: MenuItem[];
  statisticalForecasts: DishForecastResult[];
  simulateOffline?: boolean;
}): Promise<ContextualAnalysisResult> {
  const activeDishes = params.menuItems.filter(m => m.isActive);
  const dishInputs = activeDishes.map(dish => {
    const stat = params.statisticalForecasts.find(f => f.dishId === dish.id);
    return {
      id: dish.id,
      name: dish.name,
      station: dish.station,
      category: dish.category,
      baseSales: stat ? stat.baseStatisticalForecast : 16
    };
  });

  const cacheKey = buildContextCacheKey({
    targetDate: params.targetDate,
    condition: params.weatherForecast.condition,
    temperatureC: params.weatherForecast.temperatureC,
    precipChance: params.weatherForecast.precipitationProbability,
    eventContext: params.eventContext,
    adjustmentLimitPct: params.adjustmentLimitPct,
    dishBases: dishInputs.map(d => ({ id: d.id, baseSales: d.baseSales }))
  });

  if (params.simulateOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return {
      cacheKey,
      targetDate: params.targetDate,
      modelVersion: 'statistical-fallback',
      adjustmentLimitPct: params.adjustmentLimitPct,
      generalAssessment: 'Gemini contextual intelligence unavailable (offline mode active). Using deterministic statistical baseline and local weather heuristics.',
      adjustments: [],
      isFallback: true,
      fallbackReason: params.simulateOffline ? 'Simulated offline / Gemini unavailable state.' : 'Browser is offline.',
      generatedAt: new Date().toISOString()
    };
  }

  const cached = await ContextualCacheRepository.get(cacheKey);
  if (cached && !cached.isFallback) {
    const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
    if (ageMs >= 0 && ageMs < CACHE_TTL_MS) {
      return cached;
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[new Date(params.targetDate).getDay()] || 'Friday';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch('/api/forecast/contextualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        targetDate: params.targetDate,
        dayOfWeek,
        weatherForecast: params.weatherForecast,
        eventContext: params.eventContext,
        adjustmentLimitPct: params.adjustmentLimitPct,
        dishes: dishInputs
      })
    });

    clearTimeout(timeoutId);

    const json = await response.json();
    if (!response.ok || json.fallbackRequired) {
      return {
        cacheKey,
        targetDate: params.targetDate,
        modelVersion: 'statistical-fallback',
        adjustmentLimitPct: params.adjustmentLimitPct,
        generalAssessment: 'Gemini service unavailable. Continuing uninterrupted with deterministic 4-week statistical forecast.',
        adjustments: [],
        isFallback: true,
        fallbackReason: json.error || `HTTP ${response.status}`,
        generatedAt: new Date().toISOString()
      };
    }

    const result: ContextualAnalysisResult = {
      cacheKey,
      targetDate: params.targetDate,
      modelVersion: json.modelVersion || 'gemini-4-hydrogen',
      adjustmentLimitPct: json.adjustmentLimitPct || params.adjustmentLimitPct,
      generalAssessment: json.generalAssessment || 'Contextual demand briefing ready.',
      adjustments: Array.isArray(json.adjustments) ? json.adjustments : [],
      isFallback: false,
      generatedAt: json.generatedAt || new Date().toISOString()
    };

    await ContextualCacheRepository.save(result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    const reason = err instanceof Error ? err.message : 'Network failure reaching Gemini backend.';
    return {
      cacheKey,
      targetDate: params.targetDate,
      modelVersion: 'statistical-fallback',
      adjustmentLimitPct: params.adjustmentLimitPct,
      generalAssessment: 'Gemini backend unreachable. Continuing with deterministic statistical forecast and safety bounds.',
      adjustments: [],
      isFallback: true,
      fallbackReason: reason,
      generatedAt: new Date().toISOString()
    };
  }
}
