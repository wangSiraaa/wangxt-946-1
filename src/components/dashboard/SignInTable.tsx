import { Users, UserCheck, UserX, AlertTriangle, ShieldCheck, ClipboardCheck } from 'lucide-react';
import type { SignIn, Worker, WorkStatus, Meeting } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Props {
  workers: Worker[];
  signIns: SignIn[];
  workStatuses: WorkStatus[];
  meeting?: Meeting;
}

function timeStr(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function SignInTable({ workers, signIns, workStatuses, meeting }: Props) {
  if (workers.length === 0) {
    return (
      <div className="py-14 text-center text-slate-400">
        <Users className="w-14 h-14 mx-auto mb-3 opacity-40" />
        <p className="text-sm">暂无工人，请先到"班组管理"添加工人</p>
      </div>
    );
  }

  const rows = workers.map((w, idx) => {
    const si = signIns.find((s) => s.worker_id === w.id);
    const ws = workStatuses.find((s) => s.worker_id === w.id);
    return { worker: w, signIn: si, workStatus: ws, idx };
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1E3A5F] text-white">
            <th className="px-4 py-3 text-left font-semibold w-12">#</th>
            <th className="px-4 py-3 text-left font-semibold">工人</th>
            <th className="px-4 py-3 text-left font-semibold">工种</th>
            <th className="px-4 py-3 text-left font-semibold">签到时间</th>
            <th className="px-4 py-3 text-left font-semibold">签到状态</th>
            <th className="px-4 py-3 text-left font-semibold">迟到</th>
            <th className="px-4 py-3 text-left font-semibold">上岗状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ worker, signIn, workStatus, idx }) => {
            const signStatus = signIn?.status ?? 'absent';
            const highlight = signStatus !== 'normal';
            return (
              <tr
                key={worker.id}
                className={`animate-slide-in border-t border-slate-100 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                } ${highlight ? 'bg-amber-50/40' : ''} hover:bg-[#F59E0B]/10 transition-colors`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <td className="px-4 py-3 text-slate-400 font-mono-num">{String(idx + 1).padStart(2, '0')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                      {worker.avatar}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{worker.name}</p>
                      <p className="text-xs text-slate-400">{worker.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-medium">
                    {worker.work_type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono-num text-slate-600">{timeStr(signIn?.sign_time)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={signStatus} type="signin" />
                </td>
                <td className="px-4 py-3">
                  {signIn && signStatus === 'late' ? (
                    <span className="text-red-600 font-bold text-xs">{signIn.late_minutes} 分钟</span>
                  ) : signStatus === 'absent' ? (
                    <span className="text-red-500 text-xs flex items-center gap-1">
                      <UserX className="w-3 h-3" /> 未到
                    </span>
                  ) : (
                    <span className="text-green-600 text-xs flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> 准点
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {workStatus ? (
                    <StatusBadge status={workStatus.status} type="work" />
                  ) : meeting?.status === 'ended' ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <ClipboardCheck className="w-3 h-3" /> 未标记
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> 待上岗
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
