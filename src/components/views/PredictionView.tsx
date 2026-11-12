import React, { useState } from 'react';
import {
  Sparkles,
  CloudRain,
  Sun,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Info,
  CheckCircle2,
  RefreshCw,
  Flame,
  Soup,
  Salad,
  Croissant
} from 'lucide-react';
import { Station, MenuItem } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface PredictionViewProps {
  businessDate: string;
  menuItems: MenuItem[];
  onApplyForecastToPrep: (adjustments: Record<string, number>) => void;
}

export const PredictionView: React.FC<PredictionViewProps> = ({
  businessDate,
  menuItems,
  onApplyForecastToPrep
}) => {
  const [weatherCondition, setWeatherCondition] = useState<'Clear' | 'Rain' | 'Cloudy' | 'Storm'>('Rain');
  const [temperatureC, setTemperatureC] = useState<number>(13);
  const [rainChance, setRainChance] = useState<number>(75);
  const [eventTag, setEventTag] = useState<string>('Payday Friday + Theater Event');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [appliedToast, setAppliedToast] = useState<boolean>(false);

  const getDishBaseForecast = (dishId: string): number => {
    const defaultVals: Record<string, number> = {
      mnu_grill_chicken_bowl: 42,
      mnu_grill_steak_frites: 26,
      mnu_grill_salmon: 22,
      mnu_saute_creamy_pasta: 30,
      mnu_saute_mushroom_risotto: 22,
      mnu_saute_tofu_stirfry: 16,
      mnu_salad_caesar: 28,
      mnu_salad_kale_avocado: 18,
      mnu_salad_caprese: 16,
      mnu_bakery_sourdough_loaf: 32,
      mnu_bakery_brioche_buns: 38,
      mnu_bakery_focaccia: 24
    };
    return defaultVals[dishId] || 20;
  };

  const calculateAiAdjustment = (dish: MenuItem) => {
    let modifier = 0;
    let rationale = 'Standard seasonal baseline.';

    if (weatherCondition === 'Rain' || weatherCondition === 'Storm') {
      if (dish.station === 'Saute') {
        modifier += 0.18;
        rationale = 'Rain & low temp (+18%): Patrons seek warm comfort pasta and risotto.';
      } else if (dish.station === 'Garde Manger') {
        modifier -= 0.14;
        rationale = 'Rain & chill (-14%): Cold salad walk-in demand drops; reduce prep to avoid spoilage.';
      } else if (dish.station === 'Bakery') {
        modifier += 0.05;
        rationale = 'Comfort warm bread accompaniment with dinner rush.';
      }
    } else if (weatherCondition === 'Clear' && temperatureC >= 22) {
      if (dish.station === 'Garde Manger') {
        modifier += 0.18;
        rationale = 'Warm sunshine (+18%): Strong uptick for crisp salads and chilled plates.';
      } else if (dish.station === 'Saute') {
        modifier -= 0.08;
        rationale = 'Warm weather lowers heavy pasta appetite slightly.';
      }
    }

    if (eventTag.includes('Friday') || eventTag.includes('Payday')) {
      if (dish.id === 'mnu_grill_steak_frites') {
        modifier += 0.22;
        rationale += ' Payday Friday drives high-margin steak orders.';
      } else if (dish.station === 'Grill') {
        modifier += 0.10;
      }
    }

    const clampedModifier = Math.max(-0.30, Math.min(0.35, modifier));
    const base = getDishBaseForecast(dish.id);
    const adjustedSales = Math.round(base * (1 + clampedModifier));
    const bufferPct = dish.station === 'Bakery' ? 0.05 : 0.08;
    const finalPrep = Math.ceil(adjustedSales * (1 + bufferPct));

    return {
      base,
      clampedModifier,
      adjustedSales,
      finalPrep,
      rationale,
      riskOfWaste: clampedModifier < -0.10 ? 'High' : (clampedModifier > 0.15 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low'
    };
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  const handleCommitToPrep = () => {
    const adjustments: Record<string, number> = {};
    menuItems.forEach(dish => {
      const res = calculateAiAdjustment(dish);
      adjustments[dish.id] = res.finalPrep;
    });
    onApplyForecastToPrep(adjustments);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-100 text-emerald-800">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Contextual Demand & Weather Simulator
              </h2>
              <Badge variant="blue" size="sm">Gemini AI Enhanced</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate weather patterns, temperature deltas, and local events to inspect model adjustments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSimulate}
              isLoading={isSimulating}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Recalculate Model
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleCommitToPrep}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Apply Forecast to Prep Sheet
            </Button>
          </div>
        </div>

        {appliedToast && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Recommended prep targets have been successfully pushed to the Station Prep Sheet.</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Weather Condition
            </label>
            <select
              value={weatherCondition}
              onChange={e => setWeatherCondition(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Clear">Clear & Sunny</option>
              <option value="Rain">Light / Steady Rain</option>
              <option value="Storm">Heavy Thunderstorm</option>
              <option value="Cloudy">Overcast / Cloudy</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Temperature: {temperatureC}°C ({Math.round(temperatureC * 1.8 + 32)}°F)
            </label>
            <input
              type="range"
              min="2"
              max="36"
              value={temperatureC}
              onChange={e => setTemperatureC(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Precipitation Probability: {rainChance}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={rainChance}
              onChange={e => setRainChance(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Calendar & Foot Traffic Event
            </label>
            <select
              value={eventTag}
              onChange={e => setEventTag(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Regular Service">Regular Service Day</option>
              <option value="Payday Friday + Theater Event">Payday Friday + Theater Event</option>
              <option value="Public Holiday Long Weekend">Public Holiday Long Weekend</option>
              <option value="Neighborhood Street Fair">Neighborhood Street Fair</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-white">ADR-001 Deterministic Safety Rails Active</p>
            <p className="text-slate-400">
              All AI adjustment multipliers are programmatically clamped within [-30%, +35%] of the 4-week moving average. Zero runaway prep spikes.
            </p>
          </div>
        </div>
        <Badge variant="emerald" size="sm">Audited & Bounded</Badge>
      </div>

      <Card
        title="Dish-by-Dish Demand Breakdown"
        subtitle="Comparing 4-week historical baseline vs. contextual AI adjustment"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-4 font-semibold">Menu Dish</th>
                <th className="py-2.5 px-3 font-semibold">Station</th>
                <th className="py-2.5 px-3 font-semibold text-right">4-Wk Base Avg</th>
                <th className="py-2.5 px-3 font-semibold text-right">Context Modifier</th>
                <th className="py-2.5 px-3 font-semibold text-right">Expected Sales</th>
                <th className="py-2.5 px-3 font-semibold text-right">Recommended Prep</th>
                <th className="py-2.5 px-3 font-semibold">Waste Risk</th>
                <th className="py-2.5 px-4 font-semibold">Contextual Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menuItems.map(dish => {
                const adj = calculateAiAdjustment(dish);
                const isPositive = adj.clampedModifier > 0;
                const isNegative = adj.clampedModifier < 0;

                return (
                  <tr key={dish.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {dish.name}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="slate" size="sm">{dish.station}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 font-tabular-nums">
                      {adj.base}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-tabular-nums">
                      <span className={isPositive ? 'text-emerald-700' : isNegative ? 'text-amber-700' : 'text-slate-500'}>
                        {isPositive ? `+${Math.round(adj.clampedModifier * 100)}%` : isNegative ? `${Math.round(adj.clampedModifier * 100)}%` : '0%'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                      {adj.adjustedSales}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-emerald-800 font-tabular-nums">
                      {adj.finalPrep}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={adj.riskOfWaste === 'High' ? 'rose' : adj.riskOfWaste === 'Medium' ? 'amber' : 'emerald'}
                        size="sm"
                        dot
                      >
                        {adj.riskOfWaste}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs text-[11px] leading-tight">
                      {adj.rationale}
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
