import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  WifiOff,
  CalendarOff,
  AlertTriangle
} from 'lucide-react';
import {
  MenuItem,
  SaleRecord,
  ClosedDayRecord,
  AppSettings,
  ContextualAnalysisResult
} from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  evaluateBacktestMetrics,
  DishForecastResult,
  ModelAccuracyEvaluation
} from '../../engine/forecastingEngine';

interface PredictionViewProps {
  businessDate: string;
  menuItems: MenuItem[];
  salesRecords: SaleRecord[];
  forecasts: DishForecastResult[];
  closedDays: ClosedDayRecord[];
  settings: AppSettings;
  weatherCondition: 'Clear' | 'Rain' | 'Cloudy' | 'Storm';
  temperatureC: number;
  rainChance: number;
  eventTag: string;
  simulateGeminiOffline: boolean;
  contextualAnalysis: ContextualAnalysisResult | null;
  isAnalyzingContext: boolean;
  onWeatherConditionChange: (val: 'Clear' | 'Rain' | 'Cloudy' | 'Storm') => void;
  onTemperatureChange: (val: number) => void;
  onRainChanceChange: (val: number) => void;
  onEventTagChange: (val: string) => void;
  onSimulateGeminiOfflineChange: (val: boolean) => void;
  onRequestContextualAnalysis: () => void;
  onApplyForecastToPrep: (adjustments: Record<string, number>) => void;
}

export const PredictionView: React.FC<PredictionViewProps> = ({
  businessDate,
  menuItems,
  salesRecords,
  forecasts,
  closedDays,
  settings,
  weatherCondition,
  temperatureC,
  rainChance,
  eventTag,
  simulateGeminiOffline,
  contextualAnalysis,
  isAnalyzingContext,
  onWeatherConditionChange,
  onTemperatureChange,
  onRainChanceChange,
  onEventTagChange,
  onSimulateGeminiOfflineChange,
  onRequestContextualAnalysis,
  onApplyForecastToPrep
}) => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'evaluation'>('forecast');
  const [appliedToast, setAppliedToast] = useState<boolean>(false);

  const isClosedDay = closedDays.some(c => c.date === businessDate);

  const evaluationResults: ModelAccuracyEvaluation[] = useMemo(() => {
    return menuItems
      .filter(m => m.isActive)
      .map(dish => evaluateBacktestMetrics(salesRecords, dish.id, dish.name, 14, closedDays));
  }, [menuItems, salesRecords, closedDays]);

  const evaluatedDishes = evaluationResults.filter(e => e.evaluatedDaysCount > 0);

  const avgNaiveMape = useMemo(() => {
    if (evaluatedDishes.length === 0) return 0;
    const sum = evaluatedDishes.reduce((s, r) => s + r.naiveMape, 0);
    return Math.round((sum / evaluatedDishes.length) * 10) / 10;
  }, [evaluatedDishes]);

  const avgWmaMape = useMemo(() => {
    if (evaluatedDishes.length === 0) return 0;
    const sum = evaluatedDishes.reduce((s, r) => s + r.wmaMape, 0);
    return Math.round((sum / evaluatedDishes.length) * 10) / 10;
  }, [evaluatedDishes]);

  const avgMae = useMemo(() => {
    if (evaluatedDishes.length === 0) return 0;
    const sum = evaluatedDishes.reduce((s, r) => s + r.wmaMae, 0);
    return Math.round((sum / evaluatedDishes.length) * 10) / 10;
  }, [evaluatedDishes]);

  const avgImprovement = useMemo(() => {
    if (avgNaiveMape === 0) return 0;
    return Math.round(((avgNaiveMape - avgWmaMape) / avgNaiveMape) * 1000) / 10;
  }, [avgNaiveMape, avgWmaMape]);

  const handleCommitToPrep = () => {
    const adjustments: Record<string, number> = {};
    forecasts.forEach(res => {
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
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-100 text-emerald-800">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Hybrid Sales Forecasting & Gemini Contextual Intelligence
            </h2>
            <Badge variant="emerald" size="sm">±{settings.aiAdjustmentLimitPct}% Bounded Limit</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic 4-week WMA statistical baseline paired with server-side Gemini contextual analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'forecast'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Demand Forecast
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'evaluation'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Model Evaluation & Accuracy
            </button>
          </div>

          {activeTab === 'forecast' && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleCommitToPrep}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Push to Prep Sheet
            </Button>
          )}
        </div>
      </div>

      {isClosedDay && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <CalendarOff className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Restaurant Marked Closed on {businessDate}</p>
            <p className="text-amber-800">
              All dish forecasts and recommended prep quantities are automatically set to 0 for this date.
            </p>
          </div>
        </div>
      )}

      {appliedToast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Forecast targets pushed to the Station Prep Sheet.</span>
        </div>
      )}

      {activeTab === 'forecast' ? (
        <>
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  External Demand Context & Gemini Intelligence Controls
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure weather, temperature, and local events, then request bounded Gemini demand analysis.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={simulateGeminiOffline}
                    onChange={e => onSimulateGeminiOfflineChange(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Simulate Gemini Unavailable</span>
                </label>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={onRequestContextualAnalysis}
                  isLoading={isAnalyzingContext}
                  disabled={isClosedDay}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Run Gemini Context Analysis
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Weather Condition</label>
                <select
                  value={weatherCondition}
                  onChange={e => onWeatherConditionChange(e.target.value as 'Clear' | 'Rain' | 'Cloudy' | 'Storm')}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                >
                  <option value="Clear">Clear & Sunny</option>
                  <option value="Rain">Light / Steady Rain</option>
                  <option value="Storm">Heavy Thunderstorm</option>
                  <option value="Cloudy">Overcast / Cloudy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Temperature: {temperatureC}°C ({Math.round(temperatureC * 1.8 + 32)}°F)
                </label>
                <input
                  type="range"
                  min="2"
                  max="36"
                  value={temperatureC}
                  onChange={e => onTemperatureChange(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Precipitation Probability: {rainChance}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={rainChance}
                  onChange={e => onRainChanceChange(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Calendar & Foot Traffic Event</label>
                <select
                  value={eventTag}
                  onChange={e => onEventTagChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                >
                  <option value="Regular Service">Regular Service Day</option>
                  <option value="Payday Friday + Theater Event">Payday Friday + Theater Event</option>
                  <option value="Public Holiday Long Weekend">Public Holiday Long Weekend</option>
                  <option value="Neighborhood Street Fair">Neighborhood Street Fair</option>
                </select>
              </div>
            </div>
          </div>

          {contextualAnalysis ? (
            <div className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              contextualAnalysis.isFallback
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-start gap-3">
                {contextualAnalysis.isFallback ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">
                      {contextualAnalysis.isFallback
                        ? 'Graceful Statistical Fallback Active'
                        : `Gemini Contextual Intelligence Active (${contextualAnalysis.modelVersion})`}
                    </p>
                    <Badge variant={contextualAnalysis.isFallback ? 'amber' : 'emerald'} size="sm">
                      {contextualAnalysis.isFallback ? 'Fallback Mode' : `Bounded ±${contextualAnalysis.adjustmentLimitPct}%`}
                    </Badge>
                  </div>
                  <p className={contextualAnalysis.isFallback ? 'text-amber-800' : 'text-slate-300'}>
                    {contextualAnalysis.generalAssessment}
                  </p>
                  {contextualAnalysis.fallbackReason && (
                    <p className="text-[11px] opacity-80">Reason: {contextualAnalysis.fallbackReason}</p>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-mono opacity-75 shrink-0">
                {new Date(contextualAnalysis.generatedAt).toLocaleTimeString()}
              </span>
            </div>
          ) : (
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Deterministic Statistical Baseline + Safety Rails Active</p>
                  <p className="text-slate-400">
                    All adjustments are bounded within ±{settings.aiAdjustmentLimitPct}% of the 4-week moving average. Click &ldquo;Run Gemini Context Analysis&rdquo; to apply server-side AI reasoning.
                  </p>
                </div>
              </div>
              <Badge variant="emerald" size="sm">Offline-Capable</Badge>
            </div>
          )}

          <Card
            title="Dish-by-Dish Demand Forecast & Uncertainty Intervals"
            subtitle="Comparing 4-week statistical baseline vs. bounded contextual modifier with 80% confidence bands"
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">Menu Dish & Rationale</th>
                    <th className="py-2.5 px-3 font-semibold">Station</th>
                    <th className="py-2.5 px-3 font-semibold text-right">4-Wk Base</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Bounded Delta</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Expected Sales</th>
                    <th className="py-2.5 px-3 font-semibold text-center">80% Band</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rec. Prep</th>
                    <th className="py-2.5 px-3 font-semibold">Source</th>
                    <th className="py-2.5 px-4 font-semibold">Data Depth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecasts.map(res => {
                    const isPositive = res.clampedModifierPct > 0;
                    const isNegative = res.clampedModifierPct < 0;

                    return (
                      <tr key={res.dishId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>
                            <p>{res.dishName}</p>
                            <p className="text-[11px] font-normal text-slate-500 mt-0.5">{res.rationale}</p>
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
                        <td className="py-3 px-3 text-center font-mono text-slate-600 font-tabular-nums">
                          [{res.confidenceInterval80[0]} - {res.confidenceInterval80[1]}]
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-800 font-tabular-nums text-sm">
                          {res.recommendedPrep}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={res.adjustmentSource === 'gemini' ? 'blue' : res.adjustmentSource === 'closed' ? 'amber' : 'slate'}
                            size="sm"
                          >
                            {res.adjustmentSource === 'gemini' ? 'Gemini AI' : res.adjustmentSource === 'closed' ? 'Closed' : 'Statistical'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={res.dataSufficiency.status === 'optimal' ? 'emerald' : res.dataSufficiency.status === 'moderate' ? 'blue' : 'amber'}
                            size="sm"
                          >
                            {res.dataSufficiency.status === 'optimal' ? 'Optimal (4 Wks)' : res.dataSufficiency.status === 'moderate' ? 'Moderate' : 'Baseline'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">WMA Forecast MAPE</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">{avgWmaMape}%</p>
              <p className="text-xs text-slate-400 mt-1">Mean Absolute % Error</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Naive Baseline MAPE</p>
              <p className="text-2xl font-bold text-slate-600 mt-1 font-tabular-nums">{avgNaiveMape}%</p>
              <p className="text-xs text-slate-400 mt-1">Same-Day-Last-Week Model</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accuracy Gain vs Naive</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">+{avgImprovement}%</p>
              <p className="text-xs text-slate-400 mt-1">Error reduction percentage</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Portion MAE</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">{avgMae} portions</p>
              <p className="text-xs text-slate-400 mt-1">Mean error per dish service</p>
            </div>
          </div>

          <Card
            title="Empirical Rolling-Origin Backtesting Matrix (14-Day Window)"
            subtitle="Evaluating actual historical sales against Naive and 4-Week WMA without lookahead data leakage"
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Menu Dish</th>
                    <th className="py-3 px-3 text-right">Naive MAE</th>
                    <th className="py-3 px-3 text-right">Naive MAPE (%)</th>
                    <th className="py-3 px-3 text-right">WMA MAE</th>
                    <th className="py-3 px-3 text-right">WMA MAPE (%)</th>
                    <th className="py-3 px-3 text-right">WMA RMSE</th>
                    <th className="py-3 px-3 text-right">Accuracy Gain</th>
                    <th className="py-3 px-4">Forecast Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluationResults.map(evalItem => (
                    <tr key={evalItem.dishId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{evalItem.dishName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">{evalItem.naiveMae}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">{evalItem.naiveMape}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-tabular-nums">{evalItem.wmaMae}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-tabular-nums">{evalItem.wmaMape}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-tabular-nums">{evalItem.wmaRmse}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-800 font-tabular-nums">
                        {evalItem.evaluatedDaysCount > 0 ? `+${evalItem.accuracyImprovementPct}%` : 'Insufficient Data'}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="emerald" size="sm">{evalItem.forecastBias}</Badge>
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
