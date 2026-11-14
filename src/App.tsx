import React, { useState, useEffect, useMemo } from 'react';
import {
  AppRoute,
  Station,
  MenuItem,
  Ingredient,
  SaleRecord,
  WasteReason,
  ClosedDayRecord,
  PrepChecklistItem,
  AppSettings,
  ContextualAnalysisResult
} from './types';
import {
  BENCHMARK_MENU_ITEMS,
  BENCHMARK_INGREDIENTS,
  INITIAL_BENCHMARK_SALES,
  DEFAULT_APP_SETTINGS
} from './data/benchmarkData';
import {
  MenuRepository,
  IngredientRepository,
  SalesRepository,
  WasteRepository,
  ClosedDayRepository,
  PrepChecklistRepository,
  PrepOverrideRepository,
  SettingsRepository,
  initializeDatabaseIfEmpty,
  resetDatabaseToBenchmark
} from './db/repositories';
import {
  extractDishesFromSales,
  generateMultiDayForecast,
  suggestForecastStartDate,
  addDaysIso
} from './engine/forecastingEngine';
import { generatePreparationRecommendations } from './engine/recommendationEngine';
import { parseUploadedSalesCsv, parseUploadedExcelWorkbook } from './utils/salesCsv';
import { requestContextualForecast } from './services/contextualForecastService';
import { testFirestoreConnection } from './firebase';
import { AppLayout } from './components/layout/AppLayout';
import { UploadForecastView, UploadStatusFeedback } from './components/views/UploadForecastView';
import { PrepWorkspaceView } from './components/views/PrepWorkspaceView';
import { Modal } from './components/common/Modal';
import { Button } from './components/common/Button';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('forecast');
  const [selectedStationFilter, setSelectedStationFilter] = useState<Station | 'All'>('All');
  const [startDate, setStartDate] = useState<string>('2026-11-13');
  const [horizonDays, setHorizonDays] = useState<3 | 7 | 14>(7);
  const [selectedShift, setSelectedShift] = useState<'All Day' | 'Lunch' | 'Dinner'>('All Day');
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('replace');
  const [uploadFeedback, setUploadFeedback] = useState<UploadStatusFeedback | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>(BENCHMARK_MENU_ITEMS);
  const [ingredients, setIngredients] = useState<Ingredient[]>(BENCHMARK_INGREDIENTS);
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>(INITIAL_BENCHMARK_SALES);
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

  const [weatherCondition, setWeatherCondition] = useState<'Clear' | 'Rain' | 'Cloudy' | 'Storm'>('Clear');
  const [temperatureC, setTemperatureC] = useState<number>(20);
  const [rainChance, setRainChance] = useState<number>(15);
  const [eventTag, setEventTag] = useState<string>('Regular Service');
  const [contextualAnalysis, setContextualAnalysis] = useState<ContextualAnalysisResult | null>(null);
  const [isAnalyzingContext, setIsAnalyzingContext] = useState<boolean>(false);

  const [isQuickWasteModalOpen, setIsQuickWasteModalOpen] = useState(false);
  const [wasteDishId, setWasteDishId] = useState('');
  const [wasteQty, setWasteQty] = useState('3');
  const [wasteReason, setWasteReason] = useState<WasteReason>('Overproduction');
  const [wasteLoggedBy, setWasteLoggedBy] = useState('Chef Marco');
  const [wasteError, setWasteError] = useState<string | null>(null);

  const sheetBaseKey = `${startDate}_${selectedShift.replace(/\s+/g, '')}`;
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
        setClosedDays(data.closedDays);
        setSettings(data.settings);
        if (data.salesRecords.length > 0) {
          setStartDate(suggestForecastStartDate(data.salesRecords));
        }
      } catch (err) {
        if (!active) return;
        setDbError(err instanceof Error ? err.message : 'Failed to initialize IndexedDB persistence.');
      } finally {
        if (active) setIsDbLoading(false);
      }
    })();

    testFirestoreConnection();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
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

  const activeDishes = useMemo(() => {
    return extractDishesFromSales(salesRecords, menuItems);
  }, [salesRecords, menuItems]);

  const forecastBundle = useMemo(() => {
    return generateMultiDayForecast({
      dishes: activeDishes,
      salesRecords,
      startDate,
      horizonDays,
      weather: { condition: weatherCondition, temperatureC, precipChance: rainChance },
      eventContext: eventTag,
      closedDays,
      settings,
      geminiTargetDate: contextualAnalysis && !contextualAnalysis.isFallback ? contextualAnalysis.targetDate : undefined,
      geminiAdjustments: contextualAnalysis && !contextualAnalysis.isFallback ? contextualAnalysis.adjustments : undefined
    });
  }, [
    activeDishes,
    salesRecords,
    startDate,
    horizonDays,
    weatherCondition,
    temperatureC,
    rainChance,
    eventTag,
    closedDays,
    settings,
    contextualAnalysis
  ]);

  const firstDayForecasts = useMemo(() => {
    return forecastBundle.days[0]?.dishForecasts || [];
  }, [forecastBundle]);

  const recommendationBundle = useMemo(() => {
    return generatePreparationRecommendations({
      prepSheetId,
      businessDate: startDate,
      shift: selectedShift,
      forecasts: firstDayForecasts,
      menuItems: activeDishes,
      ingredients,
      overrides: prepOverrides
    });
  }, [prepSheetId, startDate, selectedShift, firstDayForecasts, activeDishes, ingredients, prepOverrides]);

  const commitParsedSalesUpload = (
    fileName: string,
    parsed: ReturnType<typeof parseUploadedSalesCsv>
  ) => {
    if (parsed.validRecords.length === 0) {
      setUploadFeedback({
        ok: false,
        title: `Could not import ${fileName}`,
        details: parsed.errors[0] || 'No valid rows found in uploaded file.',
        warnings: parsed.errors.slice(1, 5)
      });
      return;
    }

    const mergedMap = new Map<string, SaleRecord>();
    if (uploadMode === 'append') {
      for (const rec of salesRecords) {
        mergedMap.set(`${rec.date}__${rec.menuItemId}__${rec.mealPeriod}`, rec);
      }
    }
    for (const rec of parsed.validRecords) {
      mergedMap.set(`${rec.date}__${rec.menuItemId}__${rec.mealPeriod}`, rec);
    }
    const nextSales = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    const referenceMenus = uploadMode === 'replace' ? BENCHMARK_MENU_ITEMS : menuItems;
    const nextDishes = extractDishesFromSales(nextSales, referenceMenus);
    const nextStart = suggestForecastStartDate(nextSales);

    setSalesRecords(nextSales);
    setMenuItems(nextDishes);
    setStartDate(nextStart);
    setContextualAnalysis(null);
    setCurrentRoute('forecast');

    SalesRepository.replaceAll(nextSales).catch(err => setDbError(String(err)));
    MenuRepository.replaceAll(nextDishes).catch(err => setDbError(String(err)));

    setUploadFeedback({
      ok: true,
      title: `Uploaded ${fileName} — Next ${horizonDays} Days Predicted Automatically`,
      details: `Loaded ${parsed.validRecords.length} rows (${parsed.minDate} to ${parsed.maxDate}) across ${parsed.detectedDishes.length} dish(es). Forecast starts ${nextStart}.`,
      warnings: parsed.errors
    });
  };

  const handleUploadFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const baselineMenus = uploadMode === 'replace' ? [] : menuItems;

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = ev => {
        const buffer = ev.target?.result;
        if (!(buffer instanceof ArrayBuffer)) {
          setUploadFeedback({
            ok: false,
            title: `Could not read ${file.name}`,
            details: 'Failed to read binary Excel file.'
          });
          return;
        }
        try {
          const parsed = parseUploadedExcelWorkbook(buffer, baselineMenus, settings.restaurantId);
          commitParsedSalesUpload(file.name, parsed);
        } catch (err) {
          setUploadFeedback({
            ok: false,
            title: `Invalid Excel file ${file.name}`,
            details: err instanceof Error ? err.message : 'Unable to parse Excel workbook.'
          });
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (!content.trim()) {
        setUploadFeedback({
          ok: false,
          title: `Could not read ${file.name}`,
          details: 'Selected file appears empty.'
        });
        return;
      }

      if (lowerName.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          const importedSales: SaleRecord[] = Array.isArray(parsed?.salesRecords)
            ? parsed.salesRecords
            : Array.isArray(parsed)
            ? parsed
            : [];
          if (importedSales.length === 0) {
            setUploadFeedback({
              ok: false,
              title: 'Invalid JSON sales file',
              details: 'Expected a backup object with salesRecords or an array of sale records.'
            });
            return;
          }
          const nextSales = uploadMode === 'replace' ? importedSales : [...importedSales, ...salesRecords];
          const nextMenu = Array.isArray(parsed?.menuItems)
            ? parsed.menuItems
            : extractDishesFromSales(nextSales, menuItems);
          const nextStart = suggestForecastStartDate(nextSales);

          setSalesRecords(nextSales);
          setMenuItems(nextMenu);
          setStartDate(nextStart);
          setContextualAnalysis(null);
          setCurrentRoute('forecast');

          SalesRepository.replaceAll(nextSales).catch(err => setDbError(String(err)));
          MenuRepository.replaceAll(nextMenu).catch(err => setDbError(String(err)));

          setUploadFeedback({
            ok: true,
            title: `Uploaded ${file.name} — Next ${horizonDays} Days Predicted Automatically`,
            details: `Loaded ${importedSales.length} sales rows. Forecasting ${nextStart} through ${addDaysIso(nextStart, horizonDays - 1)}.`
          });
        } catch {
          setUploadFeedback({
            ok: false,
            title: `Invalid JSON in ${file.name}`,
            details: 'File does not contain valid JSON syntax.'
          });
        }
        return;
      }

      const parsed = parseUploadedSalesCsv(content, baselineMenus, settings.restaurantId);
      commitParsedSalesUpload(file.name, parsed);
    };
    reader.readAsText(file);
  };

  const handleAddManualSale = (params: { date: string; dishName: string; quantity: number; price: number }) => {
    const existingDish = menuItems.find(m => m.name.toLowerCase() === params.dishName.toLowerCase());
    const menuItemId = existingDish?.id || `dish_${params.dishName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const newSale: SaleRecord = {
      id: `manual_${Date.now()}`,
      restaurantId: settings.restaurantId,
      date: params.date,
      dayOfWeek: new Date(params.date).getUTCDay(),
      menuItemId,
      dishName: existingDish?.name || params.dishName,
      station: existingDish?.station || 'Grill',
      quantitySold: params.quantity,
      revenue: Math.round(params.quantity * (existingDish?.sellingPrice || params.price) * 100) / 100,
      mealPeriod: 'All Day',
      weatherCondition: 'Clear',
      temperatureC: 20,
      eventTag: 'Manual Entry',
      isDemonstrationData: false
    };

    const nextSales = [newSale, ...salesRecords];
    const nextMenu = extractDishesFromSales(nextSales, menuItems);
    setSalesRecords(nextSales);
    setMenuItems(nextMenu);
    setStartDate(suggestForecastStartDate(nextSales));

    SalesRepository.save(newSale).catch(err => setDbError(String(err)));
    MenuRepository.saveMany(nextMenu).catch(err => setDbError(String(err)));
  };

  const handleRequestContextualAnalysis = async () => {
    setIsAnalyzingContext(true);
    try {
      const result = await requestContextualForecast({
        targetDate: startDate,
        weatherForecast: {
          condition: weatherCondition,
          temperatureC,
          precipitationProbability: rainChance
        },
        eventContext: eventTag,
        adjustmentLimitPct: settings.aiAdjustmentLimitPct,
        menuItems: activeDishes,
        statisticalForecasts: firstDayForecasts,
        simulateOffline: !isOnline
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
      businessDate: startDate,
      station,
      taskId,
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
      completedBy: nextCompleted ? 'Kitchen Staff' : undefined,
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

  const handleSaveStockCount = (ingredientId: string, nextStock: number) => {
    const updatedList = ingredients.map(i => (i.id === ingredientId ? { ...i, currentStock: nextStock } : i));
    setIngredients(updatedList);
    const target = updatedList.find(i => i.id === ingredientId);
    if (target) IngredientRepository.save(target).catch(err => setDbError(String(err)));
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

  const handleResetBenchmark = async () => {
    try {
      const data = await resetDatabaseToBenchmark();
      setMenuItems(data.menuItems);
      setIngredients(data.ingredients);
      setSalesRecords(data.salesRecords);
      setClosedDays(data.closedDays);
      setSettings(data.settings);
      setChecklistItems([]);
      setPrepOverrides({});
      setContextualAnalysis(null);
      setUploadFeedback(null);
      setStartDate(suggestForecastStartDate(data.salesRecords));
      setPrepRevisionByKey({});
      localStorage.removeItem('wl_prep_revisions');
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to reset database.');
    }
  };

  const handleSaveQuickWaste = () => {
    setWasteError(null);
    const dish = activeDishes.find(m => m.id === (wasteDishId || activeDishes[0]?.id));
    if (!dish) {
      setWasteError('No menu items available.');
      return;
    }
    const qty = parseInt(wasteQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setWasteError('Portions must be at least 1.');
      return;
    }
    if (!wasteLoggedBy.trim()) {
      setWasteError('Enter staff name.');
      return;
    }
    WasteRepository.save({
      id: `wst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: dish.restaurantId || 'rst_rustic_table',
      date: startDate,
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
    }).catch(err => setDbError(String(err)));
    setIsQuickWasteModalOpen(false);
  };

  return (
    <>
      <AppLayout
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        onUploadFileSelected={handleUploadFile}
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

        {isDbLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-600">
            Loading saved sales data...
          </div>
        ) : currentRoute === 'forecast' ? (
          <UploadForecastView
            salesRecords={salesRecords}
            activeDishes={activeDishes}
            closedDays={closedDays}
            settings={settings}
            startDate={startDate}
            horizonDays={horizonDays}
            uploadMode={uploadMode}
            uploadFeedback={uploadFeedback}
            forecastBundle={forecastBundle}
            weatherCondition={weatherCondition}
            temperatureC={temperatureC}
            rainChance={rainChance}
            eventTag={eventTag}
            contextualAnalysis={contextualAnalysis}
            isAnalyzingContext={isAnalyzingContext}
            onStartDateChange={date => {
              setStartDate(date);
              setContextualAnalysis(null);
            }}
            onHorizonDaysChange={setHorizonDays}
            onUploadModeChange={setUploadMode}
            onUploadFile={handleUploadFile}
            onDismissUploadFeedback={() => setUploadFeedback(null)}
            onAddManualSale={handleAddManualSale}
            onAddClosedDay={handleAddClosedDay}
            onRemoveClosedDay={handleRemoveClosedDay}
            onResetToBenchmark={handleResetBenchmark}
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
            onRequestContextualAnalysis={handleRequestContextualAnalysis}
          />
        ) : (
          <PrepWorkspaceView
            businessDate={startDate}
            selectedShift={selectedShift}
            selectedStationFilter={selectedStationFilter}
            recommendationBundle={recommendationBundle}
            checklistItems={checklistItems}
            ingredients={ingredients}
            settings={settings}
            onBusinessDateChange={date => {
              setStartDate(date);
              setContextualAnalysis(null);
            }}
            onShiftChange={setSelectedShift}
            onStationFilterChange={setSelectedStationFilter}
            onToggleChecklistItem={handleToggleChecklistItem}
            onResetPrepSheet={handleResetPrepSheet}
            onOverrideChange={handleOverrideChange}
            onSaveStockCount={handleSaveStockCount}
            onOpenWasteModal={() => {
              setWasteError(null);
              if (!wasteDishId && activeDishes[0]) setWasteDishId(activeDishes[0].id);
              setIsQuickWasteModalOpen(true);
            }}
          />
        )}
      </AppLayout>

      <Modal
        isOpen={isQuickWasteModalOpen}
        onClose={() => setIsQuickWasteModalOpen(false)}
        title="Log Waste Discard"
        subtitle={`Service date: ${startDate}`}
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
              value={wasteDishId || activeDishes[0]?.id || ''}
              onChange={e => setWasteDishId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
            >
              {activeDishes.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.station})
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
    </>
  );
}
