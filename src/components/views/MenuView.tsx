import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Flame,
  Soup,
  Salad,
  Croissant,
  Layers,
  DollarSign,
  Tag
} from 'lucide-react';
import { Station, MenuItem, RecipeBOMItem, Ingredient } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface MenuViewProps {
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  onAddMenuItem?: (item: MenuItem) => void;
}

export const MenuView: React.FC<MenuViewProps> = ({
  menuItems,
  ingredients
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | 'All'>('All');
  const [activeDishForBOM, setActiveDishForBOM] = useState<MenuItem | null>(null);

  const stations: (Station | 'All')[] = ['All', 'Grill', 'Saute', 'Garde Manger', 'Bakery'];

  const filteredDishes = selectedStation === 'All'
    ? menuItems
    : menuItems.filter(m => m.station === selectedStation);

  const getStationBadge = (station: Station) => {
    switch (station) {
      case 'Grill': return <Badge variant="rose" size="sm">Grill</Badge>;
      case 'Saute': return <Badge variant="amber" size="sm">Saute</Badge>;
      case 'Garde Manger': return <Badge variant="emerald" size="sm">Garde Manger</Badge>;
      case 'Bakery': return <Badge variant="purple" size="sm">Bakery</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Menu Catalog & Recipe Bill of Materials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {menuItems.length} active signature dishes mapped to exact raw ingredient portions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {stations.map(st => (
              <button
                key={st}
                onClick={() => setSelectedStation(st)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  selectedStation === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDishes.map(dish => {
          const costMarginPct = Math.round((dish.targetCost / dish.sellingPrice) * 100);

          return (
            <div
              key={dish.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{dish.name}</h3>
                    <p className="text-xs text-slate-500">{dish.category}</p>
                  </div>
                  {getStationBadge(dish.station)}
                </div>

                <div className="grid grid-cols-2 gap-2 my-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Selling Price</span>
                    <span className="text-sm font-bold text-slate-900 font-tabular-nums">
                      ${dish.sellingPrice.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Target Food Cost</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-700 font-tabular-nums">
                        ${dish.targetCost.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-semibold ${costMarginPct <= 30 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        ({costMarginPct}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    BOM Ingredients ({dish.ingredients.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {dish.ingredients.map(ing => (
                      <span
                        key={ing.id}
                        className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                      >
                        {ing.ingredientName}: {ing.quantity} {ing.unit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Station: {dish.station}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveDishForBOM(dish)}
                  leftIcon={<Layers className="w-3.5 h-3.5" />}
                >
                  Inspect BOM
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {activeDishForBOM && (
        <Modal
          isOpen={!!activeDishForBOM}
          onClose={() => setActiveDishForBOM(null)}
          title={`Recipe BOM: ${activeDishForBOM.name}`}
          subtitle={`Station: ${activeDishForBOM.station} • Target Selling Price: $${activeDishForBOM.sellingPrice.toFixed(2)}`}
          footer={
            <Button variant="primary" size="sm" onClick={() => setActiveDishForBOM(null)}>
              Close Recipe Spec
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              The following raw ingredient portions are automatically multiplied against predicted sales to yield the exact gross kitchen preparation requirements:
            </p>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2">Raw Ingredient</th>
                  <th className="py-2">Portion per Dish</th>
                  <th className="py-2">Unit Cost</th>
                  <th className="py-2 text-right">Ingredient Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeDishForBOM.ingredients.map(ing => {
                  const raw = ingredients.find(i => i.id === ing.ingredientId);
                  const unitCost = raw ? raw.unitCost : 5.0;
                  const ingCost = ing.quantity * unitCost;

                  return (
                    <tr key={ing.id} className="text-slate-800">
                      <td className="py-2 font-medium">{ing.ingredientName}</td>
                      <td className="py-2">{ing.quantity} {ing.unit}</td>
                      <td className="py-2 font-tabular-nums text-slate-500">${unitCost.toFixed(2)} / {ing.unit}</td>
                      <td className="py-2 font-bold font-tabular-nums text-right text-slate-900">${ingCost.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};
