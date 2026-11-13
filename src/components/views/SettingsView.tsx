import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle
} from 'lucide-react';
import { AppSettings, Station } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (updated: AppSettings) => void;
  onResetToBenchmark: () => void;
  onExportJson: () => void;
  onImportJson: (data: string) => { success: boolean; error?: string };
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetToBenchmark,
  onExportJson,
  onImportJson
}) => {
  const [restaurantName, setRestaurantName] = useState(settings.restaurantName);
  const [concept, setConcept] = useState(settings.concept);
  const [currency, setCurrency] = useState(settings.currency);
  const [aiAdjustmentLimitPct, setAiAdjustmentLimitPct] = useState(settings.aiAdjustmentLimitPct);
  const [stationBuffers, setStationBuffers] = useState<Record<Station, number>>(settings.stationBuffers);
  const [savedToast, setSavedToast] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    setRestaurantName(settings.restaurantName);
    setConcept(settings.concept);
    setCurrency(settings.currency);
    setAiAdjustmentLimitPct(settings.aiAdjustmentLimitPct);
    setStationBuffers(settings.stationBuffers);
  }, [settings]);

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      restaurantName: restaurantName.trim() || 'The Rustic Table',
      concept: concept.trim() || 'Bistro & Seasonal Kitchen',
      currency: currency.trim() || '$',
      aiAdjustmentLimitPct,
      stationBuffers,
      updatedAt: Date.now()
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
      const res = onImportJson(text);
      if (res.success) {
        setImportStatus({ type: 'success', message: `Restored backup from "${file.name}".` });
      } else {
        setImportStatus({ type: 'error', message: res.error || 'Invalid backup JSON structure.' });
      }
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
  };

  const stations: Station[] = ['Grill', 'Saute', 'Garde Manger', 'Bakery'];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Restaurant Settings & AI Safety Rails
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure restaurant profile, Gemini adjustment bounds, station prep buffers, and IndexedDB backups
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          leftIcon={<Check className="w-3.5 h-3.5" />}
        >
          Save Configuration
        </Button>
      </div>

      {savedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Settings persisted to IndexedDB and applied across Forecast & Prep Engine.</span>
        </div>
      )}

      {importStatus && (
        <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
          importStatus.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {importStatus.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          <span>{importStatus.message}</span>
        </div>
      )}

      <Card
        title="Restaurant Operational Profile"
        subtitle="Configurable restaurant metadata (never hardcoded into business logic)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Restaurant Name</label>
            <input
              type="text"
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kitchen Operational Concept</label>
            <input
              type="text"
              value={concept}
              onChange={e => setConcept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Active Kitchen Stations</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="rose" size="sm">Grill</Badge>
              <Badge variant="amber" size="sm">Saute</Badge>
              <Badge variant="emerald" size="sm">Garde Manger</Badge>
              <Badge variant="purple" size="sm">Bakery</Badge>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
            <input
              type="text"
              maxLength={4}
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
            />
          </div>
        </div>
      </Card>

      <Card
        title="Gemini Contextual Intelligence & Station Buffer Bounds"
        subtitle="Enforces symmetric bounded adjustments (±%) on Gemini and local demand modifiers"
      >
        <div className="space-y-5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Max AI / Contextual Adjustment Bound: ±{aiAdjustmentLimitPct}% (Default ±15%)
            </label>
            <input
              type="range"
              min="5"
              max="35"
              step="1"
              value={aiAdjustmentLimitPct}
              onChange={e => setAiAdjustmentLimitPct(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Both server-side Gemini responses and client forecasting clamp modifiers strictly within [-{aiAdjustmentLimitPct}%, +{aiAdjustmentLimitPct}%] of the statistical moving average.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            {stations.map(st => (
              <div key={st}>
                <label className="block font-semibold text-slate-700 mb-1">
                  {st} Station Safety Buffer: +{stationBuffers[st]}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={stationBuffers[st]}
                  onChange={e =>
                    setStationBuffers(prev => ({
                      ...prev,
                      [st]: parseInt(e.target.value, 10)
                    }))
                  }
                  className="w-full accent-emerald-600"
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card
        title="Database Management & Backups"
        subtitle="Export, import, or reset benchmark IndexedDB state"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="font-semibold text-slate-900">Export Database Snapshot</p>
              <p className="text-slate-500">Download complete restaurant state (menu, BOMs, sales, waste, settings) as JSON.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onExportJson}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="font-semibold text-slate-900">Import Database Backup</p>
              <p className="text-slate-500">Restore your restaurant data from a previous JSON export file.</p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Select File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div>
              <p className="font-semibold text-amber-950">Reset to The Rustic Table Benchmark</p>
              <p className="text-amber-800">
                Reloads verified 30-day sales history, 12 dishes, 20 ingredients, and resets all checklists & overrides.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmResetOpen(true)}
              className="border-amber-300 text-amber-900 hover:bg-amber-100"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Benchmark Data
            </Button>
          </div>
        </div>
      </Card>

      {confirmResetOpen && (
        <Modal
          isOpen={confirmResetOpen}
          onClose={() => setConfirmResetOpen(false)}
          title="Confirm Benchmark Reset"
          subtitle="Clears custom edits in IndexedDB and restores default Rustic Table benchmark records"
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmResetOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onResetToBenchmark();
                  setConfirmResetOpen(false);
                }}
              >
                Confirm Reset
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-700">
            Are you sure you want to reset all IndexedDB stores back to the benchmark dataset? Consider exporting a JSON backup first if you want to preserve custom menu items or sales.
          </p>
        </Modal>
      )}
    </div>
  );
};
