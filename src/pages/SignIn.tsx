import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, Clock, Search, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useMeetingStore } from '@/stores/meeting';
import { useTeamStore } from '@/stores/team';
import { useSignInStore } from '@/stores/signIn';
import { useSettingsStore } from '@/stores/settings';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { formatTime } from '@/utils/date';
import type { Worker } from '@/types';

type ToastType = 'success' | 'late' | 'duplicate' | 'error';

interface Toast {
  type: ToastType;
  message: string;
  worker?: Worker;
}

export default function SignIn() {
  const navigate = useNavigate();
  const meetingData = useMeetingStore((s) => s.meetings);
  const getTodayMeeting = useMeetingStore((s) => s.getTodayMeeting);
  const createSignIn = useSignInStore((s) => s.createSignIn);
  const hasSignedIn = useSignInStore((s) => s.hasSignedIn);
  const getSignInByWorker = useSignInStore((s) => s.getSignInByWorker);
  const signInData = useSignInStore((s) => s.signIns);
  const settings = useSettingsStore((s) => s.settings);
  const workerList = useTeamStore((s) => s.workers);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);

  const meeting = useMemo(() => getTodayMeeting(), [getTodayMeeting, meetingData]);
  const threshold = settings.lateThreshold;
  const workers = useMemo(
    () => (meeting ? getWorkersByTeam(meeting.team_id) : []),
    [meeting, getWorkersByTeam, workerList],
  );

  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => workers.filter((w) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return w.name.toLowerCase().includes(q) || w.work_type.toLowerCase().includes(q);
  }), [workers, query]);

  const totalSigned = useMemo(
    () => workers.filter((w) => hasSignedIn(meeting?.id ?? '', w.id)).length,
    [workers, hasSignedIn, meeting, signInData],
  );

  const handleSignIn = (worker: Worker) => {
    if (!meeting) return;
    if (hasSignedIn(meeting.id, worker.id)) {
      setToast({ type: 'duplicate', message: `${worker.name} 已经签到过了` });
      setTimeout(() => setToast(null), 1800);
      return;
    }
    const result = createSignIn(meeting.id, worker.id);
    if (!result) {
      setToast({ type: 'error', message: '签到失败，请重试' });
      setTimeout(() => setToast(null), 1800);
      return;
    }
    if (result.status === 'late') {
      setToast({ type: 'late', message: `${worker.name} 迟到 ${result.late_minutes} 分钟，已记入异常名单`, worker });
    } else {
      setToast({ type: 'success', message: `${worker.name} 签到成功`, worker });
    }
    setTimeout(() => setToast(null), 2200);
  };

  if (!meeting) {
    return (
      <div className="max-w-3xl mx-auto animate-slide-in">
        <div className="bg-white rounded-2xl shadow-md p-10">
          <EmptyState
            icon={<AlertTriangle className="w-10 h-10 text-amber-500" />}
            title="今日尚无晨会"
            description="请班组长先创建晨会，工人才能签到"
          />
          <div className="flex justify-center mt-6">
            <button
              onClick={() => navigate('/meeting/create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#1E3A5F] font-bold rounded-lg shadow-md transition-all"
            >
              前往创建晨会
            </button>
          </div>
        </div>
      </div>
    );
  }

  const start = useMemo(() => new Date(meeting.start_time), [meeting]);
  const cutoff = useMemo(() => new Date(start.getTime() + threshold * 60000), [start, threshold]);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] rounded-2xl shadow-xl text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-20 bottom-[-40px] w-32 h-32 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">工人晨会签到</h2>
              <p className="text-green-100 text-sm mt-1">{meeting.title}</p>
              <p className="text-xs text-green-200 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                晨会 {formatTime(start)} 开始 · {threshold} 分钟后算迟到（截止 {formatTime(cutoff)}）
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-mono-num font-bold tracking-wider">{formatTime(now)}</div>
            <div className="text-green-100 text-sm mt-1">
              已签到 <span className="font-bold text-white">{totalSigned}</span> / {workers.length}
            </div>
            <div className="mt-2 h-2 w-48 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${workers.length > 0 ? (totalSigned / workers.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-xl shadow-2xl p-4 flex items-center gap-3 max-w-sm animate-slide-in ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : toast.type === 'late'
              ? 'bg-amber-500 text-white'
              : toast.type === 'duplicate'
              ? 'bg-slate-700 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-6 h-6 animate-check" />}
            {toast.type === 'late' && <Clock className="w-6 h-6" />}
            {toast.type === 'duplicate' && <XCircle className="w-6 h-6" />}
            {toast.type === 'error' && <XCircle className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            {toast.worker && <div className="text-xl font-bold">{toast.worker.avatar} {toast.worker.name}</div>}
            <p className="text-sm opacity-95">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md p-5">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索工人姓名或工种..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
            />
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />返回
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="没有匹配的工人" description="换个关键词试试" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((w, idx) => {
              const signed = hasSignedIn(meeting.id, w.id);
              const rec = getSignInByWorker(meeting.id, w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleSignIn(w)}
                  disabled={signed}
                  className={`text-left p-4 rounded-xl border-2 transition-all animate-slide-in ${
                    signed
                      ? rec?.status === 'late'
                        ? 'border-amber-300 bg-amber-50 cursor-default'
                        : 'border-green-300 bg-green-50 cursor-default'
                      : 'border-slate-200 bg-white hover:border-[#F59E0B] hover:bg-[#F59E0B]/5 hover:shadow-md active:scale-[0.99] cursor-pointer'
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${signed ? (rec?.status === 'late' ? 'bg-amber-200' : 'bg-green-200') : 'bg-slate-100'}`}>
                      {w.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">{w.name}</p>
                        {signed ? (
                          <StatusBadge status={rec!.status} type="signin" />
                        ) : (
                          <UserPlus className="w-5 h-5 text-[#F59E0B]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-[#1E3A5F]/10 text-[#1E3A5F]">{w.work_type}</span>
                        {signed && rec && (
                          <span className="font-mono-num text-slate-600">{formatTime(new Date(rec.sign_time))}</span>
                        )}
                      </p>
                      {signed && rec?.status === 'late' && (
                        <p className="text-xs text-red-600 font-semibold mt-1">⚠ 迟到 {rec.late_minutes} 分钟</p>
                      )}
                      {!signed && (
                        <p className="text-xs text-[#F59E0B] font-semibold mt-1">点击签到 →</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
