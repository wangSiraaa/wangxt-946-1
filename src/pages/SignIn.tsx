import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Clock, Search, CheckCircle2, XCircle, AlertTriangle,
  ArrowLeft, ClipboardCheck, FileQuestion, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { useMeetingStore } from '@/stores/meeting';
import { useTeamStore } from '@/stores/team';
import { useSignInStore } from '@/stores/signIn';
import { useWorkFaceStore } from '@/stores/workFace';
import { useSettingsStore } from '@/stores/settings';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { formatTime } from '@/utils/date';
import type { Worker, SignIn } from '@/types';

type ToastType = 'success' | 'late' | 'makeup' | 'duplicate' | 'error';

interface Toast {
  type: ToastType;
  message: string;
  worker?: Worker;
}

type SignMode = 'normal' | 'makeup';

interface PendingAction {
  signInId: string;
  worker: Worker;
  signIn: SignIn;
}

export default function SignIn() {
  const navigate = useNavigate();
  const meetingData = useMeetingStore((s) => s.meetings);
  const getTodayMeeting = useMeetingStore((s) => s.getTodayMeeting);
  const createSignIn = useSignInStore((s) => s.createSignIn);
  const createMakeupSignIn = useSignInStore((s) => s.createMakeupSignIn);
  const reviewMakeupSignIn = useSignInStore((s) => s.reviewMakeupSignIn);
  const recordLateReason = useSignInStore((s) => s.recordLateReason);
  const hasSignedIn = useSignInStore((s) => s.hasSignedIn);
  const getSignInByWorker = useSignInStore((s) => s.getSignInByWorker);
  const getPendingReviewSignIns = useSignInStore((s) => s.getPendingReviewSignIns);
  const signInData = useSignInStore((s) => s.signIns);
  const settings = useSettingsStore((s) => s.settings);
  const workerList = useTeamStore((s) => s.workers);
  const teamData = useTeamStore((s) => s.teams);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);
  const getTeamById = useTeamStore((s) => s.getTeamById);
  const getWorkerById = useTeamStore((s) => s.getWorkerById);
  const workFaces = useWorkFaceStore((s) => s.workFaces);
  const getWorkFaceById = useWorkFaceStore((s) => s.getWorkFaceById);

  const meeting = useMemo(() => getTodayMeeting(), [getTodayMeeting, meetingData]);
  const threshold = settings.lateThreshold;

  const workers = useMemo(() => {
    if (!meeting) return [];
    const all: Worker[] = [];
    for (const tid of meeting.team_ids) {
      all.push(...getWorkersByTeam(tid));
    }
    const dedup = new Map<string, Worker>();
    for (const w of all) {
      dedup.set(w.id, w);
    }
    return Array.from(dedup.values());
  }, [meeting, getWorkersByTeam, workerList]);

  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [now, setNow] = useState(new Date());
  const [signMode, setSignMode] = useState<SignMode>('normal');
  const [selectingWorker, setSelectingWorker] = useState<Worker | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedWorkFaceId, setSelectedWorkFaceId] = useState<string>('');
  const [lateReason, setLateReason] = useState('');
  const [showWorkFaceDropdown, setShowWorkFaceDropdown] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [showPendingSection, setShowPendingSection] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (selectingWorker) {
      setSelectedTeamId(selectingWorker.team_id);
      setSelectedWorkFaceId('');
      setLateReason('');
    }
  }, [selectingWorker]);

  useEffect(() => {
    if (meeting && meeting.work_face_ids.length > 0 && !selectedWorkFaceId) {
      setSelectedWorkFaceId(meeting.work_face_ids[0]);
    }
  }, [meeting, selectedWorkFaceId]);

  const availableWorkFaces = useMemo(() => {
    if (!meeting) return workFaces;
    if (meeting.work_face_ids.length > 0) {
      return workFaces.filter((wf) => meeting.work_face_ids.includes(wf.id));
    }
    return workFaces;
  }, [meeting, workFaces]);

  const filtered = useMemo(() => workers.filter((w) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return w.name.toLowerCase().includes(q) || w.work_type.toLowerCase().includes(q);
  }), [workers, query]);

  const totalSigned = useMemo(
    () => workers.filter((w) => hasSignedIn(meeting?.id ?? '', w.id)).length,
    [workers, hasSignedIn, meeting, signInData],
  );

  const pendingReviews = useMemo(() => {
    if (!meeting) return [];
    return getPendingReviewSignIns(meeting.id);
  }, [meeting, getPendingReviewSignIns, signInData]);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const handleOpenSignIn = (worker: Worker) => {
    if (!meeting) return;
    if (hasSignedIn(meeting.id, worker.id)) {
      showToast({ type: 'duplicate', message: `${worker.name} 已经签到过了` });
      return;
    }
    setSelectingWorker(worker);
  };

  const handleConfirmSignIn = () => {
    if (!meeting || !selectingWorker) return;
    if (!selectedWorkFaceId) return;

    if (signMode === 'makeup') {
      if (!lateReason.trim()) return;
      const result = createMakeupSignIn(
        meeting.id, selectingWorker.id, selectedTeamId, selectedWorkFaceId, lateReason.trim(),
      );
      if (!result) {
        showToast({ type: 'error', message: '补签失败，请重试' });
        return;
      }
      showToast({
        type: 'makeup',
        message: `${selectingWorker.name} 补签已提交，等待安全员复核`,
        worker: selectingWorker,
      });
    } else {
      const result = createSignIn(meeting.id, selectingWorker.id, selectedTeamId, selectedWorkFaceId);
      if (!result) {
        showToast({ type: 'error', message: '签到失败，请重试' });
        return;
      }
      if (result.status === 'late') {
        recordLateReason(result.id, '迟到未填写原因');
        showToast({
          type: 'late',
          message: `${selectingWorker.name} 迟到 ${result.late_minutes} 分钟，已记入异常名单`,
          worker: selectingWorker,
        });
      } else {
        showToast({ type: 'success', message: `${selectingWorker.name} 签到成功`, worker: selectingWorker });
      }
    }

    setSelectingWorker(null);
  };

  const handleReview = (signIn: SignIn, approved: boolean) => {
    const worker = getWorkerById(signIn.worker_id);
    setPendingAction({ signInId: signIn.id, worker: worker ?? { id: signIn.worker_id, team_id: signIn.team_id, name: '未知', work_type: '', id_card: '', phone: '', avatar: '👤' }, signIn });
    setReviewNote('');
    if (approved) {
      reviewMakeupSignIn(signIn.id, true, '安全员', reviewNote || undefined);
      showToast({ type: 'success', message: `已通过 ${worker?.name ?? '工人'} 的补签申请` });
      setPendingAction(null);
    }
  };

  const handleRejectConfirm = () => {
    if (!pendingAction) return;
    reviewMakeupSignIn(pendingAction.signInId, false, '安全员', reviewNote || undefined);
    showToast({ type: 'error', message: `已驳回 ${pendingAction.worker.name} 的补签申请` });
    setPendingAction(null);
  };

  const workerTeamName = useMemo(() => {
    if (!selectingWorker) return '';
    const team = getTeamById(selectingWorker.team_id);
    return team?.name ?? '';
  }, [selectingWorker, getTeamById, teamData]);

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

  const start = new Date(meeting.start_time);
  const cutoff = new Date(start.getTime() + threshold * 60000);
  const isCurrentlyLate = now > cutoff;

  const reviewStatusLabel = (rs: SignIn['review_status']) => {
    switch (rs) {
      case 'pending': return { label: '待复核', cls: 'bg-orange-100 text-orange-700 border-orange-300' };
      case 'approved': return { label: '已通过', cls: 'bg-green-100 text-green-700 border-green-300' };
      case 'rejected': return { label: '已驳回', cls: 'bg-red-100 text-red-700 border-red-300' };
      default: return { label: '', cls: '' };
    }
  };

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
              : toast.type === 'makeup'
              ? 'bg-orange-500 text-white'
              : toast.type === 'duplicate'
              ? 'bg-slate-700 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-6 h-6 animate-check" />}
            {toast.type === 'late' && <Clock className="w-6 h-6" />}
            {toast.type === 'makeup' && <FileQuestion className="w-6 h-6" />}
            {toast.type === 'duplicate' && <XCircle className="w-6 h-6" />}
            {toast.type === 'error' && <XCircle className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            {toast.worker && <div className="text-xl font-bold">{toast.worker.avatar} {toast.worker.name}</div>}
            <p className="text-sm opacity-95">{toast.message}</p>
          </div>
        </div>
      )}

      {pendingReviews.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPendingSection((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 bg-orange-50 border-b border-orange-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-orange-800">待复核补签</p>
                <p className="text-xs text-orange-600">{pendingReviews.length} 人等待安全员复核，未复核不可上岗</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold">
                {pendingReviews.length}
              </span>
              <ChevronDown className={`w-5 h-5 text-orange-500 transition-transform ${showPendingSection ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showPendingSection && (
            <div className="p-5 space-y-3">
              {pendingReviews.map((si) => {
                const w = getWorkerById(si.worker_id);
                const team = getTeamById(si.team_id);
                const wf = getWorkFaceById(si.work_face_id);
                return (
                  <div key={si.id} className="flex items-start gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-200">
                    <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center text-2xl shrink-0">
                      {w?.avatar ?? '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800">{w?.name ?? '未知'}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#1E3A5F]/10 text-[#1E3A5F]">{w?.work_type}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{team?.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{wf?.name ?? '未选择'}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        补签时间：{formatTime(new Date(si.sign_time))} · 迟到 {si.late_minutes} 分钟
                      </p>
                      {si.late_reason && (
                        <p className="text-xs text-orange-700 mt-1 bg-orange-100 px-2 py-1 rounded">
                          迟到原因：{si.late_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReview(si, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />通过
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction({
                            signInId: si.id,
                            worker: w ?? { id: si.worker_id, team_id: si.team_id, name: '未知', work_type: '', id_card: '', phone: '', avatar: '👤' },
                            signIn: si,
                          });
                          setReviewNote('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition"
                      >
                        <XCircle className="w-4 h-4" />驳回
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setSignMode('normal')}
              className={`px-4 py-2 text-sm font-bold transition ${
                signMode === 'normal'
                  ? 'bg-[#F59E0B] text-[#1E3A5F]'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 inline mr-1" />
              正常签到
            </button>
            <button
              type="button"
              onClick={() => setSignMode('makeup')}
              className={`px-4 py-2 text-sm font-bold transition ${
                signMode === 'makeup'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileQuestion className="w-4 h-4 inline mr-1" />
              补签
            </button>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />返回
          </button>
        </div>

        {signMode === 'makeup' && (
          <div className="mb-5 p-4 rounded-xl bg-orange-50 border border-orange-200">
            <p className="text-sm text-orange-800 font-semibold flex items-center gap-2">
              <FileQuestion className="w-4 h-4" />
              补签模式说明
            </p>
            <p className="text-xs text-orange-700 mt-1">
              补签需填写迟到原因，签到后状态为「待复核」，需安全员审核通过后方可上岗。
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState title="没有匹配的工人" description="换个关键词试试" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((w, idx) => {
              const signed = hasSignedIn(meeting.id, w.id);
              const rec = getSignInByWorker(meeting.id, w.id);
              const team = getTeamById(w.team_id);
              const wf = rec ? getWorkFaceById(rec.work_face_id) : null;
              const rs = rec?.is_makeup ? reviewStatusLabel(rec.review_status) : null;
              const blocked = rec?.is_makeup && rec.review_status === 'pending';

              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleOpenSignIn(w)}
                  disabled={signed}
                  className={`text-left p-4 rounded-xl border-2 transition-all animate-slide-in ${
                    signed
                      ? blocked
                        ? 'border-orange-300 bg-orange-50 cursor-default'
                        : rec?.status === 'late'
                          ? 'border-amber-300 bg-amber-50 cursor-default'
                          : 'border-green-300 bg-green-50 cursor-default'
                      : 'border-slate-200 bg-white hover:border-[#F59E0B] hover:bg-[#F59E0B]/5 hover:shadow-md active:scale-[0.99] cursor-pointer'
                  }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${
                      signed
                        ? blocked ? 'bg-orange-200' : (rec?.status === 'late' ? 'bg-amber-200' : 'bg-green-200')
                        : 'bg-slate-100'
                    }`}>
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
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#1E3A5F]/10 text-[#1E3A5F]">{w.work_type}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{team?.name}</span>
                        {signed && wf && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{wf.name}</span>
                        )}
                        {signed && rec && (
                          <span className="font-mono-num text-slate-600 text-xs">{formatTime(new Date(rec.sign_time))}</span>
                        )}
                      </div>
                      {signed && rec?.status === 'late' && (
                        <p className="text-xs text-red-600 font-semibold mt-1">⚠ 迟到 {rec.late_minutes} 分钟</p>
                      )}
                      {signed && rec?.is_makeup && rs && rs.label && (
                        <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-semibold border ${rs.cls}`}>
                          补签·{rs.label}
                        </span>
                      )}
                      {blocked && (
                        <p className="text-xs text-orange-600 font-semibold mt-1">🔒 待复核，暂不可上岗</p>
                      )}
                      {signed && rec?.late_reason && (
                        <p className="text-xs text-slate-500 mt-1 truncate">原因：{rec.late_reason}</p>
                      )}
                      {!signed && (
                        <p className="text-xs text-[#F59E0B] font-semibold mt-1">
                          点击{signMode === 'makeup' ? '补签' : '签到'} →
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectingWorker && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in overflow-hidden">
            <div className={`px-6 py-4 ${signMode === 'makeup' ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-[#059669] to-[#10B981]'}`}>
              <h3 className="text-lg font-bold text-white">
                {signMode === 'makeup' ? '📝 补签登记' : '✅ 签到确认'}
              </h3>
              <p className="text-white/80 text-sm mt-0.5">{selectingWorker.name} · {selectingWorker.work_type}</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">班组</label>
                <div className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800">
                  {workerTeamName || '未分配班组'}
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  作业面 <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowWorkFaceDropdown((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-left hover:border-[#F59E0B] transition"
                >
                  <span className={selectedWorkFaceId ? 'text-slate-800' : 'text-slate-400'}>
                    {selectedWorkFaceId
                      ? (getWorkFaceById(selectedWorkFaceId)?.name ?? '请选择作业面')
                      : '请选择作业面'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showWorkFaceDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showWorkFaceDropdown && availableWorkFaces.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {availableWorkFaces.map((wf) => (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => {
                          setSelectedWorkFaceId(wf.id);
                          setShowWorkFaceDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-[#F59E0B]/10 transition ${
                          selectedWorkFaceId === wf.id ? 'bg-[#F59E0B]/10 font-bold text-[#D97706]' : 'text-slate-700'
                        }`}
                      >
                        <span className="font-semibold">{wf.name}</span>
                        <span className="text-xs text-slate-500 ml-2">{wf.location}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {signMode === 'makeup' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    迟到原因 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                    placeholder="请填写迟到原因（必填）"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
              )}

              {signMode === 'normal' && isCurrentlyLate && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    迟到原因（选填）
                  </label>
                  <textarea
                    value={lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                    placeholder="当前已超过签到截止时间，可填写迟到原因"
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectingWorker(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSignIn}
                  disabled={!selectedWorkFaceId || (signMode === 'makeup' && !lateReason.trim())}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    signMode === 'makeup'
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-[#F59E0B] hover:bg-[#D97706]'
                  }`}
                >
                  确认{signMode === 'makeup' ? '补签' : '签到'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-400">
              <h3 className="text-lg font-bold text-white">❌ 驳回补签</h3>
              <p className="text-white/80 text-sm mt-0.5">{pendingAction.worker.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">驳回原因（选填）</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="填写驳回原因..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition"
                >
                  确认驳回
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
