import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileWarning, Plus, Trash2, Edit3, Save, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useMeetingStore } from '@/stores/meeting';
import { useHazardStore } from '@/stores/hazard';
import { useTeamStore } from '@/stores/team';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { HAZARD_TYPES, type HazardLevel, type HazardStatus, type Hazard } from '@/types';
import { formatDate } from '@/utils/date';

const LEVEL_STYLES: Record<HazardLevel, { label: string; cls: string; icon: any }> = {
  low: { label: '低危', cls: 'bg-sky-100 text-sky-700 border-sky-300', icon: AlertCircle },
  medium: { label: '中危', cls: 'bg-amber-100 text-amber-700 border-amber-400', icon: AlertTriangle },
  high: { label: '高危', cls: 'bg-red-100 text-red-700 border-red-400', icon: AlertTriangle },
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
  const workerList = useTeamStore((s) => s.workers);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);

  const meeting = useMemo(() => getTodayMeeting(), [getTodayMeeting, meetingData]);
  const list = useMemo(
    () => (meeting ? getHazardsByMeeting(meeting.id) : []),
    [meeting, getHazardsByMeeting, allHazards],
  );
  const workers = useMemo(
    () => (meeting ? getWorkersByTeam(meeting.team_id) : []),
    [meeting, getWorkersByTeam, workerList],
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

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
      });
    }
    setShowForm(false);
    setForm(EMPTY);
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
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={h.status} type="hazard-status" />
                </div>
                {h.description && <p className="text-sm text-slate-600 mb-3 whitespace-pre-line bg-slate-50 rounded-md p-3">{h.description}</p>}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>整改责任人：<span className="font-semibold text-slate-700">{h.rectifier}</span></p>
                    <p>截止日期：<span className="font-mono-num">{h.deadline}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {h.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(h.id, h.status === 'pending' ? 'rectifying' : 'resolved')}
                        className="px-3 py-1.5 rounded-md bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {h.status === 'pending' ? '开始整改' : '标记整改完成'}
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
