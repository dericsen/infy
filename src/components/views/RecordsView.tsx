import React, { useState, useEffect } from 'react';
import {
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  RotateCcw,
  Check,
  AlertTriangle,
  LogIn,
  LogOut
} from 'lucide-react';
import {
  SaleRecord,
  WasteRecord,
  MenuItem,
  Ingredient,
  ClosedDayRecord,
  AppSettings,
  Station
} from '../../types';
import { UserSession } from '../../services/authService';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { convertQuantity } from '../../engine/unitConversion';

interface RecordsViewProps {
  salesRecords: SaleRecord[];
  wasteRecords: WasteRecord[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  closedDays: ClosedDayRecord[];
  settings: AppSettings;
  businessDate: string;
  currentUser: UserSession | null;
  onUploadCsv: (records: SaleRecord[]) => void;
  onRecordSaleTransaction: (sale: SaleRecord) => { success: boolean; error?: string; deductedDetails: string[] };
  onUpdateSaleRecord: (sale: SaleRecord) => void;
  onAddClosedDay: (date: string, reason: string) => void;
  onRemoveClosedDay: (id: string) => void;
  onOpenWasteModal: () => void;
  onSaveSettings: (updated: AppSettings) => void;
  onResetToBenchmark: () => void;
  onExportJson: () => void;
  onImportJson: (data: string) => { success: boolean; error?: string };
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  salesRecords,
  wasteRecords,
  menuItems,
  ingredients,
  closedDays,
  settings,
  businessDate,
  currentUser,
  onUploadCsv,
  onRecordSaleTransaction,
  onUpdateSaleRecord,
  onAddClosedDay,
  onRemoveClosedDay,
  onOpenWasteModal,
  onSaveSettings,
  onResetToBenchmark,
  onExportJson,
  onImportJson,
  onOpenAuthModal,
  onLogout
}) => {
  const [subTab, setSubTab] = useState<'sales' | 'waste' | 'settings'>('sales');

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleDishId, setSaleDishId] = useState(menuItems[0]?.id || '');
  const [saleDate, setSaleDate] = useState(businessDate);
  const [saleQty, setSaleQty] = useState('12');
  const [salePeriod, setSalePeriod] = useState<'All Day' | 'Lunch' | 'Dinner'>('Dinner');
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleBanner, setSaleBanner] = useState<string | null>(null);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvParsed, setCsvParsed] = useState<SaleRecord[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPeriod, setEditPeriod] = useState<'All Day' | 'Lunch' | 'Dinner'>('Dinner');

  const [closedDateInput, setClosedDateInput] = useState(businessDate);
  const [closedReasonInput, setClosedReasonInput] = useState('Holiday / Closed');

  const [restaurantName, setRestaurantName] = useState(settings.restaurantName);
  const [concept, setConcept] = useState(settings.concept);
  const [currency, setCurrency] = useState(settings.currency);
  const [aiLimitPct, setAiLimitPct] = useState(settings.aiAdjustmentLimitPct);
  const [stationBuffers, setStationBuffers] = useState<Record<Station, number>>(settings.stationBuffers);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    setRestaurantName(settings.restaurantName);
    setConcept(settings.concept);
    setCurrency(settings.currency);
    setAiLimitPct(settings.aiAdjustmentLimitPct);
    setStationBuffers(settings.stationBuffers);
  }, [settings]);

  const handleCommitSale = () => {
    setSaleError(null);
    const dish = menuItems.find(m => m.id === saleDishId);
    if (!dish) {
      setSaleError('Select a valid dish.');
      return;
    }
    const qty = parseInt(saleQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setSaleError('Quantity must be at least 1.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
      setSaleError('Provide a valid date.');
      return;
    }
    if (closedDays.some(c => c.date === saleDate)) {
      setSaleError(`${saleDate} is marked as Closed.`);
      return;
    }

    const res = onRecordSaleTransaction({
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      restaurantId: dish.restaurantId || 'rst_rustic_table',
      date: saleDate,
      dayOfWeek: new Date(saleDate).getDay(),
      menuItemId: dish.id,
      dishName: dish.name,
      station: dish.station,
      quantitySold: qty,
      revenue: Math.round(dish.sellingPrice * qty * 100) / 100,
      mealPeriod: salePeriod,
      weatherCondition: 'Clear',
      temperatureC: 20,
      eventTag: 'Shift Order',
      isDemonstrationData: false
    });

    if (!res.success) {
      setSaleError(res.error || 'Could not record sale.');
      return;
    }

    setSaleBanner(`Recorded ${qty}x ${dish.name} and deducted recipe stock.`);
    setIsSaleModalOpen(false);
    setTimeout(() => setSaleBanner(null), 4000);
  };

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setCsvErrors(['CSV must include a header row and at least one data row.']);
        setCsvParsed([]);
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dateIdx = headers.indexOf('date');
      const idIdx = headers.indexOf('menu_item_id');
      const nameIdx = headers.indexOf('dish_name');
      const stIdx = headers.indexOf('station');
      const qtyIdx = headers.indexOf('quantity_sold');
      const revIdx = headers.indexOf('revenue');

      if (dateIdx === -1 || qtyIdx === -1 || (idIdx === -1 && nameIdx === -1)) {
        setCsvErrors(['Missing required columns: date, quantity_sold, and menu_item_id or dish_name.']);
        setCsvParsed([]);
        return;
      }

      const valid: SaleRecord[] = [];
      const errs: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const d = cols[dateIdx] || '';
        const q = parseInt(cols[qtyIdx] || '', 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(q) || q < 0) {
          errs.push(`Row ${i + 1}: Invalid date or quantity.`);
          continue;
        }
        const rawId = idIdx >= 0 ? cols[idIdx] : '';
        const rawName = nameIdx >= 0 ? cols[nameIdx] : '';
        const matched = menuItems.find(m => m.id === rawId || m.name.toLowerCase() === rawName.toLowerCase());
        if (!matched && !rawName) {
          errs.push(`Row ${i + 1}: Unknown dish.`);
          continue;
        }
        const parsedRev = revIdx >= 0 ? parseFloat(cols[revIdx] || '') : NaN;
        const rev = Number.isFinite(parsedRev) && parsedRev >= 0
          ? Math.round(parsedRev * 100) / 100
          : Math.round((matched?.sellingPrice || 18) * q * 100) / 100;

        valid.push({
          id: `csv_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
          restaurantId: 'rst_rustic_table',
          date: d,
          dayOfWeek: new Date(d).getDay(),
          menuItemId: matched ? matched.id : rawId || `custom_${i}`,
          dishName: matched ? matched.name : rawName,
          station: (stIdx >= 0 && cols[stIdx] ? cols[stIdx] : matched?.station || 'Grill') as Station,
          quantitySold: q,
          revenue: rev,
          mealPeriod: 'All Day',
          weatherCondition: 'Clear',
          temperatureC: 20,
          eventTag: 'CSV Import',
          isDemonstrationData: false
        });
      }
      setCsvParsed(valid);
      setCsvErrors(errs);
    };
    reader.readAsText(file);
  };

  const handleSaveEditSale = () => {
    if (!editingSale) return;
    const qty = parseInt(editQty, 10);
    if (!Number.isFinite(qty) || qty < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(editDate)) return;
    const dish = menuItems.find(m => m.id === editingSale.menuItemId);
    const unitPrice = dish ? dish.sellingPrice : editingSale.quantitySold > 0 ? editingSale.revenue / editingSale.quantitySold : 18;
    onUpdateSaleRecord({
      ...editingSale,
      date: editDate,
      dayOfWeek: new Date(editDate).getDay(),
      quantitySold: qty,
      revenue: Math.round(unitPrice * qty * 100) / 100,
      mealPeriod: editPeriod,
      isDemonstrationData: false
    });
    setEditingSale(null);
  };

  const totalWasteLoss = wasteRecords.reduce((s, r) => s + r.totalLossCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Records & Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {salesRecords.length} sales entries · {wasteRecords.length} waste logs · {closedDays.length} closed days
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          {(['sales', 'waste', 'settings'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setSubTab(tab)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                subTab === tab ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'sales' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={closedDateInput} onChange={e => setClosedDateInput(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              <input type="text" value={closedReasonInput} onChange={e => setClosedReasonInput(e.target.value)} placeholder="Closed reason" className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg w-40" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (/^\d{4}-\d{2}-\d{2}$/.test(closedDateInput)) {
                    onAddClosedDay(closedDateInput, closedReasonInput.trim() || 'Closed');
                  }
                }}
              >
                Mark Closed
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCsvParsed([]);
                  setCsvErrors([]);
                  setCsvFileName('');
                  setIsCsvModalOpen(true);
                }}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                Import CSV
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setSaleDate(businessDate);
                  setSaleError(null);
                  if (menuItems[0] && !saleDishId) setSaleDishId(menuItems[0].id);
                  setIsSaleModalOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Record Sale
              </Button>
            </div>
          </div>

          {closedDays.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Closed days:</span>
              {closedDays.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
                  <span className="font-mono font-semibold">{c.date}</span> ({c.reason})
                  <button type="button" onClick={() => onRemoveClosedDay(c.id)} className="text-amber-700 hover:text-rose-700">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {saleBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saleBanner}</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Dish</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-4 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesRecords.slice(0, 80).map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-4 font-mono text-slate-600">{rec.date}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{rec.dishName}</td>
                      <td className="py-2 px-3 text-slate-600">{rec.station}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-tabular-nums">{rec.quantitySold}</td>
                      <td className="py-2 px-3 text-right text-slate-700 font-tabular-nums">${rec.revenue.toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-600">{rec.mealPeriod}</td>
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSale(rec);
                            setEditQty(rec.quantitySold.toString());
                            setEditDate(rec.date);
                            setEditPeriod(rec.mealPeriod);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'waste' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Total Logged Loss: </span>
              <strong className="text-base font-bold text-rose-700 font-tabular-nums">
                {settings.currency}{totalWasteLoss.toFixed(2)}
              </strong>
              <span className="text-slate-500 ml-3">
                {wasteRecords.reduce((s, r) => s + r.quantity, 0)} portions across {wasteRecords.length} entries
              </span>
            </div>
            <Button size="sm" variant="danger" onClick={onOpenWasteModal} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
              Log Waste
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Loss</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-4">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wasteRecords.map(rec => (
                    <tr key={rec.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{rec.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{rec.name}</td>
                      <td className="py-2.5 px-3 text-right font-tabular-nums">{rec.quantity} {rec.unit}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700 font-tabular-nums">
                        {settings.currency}{rec.totalLossCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{rec.reason}</td>
                      <td className="py-2.5 px-4 text-slate-600">{rec.loggedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'settings' && (
        <div className="space-y-4 max-w-3xl text-xs">
          {settingsSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Settings saved.</span>
            </div>
          )}

          {importFeedback && (
            <div className={`p-3 border rounded-xl flex items-center gap-2 ${
              importFeedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {importFeedback.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{importFeedback.msg}</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Restaurant & Forecasting Settings</h2>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onSaveSettings({
                    ...settings,
                    restaurantName: restaurantName.trim() || 'The Rustic Table',
                    concept: concept.trim() || 'Bistro & Seasonal Kitchen',
                    currency: currency.trim() || '$',
                    aiAdjustmentLimitPct: aiLimitPct,
                    stationBuffers,
                    updatedAt: Date.now()
                  });
                  setSettingsSaved(true);
                  setTimeout(() => setSettingsSaved(false), 3000);
                }}
              >
                Save Settings
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Restaurant Name</label>
                <input type="text" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Concept</label>
                <input type="text" value={concept} onChange={e => setConcept(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Currency</label>
                <input type="text" maxLength={4} value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                AI Context Adjustment Limit: ±{aiLimitPct}%
              </label>
              <input type="range" min="5" max="35" value={aiLimitPct} onChange={e => setAiLimitPct(parseInt(e.target.value, 10))} className="w-full accent-emerald-600" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {(['Grill', 'Saute', 'Garde Manger', 'Bakery'] as const).map(st => (
                <div key={st}>
                  <label className="block font-medium text-slate-700 mb-1">{st} Buffer (+{stationBuffers[st]}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={stationBuffers[st]}
                    onChange={e => setStationBuffers(prev => ({ ...prev, [st]: parseInt(e.target.value, 10) }))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Staff Account</h2>
              <p className="text-slate-500 mt-0.5">
                {currentUser ? `Signed in as ${currentUser.displayName || currentUser.email}` : 'Using local IndexedDB persistence'}
              </p>
            </div>
            {currentUser ? (
              <Button size="sm" variant="outline" onClick={onLogout} leftIcon={<LogOut className="w-3.5 h-3.5" />}>
                Sign Out
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onOpenAuthModal} leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                Sign In
              </Button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Backup & Reset</h2>
              <p className="text-slate-500 mt-0.5">Export JSON snapshot, restore backup, or reset to demo dataset</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={onExportJson} leftIcon={<Download className="w-3.5 h-3.5" />}>
                Export JSON
              </Button>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = ev => {
                      const res = onImportJson(typeof ev.target?.result === 'string' ? ev.target.result : '');
                      setImportFeedback({
                        ok: res.success,
                        msg: res.success ? `Restored backup from ${file.name}.` : res.error || 'Invalid JSON.'
                      });
                    };
                    r.readAsText(file);
                  }}
                />
              </label>
              <Button size="sm" variant="outline" onClick={() => setConfirmResetOpen(true)} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                Reset Demo Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSaleModalOpen && (
        <Modal
          isOpen={isSaleModalOpen}
          onClose={() => setIsSaleModalOpen(false)}
          title="Record Sale"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsSaleModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCommitSale}>Commit & Deduct Stock</Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            {saleError && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">{saleError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Period</label>
                <select value={salePeriod} onChange={e => setSalePeriod(e.target.value as 'All Day' | 'Lunch' | 'Dinner')} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="All Day">All Day</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Dish</label>
              <select value={saleDishId} onChange={e => setSaleDishId(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                {menuItems.map(m => (
                  <option key={m.id} value={m.id}>{m.name} (${m.sellingPrice.toFixed(2)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Quantity Sold</label>
              <input type="number" min="1" max="1000" value={saleQty} onChange={e => setSaleQty(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold" />
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <p className="font-medium text-slate-700">Stock Deduction Preview:</p>
              {menuItems.find(m => m.id === saleDishId)?.ingredients.map(bom => {
                const q = Math.max(1, parseInt(saleQty, 10) || 1);
                const stockIng = ingredients.find(i => i.id === bom.ingredientId);
                const conv = stockIng ? convertQuantity(bom.quantity * q, bom.unit, stockIng.unit) : { compatible: false, value: 0 };
                return (
                  <div key={bom.id} className="flex justify-between text-slate-600">
                    <span>{bom.ingredientName}</span>
                    <span className="font-semibold text-rose-700">
                      {conv.compatible && stockIng ? `-${Math.round(conv.value * 100) / 100} ${stockIng.unit}` : 'Unit mismatch'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {isCsvModalOpen && (
        <Modal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          title="Import POS CSV"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsCsvModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={csvParsed.length === 0}
                onClick={() => {
                  onUploadCsv(csvParsed);
                  setSaleBanner(`Imported ${csvParsed.length} sales row(s).`);
                  setIsCsvModalOpen(false);
                }}
              >
                Import {csvParsed.length} Row(s)
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50">
              <p className="font-semibold text-slate-800">{csvFileName || 'Choose a .csv file'}</p>
              <p className="text-slate-500 mt-1">Columns: date,menu_item_id,dish_name,station,quantity_sold,revenue</p>
              <input type="file" accept=".csv,text/csv" onChange={handleCsvSelect} className="hidden" />
            </label>
            {csvErrors.length > 0 && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 max-h-28 overflow-y-auto">
                {csvErrors.map((err, i) => <p key={i}>{err}</p>)}
              </div>
            )}
            {csvParsed.length > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                Validated {csvParsed.length} row(s) ready to import.
              </div>
            )}
          </div>
        </Modal>
      )}

      {editingSale && (
        <Modal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          title={`Edit Sale: ${editingSale.dishName}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingSale(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSaveEditSale}>Save</Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Quantity</label>
                <input type="number" min="0" value={editQty} onChange={e => setEditQty(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold" />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Period</label>
              <select value={editPeriod} onChange={e => setEditPeriod(e.target.value as 'All Day' | 'Lunch' | 'Dinner')} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="All Day">All Day</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {confirmResetOpen && (
        <Modal
          isOpen={confirmResetOpen}
          onClose={() => setConfirmResetOpen(false)}
          title="Reset Demo Data"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmResetOpen(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { onResetToBenchmark(); setConfirmResetOpen(false); }}>
                Reset Data
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">
            This restores the benchmark dataset (The Rustic Table) and clears custom edits in IndexedDB.
          </p>
        </Modal>
      )}
    </div>
  );
};
