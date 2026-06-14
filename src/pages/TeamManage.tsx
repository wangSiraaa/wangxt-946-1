import { useState } from 'react';
import { Users, UserPlus, Plus, Trash2, Edit3, Save, X, HardHat, ArrowRightLeft, Check, XCircle, Clock } from 'lucide-react';
import { useTeamStore } from '@/stores/team';
import { useSignInStore } from '@/stores/signIn';
import { useMeetingStore } from '@/stores/meeting';
import { useTransferStore } from '@/stores/transfer';
import { useWorkFaceStore } from '@/stores/workFace';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { WORK_TYPES, type Team, type Worker, type TransferRequest } from '@/types';
import { formatDate } from '@/utils/date';

interface TeamForm {
  id?: string;
  name: string;
  leader_name: string;
  description: string;
}
interface WorkerForm {
  id?: string;
  team_id: string;
  name: string;
  work_type: string;
  id_card: string;
  phone: string;
}
interface TransferForm {
  worker_id: string;
  to_team_id: string;
  reason: string;
  work_face_id: string;
}

const AVATAR_POOL = ['👷', '👷‍♂️', '👷‍♀️', '🧑‍🏭', '👨‍🔧', '🧔', '👨‍🦱', '👩‍🦰', '🧑', '👨‍🦳', '👩', '🧓'];

export default function TeamManage() {
  const teams = useTeamStore((s) => s.teams);
  const workers = useTeamStore((s) => s.workers);
  const addTeam = useTeamStore((s) => s.addTeam);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const deleteTeam = useTeamStore((s) => s.deleteTeam);
  const addWorker = useTeamStore((s) => s.addWorker);
  const updateWorker = useTeamStore((s) => s.updateWorker);
  const deleteWorker = useTeamStore((s) => s.deleteWorker);
  const getTeamById = useTeamStore((s) => s.getTeamById);
  const getWorkerById = useTeamStore((s) => s.getWorkerById);
  const meetings = useMeetingStore((s) => s.meetings);
  const signIns = useSignInStore((s) => s.signIns);

  const transfers = useTransferStore((s) => s.transfers);
  const createTransfer = useTransferStore((s) => s.createTransfer);
  const approveTransfer = useTransferStore((s) => s.approveTransfer);
  const rejectTransfer = useTransferStore((s) => s.rejectTransfer);
  const cancelTransfer = useTransferStore((s) => s.cancelTransfer);

  const workFaces = useWorkFaceStore((s) => s.workFaces);
  const getWorkFaceById = useWorkFaceStore((s) => s.getWorkFaceById);

  const [teamModal, setTeamModal] = useState<TeamForm | null>(null);
  const [workerModal, setWorkerModal] = useState<WorkerForm | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(teams[0]?.id ?? null);
  const [transferForm, setTransferForm] = useState<TransferForm>({ worker_id: '', to_team_id: '', reason: '', work_face_id: '' });
  const [transferTab, setTransferTab] = useState<'form' | 'pending' | 'history'>('form');

  const pickAvatar = () => AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];

  const openTeam = (t?: Team) =>
    setTeamModal(
      t ? { id: t.id, name: t.name, leader_name: t.leader_name, description: t.description } : { name: '', leader_name: '', description: '' },
    );
  const openWorker = (w?: Worker) =>
    setWorkerModal(
      w
        ? { id: w.id, team_id: w.team_id, name: w.name, work_type: w.work_type, id_card: w.id_card, phone: w.phone }
        : { team_id: activeTeamId ?? teams[0]?.id ?? '', name: '', work_type: WORK_TYPES[0], id_card: '', phone: '' },
    );

  const saveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamModal || !teamModal.name.trim()) return;
    if (teamModal.id) updateTeam(teamModal.id, { ...teamModal });
    else {
      addTeam({ ...teamModal });
    }
    setTeamModal(null);
  };

  const saveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerModal || !workerModal.name.trim() || !workerModal.team_id) return;
    if (workerModal.id) updateWorker(workerModal.id, { ...workerModal });
    else addWorker({ ...workerModal, avatar: pickAvatar() });
    setWorkerModal(null);
  };

  const safeDeleteTeam = (t: Team) => {
    const related = meetings.filter((m) => m.team_ids.includes(t.id));
    if (related.length > 0) {
      if (!confirm(`该班组关联 ${related.length} 次晨会，删除后工人档案也会移除，是否确认删除？`)) return;
    } else {
      if (!confirm(`确定删除班组【${t.name}】吗？所属工人档案也会被移除。`)) return;
    }
    deleteTeam(t.id);
    if (activeTeamId === t.id) setActiveTeamId(null);
  };

  const safeDeleteWorker = (w: Worker) => {
    const count = signIns.filter((s) => s.worker_id === w.id).length;
    if (!confirm(`确认删除工人【${w.name}】？${count > 0 ? `该工人有 ${count} 条签到记录将保留但无法关联。` : ''}`)) return;
    deleteWorker(w.id);
  };

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.worker_id || !transferForm.to_team_id || !transferForm.reason.trim()) return;
    const worker = getWorkerById(transferForm.worker_id);
    if (!worker) return;
    createTransfer({
      date: formatDate(new Date()),
      from_team_id: worker.team_id,
      to_team_id: transferForm.to_team_id,
      worker_id: transferForm.worker_id,
      reason: transferForm.reason,
      work_face_id: transferForm.work_face_id || undefined,
      status: 'pending',
      requester: '班组长',
    });
    setTransferForm({ worker_id: '', to_team_id: '', reason: '', work_face_id: '' });
  };

  const activeWorkers = workers.filter((w) => w.team_id === activeTeamId);

  const pendingTransfers = transfers.filter((t) => t.status === 'pending');
  const historyTransfers = transfers.filter((t) => t.status !== 'pending');

  const transferStatusBadge = (status: TransferRequest['status']) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold"><Clock className="w-3 h-3" />待审批</span>;
      case 'approved': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 border border-green-300 text-xs font-semibold"><Check className="w-3 h-3" />已通过</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-300 text-xs font-semibold"><XCircle className="w-3 h-3" />已驳回</span>;
      case 'cancelled': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-300 text-xs font-semibold">已取消</span>;
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="bg-gradient-to-r from-[#0EA5E9] via-[#38BDF8] to-[#7DD3FC] rounded-2xl shadow-xl text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">班组与工人档案管理</h2>
              <p className="text-sky-100 text-sm mt-1">维护班组基本信息、成员名单，为每日晨会提供人员基础数据</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-4 py-2 rounded-lg bg-white/15 backdrop-blur text-sm">
              <span className="text-sky-100">班组</span> <span className="font-bold">{teams.length}</span>
              <span className="mx-2 text-sky-200/60">|</span>
              <span className="text-sky-100">工人</span> <span className="font-bold">{workers.length}</span>
            </div>
            <button
              onClick={() => openTeam()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-sky-50 text-sky-600 font-bold rounded-lg shadow-md transition-all"
            >
              <Plus className="w-5 h-5" />新增班组
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-5 h-fit">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-1 h-5 bg-[#0EA5E9] rounded-full" /> 班组列表
          </h3>
          {teams.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8 text-sky-300" />} title="暂无班组" description="点击右上角新增" />
          ) : (
            <div className="space-y-2">
              {teams.map((t) => {
                const cnt = workers.filter((w) => w.team_id === t.id).length;
                const active = t.id === activeTeamId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTeamId(t.id)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                      active ? 'border-[#0EA5E9] bg-sky-50 shadow-md' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center shrink-0">
                            <HardHat className="w-4 h-4" />
                          </div>
                          <p className="font-bold text-slate-800 truncate">{t.name}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 ml-10">班组长：{t.leader_name || '-'}</p>
                        <p className="text-xs text-sky-600 mt-0.5 ml-10 font-semibold">{cnt} 名工人</p>
                        {t.description && <p className="text-xs text-slate-400 mt-1 ml-10 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex gap-0.5 ml-2 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); openTeam(t); }} className="p-1.5 rounded-md text-slate-400 hover:bg-sky-100 hover:text-sky-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); safeDeleteTeam(t); }} className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#F59E0B] rounded-full" />
              工人档案
              {activeTeamId && <span className="text-sm font-normal text-slate-500">（{teams.find((t) => t.id === activeTeamId)?.name}）</span>}
            </h3>
            <button
              onClick={() => openWorker()}
              disabled={teams.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#1E3A5F] font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />添加工人
            </button>
          </div>
          {!activeTeamId ? (
            <EmptyState title="请选择班组" description="从左侧选择一个班组查看成员" />
          ) : activeWorkers.length === 0 ? (
            <EmptyState icon={<UserPlus className="w-8 h-8 text-amber-400" />} title="暂无工人" description="点击右上角添加工人到此班组" />
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {activeWorkers.map((w, idx) => (
                <div
                  key={w.id}
                  className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 animate-slide-in hover:shadow-md hover:border-sky-200 transition"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center text-3xl shrink-0">
                      {w.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">{w.name}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#854D0E] text-xs font-semibold">{w.work_type}</span>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <button onClick={() => openWorker(w)} className="p-1.5 rounded-md text-slate-400 hover:bg-sky-100 hover:text-sky-600">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => safeDeleteWorker(w)} className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-0.5 text-xs text-slate-500 font-mono-num">
                        <p>📞 {w.phone || '-'}</p>
                        <p>🆔 {w.id_card || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1 h-5 bg-purple-500 rounded-full" />
          <ArrowRightLeft className="w-5 h-5 text-purple-500" />
          跨班组调人
        </h3>

        <div className="flex gap-2 mb-4">
          {(['form', 'pending', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTransferTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                transferTab === tab
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'form' ? `申请调人${pendingTransfers.length > 0 ? '' : ''}` : tab === 'pending' ? `待审批 (${pendingTransfers.length})` : '历史记录'}
            </button>
          ))}
        </div>

        {transferTab === 'form' && (
          <form onSubmit={submitTransfer} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">选择工人 *</label>
                <select
                  required
                  value={transferForm.worker_id}
                  onChange={(e) => setTransferForm({ ...transferForm, worker_id: e.target.value })}
                  className="field-input bg-white"
                >
                  <option value="">-- 选择工人 --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({getTeamById(w.team_id)?.name ?? '未知班组'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">目标班组 *</label>
                <select
                  required
                  value={transferForm.to_team_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_team_id: e.target.value })}
                  className="field-input bg-white"
                >
                  <option value="">-- 选择目标班组 --</option>
                  {teams
                    .filter((t) => {
                      const w = getWorkerById(transferForm.worker_id);
                      return !w || t.id !== w.team_id;
                    })
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">作业面</label>
                <select
                  value={transferForm.work_face_id}
                  onChange={(e) => setTransferForm({ ...transferForm, work_face_id: e.target.value })}
                  className="field-input bg-white"
                >
                  <option value="">-- 选择作业面（可选） --</option>
                  {workFaces.map((wf) => (
                    <option key={wf.id} value={wf.id}>{wf.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">调人原因 *</label>
                <input
                  required
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="field-input"
                  placeholder="例：临时支援浇筑作业"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg shadow-md transition-all"
              >
                <ArrowRightLeft className="w-4 h-4" />提交调人申请
              </button>
            </div>
          </form>
        )}

        {transferTab === 'pending' && (
          pendingTransfers.length === 0 ? (
            <EmptyState icon={<Clock className="w-8 h-8 text-amber-300" />} title="暂无待审批申请" description="所有调人申请已处理" />
          ) : (
            <div className="space-y-3">
              {pendingTransfers.map((tr) => {
                const worker = getWorkerById(tr.worker_id);
                const fromTeam = getTeamById(tr.from_team_id);
                const toTeam = getTeamById(tr.to_team_id);
                const wf = tr.work_face_id ? getWorkFaceById(tr.work_face_id) : undefined;
                return (
                  <div key={tr.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 animate-slide-in">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-800">{worker?.name ?? tr.worker_id}</span>
                          <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                          <span className="text-sm text-slate-600">{fromTeam?.name ?? '?'} → {toTeam?.name ?? '?'}</span>
                          {transferStatusBadge(tr.status)}
                        </div>
                        <p className="text-sm text-slate-600 mb-1">原因：{tr.reason}</p>
                        {wf && <p className="text-xs text-slate-500">作业面：{wf.name}</p>}
                        <p className="text-xs text-slate-400 mt-1">申请时间：{new Date(tr.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => approveTransfer(tr.id, '安全员')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                        >
                          <Check className="w-4 h-4" />通过
                        </button>
                        <button
                          onClick={() => rejectTransfer(tr.id, '安全员')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                        >
                          <XCircle className="w-4 h-4" />驳回
                        </button>
                        <button
                          onClick={() => cancelTransfer(tr.id)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-sm font-semibold rounded-lg transition"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {transferTab === 'history' && (
          historyTransfers.length === 0 ? (
            <EmptyState icon={<ArrowRightLeft className="w-8 h-8 text-slate-300" />} title="暂无调人记录" description="已审批的调人申请将在此显示" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="px-4 py-2.5 text-left font-semibold">工人</th>
                    <th className="px-4 py-2.5 text-left font-semibold">原班组</th>
                    <th className="px-4 py-2.5 text-left font-semibold">目标班组</th>
                    <th className="px-4 py-2.5 text-left font-semibold">原因</th>
                    <th className="px-4 py-2.5 text-left font-semibold">状态</th>
                    <th className="px-4 py-2.5 text-left font-semibold">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {historyTransfers.map((tr) => {
                    const worker = getWorkerById(tr.worker_id);
                    const fromTeam = getTeamById(tr.from_team_id);
                    const toTeam = getTeamById(tr.to_team_id);
                    return (
                      <tr key={tr.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{worker?.name ?? tr.worker_id}</td>
                        <td className="px-4 py-2.5 text-slate-600">{fromTeam?.name ?? '?'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{toTeam?.name ?? '?'}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs max-w-[200px] truncate">{tr.reason}</td>
                        <td className="px-4 py-2.5">{transferStatusBadge(tr.status)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{tr.approved_at ? new Date(tr.approved_at).toLocaleString('zh-CN') : new Date(tr.created_at).toLocaleString('zh-CN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {teamModal && (
        <Modal onClose={() => setTeamModal(null)} title={teamModal.id ? '编辑班组' : '新增班组'}>
          <form onSubmit={saveTeam} className="space-y-4">
            <Field label="班组名称 *">
              <input required value={teamModal.name} onChange={(e) => setTeamModal({ ...teamModal, name: e.target.value })}
                className="field-input" placeholder="例：土建一班" />
            </Field>
            <Field label="班组长姓名">
              <input value={teamModal.leader_name} onChange={(e) => setTeamModal({ ...teamModal, leader_name: e.target.value })}
                className="field-input" placeholder="例：张建国" />
            </Field>
            <Field label="班组描述">
              <textarea rows={3} value={teamModal.description} onChange={(e) => setTeamModal({ ...teamModal, description: e.target.value })}
                className="field-input resize-none" placeholder="负责范围、主要作业类型等" />
            </Field>
            <ModalFooter onCancel={() => setTeamModal(null)} submitText="保存班组" />
          </form>
        </Modal>
      )}

      {workerModal && (
        <Modal onClose={() => setWorkerModal(null)} title={workerModal.id ? '编辑工人' : '新增工人'}>
          <form onSubmit={saveWorker} className="space-y-4">
            <Field label="所属班组 *">
              <select required value={workerModal.team_id} onChange={(e) => setWorkerModal({ ...workerModal, team_id: e.target.value })}
                className="field-input bg-white">
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="姓名 *">
              <input required value={workerModal.name} onChange={(e) => setWorkerModal({ ...workerModal, name: e.target.value })}
                className="field-input" placeholder="例：王大伟" />
            </Field>
            <Field label="工种 *">
              <select required value={workerModal.work_type} onChange={(e) => setWorkerModal({ ...workerModal, work_type: e.target.value })}
                className="field-input bg-white">
                {WORK_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="身份证号">
                <input value={workerModal.id_card} onChange={(e) => setWorkerModal({ ...workerModal, id_card: e.target.value })}
                  className="field-input font-mono-num" placeholder="18位身份证号" />
              </Field>
              <Field label="联系电话">
                <input value={workerModal.phone} onChange={(e) => setWorkerModal({ ...workerModal, phone: e.target.value })}
                  className="field-input font-mono-num" placeholder="11位手机号" />
              </Field>
            </div>
            <ModalFooter onCancel={() => setWorkerModal(null)} submitText="保存档案" />
          </form>
        </Modal>
      )}

      <style>{`
        .field-input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid rgb(203 213 225); border-radius: 0.5rem; outline: none; transition: all .15s; }
        .field-input:focus { border-color: transparent; box-shadow: 0 0 0 2px rgb(14 165 233 / 0.4); }
      `}</style>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-slide-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function ModalFooter({ onCancel, submitText }: { onCancel: () => void; submitText: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">取消</button>
      <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold rounded-lg shadow-md transition-all">
        <Save className="w-5 h-5" />{submitText}
      </button>
    </div>
  );
}
