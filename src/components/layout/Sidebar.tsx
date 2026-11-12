import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  UtensilsCrossed,
  Layers,
  Boxes,
  BarChart3,
  Trash2,
  Settings,
  ChefHat,
  X,
  Flame,
  Soup,
  Salad,
  Croissant
} from 'lucide-react';
import { AppRoute, Station } from '../../types';

interface SidebarProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  selectedStationFilter: Station | 'All';
  onStationFilterChange: (station: Station | 'All') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  selectedStationFilter,
  onStationFilterChange,
  isOpenMobile,
  onCloseMobile
}) => {
  const navigationItems = [
    { route: 'dashboard' as AppRoute, label: 'Dashboard', icon: LayoutDashboard },
    { route: 'prep-sheet' as AppRoute, label: 'Station Prep Sheet', icon: ClipboardList, badge: 'Live' },
    { route: 'prediction' as AppRoute, label: 'AI Demand Forecast', icon: Sparkles, highlight: true },
    { route: 'menu' as AppRoute, label: 'Menu & Recipe BOM', icon: UtensilsCrossed },
    { route: 'ingredients' as AppRoute, label: 'Ingredients Catalog', icon: Layers },
    { route: 'inventory' as AppRoute, label: 'Inventory & Stock Par', icon: Boxes },
    { route: 'sales' as AppRoute, label: 'Sales History', icon: BarChart3 },
    { route: 'waste' as AppRoute, label: 'Waste Logs & ROI', icon: Trash2 },
    { route: 'settings' as AppRoute, label: 'Settings & Backup', icon: Settings }
  ];

  const stations: { id: Station | 'All'; label: string; icon: React.ReactNode }[] = [
    { id: 'All', label: 'All Stations', icon: null },
    { id: 'Grill', label: 'Grill', icon: <Flame className="w-3.5 h-3.5 text-rose-500" /> },
    { id: 'Saute', label: 'Saute', icon: <Soup className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'Garde Manger', label: 'Garde Manger', icon: <Salad className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'Bakery', label: 'Bakery', icon: <Croissant className="w-3.5 h-3.5 text-yellow-600" /> }
  ];

  const handleNavClick = (route: AppRoute) => {
    onRouteChange(route);
    onCloseMobile();
  };

  return (
    <>
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-950/50">
              <ChefHat className="w-5 h-5 text-emerald-50" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight">WasteLess</span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  Infy
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">Kitchen Food Waste AI</p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Operations & Planning
            </p>
            <nav className="space-y-1">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => handleNavClick(item.route)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                        : item.highlight
                          ? 'text-emerald-400 hover:bg-slate-800/80 hover:text-emerald-300'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Kitchen Station Par Focus
            </p>
            <div className="space-y-1">
              {stations.map(st => (
                <button
                  key={st.id}
                  onClick={() => onStationFilterChange(st.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${selectedStationFilter === st.id
                      ? 'bg-slate-800 text-white font-semibold ring-1 ring-slate-700'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {st.icon || <span className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center text-[9px]">•</span>}
                    <span>{st.label}</span>
                  </div>
                  {selectedStationFilter === st.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">The Rustic Table</p>
              <p className="text-[11px] text-slate-400">Station Kitchen Mode</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          </div>
        </div>
      </aside>
    </>
  );
};
