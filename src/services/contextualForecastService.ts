import { z } from 'zod';
import {
  ContextualDishAdjustment,
  ContextualForecastResponse,
  ForecastConfig,
  DEFAULT_FORECAST_CONFIG,
  MenuItem
} from '../types';
import {
  calculateHeuristicContextModifier,
  clampAdjustmentMultiplier,
  getDayOfWeekFromIso
} from '../engine/forecastingEngine';

const ServerResponseSchema = z.object({
  modelVersion: z.string(),
  generalAssessment: z.string(),
  adjustments: z.array(
    z.object({
      dishId: z.string(),
      suggestedMultiplier: z.number().finite(),
      clampedMultiplier: z.number().finite(),
      rationale: z.string(),
      riskOfWaste: z.enum(['Low', 'Medium', 'High'])
    })
  ),
  isOfflineFallback: z.boolean()
});

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export function buildDeterministicFallbackResponse(
  dishes: MenuItem[],
  targetDate: string,
  weather: { condition: string; temperatureC: number; precipChance: number },
  eventContext: string,
  config: ForecastConfig,
  reason: string
): ContextualForecastResponse {
  const dayOfWeek = getDayOfWeekFromIso(targetDate);

  const adjustments: ContextualDishAdjustment[] = dishes.map(dish => {
    const heuristic = calculateHeuristicContextModifier(dish, dayOfWeek, weather, eventContext);
    const clamped = clampAdjustmentMultiplier(
      heuristic.modifierPct,
      config.maxDecreasePct,
      config.maxIncreasePct
    );

    return {
      dishId: dish.id,
      suggestedMultiplier: Math.round(heuristic.modifierPct * 1000) / 1000,
      clampedMultiplier: Math.round(clamped * 1000) / 1000,
      rationale:
        heuristic.rationaleParts.length > 0
          ? `${heuristic.rationaleParts.join('; ')} (local statistical heuristic).`
          : 'Steady 4-week weekday baseline (local statistical heuristic).',
      riskOfWaste: clamped < -0.10 || dish.station === 'Bakery' ? 'High' : clamped > 0.15 ? 'Medium' : 'Low'
    };
  });

  return {
    modelVersion: 'local-heuristic-fallback',
    generalAssessment: `Using deterministic local heuristics for ${WEEKDAY_NAMES[dayOfWeek]} (${weather.condition}, ${weather.temperatureC}C). ${reason}`,
    adjustments,
    isOfflineFallback: true,
    fallbackReason: reason
  };
}

export async function requestContextualForecast(
  params: {
    targetDate: string;
    weather: { condition: string; temperatureC: number; precipChance: number };
    eventContext: string;
    dishes: Array<{
      item: MenuItem;
      baseSales: number;
      recentAverage: number;
    }>;
    config?: ForecastConfig;
  },
  fetchFn: typeof fetch = fetch,
  timeoutMs: number = 14000
): Promise<ContextualForecastResponse> {
  const config = params.config || DEFAULT_FORECAST_CONFIG;
  const menuItems = params.dishes.map(d => d.item);
  const dayOfWeekName = WEEKDAY_NAMES[getDayOfWeekFromIso(params.targetDate)] || 'Day';

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return buildDeterministicFallbackResponse(
      menuItems,
      params.targetDate,
      params.weather,
      params.eventContext,
      config,
      'Device is offline.'
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn('/api/forecast/contextualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        targetDate: params.targetDate,
        dayOfWeek: dayOfWeekName,
        weatherForecast: {
          condition: params.weather.condition,
          temperatureC: params.weather.temperatureC,
          precipitationProbability: params.weather.precipChance
        },
        eventContext: params.eventContext,
        bounds: {
          maxDecreasePct: config.maxDecreasePct,
          maxIncreasePct: config.maxIncreasePct
        },
        dishes: params.dishes.map(d => ({
          id: d.item.id,
          name: d.item.name,
          station: d.item.station,
          category: d.item.category,
          baseSales: d.baseSales,
          recentAverage: d.recentAverage
        }))
      })
    });

    if (!response.ok) {
      let errReason = `Server returned HTTP ${response.status}.`;
      try {
        const errBody = (await response.json()) as { error?: string };
        if (errBody?.error) errReason = errBody.error;
      } catch {
        errReason = `Server returned HTTP ${response.status}.`;
      }
      return buildDeterministicFallbackResponse(
        menuItems,
        params.targetDate,
        params.weather,
        params.eventContext,
        config,
        errReason
      );
    }

    const rawJson: unknown = await response.json();
    const parsed = ServerResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      return buildDeterministicFallbackResponse(
        menuItems,
        params.targetDate,
        params.weather,
        params.eventContext,
        config,
        'Server returned unexpected forecast payload structure.'
      );
    }

    const safeAdjustments: ContextualDishAdjustment[] = parsed.data.adjustments.map(adj => ({
      dishId: adj.dishId,
      suggestedMultiplier: adj.suggestedMultiplier,
      clampedMultiplier: clampAdjustmentMultiplier(
        adj.suggestedMultiplier,
        config.maxDecreasePct,
        config.maxIncreasePct
      ),
      rationale: adj.rationale,
      riskOfWaste: adj.riskOfWaste
    }));

    return {
      modelVersion: parsed.data.modelVersion,
      generalAssessment: parsed.data.generalAssessment,
      adjustments: safeAdjustments,
      isOfflineFallback: false
    };
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError'
      ? 'Contextual forecast request timed out.'
      : err instanceof Error
      ? err.message
      : 'Network error contacting forecast API.';

    return buildDeterministicFallbackResponse(
      menuItems,
      params.targetDate,
      params.weather,
      params.eventContext,
      config,
      reason
    );
  } finally {
    clearTimeout(timer);
  }
}
