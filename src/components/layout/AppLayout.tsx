import React, { useState } from 'react';
import { Trash2, Menu as MenuIcon, X } from 'lucide-react';
import { AppRoute } from '../../types';
import { Button } from '../common/Button';

interface AppLayoutProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  onQuickWasteLog: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onRouteChange,
  onQuickWasteLog,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { route: AppRoute; label: string }[] = [
    { route: 'today', label: 'Today' },
    { route: 'forecast', label: 'Forecast' },
    { route: 'kitchen', label: 'Kitchen' },
    { route: 'records', label: 'Records' }
  ];

  const handleSelectRoute = (route: AppRoute) => {
    onRouteChange(route);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => handleSelectRoute('today')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            Infy
          </button>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => {
              const isActive = currentRoute === link.route;
              return (
                <button
                  key={link.route}
                  type="button"
                  onClick={() => handleSelectRoute(link.route)}
                  className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'text-emerald-700 border-emerald-600 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="primary"
              onClick={onQuickWasteLog}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="whitespace-nowrap shrink-0"
            >
              Log Waste
            </Button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-2 flex items-center gap-2 overflow-x-auto">
            {navLinks.map(link => {
              const isActive = currentRoute === link.route;
              return (
                <button
                  key={link.route}
                  type="button"
                  onClick={() => handleSelectRoute(link.route)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};
