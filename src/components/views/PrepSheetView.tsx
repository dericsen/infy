import React, { useState } from 'react';
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
  CalendarOff,
  PackageCheck
} from 'lucide-react';
import {
  Station,
  PrepSheetRecommendationBundle,
  PrepChecklistItem
} from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface PrepSheetViewProps {
  selectedStationFilter: Station | 'All';
  onStationFilterChange: (station: Station | 'All') => void;
  recommendationBundle: PrepSheetRecommendationBundle;
  checklistItems: PrepChecklistItem[];
  onToggleChecklistItem: (station: Station, taskId: string) => void;
  onResetPrepSheet: () => void;
  onOverrideChange: (dishId: string, qty: number) => void;
}

export const PrepSheetView: React.FC<PrepSheetViewProps> = ({
  selectedStationFilter,
  onStationFilterChange,
  recommendationBundle,
  checklistItems,
  onToggleChecklistItem,
  onResetPrepSheet,
  onOverrideChange
}) => {
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const stations: Station[] = ['Grill', 'Saute', 'Garde Manger', 'Bakery'];
  const activeStations = selectedStationFilter === 'All'
    ? stations
    : stations.filter(s => s === selectedStationFilter);

  const getStationIcon = (station: Station) => {
    switch (station) {
      case 'Grill': return <Flame className="w-4 h-4 text-rose-500" />;
      case 'Saute': return <Soup className="w-4 h-4 text-amber-500" />;
      case 'Garde Manger': return <Salad className="w-4 h-4 text-emerald-500" />;
      case 'Bakery': return <Croissant className="w-4 h-4 text-yellow-600" />;
    }
  };

  const checklistMap = new Map<string, PrepChecklistItem>(
    checklistItems.map(item => [item.taskId, item])
  );

  const visibleItems = recommendationBundle.itemRecommendations.filter(
    item => selectedStationFilter === 'All' || item.station === selectedStationFilter
  );

  const totalTasks = visibleItems.length;
  const completedTasks = visibleItems.filter(item => checklistMap.get(item.menuItemId)?.isCompleted).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Kitchen Preparation Par Sheet
            </h2>
            <Badge variant="emerald" size="sm">Date: {recommendationBundle.businessDate}</Badge>
            <Badge variant="blue" size="sm">{recommendationBundle.shift}</Badge>
            <Badge variant="slate" size="sm">{recommendationBundle.prepSheetId}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Progress: {completedTasks} of {totalTasks} prep items verified ({totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%) • Total Prep: {recommendationBundle.totalRecommendedPrep} portions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => onStationFilterChange('All')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
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
                onClick={() => onStationFilterChange(st)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  selectedStationFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmResetOpen(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            New / Reset Sheet
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Sheet
          </Button>
        </div>
      </div>

      {recommendationBundle.isClosedDay && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <CalendarOff className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Closed Restaurant Day — Zero Preparation Scheduled</p>
            <p className="text-amber-800">
              {recommendationBundle.businessDate} is marked closed in Sales & Calendar settings. No station prep is recommended.
            </p>
          </div>
        </div>
      )}

      {(recommendationBundle.totalShortagesCount > 0 || recommendationBundle.missingRecipesCount > 0 || recommendationBundle.expiringSoonCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {recommendationBundle.totalShortagesCount > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span><strong>{recommendationBundle.totalShortagesCount}</strong> ingredient shortage(s) detected against gross prep demand.</span>
            </div>
          )}
          {recommendationBundle.missingRecipesCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>{recommendationBundle.missingRecipesCount}</strong> active dish(es) missing recipe BOM definitions.</span>
            </div>
          )}
          {recommendationBundle.expiringSoonCount > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-center gap-2.5">
              <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span><strong>{recommendationBundle.expiringSoonCount}</strong> ingredient(s) expiring within 48h — prioritize FIFO use.</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {activeStations.map(station => {
          const stationDishes = recommendationBundle.itemRecommendations.filter(m => m.station === station);
          if (stationDishes.length === 0) return null;

          const stationDone = stationDishes.filter(d => checklistMap.get(d.menuItemId)?.isCompleted).length;

          return (
            <Card
              key={station}
              title={
                <div className="flex items-center gap-2">
                  {getStationIcon(station)}
                  <span>{station} Station Prep</span>
                </div>
              }
              subtitle={`${stationDone} of ${stationDishes.length} completed • Live forecast & inventory decomposition`}
              noPadding
            >
              <div className="divide-y divide-slate-100">
                {stationDishes.map(dish => {
                  const checkRecord = checklistMap.get(dish.menuItemId);
                  const isChecked = !!checkRecord?.isCompleted;
                  const isExpanded = expandedDishId === dish.menuItemId;

                  return (
                    <div
                      key={dish.menuItemId}
                      className={`transition-colors ${isChecked ? 'bg-slate-50/80' : 'bg-white hover:bg-slate-50/40'}`}
                    >
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[56px]">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleChecklistItem(station, dish.menuItemId)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors focus:outline-none mt-0.5"
                            aria-label={`Mark ${dish.dishName} complete`}
                          >
                            {isChecked ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                            ) : (
                              <Circle className="w-6 h-6 text-slate-300" />
                            )}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className={`text-sm font-semibold ${isChecked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {dish.dishName}
                              </h4>
                              <Badge variant="slate" size="sm">{dish.category}</Badge>
                              {dish.isOverridden && <Badge variant="amber" size="sm">Manual Par Override</Badge>}
                              {dish.hasShortage && <Badge variant="rose" size="sm">Ingredient Shortage</Badge>}
                              {dish.missingRecipeWarning && <Badge variant="amber" size="sm">Missing Recipe</Badge>}
                            </div>
                            <p className="text-xs text-slate-500">
                              Predicted Sales: <span className="font-semibold text-slate-700">{dish.predictedPortions}</span>
                              {' '}• 80% Band: <span className="font-mono text-slate-600">[{dish.confidenceInterval80[0]}–{dish.confidenceInterval80[1]}]</span>
                              {' '}• Buffer: <span className="font-semibold text-slate-700">+{Math.round(dish.safetyBufferPct * 100)}%</span>
                            </p>
                            {dish.prepInstructions && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                                <span className="font-semibold text-slate-700">Prep Steps:</span> {dish.prepInstructions}
                              </p>
                            )}
                            {isChecked && checkRecord?.completedAt && (
                              <p className="text-[11px] text-emerald-700 font-medium">
                                Completed by {checkRecord.completedBy || 'Kitchen Staff'} at {new Date(checkRecord.completedAt).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pl-9 md:pl-0 shrink-0">
                          <div className="text-right">
                            <p className="text-[11px] text-slate-400 uppercase font-semibold">Prep Target</p>
                            <p className="text-base font-bold text-slate-900 font-tabular-nums">
                              {dish.effectivePrep} <span className="text-xs font-normal text-slate-500">portions</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <span className="text-xs text-slate-600 pl-1.5 font-medium">Chef Par:</span>
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={dish.effectivePrep}
                              disabled={recommendationBundle.isClosedDay}
                              onChange={e => onOverrideChange(dish.menuItemId, Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-16 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded text-center disabled:opacity-50"
                            />
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedDishId(isExpanded ? null : dish.menuItemId)}
                            rightIcon={isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          >
                            BOM ({dish.ingredients.length})
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 text-xs space-y-3">
                          {dish.missingRecipeWarning ? (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                              {dish.missingRecipeWarning}
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-slate-500" />
                                <span>Recipe Decomposition for {dish.effectivePrep} portions</span>
                              </p>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500">
                                      <th className="py-1.5 font-semibold">Ingredient</th>
                                      <th className="py-1.5 font-semibold">Per Portion</th>
                                      <th className="py-1.5 font-semibold">Gross for Dish</th>
                                      <th className="py-1.5 font-semibold">On-Hand Stock</th>
                                      <th className="py-1.5 font-semibold">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {dish.ingredients.map(ing => {
                                      const deficit = Math.max(0, Math.round((ing.grossForDish - ing.currentStock) * 100) / 100);
                                      return (
                                        <tr key={ing.ingredientId} className="text-slate-800">
                                          <td className="py-1.5 font-medium">{ing.ingredientName}</td>
                                          <td className="py-1.5 text-slate-600">{ing.portionQuantity} {ing.portionUnit}</td>
                                          <td className="py-1.5 font-bold font-tabular-nums text-slate-900">
                                            {ing.unitCompatible ? `${ing.grossForDish} ${ing.stockUnit}` : 'Incompatible'}
                                          </td>
                                          <td className="py-1.5 font-tabular-nums text-slate-600">{ing.currentStock} {ing.stockUnit}</td>
                                          <td className="py-1.5">
                                            {!ing.unitCompatible ? (
                                              <Badge variant="amber" size="sm">{ing.compatibilityWarning || 'Unit mismatch'}</Badge>
                                            ) : deficit > 0 ? (
                                              <Badge variant="rose" size="sm">Shortage (-{deficit} {ing.stockUnit})</Badge>
                                            ) : (
                                              <Badge variant="emerald" size="sm">Covered</Badge>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </>
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

      <Card
        title="Aggregated Ingredient Requirements & Procurement Plan"
        subtitle="Cross-dish gross requirements vs. current inventory, net procurement deficit, and post-prep surplus"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-4">Ingredient</th>
                <th className="py-2.5 px-3 text-right">Gross Required</th>
                <th className="py-2.5 px-3 text-right">Available Stock</th>
                <th className="py-2.5 px-3 text-right">Net To Procure</th>
                <th className="py-2.5 px-3 text-right">Surplus After Prep</th>
                <th className="py-2.5 px-3">Shared Across Dishes</th>
                <th className="py-2.5 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recommendationBundle.ingredientSummaries.map(ing => (
                <tr key={ing.ingredientId} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                    <div>
                      <span>{ing.ingredientName}</span>
                      {ing.expirationDate && (
                        <span className="block text-[10px] font-normal text-slate-500">
                          Exp: {ing.expirationDate}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                    {ing.grossRequired} {ing.stockUnit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-tabular-nums text-slate-600">
                    {ing.availableStock} {ing.stockUnit}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold font-tabular-nums ${ing.netRequired > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {ing.netRequired > 0 ? `${ing.netRequired} ${ing.stockUnit}` : `0 ${ing.stockUnit}`}
                  </td>
                  <td className="py-2.5 px-3 text-right font-tabular-nums text-slate-700">
                    {ing.surplusAfterPrep} {ing.stockUnit}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {ing.sharedAcrossDishes.map(name => (
                        <span key={name} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200">
                          {name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge
                      variant={
                        ing.hasUnitWarning || ing.isExpiringSoon
                          ? 'amber'
                          : ing.isShortage
                          ? 'rose'
                          : 'emerald'
                      }
                      size="sm"
                    >
                      {ing.procurementAction}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {confirmResetOpen && (
        <Modal
          isOpen={confirmResetOpen}
          onClose={() => setConfirmResetOpen(false)}
          title="Generate New Prep Sheet Revision"
          subtitle="Resets current station checklist ticks and creates an isolated new prepSheetId"
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
                Confirm New Prep Sheet
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">
            This will archive checklist state for <strong className="font-mono">{recommendationBundle.prepSheetId}</strong> and start a fresh unchecked sheet for {recommendationBundle.businessDate} ({recommendationBundle.shift}).
          </p>
        </Modal>
      )}
    </div>
  );
};
