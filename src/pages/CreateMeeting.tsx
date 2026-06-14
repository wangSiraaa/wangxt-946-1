import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Save, Users as UsersIcon, Flame, Mountain, Container, GanttChart, Zap, Pickaxe, Check, AlertCircle, MapPin, UserPlus } from 'lucide-react';
import { useMeetingStore } from '@/stores/meeting';
import { useTeamStore } from '@/stores/team';
import { useSignInStore } from '@/stores/signIn';
import { useWorkStatusStore } from '@/stores/workStatus';
import { useWorkFaceStore } from '@/stores/workFace';
import { useBriefingStore } from '@/stores/briefing';
import { DANGEROUS_OPS, type Meeting } from '@/types';
import { formatDate, formatTimeInput } from '@/utils/date';

const ICON_MAP: Record<string, any> = {
  Mountain, Flame, Container, GanttChart, Zap, Pickaxe,
};

export default function CreateMeeting() {
  const navigate = useNavigate();
  const teams = useTeamStore((s) => s.teams);
  const workers = useTeamStore((s) => s.workers);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);
  const workFaces = useWorkFaceStore((s) => s.workFaces);
  const getTodayMeeting = useMeetingStore((s) => s.getTodayMeeting);
  const createMeeting = useMeetingStore((s) => s.createMeeting);
  const clearSignIns = useSignInStore((s) => s.clearMeetingSignIns);

  const existing = getTodayMeeting();

  const today = formatDate(new Date());
  const defaultStart = new Date();
  defaultStart.setMinutes(defaultStart.getMinutes() - defaultStart.getMinutes() % 5);
  const [teamIds, setTeamIds] = useState<string[]>(existing?.team_ids ?? []);
  const [title, setTitle] = useState<string>(existing?.title ?? `${today} 安全晨会`);
  const [date, setDate] = useState<string>(existing?.date ?? today);
  const [startTime, setStartTime] = useState<string>(
    existing?.start_time ? formatTimeInput(new Date(existing.start_time)) : formatTimeInput(defaultStart),
  );
  const [workContent, setWorkContent] = useState<string>(existing?.work_content ?? '');
  const [dangerousOps, setDangerousOps] = useState<string[]>(existing?.dangerous_ops ?? []);
  const [workFaceIds, setWorkFaceIds] = useState<string[]>(existing?.work_face_ids ?? []);
  const [tempWorkerIds, setTempWorkerIds] = useState<string[]>(existing?.temp_worker_ids ?? []);
  const [saved, setSaved] = useState<Meeting | null>(null);

  const toggleTeam = (id: string) =>
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const toggleWorkFace = (id: string) =>
    setWorkFaceIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const toggleTempWorker = (id: string) =>
    setTempWorkerIds((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));

  const toggleOp = (key: string) =>
    setDangerousOps((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const selectedTeamWorkers = useMemo(() => {
    const all: typeof workers = [];
    for (const tid of teamIds) {
      all.push(...getWorkersByTeam(tid));
    }
    return all;
  }, [teamIds, getWorkersByTeam]);

  const availableTempWorkers = useMemo(
    () => workers.filter((w) => !teamIds.includes(w.team_id)),
    [workers, teamIds],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamIds.length === 0 || !title || !date || !startTime) return;

    const timePart = startTime.length === 5 ? `${startTime}:00` : startTime;
    const startIso = new Date(`${date}T${timePart}`).toISOString();
    let meeting: Meeting;

    if (existing) {
      if (existing.status === 'ended') {
        alert('晨会已结束，不允许修改');
        return;
      }
      useMeetingStore.getState().updateMeeting(existing.id, {
        team_ids: teamIds,
        title,
        date,
        work_content: workContent,
        dangerous_ops: dangerousOps,
        start_time: startIso,
        work_face_ids: workFaceIds,
        temp_worker_ids: tempWorkerIds,
      });
      meeting = { ...existing, team_ids: teamIds, title, date, work_content: workContent, dangerous_ops: dangerousOps, start_time: startIso, work_face_ids: workFaceIds, temp_worker_ids: tempWorkerIds };
      clearSignIns(existing.id);
      useWorkStatusStore.setState((s) => ({
        workStatuses: s.workStatuses.filter((x) => x.meeting_id !== existing.id),
      }));
      useBriefingStore.setState((s) => ({
        briefings: s.briefings.filter((x) => x.meeting_id !== existing.id),
        briefingConfirms: s.briefingConfirms.filter(
          (c) => !s.briefings.find((b) => b.meeting_id === existing.id && b.id === c.briefing_id),
        ),
      }));
    } else {
      meeting = createMeeting({
        team_ids: teamIds,
        title,
        date,
        work_content: workContent,
        dangerous_ops: dangerousOps,
        start_time: startIso,
        work_face_ids: workFaceIds,
        temp_worker_ids: tempWorkerIds,
      });
    }
    setSaved(meeting);
    setTimeout(() => navigate('/'), 600);
  };

  return (
    <div className="animate-slide-in max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2C5282] rounded-2xl shadow-xl text-white p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F59E0B] flex items-center justify-center shadow-lg">
              <ClipboardList className="w-7 h-7 text-[#1E3A5F]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{existing ? '编辑今日晨会' : '创建今日晨会'}</h2>
              <p className="text-sm text-slate-300">班组长填写晨会信息，勾选危险作业类型后提交</p>
            </div>
            {saved && (
              <span className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-semibold animate-check">
                <Check className="w-4 h-4" /> 保存成功，即将跳转
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl shadow-md p-5 space-y-4 md:col-span-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#F59E0B] rounded-full" />
              基本信息
            </h3>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">晨会标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent transition"
                placeholder="例：2024-06-12 土建一班安全晨会"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">日期 *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">开始时间 *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                参与班组 *
                <span className="ml-2 text-xs font-normal text-slate-500">可多选</span>
              </label>
              {teams.length === 0 ? (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> 暂无班组，请先到班组管理添加
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  {teams.map((t) => {
                    const active = teamIds.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTeam(t.id)}
                        className={`relative text-left p-3.5 rounded-xl border-2 transition-all ${
                          active
                            ? 'border-[#F59E0B] bg-amber-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {active && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-[#F59E0B] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <UsersIcon className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${active ? 'text-amber-800' : 'text-slate-800'}`}>{t.name}</p>
                            <p className="text-xs text-slate-500">{t.leader_name}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedTeamWorkers.length > 0 && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <UsersIcon className="w-3 h-3" /> 已选 {teamIds.length} 个班组，共 {selectedTeamWorkers.length} 名工人
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">今日作业内容</label>
              <textarea
                rows={3}
                value={workContent}
                onChange={(e) => setWorkContent(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] resize-none"
                placeholder="简述当日主要作业任务、施工区域、重点注意事项..."
              />
            </div>
          </div>

          <div className="space-y-5 md:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                <MapPin className="w-4 h-4 text-emerald-500" />
                作业面选择
                <span className="ml-auto text-xs font-normal text-slate-500">未勾选可跳过</span>
              </h3>
              {workFaces.length === 0 ? (
                <p className="text-sm text-slate-500">暂无作业面数据</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {workFaces.map((wf) => {
                    const active = workFaceIds.includes(wf.id);
                    return (
                      <button
                        type="button"
                        key={wf.id}
                        onClick={() => toggleWorkFace(wf.id)}
                        className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {active && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <p className={`font-semibold text-sm ${active ? 'text-emerald-800' : 'text-slate-800'}`}>{wf.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{wf.location}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-violet-500 rounded-full" />
                <UserPlus className="w-4 h-4 text-violet-500" />
                借调工人
                <span className="ml-auto text-xs font-normal text-slate-500">其他班组的工人</span>
              </h3>
              {teamIds.length === 0 ? (
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> 请先选择参与班组
                </p>
              ) : availableTempWorkers.length === 0 ? (
                <p className="text-sm text-slate-500">无可选的借调工人</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableTempWorkers.map((w) => {
                    const active = tempWorkerIds.includes(w.id);
                    const team = teams.find((t) => t.id === w.team_id);
                    return (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => toggleTempWorker(w.id)}
                        className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all ${
                          active
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          active ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {active ? <Check className="w-4 h-4" /> : w.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${active ? 'text-violet-800' : 'text-slate-800'}`}>{w.name}</p>
                          <p className="text-xs text-slate-500">{w.work_type} · {team?.name ?? '未知班组'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {tempWorkerIds.length > 0 && (
                <p className="text-xs text-violet-600 font-medium">
                  已选择 {tempWorkerIds.length} 名借调工人
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-red-500 rounded-full" />
                危险作业勾选
                <span className="ml-auto text-xs font-normal text-slate-500">未勾选可跳过</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {DANGEROUS_OPS.map((op) => {
                  const Icon = ICON_MAP[op.icon] ?? AlertCircle;
                  const active = dangerousOps.includes(op.key);
                  return (
                    <button
                      type="button"
                      key={op.key}
                      onClick={() => toggleOp(op.key)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        active
                          ? 'border-red-500 bg-red-50 shadow-md scale-[1.02]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {active && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center animate-check">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg mb-2 flex items-center justify-center ${active ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`font-semibold ${active ? 'text-red-700' : 'text-slate-800'}`}>{op.label}</p>
                      <p className={`text-xs mt-0.5 ${active ? 'text-red-500' : 'text-slate-400'}`}>
                        {active ? '需专项交底后上岗' : '点击勾选'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {dangerousOps.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    已勾选 <b>{dangerousOps.length}</b> 项危险作业。晨会进行中，安全员需完成对应专项交底并让全员签字确认，否则工人将被禁止上岗。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end sticky bottom-4 z-20">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={teamIds.length === 0 || !title}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-slate-300 disabled:cursor-not-allowed text-[#1E3A5F] font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <Save className="w-5 h-5" />
            {existing ? '保存并继续晨会' : '创建晨会'}
          </button>
        </div>
      </form>
    </div>
  );
}
