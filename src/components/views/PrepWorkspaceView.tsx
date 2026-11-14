import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Printer,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Trash2,
  PackagePlus
} from 'lucide-react';
import {
  Station,
  Ingredient,
  PrepSheetRecommendationBundle,
  PrepChecklistItem,
  AppSettings
} from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface PrepWorkspaceViewProps {
  businessDate: string;
  selectedShift: 'All Day' | 'Lunch' | 'Dinner';
  selectedStationFilter: Station | 'All';
  recommendationBundle: PrepSheetRecommendationBundle;
  checklistItems: PrepChecklistItem[];
  ingredients: Ingredient[];
  settings: AppSettings;
  onBusinessDateChange: (date: string) => void;
  onShiftChange: (shift: 'All Day' | 'Lunch' | 'Dinner') => void;
  onStationFilterChange: (station: Station | 'All') => void;
  onToggleChecklistItem: (station: Station, taskId: string) => void;
  onResetPrepSheet: () => void;
  onOverrideChange: (dishId: string, qty: number) => void;
  onSaveStockCount: (ingredientId: string, nextStock: number) => void;
  onOpenWasteModal: () => void;
}

export const PrepWorkspaceView: React.FC<PrepWorkspaceViewProps> = ({
  businessDate,
  selectedShift,
  selectedStationFilter,
  recommendationBundle,
  checklistItems,
  ingredients,
  settings,
  onBusinessDateChange,
  onShiftChange,
  onStationFilterChange,
  onToggleChecklistItem,
  onResetPrepSheet,
  onOverrideChange,
  onSaveStockCount,
  onOpenWasteModal
}) => {
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const stations: (Station | 'All')[] = ['All', 'Grill', 'Saute', 'Garde Manger', 'Bakery'];
  const checklistMap = new Map<string, PrepChecklistItem>(
    checklistItems.map(item => [item.taskId, item])
  );

  const visibleItems = recommendationBundle.itemRecommendations.filter(
    item => selectedStationFilter === 'All' || item.station === selectedStationFilter
  );

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
            {settings.restaurantName} — Kitchen Prep
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {recommendationBundle.totalPredictedPortions} predicted portions · {recommendationBundle.totalRecommendedPrep} recommended prep · {recommendationBundle.totalShortagesCount} stock alerts
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

          <Button size="sm" variant="outline" onClick={() => setIsStockModalOpen(true)} leftIcon={<PackagePlus className="w-3.5 h-3.5" />}>
            Update Stock
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenWasteModal} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
            Log Waste
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmResetOpen(true)} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Reset Sheet
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()} leftIcon={<Printer className="w-3.5 h-3.5" />}>
            Print
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Prep Checklist</h2>
            <p className="text-xs text-slate-500">
              Tap circle to mark complete · Adjust Chef Par to override
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
            No active dishes for this station.
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
                        </div>

                        {dish.prepInstructions && (
                          <p className="text-xs text-slate-500">{dish.prepInstructions}</p>
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

                      {dish.ingredients.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDishId(isExpanded ? null : dish.menuItemId)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                        >
                          <span>BOM</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && dish.ingredients.length > 0 && (
                    <div className="px-5 pb-4 pt-2 pl-13 border-t border-slate-100 bg-slate-50/50 text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="py-1 font-medium">Ingredient</th>
                            <th className="py-1 font-medium text-right">Per Dish</th>
                            <th className="py-1 font-medium text-right">Needed</th>
                            <th className="py-1 font-medium text-right">On Hand</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dish.ingredients.map(ing => (
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {recommendationBundle.ingredientSummaries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Ingredients Needed</h2>
              <p className="text-xs text-slate-500">Raw requirements vs. current stock</p>
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
                  <th className="py-2.5 px-3 text-right">Need</th>
                  <th className="py-2.5 px-3 text-right">In Stock</th>
                  <th className="py-2.5 px-3 text-right">Order (Net)</th>
                  <th className="py-2.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryIngredients.map(ing => (
                  <tr key={ing.ingredientId} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-5 font-semibold text-slate-900">{ing.ingredientName}</td>
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
                      <span className={`font-medium ${ing.isShortage ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {ing.procurementAction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isStockModalOpen && (
        <Modal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          title="Quick Stock Count Update"
          subtitle="Adjust physical inventory on hand"
        >
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
            {ingredients.map(ing => (
              <div key={ing.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{ing.name}</p>
                  <p className="text-slate-400">Safety par: {ing.safetyStock} {ing.unit}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={ing.currentStock}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (Number.isFinite(val) && val >= 0) {
                        onSaveStockCount(ing.id, Math.round(val * 100) / 100);
                      }
                    }}
                    className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-bold font-tabular-nums"
                  />
                  <span className="text-slate-500 w-7">{ing.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {confirmResetOpen && (
        <Modal
          isOpen={confirmResetOpen}
          onClose={() => setConfirmResetOpen(false)}
          title="Reset Prep Checklist"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmResetOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onResetPrepSheet();
                  setConfirmResetOpen(false);
                }}
              >
                Confirm Reset
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">
            Clear checklist checkboxes for {businessDate} ({selectedShift})?
          </p>
        </Modal>
      )}
    </div>
  );
};
