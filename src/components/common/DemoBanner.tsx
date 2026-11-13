import React from 'react';
import { Database, RotateCcw } from 'lucide-react';
import { BENCHMARK_METADATA } from '../../data/benchmarkData';
import { Button } from './Button';

interface DemoBannerProps {
  onResetBenchmark?: () => void;
  hasDemoRecords?: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  onResetBenchmark,
  hasDemoRecords = true
}) => {
  return (
    <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Database className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="font-semibold whitespace-nowrap">{BENCHMARK_METADATA.name}</span>
          <span aria-hidden="true" className="text-amber-500">·</span>
          <span className="text-amber-900">
            {hasDemoRecords
              ? 'Demonstration dataset active (30-day simulated history across 4 stations, 12 dishes, 20 ingredients)'
              : 'Live restaurant operational dataset active'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-amber-900 font-medium whitespace-nowrap">
          {hasDemoRecords ? 'Demo Mode' : 'Live Mode'}
        </span>
        {onResetBenchmark && (
          <Button
            size="sm"
            variant="outline"
            onClick={onResetBenchmark}
            className="!py-1 !text-xs border-amber-300 text-amber-950 hover:bg-amber-100 whitespace-nowrap shrink-0"
            leftIcon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Benchmark
          </Button>
        )}
      </div>
    </div>
  );
};
