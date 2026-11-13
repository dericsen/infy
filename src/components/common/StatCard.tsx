import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
    isPositiveGood?: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'highlight' | 'warning' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = 'default'
}) => {
  const borderStyles = {
    default: 'border-slate-200',
    highlight: 'border-emerald-300',
    warning: 'border-amber-300',
    danger: 'border-rose-300'
  };

  const getTrendColor = () => {
    if (!change) return '';
    if (change.trend === 'neutral') return 'text-slate-600 bg-slate-100';
    const isGood = change.isPositiveGood !== undefined
      ? (change.trend === 'up' ? change.isPositiveGood : !change.isPositiveGood)
      : change.trend === 'up';
    return isGood ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50';
  };

  return (
    <div className={`bg-white border rounded-xl p-5 transition-colors hover:border-slate-300 ${borderStyles[variant]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-tabular-nums">
              {value}
            </span>
          </div>
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        {change ? (
          <div className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${getTrendColor()}`}>
            {change.trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {change.trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {change.trend === 'neutral' && <Minus className="w-3 h-3" />}
            <span>{change.value}</span>
          </div>
        ) : <span />}
        {subtitle && (
          <span className="text-slate-500 truncate">{subtitle}</span>
        )}
      </div>
    </div>
  );
};
