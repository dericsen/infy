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
  restaurantName?: string;
  restaurantConcept?: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  selectedStationFilter,
  onStationFilterChange,
  restaurantName = 'The Rustic Table',
  restaurantConcept = 'Fast-Casual Bistro',
  isOpenMobile,
  onCloseMobile
}) => {
  const navigationItems = [
    { route: 'dashboard' as AppRoute, label: 'Dashboard', icon: LayoutDashboard },
    { route: 'prep-sheet' as AppRoute, label: 'Station Prep Sheet', icon: ClipboardList },
    { route: 'prediction' as AppRoute, label: 'Demand Forecast', icon: Sparkles, highlight: true },
    { route: 'menu' as AppRoute, label: 'Menu & Recipe BOM', icon: UtensilsCrossed },
    { route: 'ingredients' as AppRoute, label: 'Ingredients Catalog', icon: Layers },
    { route: 'inventory' as AppRoute, label: 'Inventory & Stock Par', icon: Boxes },
    { route: 'sales' as AppRoute, label: 'Sales History', icon: BarChart3 },
    { route: 'waste' as AppRoute, label: 'Waste Logs & Loss', icon: Trash2 },
    { route: 'settings' as AppRoute, label: 'Settings & Backup', icon: Settings }
  ];

  const stations: { id: Station | 'All'; label: string; icon: React.ReactNode }[] = [
    { id: 'All', label: 'All Stations', icon: null },
    { id: 'Grill', label: 'Grill', icon: <Flame className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'Saute', label: 'Saute', icon: <Soup className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'Garde Manger', label: 'Garde Manger', icon: <Salad className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'Bakery', label: 'Bakery', icon: <Croissant className="w-3.5 h-3.5 text-yellow-400" /> }
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

      <aside
        className={`
          no-print fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <ChefHat className="w-5 h-5 text-emerald-50" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-white text-base tracking-tight whitespace-nowrap">Infy</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">· WasteLess</span>
              </div>
              <p className="text-xs text-slate-400 truncate">Kitchen Prep & Waste AI</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-xs font-medium text-slate-400 mb-2">
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
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                      ${isActive
                        ? 'bg-emerald-600 text-white font-semibold'
                        : item.highlight
                        ? 'text-emerald-400 hover:bg-slate-800 hover:text-emerald-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-xs font-medium text-slate-400 mb-2">
              Station Focus
            </p>
            <div className="space-y-1">
              {stations.map(st => (
                <button
                  key={st.id}
                  onClick={() => onStationFilterChange(st.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                    ${selectedStationFilter === st.id
                      ? 'bg-slate-800 text-white font-semibold ring-1 ring-slate-700'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {st.icon || <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500">·</span>}
                    <span>{st.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <p className="font-semibold text-white truncate">{restaurantName}</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">{restaurantConcept}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
