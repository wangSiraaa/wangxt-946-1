import { Clock, UserX, UserCheck } from 'lucide-react';
import type { Worker } from '@/types';

type AbnormalItem = {
  worker: Worker;
  type: 'late' | 'absent';
  signIn?: { sign_time: string };
  lateMinutes?: number;
};

interface Props {
  items: AbnormalItem[];
  meetingStartTime?: string;
}

function timeStr(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function AbnormalList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-green-300 bg-green-50/60 p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
          <UserCheck className="w-7 h-7 text-green-600" />
        </div>
        <p className="text-green-700 font-semibold">全员到岗，无异常情况</p>
        <p className="text-xs text-green-600/80 mt-1">所有工人已按时签到</p>
      </div>
    );
  }

  const late = items.filter((i) => i.type === 'late');
  const absent = items.filter((i) => i.type === 'absent');

  return (
    <div className="space-y-4">
      {absent.length > 0 && (
        <div className="rounded-xl border-2 border-red-400 bg-gradient-to-br from-red-50 to-red-100/70 p-4 animate-breathe">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200">
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
            <h4 className="text-red-700 font-bold flex-1">未签到人员</h4>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {absent.length} 人
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {absent.map((i, idx) => (
              <div
                key={i.worker.id}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-red-200 animate-slide-in"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-lg">
                  {i.worker.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-800 truncate">{i.worker.name}</p>
                  <p className="text-xs text-red-500">{i.worker.work_type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {late.length > 0 && (
        <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100/70 p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-amber-800 font-bold flex-1">迟到人员</h4>
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {late.length} 人
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {late.map((i, idx) => (
              <div
                key={i.worker.id}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-amber-200 animate-slide-in"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg">
                  {i.worker.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-900 truncate">{i.worker.name}</p>
                  <p className="text-xs text-amber-600">
                    {i.worker.work_type} · {timeStr(i.signIn?.sign_time)}
                  </p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded">
                  {i.lateMinutes} 分钟
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
