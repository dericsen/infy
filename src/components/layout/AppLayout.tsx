import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { AppRoute } from '../../types';
import { Button } from '../common/Button';

interface AppLayoutProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  onUploadFileSelected: (file: File) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onRouteChange,
  onUploadFileSelected,
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const navLinks: { route: AppRoute; label: string }[] = [
    { route: 'forecast', label: 'Upload & Forecast' },
    { route: 'prep', label: 'Kitchen Prep' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onRouteChange('forecast')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            Infy
          </button>

          <nav className="flex items-center gap-6">
            {navLinks.map(link => {
              const isActive = currentRoute === link.route;
              return (
                <button
                  key={link.route}
                  type="button"
                  onClick={() => onRouteChange(link.route)}
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

          <div className="flex items-center shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  onUploadFileSelected(file);
                  e.target.value = '';
                }
              }}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              className="whitespace-nowrap shrink-0"
            >
              Upload Excel / CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};
