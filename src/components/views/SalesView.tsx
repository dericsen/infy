import React, { useState } from 'react';
import {
  Upload,
  Calendar,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  ShoppingBag,
  Layers,
  Edit2,
  AlertTriangle,
  CalendarOff,
  Trash2,
  Check
} from 'lucide-react';
import { SaleRecord, Station, MenuItem, Ingredient, ClosedDayRecord } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { convertQuantity } from '../../engine/unitConversion';

interface SalesViewProps {
  salesRecords: SaleRecord[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  closedDays: ClosedDayRecord[];
  businessDate: string;
  onUploadCsv: (records: SaleRecord[]) => void;
  onRecordSaleTransaction: (sale: SaleRecord) => { success: boolean; error?: string; deductedDetails: string[] };
  onUpdateSaleRecord: (sale: SaleRecord) => void;
  onAddClosedDay: (date: string, reason: string) => void;
  onRemoveClosedDay: (id: string) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  salesRecords,
  menuItems,
  ingredients,
  closedDays,
  businessDate,
  onUploadCsv,
  onRecordSaleTransaction,
  onUpdateSaleRecord,
  onAddClosedDay,
  onRemoveClosedDay
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | 'All'>('All');
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvParsedRecords, setCsvParsedRecords] = useState<SaleRecord[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvImportBanner, setCsvImportBanner] = useState<string | null>(null);

  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState(false);
  const [saleDishId, setSaleDishId] = useState(menuItems[0]?.id || '');
  const [saleDate, setSaleDate] = useState(businessDate);
  const [saleQuantity, setSaleQuantity] = useState('12');
  const [saleMealPeriod, setSaleMealPeriod] = useState<'All Day' | 'Lunch' | 'Dinner'>('Dinner');
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleSuccessNotice, setSaleSuccessNotice] = useState<{ dishName: string; sold: number; ingredientsDeducted: string[] } | null>(null);

  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMealPeriod, setEditMealPeriod] = useState<'All Day' | 'Lunch' | 'Dinner'>('Dinner');
  const [editError, setEditError] = useState<string | null>(null);

  const [closedDateInput, setClosedDateInput] = useState(businessDate);
  const [closedReasonInput, setClosedReasonInput] = useState('Public Holiday / Kitchen Closed');

  const uniqueDates = Array.from(new Set(salesRecords.map(r => r.date))).sort().reverse();

  const filteredRecords = salesRecords.filter(r => {
    const matchesStation = selectedStation === 'All' || r.station === selectedStation;
    const matchesDate = selectedDate === 'All' || r.date === selectedDate;
    return matchesStation && matchesDate;
  });

  const totalRevenue = filteredRecords.reduce((sum, r) => sum + r.revenue, 0);
  const totalPortions = filteredRecords.reduce((sum, r) => sum + r.quantitySold, 0);

  const parseCsvText = (rawText: string) => {
    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      setCsvErrors(['CSV file must include a header row and at least one data row.']);
      setCsvParsedRecords([]);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIdx = headers.indexOf('date');
    const menuIdIdx = headers.indexOf('menu_item_id');
    const dishNameIdx = headers.indexOf('dish_name');
    const stationIdx = headers.indexOf('station');
    const qtyIdx = headers.indexOf('quantity_sold');
    const revIdx = headers.indexOf('revenue');

    if (dateIdx === -1 || qtyIdx === -1 || (menuIdIdx === -1 && dishNameIdx === -1)) {
      setCsvErrors(['Missing required columns. Required: date, quantity_sold, and either menu_item_id or dish_name.']);
      setCsvParsedRecords([]);
      return;
    }

    const validRecords: SaleRecord[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const dateStr = cols[dateIdx] || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push(`Row ${i + 1}: Invalid date "${dateStr}" (expected YYYY-MM-DD).`);
        continue;
      }

      const qty = parseInt(cols[qtyIdx] || '', 10);
      if (!Number.isFinite(qty) || qty < 0) {
        errors.push(`Row ${i + 1}: Invalid quantity_sold "${cols[qtyIdx]}".`);
        continue;
      }

      const rawMenuId = menuIdIdx >= 0 ? cols[menuIdIdx] : '';
      const rawDishName = dishNameIdx >= 0 ? cols[dishNameIdx] : '';
      const matchedDish = menuItems.find(
        m => m.id === rawMenuId || m.name.toLowerCase() === rawDishName.toLowerCase()
      );

      if (!matchedDish && !rawDishName) {
        errors.push(`Row ${i + 1}: Could not match dish "${rawMenuId || rawDishName}".`);
        continue;
      }

      const parsedRev = revIdx >= 0 ? parseFloat(cols[revIdx] || '') : NaN;
      const stationVal = (stationIdx >= 0 && cols[stationIdx] ? cols[stationIdx] : matchedDish?.station || 'Grill') as Station;
      const dishPrice = matchedDish ? matchedDish.sellingPrice : 18;
      const revenue = Number.isFinite(parsedRev) && parsedRev >= 0 ? Math.round(parsedRev * 100) / 100 : Math.round(dishPrice * qty * 100) / 100;

      validRecords.push({
        id: `csv_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        restaurantId: 'rst_rustic_table',
        date: dateStr,
        dayOfWeek: new Date(dateStr).getDay(),
        menuItemId: matchedDish ? matchedDish.id : rawMenuId || `custom_${i}`,
        dishName: matchedDish ? matchedDish.name : rawDishName,
        station: stationVal,
        quantitySold: qty,
        revenue,
        mealPeriod: 'All Day',
        weatherCondition: 'Clear',
        temperatureC: 20,
        eventTag: 'POS CSV Import',
        isDemonstrationData: false
      });
    }

    setCsvParsedRecords(validRecords);
    setCsvErrors(errors);
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleCommitCsvUpload = () => {
    if (csvParsedRecords.length === 0) return;
    onUploadCsv(csvParsedRecords);
    setCsvImportBanner(`Imported ${csvParsedRecords.length} verified POS sales record(s) from ${csvFileName || 'CSV'}.`);
    setCsvParsedRecords([]);
    setCsvErrors([]);
    setCsvFileName('');
    setIsCsvModalOpen(false);
    setTimeout(() => setCsvImportBanner(null), 5000);
  };

  const handleCommitSale = () => {
    setSaleError(null);
    const dish = menuItems.find(m => m.id === saleDishId);
    if (!dish) {
      setSaleError('Select a valid menu dish.');
      return;
    }

    const qty = parseInt(saleQuantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setSaleError('Quantity sold must be at least 1 portion.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
      setSaleError('Provide a valid YYYY-MM-DD service date.');
      return;
    }

    const isClosed = closedDays.some(c => c.date === saleDate);
    if (isClosed) {
      setSaleError(`${saleDate} is marked as a Closed Restaurant Day. Remove the closed-day lock first if service occurred.`);
      return;
    }

    const rev = Math.round(dish.sellingPrice * qty * 100) / 100;
    const newSale: SaleRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      restaurantId: dish.restaurantId || 'rst_rustic_table',
      date: saleDate,
      dayOfWeek: new Date(saleDate).getDay(),
      menuItemId: dish.id,
      dishName: dish.name,
      station: dish.station,
      quantitySold: qty,
      revenue: rev,
      mealPeriod: saleMealPeriod,
      weatherCondition: 'Clear',
      temperatureC: 20,
      eventTag: 'Shift Order',
      isDemonstrationData: false
    };

    const result = onRecordSaleTransaction(newSale);
    if (!result.success) {
      setSaleError(result.error || 'Could not record sale.');
      return;
    }

    setSaleSuccessNotice({
      dishName: dish.name,
      sold: qty,
      ingredientsDeducted: result.deductedDetails
    });

    setIsRecordSaleModalOpen(false);
    setTimeout(() => setSaleSuccessNotice(null), 6000);
  };

  const handleOpenEditSale = (rec: SaleRecord) => {
    setEditingSale(rec);
    setEditQty(rec.quantitySold.toString());
    setEditDate(rec.date);
    setEditMealPeriod(rec.mealPeriod);
    setEditError(null);
  };

  const handleSaveEditedSale = () => {
    if (!editingSale) return;
    setEditError(null);
    const qty = parseInt(editQty, 10);
    if (!Number.isFinite(qty) || qty < 0) {
      setEditError('Quantity sold must be 0 or greater.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
      setEditError('Date must be YYYY-MM-DD.');
      return;
    }

    const dish = menuItems.find(m => m.id === editingSale.menuItemId);
    const unitPrice = dish ? dish.sellingPrice : editingSale.quantitySold > 0 ? editingSale.revenue / editingSale.quantitySold : 18;
    const updated: SaleRecord = {
      ...editingSale,
      date: editDate,
      dayOfWeek: new Date(editDate).getDay(),
      quantitySold: qty,
      revenue: Math.round(unitPrice * qty * 100) / 100,
      mealPeriod: editMealPeriod,
      isDemonstrationData: false
    };

    onUpdateSaleRecord(updated);
    setEditingSale(null);
  };

  const handleAddClosed = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(closedDateInput)) return;
    onAddClosedDay(closedDateInput, closedReasonInput.trim() || 'Closed');
  };

  const selectedDishForSale = menuItems.find(m => m.id === saleDishId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Sales Transactions & Closed Days Ledger
            </h2>
            <Badge variant="emerald" size="sm">IndexedDB Persistent</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record shift orders with unit-converted BOM inventory deduction, import POS CSV files, or configure closed days
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCsvParsedRecords([]);
              setCsvErrors([]);
              setCsvFileName('');
              setIsCsvModalOpen(true);
            }}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            Import POS CSV
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setSaleDate(businessDate);
              setSaleError(null);
              if (menuItems[0] && !saleDishId) setSaleDishId(menuItems[0].id);
              setIsRecordSaleModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Record Sales Order
          </Button>
        </div>
      </div>

      {csvImportBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{csvImportBanner}</span>
        </div>
      )}

      {saleSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
          <div className="flex items-center gap-2 font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Recorded Sale: {saleSuccessNotice.sold}x {saleSuccessNotice.dishName}</span>
          </div>
          <p className="text-slate-600">
            Automated recipe inventory consumption deducted from current on-hand stock:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {saleSuccessNotice.ingredientsDeducted.length > 0 ? (
              saleSuccessNotice.ingredientsDeducted.map((item, idx) => (
                <span key={idx} className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-medium text-emerald-800">
                  {item}
                </span>
              ))
            ) : (
              <span className="text-amber-800">Dish has no BOM ingredients configured; zero stock deducted.</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Ledger Revenue
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">From {filteredRecords.length} service records</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Portions Sold
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {totalPortions.toLocaleString()} Dishes
          </p>
          <p className="text-xs text-slate-400 mt-1">Across active kitchen stations</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Closed Service Dates
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {closedDays.length} Day(s)
          </p>
          <p className="text-xs text-slate-400 mt-1">Excluded from WMA & set to 0 prep</p>
        </div>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-slate-500" />
            <span>Closed Restaurant Days & Holidays</span>
          </div>
        }
        subtitle="Dates marked closed are excluded from statistical averages and generate zero preparation recommendations"
      >
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <input
            type="date"
            value={closedDateInput}
            onChange={e => setClosedDateInput(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
          />
          <input
            type="text"
            value={closedReasonInput}
            onChange={e => setClosedReasonInput(e.target.value)}
            placeholder="Reason (e.g., Holiday, Maintenance)"
            className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
          />
          <Button size="sm" variant="outline" onClick={handleAddClosed}>
            Mark Date Closed
          </Button>
        </div>

        {closedDays.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {closedDays.map(c => (
              <div
                key={c.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900"
              >
                <span className="font-mono font-bold">{c.date}</span>
                <span>• {c.reason}</span>
                <button
                  onClick={() => onRemoveClosedDay(c.id)}
                  className="text-amber-700 hover:text-rose-700"
                  title="Remove closed day"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-600">Filter Date:</span>
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="All">All Historical Dates</option>
            {uniqueDates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-600">Station:</span>
          <select
            value={selectedStation}
            onChange={e => setSelectedStation(e.target.value as Station | 'All')}
            className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="All">All Stations</option>
            <option value="Grill">Grill</option>
            <option value="Saute">Saute</option>
            <option value="Garde Manger">Garde Manger</option>
            <option value="Bakery">Bakery</option>
          </select>
        </div>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold z-10">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Dish Name</th>
                <th className="py-2.5 px-3">Station</th>
                <th className="py-2.5 px-3 text-right">Sold Qty</th>
                <th className="py-2.5 px-3 text-right">Revenue</th>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Weather / Event</th>
                <th className="py-2.5 px-3">Origin</th>
                <th className="py-2.5 px-4 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.slice(0, 100).map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-4 font-mono text-slate-600">{rec.date}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{rec.dishName}</td>
                  <td className="py-2 px-3">
                    <Badge variant="slate" size="sm">{rec.station}</Badge>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                    {rec.quantitySold}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-700 font-tabular-nums">
                    ${rec.revenue.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{rec.mealPeriod}</td>
                  <td className="py-2 px-3 text-slate-600">
                    {rec.weatherCondition} • {rec.eventTag}
                  </td>
                  <td className="py-2 px-3">
                    {rec.isDemonstrationData ? (
                      <Badge variant="amber" size="sm">Demo Data</Badge>
                    ) : (
                      <Badge variant="emerald" size="sm">Live Record</Badge>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button
                      onClick={() => handleOpenEditSale(rec)}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                      title="Edit sales record"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isRecordSaleModalOpen && (
        <Modal
          isOpen={isRecordSaleModalOpen}
          onClose={() => setIsRecordSaleModalOpen(false)}
          title="Record Sales Order Transaction"
          subtitle="Appends a new sale transaction and deducts converted recipe BOM ingredient stock"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsRecordSaleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCommitSale} leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}>
                Commit Order & Deduct Inventory
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {saleError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saleError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Date</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meal Period</label>
                <select
                  value={saleMealPeriod}
                  onChange={e => setSaleMealPeriod(e.target.value as 'All Day' | 'Lunch' | 'Dinner')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="Lunch">Lunch Service</option>
                  <option value="Dinner">Dinner Service</option>
                  <option value="All Day">All Day</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Menu Dish</label>
              <select
                value={saleDishId}
                onChange={e => setSaleDishId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                {menuItems.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.sellingPrice.toFixed(2)}) — {m.station} ({m.ingredients.length} BOM items)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity Sold (Portions)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={saleQuantity}
                onChange={e => setSaleQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <p className="font-semibold text-slate-700 mb-1">Automatic Inventory Deduction Preview:</p>
              {selectedDishForSale?.ingredients.map(bom => {
                const qty = Math.max(1, parseInt(saleQuantity, 10) || 1);
                const stockIng = ingredients.find(i => i.id === bom.ingredientId);
                const conv = stockIng
                  ? convertQuantity(bom.quantity * qty, bom.unit, stockIng.unit)
                  : { compatible: false, value: 0 };
                return (
                  <div key={bom.id} className="text-slate-600 flex justify-between py-0.5">
                    <span>{bom.ingredientName}:</span>
                    <span className="font-semibold text-rose-700 font-tabular-nums">
                      {conv.compatible && stockIng
                        ? `-${Math.round(conv.value * 100) / 100} ${stockIng.unit}`
                        : `Unit warning (${bom.unit})`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {editingSale && (
        <Modal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          title={`Edit Sale: ${editingSale.dishName}`}
          subtitle="Update historical sales record without modifying unrelated records"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingSale(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEditedSale} leftIcon={<Check className="w-3.5 h-3.5" />}>
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {editError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">{editError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity Sold</label>
                <input
                  type="number"
                  min="0"
                  value={editQty}
                  onChange={e => setEditQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Meal Period</label>
              <select
                value={editMealPeriod}
                onChange={e => setEditMealPeriod(e.target.value as 'All Day' | 'Lunch' | 'Dinner')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="All Day">All Day</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {isCsvModalOpen && (
        <Modal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          title="Import POS Sales CSV"
          subtitle="Upload and validate CSV sales export rows before committing to IndexedDB"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsCsvModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={csvParsedRecords.length === 0}
                onClick={handleCommitCsvUpload}
              >
                Ingest {csvParsedRecords.length} Valid Row(s)
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <FileSpreadsheet className="w-9 h-9 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">
                {csvFileName ? `Selected: ${csvFileName}` : 'Choose a .csv POS export file'}
              </p>
              <p className="text-slate-500 mt-1">
                Required headers: <span className="font-mono">date,menu_item_id,dish_name,station,quantity_sold,revenue</span>
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileSelect}
                className="hidden"
              />
            </label>

            {csvErrors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1 max-h-32 overflow-y-auto">
                <p className="font-bold">Validation warnings ({csvErrors.length}):</p>
                {csvErrors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}

            {csvParsedRecords.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                Ready to import <strong>{csvParsedRecords.length}</strong> validated sales transaction(s).
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
