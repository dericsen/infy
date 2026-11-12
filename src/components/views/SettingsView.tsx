import React, { useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Database,
  Download,
  Upload,
  RotateCcw,
  Check,
  Building
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { BENCHMARK_METADATA } from '../../data/benchmarkData';

interface SettingsViewProps {
  onResetToBenchmark: () => void;
  onExportJson: () => void;
  onImportJson: (data: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onResetToBenchmark,
  onExportJson,
  onImportJson
}) => {
  const [maxDecrease, setMaxDecrease] = useState(30);
  const [maxIncrease, setMaxIncrease] = useState(35);
  const [grillBuffer, setGrillBuffer] = useState(8);
  const [bakeryBuffer, setBakeryBuffer] = useState(5);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        onImportJson(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Restaurant Settings & Safety Rails Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure restaurant operational parameters, model boundary constraints, and data backups
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
          <span>Safety rails and restaurant configuration successfully updated.</span>
        </div>
      )}

      <Card
        title="Restaurant Operational Profile"
        subtitle="Active kitchen workspace information"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Restaurant Name</label>
            <input
              type="text"
              readOnly
              value="The Rustic Table"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kitchen Operational Model</label>
            <input
              type="text"
              readOnly
              value="Fast Casual Bistro & Grill"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Active Kitchen Stations</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="rose" size="sm">Grill Station</Badge>
              <Badge variant="amber" size="sm">Saute Station</Badge>
              <Badge variant="emerald" size="sm">Garde Manger</Badge>
              <Badge variant="purple" size="sm">Bakery Station</Badge>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
            <input
              type="text"
              readOnly
              value="$ (USD)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      <Card
        title="ADR-001 Prediction Safety Rails"
        subtitle="Hard upper and lower boundaries enforced on external AI demand multipliers"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Max Allowed Demand Suppression: -{maxDecrease}%
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={maxDecrease}
                onChange={e => setMaxDecrease(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Prevents model from dropping prep below {100 - maxDecrease}% of baseline regardless of weather.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Max Allowed Demand Surge: +{maxIncrease}%
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={maxIncrease}
                onChange={e => setMaxIncrease(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Protects kitchen from catastrophic overproduction during events.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Grill / Protein Station Buffer Par: +{grillBuffer}%
              </label>
              <input
                type="range"
                min="2"
                max="20"
                value={grillBuffer}
                onChange={e => setGrillBuffer(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bakery Daily Par Buffer: +{bakeryBuffer}%
              </label>
              <input
                type="range"
                min="0"
                max="15"
                value={bakeryBuffer}
                onChange={e => setBakeryBuffer(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
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
              <p className="text-slate-500">Download complete restaurant state (menu, BOMs, sales, waste) as JSON.</p>
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
                Reloads verified 30-day sales history, 12 dishes, 20 ingredients, and resets all waste logs.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onResetToBenchmark}
              className="border-amber-300 text-amber-900 hover:bg-amber-100"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Benchmark Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
