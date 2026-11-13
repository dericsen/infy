import React, { useMemo } from 'react';
import {
  TrendingUp,
  ClipboardList,
  Sparkles,
  AlertTriangle,
  Flame,
  Soup,
  Salad,
  Croissant,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  AppRoute,
  ForecastConfig,
  Ingredient,
  MenuItem,
  PredictionRecord,
  SaleRecord,
  Station,
  WasteRecord
} from '../../types';
import { computeDashboardAnalytics } from '../../engine/analyticsEngine';
import { StatCard } from '../common/StatCard';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface DashboardViewProps {
  businessDate: string;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  salesRecords: SaleRecord[];
  wasteRecords: WasteRecord[];
  predictions: PredictionRecord[];
  forecastConfig: ForecastConfig;
  onNavigate: (route: AppRoute) => void;
  onFilterStation: (station: Station) => void;
  onQuickWasteLog: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  businessDate,
  menuItems,
  ingredients,
  salesRecords,
  wasteRecords,
  predictions,
  forecastConfig,
  onNavigate,
  onFilterStation,
  onQuickWasteLog
}) => {
  const analytics = useMemo(
    () =>
      computeDashboardAnalytics({
        businessDate,
        menuItems,
        ingredients,
        salesRecords,
        wasteRecords,
        predictions,
        forecastConfig
      }),
    [businessDate, menuItems, ingredients, salesRecords, wasteRecords, predictions, forecastConfig]
  );

  const getStationIcon = (station: Station) => {
    switch (station) {
      case 'Grill':
        return <Flame className="w-4 h-4 text-rose-600" />;
      case 'Saute':
        return <Soup className="w-4 h-4 text-amber-600" />;
      case 'Garde Manger':
        return <Salad className="w-4 h-4 text-emerald-600" />;
      case 'Bakery':
        return <Croissant className="w-4 h-4 text-yellow-700" />;
    }
  };

  const savedPredictionForDate = predictions.find(p => p.targetDate === businessDate);

  const maxDailyPortions = Math.max(
    1,
    ...analytics.dailySalesSeries.map(d => d.portions)
  );

  const maxDailyWasteLoss = Math.max(
    1,
    ...analytics.dailyWasteSeries.map(d => d.lossCost)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Predicted Day Demand"
          value={`${analytics.totalExpectedSales} Portions`}
          subtitle={`${analytics.distinctHistoryDays} historical service days`}
          change={
            analytics.demandChangeVsLastWeekPct !== null
              ? {
                  value: `${analytics.demandChangeVsLastWeekPct >= 0 ? '+' : ''}${analytics.demandChangeVsLastWeekPct}% vs prior wk`,
                  trend: analytics.demandChangeVsLastWeekPct >= 0 ? 'up' : 'down',
                  isPositiveGood: true
                }
              : { value: 'Baseline active', trend: 'neutral' }
          }
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          variant="highlight"
        />

        <StatCard
          title="Recommended Total Prep"
          value={`${analytics.totalRecommendedPrep} Portions`}
          subtitle="Includes station safety buffers"
          change={{ value: `+${analytics.bufferPortions} buffer units`, trend: 'neutral' }}
          icon={<ClipboardList className="w-5 h-5 text-slate-700" />}
        />

        <StatCard
          title="Avg Daily Logged Waste"
          value={analytics.wasteCountDays > 0 ? `$${analytics.avgDailyWasteCost.toFixed(2)}` : '$0.00'}
          subtitle={
            analytics.wasteCountDays > 0
              ? `$${analytics.totalWasteCost.toFixed(2)} across ${analytics.wasteCountDays} day(s)`
              : 'No waste entries logged'
          }
          change={{
            value: `${analytics.wastePctOfRevenue}% of sales rev`,
            trend: analytics.wastePctOfRevenue <= 3 ? 'up' : 'down',
            isPositiveGood: analytics.wastePctOfRevenue <= 3
          }}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        />

        <StatCard
          title="Stockout Deficits"
          value={
            analytics.deficitIngredients.length > 0
              ? `${analytics.deficitIngredients.length} Below Safety Par`
              : 'All Stock Healthy'
          }
          subtitle={
            analytics.deficitIngredients.length > 0
              ? 'Requires morning supplier intake'
              : 'Zero ingredient shortages'
          }
          change={{
            value: analytics.deficitIngredients.length > 0 ? 'Intake needed' : 'Par covered',
            trend: analytics.deficitIngredients.length > 0 ? 'down' : 'up',
            isPositiveGood: analytics.deficitIngredients.length === 0
          }}
          icon={
            <AlertTriangle
              className={`w-5 h-5 ${
                analytics.deficitIngredients.length > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            />
          }
          variant={analytics.deficitIngredients.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="bg-slate-900 rounded-xl p-5 text-white border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-medium">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Service Forecast Summary</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300 font-mono">{businessDate}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300">{analytics.predictionModelLabel}</span>
          </div>
          <p className="text-sm text-slate-200 max-w-3xl leading-relaxed">
            {savedPredictionForDate?.generalAssessment
              ? savedPredictionForDate.generalAssessment
              : `Projected ${analytics.totalExpectedSales} portions sold and ${analytics.totalRecommendedPrep} portions prepped across ${menuItems.length} active dishes. Run the AI Context Simulator to layer weather and local event modifiers onto the 4-week baseline.`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('prediction')}
            className="!bg-slate-800 !border-slate-700 !text-white hover:!bg-slate-700 whitespace-nowrap shrink-0"
          >
            Open Forecast Simulator
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('prep-sheet')}
            className="whitespace-nowrap shrink-0"
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
            subtitle="Calculated portions decomposed from the active demand forecast and station buffers"
            headerAction={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('prep-sheet')}
                className="whitespace-nowrap shrink-0"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Full Checklist
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analytics.stationMetrics.map(stat => (
                <button
                  key={stat.station}
                  type="button"
                  onClick={() => {
                    onFilterStation(stat.station);
                    onNavigate('prep-sheet');
                  }}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-emerald-400 transition-colors bg-white cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 group-hover:bg-emerald-50 transition-colors shrink-0">
                        {getStationIcon(stat.station)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 truncate">
                          {stat.station} Station
                        </h4>
                        <p className="text-xs text-slate-500">
                          {stat.dishesCount} dishes · {stat.expectedPortions} expected
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        stat.riskLevel === 'High'
                          ? 'rose'
                          : stat.riskLevel === 'Medium'
                          ? 'amber'
                          : 'emerald'
                      }
                      size="sm"
                    >
                      {stat.riskLevel} Risk
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Recommended Prep:</span>
                    <span className="font-bold text-slate-900 text-sm font-tabular-nums">
                      {stat.prepPortions} Portions
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card
            title="14-Day Sales Volume Trend"
            subtitle="Actual portions sold per operating day from persistent sales ledger"
            headerAction={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('sales')}
                className="whitespace-nowrap shrink-0"
              >
                Inspect Sales Ledger
              </Button>
            }
          >
            {analytics.dailySalesSeries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No historical sales records found yet. Record a sale or import POS CSV data to visualize trends.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end gap-1.5 h-36 pt-2">
                  {analytics.dailySalesSeries.map(pt => {
                    const heightPct = Math.max(8, Math.round((pt.portions / maxDailyPortions) * 100));
                    return (
                      <div key={pt.date} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                        <span className="text-[10px] font-mono text-slate-600 font-tabular-nums">
                          {pt.portions}
                        </span>
                        <div className="w-full bg-slate-100 rounded-t-md flex items-end h-24 overflow-hidden">
                          <div
                            className="w-full bg-emerald-600 group-hover:bg-emerald-500 transition-colors rounded-t-md"
                            style={{ height: `${heightPct}%` }}
                            title={`${pt.date}: ${pt.portions} portions ($${pt.revenue.toFixed(2)})`}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-full">
                          {pt.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Overproduction & Perishability Risk Radar"
            subtitle="Ranked dynamically by ingredient shelf life, logged waste cost, and demand shifts"
          >
            {analytics.highRiskDishes.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                No elevated overproduction or short shelf-life risks detected across active recipes.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {analytics.highRiskDishes.map(dish => (
                  <div key={dish.dishId} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <p className="font-semibold text-slate-900 truncate">{dish.name}</p>
                        <span className="text-xs text-slate-500 whitespace-nowrap">· {dish.station}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{dish.reason}</p>
                    </div>
                    <Badge
                      variant={dish.riskLevel === 'High' ? 'rose' : 'amber'}
                      size="sm"
                    >
                      {dish.riskLevel} Risk
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="Forecast Calibration & Telemetry"
            subtitle={`Target Service: ${businessDate}`}
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Model Confidence Index</span>
                <span className="font-semibold text-slate-900 font-tabular-nums">
                  {analytics.avgDataSufficiencyPct}%
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Historical Window</span>
                <span className="font-semibold text-slate-900 font-tabular-nums">
                  {analytics.distinctHistoryDays} Operating Days
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Multiplier Bounds</span>
                <span className="font-semibold text-slate-900 font-mono font-tabular-nums">
                  [-{forecastConfig.maxDecreasePct}%, +{forecastConfig.maxIncreasePct}%]
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Overproduction Waste Share</span>
                <span className="font-semibold text-slate-900 font-tabular-nums">
                  {analytics.overproductionSharePct}% of loss
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="font-medium text-slate-700 mb-2">Logged Waste Loss by Date</p>
                {analytics.dailyWasteSeries.length === 0 ? (
                  <p className="text-slate-500">No waste discard logs recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.dailyWasteSeries.slice(-5).map(w => (
                      <div key={w.date} className="space-y-1">
                        <div className="flex justify-between font-mono text-slate-600">
                          <span>{w.date}</span>
                          <span className="font-semibold text-rose-700 font-tabular-nums">
                            ${w.lossCost.toFixed(2)} ({w.portions} units)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.max(8, Math.round((w.lossCost / maxDailyWasteLoss) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {analytics.forecastVsActual.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="font-medium text-slate-700 mb-2">Forecast vs Actual Sales</p>
                  <div className="space-y-1.5">
                    {analytics.forecastVsActual.slice(0, 4).map(row => (
                      <div key={row.date} className="flex justify-between font-mono text-slate-600">
                        <span>{row.date}</span>
                        <span className="font-tabular-nums">
                          {row.predictedPortions} pred / {row.actualPortions} act ({row.variancePct >= 0 ? '+' : ''}
                          {row.variancePct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Shift Operations"
            subtitle="Direct kitchen shortcuts"
          >
            <div className="space-y-2.5">
              <Button
                variant="outline"
                className="w-full justify-start text-xs whitespace-nowrap"
                onClick={onQuickWasteLog}
                leftIcon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
              >
                Log End-of-Shift Waste Discard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs whitespace-nowrap"
                onClick={() => onNavigate('inventory')}
                leftIcon={<ClipboardList className="w-4 h-4 text-slate-600" />}
              >
                Update Physical Stock Count
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs whitespace-nowrap"
                onClick={() => onNavigate('sales')}
                leftIcon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              >
                Inspect Sales & Import CSV
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
