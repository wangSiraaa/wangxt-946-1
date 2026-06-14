import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, Trash2, ArrowLeft, CheckCircle2, Stamp, UserCheck, FileText, Link2, Unlink, MapPin } from 'lucide-react';
import { useMeetingStore } from '@/stores/meeting';
import { useTeamStore } from '@/stores/team';
import { useBriefingStore } from '@/stores/briefing';
import { useHazardStore } from '@/stores/hazard';
import { useWorkFaceStore } from '@/stores/workFace';
import { EmptyState } from '@/components/common/EmptyState';
import { DANGEROUS_OPS, type Briefing } from '@/types';
import { briefingTemplates } from '@/utils/mockData';
import { formatTime } from '@/utils/date';

const OPS_MAP: Record<string, { label: string; icon: any }> = DANGEROUS_OPS.reduce(
  (acc, o) => ({ ...acc, [o.key]: o }),
  {} as any,
);

export default function BriefingPage() {
  const navigate = useNavigate();
  const meetingData = useMeetingStore((s) => s.meetings);
  const getTodayMeeting = useMeetingStore((s) => s.getTodayMeeting);
  const briefingData = useBriefingStore((s) => s.briefings);
  const getBriefingsByMeeting = useBriefingStore((s) => s.getBriefingsByMeeting);
  const add = useBriefingStore((s) => s.addBriefing);
  const remove = useBriefingStore((s) => s.deleteBriefing);
  const confirm = useBriefingStore((s) => s.confirmBriefing);
  const unconfirm = useBriefingStore((s) => s.unconfirmBriefing);
  const hasConfirmed = useBriefingStore((s) => s.hasConfirmed);
  const getConfirmedWorkers = useBriefingStore((s) => s.getConfirmedWorkers);
  const bindHazard = useBriefingStore((s) => s.bindHazard);
  const unbindHazard = useBriefingStore((s) => s.unbindHazard);
  const allHazards = useHazardStore((s) => s.hazards);
  const getHazardsByMeeting = useHazardStore((s) => s.getHazardsByMeeting);
  const hazardBindBriefing = useHazardStore((s) => s.bindBriefing);
  const workerData = useTeamStore((s) => s.workers);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);
  const workFaces = useWorkFaceStore((s) => s.workFaces);

  const meeting = useMemo(() => getTodayMeeting(), [getTodayMeeting, meetingData]);
  const list = useMemo(() => (meeting ? getBriefingsByMeeting(meeting.id) : []), [meeting, getBriefingsByMeeting, briefingData]);
  const workers = useMemo(() => {
    if (!meeting) return [];
    return meeting.team_ids.flatMap((tid) => getWorkersByTeam(tid));
  }, [meeting, getWorkersByTeam, workerData]);

  const meetingHazards = useMemo(
    () => (meeting ? getHazardsByMeeting(meeting.id) : []),
    [meeting, getHazardsByMeeting, allHazards],
  );

  const [showForm, setShowForm] = useState(false);
  const [opType, setOpType] = useState('');
  const [briefer, setBriefer] = useState('');
  const [content, setContent] = useState('');
  const [selectedWorkFaceIds, setSelectedWorkFaceIds] = useState<string[]>([]);

  const requiredOps = meeting?.dangerous_ops ?? [];
  const doneOps = list.map((b) => b.op_type);
  const missingOps = requiredOps.filter((o) => !doneOps.includes(o));

  const fillTemplate = (key: string) => {
    setOpType(key);
    setContent(briefingTemplates[key] ?? '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting || !opType || !briefer.trim() || !content.trim()) return;
    add({
      meeting_id: meeting.id,
      op_type: opType,
      briefer: briefer.trim(),
      content: content.trim(),
      work_face_ids: selectedWorkFaceIds.length > 0 ? selectedWorkFaceIds : undefined,
    });
    setShowForm(false);
    setOpType('');
    setBriefer('');
    setContent('');
    setSelectedWorkFaceIds([]);
  };

  const toggleWorker = (briefingId: string, workerId: string) => {
    if (hasConfirmed(briefingId, workerId)) unconfirm(briefingId, workerId);
    else confirm(briefingId, workerId);
  };

  const handleBindHazard = (briefingId: string, hazardId: string) => {
    bindHazard(briefingId, hazardId);
    hazardBindBriefing(hazardId, briefingId);
  };

  const handleUnbindHazard = (briefingId: string, hazardId: string) => {
    unbindHazard(briefingId, hazardId);
  };

  const allCompleted = useMemo(() => {
    if (!meeting) return false;
    return missingOps.length === 0 && list.every((b) => getConfirmedWorkers(b.id).length === workers.length);
  }, [meeting, missingOps, list, workers, getConfirmedWorkers]);

  return (
    <div className="space-y-6 animate-slide-in max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] rounded-2xl shadow-xl text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">专项安全技术交底</h2>
              <p className="text-purple-100 text-sm mt-1">危险作业必须逐项交底、全员签字后方可上岗</p>
              {meeting && <p className="text-xs text-purple-200 mt-1">关联晨会：{meeting.title}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {allCompleted && meeting && requiredOps.length > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-bold inline-flex items-center gap-1.5 animate-check">
                <CheckCircle2 className="w-4 h-4" /> 全部完成
              </span>
            )}
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur text-sm font-semibold inline-flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />返回
            </button>
            <button
              onClick={() => setShowForm(true)}
              disabled={!meeting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-purple-50 text-purple-600 font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />新建交底
            </button>
          </div>
        </div>
      </div>

      {!meeting && (
        <div className="bg-white rounded-2xl shadow-md p-10">
          <EmptyState icon={<ShieldCheck className="w-10 h-10 text-purple-300" />} title="今日尚无晨会" description="晨会勾选危险作业后，到此处完成专项交底" />
        </div>
      )}

      {meeting && requiredOps.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
          <p className="text-sm text-purple-800 font-semibold mb-2">本次晨会勾选危险作业 {requiredOps.length} 项：</p>
          <div className="flex flex-wrap gap-2">
            {requiredOps.map((k) => {
              const done = doneOps.includes(k);
              const label = OPS_MAP[k]?.label ?? k;
              return (
                <span
                  key={k}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 ${
                    done ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  {label}
                  {done ? ' 已交底' : missingOps.includes(k) ? ' 待完成' : ''}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-purple-200 animate-slide-in">
          <h3 className="font-bold text-lg mb-4">新建专项交底</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">作业类型</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(meeting ? requiredOps.length > 0 ? requiredOps : DANGEROUS_OPS.map((o) => o.key) : DANGEROUS_OPS.map((o) => o.key)).map((k) => {
                  const label = OPS_MAP[k]?.label ?? k;
                  const active = opType === k;
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => fillTemplate(k)}
                      className={`p-3 rounded-lg border-2 text-left transition ${
                        active ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/40'
                      }`}
                    >
                      <p className={`font-semibold ${active ? 'text-purple-700' : 'text-slate-700'}`}>{label}</p>
                      {briefingTemplates[k] && <p className="text-xs text-slate-500 mt-0.5">带模板内容</p>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">交底人（安全员）</label>
              <input
                required
                type="text"
                value={briefer}
                onChange={(e) => setBriefer(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="请输入交底人姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <MapPin className="w-4 h-4 inline mr-1" />
                关联作业面
              </label>
              <div className="flex flex-wrap gap-2">
                {workFaces.map((wf) => {
                  const active = selectedWorkFaceIds.includes(wf.id);
                  return (
                    <button
                      type="button"
                      key={wf.id}
                      onClick={() =>
                        setSelectedWorkFaceIds((prev) =>
                          active ? prev.filter((id) => id !== wf.id) : [...prev, wf.id],
                        )
                      }
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-semibold transition ${
                        active
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-slate-200 text-slate-600 hover:border-purple-300'
                      }`}
                    >
                      {wf.name}
                      {wf.location && <span className="ml-1 text-xs text-slate-400">({wf.location})</span>}
                    </button>
                  );
                })}
                {workFaces.length === 0 && (
                  <p className="text-sm text-slate-400">暂无作业面数据</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">交底内容</label>
              <textarea
                required
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono text-sm resize-none whitespace-pre-wrap"
                placeholder="逐项列明作业要求、防护措施、应急处置..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setSelectedWorkFaceIds([]); }} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">取消</button>
              <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-all">
                <FileText className="w-5 h-5" />提交交底
              </button>
            </div>
          </form>
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-10">
          <EmptyState icon={<ShieldCheck className="w-10 h-10 text-purple-300" />} title="暂无交底记录" description={requiredOps.length > 0 ? '请先完成危险作业对应的专项交底' : '未勾选危险作业，可按需添加交底'} />
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((b, idx) => (
            <BriefingCard
              key={b.id}
              briefing={b}
              workers={workers}
              index={idx}
              hasConfirmed={hasConfirmed}
              getConfirmed={getConfirmedWorkers}
              onToggle={toggleWorker}
              onRemove={() => remove(b.id)}
              onBindHazard={handleBindHazard}
              onUnbindHazard={handleUnbindHazard}
              meetingHazards={meetingHazards}
              workFaces={workFaces}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingCard({
  briefing,
  workers,
  index,
  hasConfirmed,
  getConfirmed,
  onToggle,
  onRemove,
  onBindHazard,
  onUnbindHazard,
  meetingHazards,
  workFaces,
}: {
  briefing: Briefing;
  workers: any[];
  index: number;
  hasConfirmed: (bid: string, wid: string) => boolean;
  getConfirmed: (bid: string) => any[];
  onToggle: (bid: string, wid: string) => void;
  onRemove: () => void;
  onBindHazard: (briefingId: string, hazardId: string) => void;
  onUnbindHazard: (briefingId: string, hazardId: string) => void;
  meetingHazards: { id: string; title: string; level: string }[];
  workFaces: { id: string; name: string; location: string }[];
}) {
  const [showHazardPicker, setShowHazardPicker] = useState(false);
  const label = OPS_MAP[briefing.op_type]?.label ?? briefing.op_type;
  const confirmed = getConfirmed(briefing.id);
  const rate = workers.length > 0 ? Math.round((confirmed.length / workers.length) * 100) : 0;
  const full = confirmed.length === workers.length && workers.length > 0;

  const linkedHazardIds = briefing.hazard_ids ?? [];
  const linkedHazards = meetingHazards.filter((h) => linkedHazardIds.includes(h.id));
  const unlinkedHazards = meetingHazards.filter((h) => !linkedHazardIds.includes(h.id));

  const briefingWorkFaces = workFaces.filter((wf) => (briefing.work_face_ids ?? []).includes(wf.id));

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-slide-in" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-purple-50/70 to-transparent">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-800 text-lg">{label} 专项交底</h4>
              {full && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                  <Stamp className="w-3.5 h-3.5" />全员确认
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              交底人：<span className="font-semibold text-slate-700">{briefing.briefer}</span>
              <span className="mx-2">·</span>
              时间：<span className="font-mono-num">{formatTime(new Date(briefing.brief_time))}</span>
              <span className="mx-2">·</span>
              已签字：<span className="font-bold text-purple-700">{confirmed.length} / {workers.length}</span>
            </p>
            {briefingWorkFaces.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                {briefingWorkFaces.map((wf) => (
                  <span key={wf.id} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-xs font-medium border border-indigo-200">
                    {wf.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600 flex items-center gap-2 hover:text-purple-700">
            <FileText className="w-4 h-4" />查看交底内容（{briefing.content.length} 字）
          </summary>
          <pre className="mt-3 bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap font-sans border border-slate-200 max-h-72 overflow-auto">
            {briefing.content}
          </pre>
        </details>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-orange-500" />
              关联隐患 ({linkedHazards.length})
            </p>
            <button
              type="button"
              onClick={() => setShowHazardPicker(!showHazardPicker)}
              className="px-3 py-1 rounded-md text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 inline-flex items-center gap-1 transition"
            >
              <Link2 className="w-3.5 h-3.5" />
              {showHazardPicker ? '收起' : '绑定隐患'}
            </button>
          </div>
          {linkedHazards.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {linkedHazards.map((h) => (
                <span
                  key={h.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200"
                >
                  {h.title}
                  <button
                    type="button"
                    onClick={() => onUnbindHazard(briefing.id, h.id)}
                    className="ml-0.5 p-0.5 rounded hover:bg-orange-200"
                  >
                    <Unlink className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {showHazardPicker && (
            <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-3 space-y-2">
              {unlinkedHazards.length > 0 ? (
                unlinkedHazards.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onBindHazard(briefing.id, h.id)}
                    className="w-full text-left px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-orange-50 text-sm transition flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-700">{h.title}</span>
                    <Link2 className="w-4 h-4 text-orange-400" />
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">当前晨会无更多可绑定隐患</p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-600" />
              工人签字确认
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-28 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${full ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${rate}%` }} />
              </div>
              <span className={`text-xs font-bold ${full ? 'text-green-600' : 'text-purple-600'}`}>{rate}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {workers.map((w) => {
              const ok = hasConfirmed(briefing.id, w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onToggle(briefing.id, w.id)}
                  className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                    ok
                      ? 'border-green-400 bg-green-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/60'
                  }`}
                >
                  {ok && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center animate-stamp border-2 border-white shadow-md">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-xl mb-1 ${ok ? 'bg-green-100' : 'bg-slate-100'}`}>
                    {w.avatar}
                  </div>
                  <p className={`text-sm font-semibold ${ok ? 'text-green-700' : 'text-slate-700'}`}>{w.name}</p>
                  <p className="text-xs text-slate-500">{w.work_type}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
