import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileWarning, Plus, Trash2, Edit3, Save, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Link2, ClipboardCheck, XCircle, MapPin } from 'lucide-react';
import { useMeetingStore } from '@/stores/meeting';
import { useHazardStore } from '@/stores/hazard';
import { useBriefingStore } from '@/stores/briefing';
import { useTeamStore } from '@/stores/team';
import { useWorkFaceStore } from '@/stores/workFace';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { HAZARD_TYPES, type HazardLevel, type HazardStatus, type HazardReviewStatus, type Hazard } from '@/types';
import { formatDate } from '@/utils/date';

const LEVEL_STYLES: Record<HazardLevel, { label: string; cls: string; icon: any }> = {
  low: { label: '低危', cls: 'bg-sky-100 text-sky-700 border-sky-300', icon: AlertCircle },
  medium: { label: '中危', cls: 'bg-amber-100 text-amber-700 border-amber-400', icon: AlertTriangle },
  high: { label: '高危', cls: 'bg-red-100 text-red-700 border-red-400', icon: AlertTriangle },
};

const REVIEW_STYLES: Record<HazardReviewStatus, { label: string; cls: string; icon: any }> = {
  pending: { label: '待复核', cls: 'bg-amber-100 text-amber-700 border-amber-300', icon: ClipboardCheck },
  passed: { label: '复核通过', cls: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
  failed: { label: '复核不通过', cls: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
};

interface FormState {
  id?: string;
  title: string;
  type: string;
  level: HazardLevel;
  location: string;
  description: string;
  rectifier: string;
  deadline: string;
  status: HazardStatus;
  work_face_id: string;
}

const EMPTY: FormState = {
  title: '',
  type: HAZARD_TYPES[0],
  level: 'medium',
  location: '',
  description: '',
  rectifier: '',
  deadline: formatDate(new Date(Date.now() + 3 * 86400000)),
  status: 'pending',
  work_face_id: '',
};

export default function HazardPage() {
  const navigate = useNavigate();
  const meetingData = useMeetingStore((s) => s.meetings);
  const getTodayMeeting = useMeetingStore((s) => s.getTodayMeeting);
  const allHazards = useHazardStore((s) => s.hazards);
  const getHazardsByMeeting = useHazardStore((s) => s.getHazardsByMeeting);
  const add = useHazardStore((s) => s.addHazard);
  const update = useHazardStore((s) => s.updateHazard);
  const remove = useHazardStore((s) => s.deleteHazard);
  const updateStatus = useHazardStore((s) => s.updateHazardStatus);
  const reviewHazard = useHazardStore((s) => s.reviewHazard);
  const bindBriefing = useHazardStore((s) => s.bindBriefing);
  const bindHazardToBriefing = useBriefingStore((s) => s.bindHazard);
  const getBriefingsByMeeting = useBriefingStore((s) => s.getBriefingsByMeeting);
  const briefingData = useBriefingStore((s) => s.briefings);
  const workerList = useTeamStore((s) => s.workers);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);
  const workFaces = useWorkFaceStore((s) => s.workFaces);

  const meeting = useMemo(() => getTodayMeeting(), [getTodayMeeting, meetingData]);
  const list = useMemo(
    () => (meeting ? getHazardsByMeeting(meeting.id) : []),
    [meeting, getHazardsByMeeting, allHazards],
  );
  const workers = useMemo(() => {
    if (!meeting) return [];
    return meeting.team_ids.flatMap((tid) => getWorkersByTeam(tid));
  }, [meeting, getWorkersByTeam, workerList]);

  const meetingBriefings = useMemo(
    () => (meeting ? getBriefingsByMeeting(meeting.id) : []),
    [meeting, getBriefingsByMeeting, briefingData],
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [linkingHazardId, setLinkingHazardId] = useState<string | null>(null);

  const openAdd = () => {
    setForm(EMPTY);
    setShowForm(true);
  };
  const openEdit = (h: Hazard) => {
    setForm({
      id: h.id,
      title: h.title,
      type: h.type,
      level: h.level,
      location: h.location,
      description: h.description,
      rectifier: h.rectifier,
      deadline: h.deadline,
      status: h.status,
      work_face_id: h.work_face_id ?? '',
    });
    setShowForm(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting) return;
    if (!form.title.trim() || !form.location.trim() || !form.rectifier.trim()) return;
    if (form.id) {
      update(form.id, {
        title: form.title,
        type: form.type,
        level: form.level,
        location: form.location,
        description: form.description,
        rectifier: form.rectifier,
        deadline: form.deadline,
        status: form.status,
        work_face_id: form.work_face_id || undefined,
      });
    } else {
      add({
        meeting_id: meeting.id,
        title: form.title,
        type: form.type,
        level: form.level,
        location: form.location,
        description: form.description,
        rectifier: form.rectifier,
        deadline: form.deadline,
        status: form.status,
        work_face_id: form.work_face_id || undefined,
      });
    }
    setShowForm(false);
    setForm(EMPTY);
  };

  const handleReview = (id: string, reviewStatus: HazardReviewStatus) => {
    reviewHazard(id, reviewStatus, '安全员', reviewNote.trim() || undefined);
    setReviewingId(null);
    setReviewNote('');
  };

  const handleLinkBriefing = (hazardId: string, briefingId: string) => {
    bindBriefing(hazardId, briefingId);
    bindHazardToBriefing(briefingId, hazardId);
    setLinkingHazardId(null);
  };

  return (
    <div className="space-y-6 animate-slide-in max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-[#DC2626] via-[#EF4444] to-[#F87171] rounded-2xl shadow-xl text-white p-6 md:p-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shadow-lg">
            <FileWarning className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">隐患登记与整改跟踪</h2>
            <p className="text-red-100 text-sm mt-1">安全员在晨会中发现的问题即时登记、指派整改、跟踪闭环</p>
            {meeting && <p className="text-xs text-red-200 mt-1">关联晨会：{meeting.title}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur text-sm font-semibold transition inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />返回
          </button>
          <button
            onClick={openAdd}
            disabled={!meeting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-red-50 text-red-600 font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />新增隐患
          </button>
        </div>
      </div>

      {!meeting && (
        <div className="bg-white rounded-2xl shadow-md p-10">
          <EmptyState icon={<FileWarning className="w-10 h-10 text-red-400" />} title="今日尚无晨会" description="请先创建晨会再登记隐患" />
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-red-200 animate-slide-in">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-red-500" />
            {form.id ? '编辑隐患' : '新增隐患登记'}
          </h3>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">隐患标题 *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="例：基坑北侧临边防护缺失"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">隐患类型</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              >
                {HAZARD_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">危险等级</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((lv) => {
                  const info = LEVEL_STYLES[lv];
                  const active = form.level === lv;
                  return (
                    <button
                      type="button"
                      key={lv}
                      onClick={() => setForm({ ...form, level: lv })}
                      className={`flex-1 px-3 py-2.5 rounded-lg border-2 font-semibold text-sm flex items-center justify-center gap-1.5 transition ${active ? info.cls : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <info.icon className="w-4 h-4" />{info.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">位置 / 区域 *</label>
              <input
                required
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="例：3号楼 基坑北侧"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <MapPin className="w-4 h-4 inline mr-1" />
                作业面
              </label>
              <select
                value={form.work_face_id}
                onChange={(e) => setForm({ ...form, work_face_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              >
                <option value="">未指定</option>
                {workFaces.map((wf) => <option key={wf.id} value={wf.id}>{wf.name}{wf.location ? ` (${wf.location})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">整改责任人 *</label>
              <select
                required
                value={form.rectifier}
                onChange={(e) => setForm({ ...form, rectifier: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              >
                <option value="">请选择...</option>
                {workers.map((w) => <option key={w.id} value={w.name}>{w.avatar} {w.name} · {w.work_type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">整改期限</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">整改状态</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              >
                <option value="pending">待整改</option>
                <option value="rectifying">整改中</option>
                <option value="resolved">已整改</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">详细描述</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                placeholder="具体隐患情况、造成原因、整改建议等..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">取消</button>
              <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-md transition-all">
                <Save className="w-5 h-5" />{form.id ? '保存修改' : '登记隐患'}
              </button>
            </div>
          </form>
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-10">
          <EmptyState icon={<CheckCircle2 className="w-10 h-10 text-green-400" />} title="暂无隐患登记" description="安全员发现问题后点击右上角新增隐患" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((h, idx) => {
            const info = LEVEL_STYLES[h.level];
            const Icon = info.icon;
            const reviewInfo = h.review_status ? REVIEW_STYLES[h.review_status] : null;
            const linkedBriefing = h.briefing_id ? meetingBriefings.find((b) => b.id === h.briefing_id) : null;
            const hazardWorkFace = h.work_face_id ? workFaces.find((wf) => wf.id === h.work_face_id) : null;
            const isReviewing = reviewingId === h.id;
            const isLinking = linkingHazardId === h.id;

            return (
              <div
                key={h.id}
                className={`rounded-xl border-l-4 bg-white shadow-md p-5 animate-slide-in ${
                  h.level === 'high' ? 'border-red-500' : h.level === 'medium' ? 'border-amber-500' : 'border-sky-500'
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${info.cls}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{h.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500">📍 {h.location}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${info.cls}`}>{info.label}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{h.type}</span>
                        {hazardWorkFace && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200">
                            <MapPin className="w-3 h-3" />{hazardWorkFace.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={h.status} type="hazard-status" />
                    {reviewInfo && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${reviewInfo.cls}`}>
                        <reviewInfo.icon className="w-3 h-3" />{reviewInfo.label}
                      </span>
                    )}
                  </div>
                </div>
                {h.description && <p className="text-sm text-slate-600 mb-3 whitespace-pre-line bg-slate-50 rounded-md p-3">{h.description}</p>}

                {linkedBriefing && (
                  <div className="mb-3 flex items-center gap-2 text-xs bg-purple-50 rounded-md px-3 py-2 border border-purple-100">
                    <Link2 className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-slate-600">关联交底：</span>
                    <span className="font-semibold text-purple-700">{linkedBriefing.op_type} - {linkedBriefing.briefer}</span>
                  </div>
                )}

                {isLinking && (
                  <div className="mb-3 bg-purple-50/50 border border-purple-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">选择交底记录进行关联：</p>
                    {meetingBriefings.length > 0 ? (
                      meetingBriefings.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleLinkBriefing(h.id, b.id)}
                          className="w-full text-left px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-purple-50 text-sm transition flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-700">{b.op_type} - {b.briefer}</span>
                          <Link2 className="w-4 h-4 text-purple-400" />
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-1">当前晨会无交底记录</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setLinkingHazardId(null)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      取消
                    </button>
                  </div>
                )}

                {isReviewing && (
                  <div className="mb-3 bg-amber-50/50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">隐患复核（当前状态：已整改）</p>
                    <textarea
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="复核备注（可选）..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReview(h.id, 'passed')}
                        className="px-3 py-1.5 rounded-md bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />通过
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(h.id, 'failed')}
                        className="px-3 py-1.5 rounded-md bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />不通过
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReviewingId(null); setReviewNote(''); }}
                        className="px-3 py-1.5 rounded-md text-slate-500 text-xs hover:bg-slate-100"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>整改责任人：<span className="font-semibold text-slate-700">{h.rectifier}</span></p>
                    <p>截止日期：<span className="font-mono-num">{h.deadline}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {h.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(h.id, h.status === 'pending' ? 'rectifying' : 'resolved')}
                        className="px-3 py-1.5 rounded-md bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {h.status === 'pending' ? '开始整改' : '标记整改完成'}
                      </button>
                    )}
                    {h.status === 'resolved' && (!h.review_status || h.review_status === 'pending') && (
                      <button
                        onClick={() => setReviewingId(h.id)}
                        className="px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 inline-flex items-center gap-1"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />复核
                      </button>
                    )}
                    {!h.briefing_id && (
                      <button
                        onClick={() => setLinkingHazardId(h.id)}
                        className="px-3 py-1.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 inline-flex items-center gap-1"
                      >
                        <Link2 className="w-3.5 h-3.5" />关联交底
                      </button>
                    )}
                    <button onClick={() => openEdit(h)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => remove(h.id)} className="p-1.5 rounded-md text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
