import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: number;
  total?: number;
  icon: LucideIcon;
  from: string;
  to: string;
  textColor?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, total, icon: Icon, from, to, textColor, highlight }: Props) {
  const display = useAnimatedNumber(value);
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${
        highlight ? 'ring-2 ring-red-400/60 animate-breathe' : ''
      }`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      <div className="absolute -right-6 -top-6 opacity-20">
        <Icon className="w-32 h-32 text-white" />
      </div>
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/85 text-sm font-medium">{label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-4xl font-bold font-mono-num ${textColor ?? 'text-white'}`}>
                {display}
              </span>
              {typeof total === 'number' && total > 0 && (
                <span className="text-white/80 text-sm">/ {total}</span>
              )}
            </div>
            {typeof total === 'number' && total > 0 && value !== total && (
              <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (value / total) * 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
