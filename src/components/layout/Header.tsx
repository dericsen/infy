import React from 'react';
import {
  Menu as MenuIcon,
  Calendar,
  Clock,
  Wifi,
  Sparkles,
  ClipboardList,
  Trash2
} from 'lucide-react';
import { AppRoute, Station } from '../../types';
import { Button } from '../common/Button';

interface HeaderProps {
  currentRoute: AppRoute;
  selectedStationFilter: Station | 'All';
  businessDate: string;
  onBusinessDateChange: (date: string) => void;
  selectedShift: 'All Day' | 'Lunch' | 'Dinner';
  onShiftChange: (shift: 'All Day' | 'Lunch' | 'Dinner') => void;
  isOnline: boolean;
  onOpenMobileSidebar: () => void;
  onNavigate: (route: AppRoute) => void;
  onQuickWasteLog: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  selectedStationFilter,
  businessDate,
  onBusinessDateChange,
  selectedShift,
  onShiftChange,
  isOnline,
  onOpenMobileSidebar,
  onNavigate,
  onQuickWasteLog
}) => {
  const routeTitles: Record<AppRoute, { title: string; subtitle: string }> = {
    dashboard: { title: 'Operational Dashboard', subtitle: 'Overview of demand, recommended batch pars, and waste metrics' },
    'prep-sheet': { title: 'Station Preparation Sheet', subtitle: 'Deterministic batch prep checklist and decomposed ingredient requirements' },
    prediction: { title: 'AI Demand Forecast & Context Simulator', subtitle: 'Historical 4-week weighted moving average with bounded Gemini adjustment' },
    menu: { title: 'Menu & Recipe Bill of Materials', subtitle: 'Dish pricing, kitchen stations, and raw ingredient portion formulas' },
    ingredients: { title: 'Ingredients Catalog', subtitle: 'Unit costs, current stock, and safety par thresholds' },
    inventory: { title: 'Inventory & Physical Count', subtitle: 'Stock intake, safety buffer deficits, and on-hand reconciliation' },
    sales: { title: 'Sales Ledger & Data Ingestion', subtitle: '30-day verified sales history with weather and event tags' },
    waste: { title: 'Waste Logs & Financial ROI', subtitle: 'Shift discard recordings with reason codes and cost impact' },
    settings: { title: 'Restaurant Settings & Backup', subtitle: 'Safety rails, station definitions, and JSON database export/import' }
  };

  const currentInfo = routeTitles[currentRoute] || { title: 'WasteLess', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {currentInfo.title}
              </h1>
              {selectedStationFilter !== 'All' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {selectedStationFilter} Station
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="date"
              value={businessDate}
              onChange={e => onBusinessDateChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            {(['All Day', 'Lunch', 'Dinner'] as const).map(shift => (
              <button
                key={shift}
                onClick={() => onShiftChange(shift)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedShift === shift
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {shift}
              </button>
            ))}
          </div>

          <div className={`hidden md:flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Wifi className="w-3 h-3" />
            <span>{isOnline ? 'Online / AI Ready' : 'Deterministic Offline Mode'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onQuickWasteLog}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
            >
              Log Waste
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate('prep-sheet')}
              leftIcon={<ClipboardList className="w-3.5 h-3.5" />}
            >
              Prep Sheet
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
