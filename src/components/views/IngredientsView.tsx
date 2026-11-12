import React, { useState } from 'react';
import { Layers, Search, AlertTriangle, ShieldCheck, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Ingredient, MenuItem } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface IngredientsViewProps {
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  onSaveIngredient: (ingredient: Ingredient) => void;
  onDeleteIngredient: (ingredientId: string) => void;
}

export const IngredientsView: React.FC<IngredientsViewProps> = ({
  ingredients,
  menuItems,
  onSaveIngredient,
  onDeleteIngredient
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Protein' | 'Produce' | 'Dairy' | 'Dry Goods' | 'Bakery' | 'Pantry'>('Protein');
  const [formUnit, setFormUnit] = useState<'kg' | 'g' | 'L' | 'ml' | 'pcs'>('kg');
  const [formCost, setFormCost] = useState('8.50');
  const [formStock, setFormStock] = useState('15.0');
  const [formSafety, setFormSafety] = useState('6.0');
  const [formShelfLife, setFormShelfLife] = useState('4');

  const categories = ['All', 'Protein', 'Produce', 'Dairy', 'Dry Goods', 'Bakery', 'Pantry'];

  const filtered = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingIng(null);
    setFormName('');
    setFormCategory('Protein');
    setFormUnit('kg');
    setFormCost('8.50');
    setFormStock('15.0');
    setFormSafety('5.0');
    setFormShelfLife('4');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ing: Ingredient) => {
    setEditingIng(ing);
    setFormName(ing.name);
    setFormCategory(ing.category);
    setFormUnit(ing.unit);
    setFormCost(ing.unitCost.toString());
    setFormStock(ing.currentStock.toString());
    setFormSafety(ing.safetyStock.toString());
    setFormShelfLife(ing.shelfLifeDays.toString());
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const cost = parseFloat(formCost) || 1.0;
    const stock = parseFloat(formStock) || 0;
    const safety = parseFloat(formSafety) || 0;
    const shelfLife = parseInt(formShelfLife) || 3;

    const saved: Ingredient = {
      id: editingIng ? editingIng.id : `ing_${Date.now()}`,
      restaurantId: 'rst_rustic_table',
      name: formName.trim(),
      category: formCategory,
      unit: formUnit,
      unitCost: Math.max(0.01, cost),
      currentStock: Math.max(0, stock),
      safetyStock: Math.max(0, safety),
      shelfLifeDays: Math.max(1, shelfLife)
    };

    onSaveIngredient(saved);
    setIsModalOpen(false);
  };

  const handleDelete = (ingId: string) => {
    const referencingDishes = menuItems.filter(m =>
      m.ingredients && m.ingredients.some(b => b.ingredientId === ingId)
    );

    if (referencingDishes.length > 0) {
      const names = referencingDishes.map(d => d.name).join(', ');
      setDeleteWarning(`Cannot delete this ingredient because it is currently used in active recipes: ${names}. Remove it from those dishes first.`);
      return;
    }

    onDeleteIngredient(ingId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Raw Ingredients Catalog & Specifications
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ingredients.length} raw ingredients with tracked unit costs, safety pars, and linked recipe BOMs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search ingredient..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none w-48"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Ingredient
          </Button>
        </div>
      </div>

      {deleteWarning && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{deleteWarning}</span>
          </div>
          <button onClick={() => setDeleteWarning(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Ingredient Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Stock Unit</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3 text-right">Current On-Hand</th>
                <th className="py-3 px-3 text-right">Safety Par</th>
                <th className="py-3 px-3 text-right">Shelf Life</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(ing => {
                const isShortage = ing.currentStock < ing.safetyStock;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {ing.name}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="slate" size="sm">{ing.category}</Badge>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600">
                      {ing.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700 font-tabular-nums">
                      ${ing.unitCost.toFixed(2)} / {ing.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                      {ing.currentStock} {ing.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-500 font-tabular-nums">
                      {ing.safetyStock} {ing.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {ing.shelfLifeDays} days
                    </td>
                    <td className="py-3 px-4">
                      {isShortage ? (
                        <Badge variant="rose" size="sm" dot>Below Safety Par</Badge>
                      ) : (
                        <Badge variant="emerald" size="sm" dot>Healthy Par</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(ing)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ing.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
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
      </Card>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingIng ? `Edit Ingredient: ${editingIng.name}` : 'Add New Raw Ingredient'}
          subtitle="Configure unit costs, stock units, and minimum safety buffers"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} leftIcon={<Check className="w-3.5 h-3.5" />}>
                Save Ingredient
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ingredient Name</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g., Grass-Fed Ground Beef"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Protein">Protein</option>
                  <option value="Produce">Produce</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Dry Goods">Dry Goods</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Pantry">Pantry</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Stock Unit</label>
                <select
                  value={formUnit}
                  onChange={e => setFormUnit(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="L">Liters (L)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pcs">Pieces / Count (pcs)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Cost ($ / {formUnit})</label>
                <input
                  type="number"
                  step="0.10"
                  min="0.01"
                  value={formCost}
                  onChange={e => setFormCost(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Stock ({formUnit})</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formStock}
                  onChange={e => setFormStock(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Safety Par Level ({formUnit})</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formSafety}
                  onChange={e => setFormSafety(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shelf Life (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={formShelfLife}
                  onChange={e => setFormShelfLife(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
