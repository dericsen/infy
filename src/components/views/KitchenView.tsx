import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  History,
  PackagePlus,
  Power
} from 'lucide-react';
import {
  Station,
  MenuItem,
  RecipeBOMItem,
  Ingredient,
  MeasurementUnit,
  StockMovementRecord,
  StockMovementType
} from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { areUnitsCompatible, convertQuantity } from '../../engine/unitConversion';

interface KitchenViewProps {
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  stockMovements: StockMovementRecord[];
  businessDate: string;
  onSaveMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  onSaveIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (ingredientId: string) => void;
  onAdjustInventory: (params: {
    ingredientId: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
  }) => { success: boolean; error?: string };
  onBatchCommitStockCounts: (counts: Record<string, number>) => { success: boolean; error?: string; changedCount: number };
}

export const KitchenView: React.FC<KitchenViewProps> = ({
  menuItems,
  ingredients,
  stockMovements,
  businessDate,
  onSaveMenuItem,
  onDeleteMenuItem,
  onSaveIngredient,
  onDeleteIngredient,
  onAdjustInventory,
  onBatchCommitStockCounts
}) => {
  const [subTab, setSubTab] = useState<'stock' | 'menu'>('stock');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [localStock, setLocalStock] = useState<Record<string, number>>({});
  const [showMovementHistory, setShowMovementHistory] = useState(false);
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [confirmDeleteIng, setConfirmDeleteIng] = useState<Ingredient | null>(null);
  const [ingFormError, setIngFormError] = useState<string | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState<Ingredient['category']>('Protein');
  const [ingUnit, setIngUnit] = useState<MeasurementUnit>('kg');
  const [ingCost, setIngCost] = useState('8.50');
  const [ingStock, setIngStock] = useState('15.0');
  const [ingSafety, setIngSafety] = useState('6.0');
  const [ingShelfLife, setIngShelfLife] = useState('4');
  const [ingExpDate, setIngExpDate] = useState('');
  const [ingAvailable, setIngAvailable] = useState(true);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementIngId, setMovementIngId] = useState(ingredients[0]?.id || '');
  const [movementType, setMovementType] = useState<'addition' | 'reduction' | 'adjustment'>('addition');
  const [movementQty, setMovementQty] = useState('10.0');
  const [movementReason, setMovementReason] = useState('Supplier delivery intake');
  const [movementError, setMovementError] = useState<string | null>(null);

  const [selectedStation, setSelectedStation] = useState<Station | 'All'>('All');
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [confirmDeleteDish, setConfirmDeleteDish] = useState<MenuItem | null>(null);
  const [dishFormError, setDishFormError] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState('Mains');
  const [dishStation, setDishStation] = useState<Station>('Grill');
  const [dishPrice, setDishPrice] = useState('18.00');
  const [dishIsActive, setDishIsActive] = useState(true);
  const [dishInstructions, setDishInstructions] = useState('');
  const [dishBOM, setDishBOM] = useState<RecipeBOMItem[]>([]);
  const [selectedBomIngId, setSelectedBomIngId] = useState(ingredients[0]?.id || '');
  const [selectedBomQty, setSelectedBomQty] = useState('0.15');
  const [selectedBomUnit, setSelectedBomUnit] = useState<MeasurementUnit>(ingredients[0]?.unit || 'kg');

  useEffect(() => {
    const synced: Record<string, number> = {};
    for (const ing of ingredients) {
      synced[ing.id] = ing.currentStock;
    }
    setLocalStock(synced);
    if (!movementIngId && ingredients[0]) setMovementIngId(ingredients[0].id);
  }, [ingredients, movementIngId]);

  const getDaysUntilExpiration = (expDate?: string): number | null => {
    if (!expDate) return null;
    const exp = new Date(expDate);
    const biz = new Date(businessDate);
    if (Number.isNaN(exp.getTime()) || Number.isNaN(biz.getTime())) return null;
    return Math.ceil((exp.getTime() - biz.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || ing.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleStockInput = (id: string, val: number) => {
    setStockError(null);
    if (!Number.isFinite(val) || val < 0) {
      setStockError('Stock count cannot be negative.');
      return;
    }
    setLocalStock(prev => ({ ...prev, [id]: Math.round(val * 100) / 100 }));
  };

  const handleCommitCounts = () => {
    setStockError(null);
    const res = onBatchCommitStockCounts(localStock);
    if (!res.success) {
      setStockError(res.error || 'Could not commit counts.');
      return;
    }
    setStockNotice(res.changedCount > 0 ? `Updated ${res.changedCount} ingredient count(s).` : 'All counts already match saved inventory.');
    setTimeout(() => setStockNotice(null), 3000);
  };

  const handleOpenAddIng = () => {
    setEditingIng(null);
    setIngName('');
    setIngCategory('Protein');
    setIngUnit('kg');
    setIngCost('8.50');
    setIngStock('15.0');
    setIngSafety('5.0');
    setIngShelfLife('4');
    setIngExpDate('');
    setIngAvailable(true);
    setIngFormError(null);
    setIsIngModalOpen(true);
  };

  const handleOpenEditIng = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngName(ing.name);
    setIngCategory(ing.category);
    setIngUnit(ing.unit);
    setIngCost(ing.unitCost.toString());
    setIngStock(ing.currentStock.toString());
    setIngSafety(ing.safetyStock.toString());
    setIngShelfLife(ing.shelfLifeDays.toString());
    setIngExpDate(ing.expirationDate || '');
    setIngAvailable(ing.isAvailable !== false);
    setIngFormError(null);
    setIsIngModalOpen(true);
  };

  const handleSaveIng = () => {
    setIngFormError(null);
    if (!ingName.trim()) {
      setIngFormError('Ingredient name is required.');
      return;
    }
    const cost = parseFloat(ingCost);
    const stock = parseFloat(ingStock);
    const safety = parseFloat(ingSafety);
    const shelfLife = parseInt(ingShelfLife, 10);

    if (!Number.isFinite(cost) || cost <= 0) {
      setIngFormError('Unit cost must be greater than 0.');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(safety) || safety < 0) {
      setIngFormError('Stock and safety par cannot be negative.');
      return;
    }
    if (!Number.isFinite(shelfLife) || shelfLife < 1) {
      setIngFormError('Shelf life must be at least 1 day.');
      return;
    }

    onSaveIngredient({
      id: editingIng ? editingIng.id : `ing_${Date.now()}`,
      restaurantId: editingIng?.restaurantId || 'rst_rustic_table',
      name: ingName.trim(),
      category: ingCategory,
      unit: ingUnit,
      unitCost: Math.round(cost * 100) / 100,
      currentStock: Math.round(stock * 100) / 100,
      safetyStock: Math.round(safety * 100) / 100,
      shelfLifeDays: shelfLife,
      expirationDate: ingExpDate.trim() || undefined,
      isAvailable: ingAvailable,
      isDemonstrationData: editingIng?.isDemonstrationData ?? false
    });
    setIsIngModalOpen(false);
  };

  const handleRequestDeleteIng = (ing: Ingredient) => {
    setStockError(null);
    const usedIn = menuItems.filter(m => m.ingredients.some(b => b.ingredientId === ing.id));
    if (usedIn.length > 0) {
      setStockError(`Cannot delete "${ing.name}" because it is used in: ${usedIn.map(d => d.name).join(', ')}.`);
      return;
    }
    setConfirmDeleteIng(ing);
  };

  const handleApplyMovement = () => {
    setMovementError(null);
    const qty = parseFloat(movementQty);
    if (!Number.isFinite(qty) || (movementType === 'adjustment' ? qty < 0 : qty <= 0)) {
      setMovementError(movementType === 'adjustment' ? 'Count must be 0 or greater.' : 'Quantity must be greater than 0.');
      return;
    }
    if (!movementReason.trim()) {
      setMovementError('Enter a reason for this adjustment.');
      return;
    }
    const res = onAdjustInventory({
      ingredientId: movementIngId,
      type: movementType,
      quantity: qty,
      reason: movementReason.trim()
    });
    if (!res.success) {
      setMovementError(res.error || 'Failed to adjust stock.');
      return;
    }
    setIsMovementModalOpen(false);
    setStockNotice('Stock movement recorded.');
    setTimeout(() => setStockNotice(null), 3000);
  };

  const filteredDishes = selectedStation === 'All'
    ? menuItems
    : menuItems.filter(m => m.station === selectedStation);

  const handleOpenAddDish = () => {
    setEditingDish(null);
    setDishName('');
    setDishCategory('Mains');
    setDishStation('Grill');
    setDishPrice('16.50');
    setDishIsActive(true);
    setDishInstructions('');
    setDishBOM([]);
    setDishFormError(null);
    if (ingredients[0]) {
      setSelectedBomIngId(ingredients[0].id);
      setSelectedBomUnit(ingredients[0].unit);
    }
    setIsDishModalOpen(true);
  };

  const handleOpenEditDish = (dish: MenuItem) => {
    setEditingDish(dish);
    setDishName(dish.name);
    setDishCategory(dish.category);
    setDishStation(dish.station);
    setDishPrice(dish.sellingPrice.toString());
    setDishIsActive(dish.isActive);
    setDishInstructions(dish.prepInstructions || '');
    setDishBOM([...dish.ingredients]);
    setDishFormError(null);
    if (ingredients[0]) {
      setSelectedBomIngId(ingredients[0].id);
      setSelectedBomUnit(ingredients[0].unit);
    }
    setIsDishModalOpen(true);
  };

  const handleAddBomItem = () => {
    setDishFormError(null);
    const raw = ingredients.find(i => i.id === selectedBomIngId);
    if (!raw) return;
    const qty = parseFloat(selectedBomQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setDishFormError('Recipe quantity must be greater than 0.');
      return;
    }
    if (!areUnitsCompatible(selectedBomUnit, raw.unit)) {
      setDishFormError(`Unit "${selectedBomUnit}" is incompatible with ${raw.name} stock unit "${raw.unit}".`);
      return;
    }
    const existingIdx = dishBOM.findIndex(b => b.ingredientId === raw.id);
    if (existingIdx >= 0) {
      const next = [...dishBOM];
      next[existingIdx] = { ...next[existingIdx], quantity: qty, unit: selectedBomUnit };
      setDishBOM(next);
    } else {
      setDishBOM(prev => [
        ...prev,
        {
          id: `bom_${Date.now()}_${raw.id}`,
          menuItemId: editingDish ? editingDish.id : 'new',
          ingredientId: raw.id,
          ingredientName: raw.name,
          quantity: qty,
          unit: selectedBomUnit
        }
      ]);
    }
  };

  const calculateDishCost = () => {
    return dishBOM.reduce((sum, item) => {
      const raw = ingredients.find(i => i.id === item.ingredientId);
      if (!raw) return sum;
      const conv = convertQuantity(item.quantity, item.unit, raw.unit);
      return sum + (conv.compatible ? conv.value * raw.unitCost : 0);
    }, 0);
  };

  const handleSaveDish = () => {
    setDishFormError(null);
    if (!dishName.trim()) {
      setDishFormError('Dish name is required.');
      return;
    }
    const price = parseFloat(dishPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setDishFormError('Selling price must be greater than 0.');
      return;
    }
    const dishId = editingDish ? editingDish.id : `mnu_${Date.now()}`;
    const computedCost = Math.round(calculateDishCost() * 100) / 100;

    onSaveMenuItem({
      id: dishId,
      restaurantId: editingDish?.restaurantId || 'rst_rustic_table',
      name: dishName.trim(),
      category: dishCategory.trim() || 'Mains',
      station: dishStation,
      sellingPrice: price,
      targetCost: computedCost > 0 ? computedCost : editingDish?.targetCost || 1,
      isActive: dishIsActive,
      prepInstructions: dishInstructions.trim() || undefined,
      isDemonstrationData: editingDish?.isDemonstrationData ?? false,
      ingredients: dishBOM.map(b => ({ ...b, menuItemId: dishId }))
    });
    setIsDishModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kitchen Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {ingredients.length} ingredients · {menuItems.filter(m => m.isActive).length} active dishes
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setSubTab('stock')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              subTab === 'stock' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock & Ingredients
          </button>
          <button
            type="button"
            onClick={() => setSubTab('menu')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              subTab === 'menu' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Menu & Recipes
          </button>
        </div>
      </div>

      {subTab === 'stock' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ingredient..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                {['All', 'Protein', 'Produce', 'Dairy', 'Dry Goods', 'Bakery', 'Pantry'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMovementHistory(prev => !prev)}
                leftIcon={<History className="w-3.5 h-3.5" />}
              >
                {showMovementHistory ? 'Hide History' : 'History'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMovementError(null);
                  setIsMovementModalOpen(true);
                }}
                leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
              >
                Adjust Stock
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenAddIng}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Ingredient
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCommitCounts}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Save Counts
              </Button>
            </div>
          </div>

          {stockError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                {stockError}
              </span>
              <button onClick={() => setStockError(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {stockNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{stockNotice}</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Ingredient</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Safety Par</th>
                    <th className="py-2.5 px-3">Expiration</th>
                    <th className="py-2.5 px-3 text-center">On-Hand Count</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIngredients.map(ing => {
                    const count = localStock[ing.id] !== undefined ? localStock[ing.id] : ing.currentStock;
                    const isLow = count < ing.safetyStock;
                    const daysExp = getDaysUntilExpiration(ing.expirationDate);
                    const isExpired = daysExp !== null && daysExp <= 0;
                    const isExpiring = daysExp !== null && daysExp > 0 && daysExp <= 2;

                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-900">{ing.name}</span>
                          <span className="block text-slate-400">
                            {ing.category} · {ing.unit}
                            {ing.isAvailable === false ? ' · Unavailable' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 font-tabular-nums">
                          ${ing.unitCost.toFixed(2)} / {ing.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-tabular-nums">
                          {ing.safetyStock} {ing.unit}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {ing.expirationDate || `${ing.shelfLifeDays}d`}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={count}
                              onChange={e => handleStockInput(ing.id, parseFloat(e.target.value))}
                              className="w-20 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded text-center font-tabular-nums"
                            />
                            <span className="text-slate-500">{ing.unit}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-medium ${
                            isLow || isExpired
                              ? 'text-rose-700'
                              : isExpiring
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}>
                            {isExpired
                              ? 'Expired'
                              : isLow
                              ? `Low (-${(ing.safetyStock - count).toFixed(1)} ${ing.unit})`
                              : isExpiring
                              ? `Expiring (${daysExp}d)`
                              : 'Healthy'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditIng(ing)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded"
                              title="Edit ingredient"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteIng(ing)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete ingredient"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {showMovementHistory && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">Stock Movement History</span>
                <span className="text-xs text-slate-500">{stockMovements.length} entries</span>
              </div>
              {stockMovements.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No stock movements logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-3">Ingredient</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-right">Delta</th>
                        <th className="py-2 px-4">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockMovements.slice(0, 40).map(mv => (
                        <tr key={mv.id}>
                          <td className="py-2 px-4 font-mono text-slate-600">{mv.date}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{mv.ingredientName}</td>
                          <td className="py-2 px-3 text-slate-600">{mv.type}</td>
                          <td className={`py-2 px-3 text-right font-semibold font-tabular-nums ${mv.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {mv.delta >= 0 ? `+${mv.delta}` : mv.delta} {mv.unit}
                          </td>
                          <td className="py-2 px-4 text-slate-600">{mv.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['All', 'Grill', 'Saute', 'Garde Manger', 'Bakery'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStation(st)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                    selectedStation === st ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <Button size="sm" variant="primary" onClick={handleOpenAddDish} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Create Dish
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-4">Dish & Recipe Ingredients</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Food Cost</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDishes.map(dish => {
                    const marginPct = dish.sellingPrice > 0 ? Math.round((dish.targetCost / dish.sellingPrice) * 100) : 0;
                    return (
                      <tr key={dish.id} className={`hover:bg-slate-50/50 ${!dish.isActive ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{dish.name}</p>
                          <p className="text-slate-500 mt-0.5">
                            {dish.ingredients.length > 0
                              ? dish.ingredients.map(i => `${i.ingredientName} (${i.quantity} ${i.unit})`).join(' · ')
                              : 'Missing recipe BOM'}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{dish.station} · {dish.category}</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900 font-tabular-nums">
                          ${dish.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 font-tabular-nums">
                          ${dish.targetCost.toFixed(2)} ({marginPct}%)
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-medium ${dish.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {dish.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onSaveMenuItem({ ...dish, isActive: !dish.isActive })}
                              className={`p-1.5 rounded ${dish.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                              title={dish.isActive ? 'Disable dish' : 'Enable dish'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditDish(dish)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded"
                              title="Edit dish"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDish(dish)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete dish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isIngModalOpen && (
        <Modal
          isOpen={isIngModalOpen}
          onClose={() => setIsIngModalOpen(false)}
          title={editingIng ? `Edit Ingredient: ${editingIng.name}` : 'Add Raw Ingredient'}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsIngModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSaveIng}>Save</Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            {ingFormError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">{ingFormError}</div>
            )}
            <div>
              <label className="block font-medium text-slate-700 mb-1">Name</label>
              <input type="text" value={ingName} onChange={e => setIngName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select value={ingCategory} onChange={e => setIngCategory(e.target.value as Ingredient['category'])} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                  <option value="Protein">Protein</option>
                  <option value="Produce">Produce</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Dry Goods">Dry Goods</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Pantry">Pantry</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Unit</label>
                <select value={ingUnit} onChange={e => setIngUnit(e.target.value as MeasurementUnit)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Unit Cost ($)</label>
                <input type="number" step="0.1" min="0.01" value={ingCost} onChange={e => setIngCost(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">On-Hand Stock</label>
                <input type="number" step="0.5" min="0" value={ingStock} onChange={e => setIngStock(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Safety Par</label>
                <input type="number" step="0.5" min="0" value={ingSafety} onChange={e => setIngSafety(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Shelf Life (d)</label>
                <input type="number" min="1" value={ingShelfLife} onChange={e => setIngShelfLife(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Expiration</label>
                <input type="date" value={ingExpDate} onChange={e => setIngExpDate(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={ingAvailable} onChange={e => setIngAvailable(e.target.checked)} className="rounded border-slate-300 text-emerald-600" />
              <span className="font-medium text-slate-700">Available for prep</span>
            </label>
          </div>
        </Modal>
      )}

      {isMovementModalOpen && (
        <Modal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title="Adjust Inventory Stock"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsMovementModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleApplyMovement}>Apply</Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            {movementError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">{movementError}</div>
            )}
            <div>
              <label className="block font-medium text-slate-700 mb-1">Type</label>
              <select value={movementType} onChange={e => setMovementType(e.target.value as 'addition' | 'reduction' | 'adjustment')} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                <option value="addition">Add Stock (Delivery)</option>
                <option value="reduction">Reduce Stock (Shrink / Spoilage)</option>
                <option value="adjustment">Set Exact Count</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Ingredient</label>
              <select value={movementIngId} onChange={e => setMovementIngId(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.name} ({ing.currentStock} {ing.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Quantity</label>
              <input type="number" step="0.5" min={movementType === 'adjustment' ? '0' : '0.1'} value={movementQty} onChange={e => setMovementQty(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold" />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Reason</label>
              <input type="text" value={movementReason} onChange={e => setMovementReason(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
            </div>
          </div>
        </Modal>
      )}

      {isDishModalOpen && (
        <Modal
          isOpen={isDishModalOpen}
          onClose={() => setIsDishModalOpen(false)}
          title={editingDish ? `Edit Dish: ${editingDish.name}` : 'Create Menu Dish'}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsDishModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSaveDish}>Save Dish</Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            {dishFormError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">{dishFormError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Dish Name</label>
                <input type="text" value={dishName} onChange={e => setDishName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <input type="text" value={dishCategory} onChange={e => setDishCategory(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Station</label>
                <select value={dishStation} onChange={e => setDishStation(e.target.value as Station)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg">
                  <option value="Grill">Grill</option>
                  <option value="Saute">Saute</option>
                  <option value="Garde Manger">Garde Manger</option>
                  <option value="Bakery">Bakery</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Price ($)</label>
                <input type="number" step="0.5" min="0.5" value={dishPrice} onChange={e => setDishPrice(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold" />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dishIsActive} onChange={e => setDishIsActive(e.target.checked)} className="rounded border-slate-300 text-emerald-600" />
                  <span className="font-medium text-slate-700">Active</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Prep Instructions</label>
              <textarea rows={2} value={dishInstructions} onChange={e => setDishInstructions(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg" />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex justify-between font-medium text-slate-700">
                <span>Recipe Ingredients</span>
                <span>Est. Cost: ${calculateDishCost().toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedBomIngId}
                  onChange={e => {
                    setSelectedBomIngId(e.target.value);
                    const found = ingredients.find(i => i.id === e.target.value);
                    if (found) setSelectedBomUnit(found.unit);
                  }}
                  className="flex-1 min-w-[140px] px-2 py-1.5 bg-white border border-slate-300 rounded"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
                <input type="number" step="0.01" min="0.01" value={selectedBomQty} onChange={e => setSelectedBomQty(e.target.value)} className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded text-center" />
                <select value={selectedBomUnit} onChange={e => setSelectedBomUnit(e.target.value as MeasurementUnit)} className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded">
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleAddBomItem}>Add</Button>
              </div>

              {dishBOM.map(b => (
                <div key={b.ingredientId} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200">
                  <span>{b.ingredientName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.quantity} {b.unit}</span>
                    <button type="button" onClick={() => setDishBOM(prev => prev.filter(x => x.ingredientId !== b.ingredientId))} className="text-slate-400 hover:text-rose-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {confirmDeleteIng && (
        <Modal
          isOpen={!!confirmDeleteIng}
          onClose={() => setConfirmDeleteIng(null)}
          title="Delete Ingredient"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteIng(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { onDeleteIngredient(confirmDeleteIng.id); setConfirmDeleteIng(null); }}>
                Delete
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">Delete <strong>{confirmDeleteIng.name}</strong> from inventory?</p>
        </Modal>
      )}

      {confirmDeleteDish && (
        <Modal
          isOpen={!!confirmDeleteDish}
          onClose={() => setConfirmDeleteDish(null)}
          title="Delete Dish"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteDish(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { onDeleteMenuItem(confirmDeleteDish.id); setConfirmDeleteDish(null); }}>
                Delete
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">Delete <strong>{confirmDeleteDish.name}</strong> from the menu?</p>
        </Modal>
      )}
    </div>
  );
};
