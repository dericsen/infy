import React, { useState } from 'react';
import { Boxes, AlertTriangle, ShieldCheck, Check, Plus, PackagePlus } from 'lucide-react';
import { Ingredient } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface InventoryViewProps {
  ingredients: Ingredient[];
  onUpdateStock: (ingredientId: string, newStock: number) => void;
  onReceiveStock: (ingredientId: string, addedQty: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  ingredients,
  onUpdateStock,
  onReceiveStock
}) => {
  const [localStock, setLocalStock] = useState<Record<string, number>>(
    ingredients.reduce((acc, ing) => ({ ...acc, [ing.id]: ing.currentStock }), {})
  );
  const [savedToast, setSavedToast] = useState(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeIngId, setIntakeIngId] = useState(ingredients[0]?.id || '');
  const [intakeQty, setIntakeQty] = useState('10.0');

  const handleStockChange = (id: string, val: number) => {
    setLocalStock(prev => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const handleSaveAll = () => {
    Object.entries(localStock).forEach(([id, stock]) => {
      onUpdateStock(id, stock);
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleApplyIntake = () => {
    const qty = parseFloat(intakeQty) || 0;
    if (qty <= 0) return;
    onReceiveStock(intakeIngId, qty);
    setLocalStock(prev => ({
      ...prev,
      [intakeIngId]: Math.round(((prev[intakeIngId] || 0) + qty) * 100) / 100
    }));
    setIsIntakeModalOpen(false);
  };

  const deficitItems = ingredients.filter(i => {
    const current = localStock[i.id] !== undefined ? localStock[i.id] : i.currentStock;
    return current < i.safetyStock;
  });

  const totalValuation = ingredients.reduce((sum, ing) => {
    const stock = localStock[ing.id] !== undefined ? localStock[ing.id] : ing.currentStock;
    return sum + stock * ing.unitCost;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Inventory Valuation
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            ${totalValuation.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Based on current on-hand units</p>
        </div>

        <div className={`p-4 rounded-xl border ${deficitItems.length > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Safety Par Deficits
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {deficitItems.length} Ingredients
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {deficitItems.length > 0 ? 'Stock is lower than recommended par' : 'All items meet safety par'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Morning Stock Intake
            </p>
            <p className="text-sm font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Ready for Prep
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsIntakeModalOpen(true)}
              leftIcon={<PackagePlus className="w-4 h-4" />}
            >
              Receive Stock
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveAll}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Commit Counts
            </Button>
          </div>
        </div>
      </div>

      {savedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Physical stock counts successfully committed and synchronized to database.</span>
        </div>
      )}

      <Card
        title="Physical Inventory Count & Safety Buffer Sheet"
        subtitle="Update morning walk-in and dry storage counts to determine accurate prep net deficits"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Raw Ingredient</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3 text-right">Safety Par</th>
                <th className="py-3 px-4 text-center">Physical Count</th>
                <th className="py-3 px-4">Par Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.map(ing => {
                const count = localStock[ing.id] !== undefined ? localStock[ing.id] : ing.currentStock;
                const isShortage = count < ing.safetyStock;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {ing.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="slate" size="sm">{ing.category}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-tabular-nums text-slate-600">
                      ${ing.unitCost.toFixed(2)} / {ing.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-500 font-tabular-nums">
                      {ing.safetyStock} {ing.unit}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={count}
                          onChange={e => handleStockChange(ing.id, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 text-center font-tabular-nums"
                        />
                        <span className="text-slate-500 font-medium">{ing.unit}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      {isShortage ? (
                        <span className="text-rose-700 font-medium inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Shortage: Deficit {(ing.safetyStock - count).toFixed(1)} {ing.unit}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Healthy Par
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isIntakeModalOpen && (
        <Modal
          isOpen={isIntakeModalOpen}
          onClose={() => setIsIntakeModalOpen(false)}
          title="Receive Supplier Stock Intake"
          subtitle="Record delivery quantities to increment available on-hand inventory"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsIntakeModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyIntake} leftIcon={<Check className="w-3.5 h-3.5" />}>
                Confirm Delivery Intake
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Delivered Ingredient</label>
              <select
                value={intakeIngId}
                onChange={e => setIntakeIngId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Current Stock: {ing.currentStock} {ing.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivered Quantity ({ingredients.find(i => i.id === intakeIngId)?.unit})</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={intakeQty}
                onChange={e => setIntakeQty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
