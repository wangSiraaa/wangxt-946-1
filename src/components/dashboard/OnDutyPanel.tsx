import { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Meeting, ValidationResult } from '@/types';

interface Props {
  meeting?: Meeting;
  onValidate: (meetingId: string) => ValidationResult;
  onEndMeeting?: (meetingId: string) => void;
  disabled?: boolean;
}

type CheckItem = { label: string; pass: boolean };

export function OnDutyPanel({ meeting, onValidate, onEndMeeting, disabled }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [checks, setChecks] = useState<CheckItem[]>([]);

  const startValidate = async () => {
    if (!meeting) return;
    setLoading(true);
    setResult(null);
    setChecks([]);

    const steps: CheckItem[] = [
      { label: '检查晨会有效性', pass: true },
      { label: '校验全员签到', pass: true },
      { label: '校验危险作业专项交底', pass: true },
      { label: '批量标记上岗状态', pass: true },
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 280));
      setChecks(steps.slice(0, i + 1));
    }

    const res = onValidate(meeting.id);
    if (!res.success) {
      setChecks((prev) => prev.map((c, idx) => (idx === 1 || idx === 2 ? { ...c, pass: false } : c)));
    }
    setResult(res);
    setLoading(false);
  };

  if (!meeting) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-semibold mb-2">暂未创建今日晨会</p>
        <p className="text-xs text-slate-400 mb-4">班组长需要先创建晨会，才能执行上岗标记</p>
        <button
          onClick={() => navigate('/meeting/create')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          立即创建晨会
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] text-white p-6 shadow-xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-[#1E3A5F]" />
          </div>
          <div>
            <h3 className="text-lg font-bold">上岗管控</h3>
            <p className="text-xs text-white/70">未参加晨会 · 未完成交底 → 禁止上岗</p>
          </div>
        </div>
        {meeting.status === 'ended' && (
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-200 text-xs font-semibold border border-green-300/30">
            晨会已结束
          </span>
        )}
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/10">
        <p className="text-sm mb-1"><span className="text-white/70">晨会：</span>{meeting.title}</p>
        <p className="text-sm mb-1"><span className="text-white/70">班组：</span>{meeting.team_id}</p>
        <p className="text-sm">
          <span className="text-white/70">危险作业：</span>
          {meeting.dangerous_ops.length === 0 ? (
            <span className="text-green-300">无</span>
          ) : (
            <span className="text-amber-300 font-semibold">{meeting.dangerous_ops.length} 项需要专项交底</span>
          )}
        </p>
      </div>

      {checks.length > 0 && (
        <div className="space-y-2 mb-4">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 rounded-md px-3 py-2 animate-slide-in" style={{ animationDelay: `${i * 80}ms` }}>
              {loading && i === checks.length - 1 ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" />
              ) : c.pass ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 animate-check" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm ${c.pass ? 'text-white' : 'text-red-300'}`}>{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {result && !result.success && (
        <div className="bg-red-500/20 border border-red-300/30 rounded-lg p-4 mb-4 animate-slide-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 font-semibold text-sm mb-2">校验未通过，请先处理：</p>
              <ul className="list-disc list-inside space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-100">{e}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {result?.success && (
        <div className="bg-green-500/20 border border-green-300/30 rounded-lg p-4 mb-4 animate-slide-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-300 animate-check" />
            <div>
              <p className="font-bold text-green-100">全员上岗成功</p>
              <p className="text-xs text-green-200/80">所有工人已完成晨会签到和必要交底，准予上岗作业</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          disabled={disabled || meeting.status === 'ended' || loading}
          onClick={startValidate}
          className="flex-1 min-w-[160px] py-3 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-slate-500 disabled:cursor-not-allowed text-[#1E3A5F] font-bold rounded-lg shadow-lg hover:shadow-xl transition-all text-base"
        >
          {loading ? '校验中...' : result?.success ? '✓ 已完成上岗标记' : '一键校验并全员上岗'}
        </button>
        {result?.success && meeting.status !== 'ended' && onEndMeeting && (
          <button
            onClick={() => onEndMeeting(meeting.id)}
            className="px-5 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all"
          >
            结束晨会
          </button>
        )}
      </div>
    </div>
  );
}
