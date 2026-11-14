import React, { useState, useMemo } from 'react';
import { RefreshCw, CheckCircle2, WifiOff, CalendarOff, AlertTriangle } from 'lucide-react';
import {
  MenuItem,
  SaleRecord,
  ClosedDayRecord,
  AppSettings,
  ContextualAnalysisResult
} from '../../types';
import { Button } from '../common/Button';
import {
  evaluateBacktestMetrics,
  DishForecastResult,
  ModelAccuracyEvaluation
} from '../../engine/forecastingEngine';

interface ForecastViewProps {
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

export const ForecastView: React.FC<ForecastViewProps> = ({
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
  const [activeTab, setActiveTab] = useState<'forecast' | 'accuracy'>('forecast');
  const isClosedDay = closedDays.some(c => c.date === businessDate);

  const evaluationResults: ModelAccuracyEvaluation[] = useMemo(() => {
    return menuItems
      .filter(m => m.isActive)
      .map(dish => evaluateBacktestMetrics(salesRecords, dish.id, dish.name, 14, closedDays));
  }, [menuItems, salesRecords, closedDays]);

  const evaluatedDishes = evaluationResults.filter(e => e.evaluatedDaysCount > 0);
  const avgWmaMape = evaluatedDishes.length > 0
    ? Math.round((evaluatedDishes.reduce((s, r) => s + r.wmaMape, 0) / evaluatedDishes.length) * 10) / 10
    : 0;
  const avgNaiveMape = evaluatedDishes.length > 0
    ? Math.round((evaluatedDishes.reduce((s, r) => s + r.naiveMape, 0) / evaluatedDishes.length) * 10) / 10
    : 0;
  const avgMae = evaluatedDishes.length > 0
    ? Math.round((evaluatedDishes.reduce((s, r) => s + r.wmaMae, 0) / evaluatedDishes.length) * 10) / 10
    : 0;

  const handlePushToPrep = () => {
    const adjustments: Record<string, number> = {};
    forecasts.forEach(res => {
      adjustments[res.dishId] = res.recommendedPrep;
    });
    onApplyForecastToPrep(adjustments);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Demand Forecast</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            4-week day-of-week moving average · Bounded ±{settings.aiAdjustmentLimitPct}% contextual adjustment · Target: {businessDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'forecast'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Forecast
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accuracy')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'accuracy'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Accuracy Backtest
            </button>
          </div>

          {activeTab === 'forecast' && (
            <Button
              size="sm"
              variant="primary"
              onClick={handlePushToPrep}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Apply to Today&apos;s Prep
            </Button>
          )}
        </div>
      </div>

      {isClosedDay && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
          <CalendarOff className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{businessDate} is marked as Closed. Forecasted sales and prep are 0.</span>
        </div>
      )}

      {activeTab === 'forecast' ? (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Weather</label>
                <select
                  value={weatherCondition}
                  onChange={e => onWeatherConditionChange(e.target.value as 'Clear' | 'Rain' | 'Cloudy' | 'Storm')}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Clear">Clear & Sunny</option>
                  <option value="Rain">Rain</option>
                  <option value="Storm">Storm</option>
                  <option value="Cloudy">Cloudy</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Temp: {temperatureC}°C
                </label>
                <input
                  type="range"
                  min="2"
                  max="36"
                  value={temperatureC}
                  onChange={e => onTemperatureChange(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 mt-1.5"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Rain Chance: {rainChance}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={rainChance}
                  onChange={e => onRainChanceChange(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 mt-1.5"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Event / Day Context</label>
                <select
                  value={eventTag}
                  onChange={e => onEventTagChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Regular Service">Regular Service</option>
                  <option value="Payday Friday + Theater Event">Payday Friday + Theater Event</option>
                  <option value="Public Holiday Long Weekend">Public Holiday Long Weekend</option>
                  <option value="Neighborhood Street Fair">Neighborhood Street Fair</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateGeminiOffline}
                  onChange={e => onSimulateGeminiOfflineChange(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600"
                />
                <WifiOff className="w-3.5 h-3.5" />
                <span>Simulate Offline / Fallback</span>
              </label>

              <Button
                size="sm"
                variant="outline"
                onClick={onRequestContextualAnalysis}
                isLoading={isAnalyzingContext}
                disabled={isClosedDay}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Run Gemini Context Analysis
              </Button>
            </div>
          </div>

          {contextualAnalysis && (
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
              contextualAnalysis.isFallback
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              {contextualAnalysis.isFallback ? (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {contextualAnalysis.isFallback
                    ? 'Fallback Statistical Mode Active'
                    : `Gemini Analysis Applied (${contextualAnalysis.modelVersion}, ±${contextualAnalysis.adjustmentLimitPct}% limit)`}
                </p>
                <p className="mt-0.5 opacity-90">{contextualAnalysis.generalAssessment}</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Dish & Rationale</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3 text-right">4-Wk Base</th>
                    <th className="py-2.5 px-3 text-right">Delta</th>
                    <th className="py-2.5 px-3 text-right">Expected</th>
                    <th className="py-2.5 px-3 text-center">80% Range</th>
                    <th className="py-2.5 px-3 text-right">Rec. Prep</th>
                    <th className="py-2.5 px-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecasts.map(res => {
                    const deltaPct = Math.round(res.clampedModifierPct * 100);
                    return (
                      <tr key={res.dishId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{res.dishName}</p>
                          <p className="text-slate-500 mt-0.5">{res.rationale}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{res.station}</td>
                        <td className="py-3 px-3 text-right text-slate-600 font-tabular-nums">
                          {res.baseStatisticalForecast}
                        </td>
                        <td className={`py-3 px-3 text-right font-semibold font-tabular-nums ${
                          deltaPct > 0 ? 'text-emerald-700' : deltaPct < 0 ? 'text-amber-700' : 'text-slate-500'
                        }`}>
                          {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                          {res.expectedSales}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600 font-tabular-nums">
                          {res.confidenceInterval80[0]}–{res.confidenceInterval80[1]}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-800 font-tabular-nums">
                          {res.recommendedPrep}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {res.adjustmentSource === 'gemini'
                            ? 'Gemini'
                            : res.adjustmentSource === 'closed'
                            ? 'Closed'
                            : 'Statistical'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">4-Week WMA MAPE</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">{avgWmaMape}%</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">Naive Baseline MAPE</p>
              <p className="text-2xl font-bold text-slate-700 mt-1 font-tabular-nums">{avgNaiveMape}%</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">Average Portion Error (MAE)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">{avgMae} portions</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Dish</th>
                    <th className="py-2.5 px-3 text-right">Naive MAPE</th>
                    <th className="py-2.5 px-3 text-right">WMA MAPE</th>
                    <th className="py-2.5 px-3 text-right">WMA MAE</th>
                    <th className="py-2.5 px-3 text-right">Gain vs Naive</th>
                    <th className="py-2.5 px-4">Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluationResults.map(item => (
                    <tr key={item.dishId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.dishName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">{item.naiveMape}%</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 font-tabular-nums">{item.wmaMape}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-tabular-nums">{item.wmaMae}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-tabular-nums">
                        {item.evaluatedDaysCount > 0 ? `+${item.accuracyImprovementPct}%` : 'Insufficient data'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{item.forecastBias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
