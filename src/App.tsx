import React, { useState, useEffect, useMemo } from 'react';
import {
  AppRoute,
  Station,
  MenuItem,
  Ingredient,
  SaleRecord,
  WasteRecord,
  WasteReason,
  StockMovementRecord,
  StockMovementType,
  ClosedDayRecord,
  PrepChecklistItem,
  AppSettings,
  ContextualAnalysisResult
} from './types';
import {
  BENCHMARK_MENU_ITEMS,
  BENCHMARK_INGREDIENTS,
  INITIAL_BENCHMARK_SALES,
  INITIAL_WASTE_RECORDS,
  DEFAULT_APP_SETTINGS
} from './data/benchmarkData';
import {
  MenuRepository,
  IngredientRepository,
  SalesRepository,
  WasteRepository,
  StockMovementRepository,
  ClosedDayRepository,
  PrepChecklistRepository,
  PrepOverrideRepository,
  SettingsRepository,
  initializeDatabaseIfEmpty,
  resetDatabaseToBenchmark
} from './db/repositories';
import { generateComprehensiveForecast } from './engine/forecastingEngine';
import { generatePreparationRecommendations } from './engine/recommendationEngine';
import { convertQuantity } from './engine/unitConversion';
import { requestContextualForecast } from './services/contextualForecastService';
import { testFirestoreConnection } from './firebase';
import {
  UserSession,
  subscribeToAuthChanges,
  loginWithGoogle,
  loginAsDemoUser,
  logoutUser
} from './services/authService';
import { AppLayout } from './components/layout/AppLayout';
import { TodayView } from './components/views/TodayView';
import { ForecastView } from './components/views/ForecastView';
import { KitchenView } from './components/views/KitchenView';
import { RecordsView } from './components/views/RecordsView';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { ShieldCheck, LogIn, ChefHat, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('today');
  const [selectedStationFilter, setSelectedStationFilter] = useState<Station | 'All'>('All');
  const [businessDate, setBusinessDate] = useState<string>('2026-11-13');
  const [selectedShift, setSelectedShift] = useState<'All Day' | 'Lunch' | 'Dinner'>('All Day');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [isQuickWasteModalOpen, setIsQuickWasteModalOpen] = useState(false);
  const [wasteDishId, setWasteDishId] = useState('');
  const [wasteQty, setWasteQty] = useState('3');
  const [wasteReason, setWasteReason] = useState<WasteReason>('Overproduction');
  const [wasteLoggedBy, setWasteLoggedBy] = useState('Chef Marco');
  const [wasteError, setWasteError] = useState<string | null>(null);

  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>(BENCHMARK_MENU_ITEMS);
  const [ingredients, setIngredients] = useState<Ingredient[]>(BENCHMARK_INGREDIENTS);
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>(INITIAL_BENCHMARK_SALES);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>(INITIAL_WASTE_RECORDS);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>([]);
  const [closedDays, setClosedDays] = useState<ClosedDayRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const [prepRevisionByKey, setPrepRevisionByKey] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('wl_prep_revisions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [checklistItems, setChecklistItems] = useState<PrepChecklistItem[]>([]);
  const [prepOverrides, setPrepOverrides] = useState<Record<string, number>>({});

  const [weatherCondition, setWeatherCondition] = useState<'Clear' | 'Rain' | 'Cloudy' | 'Storm'>('Rain');
  const [temperatureC, setTemperatureC] = useState<number>(13);
  const [rainChance, setRainChance] = useState<number>(65);
  const [eventTag, setEventTag] = useState<string>('Payday Friday + Theater Event');
  const [simulateGeminiOffline, setSimulateGeminiOffline] = useState<boolean>(false);
  const [contextualAnalysis, setContextualAnalysis] = useState<ContextualAnalysisResult | null>(null);
  const [isAnalyzingContext, setIsAnalyzingContext] = useState<boolean>(false);

  const sheetBaseKey = `${businessDate}_${selectedShift.replace(/\s+/g, '')}`;
  const currentRevision = prepRevisionByKey[sheetBaseKey] || 1;
  const prepSheetId = `prep_${sheetBaseKey}_r${currentRevision}`;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await initializeDatabaseIfEmpty();
        if (!active) return;
        setMenuItems(data.menuItems);
        setIngredients(data.ingredients);
        setSalesRecords(data.salesRecords);
        setWasteRecords(data.wasteRecords);
        setStockMovements(data.stockMovements);
        setClosedDays(data.closedDays);
        setSettings(data.settings);
      } catch (err) {
        if (!active) return;
        setDbError(err instanceof Error ? err.message : 'Failed to initialize IndexedDB persistence.');
      } finally {
        if (active) setIsDbLoading(false);
      }
    })();

    testFirestoreConnection();
    const unsubscribe = subscribeToAuthChanges(user => setCurrentUser(user));
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [items, overrides] = await Promise.all([
          PrepChecklistRepository.listByPrepSheet(prepSheetId),
          PrepOverrideRepository.getByPrepSheet(prepSheetId)
        ]);
        if (!active) return;
        setChecklistItems(items);
        setPrepOverrides(overrides);
      } catch (err) {
        if (!active) return;
        setDbError(err instanceof Error ? err.message : 'Failed loading prep sheet state.');
      }
    })();
    return () => {
      active = false;
    };
  }, [prepSheetId]);

  useEffect(() => {
    try {
      localStorage.setItem('wl_prep_revisions', JSON.stringify(prepRevisionByKey));
    } catch {
      return;
    }
  }, [prepRevisionByKey]);

  const activeMenuItems = useMemo(() => menuItems.filter(m => m.isActive), [menuItems]);

  const forecasts = useMemo(() => {
    return activeMenuItems.map(dish => {
      const geminiAdjustment = contextualAnalysis && !contextualAnalysis.isFallback
        ? contextualAnalysis.adjustments.find(a => a.dishId === dish.id)
        : undefined;

      return generateComprehensiveForecast(
        dish,
        salesRecords,
        businessDate,
        { condition: weatherCondition, temperatureC, precipChance: rainChance },
        eventTag,
        {
          closedDays,
          settings,
          geminiAdjustment
        }
      );
    });
  }, [
    activeMenuItems,
    salesRecords,
    businessDate,
    weatherCondition,
    temperatureC,
    rainChance,
    eventTag,
    closedDays,
    settings,
    contextualAnalysis
  ]);

  const recommendationBundle = useMemo(() => {
    return generatePreparationRecommendations({
      prepSheetId,
      businessDate,
      shift: selectedShift,
      forecasts,
      menuItems,
      ingredients,
      overrides: prepOverrides
    });
  }, [prepSheetId, businessDate, selectedShift, forecasts, menuItems, ingredients, prepOverrides]);

  const handleRequestContextualAnalysis = async () => {
    setIsAnalyzingContext(true);
    try {
      const result = await requestContextualForecast({
        targetDate: businessDate,
        weatherForecast: {
          condition: weatherCondition,
          temperatureC,
          precipitationProbability: rainChance
        },
        eventContext: eventTag,
        adjustmentLimitPct: settings.aiAdjustmentLimitPct,
        menuItems,
        statisticalForecasts: forecasts,
        simulateOffline: simulateGeminiOffline || !isOnline
      });
      setContextualAnalysis(result);
    } finally {
      setIsAnalyzingContext(false);
    }
  };

  const handleToggleChecklistItem = (station: Station, taskId: string) => {
    const existing = checklistItems.find(item => item.taskId === taskId);
    const nextCompleted = existing ? !existing.isCompleted : true;
    const updatedItem: PrepChecklistItem = {
      id: existing?.id || `${prepSheetId}_${taskId}`,
      prepSheetId,
      businessDate,
      station,
      taskId,
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
      completedBy: nextCompleted ? currentUser?.displayName || 'Chef Marco' : undefined,
      isDemonstrationData: false
    };

    setChecklistItems(prev => {
      const idx = prev.findIndex(item => item.taskId === taskId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedItem;
        return next;
      }
      return [...prev, updatedItem];
    });
    PrepChecklistRepository.saveItem(updatedItem).catch(err => setDbError(String(err)));
  };

  const handleResetPrepSheet = () => {
    setPrepRevisionByKey(prev => ({
      ...prev,
      [sheetBaseKey]: (prev[sheetBaseKey] || 1) + 1
    }));
  };

  const handleOverrideChange = (dishId: string, qty: number) => {
    const sanitized = Math.max(0, Math.round(qty));
    const nextOverrides = { ...prepOverrides, [dishId]: sanitized };
    setPrepOverrides(nextOverrides);
    PrepOverrideRepository.saveForPrepSheet(prepSheetId, nextOverrides).catch(err => setDbError(String(err)));
  };

  const handleApplyForecastToPrep = (adjustments: Record<string, number>) => {
    const nextOverrides = { ...prepOverrides, ...adjustments };
    setPrepOverrides(nextOverrides);
    PrepOverrideRepository.saveForPrepSheet(prepSheetId, nextOverrides).catch(err => setDbError(String(err)));
    setCurrentRoute('today');
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
    MenuRepository.save(item).catch(err => setDbError(String(err)));
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== itemId));
    MenuRepository.remove(itemId).catch(err => setDbError(String(err)));
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
    IngredientRepository.save(ing).catch(err => setDbError(String(err)));
  };

  const handleDeleteIngredient = (ingredientId: string) => {
    setIngredients(prev => prev.filter(i => i.id !== ingredientId));
    IngredientRepository.remove(ingredientId).catch(err => setDbError(String(err)));
  };

  const handleAdjustInventory = (params: {
    ingredientId: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
  }): { success: boolean; error?: string } => {
    const target = ingredients.find(i => i.id === params.ingredientId);
    if (!target) return { success: false, error: 'Selected ingredient not found.' };

    const previousStock = target.currentStock;
    let newStock = previousStock;
    let delta = 0;

    if (params.type === 'addition') {
      newStock = Math.round((previousStock + params.quantity) * 100) / 100;
      delta = Math.round(params.quantity * 100) / 100;
    } else if (params.type === 'reduction') {
      if (previousStock - params.quantity < 0) {
        return {
          success: false,
          error: `Cannot reduce ${params.quantity} ${target.unit}: only ${previousStock} ${target.unit} on hand.`
        };
      }
      newStock = Math.round((previousStock - params.quantity) * 100) / 100;
      delta = -Math.round(params.quantity * 100) / 100;
    } else {
      if (params.quantity < 0) return { success: false, error: 'Stock count cannot be negative.' };
      newStock = Math.round(params.quantity * 100) / 100;
      delta = Math.round((newStock - previousStock) * 100) / 100;
    }

    const updatedIng: Ingredient = { ...target, currentStock: newStock };
    const movement: StockMovementRecord = {
      id: `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      restaurantId: target.restaurantId,
      ingredientId: target.id,
      ingredientName: target.name,
      type: params.type,
      delta,
      previousStock,
      newStock,
      unit: target.unit,
      reason: params.reason,
      date: businessDate,
      timestamp: new Date().toISOString()
    };

    setIngredients(prev => prev.map(i => (i.id === updatedIng.id ? updatedIng : i)));
    setStockMovements(prev => [movement, ...prev]);

    IngredientRepository.save(updatedIng).catch(err => setDbError(String(err)));
    StockMovementRepository.save(movement).catch(err => setDbError(String(err)));
    return { success: true };
  };

  const handleBatchCommitStockCounts = (counts: Record<string, number>): { success: boolean; error?: string; changedCount: number } => {
    for (const [id, val] of Object.entries(counts)) {
      if (!Number.isFinite(val) || val < 0) {
        return { success: false, error: `Invalid negative count for ${id}.`, changedCount: 0 };
      }
    }

    const updatedList: Ingredient[] = [];
    const newMovements: StockMovementRecord[] = [];
    let changedCount = 0;

    for (const ing of ingredients) {
      const nextCount = counts[ing.id];
      if (nextCount === undefined) continue;
      const rounded = Math.round(nextCount * 100) / 100;
      if (rounded !== ing.currentStock) {
        changedCount += 1;
        const delta = Math.round((rounded - ing.currentStock) * 100) / 100;
        newMovements.push({
          id: `mv_${Date.now()}_${ing.id}`,
          restaurantId: ing.restaurantId,
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'adjustment',
          delta,
          previousStock: ing.currentStock,
          newStock: rounded,
          unit: ing.unit,
          reason: 'Physical count commit',
          date: businessDate,
          timestamp: new Date().toISOString()
        });
        updatedList.push({ ...ing, currentStock: rounded });
      } else {
        updatedList.push(ing);
      }
    }

    if (changedCount > 0) {
      setIngredients(updatedList);
      setStockMovements(prev => [...newMovements, ...prev]);
      IngredientRepository.saveMany(updatedList).catch(err => setDbError(String(err)));
      newMovements.forEach(m => StockMovementRepository.save(m).catch(err => setDbError(String(err))));
    }

    return { success: true, changedCount };
  };

  const handleRecordSaleTransaction = (sale: SaleRecord): { success: boolean; error?: string; deductedDetails: string[] } => {
    const matchedDish = menuItems.find(m => m.id === sale.menuItemId);
    if (!matchedDish) return { success: false, error: 'Menu dish not found.', deductedDetails: [] };

    const deductedDetails: string[] = [];
    const newMovements: StockMovementRecord[] = [];
    const updatedIngredients = ingredients.map(ing => {
      const bomItem = matchedDish.ingredients.find(b => b.ingredientId === ing.id);
      if (!bomItem) return ing;

      const conv = convertQuantity(bomItem.quantity * sale.quantitySold, bomItem.unit, ing.unit);
      if (!conv.compatible) {
        deductedDetails.push(`${ing.name}: skipped (unit mismatch)`);
        return ing;
      }

      const totalConsumed = Math.round(conv.value * 100) / 100;
      const newStock = Math.max(0, Math.round((ing.currentStock - totalConsumed) * 100) / 100);
      const actualDelta = Math.round((newStock - ing.currentStock) * 100) / 100;

      deductedDetails.push(`${ing.name}: ${actualDelta} ${ing.unit}`);
      newMovements.push({
        id: `mv_${Date.now()}_${ing.id}_${Math.random().toString(36).slice(2, 5)}`,
        restaurantId: ing.restaurantId,
        ingredientId: ing.id,
        ingredientName: ing.name,
        type: 'sale_deduction',
        delta: actualDelta,
        previousStock: ing.currentStock,
        newStock,
        unit: ing.unit,
        reason: `POS sale: ${sale.quantitySold}x ${matchedDish.name}`,
        date: sale.date,
        timestamp: new Date().toISOString()
      });

      return { ...ing, currentStock: newStock };
    });

    setSalesRecords(prev => [sale, ...prev]);
    setIngredients(updatedIngredients);
    if (newMovements.length > 0) setStockMovements(prev => [...newMovements, ...prev]);

    SalesRepository.save(sale).catch(err => setDbError(String(err)));
    IngredientRepository.saveMany(updatedIngredients).catch(err => setDbError(String(err)));
    newMovements.forEach(m => StockMovementRepository.save(m).catch(err => setDbError(String(err))));

    return { success: true, deductedDetails };
  };

  const handleUpdateSaleRecord = (updatedSale: SaleRecord) => {
    setSalesRecords(prev => prev.map(r => (r.id === updatedSale.id ? updatedSale : r)));
    SalesRepository.save(updatedSale).catch(err => setDbError(String(err)));
  };

  const handleUploadCsvSales = (records: SaleRecord[]) => {
    setSalesRecords(prev => [...records, ...prev]);
    SalesRepository.saveMany(records).catch(err => setDbError(String(err)));
  };

  const handleAddClosedDay = (date: string, reason: string) => {
    if (closedDays.some(c => c.date === date)) return;
    const record: ClosedDayRecord = {
      id: `closed_${date}`,
      restaurantId: settings.restaurantId,
      date,
      reason
    };
    setClosedDays(prev => [...prev, record]);
    ClosedDayRepository.save(record).catch(err => setDbError(String(err)));
  };

  const handleRemoveClosedDay = (id: string) => {
    setClosedDays(prev => prev.filter(c => c.id !== id));
    ClosedDayRepository.remove(id).catch(err => setDbError(String(err)));
  };

  const handleAddWasteRecord = (rec: WasteRecord) => {
    setWasteRecords(prev => [rec, ...prev]);
    WasteRepository.save(rec).catch(err => setDbError(String(err)));
  };

  const handleSaveQuickWaste = () => {
    setWasteError(null);
    const dish = menuItems.find(m => m.id === (wasteDishId || menuItems[0]?.id));
    if (!dish) {
      setWasteError('No menu items available.');
      return;
    }
    const qty = parseInt(wasteQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setWasteError('Discarded portions must be at least 1.');
      return;
    }
    if (!wasteLoggedBy.trim()) {
      setWasteError('Enter staff name.');
      return;
    }

    handleAddWasteRecord({
      id: `wst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: dish.restaurantId || 'rst_rustic_table',
      date: businessDate,
      itemId: dish.id,
      itemType: 'menu_item',
      name: dish.name,
      quantity: qty,
      unit: 'portions',
      unitCost: dish.targetCost,
      totalLossCost: Math.round(dish.targetCost * qty * 100) / 100,
      reason: wasteReason,
      loggedBy: wasteLoggedBy.trim(),
      station: dish.station
    });
    setIsQuickWasteModalOpen(false);
  };

  const handleSaveSettings = (updated: AppSettings) => {
    setSettings(updated);
    setContextualAnalysis(null);
    SettingsRepository.save(updated).catch(err => setDbError(String(err)));
  };

  const handleResetBenchmark = async () => {
    try {
      const data = await resetDatabaseToBenchmark();
      setMenuItems(data.menuItems);
      setIngredients(data.ingredients);
      setSalesRecords(data.salesRecords);
      setWasteRecords(data.wasteRecords);
      setStockMovements(data.stockMovements);
      setClosedDays(data.closedDays);
      setSettings(data.settings);
      setChecklistItems([]);
      setPrepOverrides({});
      setContextualAnalysis(null);
      setPrepRevisionByKey({});
      localStorage.removeItem('wl_prep_revisions');
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to reset database.');
    }
  };

  const handleExportJson = () => {
    const data = {
      restaurant: settings.restaurantName,
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      settings,
      menuItems,
      ingredients,
      salesRecords,
      wasteRecords,
      closedDays,
      stockMovements
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wasteless_backup_${businessDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (jsonString: string): { success: boolean; error?: string } => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Backup file does not contain a valid JSON object.' };
      }
      if (Array.isArray(data.menuItems)) {
        setMenuItems(data.menuItems);
        MenuRepository.saveMany(data.menuItems).catch(err => setDbError(String(err)));
      }
      if (Array.isArray(data.ingredients)) {
        setIngredients(data.ingredients);
        IngredientRepository.saveMany(data.ingredients).catch(err => setDbError(String(err)));
      }
      if (Array.isArray(data.salesRecords)) {
        setSalesRecords(data.salesRecords);
        SalesRepository.saveMany(data.salesRecords).catch(err => setDbError(String(err)));
      }
      if (Array.isArray(data.wasteRecords)) {
        setWasteRecords(data.wasteRecords);
        WasteRepository.saveMany(data.wasteRecords).catch(err => setDbError(String(err)));
      }
      if (data.settings && typeof data.settings === 'object') {
        setSettings(data.settings);
        SettingsRepository.save(data.settings).catch(err => setDbError(String(err)));
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Invalid JSON syntax in selected backup file.' };
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
    if (isDbLoading) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-600">
          Loading kitchen data...
        </div>
      );
    }

    switch (currentRoute) {
      case 'today':
        return (
          <TodayView
            businessDate={businessDate}
            selectedShift={selectedShift}
            selectedStationFilter={selectedStationFilter}
            recommendationBundle={recommendationBundle}
            checklistItems={checklistItems}
            forecasts={forecasts}
            contextualAnalysis={contextualAnalysis}
            weatherCondition={weatherCondition}
            temperatureC={temperatureC}
            rainChance={rainChance}
            eventTag={eventTag}
            settings={settings}
            onBusinessDateChange={date => {
              setBusinessDate(date);
              setContextualAnalysis(null);
            }}
            onShiftChange={setSelectedShift}
            onStationFilterChange={setSelectedStationFilter}
            onToggleChecklistItem={handleToggleChecklistItem}
            onResetPrepSheet={handleResetPrepSheet}
            onOverrideChange={handleOverrideChange}
            onNavigate={setCurrentRoute}
          />
        );
      case 'forecast':
        return (
          <ForecastView
            businessDate={businessDate}
            menuItems={menuItems}
            salesRecords={salesRecords}
            forecasts={forecasts}
            closedDays={closedDays}
            settings={settings}
            weatherCondition={weatherCondition}
            temperatureC={temperatureC}
            rainChance={rainChance}
            eventTag={eventTag}
            simulateGeminiOffline={simulateGeminiOffline}
            contextualAnalysis={contextualAnalysis}
            isAnalyzingContext={isAnalyzingContext}
            onWeatherConditionChange={val => {
              setWeatherCondition(val);
              setContextualAnalysis(null);
            }}
            onTemperatureChange={val => {
              setTemperatureC(val);
              setContextualAnalysis(null);
            }}
            onRainChanceChange={val => {
              setRainChance(val);
              setContextualAnalysis(null);
            }}
            onEventTagChange={val => {
              setEventTag(val);
              setContextualAnalysis(null);
            }}
            onSimulateGeminiOfflineChange={setSimulateGeminiOffline}
            onRequestContextualAnalysis={handleRequestContextualAnalysis}
            onApplyForecastToPrep={handleApplyForecastToPrep}
          />
        );
      case 'kitchen':
        return (
          <KitchenView
            menuItems={menuItems}
            ingredients={ingredients}
            stockMovements={stockMovements}
            businessDate={businessDate}
            onSaveMenuItem={handleSaveMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onSaveIngredient={handleSaveIngredient}
            onDeleteIngredient={handleDeleteIngredient}
            onAdjustInventory={handleAdjustInventory}
            onBatchCommitStockCounts={handleBatchCommitStockCounts}
          />
        );
      case 'records':
        return (
          <RecordsView
            salesRecords={salesRecords}
            wasteRecords={wasteRecords}
            menuItems={menuItems}
            ingredients={ingredients}
            closedDays={closedDays}
            settings={settings}
            businessDate={businessDate}
            currentUser={currentUser}
            onUploadCsv={handleUploadCsvSales}
            onRecordSaleTransaction={handleRecordSaleTransaction}
            onUpdateSaleRecord={handleUpdateSaleRecord}
            onAddClosedDay={handleAddClosedDay}
            onRemoveClosedDay={handleRemoveClosedDay}
            onOpenWasteModal={() => {
              setWasteError(null);
              if (!wasteDishId && menuItems[0]) setWasteDishId(menuItems[0].id);
              setIsQuickWasteModalOpen(true);
            }}
            onSaveSettings={handleSaveSettings}
            onResetToBenchmark={handleResetBenchmark}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={logoutUser}
          />
        );
    }
  };

  return (
    <>
      <AppLayout
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        onQuickWasteLog={() => {
          setWasteError(null);
          if (!wasteDishId && menuItems[0]) setWasteDishId(menuItems[0].id);
          setIsQuickWasteModalOpen(true);
        }}
      >
        {dbError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{dbError}</span>
            </div>
            <button onClick={() => setDbError(null)} className="font-semibold underline">
              Dismiss
            </button>
          </div>
        )}
        {renderActiveView()}
      </AppLayout>

      <Modal
        isOpen={isQuickWasteModalOpen}
        onClose={() => setIsQuickWasteModalOpen(false)}
        title="Log Waste Discard"
        subtitle={`Service date: ${businessDate}`}
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsQuickWasteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleSaveQuickWaste}>Save Waste</Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          {wasteError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">{wasteError}</div>
          )}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Menu Item</label>
            <select
              value={wasteDishId || menuItems[0]?.id || ''}
              onChange={e => setWasteDishId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
            >
              {menuItems.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.station}) — {settings.currency}{m.targetCost.toFixed(2)}/portion
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Portions</label>
              <input
                type="number"
                min="1"
                max="500"
                value={wasteQty}
                onChange={e => setWasteQty(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Reason</label>
              <select
                value={wasteReason}
                onChange={e => setWasteReason(e.target.value as WasteReason)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="Overproduction">Overproduction</option>
                <option value="Expired">Expired</option>
                <option value="Prep Mistake">Prep Mistake</option>
                <option value="Quality Defect">Quality Defect</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Logged By</label>
            <input
              type="text"
              value={wasteLoggedBy}
              onChange={e => setWasteLoggedBy(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Staff Sign In"
        subtitle="Associate prep sign-offs with your staff profile"
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Operational data persists locally in IndexedDB with optional Firebase Authentication.</span>
          </div>

          <div className="space-y-2.5">
            <Button
              variant="primary"
              className="w-full justify-center py-2.5"
              onClick={handleGoogleSignIn}
              isLoading={authLoading}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In with Google
            </Button>

            <Button
              variant="outline"
              className="w-full justify-center py-2.5"
              onClick={handleDemoSignIn}
              isLoading={authLoading}
              leftIcon={<ChefHat className="w-4 h-4 text-emerald-600" />}
            >
              Quick Sign In as Chef Marco
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
