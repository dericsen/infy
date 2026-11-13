import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Check,
  PackagePlus,
  History,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { Ingredient, StockMovementRecord, StockMovementType } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface InventoryViewProps {
  ingredients: Ingredient[];
  stockMovements: StockMovementRecord[];
  businessDate: string;
  onAdjustInventory: (params: {
    ingredientId: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
  }) => { success: boolean; error?: string };
  onBatchCommitStockCounts: (counts: Record<string, number>) => { success: boolean; error?: string; changedCount: number };
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  ingredients,
  stockMovements,
  businessDate,
  onAdjustInventory,
  onBatchCommitStockCounts
}) => {
  const [localStock, setLocalStock] = useState<Record<string, number>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementIngId, setMovementIngId] = useState(ingredients[0]?.id || '');
  const [movementType, setMovementType] = useState<'addition' | 'reduction' | 'adjustment'>('addition');
  const [movementQty, setMovementQty] = useState('10.0');
  const [movementReason, setMovementReason] = useState('Morning supplier delivery');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const synced: Record<string, number> = {};
    for (const ing of ingredients) {
      synced[ing.id] = ing.currentStock;
    }
    setLocalStock(synced);
    if (!movementIngId && ingredients[0]) {
      setMovementIngId(ingredients[0].id);
    }
  }, [ingredients, movementIngId]);

  const handleStockChange = (id: string, val: number) => {
    setValidationError(null);
    if (!Number.isFinite(val) || val < 0) {
      setValidationError('Physical inventory counts cannot be negative.');
      return;
    }
    setLocalStock(prev => ({ ...prev, [id]: Math.round(val * 100) / 100 }));
  };

  const handleSaveAll = () => {
    setValidationError(null);
    const result = onBatchCommitStockCounts(localStock);
    if (!result.success) {
      setValidationError(result.error || 'Failed to commit stock counts.');
      return;
    }
    setSavedNotice(
      result.changedCount > 0
        ? `Committed ${result.changedCount} updated stock count(s) and logged movement history.`
        : 'All physical counts already match persisted inventory.'
    );
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleOpenMovementModal = (defaultType: 'addition' | 'reduction' | 'adjustment') => {
    setMovementType(defaultType);
    setMovementReason(
      defaultType === 'addition'
        ? 'Supplier delivery intake'
        : defaultType === 'reduction'
        ? 'Spoilage / kitchen prep shrink'
        : 'Manual physical count reconciliation'
    );
    setModalError(null);
    setIsMovementModalOpen(true);
  };

  const handleApplyMovement = () => {
    setModalError(null);
    const qty = parseFloat(movementQty);
    if (!Number.isFinite(qty) || (movementType === 'adjustment' ? qty < 0 : qty <= 0)) {
      setModalError(
        movementType === 'adjustment'
          ? 'Adjusted stock count must be 0 or greater.'
          : 'Movement quantity must be greater than 0.'
      );
      return;
    }
    if (!movementReason.trim()) {
      setModalError('Provide a reason for this stock movement.');
      return;
    }

    const result = onAdjustInventory({
      ingredientId: movementIngId,
      type: movementType,
      quantity: qty,
      reason: movementReason.trim()
    });

    if (!result.success) {
      setModalError(result.error || 'Could not apply stock movement.');
      return;
    }

    setIsMovementModalOpen(false);
    setSavedNotice('Stock movement recorded and inventory updated.');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const getDaysUntilExpiration = (expDate?: string): number | null => {
    if (!expDate) return null;
    const exp = new Date(expDate);
    const biz = new Date(businessDate);
    if (Number.isNaN(exp.getTime()) || Number.isNaN(biz.getTime())) return null;
    return Math.ceil((exp.getTime() - biz.getTime()) / (1000 * 60 * 60 * 24));
  };

  const deficitItems = ingredients.filter(i => {
    const current = localStock[i.id] !== undefined ? localStock[i.id] : i.currentStock;
    return current < i.safetyStock;
  });

  const expiringItems = ingredients.filter(i => {
    const days = getDaysUntilExpiration(i.expirationDate);
    return days !== null && days <= 2;
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
          <p className="text-xs text-slate-400 mt-1">Based on live on-hand stock</p>
        </div>

        <div className={`p-4 rounded-xl border ${deficitItems.length > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Low-Stock & Expiration Alerts
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {deficitItems.length} Low / {expiringItems.length} Expiring
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {deficitItems.length > 0 || expiringItems.length > 0
              ? 'Review alerts below before prep execution'
              : 'All items meet safety par & freshness'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Stock Operations
            </p>
            <p className="text-sm font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Synchronized
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenMovementModal('addition')}
              leftIcon={<PackagePlus className="w-4 h-4" />}
            >
              Adjust / Receive
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

      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {(deficitItems.length > 0 || expiringItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deficitItems.length > 0 && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Low-Stock Alerts ({deficitItems.length})</span>
              </div>
              <div className="space-y-1">
                {deficitItems.map(item => (
                  <div key={item.id} className="flex justify-between text-rose-800">
                    <span className="font-medium">{item.name}</span>
                    <span className="font-mono font-bold">
                      {item.currentStock} / {item.safetyStock} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expiringItems.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Expiration Warnings ({expiringItems.length})</span>
              </div>
              <div className="space-y-1">
                {expiringItems.map(item => {
                  const days = getDaysUntilExpiration(item.expirationDate);
                  return (
                    <div key={item.id} className="flex justify-between text-amber-900">
                      <span className="font-medium">{item.name}</span>
                      <span className="font-mono font-bold">
                        {days !== null && days <= 0 ? 'Expired' : `Expires in ${days}d`} ({item.expirationDate})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Card
        title="Physical Inventory Count & Safety Buffer Sheet"
        subtitle="Update walk-in and dry storage counts; changes persist across Forecast & Prep Sheet calculations"
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
                <th className="py-3 px-4">Expiration / Par Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingredients.map(ing => {
                const count = localStock[ing.id] !== undefined ? localStock[ing.id] : ing.currentStock;
                const isShortage = count < ing.safetyStock;
                const daysExp = getDaysUntilExpiration(ing.expirationDate);

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
                          onChange={e => handleStockChange(ing.id, parseFloat(e.target.value))}
                          className="w-20 px-2.5 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 text-center font-tabular-nums"
                        />
                        <span className="text-slate-500 font-medium">{ing.unit}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isShortage ? (
                          <Badge variant="rose" size="sm">
                            Deficit {(ing.safetyStock - count).toFixed(1)} {ing.unit}
                          </Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">Healthy Par</Badge>
                        )}
                        {daysExp !== null && daysExp <= 2 && (
                          <Badge variant={daysExp <= 0 ? 'rose' : 'amber'} size="sm">
                            {daysExp <= 0 ? 'Expired' : `Exp ${daysExp}d`}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span>Stock Movement History Ledger</span>
          </div>
        }
        subtitle="Auditable log of supplier deliveries, reductions, manual adjustments, and automatic POS deductions"
        noPadding
      >
        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
          {stockMovements.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No stock movements recorded yet. Receive stock, adjust counts, or record a sale to log movements.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Delta</th>
                  <th className="py-2.5 px-3 text-right">Previous → New</th>
                  <th className="py-2.5 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.slice(0, 50).map(mv => (
                  <tr key={mv.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 font-mono text-slate-600">{mv.date}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{mv.ingredientName}</td>
                    <td className="py-2 px-3">
                      <Badge
                        variant={
                          mv.type === 'addition'
                            ? 'emerald'
                            : mv.type === 'reduction' || mv.type === 'sale_deduction'
                            ? 'rose'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {mv.type}
                      </Badge>
                    </td>
                    <td className={`py-2 px-3 text-right font-bold font-tabular-nums ${mv.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {mv.delta >= 0 ? `+${mv.delta}` : mv.delta} {mv.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {mv.previousStock} → {mv.newStock} {mv.unit}
                    </td>
                    <td className="py-2 px-4 text-slate-600">{mv.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {isMovementModalOpen && (
        <Modal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title="Record Inventory Stock Movement"
          subtitle="Apply validated stock addition, reduction, or direct count adjustment"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsMovementModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyMovement} leftIcon={<ArrowUpDown className="w-3.5 h-3.5" />}>
                Apply Stock Movement
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Movement Type</label>
              <select
                value={movementType}
                onChange={e => setMovementType(e.target.value as 'addition' | 'reduction' | 'adjustment')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="addition">Stock Addition (Delivery / Restock)</option>
                <option value="reduction">Stock Reduction (Shrink / Spoilage / Transfer Out)</option>
                <option value="adjustment">Manual Count Override (Set Exact On-Hand)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Ingredient</label>
              <select
                value={movementIngId}
                onChange={e => setMovementIngId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (On-Hand: {ing.currentStock} {ing.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {movementType === 'adjustment' ? 'New Exact Stock Level' : 'Quantity'} ({ingredients.find(i => i.id === movementIngId)?.unit})
              </label>
              <input
                type="number"
                step="0.5"
                min={movementType === 'adjustment' ? '0' : '0.1'}
                value={movementQty}
                onChange={e => setMovementQty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Audit Note</label>
              <input
                type="text"
                value={movementReason}
                onChange={e => setMovementReason(e.target.value)}
                placeholder="e.g., Morning produce delivery #402"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
