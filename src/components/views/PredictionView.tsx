import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  WifiOff
} from 'lucide-react';
import {
  ContextualDishAdjustment,
  ForecastConfig,
  Ingredient,
  MenuItem,
  PredictionRecord,
  SaleRecord
} from '../../types';
import {
  DishForecastResult,
  ModelAccuracyEvaluation,
  evaluateBacktestMetrics,
  generateComprehensiveForecast
} from '../../engine/forecastingEngine';
import { decomposePrepSheet } from '../../engine/prepEngine';
import { requestContextualForecast } from '../../services/contextualForecastService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface PredictionViewProps {
  businessDate: string;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  salesRecords: SaleRecord[];
  forecastConfig: ForecastConfig;
  existingPrediction: PredictionRecord | null;
  onSavePrediction: (prediction: PredictionRecord) => void;
  onApplyForecastToPrep: (adjustments: Record<string, number>) => void;
}

export const PredictionView: React.FC<PredictionViewProps> = ({
  businessDate,
  menuItems,
  ingredients,
  salesRecords,
  forecastConfig,
  existingPrediction,
  onSavePrediction,
  onApplyForecastToPrep
}) => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'evaluation'>('forecast');
  const [weatherCondition, setWeatherCondition] = useState<'Clear' | 'Rain' | 'Cloudy' | 'Storm'>(
    (existingPrediction?.weatherForecast.condition as 'Clear' | 'Rain' | 'Cloudy' | 'Storm') || 'Rain'
  );
  const [temperatureC, setTemperatureC] = useState<number>(
    existingPrediction?.weatherForecast.temperatureC ?? 13
  );
  const [rainChance, setRainChance] = useState<number>(
    existingPrediction?.weatherForecast.precipitationProbability ?? 75
  );
  const [eventTag, setEventTag] = useState<string>(
    existingPrediction?.eventContext || 'Payday Friday + Theater Event'
  );

  const [isRunningAi, setIsRunningAi] = useState<boolean>(false);
  const [aiAssessment, setAiAssessment] = useState<string | null>(
    existingPrediction?.generalAssessment || null
  );
  const [aiModelVersion, setAiModelVersion] = useState<string>(
    existingPrediction?.modelVersion || 'local-heuristic-fallback'
  );
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(
    existingPrediction?.isOfflineFallback ?? true
  );
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [aiAdjustmentsByDish, setAiAdjustmentsByDish] = useState<Record<string, ContextualDishAdjustment>>({});
  const [appliedToast, setAppliedToast] = useState<boolean>(false);

  const activeMenu = useMemo(
    () => menuItems.filter(m => m.isActive !== false),
    [menuItems]
  );

  const forecastResults: DishForecastResult[] = useMemo(() => {
    return activeMenu.map(dish =>
      generateComprehensiveForecast(
        dish,
        salesRecords,
        businessDate,
        { condition: weatherCondition, temperatureC, precipChance: rainChance },
        eventTag,
        forecastConfig,
        aiAdjustmentsByDish[dish.id] || null
      )
    );
  }, [activeMenu, salesRecords, businessDate, weatherCondition, temperatureC, rainChance, eventTag, forecastConfig, aiAdjustmentsByDish]);

  const evaluationResults: ModelAccuracyEvaluation[] = useMemo(() => {
    return activeMenu.map(dish =>
      evaluateBacktestMetrics(salesRecords, dish.id, dish.name, 14, forecastConfig)
    );
  }, [activeMenu, salesRecords, forecastConfig]);

  const evaluableDishes = evaluationResults.filter(e => e.evaluatedDaysCount > 0);

  const avgNaiveMape = useMemo(() => {
    if (evaluableDishes.length === 0) return 0;
    const sum = evaluableDishes.reduce((s, r) => s + r.naiveMape, 0);
    return Math.round((sum / evaluableDishes.length) * 10) / 10;
  }, [evaluableDishes]);

  const avgWmaMape = useMemo(() => {
    if (evaluableDishes.length === 0) return 0;
    const sum = evaluableDishes.reduce((s, r) => s + r.wmaMape, 0);
    return Math.round((sum / evaluableDishes.length) * 10) / 10;
  }, [evaluableDishes]);

  const avgMae = useMemo(() => {
    if (evaluableDishes.length === 0) return 0;
    const sum = evaluableDishes.reduce((s, r) => s + r.wmaMae, 0);
    return Math.round((sum / evaluableDishes.length) * 10) / 10;
  }, [evaluableDishes]);

  const avgImprovement = useMemo(() => {
    if (avgNaiveMape === 0) return 0;
    return Math.round(((avgNaiveMape - avgWmaMape) / avgNaiveMape) * 1000) / 10;
  }, [avgNaiveMape, avgWmaMape]);

  const handleRunHybridForecast = async () => {
    if (activeMenu.length === 0) return;
    setIsRunningAi(true);
    setFallbackNotice(null);

    const baseInputs = activeMenu.map(dish => {
      const statOnly = generateComprehensiveForecast(
        dish,
        salesRecords,
        businessDate,
        { condition: weatherCondition, temperatureC, precipChance: rainChance },
        eventTag,
        forecastConfig
      );
      return {
        item: dish,
        baseSales: statOnly.baseStatisticalForecast,
        recentAverage: statOnly.naivePrediction
      };
    });

    const response = await requestContextualForecast({
      targetDate: businessDate,
      weather: { condition: weatherCondition, temperatureC, precipChance: rainChance },
      eventContext: eventTag,
      dishes: baseInputs,
      config: forecastConfig
    });

    const adjMap: Record<string, ContextualDishAdjustment> = {};
    for (const adj of response.adjustments) {
      adjMap[adj.dishId] = adj;
    }

    setAiAdjustmentsByDish(adjMap);
    setAiAssessment(response.generalAssessment);
    setAiModelVersion(response.modelVersion);
    setIsOfflineFallback(response.isOfflineFallback);
    if (response.isOfflineFallback && response.fallbackReason) {
      setFallbackNotice(response.fallbackReason);
    }

    const updatedForecasts = activeMenu.map(dish =>
      generateComprehensiveForecast(
        dish,
        salesRecords,
        businessDate,
        { condition: weatherCondition, temperatureC, precipChance: rainChance },
        eventTag,
        forecastConfig,
        adjMap[dish.id] || null
      )
    );

    const decomposed = decomposePrepSheet(businessDate, activeMenu, ingredients, updatedForecasts, {});
    const predRecord: PredictionRecord = {
      id: `pred_${businessDate}_rst_rustic_table`,
      restaurantId: 'rst_rustic_table',
      targetDate: businessDate,
      weatherForecast: {
        condition: weatherCondition,
        temperatureC,
        precipitationProbability: rainChance
      },
      eventContext: eventTag,
      generalAssessment: response.generalAssessment,
      modelVersion: response.modelVersion,
      isOfflineFallback: response.isOfflineFallback,
      createdAt: Date.now(),
      itemPredictions: updatedForecasts.map(f => {
        const plan = decomposed.dishPlans.find(p => p.dishId === f.dishId);
        return {
          menuItemId: f.dishId,
          dishName: f.dishName,
          station: f.station,
          baseCalculated: f.baseStatisticalForecast,
          aiAdjusted: f.expectedSales,
          recommendedPrep: f.recommendedPrep,
          managerOverride: null,
          safetyBufferPct: f.safetyBufferPct,
          confidenceScore: f.confidenceScore,
          rationale: f.rationale,
          riskOfWaste: f.riskOfWaste,
          requiredIngredients: (plan?.ingredientBreakdowns || []).map(b => ({
            ingredientId: b.ingredientId,
            name: b.ingredientName,
            grossRequired: b.grossInStockUnit,
            currentStock: b.currentStock,
            netRequired: Math.max(0, Math.round((b.grossInStockUnit - b.currentStock) * 100) / 100),
            unit: b.stockUnit
          }))
        };
      })
    };

    onSavePrediction(predRecord);
    setIsRunningAi(false);
  };

  const handleCommitToPrep = () => {
    const adjustments: Record<string, number> = {};
    forecastResults.forEach(res => {
      adjustments[res.dishId] = res.recommendedPrep;
    });
    onApplyForecastToPrep(adjustments);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Hybrid Sales Forecasting & Context Simulator
            </h2>
            <span className="text-xs text-slate-500">
              · {isOfflineFallback ? 'Deterministic Statistical Baseline' : `AI-Assisted (${aiModelVersion})`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {forecastConfig.lookbackWeeks}-week same-weekday WMA without lookahead leakage, bounded within [-{forecastConfig.maxDecreasePct}%, +{forecastConfig.maxIncreasePct}%]
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'forecast'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demand Forecast
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'evaluation'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Accuracy & Backtesting
            </button>
          </div>

          {activeTab === 'forecast' && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleCommitToPrep}
              className="whitespace-nowrap shrink-0"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Push to Prep Sheet
            </Button>
          )}
        </div>
      </div>

      {appliedToast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Recommended prep targets pushed to the Station Prep Sheet.</span>
        </div>
      )}

      {fallbackNotice && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            AI contextual endpoint unavailable ({fallbackNotice}). Deterministic statistical heuristics applied seamlessly.
          </span>
        </div>
      )}

      {activeTab === 'forecast' ? (
        <>
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Weather & Local Event Context
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Statistical baseline runs locally; click Run Hybrid AI Forecast to request server-side Gemini contextual modifiers.
                </p>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={handleRunHybridForecast}
                isLoading={isRunningAi}
                className="whitespace-nowrap shrink-0"
                leftIcon={isRunningAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              >
                Run Hybrid AI Forecast
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Weather Condition
                </label>
                <select
                  value={weatherCondition}
                  onChange={e => setWeatherCondition(e.target.value as 'Clear' | 'Rain' | 'Cloudy' | 'Storm')}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Clear">Clear & Sunny</option>
                  <option value="Rain">Light / Steady Rain</option>
                  <option value="Storm">Heavy Thunderstorm</option>
                  <option value="Cloudy">Overcast / Cloudy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Temperature: <span className="font-mono font-tabular-nums">{temperatureC}°C ({Math.round(temperatureC * 1.8 + 32)}°F)</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="36"
                  value={temperatureC}
                  onChange={e => setTemperatureC(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Precipitation Probability: <span className="font-mono font-tabular-nums">{rainChance}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={rainChance}
                  onChange={e => setRainChance(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Calendar & Foot Traffic Event
                </label>
                <select
                  value={eventTag}
                  onChange={e => setEventTag(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Regular Service">Regular Service Day</option>
                  <option value="Payday Friday + Theater Event">Payday Friday + Theater Event</option>
                  <option value="Public Holiday Long Weekend">Public Holiday Long Weekend</option>
                  <option value="Neighborhood Street Fair">Neighborhood Street Fair</option>
                </select>
              </div>
            </div>

            {aiAssessment && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {isOfflineFallback ? 'Deterministic Heuristic Assessment' : 'Gemini Contextual Assessment'}
                  </span>
                  <Badge variant={isOfflineFallback ? 'amber' : 'emerald'} size="sm">
                    {isOfflineFallback ? 'Offline / Fallback' : 'AI Verified'}
                  </Badge>
                </div>
                <p className="text-slate-700 leading-relaxed">{aiAssessment}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">Bounded Safety Constraints Enforced</p>
                <p className="text-slate-400">
                  All multipliers are programmatically clamped to [-{forecastConfig.maxDecreasePct}%, +{forecastConfig.maxIncreasePct}%] relative to the statistical WMA baseline.
                </p>
              </div>
            </div>
            <Badge variant="emerald" size="sm">Clamping Active</Badge>
          </div>

          <Card
            title="Dish-by-Dish Demand Forecast & Uncertainty Intervals"
            subtitle="4-week same-weekday WMA baseline, bounded adjustment, 80% / 95% intervals, and data sufficiency status"
            noPadding
          >
            {forecastResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active menu dishes available to forecast. Add menu items first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-4 font-semibold">Menu Dish</th>
                      <th className="py-2.5 px-3 font-semibold">Station</th>
                      <th className="py-2.5 px-3 font-semibold text-right">4-Wk Base</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Delta</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Expected</th>
                      <th className="py-2.5 px-3 font-semibold text-center">80% Band</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Rec. Prep</th>
                      <th className="py-2.5 px-3 font-semibold">Waste Risk</th>
                      <th className="py-2.5 px-4 font-semibold">Data Depth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {forecastResults.map(res => {
                      const isPositive = res.clampedModifierPct > 0;
                      const isNegative = res.clampedModifierPct < 0;

                      return (
                        <tr key={res.dishId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div>
                              <p>{res.dishName}</p>
                              <p className="text-xs font-normal text-slate-500 mt-0.5">{res.rationale}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="slate" size="sm">{res.station}</Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600 font-tabular-nums">
                            {res.baseStatisticalForecast}
                          </td>
                          <td className="py-3 px-3 text-right font-bold font-tabular-nums">
                            <span className={isPositive ? 'text-emerald-700' : isNegative ? 'text-amber-700' : 'text-slate-500'}>
                              {isPositive ? `+${Math.round(res.clampedModifierPct * 100)}%` : isNegative ? `${Math.round(res.clampedModifierPct * 100)}%` : '0%'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-tabular-nums text-sm">
                            {res.expectedSales}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 font-tabular-nums whitespace-nowrap">
                            [{res.confidenceInterval80[0]} - {res.confidenceInterval80[1]}]
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-800 font-tabular-nums text-sm">
                            {res.recommendedPrep}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={res.riskOfWaste === 'High' ? 'rose' : res.riskOfWaste === 'Medium' ? 'amber' : 'emerald'}
                              size="sm"
                            >
                              {res.riskOfWaste}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                res.dataSufficiency.status === 'optimal'
                                  ? 'emerald'
                                  : res.dataSufficiency.status === 'moderate'
                                  ? 'blue'
                                  : 'amber'
                              }
                              size="sm"
                            >
                              {res.dataSufficiency.status === 'optimal'
                                ? 'Optimal'
                                : res.dataSufficiency.status === 'moderate'
                                ? 'Moderate'
                                : 'Insufficient'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          {evaluableDishes.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Rolling-origin backtesting requires at least 15 distinct operating days per dish. Currently showing fallback status for dishes with shorter histories.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-medium text-slate-500">
                WMA Forecast MAPE
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">
                {avgWmaMape}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Mean Absolute % Error</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-medium text-slate-500">
                Naive Baseline MAPE
              </p>
              <p className="text-2xl font-bold text-slate-700 mt-1 font-tabular-nums">
                {avgNaiveMape}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Same-Day-Last-Week Model</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-medium text-slate-500">
                Error Reduction vs Naive
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">
                {avgImprovement >= 0 ? `+${avgImprovement}%` : `${avgImprovement}%`}
              </p>
              <p className="text-xs text-slate-500 mt-1">Relative MAPE comparison</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-medium text-slate-500">
                Average Portion MAE
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
                {avgMae} portions
              </p>
              <p className="text-xs text-slate-500 mt-1">Mean absolute error per dish</p>
            </div>
          </div>

          <Card
            title="Rolling-Origin Backtesting Matrix (Zero Future Data Leakage)"
            subtitle="Compares 4-week weighted moving average against naive same-day-last-week baseline using strictly prior dates"
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Menu Dish</th>
                    <th className="py-3 px-3 text-right">Eval Days</th>
                    <th className="py-3 px-3 text-right">Naive MAE</th>
                    <th className="py-3 px-3 text-right">Naive MAPE</th>
                    <th className="py-3 px-3 text-right">WMA MAE</th>
                    <th className="py-3 px-3 text-right">WMA MAPE</th>
                    <th className="py-3 px-3 text-right">WMA RMSE</th>
                    <th className="py-3 px-3 text-right">Gain</th>
                    <th className="py-3 px-4">Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluationResults.map(evalItem => (
                    <tr key={evalItem.dishId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div>
                          <p>{evalItem.dishName}</p>
                          {evalItem.evaluatedDaysCount === 0 && (
                            <p className="text-xs font-normal text-amber-700">{evalItem.evaluationNote}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">
                        {evalItem.evaluatedDaysCount}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">
                        {evalItem.naiveMae}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">
                        {evalItem.naiveMape}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-tabular-nums">
                        {evalItem.wmaMae}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-tabular-nums">
                        {evalItem.wmaMape}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-tabular-nums">
                        {evalItem.wmaRmse}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800 font-tabular-nums">
                        {evalItem.accuracyImprovementPct >= 0 ? `+${evalItem.accuracyImprovementPct}%` : `${evalItem.accuracyImprovementPct}%`}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={evalItem.forecastBias === 'Balanced' ? 'emerald' : 'amber'}
                          size="sm"
                        >
                          {evalItem.forecastBias}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
