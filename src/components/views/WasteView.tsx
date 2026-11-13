import React, { useState } from 'react';
import {
  Trash2,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { WasteRecord, WasteReason, MenuItem } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface WasteViewProps {
  wasteRecords: WasteRecord[];
  menuItems: MenuItem[];
  businessDate: string;
  onAddWasteRecord: (record: WasteRecord) => void;
  isOpenQuickLogModal: boolean;
  onCloseQuickLogModal: () => void;
}

export const WasteView: React.FC<WasteViewProps> = ({
  wasteRecords,
  menuItems,
  businessDate,
  onAddWasteRecord,
  isOpenQuickLogModal,
  onCloseQuickLogModal
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState(menuItems[0]?.id || '');
  const [wasteQty, setWasteQty] = useState<string>('3');
  const [wasteReason, setWasteReason] = useState<WasteReason>('Overproduction');
  const [loggedBy, setLoggedBy] = useState('Chef Marco');
  const [formError, setFormError] = useState<string | null>(null);

  const totalWasteLoss = wasteRecords.reduce((sum, r) => sum + r.totalLossCost, 0);
  const totalDiscardedPortions = wasteRecords.reduce((sum, r) => sum + r.quantity, 0);

  const handleSaveWaste = () => {
    setFormError(null);
    const dish = menuItems.find(m => m.id === selectedDishId) || menuItems[0];
    if (!dish) {
      setFormError('No menu items available to log waste against.');
      return;
    }

    const qty = parseInt(wasteQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError('Discarded portions must be at least 1.');
      return;
    }

    if (!loggedBy.trim()) {
      setFormError('Enter staff member name logging this discard.');
      return;
    }

    const costPerPortion = dish.targetCost;
    const totalLoss = Math.round(costPerPortion * qty * 100) / 100;

    const newRec: WasteRecord = {
      id: `wst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: dish.restaurantId || 'rst_rustic_table',
      date: businessDate,
      itemId: dish.id,
      itemType: 'menu_item',
      name: dish.name,
      quantity: qty,
      unit: 'portions',
      unitCost: costPerPortion,
      totalLossCost: totalLoss,
      reason: wasteReason,
      loggedBy: loggedBy.trim(),
      station: dish.station
    };

    onAddWasteRecord(newRec);
    setIsModalOpen(false);
    onCloseQuickLogModal();
  };

  const reasons: WasteReason[] = ['Overproduction', 'Expired', 'Prep Mistake', 'Quality Defect'];

  const getReasonColor = (reason: WasteReason) => {
    switch (reason) {
      case 'Overproduction': return 'rose';
      case 'Expired': return 'amber';
      case 'Prep Mistake': return 'purple';
      case 'Quality Defect': return 'slate';
    }
  };

  const isModalActive = isModalOpen || isOpenQuickLogModal;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Shift Waste Logs & Financial Loss Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record end-of-shift batch discards to audit overproduction patterns and recover kitchen margins
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setFormError(null);
              if (!selectedDishId && menuItems[0]) setSelectedDishId(menuItems[0].id);
              setIsModalOpen(true);
            }}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Record Waste Discard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Logged Waste Loss
          </p>
          <p className="text-2xl font-bold text-rose-700 mt-1 font-tabular-nums">
            ${totalWasteLoss.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Direct food cost discarded</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Portions Discarded
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {totalDiscardedPortions} Portions
          </p>
          <p className="text-xs text-slate-400 mt-1">Across {wasteRecords.length} logged event(s)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Primary Loss Driver
          </p>
          <p className="text-sm font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4" />
            {wasteRecords.filter(w => w.reason === 'Overproduction').length} Overproduction Event(s)
          </p>
          <p className="text-xs text-slate-400 mt-1">Tracked against recommended station pars</p>
        </div>
      </div>

      <Card
        title="Waste Log History"
        subtitle="Auditable record of discarded food by date and reason code"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Station</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Portion Cost</th>
                <th className="py-2.5 px-3 text-right">Total Loss ($)</th>
                <th className="py-2.5 px-3">Reason Code</th>
                <th className="py-2.5 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wasteRecords.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-mono text-slate-600">{rec.date}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{rec.name}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="slate" size="sm">{rec.station || 'Kitchen'}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                    {rec.quantity} {rec.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-600 font-tabular-nums">
                    ${rec.unitCost.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-700 font-tabular-nums">
                    ${rec.totalLossCost.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={getReasonColor(rec.reason)} size="sm">{rec.reason}</Badge>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{rec.loggedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalActive}
        onClose={() => {
          setIsModalOpen(false);
          onCloseQuickLogModal();
        }}
        title="Record End-of-Shift Waste Discard"
        subtitle={`Logging waste against service date ${businessDate}`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                onCloseQuickLogModal();
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleSaveWaste}>
              Record Waste Entry
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Discarded Menu Item</label>
            <select
              value={selectedDishId}
              onChange={e => setSelectedDishId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
            >
              {menuItems.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.station}) — Cost: ${m.targetCost.toFixed(2)}/portion
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Portions Discarded</label>
              <input
                type="number"
                min="1"
                max="500"
                value={wasteQty}
                onChange={e => setWasteQty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason Code</label>
              <select
                value={wasteReason}
                onChange={e => setWasteReason(e.target.value as WasteReason)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                {reasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Logged By</label>
            <input
              type="text"
              value={loggedBy}
              onChange={e => setLoggedBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
