import React from 'react';
import {
  Menu as MenuIcon,
  Calendar,
  Wifi,
  WifiOff,
  ClipboardList,
  Trash2
} from 'lucide-react';
import { AppRoute, Station } from '../../types';
import { Button } from '../common/Button';
import { UserSession } from '../../services/authService';

interface HeaderProps {
  currentRoute: AppRoute;
  selectedStationFilter: Station | 'All';
  businessDate: string;
  onBusinessDateChange: (date: string) => void;
  selectedShift: 'All Day' | 'Lunch' | 'Dinner';
  onShiftChange: (shift: 'All Day' | 'Lunch' | 'Dinner') => void;
  isOnline: boolean;
  currentUser: UserSession | null;
  onLogin: () => void;
  onLogout: () => void;
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
  currentUser,
  onLogin,
  onLogout,
  onOpenMobileSidebar,
  onNavigate,
  onQuickWasteLog
}) => {
  const routeTitles: Record<AppRoute, { title: string; subtitle: string }> = {
    dashboard: { title: 'Operational Dashboard', subtitle: 'Demand overview, station prep pars, and waste metrics' },
    'prep-sheet': { title: 'Station Preparation Sheet', subtitle: 'Batch prep checklist and aggregated ingredient requirements' },
    prediction: { title: 'Demand Forecast & Simulator', subtitle: '4-week weighted moving average with bounded Gemini context' },
    menu: { title: 'Menu & Recipe BOM', subtitle: 'Dish pricing, stations, and raw ingredient portion formulas' },
    ingredients: { title: 'Ingredients Catalog', subtitle: 'Unit costs, current stock, shelf life, and safety thresholds' },
    inventory: { title: 'Inventory & Physical Count', subtitle: 'Stock intake, safety deficits, and on-hand reconciliation' },
    sales: { title: 'Sales Ledger & POS Import', subtitle: 'Daily sales history, CSV ingestion, and BOM stock deduction' },
    waste: { title: 'Waste Logs & Loss Analysis', subtitle: 'Shift discard recordings, reason breakdown, and cost impact' },
    settings: { title: 'Settings & Backup', subtitle: 'Restaurant profile, forecast bounds, and JSON snapshots' }
  };

  const currentInfo = routeTitles[currentRoute] || { title: 'WasteLess', subtitle: '' };

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {currentInfo.title}
              </h1>
              {selectedStationFilter !== 'All' && (
                <span className="text-xs font-medium text-emerald-800 whitespace-nowrap shrink-0">
                  · {selectedStationFilter}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="date"
              value={businessDate}
              onChange={e => onBusinessDateChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer font-mono"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium shrink-0">
            {(['All Day', 'Lunch', 'Dinner'] as const).map(shift => (
              <button
                key={shift}
                onClick={() => onShiftChange(shift)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedShift === shift
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {shift}
              </button>
            ))}
          </div>

          <div
            className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border whitespace-nowrap shrink-0 ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline Cache'}</span>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs shrink-0">
              <span className="font-semibold text-slate-800 max-w-[120px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-rose-600 font-medium whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onQuickWasteLog}
              className="whitespace-nowrap shrink-0"
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
            >
              Log Waste
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onNavigate('prep-sheet')}
              className="whitespace-nowrap shrink-0"
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
