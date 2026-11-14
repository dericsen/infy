import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Printer,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  CalendarOff
} from 'lucide-react';
import {
  AppRoute,
  Station,
  PrepSheetRecommendationBundle,
  PrepChecklistItem,
  ContextualAnalysisResult,
  AppSettings
} from '../../types';
import { DishForecastResult } from '../../engine/forecastingEngine';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface TodayViewProps {
  businessDate: string;
  selectedShift: 'All Day' | 'Lunch' | 'Dinner';
  selectedStationFilter: Station | 'All';
  recommendationBundle: PrepSheetRecommendationBundle;
  checklistItems: PrepChecklistItem[];
  forecasts: DishForecastResult[];
  contextualAnalysis: ContextualAnalysisResult | null;
  weatherCondition: 'Clear' | 'Rain' | 'Cloudy' | 'Storm';
  temperatureC: number;
  rainChance: number;
  eventTag: string;
  settings: AppSettings;
  onBusinessDateChange: (date: string) => void;
  onShiftChange: (shift: 'All Day' | 'Lunch' | 'Dinner') => void;
  onStationFilterChange: (station: Station | 'All') => void;
  onToggleChecklistItem: (station: Station, taskId: string) => void;
  onResetPrepSheet: () => void;
  onOverrideChange: (dishId: string, qty: number) => void;
  onNavigate: (route: AppRoute) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  businessDate,
  selectedShift,
  selectedStationFilter,
  recommendationBundle,
  checklistItems,
  forecasts,
  contextualAnalysis,
  weatherCondition,
  temperatureC,
  rainChance,
  eventTag,
  settings,
  onBusinessDateChange,
  onShiftChange,
  onStationFilterChange,
  onToggleChecklistItem,
  onResetPrepSheet,
  onOverrideChange,
  onNavigate
}) => {
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const stations: (Station | 'All')[] = ['All', 'Grill', 'Saute', 'Garde Manger', 'Bakery'];
  const checklistMap = new Map<string, PrepChecklistItem>(
    checklistItems.map(item => [item.taskId, item])
  );

  const visibleItems = recommendationBundle.itemRecommendations.filter(
    item => selectedStationFilter === 'All' || item.station === selectedStationFilter
  );

  const completedCount = visibleItems.filter(item => checklistMap.get(item.menuItemId)?.isCompleted).length;
  const totalBaseStatistical = forecasts.reduce((sum, f) => sum + f.baseStatisticalForecast, 0);

  const visibleIngredients = showAllIngredients
    ? recommendationBundle.ingredientSummaries
    : recommendationBundle.ingredientSummaries.filter(
        ing => ing.isShortage || ing.isExpiringSoon || ing.hasUnitWarning || ing.isLowStock
      );

  const summaryIngredients = visibleIngredients.length > 0
    ? visibleIngredients
    : recommendationBundle.ingredientSummaries.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {settings.restaurantName} — Daily Prep
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {settings.concept} · {recommendationBundle.prepSheetId}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={businessDate}
            onChange={e => onBusinessDateChange(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
          />

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(['All Day', 'Lunch', 'Dinner'] as const).map(shift => (
              <button
                key={shift}
                type="button"
                onClick={() => onShiftChange(shift)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedShift === shift
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {shift}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmResetOpen(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            New Sheet
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print
          </Button>
        </div>
      </div>

      {recommendationBundle.isClosedDay && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
          <CalendarOff className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Closed Day:</strong> {businessDate} is marked closed. All prep targets are set to 0.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Predicted Demand</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {recommendationBundle.totalPredictedPortions} portions
          </p>
          <p className="text-xs text-slate-500 mt-1">
            4-week baseline: {totalBaseStatistical} portions
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Recommended Prep</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {recommendationBundle.totalRecommendedPrep} portions
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Checklist: {completedCount} of {visibleItems.length} completed
          </p>
        </div>

        <div className={`border rounded-xl p-4 ${
          recommendationBundle.totalShortagesCount > 0 || recommendationBundle.expiringSoonCount > 0
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-white border-slate-200'
        }`}>
          <p className="text-xs font-medium text-slate-500">Stock & Recipe Alerts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {recommendationBundle.totalShortagesCount} shortages
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {recommendationBundle.expiringSoonCount} expiring soon · {recommendationBundle.missingRecipesCount} missing recipes
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-600 min-w-0">
          <span className="font-semibold text-slate-900">
            {contextualAnalysis && !contextualAnalysis.isFallback ? 'Gemini Context Active:' : 'Forecast Context:'}
          </span>{' '}
          {contextualAnalysis
            ? contextualAnalysis.generalAssessment
            : `${weatherCondition}, ${temperatureC}°C, ${rainChance}% rain · ${eventTag} (bounded ±${settings.aiAdjustmentLimitPct}%)`}
        </div>
        <button
          type="button"
          onClick={() => onNavigate('forecast')}
          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
        >
          <span>Adjust Forecast</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Prep Checklist</h2>
            <p className="text-xs text-slate-500">
              Tap circle to mark complete · Adjust Chef Par to override prep quantity
            </p>
          </div>

          <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {stations.map(st => (
              <button
                key={st}
                type="button"
                onClick={() => onStationFilterChange(st)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedStationFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No active dishes found for this station. Add or enable dishes in Kitchen.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleItems.map(dish => {
              const checkRecord = checklistMap.get(dish.menuItemId);
              const isChecked = !!checkRecord?.isCompleted;
              const isExpanded = expandedDishId === dish.menuItemId;

              return (
                <div key={dish.menuItemId} className={isChecked ? 'bg-slate-50/70' : 'bg-white'}>
                  <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleChecklistItem(dish.station, dish.menuItemId)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                        aria-label={`Mark ${dish.dishName} complete`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={`text-sm font-semibold ${isChecked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {dish.dishName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {dish.station} · {dish.category}
                          </span>
                          {dish.hasShortage && (
                            <span className="text-xs font-medium text-rose-700 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Stock shortage
                            </span>
                          )}
                          {dish.missingRecipeWarning && (
                            <span className="text-xs font-medium text-amber-700">Missing recipe</span>
                          )}
                        </div>

                        {dish.prepInstructions && (
                          <p className="text-xs text-slate-500">{dish.prepInstructions}</p>
                        )}

                        {isChecked && checkRecord?.completedAt && (
                          <p className="text-xs text-emerald-700">
                            Done by {checkRecord.completedBy || 'Staff'} at {new Date(checkRecord.completedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-8 sm:pl-0 shrink-0 text-xs">
                      <div className="text-right">
                        <span className="text-slate-400 block">Pred: {dish.predictedPortions}</span>
                        <span className="font-semibold text-slate-700">
                          Prep: <strong className="text-slate-900 font-tabular-nums">{dish.effectivePrep}</strong>
                        </span>
                      </div>

                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={dish.effectivePrep}
                        disabled={recommendationBundle.isClosedDay}
                        onChange={e => onOverrideChange(dish.menuItemId, Math.max(0, parseInt(e.target.value, 10) || 0))}
                        aria-label={`Chef par for ${dish.dishName}`}
                        className="w-16 px-2 py-1 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded text-center font-tabular-nums disabled:opacity-50"
                      />

                      <button
                        type="button"
                        onClick={() => setExpandedDishId(isExpanded ? null : dish.menuItemId)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        <span>BOM</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-2 pl-13 border-t border-slate-100 bg-slate-50/50 text-xs">
                      {dish.missingRecipeWarning ? (
                        <p className="text-amber-800">{dish.missingRecipeWarning}</p>
                      ) : (
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-200">
                              <th className="py-1 font-medium">Ingredient</th>
                              <th className="py-1 font-medium text-right">Per Dish</th>
                              <th className="py-1 font-medium text-right">Needed</th>
                              <th className="py-1 font-medium text-right">On Hand</th>
                              <th className="py-1 font-medium text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dish.ingredients.map(ing => {
                              const deficit = Math.max(0, Math.round((ing.grossForDish - ing.currentStock) * 100) / 100);
                              return (
                                <tr key={ing.ingredientId}>
                                  <td className="py-1.5 font-medium text-slate-800">{ing.ingredientName}</td>
                                  <td className="py-1.5 text-right text-slate-600 font-tabular-nums">
                                    {ing.portionQuantity} {ing.portionUnit}
                                  </td>
                                  <td className="py-1.5 text-right font-semibold text-slate-900 font-tabular-nums">
                                    {ing.unitCompatible ? `${ing.grossForDish} ${ing.stockUnit}` : 'Incompatible'}
                                  </td>
                                  <td className="py-1.5 text-right text-slate-600 font-tabular-nums">
                                    {ing.currentStock} {ing.stockUnit}
                                  </td>
                                  <td className="py-1.5 text-right">
                                    {!ing.unitCompatible ? (
                                      <span className="text-amber-700 font-medium">Unit mismatch</span>
                                    ) : deficit > 0 ? (
                                      <span className="text-rose-700 font-medium">Short {deficit} {ing.stockUnit}</span>
                                    ) : (
                                      <span className="text-emerald-700 font-medium">OK</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Ingredients Needed Today</h2>
            <p className="text-xs text-slate-500">
              Combined raw requirements across all dishes vs. current stock
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllIngredients(prev => !prev)}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            {showAllIngredients
              ? 'Show Alerts Only'
              : `Show All (${recommendationBundle.ingredientSummaries.length})`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-5">Ingredient</th>
                <th className="py-2.5 px-3 text-right">Need (Gross)</th>
                <th className="py-2.5 px-3 text-right">In Stock</th>
                <th className="py-2.5 px-3 text-right">Order (Net)</th>
                <th className="py-2.5 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryIngredients.map(ing => (
                <tr key={ing.ingredientId} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-5">
                    <span className="font-semibold text-slate-900">{ing.ingredientName}</span>
                    {ing.sharedAcrossDishes.length > 0 && (
                      <span className="block text-slate-400 truncate max-w-xs">
                        {ing.sharedAcrossDishes.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-tabular-nums">
                    {ing.grossRequired} {ing.stockUnit}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">
                    {ing.availableStock} {ing.stockUnit}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold font-tabular-nums ${ing.netRequired > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {ing.netRequired} {ing.stockUnit}
                  </td>
                  <td className="py-2.5 px-5">
                    <span className={`font-medium ${
                      ing.isShortage
                        ? 'text-rose-700'
                        : ing.isExpiringSoon || ing.hasUnitWarning
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}>
                      {ing.procurementAction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmResetOpen && (
        <Modal
          isOpen={confirmResetOpen}
          onClose={() => setConfirmResetOpen(false)}
          title="Start New Prep Sheet"
          subtitle="Resets current checklist progress for a fresh sheet revision"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmResetOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onResetPrepSheet();
                  setConfirmResetOpen(false);
                }}
              >
                Confirm New Sheet
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">
            This clears the current checkboxes for {businessDate} ({selectedShift}) and starts a fresh prep sheet.
          </p>
        </Modal>
      )}
    </div>
  );
};
