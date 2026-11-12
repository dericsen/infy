import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CloudRain,
  Sun,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Info,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Scale,
  Activity,
  Layers
} from 'lucide-react';
import { Station, MenuItem, SaleRecord } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  generateComprehensiveForecast,
  evaluateBacktestMetrics,
  DishForecastResult,
  ModelAccuracyEvaluation
} from '../../engine/forecastingEngine';

interface PredictionViewProps {
  businessDate: string;
  menuItems: MenuItem[];
  salesRecords: SaleRecord[];
  onApplyForecastToPrep: (adjustments: Record<string, number>) => void;
}

export const PredictionView: React.FC<PredictionViewProps> = ({
  businessDate,
  menuItems,
  salesRecords,
  onApplyForecastToPrep
}) => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'evaluation'>('forecast');
  const [weatherCondition, setWeatherCondition] = useState<'Clear' | 'Rain' | 'Cloudy' | 'Storm'>('Rain');
  const [temperatureC, setTemperatureC] = useState<number>(13);
  const [rainChance, setRainChance] = useState<number>(75);
  const [eventTag, setEventTag] = useState<string>('Payday Friday + Theater Event');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [appliedToast, setAppliedToast] = useState<boolean>(false);

  const forecastResults: DishForecastResult[] = useMemo(() => {
    return menuItems.map(dish =>
      generateComprehensiveForecast(
        dish,
        salesRecords,
        businessDate,
        { condition: weatherCondition, temperatureC, precipChance: rainChance },
        eventTag
      )
    );
  }, [menuItems, salesRecords, businessDate, weatherCondition, temperatureC, rainChance, eventTag]);

  const evaluationResults: ModelAccuracyEvaluation[] = useMemo(() => {
    return menuItems.map(dish =>
      evaluateBacktestMetrics(salesRecords, dish.id, dish.name, 14)
    );
  }, [menuItems, salesRecords]);

  const avgNaiveMape = useMemo(() => {
    if (evaluationResults.length === 0) return 0;
    const sum = evaluationResults.reduce((s, r) => s + r.naiveMape, 0);
    return Math.round((sum / evaluationResults.length) * 10) / 10;
  }, [evaluationResults]);

  const avgWmaMape = useMemo(() => {
    if (evaluationResults.length === 0) return 0;
    const sum = evaluationResults.reduce((s, r) => s + r.wmaMape, 0);
    return Math.round((sum / evaluationResults.length) * 10) / 10;
  }, [evaluationResults]);

  const avgMae = useMemo(() => {
    if (evaluationResults.length === 0) return 0;
    const sum = evaluationResults.reduce((s, r) => s + r.wmaMae, 0);
    return Math.round((sum / evaluationResults.length) * 10) / 10;
  }, [evaluationResults]);

  const avgImprovement = useMemo(() => {
    if (avgNaiveMape === 0) return 0;
    return Math.round(((avgNaiveMape - avgWmaMape) / avgNaiveMape) * 1000) / 10;
  }, [avgNaiveMape, avgWmaMape]);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 400);
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
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-100 text-emerald-800">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Deterministic Sales Forecasting & Demand Engine
            </h2>
            <Badge variant="emerald" size="sm">4-Week WMA + Weather Adjusted</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict zero future data leakage with day-of-week seasonality, trend factor, and uncertainty intervals
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              Model Evaluation & Accuracy Metrics
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

      {appliedToast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Recommended prep targets pushed to the Station Prep Sheet with station safety buffers.</span>
          </div>
        </div>
      )}

      {activeTab === 'forecast' ? (
        <>
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  External Demand & Weather Simulation Controls
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust simulated environmental conditions to inspect deterministic demand elasticity adjustments.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSimulate}
                isLoading={isSimulating}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Re-evaluate Model
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Weather Condition
                </label>
                <select
                  value={weatherCondition}
                  onChange={e => setWeatherCondition(e.target.value as any)}
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
                  Temperature: {temperatureC}°C ({Math.round(temperatureC * 1.8 + 32)}°F)
                </label>
                <input
                  type="range"
                  min="2"
                  max="36"
                  value={temperatureC}
                  onChange={e => setTemperatureC(parseInt(e.target.value))}
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
                  onChange={e => setRainChance(parseInt(e.target.value))}
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
          </div>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">ADR-001 Deterministic Safety Rails Active</p>
                <p className="text-slate-400">
                  Adjustment multipliers are programmatically clamped within [-30%, +35%] of the 4-week moving average. Zero runaway prep spikes.
                </p>
              </div>
            </div>
            <Badge variant="emerald" size="sm">Audited & Bounded</Badge>
          </div>

          <Card
            title="Dish-by-Dish Demand Forecast & Uncertainty Intervals"
            subtitle="Comparing 4-week historical baseline vs. contextual adjustment with 80% prediction bands"
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">Menu Dish</th>
                    <th className="py-2.5 px-3 font-semibold">Station</th>
                    <th className="py-2.5 px-3 font-semibold text-right">4-Wk Base Avg</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Context Delta</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Expected Sales</th>
                    <th className="py-2.5 px-3 font-semibold text-center">80% Confidence Band</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Recommended Prep</th>
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
                            variant={res.riskOfWaste === 'High' ? 'rose' : res.riskOfWaste === 'Medium' ? 'amber' : 'emerald'}
                            size="sm"
                            dot
                          >
                            {res.riskOfWaste}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={res.dataSufficiency.status === 'optimal' ? 'emerald' : res.dataSufficiency.status === 'moderate' ? 'blue' : 'amber'}
                            size="sm"
                          >
                            {res.dataSufficiency.status === 'optimal' ? 'Optimal (4 Wks)' : res.dataSufficiency.status === 'moderate' ? 'Moderate Depth' : 'Baseline'}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                WMA Forecast MAPE
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">
                {avgWmaMape}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Mean Absolute % Error</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Naive Baseline MAPE
              </p>
              <p className="text-2xl font-bold text-slate-600 mt-1 font-tabular-nums">
                {avgNaiveMape}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Same-Day-Last-Week Model</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Accuracy Gain vs Naive
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">
                +{avgImprovement}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Error reduction percentage</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Average Portion MAE
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
                {avgMae} portions
              </p>
              <p className="text-xs text-slate-400 mt-1">Mean error per dish service</p>
            </div>
          </div>

          <Card
            title="Empirical Rolling-Origin Backtesting Matrix (14-Day Evaluation Window)"
            subtitle="Evaluating actual sales against Naive and 4-Week Weighted Moving Average models without lookahead data leakage"
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
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {evalItem.dishName}
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
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-800 font-tabular-nums">
                        +{evalItem.accuracyImprovementPct}%
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="emerald" size="sm">
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
