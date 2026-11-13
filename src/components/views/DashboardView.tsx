import React from 'react';
import {
  TrendingUp,
  ClipboardList,
  Sparkles,
  AlertTriangle,
  Flame,
  Soup,
  Salad,
  Croissant,
  CloudRain,
  Sun,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  AppRoute,
  Station,
  Ingredient,
  WasteRecord,
  PrepSheetRecommendationBundle,
  ContextualAnalysisResult,
  AppSettings
} from '../../types';
import { DishForecastResult } from '../../engine/forecastingEngine';
import { StatCard } from '../common/StatCard';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface DashboardViewProps {
  businessDate: string;
  ingredients: Ingredient[];
  wasteRecords: WasteRecord[];
  forecasts: DishForecastResult[];
  recommendationBundle: PrepSheetRecommendationBundle;
  weatherCondition: 'Clear' | 'Rain' | 'Cloudy' | 'Storm';
  temperatureC: number;
  rainChance: number;
  eventTag: string;
  contextualAnalysis: ContextualAnalysisResult | null;
  settings: AppSettings;
  onNavigate: (route: AppRoute) => void;
  onFilterStation: (station: Station) => void;
  onQuickWasteLog: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  businessDate,
  ingredients,
  wasteRecords,
  forecasts,
  recommendationBundle,
  weatherCondition,
  temperatureC,
  rainChance,
  eventTag,
  contextualAnalysis,
  settings,
  onNavigate,
  onFilterStation,
  onQuickWasteLog
}) => {
  const stationMeta: { station: Station; icon: React.ReactNode }[] = [
    { station: 'Grill', icon: <Flame className="w-4 h-4 text-rose-500" /> },
    { station: 'Saute', icon: <Soup className="w-4 h-4 text-amber-500" /> },
    { station: 'Garde Manger', icon: <Salad className="w-4 h-4 text-emerald-500" /> },
    { station: 'Bakery', icon: <Croissant className="w-4 h-4 text-yellow-600" /> }
  ];

  const stationStats = stationMeta.map(meta => {
    const items = recommendationBundle.itemRecommendations.filter(i => i.station === meta.station);
    const prepPortions = items.reduce((sum, i) => sum + i.effectivePrep, 0);
    const hasHigh = items.some(i => i.riskOfWaste === 'High');
    const hasMedium = items.some(i => i.riskOfWaste === 'Medium');
    const riskLevel: 'High' | 'Medium' | 'Low' = hasHigh ? 'High' : hasMedium ? 'Medium' : 'Low';
    return {
      station: meta.station,
      icon: meta.icon,
      prepPortions,
      dishesCount: items.length,
      riskLevel
    };
  });

  const totalBaseStatistical = forecasts.reduce((sum, f) => sum + f.baseStatisticalForecast, 0);
  const deltaVsBasePct = totalBaseStatistical > 0
    ? Math.round(((recommendationBundle.totalPredictedPortions - totalBaseStatistical) / totalBaseStatistical) * 1000) / 10
    : 0;
  const bufferUnits = Math.max(0, recommendationBundle.totalRecommendedPrep - recommendationBundle.totalPredictedPortions);

  const totalWasteLoss = wasteRecords.reduce((sum, r) => sum + r.totalLossCost, 0);
  const distinctWasteDays = Math.max(1, new Set(wasteRecords.map(r => r.date)).size);
  const avgDailyWaste = Math.round((totalWasteLoss / distinctWasteDays) * 100) / 100;

  const belowSafetyPar = ingredients.filter(i => i.currentStock < i.safetyStock).length;
  const activeDeficits = Math.max(belowSafetyPar, recommendationBundle.totalShortagesCount);

  const riskRadarDishes = recommendationBundle.itemRecommendations
    .filter(item => item.riskOfWaste === 'High' || item.riskOfWaste === 'Medium' || item.hasShortage)
    .slice(0, 4);

  const optimalCount = forecasts.filter(f => f.dataSufficiency.status === 'optimal').length;
  const reliabilityLabel = forecasts.length > 0 && optimalCount === forecasts.length
    ? 'High (4-Wk Window)'
    : optimalCount > 0
    ? 'Moderate'
    : 'Baseline Mode';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Predicted Day Demand"
          value={`${recommendationBundle.totalPredictedPortions} Portions`}
          subtitle={recommendationBundle.isClosedDay ? 'Restaurant marked closed' : `4-week statistical base: ${totalBaseStatistical}`}
          change={{
            value: `${deltaVsBasePct >= 0 ? '+' : ''}${deltaVsBasePct}% context delta`,
            trend: deltaVsBasePct > 0 ? 'up' : deltaVsBasePct < 0 ? 'down' : 'neutral',
            isPositiveGood: true
          }}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          variant="highlight"
        />

        <StatCard
          title="Recommended Total Prep"
          value={`${recommendationBundle.totalRecommendedPrep} Portions`}
          subtitle={`Includes +${bufferUnits} safety buffer units`}
          change={{
            value: `${recommendationBundle.itemRecommendations.length} active dishes`,
            trend: 'neutral'
          }}
          icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
        />

        <StatCard
          title="Avg Logged Waste Cost"
          value={`${settings.currency}${avgDailyWaste.toFixed(2)} / day`}
          subtitle={`${wasteRecords.length} logged discard events (${settings.currency}${totalWasteLoss.toFixed(2)} total)`}
          change={{
            value: avgDailyWaste <= 50 ? 'Within $50/day target' : 'Above $50/day target',
            trend: avgDailyWaste <= 50 ? 'down' : 'up',
            isPositiveGood: avgDailyWaste <= 50
          }}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        />

        <StatCard
          title="Stock & Prep Deficits"
          value={activeDeficits > 0 ? `${activeDeficits} Alerts` : 'All Stock Healthy'}
          subtitle={
            recommendationBundle.expiringSoonCount > 0
              ? `${recommendationBundle.expiringSoonCount} expiring within 48h`
              : 'Zero prep stock shortages'
          }
          change={{
            value: activeDeficits > 0 ? 'Review Prep / Inventory' : 'Optimum par',
            trend: activeDeficits > 0 ? 'down' : 'up',
            isPositiveGood: activeDeficits === 0
          }}
          icon={<AlertTriangle className={`w-5 h-5 ${activeDeficits > 0 ? 'text-amber-600' : 'text-slate-400'}`} />}
          variant={activeDeficits > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {contextualAnalysis && !contextualAnalysis.isFallback
                ? `Gemini Contextual Forecast (${contextualAnalysis.modelVersion})`
                : 'Hybrid Statistical + Contextual Briefing'}
            </span>
            <Badge variant="blue" size="sm">{businessDate} • {recommendationBundle.shift}</Badge>
          </div>
          <p className="text-sm text-slate-200 max-w-3xl leading-relaxed">
            {contextualAnalysis
              ? contextualAnalysis.generalAssessment
              : `Forecasted ${weatherCondition.toLowerCase()} weather (${rainChance}% precip, ${temperatureC}°C) with "${eventTag}" context. Multipliers remain strictly bounded within ±${settings.aiAdjustmentLimitPct}% of the 4-week statistical moving average.`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('prediction')}
            className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
          >
            Forecast Simulator
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('prep-sheet')}
            leftIcon={<ClipboardList className="w-4 h-4" />}
          >
            Open Prep Sheet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Kitchen Station Preparation Pars"
            subtitle="Live batch quantities decomposed from forecasting engine and recipe BOMs"
            headerAction={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('prep-sheet')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Full Checklist
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stationStats.map(stat => (
                <div
                  key={stat.station}
                  onClick={() => {
                    onFilterStation(stat.station);
                    onNavigate('prep-sheet');
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all bg-white cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                        {stat.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {stat.station} Station
                        </h4>
                        <p className="text-xs text-slate-500">{stat.dishesCount} Active Dishes</p>
                      </div>
                    </div>
                    <Badge
                      variant={stat.riskLevel === 'High' ? 'rose' : stat.riskLevel === 'Medium' ? 'amber' : 'emerald'}
                      size="sm"
                    >
                      {stat.riskLevel} Waste Risk
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Total Recommended Prep:</span>
                    <span className="font-bold text-slate-900 text-sm font-tabular-nums">
                      {stat.prepPortions} Portions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Overproduction & Perishability Risk Radar"
            subtitle="Live risk signals from dish demand volatility, shortages, and short shelf life"
          >
            {riskRadarDishes.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                All active dishes currently show low waste risk and sufficient stock.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {riskRadarDishes.map(dish => (
                  <div key={dish.menuItemId} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">{dish.dishName}</p>
                        <Badge variant="slate" size="sm">{dish.station}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{dish.reasoning}</p>
                    </div>
                    <Badge
                      variant={dish.riskOfWaste === 'High' || dish.hasShortage ? 'rose' : 'amber'}
                      dot
                      size="sm"
                    >
                      {dish.hasShortage ? 'Stock Shortage' : `${dish.riskOfWaste} Risk`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="External Demand Factors"
            subtitle={`Target Service: ${businessDate}`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs">
                <div className="flex items-center gap-2.5">
                  {weatherCondition === 'Clear' ? (
                    <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                  ) : (
                    <CloudRain className="w-5 h-5 text-blue-600 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-blue-950">{weatherCondition} Weather</p>
                    <p className="text-blue-700">{rainChance}% precip • {temperatureC}°C</p>
                  </div>
                </div>
                <Badge variant="blue" size="sm">Active Input</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-950">Calendar Context</p>
                    <p className="text-emerald-700">{eventTag}</p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">±{settings.aiAdjustmentLimitPct}% Cap</Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Data Sufficiency:</span>
                  <span className="font-semibold text-slate-900">{reliabilityLabel}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Calculation Engine:</span>
                  <span className="font-semibold text-emerald-700">
                    {contextualAnalysis && !contextualAnalysis.isFallback ? 'WMA + Gemini AI' : 'Deterministic WMA'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Shift Actions & Fast Logging"
            subtitle="Direct operational tools"
          >
            <div className="space-y-2.5">
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={onQuickWasteLog}
                leftIcon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
              >
                Log End-of-Shift Waste Discard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => onNavigate('inventory')}
                leftIcon={<ClipboardList className="w-4 h-4 text-slate-600" />}
              >
                Update Morning Physical Stock Count
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => onNavigate('sales')}
                leftIcon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              >
                Inspect Sales & Closed Days Ledger
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
