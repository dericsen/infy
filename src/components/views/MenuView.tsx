import React, { useState } from 'react';
import {
  Plus,
  Layers,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Power
} from 'lucide-react';
import { Station, MenuItem, RecipeBOMItem, Ingredient, MeasurementUnit } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { areUnitsCompatible, convertQuantity } from '../../engine/unitConversion';

interface MenuViewProps {
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  onSaveMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
}

export const MenuView: React.FC<MenuViewProps> = ({
  menuItems,
  ingredients,
  onSaveMenuItem,
  onDeleteMenuItem
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | 'All'>('All');
  const [activeDishForBOM, setActiveDishForBOM] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [confirmDeleteDish, setConfirmDeleteDish] = useState<MenuItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Mains');
  const [formStation, setFormStation] = useState<Station>('Grill');
  const [formPrice, setFormPrice] = useState('18.00');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPrepInstructions, setFormPrepInstructions] = useState('');
  const [formBOM, setFormBOM] = useState<RecipeBOMItem[]>([]);
  const [selectedIngToAdd, setSelectedIngToAdd] = useState(ingredients[0]?.id || '');
  const [selectedQtyToAdd, setSelectedQtyToAdd] = useState('0.15');
  const [selectedUnitToAdd, setSelectedUnitToAdd] = useState<MeasurementUnit>(ingredients[0]?.unit || 'kg');
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleOpenAddModal = () => {
    setEditingDish(null);
    setFormName('');
    setFormCategory('Mains');
    setFormStation('Grill');
    setFormPrice('16.50');
    setFormIsActive(true);
    setFormPrepInstructions('');
    setFormBOM([]);
    setFormError(null);
    if (ingredients[0]) {
      setSelectedIngToAdd(ingredients[0].id);
      setSelectedUnitToAdd(ingredients[0].unit);
    }
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (dish: MenuItem) => {
    setEditingDish(dish);
    setFormName(dish.name);
    setFormCategory(dish.category);
    setFormStation(dish.station);
    setFormPrice(dish.sellingPrice.toString());
    setFormIsActive(dish.isActive);
    setFormPrepInstructions(dish.prepInstructions || '');
    setFormBOM([...dish.ingredients]);
    setFormError(null);
    if (ingredients[0]) {
      setSelectedIngToAdd(ingredients[0].id);
      setSelectedUnitToAdd(ingredients[0].unit);
    }
    setIsEditModalOpen(true);
  };

  const handleSelectIngredientChange = (ingId: string) => {
    setSelectedIngToAdd(ingId);
    const found = ingredients.find(i => i.id === ingId);
    if (found) {
      setSelectedUnitToAdd(found.unit);
    }
    setFormError(null);
  };

  const handleAddIngredientToBOM = () => {
    setFormError(null);
    const raw = ingredients.find(i => i.id === selectedIngToAdd);
    if (!raw) {
      setFormError('Select a valid raw ingredient from catalog.');
      return;
    }

    const qty = parseFloat(selectedQtyToAdd);
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError('Recipe portion quantity must be greater than zero.');
      return;
    }

    if (!areUnitsCompatible(selectedUnitToAdd, raw.unit)) {
      setFormError(`Unit "${selectedUnitToAdd}" is incompatible with stock unit "${raw.unit}" for ${raw.name}.`);
      return;
    }

    const existingIdx = formBOM.findIndex(b => b.ingredientId === raw.id);
    if (existingIdx >= 0) {
      const updated = [...formBOM];
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: qty,
        unit: selectedUnitToAdd
      };
      setFormBOM(updated);
    } else {
      const newItem: RecipeBOMItem = {
        id: `bom_${Date.now()}_${raw.id}`,
        menuItemId: editingDish ? editingDish.id : 'new',
        ingredientId: raw.id,
        ingredientName: raw.name,
        quantity: qty,
        unit: selectedUnitToAdd
      };
      setFormBOM(prev => [...prev, newItem]);
    }
  };

  const handleRemoveIngredientFromBOM = (ingId: string) => {
    setFormBOM(prev => prev.filter(b => b.ingredientId !== ingId));
  };

  const calculateTargetCost = (): number => {
    return formBOM.reduce((sum, item) => {
      const raw = ingredients.find(i => i.id === item.ingredientId);
      if (!raw) return sum;
      const converted = convertQuantity(item.quantity, item.unit, raw.unit);
      const qtyInStockUnit = converted.compatible ? converted.value : item.quantity;
      return sum + qtyInStockUnit * raw.unitCost;
    }, 0);
  };

  const handleSaveDish = () => {
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Dish name is required.');
      return;
    }

    const price = parseFloat(formPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Selling price must be greater than $0.00.');
      return;
    }

    const computedCost = Math.round(calculateTargetCost() * 100) / 100;
    const dishId = editingDish ? editingDish.id : `mnu_${Date.now()}`;
    const normalizedBOM = formBOM.map(b => ({ ...b, menuItemId: dishId }));

    const savedDish: MenuItem = {
      id: dishId,
      restaurantId: editingDish?.restaurantId || 'rst_rustic_table',
      name: formName.trim(),
      category: formCategory.trim() || 'Mains',
      station: formStation,
      sellingPrice: price,
      targetCost: computedCost > 0 ? computedCost : editingDish?.targetCost || 1.0,
      isActive: formIsActive,
      prepInstructions: formPrepInstructions.trim() || undefined,
      isDemonstrationData: editingDish?.isDemonstrationData ?? false,
      ingredients: normalizedBOM
    };

    onSaveMenuItem(savedDish);
    setIsEditModalOpen(false);
  };

  const handleToggleActive = (dish: MenuItem) => {
    onSaveMenuItem({
      ...dish,
      isActive: !dish.isActive
    });
  };

  const activeCount = menuItems.filter(m => m.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Menu Catalog & Recipe Bill of Materials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeCount} of {menuItems.length} dishes active for forecasting & station prep generation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenAddModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Dish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDishes.map(dish => {
          const costMarginPct = dish.sellingPrice > 0 ? Math.round((dish.targetCost / dish.sellingPrice) * 100) : 0;
          const missingRecipe = dish.ingredients.length === 0;

          return (
            <div
              key={dish.id}
              className={`border rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                dish.isActive
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-slate-50 border-slate-200 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900">{dish.name}</h3>
                      {!dish.isActive && <Badge variant="slate" size="sm">Disabled</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{dish.category}</p>
                  </div>
                  {getStationBadge(dish.station)}
                </div>

                {missingRecipe && (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Missing recipe BOM — ingredient requirements cannot be calculated.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
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

                {dish.prepInstructions && (
                  <p className="text-[11px] text-slate-600 mb-3 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                    <span className="font-semibold text-slate-700">Prep Note:</span> {dish.prepInstructions}
                  </p>
                )}

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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveDishForBOM(dish)}
                  leftIcon={<Layers className="w-3.5 h-3.5" />}
                >
                  Inspect BOM
                </Button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(dish)}
                    title={dish.isActive ? 'Disable Dish' : 'Enable Dish'}
                    className={`p-1.5 rounded-md transition-colors ${
                      dish.isActive
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(dish)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteDish(dish)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
            {activeDishForBOM.prepInstructions && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                <span className="font-semibold text-slate-900">Station Prep Instructions: </span>
                {activeDishForBOM.prepInstructions}
              </div>
            )}

            <p className="text-slate-600">
              Raw ingredient portions multiplied against recommended daily prep quantities:
            </p>

            {activeDishForBOM.ingredients.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                No ingredients attached to this dish. Edit the dish to link raw ingredients.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2">Raw Ingredient</th>
                    <th className="py-2">Portion per Dish</th>
                    <th className="py-2">Stock Unit Cost</th>
                    <th className="py-2 text-right">Portion Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDishForBOM.ingredients.map(ing => {
                    const raw = ingredients.find(i => i.id === ing.ingredientId);
                    const unitCost = raw ? raw.unitCost : 0;
                    const conv = raw ? convertQuantity(ing.quantity, ing.unit, raw.unit) : { compatible: false, value: 0 };
                    const ingCost = conv.compatible ? conv.value * unitCost : 0;

                    return (
                      <tr key={ing.id} className="text-slate-800">
                        <td className="py-2 font-medium">{ing.ingredientName}</td>
                        <td className="py-2">{ing.quantity} {ing.unit}</td>
                        <td className="py-2 font-tabular-nums text-slate-500">
                          {raw ? `$${unitCost.toFixed(2)} / ${raw.unit}` : 'Missing ingredient'}
                        </td>
                        <td className="py-2 font-bold font-tabular-nums text-right text-slate-900">${ingCost.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}

      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={editingDish ? `Edit Dish: ${editingDish.name}` : 'Create New Menu Item'}
          subtitle="Configure recipe Bill of Materials, prep instructions, and pricing"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveDish} leftIcon={<Check className="w-3.5 h-3.5" />}>
                Save Menu Item
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Braised Short Rib"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  placeholder="e.g., Mains, Pasta, Bowls"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kitchen Station</label>
                <select
                  value={formStation}
                  onChange={e => setFormStation(e.target.value as Station)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Grill">Grill Station</option>
                  <option value="Saute">Saute Station</option>
                  <option value="Garde Manger">Garde Manger</option>
                  <option value="Bakery">Bakery Station</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Selling Price ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-700">Active on Menu</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kitchen Prep Instructions</label>
              <textarea
                rows={2}
                value={formPrepInstructions}
                onChange={e => setFormPrepInstructions(e.target.value)}
                placeholder="e.g., Portion 180g fillets, cure with sea salt, hold chilled below 4C."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Recipe BOM Decomposition:</span>
                <span className="text-slate-600 font-medium">
                  Calculated Food Cost: <strong className="text-slate-900">${calculateTargetCost().toFixed(2)}</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedIngToAdd}
                  onChange={e => handleSelectIngredientChange(e.target.value)}
                  className="flex-1 min-w-[160px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (${ing.unitCost.toFixed(2)} / {ing.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={selectedQtyToAdd}
                  onChange={e => setSelectedQtyToAdd(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 font-bold text-center"
                />
                <select
                  value={selectedUnitToAdd}
                  onChange={e => setSelectedUnitToAdd(e.target.value as MeasurementUnit)}
                  className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 font-medium"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="pcs">pcs</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleAddIngredientToBOM}>
                  Add to Recipe
                </Button>
              </div>

              {formBOM.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {formBOM.map(item => (
                    <div key={item.ingredientId} className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-slate-200">
                      <span className="font-medium text-slate-800">{item.ingredientName}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700">{item.quantity} {item.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientFromBOM(item.ingredientId)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded text-[11px]">
                  Warning: No raw ingredients linked yet. Prep sheet will flag missing recipe requirements until ingredients are added.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {confirmDeleteDish && (
        <Modal
          isOpen={!!confirmDeleteDish}
          onClose={() => setConfirmDeleteDish(null)}
          title="Confirm Dish Deletion"
          subtitle="Removing this menu item will exclude it from future forecasts and prep sheets"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteDish(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDeleteMenuItem(confirmDeleteDish.id);
                  setConfirmDeleteDish(null);
                }}
              >
                Delete Permanently
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">
            Are you sure you want to delete <strong className="text-slate-900">{confirmDeleteDish.name}</strong> ({confirmDeleteDish.station} Station)? Historical sales records will remain intact for auditability.
          </p>
        </Modal>
      )}
    </div>
  );
};
