import React, { useState } from 'react';
import { AppRoute, Station } from '../../types';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoBanner } from '../common/DemoBanner';

interface AppLayoutProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  selectedStationFilter: Station | 'All';
  onStationFilterChange: (station: Station | 'All') => void;
  businessDate: string;
  onBusinessDateChange: (date: string) => void;
  selectedShift: 'All Day' | 'Lunch' | 'Dinner';
  onShiftChange: (shift: 'All Day' | 'Lunch' | 'Dinner') => void;
  isOnline: boolean;
  onResetBenchmark: () => void;
  onQuickWasteLog: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onRouteChange,
  selectedStationFilter,
  onStationFilterChange,
  businessDate,
  onBusinessDateChange,
  selectedShift,
  onShiftChange,
  isOnline,
  onResetBenchmark,
  onQuickWasteLog,
  children
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      <DemoBanner onResetBenchmark={onResetBenchmark} />

      <div className="flex-1 flex">
        <Sidebar
          currentRoute={currentRoute}
          onRouteChange={onRouteChange}
          selectedStationFilter={selectedStationFilter}
          onStationFilterChange={onStationFilterChange}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <Header
            currentRoute={currentRoute}
            selectedStationFilter={selectedStationFilter}
            businessDate={businessDate}
            onBusinessDateChange={onBusinessDateChange}
            selectedShift={selectedShift}
            onShiftChange={onShiftChange}
            isOnline={isOnline}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onNavigate={onRouteChange}
            onQuickWasteLog={onQuickWasteLog}
          />

          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
