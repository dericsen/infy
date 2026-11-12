import React, { useState, useEffect } from 'react';
import {
  AppRoute,
  Station,
  MenuItem,
  Ingredient,
  SaleRecord,
  WasteRecord
} from './types';
import {
  BENCHMARK_MENU_ITEMS,
  BENCHMARK_INGREDIENTS,
  INITIAL_BENCHMARK_SALES
} from './data/benchmarkData';
import { testFirestoreConnection } from './firebase';
import {
  UserSession,
  subscribeToAuthChanges,
  loginWithGoogle,
  loginAsDemoUser,
  logoutUser
} from './services/authService';
import {
  fetchMenuItems,
  persistMenuItem,
  removeMenuItem,
  fetchIngredients,
  persistIngredient,
  persistIngredientStock,
  removeIngredient,
  fetchSalesRecords,
  persistSaleRecord,
  recordSaleAndDeductInventory,
  fetchWasteRecords,
  persistWasteRecord,
  seedRestaurantToFirestore
} from './services/firestoreDataService';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardView } from './components/views/DashboardView';
import { PrepSheetView } from './components/views/PrepSheetView';
import { PredictionView } from './components/views/PredictionView';
import { MenuView } from './components/views/MenuView';
import { IngredientsView } from './components/views/IngredientsView';
import { InventoryView } from './components/views/InventoryView';
import { SalesView } from './components/views/SalesView';
import { WasteView } from './components/views/WasteView';
import { SettingsView } from './components/views/SettingsView';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { ShieldCheck, LogIn, ChefHat } from 'lucide-react';

const INITIAL_WASTE_RECORDS: WasteRecord[] = [
  {
    id: 'wst_1',
    restaurantId: 'rst_rustic_table',
    date: '2026-11-11',
    itemId: 'mnu_grill_salmon',
    itemType: 'menu_item',
    name: 'Wood-Fired Atlantic Salmon',
    quantity: 3,
    unit: 'portions',
    unitCost: 7.90,
    totalLossCost: 23.70,
    reason: 'Overproduction',
    loggedBy: 'Chef Marco',
    station: 'Grill'
  },
  {
    id: 'wst_2',
    restaurantId: 'rst_rustic_table',
    date: '2026-11-11',
    itemId: 'mnu_bakery_sourdough_loaf',
    itemType: 'menu_item',
    name: 'Country Sourdough Batard',
    quantity: 4,
    unit: 'portions',
    unitCost: 1.40,
    totalLossCost: 5.60,
    reason: 'Expired',
    loggedBy: 'Leo (Station Cook)',
    station: 'Bakery'
  },
  {
    id: 'wst_3',
    restaurantId: 'rst_rustic_table',
    date: '2026-11-10',
    itemId: 'mnu_salad_caesar',
    itemType: 'menu_item',
    name: 'Artisan Caesar Salad',
    quantity: 3,
    unit: 'portions',
    unitCost: 2.90,
    totalLossCost: 8.70,
    reason: 'Overproduction',
    loggedBy: 'Chef Marco',
    station: 'Garde Manger'
  }
];

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('dashboard');
  const [selectedStationFilter, setSelectedStationFilter] = useState<Station | 'All'>('All');
  const [businessDate, setBusinessDate] = useState<string>('2026-11-13');
  const [selectedShift, setSelectedShift] = useState<'All Day' | 'Lunch' | 'Dinner'>('All Day');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('wl_menu_items');
    return saved ? JSON.parse(saved) : BENCHMARK_MENU_ITEMS;
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('wl_ingredients');
    return saved ? JSON.parse(saved) : BENCHMARK_INGREDIENTS;
  });

  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem('wl_sales_records');
    return saved ? JSON.parse(saved) : INITIAL_BENCHMARK_SALES;
  });

  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>(() => {
    const saved = localStorage.getItem('wl_waste_records');
    return saved ? JSON.parse(saved) : INITIAL_WASTE_RECORDS;
  });

  const [checklistStates, setChecklistStates] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`wl_checklist_${businessDate}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [prepOverrides, setPrepOverrides] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`wl_overrides_${businessDate}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [isQuickWasteModalOpen, setIsQuickWasteModalOpen] = useState(false);

  useEffect(() => {
    testFirestoreConnection();
    seedRestaurantToFirestore('rst_rustic_table');

    const unsubscribe = subscribeToAuthChanges(user => {
      setCurrentUser(user);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wl_menu_items', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem('wl_ingredients', JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem('wl_sales_records', JSON.stringify(salesRecords));
  }, [salesRecords]);

  useEffect(() => {
    localStorage.setItem('wl_waste_records', JSON.stringify(wasteRecords));
  }, [wasteRecords]);

  useEffect(() => {
    const saved = localStorage.getItem(`wl_checklist_${businessDate}`);
    setChecklistStates(saved ? JSON.parse(saved) : {});
    const savedOverrides = localStorage.getItem(`wl_overrides_${businessDate}`);
    setPrepOverrides(savedOverrides ? JSON.parse(savedOverrides) : {});
  }, [businessDate]);

  useEffect(() => {
    localStorage.setItem(`wl_checklist_${businessDate}`, JSON.stringify(checklistStates));
  }, [checklistStates, businessDate]);

  useEffect(() => {
    localStorage.setItem(`wl_overrides_${businessDate}`, JSON.stringify(prepOverrides));
  }, [prepOverrides, businessDate]);

  const handleToggleChecklistItem = (taskId: string) => {
    setChecklistStates(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleResetChecklist = () => {
    setChecklistStates({});
  };

  const handleOverrideChange = (dishId: string, qty: number) => {
    setPrepOverrides(prev => ({
      ...prev,
      [dishId]: qty
    }));
  };

  const handleApplyForecastToPrep = (adjustments: Record<string, number>) => {
    setPrepOverrides(prev => ({
      ...prev,
      ...adjustments
    }));
    setCurrentRoute('prep-sheet');
  };

  const handleSaveMenuItem = (item: MenuItem) => {
    setMenuItems(prev => {
      const idx = prev.findIndex(m => m.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = item;
        return updated;
      }
      return [item, ...prev];
    });
    persistMenuItem('rst_rustic_table', item);
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== itemId));
    removeMenuItem('rst_rustic_table', itemId);
  };

  const handleSaveIngredient = (ing: Ingredient) => {
    setIngredients(prev => {
      const idx = prev.findIndex(i => i.id === ing.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = ing;
        return updated;
      }
      return [...prev, ing];
    });
    persistIngredient('rst_rustic_table', ing);
  };

  const handleDeleteIngredient = (ingredientId: string) => {
    setIngredients(prev => prev.filter(i => i.id !== ingredientId));
    removeIngredient('rst_rustic_table', ingredientId);
  };

  const handleUpdateStock = (ingredientId: string, newStock: number) => {
    setIngredients(prev =>
      prev.map(ing => (ing.id === ingredientId ? { ...ing, currentStock: newStock } : ing))
    );
    persistIngredientStock('rst_rustic_table', ingredientId, newStock);
  };

  const handleReceiveStock = (ingredientId: string, addedQty: number) => {
    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id === ingredientId) {
          const updated = Math.round((ing.currentStock + addedQty) * 100) / 100;
          persistIngredientStock('rst_rustic_table', ingredientId, updated);
          return { ...ing, currentStock: updated };
        }
        return ing;
      })
    );
  };

  const handleRecordSaleTransaction = async (sale: SaleRecord) => {
    const result = await recordSaleAndDeductInventory('rst_rustic_table', sale, menuItems, ingredients);
    setSalesRecords(prev => [sale, ...prev]);
    setIngredients(result.updatedIngredients);
  };

  const handleAddWasteRecord = (rec: WasteRecord) => {
    setWasteRecords(prev => [rec, ...prev]);
    persistWasteRecord('rst_rustic_table', rec);
  };

  const handleResetBenchmark = () => {
    setMenuItems(BENCHMARK_MENU_ITEMS);
    setIngredients(BENCHMARK_INGREDIENTS);
    setSalesRecords(INITIAL_BENCHMARK_SALES);
    setWasteRecords(INITIAL_WASTE_RECORDS);
    setChecklistStates({});
    setPrepOverrides({});
    localStorage.clear();
    seedRestaurantToFirestore('rst_rustic_table');
  };

  const handleExportJson = () => {
    const data = {
      restaurant: 'The Rustic Table',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      menuItems,
      ingredients,
      salesRecords,
      wasteRecords
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wasteless_backup_${businessDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.menuItems) setMenuItems(data.menuItems);
      if (data.ingredients) setIngredients(data.ingredients);
      if (data.salesRecords) setSalesRecords(data.salesRecords);
      if (data.wasteRecords) setWasteRecords(data.wasteRecords);
    } catch {
      return;
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await loginWithGoogle();
      setIsAuthModalOpen(false);
    } catch {
      return;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setAuthLoading(true);
    try {
      await loginAsDemoUser();
      setIsAuthModalOpen(false);
    } catch {
      return;
    } finally {
      setAuthLoading(false);
    }
  };

  const renderActiveView = () => {
    switch (currentRoute) {
      case 'dashboard':
        return (
          <DashboardView
            businessDate={businessDate}
            menuItems={menuItems}
            ingredients={ingredients}
            onNavigate={setCurrentRoute}
            onFilterStation={setSelectedStationFilter}
            onQuickWasteLog={() => setIsQuickWasteModalOpen(true)}
          />
        );
      case 'prep-sheet':
        return (
          <PrepSheetView
            businessDate={businessDate}
            selectedStationFilter={selectedStationFilter}
            onStationFilterChange={setSelectedStationFilter}
            menuItems={menuItems}
            ingredients={ingredients}
            checklistStates={checklistStates}
            onToggleChecklistItem={handleToggleChecklistItem}
            onResetChecklist={handleResetChecklist}
            overrides={prepOverrides}
            onOverrideChange={handleOverrideChange}
          />
        );
      case 'prediction':
        return (
          <PredictionView
            businessDate={businessDate}
            menuItems={menuItems}
            salesRecords={salesRecords}
            onApplyForecastToPrep={handleApplyForecastToPrep}
          />
        );
      case 'menu':
        return (
          <MenuView
            menuItems={menuItems}
            ingredients={ingredients}
            onSaveMenuItem={handleSaveMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
          />
        );
      case 'ingredients':
        return (
          <IngredientsView
            ingredients={ingredients}
            menuItems={menuItems}
            onSaveIngredient={handleSaveIngredient}
            onDeleteIngredient={handleDeleteIngredient}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            ingredients={ingredients}
            onUpdateStock={handleUpdateStock}
            onReceiveStock={handleReceiveStock}
          />
        );
      case 'sales':
        return (
          <SalesView
            salesRecords={salesRecords}
            menuItems={menuItems}
            ingredients={ingredients}
            onUploadCsv={recs => {
              setSalesRecords(prev => [...recs, ...prev]);
              recs.slice(0, 10).forEach(r => persistSaleRecord('rst_rustic_table', r));
            }}
            onRecordSaleTransaction={handleRecordSaleTransaction}
          />
        );
      case 'waste':
        return (
          <WasteView
            wasteRecords={wasteRecords}
            menuItems={menuItems}
            onAddWasteRecord={handleAddWasteRecord}
            isOpenQuickLogModal={isQuickWasteModalOpen}
            onCloseQuickLogModal={() => setIsQuickWasteModalOpen(false)}
          />
        );
      case 'settings':
        return (
          <SettingsView
            onResetToBenchmark={handleResetBenchmark}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
          />
        );
    }
  };

  return (
    <>
      <AppLayout
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        selectedStationFilter={selectedStationFilter}
        onStationFilterChange={setSelectedStationFilter}
        businessDate={businessDate}
        onBusinessDateChange={setBusinessDate}
        selectedShift={selectedShift}
        onShiftChange={setSelectedShift}
        isOnline={isOnline}
        currentUser={currentUser}
        onLogin={() => setIsAuthModalOpen(true)}
        onLogout={logoutUser}
        onResetBenchmark={handleResetBenchmark}
        onQuickWasteLog={() => setIsQuickWasteModalOpen(true)}
      >
        {renderActiveView()}
      </AppLayout>

      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Restaurant Staff Sign In"
        subtitle="Sign in to sync kitchen pars and waste logs across devices"
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Secure Firebase Authentication active. Restaurant data is isolated per tenant.</span>
          </div>

          <div className="space-y-2.5">
            <Button
              variant="primary"
              className="w-full justify-center py-2.5"
              onClick={handleGoogleSignIn}
              isLoading={authLoading}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In with Google Account
            </Button>

            <Button
              variant="outline"
              className="w-full justify-center py-2.5"
              onClick={handleDemoSignIn}
              isLoading={authLoading}
              leftIcon={<ChefHat className="w-4 h-4 text-emerald-600" />}
            >
              Quick Sign In as Chef Marco (Demo Staff)
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
