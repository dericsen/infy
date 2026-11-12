import React, { useState } from 'react';
import {
  Printer,
  CheckCircle2,
  Circle,
  RotateCcw,
  AlertCircle,
  Flame,
  Soup,
  Salad,
  Croissant,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Station, MenuItem, Ingredient } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface PrepSheetViewProps {
  businessDate: string;
  selectedStationFilter: Station | 'All';
  onStationFilterChange: (station: Station | 'All') => void;
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  checklistStates: Record<string, boolean>;
  onToggleChecklistItem: (taskId: string) => void;
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
  checklistStates,
  onToggleChecklistItem,
  onResetChecklist,
  overrides,
  onOverrideChange
}) => {
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);

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

  const getDishBaseForecast = (dishId: string): number => {
    const defaultVals: Record<string, number> = {
      mnu_grill_chicken_bowl: 42,
      mnu_grill_steak_frites: 26,
      mnu_grill_salmon: 22,
      mnu_saute_creamy_pasta: 30,
      mnu_saute_mushroom_risotto: 22,
      mnu_saute_tofu_stirfry: 16,
      mnu_salad_caesar: 28,
      mnu_salad_kale_avocado: 18,
      mnu_salad_caprese: 16,
      mnu_bakery_sourdough_loaf: 32,
      mnu_bakery_brioche_buns: 38,
      mnu_bakery_focaccia: 24
    };
    return defaultVals[dishId] || 20;
  };

  const getDishBufferPct = (station: Station): number => {
    switch (station) {
      case 'Bakery': return 0.05;
      case 'Garde Manger': return 0.05;
      case 'Grill': return 0.08;
      case 'Saute': return 0.10;
    }
  };

  const totalTasks = menuItems.filter(m => selectedStationFilter === 'All' || m.station === selectedStationFilter).length;
  const completedTasks = menuItems.filter(m => {
    if (selectedStationFilter !== 'All' && m.station !== selectedStationFilter) return false;
    return !!checklistStates[m.id];
  }).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Kitchen Preparation Par Sheet
            </h2>
            <Badge variant="emerald" size="sm">Date: {businessDate}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Progress: {completedTasks} of {totalTasks} prep items verified ({totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
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
            onClick={onResetChecklist}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Checks
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

      <div className="space-y-6">
        {activeStations.map(station => {
          const stationDishes = menuItems.filter(m => m.station === station);
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
              subtitle={`Batch par calculations & ingredient BOM breakdown (${stationDishes.length} items)`}
              noPadding
            >
              <div className="divide-y divide-slate-100">
                {stationDishes.map(dish => {
                  const isChecked = !!checklistStates[dish.id];
                  const isExpanded = expandedDishId === dish.id;
                  const baseForecast = getDishBaseForecast(dish.id);
                  const bufferPct = getDishBufferPct(dish.station);
                  const defaultRecommended = Math.ceil(baseForecast * (1 + bufferPct));
                  const effectivePrep = overrides[dish.id] !== undefined ? overrides[dish.id] : defaultRecommended;
                  const isOverridden = overrides[dish.id] !== undefined && overrides[dish.id] !== defaultRecommended;

                  return (
                    <div
                      key={dish.id}
                      className={`transition-colors ${isChecked ? 'bg-slate-50/80' : 'bg-white hover:bg-slate-50/40'}`}
                    >
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[56px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleChecklistItem(dish.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors focus:outline-none"
                            aria-label={`Mark ${dish.name} complete`}
                          >
                            {isChecked ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                            ) : (
                              <Circle className="w-6 h-6 text-slate-300" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-semibold truncate ${isChecked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {dish.name}
                              </h4>
                              <Badge variant="slate" size="sm">{dish.category}</Badge>
                              {isOverridden && (
                                <Badge variant="amber" size="sm">Manual Par Override</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Base Demand: <span className="font-semibold text-slate-700">{baseForecast}</span> • Par Buffer: <span className="font-semibold text-slate-700">+{Math.round(bufferPct * 100)}%</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pl-9 md:pl-0">
                          <div className="text-right">
                            <p className="text-[11px] text-slate-400 uppercase font-semibold">Recommended Prep</p>
                            <p className="text-base font-bold text-slate-900 font-tabular-nums">
                              {effectivePrep} <span className="text-xs font-normal text-slate-500">portions</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <span className="text-xs text-slate-600 pl-1.5 font-medium">Chef Par:</span>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={effectivePrep}
                              onChange={e => onOverrideChange(dish.id, Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-center"
                            />
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedDishId(isExpanded ? null : dish.id)}
                            rightIcon={isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          >
                            BOM ({dish.ingredients.length})
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 text-xs">
                          <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            <span>Recipe Bill of Materials Decomposition for {effectivePrep} portions:</span>
                          </p>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="py-1.5 font-semibold">Ingredient</th>
                                  <th className="py-1.5 font-semibold">Portion Qty</th>
                                  <th className="py-1.5 font-semibold">Gross Required</th>
                                  <th className="py-1.5 font-semibold">Current Stock</th>
                                  <th className="py-1.5 font-semibold">Net Required</th>
                                  <th className="py-1.5 font-semibold">Stock Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {dish.ingredients.map(ing => {
                                  const rawIng = ingredients.find(i => i.id === ing.ingredientId);
                                  const currentStock = rawIng ? rawIng.currentStock : 10;
                                  const gross = Math.round(ing.quantity * effectivePrep * 100) / 100;
                                  const net = Math.max(0, Math.round((gross - currentStock) * 100) / 100);
                                  const isShortage = currentStock < gross;

                                  return (
                                    <tr key={ing.id} className="text-slate-800">
                                      <td className="py-1.5 font-medium">{ing.ingredientName}</td>
                                      <td className="py-1.5 text-slate-600">{ing.quantity} {ing.unit}</td>
                                      <td className="py-1.5 font-bold font-tabular-nums text-slate-900">{gross} {ing.unit}</td>
                                      <td className="py-1.5 font-tabular-nums text-slate-600">{currentStock} {ing.unit}</td>
                                      <td className="py-1.5 font-bold font-tabular-nums text-emerald-700">
                                        {net > 0 ? `${net} ${ing.unit}` : '0 (Covered)'}
                                      </td>
                                      <td className="py-1.5">
                                        {isShortage ? (
                                          <Badge variant="rose" size="sm">Stock Shortage: Deficit {Math.round((gross - currentStock) * 100) / 100} {ing.unit}</Badge>
                                        ) : (
                                          <Badge variant="emerald" size="sm">Sufficient Stock</Badge>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
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
    </div>
  );
};
