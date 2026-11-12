import React, { useState } from 'react';
import { Layers, Search, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Ingredient } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

interface IngredientsViewProps {
  ingredients: Ingredient[];
}

export const IngredientsView: React.FC<IngredientsViewProps> = ({ ingredients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Protein', 'Produce', 'Dairy', 'Dry Goods', 'Bakery', 'Pantry'];

  const filtered = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Raw Ingredients Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ingredients.length} managed ingredients mapped to recipe BOM formulas
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
        </div>
      </div>

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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
