import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  History,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import {
  SaleRecord,
  MenuItem,
  ClosedDayRecord,
  AppSettings,
  ContextualAnalysisResult
} from '../../types';
import {
  MultiDayForecastBundle,
  evaluateBacktestMetrics
} from '../../engine/forecastingEngine';
import {
  generateSampleMultiYearCsv,
  serializeMultiDayForecastCsv
} from '../../utils/salesCsv';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export interface UploadStatusFeedback {
  ok: boolean;
  title: string;
  details: string;
  warnings?: string[];
}

interface UploadForecastViewProps {
  salesRecords: SaleRecord[];
  activeDishes: MenuItem[];
  closedDays: ClosedDayRecord[];
  settings: AppSettings;
  startDate: string;
  horizonDays: 3 | 7 | 14;
  uploadMode: 'replace' | 'append';
  uploadFeedback: UploadStatusFeedback | null;
  forecastBundle: MultiDayForecastBundle;
  weatherCondition: 'Clear' | 'Rain' | 'Cloudy' | 'Storm';
  temperatureC: number;
  rainChance: number;
  eventTag: string;
  contextualAnalysis: ContextualAnalysisResult | null;
  isAnalyzingContext: boolean;
  onStartDateChange: (date: string) => void;
  onHorizonDaysChange: (days: 3 | 7 | 14) => void;
  onUploadModeChange: (mode: 'replace' | 'append') => void;
  onUploadFile: (file: File) => void;
  onDismissUploadFeedback: () => void;
  onAddManualSale: (params: { date: string; dishName: string; quantity: number; price: number }) => void;
  onAddClosedDay: (date: string, reason: string) => void;
  onRemoveClosedDay: (id: string) => void;
  onResetToBenchmark: () => void;
  onWeatherConditionChange: (val: 'Clear' | 'Rain' | 'Cloudy' | 'Storm') => void;
  onTemperatureChange: (val: number) => void;
  onRainChanceChange: (val: number) => void;
  onEventTagChange: (val: string) => void;
  onRequestContextualAnalysis: () => void;
}

export const UploadForecastView: React.FC<UploadForecastViewProps> = ({
  salesRecords,
  activeDishes,
  closedDays,
  settings,
  startDate,
  horizonDays,
  uploadMode,
  uploadFeedback,
  forecastBundle,
  weatherCondition,
  temperatureC,
  rainChance,
  eventTag,
  contextualAnalysis,
  isAnalyzingContext,
  onStartDateChange,
  onHorizonDaysChange,
  onUploadModeChange,
  onUploadFile,
  onDismissUploadFeedback,
  onAddManualSale,
  onAddClosedDay,
  onRemoveClosedDay,
  onResetToBenchmark,
  onWeatherConditionChange,
  onTemperatureChange,
  onRainChanceChange,
  onEventTagChange,
  onRequestContextualAnalysis
}) => {
  const dropInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [showAiContext, setShowAiContext] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const [manualDate, setManualDate] = useState(startDate);
  const [manualDish, setManualDish] = useState('');
  const [manualQty, setManualQty] = useState('25');
  const [closedDateInput, setClosedDateInput] = useState(startDate);
  const [closedReasonInput, setClosedReasonInput] = useState('Holiday / Closed');

  const historyStats = useMemo(() => {
    if (salesRecords.length === 0) {
      return {
        minDate: null as string | null,
        maxDate: null as string | null,
        distinctDays: 0,
        yearsCount: 0,
        isDemoOnly: false
      };
    }
    let minDate = salesRecords[0].date;
    let maxDate = salesRecords[0].date;
    const days = new Set<string>();
    const years = new Set<string>();
    let demoCount = 0;
    for (const s of salesRecords) {
      if (s.date < minDate) minDate = s.date;
      if (s.date > maxDate) maxDate = s.date;
      days.add(s.date);
      years.add(s.date.slice(0, 4));
      if (s.isDemonstrationData) demoCount += 1;
    }
    return {
      minDate,
      maxDate,
      distinctDays: days.size,
      yearsCount: years.size,
      isDemoOnly: demoCount === salesRecords.length
    };
  }, [salesRecords]);

  const accuracySummary = useMemo(() => {
    const evals = activeDishes
      .slice(0, 12)
      .map(d => evaluateBacktestMetrics(salesRecords, d.id, d.name, 14, closedDays))
      .filter(e => e.evaluatedDaysCount > 0);
    if (evals.length === 0) return null;
    const avgWmaMape = Math.round((evals.reduce((s, e) => s + e.wmaMape, 0) / evals.length) * 10) / 10;
    return { avgWmaMape, count: evals.length };
  }, [activeDishes, salesRecords, closedDays]);

  const handleDownloadSampleCsv = () => {
    const csv = generateSampleMultiYearCsv('2026-11-12');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_restaurant_sales_2years.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportForecastCsv = () => {
    const csv = serializeMultiDayForecastCsv(forecastBundle);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_forecast_${forecastBundle.startDate}_${forecastBundle.horizonDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUploadFile(file);
  };

  const avgDailyExpected = forecastBundle.horizonDays > 0
    ? Math.round(forecastBundle.totalExpectedPortions / forecastBundle.horizonDays)
    : 0;

  const tomorrowBucket = forecastBundle.days[0];
  const focusedDay = selectedDayDate
    ? forecastBundle.days.find(d => d.date === selectedDayDate) || null
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Upload Sales History & Auto-Forecast
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Upload CSV sales from previous days or years — upcoming daily predictions update automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => onUploadModeChange('replace')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  uploadMode === 'replace'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Replace Data
              </button>
              <button
                type="button"
                onClick={() => onUploadModeChange('append')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  uploadMode === 'append'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Add to History
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Sample CSV (2 Years)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setManualDate(historyStats.maxDate || startDate);
                setManualDish(activeDishes[0]?.name || '');
                setClosedDateInput(startDate);
                setIsHistoryModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>History ({salesRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => dropInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl px-5 py-5 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/70'
              : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/70'
          }`}
        >
          <input
            ref={dropInputRef}
            type="file"
            accept=".csv,.txt,.json,text/csv,application/json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadFile(file);
                e.target.value = '';
              }
            }}
          />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">
                Drop your sales CSV or click to choose a file
              </p>
              <p className="text-xs text-slate-500">
                Columns supported: <span className="font-mono">date</span>, <span className="font-mono">dish_name</span>, <span className="font-mono">quantity_sold</span> (optional: <span className="font-mono">station</span>, <span className="font-mono">revenue</span>) · Supports comma or semicolon CSV
              </p>
            </div>
          </div>
        </div>

        {uploadFeedback && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            uploadFeedback.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-start gap-2.5">
              {uploadFeedback.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{uploadFeedback.title}</p>
                <p className="mt-0.5 opacity-90">{uploadFeedback.details}</p>
                {uploadFeedback.warnings && uploadFeedback.warnings.length > 0 && (
                  <p className="mt-1 text-amber-800">
                    Skipped {uploadFeedback.warnings.length} invalid row(s): {uploadFeedback.warnings.slice(0, 2).join(' | ')}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissUploadFeedback}
              className="font-medium underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Predicted Demand — Next {horizonDays} Days
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {historyStats.isDemoOnly ? 'Sample demo dataset · ' : 'Uploaded restaurant data · '}
            {historyStats.minDate && historyStats.maxDate
              ? `History ${historyStats.minDate} to ${historyStats.maxDate} (${historyStats.distinctDays} days)`
              : 'No sales uploaded yet'}
            {accuracySummary ? ` · Backtest MAPE ${accuracySummary.avgWmaMape}%` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">From</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                onStartDateChange(e.target.value);
                setSelectedDayDate(null);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {([3, 7, 14] as const).map(days => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  onHorizonDaysChange(days);
                  setSelectedDayDate(null);
                }}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  horizonDays === days
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant={showAiContext ? 'secondary' : 'outline'}
            onClick={() => setShowAiContext(prev => !prev)}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Weather / AI
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportForecastCsv}
            disabled={forecastBundle.dishMatrices.length === 0}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {showAiContext && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Weather</label>
              <select
                value={weatherCondition}
                onChange={e => onWeatherConditionChange(e.target.value as 'Clear' | 'Rain' | 'Cloudy' | 'Storm')}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="Clear">Clear & Sunny</option>
                <option value="Rain">Rain</option>
                <option value="Storm">Storm</option>
                <option value="Cloudy">Cloudy</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Temp: {temperatureC}°C</label>
              <input
                type="range"
                min="2"
                max="36"
                value={temperatureC}
                onChange={e => onTemperatureChange(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 mt-1.5"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Rain Chance: {rainChance}%</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={rainChance}
                onChange={e => onRainChanceChange(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 mt-1.5"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Event / Day Context</label>
              <select
                value={eventTag}
                onChange={e => onEventTagChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="Regular Service">Regular Service</option>
                <option value="Payday Friday + Theater Event">Payday Friday + Theater Event</option>
                <option value="Public Holiday Long Weekend">Public Holiday Long Weekend</option>
                <option value="Neighborhood Street Fair">Neighborhood Street Fair</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="text-slate-500">
              {contextualAnalysis
                ? `${contextualAnalysis.isFallback ? 'Fallback statistical mode' : `Gemini (${contextualAnalysis.modelVersion})`}: ${contextualAnalysis.generalAssessment}`
                : `Optional AI adjustment on ${startDate} bounded within ±${settings.aiAdjustmentLimitPct}%.`}
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={onRequestContextualAnalysis}
              isLoading={isAnalyzingContext}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Run Gemini Context Analysis
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Next {horizonDays} Days Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {forecastBundle.totalExpectedPortions} portions
          </p>
          <p className="text-xs text-slate-500 mt-1 font-tabular-nums">
            Avg {avgDailyExpected}/day · Prep target {forecastBundle.totalRecommendedPrep}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">
            Next Day ({tomorrowBucket ? tomorrowBucket.dayLabel : startDate})
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-tabular-nums">
            {tomorrowBucket ? `${tomorrowBucket.totalExpectedSales} portions` : '0 portions'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-tabular-nums">
            {tomorrowBucket?.isClosedDay
              ? 'Marked closed day'
              : `Recommended prep: ${tomorrowBucket?.totalRecommendedPrep || 0} portions`}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Sales History Loaded</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-tabular-nums">
            {historyStats.distinctDays} days
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {salesRecords.length} rows · {activeDishes.length} dishes · {historyStats.yearsCount} year(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {forecastBundle.days.map(day => {
          const isSelected = selectedDayDate === day.date;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDayDate(isSelected ? null : day.date)}
              className={`text-left p-3 rounded-xl border transition-colors ${
                isSelected
                  ? 'bg-emerald-50 border-emerald-500 text-slate-900'
                  : day.isClosedDay
                  ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
              }`}
            >
              <p className="text-xs font-medium text-slate-500">{day.shortDateLabel}</p>
              <p className="text-lg font-bold mt-1 font-tabular-nums">
                {day.isClosedDay ? 'Closed' : day.totalExpectedSales}
              </p>
              <p className="text-xs text-slate-500 font-tabular-nums">
                {day.isClosedDay ? '0 prep' : `Prep ${day.totalRecommendedPrep}`}
              </p>
            </button>
          );
        })}
      </div>

      {focusedDay && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">
              Detail for {focusedDay.dayLabel} ({focusedDay.date})
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayDate(null)}
              className="text-emerald-700 font-medium hover:underline"
            >
              Back to All {horizonDays} Days
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 px-5">Dish & Explanation</th>
                  <th className="py-2.5 px-3 text-right">4-Wk Base</th>
                  <th className="py-2.5 px-3 text-right">Predicted</th>
                  <th className="py-2.5 px-3 text-center">80% Range</th>
                  <th className="py-2.5 px-5 text-right">Rec. Prep</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {focusedDay.dishForecasts.map(res => (
                  <tr key={res.dishId} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-5">
                      <p className="font-semibold text-slate-900">{res.dishName}</p>
                      <p className="text-slate-500 mt-0.5">{res.rationale}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-tabular-nums">
                      {res.baseStatisticalForecast}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-tabular-nums">
                      {res.expectedSales}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 font-tabular-nums">
                      {res.confidenceInterval80[0]}–{res.confidenceInterval80[1]}
                    </td>
                    <td className="py-2.5 px-5 text-right font-bold text-emerald-700 font-tabular-nums">
                      {res.recommendedPrep}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!focusedDay && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {forecastBundle.dishMatrices.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-700">No sales history found</p>
              <p>Upload a CSV file above to generate daily predictions automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2.5 px-4 sticky left-0 bg-slate-50">Dish</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Hist. Avg</th>
                    {forecastBundle.days.map(day => (
                      <th key={day.date} className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        {day.shortDateLabel}
                      </th>
                    ))}
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Total ({horizonDays}d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecastBundle.dishMatrices.map(row => {
                    const isExpanded = expandedDishId === row.dishId;
                    return (
                      <React.Fragment key={row.dishId}>
                        <tr
                          onClick={() => setExpandedDishId(isExpanded ? null : row.dishId)}
                          className="hover:bg-slate-50/70 cursor-pointer"
                        >
                          <td className="py-3 px-4 sticky left-0 bg-white">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <p className="font-semibold text-slate-900 whitespace-nowrap">{row.dishName}</p>
                                <p className="text-slate-400 whitespace-nowrap">
                                  {row.station} · {row.totalDaysHistory}d history
                                  {row.yearsCovered > 1 ? ` · ${row.yearsCovered}y` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 font-tabular-nums">
                            {row.historicalAvg}
                          </td>
                          {row.dailyResults.map(dayRes => (
                            <td
                              key={dayRes.targetDate}
                              className={`py-3 px-2.5 text-right font-tabular-nums ${
                                dayRes.isClosedDay
                                  ? 'text-amber-700'
                                  : dayRes.adjustmentSource === 'gemini'
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-slate-800'
                              }`}
                            >
                              {dayRes.isClosedDay ? '0' : dayRes.expectedSales}
                            </td>
                          ))}
                          <td className="py-3 px-4 text-right font-bold text-slate-900 font-tabular-nums">
                            {row.totalHorizonExpected}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={forecastBundle.days.length + 3} className="px-6 py-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                {row.dailyResults.map(d => (
                                  <div key={d.targetDate} className="bg-white border border-slate-200 rounded-lg p-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-semibold text-slate-700">{d.targetDate}</span>
                                      <span className="font-bold text-emerald-700 font-tabular-nums">
                                        {d.expectedSales} pred · {d.recommendedPrep} prep
                                      </span>
                                    </div>
                                    <p className="text-slate-500 mt-1">
                                      80% range: {d.confidenceInterval80[0]}–{d.confidenceInterval80[1]} · {d.rationale}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isHistoryModalOpen && (
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title="Uploaded Sales History & Closed Days"
          subtitle={`${salesRecords.length} records stored locally in IndexedDB`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="font-semibold text-slate-900">Quick Add Past Sale</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Dish name"
                  value={manualDish}
                  onChange={e => setManualDish(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg sm:col-span-2"
                />
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={manualQty}
                    onChange={e => setManualQty(e.target.value)}
                    className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      const q = parseInt(manualQty, 10);
                      if (!manualDate || !manualDish.trim() || !Number.isFinite(q) || q <= 0) return;
                      onAddManualSale({ date: manualDate, dishName: manualDish.trim(), quantity: q, price: 15 });
                      setManualDish('');
                    }}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="font-semibold text-slate-900">Closed Days (Zero Forecast)</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={closedDateInput}
                  onChange={e => setClosedDateInput(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={closedReasonInput}
                  onChange={e => setClosedReasonInput(e.target.value)}
                  placeholder="Reason"
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg flex-1 min-w-[140px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(closedDateInput)) {
                      onAddClosedDay(closedDateInput, closedReasonInput.trim() || 'Closed');
                    }
                  }}
                >
                  Mark Closed
                </Button>
              </div>
              {closedDays.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {closedDays.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded">
                      <span className="font-mono">{c.date}</span> ({c.reason})
                      <button type="button" onClick={() => onRemoveClosedDay(c.id)} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Dish</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesRecords.slice(0, 60).map(s => (
                    <tr key={s.id}>
                      <td className="py-1.5 px-3 font-mono text-slate-600">{s.date}</td>
                      <td className="py-1.5 px-3 font-medium text-slate-900">{s.dishName}</td>
                      <td className="py-1.5 px-3 text-right font-tabular-nums">{s.quantitySold}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600 font-tabular-nums">
                        {settings.currency}{s.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {confirmResetOpen && (
        <Modal
          isOpen={confirmResetOpen}
          onClose={() => setConfirmResetOpen(false)}
          title="Reset to Sample Demo Data"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmResetOpen(false)}>Cancel</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onResetToBenchmark();
                  setConfirmResetOpen(false);
                }}
              >
                Reset Data
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">
            This restores the default 30-day Rustic Table sample dataset and clears your uploaded CSV history.
          </p>
        </Modal>
      )}
    </div>
  );
};
