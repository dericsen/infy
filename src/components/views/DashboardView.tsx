import React from 'react';
import {
  TrendingUp,
  ClipboardList,
  Sparkles,
  AlertTriangle,
  Flame,
  Soup,
  Salad,
  Croissant,
  Sun,
  CloudRain,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { AppRoute, Station, MenuItem, Ingredient } from '../../types';
import { StatCard } from '../common/StatCard';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface DashboardViewProps {
  businessDate: string;
  menuItems: MenuItem[];
  ingredients: IngredientsListProps[];
  onNavigate: (route: AppRoute) => void;
  onFilterStation: (station: Station) => void;
  onQuickWasteLog: () => void;
}

interface IngredientsListProps {
  id: string;
  name: string;
  currentStock: number;
  safetyStock: number;
  unit: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  businessDate,
  menuItems,
  ingredients,
  onNavigate,
  onFilterStation,
  onQuickWasteLog
}) => {
  const stationStats = [
    { station: 'Grill' as Station, icon: <Flame className="w-4 h-4 text-rose-500" />, prepPortions: 98, dishesCount: 3, riskLevel: 'Medium' as const },
    { station: 'Saute' as Station, icon: <Soup className="w-4 h-4 text-amber-500" />, prepPortions: 75, dishesCount: 3, riskLevel: 'Low' as const },
    { station: 'Garde Manger' as Station, icon: <Salad className="w-4 h-4 text-emerald-500" />, prepPortions: 64, dishesCount: 3, riskLevel: 'Medium' as const },
    { station: 'Bakery' as Station, icon: <Croissant className="w-4 h-4 text-yellow-600" />, prepPortions: 71, dishesCount: 3, riskLevel: 'High' as const }
  ];

  const highRiskDishes = [
    { name: 'Wood-Fired Atlantic Salmon', station: 'Grill', reason: 'Perishable 2-day shelf life + Friday evening surge', wasteScore: 'High Risk' },
    { name: 'Country Sourdough Batard', station: 'Bakery', reason: 'Fresh daily bake; strict 24-hr shelf life target', wasteScore: 'High Risk' },
    { name: 'Artisan Caesar Salad', station: 'Garde Manger', reason: 'Rainy forecast lowers cold salad demand by -15%', wasteScore: 'Medium Risk' }
  ];

  const deficitIngredients = ingredients.filter(i => i.currentStock < i.safetyStock);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Predicted Day Demand"
          value="308 Portions"
          subtitle="4-week moving average base"
          change={{ value: '+8.4% vs last week', trend: 'up', isPositiveGood: true }}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          variant="highlight"
        />

        <StatCard
          title="Recommended Total Prep"
          value="332 Batches"
          subtitle="Includes station safety buffers"
          change={{ value: '+24 buffer units', trend: 'neutral' }}
          icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
        />

        <StatCard
          title="Estimated Daily Waste Cost"
          value="$38.40"
          subtitle="Target < $50.00 / day"
          change={{ value: '-22.5% vs baseline', trend: 'down', isPositiveGood: true }}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        />

        <StatCard
          title="Stockout Deficits"
          value={deficitIngredients.length > 0 ? `${deficitIngredients.length} Items Below Par` : 'All Stock Healthy'}
          subtitle={deficitIngredients.length > 0 ? 'Requires morning intake' : 'Zero ingredient shortages'}
          change={{ value: deficitIngredients.length > 0 ? 'Action required' : 'Optimum par', trend: deficitIngredients.length > 0 ? 'down' : 'up', isPositiveGood: deficitIngredients.length === 0 }}
          icon={<AlertTriangle className={`w-5 h-5 ${deficitIngredients.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />}
          variant={deficitIngredients.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Tomorrow&apos;s AI Contextual Forecast
            </span>
            <Badge variant="blue" size="sm">Friday Dinner Service</Badge>
          </div>
          <p className="text-sm text-slate-200 max-w-3xl leading-relaxed">
            Forecasted light precipitation (65% chance) and 13°C temperature shift demand towards warm, heavy entrees. Saute station prep recommended +18% (Cream Penne, Mushroom Risotto). Garde Manger cold salad prep reduced -12% to prevent end-of-shift waste.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('prediction')}
            className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
          >
            Adjust Simulator
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('prep-sheet')}
            leftIcon={<ClipboardList className="w-4 h-4" />}
          >
            Open Station Prep Sheet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Kitchen Station Preparation Pars"
            subtitle="Calculated batch quantities decomposed from 4-week moving average and BOM recipes"
            headerAction={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('prep-sheet')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Full Checklist
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stationStats.map(stat => (
                <div
                  key={stat.station}
                  onClick={() => {
                    onFilterStation(stat.station);
                    onNavigate('prep-sheet');
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all bg-white cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                        {stat.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {stat.station} Station
                        </h4>
                        <p className="text-xs text-slate-500">{stat.dishesCount} Signature Dishes</p>
                      </div>
                    </div>
                    <Badge
                      variant={stat.riskLevel === 'High' ? 'rose' : stat.riskLevel === 'Medium' ? 'amber' : 'emerald'}
                      size="sm"
                    >
                      {stat.riskLevel} Waste Risk
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Total Recommended Prep:</span>
                    <span className="font-bold text-slate-900 text-sm font-tabular-nums">
                      {stat.prepPortions} Portions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Overproduction & Perishability Risk Radar"
            subtitle="Dishes with highest probability of surplus or short shelf-life expiration"
          >
            <div className="divide-y divide-slate-100">
              {highRiskDishes.map((dish, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{dish.name}</p>
                      <Badge variant="slate" size="sm">{dish.station}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{dish.reason}</p>
                  </div>
                  <Badge
                    variant={dish.wasteScore === 'High Risk' ? 'rose' : 'amber'}
                    dot
                    size="sm"
                  >
                    {dish.wasteScore}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="External Demand Factors"
            subtitle={`Target Service: ${businessDate}`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <CloudRain className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-950">Precipitation Forecast</p>
                    <p className="text-blue-700">65% chance of light rain (13°C)</p>
                  </div>
                </div>
                <Badge variant="blue" size="sm">+15% Soups</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-950">Payday Friday Event</p>
                    <p className="text-emerald-700">Higher check size & steak plate demand</p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">+18% Steaks</Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Forecast Reliability Score:</span>
                  <span className="font-semibold text-slate-900 font-tabular-nums">94% (High)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Baseline Data Window:</span>
                  <span className="font-semibold text-slate-900 font-tabular-nums">4 Weeks (28 Days)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Calculation Engine:</span>
                  <span className="font-semibold text-emerald-700">Statistical WMA + Gemini</span>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Shift Actions & Fast Logging"
            subtitle="Direct operational tools"
          >
            <div className="space-y-2.5">
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={onQuickWasteLog}
                leftIcon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
              >
                Log End-of-Shift Waste Discard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => onNavigate('inventory')}
                leftIcon={<ClipboardList className="w-4 h-4 text-slate-600" />}
              >
                Update Morning Physical Stock Count
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => onNavigate('sales')}
                leftIcon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              >
                Inspect 30-Day Sales Ledger
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
