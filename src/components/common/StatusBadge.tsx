import type { SignInStatus, SignInReviewStatus, HazardLevel, HazardStatus, HazardReviewStatus, WorkStatusState } from '@/types';

interface Props {
  status: SignInStatus | SignInReviewStatus | HazardLevel | HazardStatus | HazardReviewStatus | WorkStatusState | string;
  type?: 'signin' | 'signin-review' | 'hazard-level' | 'hazard-status' | 'hazard-review' | 'work';
}

const MAP: Record<string, Record<string, { label: string; cls: string }>> = {
  signin: {
    normal: { label: '正常签到', cls: 'bg-green-100 text-green-700 border-green-300' },
    late: { label: '迟到', cls: 'bg-amber-100 text-amber-700 border-amber-400' },
    absent: { label: '未签到', cls: 'bg-red-100 text-red-700 border-red-300' },
  },
  'signin-review': {
    pending: { label: '待复核', cls: 'bg-amber-100 text-amber-700 border-amber-400' },
    approved: { label: '已通过', cls: 'bg-green-100 text-green-700 border-green-300' },
    rejected: { label: '已驳回', cls: 'bg-red-100 text-red-700 border-red-300' },
    not_required: { label: '无需复核', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  },
  'hazard-level': {
    low: { label: '低', cls: 'bg-sky-100 text-sky-700 border-sky-300' },
    medium: { label: '中', cls: 'bg-amber-100 text-amber-700 border-amber-400' },
    high: { label: '高', cls: 'bg-red-100 text-red-700 border-red-300' },
  },
  'hazard-status': {
    pending: { label: '待整改', cls: 'bg-red-100 text-red-700 border-red-300' },
    rectifying: { label: '整改中', cls: 'bg-amber-100 text-amber-700 border-amber-400' },
    resolved: { label: '已整改', cls: 'bg-green-100 text-green-700 border-green-300' },
  },
  'hazard-review': {
    pending: { label: '待复核', cls: 'bg-amber-100 text-amber-700 border-amber-400' },
    passed: { label: '复核通过', cls: 'bg-green-100 text-green-700 border-green-300' },
    failed: { label: '复核不通过', cls: 'bg-red-100 text-red-700 border-red-300' },
  },
  work: {
    on_duty: { label: '已上岗', cls: 'bg-green-100 text-green-700 border-green-300' },
    off_duty: { label: '未上岗', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
    forbidden: { label: '禁止上岗', cls: 'bg-red-100 text-red-700 border-red-300' },
    unknown: { label: '未标记', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  },
};

export function StatusBadge({ status, type = 'signin' }: Props) {
  const info = MAP[type]?.[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${info.cls}`}
    >
      {info.label}
    </span>
  );
}
