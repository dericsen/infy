import React, { useMemo, useState } from 'react';
import {
  Printer,
  CheckCircle2,
  Circle,
  RotateCcw,
  AlertTriangle,
  Flame,
  Soup,
  Salad,
  Croissant,
  Layers,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import {
  ForecastConfig,
  Ingredient,
  MenuItem,
  PredictionRecord,
  PrepChecklistItem,
  SaleRecord,
  Station
} from '../../types';
import {
  DishForecastResult,
  generateComprehensiveForecast
} from '../../engine/forecastingEngine';
import { decomposePrepSheet } from '../../engine/prepEngine';
import { serializePrepSheetToCsv } from '../../utils/csvSales';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface PrepSheetViewProps {
  businessDate: string;
  selectedStationFilter: Station | 'All';
  onStationFilterChange: (station: Station | 'All') => void;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  salesRecords: SaleRecord[];
  predictions: PredictionRecord[];
  forecastConfig: ForecastConfig;
  checklistItems: PrepChecklistItem[];
  onToggleChecklistItem: (taskId: string, station: Station, dishName: string) => void;
  onResetChecklist: () => void;
  overrides: Record<string, number>;
  onOverrideChange: (dishId: string, qty: number) => void;
}

export const PrepSheetView: React.FC<PrepSheetViewProps> = ({
  businessDate,
  selectedStationFilter,
  onStationFilterChange,
  menuItems,
  ingredients,
  salesRecords,
  predictions,
  forecastConfig,
  checklistItems,
  onToggleChecklistItem,
  onResetChecklist,
  overrides,
  onOverrideChange
}) => {
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'stations' | 'ingredients'>('stations');

  const stations: Station[] = ['Grill', 'Saute', 'Garde Manger', 'Bakery'];
  const activeStations = selectedStationFilter === 'All'
    ? stations
    : stations.filter(s => s === selectedStationFilter);

  const prepSheetId = `prep_${businessDate}_rst_rustic_table`;
  const savedPrediction = predictions.find(p => p.targetDate === businessDate) || null;

  const forecasts: DishForecastResult[] = useMemo(() => {
    return menuItems
      .filter(m => m.isActive !== false)
      .map(dish => {
        const savedItem = savedPrediction?.itemPredictions.find(ip => ip.menuItemId === dish.id);
        const savedAdj = savedItem && savedPrediction && !savedPrediction.isOfflineFallback
          ? {
              dishId: dish.id,
              suggestedMultiplier:
                (savedItem.aiAdjusted - savedItem.baseCalculated) / Math.max(1, savedItem.baseCalculated),
              clampedMultiplier:
                (savedItem.aiAdjusted - savedItem.baseCalculated) / Math.max(1, savedItem.baseCalculated),
              rationale: savedItem.rationale,
              riskOfWaste: savedItem.riskOfWaste
            }
          : undefined;

        return generateComprehensiveForecast(
          dish,
          salesRecords,
          businessDate,
          savedPrediction
            ? {
                condition: savedPrediction.weatherForecast.condition,
                temperatureC: savedPrediction.weatherForecast.temperatureC,
                precipChance: savedPrediction.weatherForecast.precipitationProbability
              }
            : { condition: 'Clear', temperatureC: 20, precipChance: 10 },
          savedPrediction?.eventContext || 'Regular Service',
          forecastConfig,
          savedAdj
        );
      });
  }, [menuItems, salesRecords, businessDate, savedPrediction, forecastConfig]);

  const decomposition = useMemo(
    () => decomposePrepSheet(businessDate, menuItems, ingredients, forecasts, overrides),
    [businessDate, menuItems, ingredients, forecasts, overrides]
  );

  const checklistByTaskId = useMemo(
    () => new Map(checklistItems.map(item => [item.taskId, item])),
    [checklistItems]
  );

  const visiblePlans = decomposition.dishPlans.filter(
    p => selectedStationFilter === 'All' || p.station === selectedStationFilter
  );
  const totalTasks = visiblePlans.length;
  const completedTasks = visiblePlans.filter(p => checklistByTaskId.get(p.dishId)?.completed).length;

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

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const csv = serializePrepSheetToCsv(decomposition);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prep_sheet_${businessDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Kitchen Preparation Par Sheet
              </h2>
              <span className="text-xs font-mono text-slate-500">
                {businessDate} · {prepSheetId}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Checklist: <strong className="font-tabular-nums">{completedTasks} of {totalTasks}</strong> items complete ({totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%) · Total prep: <strong className="font-tabular-nums">{decomposition.totalPortionsToPrep}</strong> portions · Est. ingredient cost: <strong className="font-tabular-nums">${decomposition.totalEstimatedIngredientCost.toFixed(2)}</strong>
            </p>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveSubView('stations')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeSubView === 'stations'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Station ({visiblePlans.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView('ingredients')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeSubView === 'ingredients'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aggregated Ingredients ({decomposition.aggregatedIngredients.length})
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="whitespace-nowrap shrink-0"
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onResetChecklist}
              className="whitespace-nowrap shrink-0"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Checklist
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handlePrint}
              className="whitespace-nowrap shrink-0"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Print Sheet
            </Button>
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => onStationFilterChange('All')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedStationFilter === 'All'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Stations
            </button>
            {stations.map(st => (
              <button
                key={st}
                type="button"
                onClick={() => onStationFilterChange(st)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedStationFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {decomposition.totalShortageIngredients > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{decomposition.totalShortageIngredients} ingredient(s) below full prep par</span>
            </div>
          )}
        </div>
      </div>

      {decomposition.recommendations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-1">
          <p className="font-semibold">Kitchen Preparation Recommendations</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-900">
            {decomposition.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {activeSubView === 'ingredients' ? (
        <Card
          title="Aggregated Kitchen Ingredient Requirements"
          subtitle="Gross and net stock requirements summed across all active dishes sharing raw ingredients"
          noPadding
        >
          {decomposition.aggregatedIngredients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No ingredient requirements computed. Verify active dishes have recipe BOM entries and non-zero prep quantities.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Raw Ingredient</th>
                    <th className="py-3 px-3">Used In Dishes</th>
                    <th className="py-3 px-3 text-right">Gross Required</th>
                    <th className="py-3 px-3 text-right">On-Hand Stock</th>
                    <th className="py-3 px-3 text-right">Net To Order</th>
                    <th className="py-3 px-3 text-right">Est. Cost</th>
                    <th className="py-3 px-4">Status & Shelf Life</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {decomposition.aggregatedIngredients.map(item => (
                    <tr key={item.ingredientId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{item.ingredientName}</p>
                        <p className="text-slate-500">{item.category} · {item.shelfLifeDays}d shelf life</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.usedByDishes.map(u => `${u.dishName} (${u.quantity} ${item.stockUnit})`).join(' · ')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                        {item.grossRequired} {item.stockUnit}
                      </td>
                      <td className="py-3 px-3 text-right font-tabular-nums text-slate-700">
                        {item.currentStock} {item.stockUnit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-tabular-nums">
                        {item.netRequired > 0 ? (
                          <span className="text-rose-700">{item.netRequired} {item.stockUnit}</span>
                        ) : (
                          <span className="text-emerald-700">0 (Covered)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-tabular-nums text-slate-700">
                        ${item.estimatedGrossCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {item.isShortage ? (
                            <Badge variant="rose" size="sm">Shortage ({item.shortageDeficit} {item.stockUnit})</Badge>
                          ) : item.belowSafetyAfterPrep ? (
                            <Badge variant="amber" size="sm">Dips Below Safety Par</Badge>
                          ) : (
                            <Badge variant="emerald" size="sm">Covered</Badge>
                          )}
                          {item.perishabilityWarning && (
                            <p className="text-amber-800">{item.perishabilityWarning}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : visiblePlans.length === 0 ? (
        <Card>
          <p className="text-xs text-slate-500 py-6 text-center">
            No active dishes assigned to the selected station filter. Add dishes in Menu & Recipe BOM or select All Stations.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeStations.map(station => {
            const stationDishes = visiblePlans.filter(d => d.station === station);
            if (stationDishes.length === 0) return null;

            return (
              <Card
                key={station}
                title={
                  <div className="flex items-center gap-2">
                    {getStationIcon(station)}
                    <span>{station} Station Prep</span>
                  </div>
                }
                subtitle={`Calculated prep pars & recipe BOM decomposition (${stationDishes.length} dishes)`}
                noPadding
              >
                <div className="divide-y divide-slate-100">
                  {stationDishes.map(dish => {
                    const checklistRecord = checklistByTaskId.get(dish.dishId);
                    const isChecked = Boolean(checklistRecord?.completed);
                    const isExpanded = expandedDishId === dish.dishId;

                    return (
                      <div
                        key={dish.dishId}
                        className={`transition-colors ${isChecked ? 'bg-slate-50/80' : 'bg-white hover:bg-slate-50/40'}`}
                      >
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[56px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => onToggleChecklistItem(dish.dishId, dish.station, dish.dishName)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors shrink-0"
                              aria-label={`Mark ${dish.dishName} complete`}
                            >
                              {isChecked ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                              ) : (
                                <Circle className="w-6 h-6 text-slate-300" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className={`text-sm font-semibold truncate ${isChecked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {dish.dishName}
                                </h4>
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                  · {dish.category}
                                </span>
                                {dish.isOverridden && (
                                  <Badge variant="amber" size="sm">Manual Override</Badge>
                                )}
                                {dish.missingRecipe && (
                                  <Badge variant="rose" size="sm">Missing Recipe BOM</Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                4-Wk Base: <span className="font-semibold text-slate-700 font-tabular-nums">{dish.baseForecast}</span> · Forecast: <span className="font-semibold text-slate-700 font-tabular-nums">{dish.expectedSales}</span> · Buffer: <span className="font-semibold text-slate-700 font-tabular-nums">+{Math.round(dish.safetyBufferPct * 100)}%</span>
                                {isChecked && checklistRecord?.completedAt && (
                                  <span className="text-emerald-700"> · Verified {new Date(checklistRecord.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 pl-9 md:pl-0 shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Recommended</p>
                              <p className="text-base font-bold text-slate-900 font-tabular-nums">
                                {dish.effectivePrep} <span className="text-xs font-normal text-slate-500">portions</span>
                              </p>
                            </div>

                            <div className="no-print flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                              <label htmlFor={`par_${dish.dishId}`} className="text-xs text-slate-600 pl-1.5 font-medium whitespace-nowrap">
                                Chef Par:
                              </label>
                              <input
                                id={`par_${dish.dishId}`}
                                type="number"
                                min="0"
                                max="500"
                                value={dish.effectivePrep}
                                onChange={e => onOverrideChange(dish.dishId, Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-16 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-center font-tabular-nums"
                              />
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedDishId(isExpanded ? null : dish.dishId)}
                              className="no-print whitespace-nowrap shrink-0"
                              rightIcon={isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            >
                              BOM ({dish.ingredientBreakdowns.length})
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 text-xs">
                            <p className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-slate-500" />
                              <span>Recipe Bill of Materials for {dish.effectivePrep} portions</span>
                            </p>

                            {dish.ingredientBreakdowns.length === 0 ? (
                              <p className="text-rose-700">
                                No ingredients configured for this dish. Add ingredients in Menu & Recipe BOM.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500">
                                      <th className="py-1.5 font-semibold">Ingredient</th>
                                      <th className="py-1.5 font-semibold">Portion Qty</th>
                                      <th className="py-1.5 font-semibold text-right">Dish Gross Req</th>
                                      <th className="py-1.5 font-semibold text-right">Total On-Hand</th>
                                      <th className="py-1.5 font-semibold text-right">Est. Line Cost</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {dish.ingredientBreakdowns.map(ing => (
                                      <tr key={ing.ingredientId} className="text-slate-800">
                                        <td className="py-1.5 font-medium">{ing.ingredientName}</td>
                                        <td className="py-1.5 text-slate-600 font-tabular-nums">
                                          {ing.portionQuantity} {ing.portionUnit}
                                        </td>
                                        <td className="py-1.5 text-right font-bold font-tabular-nums text-slate-900">
                                          {ing.grossInStockUnit} {ing.stockUnit}
                                        </td>
                                        <td className="py-1.5 text-right font-tabular-nums text-slate-600">
                                          {ing.currentStock} {ing.stockUnit}
                                        </td>
                                        <td className="py-1.5 text-right font-tabular-nums text-slate-700">
                                          ${ing.estimatedLineCost.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
