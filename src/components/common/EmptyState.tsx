import { AlertCircle } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = '暂无数据',
  description = '创建内容后会显示在这里',
  icon,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        {icon ?? <AlertCircle className="w-8 h-8" />}
      </div>
      <p className="text-base font-semibold text-slate-600 mb-1">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}
