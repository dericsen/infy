import React from 'react';
import { Database, Info, RotateCcw } from 'lucide-react';
import { BENCHMARK_METADATA } from '../../data/benchmarkData';
import { Button } from './Button';

interface DemoBannerProps {
  onResetBenchmark?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onResetBenchmark }) => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="p-1 rounded bg-amber-100 text-amber-800">
          <Database className="w-3.5 h-3.5" />
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">{BENCHMARK_METADATA.name}</span>
          <span className="text-amber-700">({BENCHMARK_METADATA.version})</span>
          <span className="hidden sm:inline text-amber-400">•</span>
          <span className="text-amber-800 hidden sm:inline">
            Demonstration mode: 30-day simulated history across 4 stations, 12 dishes, 20 ingredients.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Demo Data Active</span>
        </span>
        {onResetBenchmark && (
          <Button
            size="sm"
            variant="outline"
            onClick={onResetBenchmark}
            className="!py-1 !text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Benchmark Data
          </Button>
        )}
      </div>
    </div>
  );
};
