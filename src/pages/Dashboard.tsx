import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, AlertTriangle, ShieldCheck, Plus, UserPlus,
  FileWarning, ClipboardList, Calendar, ChevronDown, ChevronUp,
  Clock, ClipboardCheck, PenLine, Eye,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { AbnormalList } from '@/components/dashboard/AbnormalList';
import { SignInTable } from '@/components/dashboard/SignInTable';
import { OnDutyPanel } from '@/components/dashboard/OnDutyPanel';
import { EmptyState } from '@/components/common/EmptyState';
import { useMeetingStore } from '@/stores/meeting';
import { useTeamStore } from '@/stores/team';
import { useSignInStore } from '@/stores/signIn';
import { useHazardStore } from '@/stores/hazard';
import { useWorkStatusStore } from '@/stores/workStatus';
import { useBriefingStore } from '@/stores/briefing';
import { useWorkFaceStore } from '@/stores/workFace';
import { DANGEROUS_OPS } from '@/types';
import type { DashboardAlert, Meeting, SignIn, Briefing, Hazard, WorkStatus } from '@/types';
import { formatDate } from '@/utils/date';

interface AlertPanelProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  items: DashboardAlert[];
}

function AlertPanel({ icon, title, count, color, bgColor, borderColor, items }: AlertPanelProps) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} shadow-sm overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} shrink-0`}>
          {icon}
        </div>
        <span className={`font-semibold text-sm flex-1 ${color.replace('bg-', 'text-').replace('/20', '')}`}>
          {title}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${color} text-white`}>
          {count}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && items.length > 0 && (
        <div className="border-t border-inherit px-4 py-3 space-y-2">
          {items.map((item, i) => (
            <div key={`${item.type}-${item.worker_id}-${i}`} className="flex items-start gap-2 text-sm">
              <span className="font-medium text-slate-700 shrink-0">{item.worker_name}</span>
              <span className="text-slate-400 shrink-0">·</span>
              <span className="text-slate-500">{item.team_name}</span>
              <span className="text-slate-400 shrink-0">·</span>
              <span className="text-slate-600 flex-1">{item.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function computeAlerts(
  meetings: Meeting[],
  signIns: SignIn[],
  briefings: Briefing[],
  hazards: Hazard[],
  workStatuses: WorkStatus[],
  getWorkersByTeam: (teamId: string) => { id: string; name: string; team_id: string; work_type: string }[],
  getTeamById: (teamId: string) => { id: string; name: string; leader_name: string } | undefined,
  _getWorkFaceById: (id: string) => { id: string; name: string } | undefined,
  getConfirmsByBriefing: (briefingId: string) => { worker_id: string }[],
  selectedTeamId: string,
): Record<DashboardAlert['type'], DashboardAlert[]> {
  const signedNotBriefed: DashboardAlert[] = [];
  const briefedNotOnDuty: DashboardAlert[] = [];
  const hazardUnclosed: DashboardAlert[] = [];
  const lateAnomaly: DashboardAlert[] = [];
  const makeupPending: DashboardAlert[] = [];

  for (const meeting of meetings) {
    const meetingSignIns = signIns.filter((s) => s.meeting_id === meeting.id);
    const meetingBriefings = briefings.filter((b) => b.meeting_id === meeting.id);
    const meetingWorkStatuses = workStatuses.filter((ws) => ws.meeting_id === meeting.id);
    const meetingHazards = hazards.filter((h) => h.meeting_id === meeting.id);

    const meetingWorkFaces = meeting.work_face_ids ?? [];

    for (const si of meetingSignIns) {
      if (selectedTeamId && si.team_id !== selectedTeamId) continue;

      const worker = getWorkersByTeam(si.team_id).find((w) => w.id === si.worker_id);
      if (!worker) continue;
      const team = getTeamById(si.team_id);

      if (si.status === 'late') {
        lateAnomaly.push({
          type: 'late_anomaly',
          worker_id: si.worker_id,
          worker_name: worker.name,
          team_id: si.team_id,
          team_name: team?.name ?? '-',
          work_face_id: si.work_face_id,
          detail: `迟到 ${si.late_minutes} 分钟${si.late_reason ? `（${si.late_reason}）` : ''}`,
        });
      }

      if (si.is_makeup && si.review_status === 'pending') {
        makeupPending.push({
          type: 'makeup_pending',
          worker_id: si.worker_id,
          worker_name: worker.name,
          team_id: si.team_id,
          team_name: team?.name ?? '-',
          work_face_id: si.work_face_id,
          detail: `补签待复核${si.late_reason ? `：${si.late_reason}` : ''}`,
        });
      }

      // ——— 危险作业 × 作业面 × 已签到工人 三维检查 ———
      for (const opKey of meeting.dangerous_ops) {
        const opLabel = DANGEROUS_OPS.find((o) => o.key === opKey)?.label ?? opKey;

        // 1. 找出该晨会下 opKey 对应的所有 Briefing
        const opBriefings = meetingBriefings.filter((b) => b.op_type === opKey);

        // 1A. 该危险作业根本未建任何交底 —— 所有已签到工人都要预警
        if (opBriefings.length === 0) {
          // 如果晨会限定了作业面，还要检查工人作业面是否在该晨会作业面里（避免跨作业面误报）
          const workerInMeetingWorkFace =
            meetingWorkFaces.length === 0 || meetingWorkFaces.includes(si.work_face_id);
          if (workerInMeetingWorkFace) {
            signedNotBriefed.push({
              type: 'signed_not_briefed',
              worker_id: si.worker_id,
              worker_name: worker.name,
              team_id: si.team_id,
              team_name: team?.name ?? '-',
              work_face_id: si.work_face_id,
              detail: `已签到但未创建「${opLabel}」专项交底`,
            });
          }
          continue;
        }

        // 2. 已建交底：判断该工人的作业面是否被覆盖 + 是否签字
        // 2A. 从该 opKey 的所有 Briefing 中，找出覆盖工人作业面的那一批
        const coveredBriefings = opBriefings.filter((b) => {
          const wfIds = b.work_face_ids ?? [];
          // 交底未限定作业面 = 全量覆盖；限定了就必须包含该工人的作业面
          if (wfIds.length === 0) return true;
          return wfIds.includes(si.work_face_id);
        });

        // 2B. 作业面未被任何一条交底覆盖 —— 该作业面上的工人仍要预警
        if (coveredBriefings.length === 0) {
          const workerInMeetingWorkFace =
            meetingWorkFaces.length === 0 || meetingWorkFaces.includes(si.work_face_id);
          if (workerInMeetingWorkFace) {
            signedNotBriefed.push({
              type: 'signed_not_briefed',
              worker_id: si.worker_id,
              worker_name: worker.name,
              team_id: si.team_id,
              team_name: team?.name ?? '-',
              work_face_id: si.work_face_id,
              detail: `已创建「${opLabel}」交底但未覆盖该作业面`,
            });
          }
          continue;
        }

        // 2C. 作业面被覆盖 —— 检查工人是否至少完成其中一条的签字
        let confirmed = false;
        for (const b of coveredBriefings) {
          const cs = getConfirmsByBriefing(b.id);
          if (cs.some((c) => c.worker_id === si.worker_id)) {
            confirmed = true;
            break;
          }
        }
        if (!confirmed) {
          signedNotBriefed.push({
            type: 'signed_not_briefed',
            worker_id: si.worker_id,
            worker_name: worker.name,
            team_id: si.team_id,
            team_name: team?.name ?? '-',
            work_face_id: si.work_face_id,
            detail: `已建「${opLabel}」交底但未签字确认`,
          });
        }
      }

      // ——— 已交底未上岗：只要确认过任意一条交底，就视为"已交底" ———
      let anyBriefingConfirmed = false;
      for (const b of meetingBriefings) {
        const cs = getConfirmsByBriefing(b.id);
        if (cs.some((c) => c.worker_id === si.worker_id)) {
          anyBriefingConfirmed = true;
          break;
        }
      }
      if (anyBriefingConfirmed) {
        const onDuty = meetingWorkStatuses.some(
          (ws) => ws.worker_id === si.worker_id && ws.status === 'on_duty',
        );
        if (!onDuty) {
          briefedNotOnDuty.push({
            type: 'briefed_not_onduty',
            worker_id: si.worker_id,
            worker_name: worker.name,
            team_id: si.team_id,
            team_name: team?.name ?? '-',
            work_face_id: si.work_face_id,
            detail: '已确认交底但尚未上岗',
          });
        }
      }
    }

    for (const h of meetingHazards) {
      if (h.status === 'resolved') continue;
      const teamId = selectedTeamId || meeting.team_ids[0] || '';
      const t = getTeamById(teamId);
      hazardUnclosed.push({
        type: 'hazard_unclosed',
        worker_id: h.rectifier,
        worker_name: h.rectifier,
        team_id: teamId,
        team_name: t?.name ?? '-',
        work_face_id: h.work_face_id,
        detail: `[${h.level === 'high' ? '高危' : h.level === 'medium' ? '中危' : '低危'}] ${h.title} - 整改人：${h.rectifier}`,
      });
    }
  }

  const dedup = (list: DashboardAlert[]) => {
    const seen = new Set<string>();
    return list.filter((a) => {
      const key = `${a.type}-${a.worker_id}-${a.detail}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    signed_not_briefed: dedup(signedNotBriefed),
    briefed_not_onduty: dedup(briefedNotOnDuty),
    hazard_unclosed: dedup(hazardUnclosed),
    late_anomaly: dedup(lateAnomaly),
    makeup_pending: dedup(makeupPending),
  };
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(() => formatDate());
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const meetingData = useMeetingStore((s) => s.meetings);
  const endMeeting = useMeetingStore((s) => s.endMeeting);
  const getMeetingsByDate = useMeetingStore((s) => s.getMeetingsByDate);

  const teamList = useTeamStore((s) => s.teams);
  const workerList = useTeamStore((s) => s.workers);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);
  const getTeamById = useTeamStore((s) => s.getTeamById);

  const signInList = useSignInStore((s) => s.signIns);
  const getSignInByMeeting = useSignInStore((s) => s.getSignInByMeeting);
  const getAbnormalList = useSignInStore((s) => s.getAbnormalList);
  const getSignStats = useSignInStore((s) => s.getSignStats);

  const hazardList = useHazardStore((s) => s.hazards);
  const getHazardsByMeeting = useHazardStore((s) => s.getHazardsByMeeting);

  const workStatusList = useWorkStatusStore((s) => s.workStatuses);
  const getOnDutyStatuses = useWorkStatusStore((s) => s.getOnDutyStatuses);
  const validateAndMarkOnDuty = useWorkStatusStore((s) => s.validateAndMarkOnDuty);

  const briefingList = useBriefingStore((s) => s.briefings);
  const briefingConfirms = useBriefingStore((s) => s.briefingConfirms);
  const getBriefingsByMeeting = useBriefingStore((s) => s.getBriefingsByMeeting);
  const getConfirmsByBriefing = useBriefingStore((s) => s.getConfirmsByBriefing);

  const workFaceList = useWorkFaceStore((s) => s.workFaces);
  const getWorkFaceById = useWorkFaceStore((s) => s.getWorkFaceById);

  const meetings = useMemo(
    () => getMeetingsByDate(selectedDate, selectedTeamId || undefined),
    [getMeetingsByDate, selectedDate, selectedTeamId, meetingData],
  );

  const primaryMeeting = meetings[0];

  const allTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of meetings) {
      for (const tid of m.team_ids) ids.add(tid);
    }
    return Array.from(ids);
  }, [meetings]);

  const workers = useMemo(() => {
    const list: typeof workerList = [];
    const seen = new Set<string>();
    const teamIds = selectedTeamId ? [selectedTeamId] : allTeamIds;
    for (const tid of teamIds) {
      for (const w of getWorkersByTeam(tid)) {
        if (!seen.has(w.id)) {
          seen.add(w.id);
          list.push(w);
        }
      }
    }
    return list;
  }, [selectedTeamId, allTeamIds, getWorkersByTeam, workerList]);

  const teamNames = useMemo(
    () => allTeamIds.map((tid) => getTeamById(tid)?.name).filter(Boolean).join('、') || '-',
    [allTeamIds, getTeamById, teamList],
  );

  const leaderNames = useMemo(() => {
    const names = allTeamIds.map((tid) => getTeamById(tid)?.leader_name).filter(Boolean);
    return names.join('、') || '-';
  }, [allTeamIds, getTeamById, teamList]);

  const aggregatedSignIns = useMemo(() => {
    const list: typeof signInList = [];
    for (const m of meetings) {
      const ms = getSignInByMeeting(m.id);
      if (selectedTeamId) {
        list.push(...ms.filter((s) => s.team_id === selectedTeamId));
      } else {
        list.push(...ms);
      }
    }
    return list;
  }, [meetings, selectedTeamId, getSignInByMeeting, signInList]);

  const aggregatedWorkStatuses = useMemo(() => {
    const list: typeof workStatusList = [];
    for (const m of meetings) {
      const ms = getOnDutyStatuses(m.id);
      if (selectedTeamId) {
        list.push(...ms.filter((ws) => ws.team_id === selectedTeamId));
      } else {
        list.push(...ms);
      }
    }
    return list;
  }, [meetings, selectedTeamId, getOnDutyStatuses, workStatusList]);

  const aggregatedBriefings = useMemo(() => {
    const list: typeof briefingList = [];
    for (const m of meetings) {
      list.push(...getBriefingsByMeeting(m.id));
    }
    return list;
  }, [meetings, getBriefingsByMeeting, briefingList]);

  const aggregatedHazards = useMemo(() => {
    const list: typeof hazardList = [];
    for (const m of meetings) {
      list.push(...getHazardsByMeeting(m.id));
    }
    return list;
  }, [meetings, getHazardsByMeeting, hazardList]);

  const abnormal = useMemo(() => {
    const list: ReturnType<typeof getAbnormalList> = [];
    for (const m of meetings) {
      const items = getAbnormalList(m.id);
      if (selectedTeamId) {
        const teamWorkers = new Set(getWorkersByTeam(selectedTeamId).map((w) => w.id));
        list.push(...items.filter((i) => teamWorkers.has(i.worker.id)));
      } else {
        list.push(...items);
      }
    }
    return list;
  }, [meetings, selectedTeamId, getAbnormalList, getWorkersByTeam, signInList, workerList]);

  const stats = useMemo(() => {
    let expected = 0;
    let signed = 0;
    let late = 0;
    let absent = 0;
    for (const m of meetings) {
      const s = getSignStats(m.id);
      expected += s.expected;
      signed += s.signed;
      late += s.late;
      absent += s.absent;
    }
    if (selectedTeamId) {
      const teamWorkers = getWorkersByTeam(selectedTeamId);
      const teamSignIns = aggregatedSignIns.filter((s) => s.team_id === selectedTeamId);
      expected = teamWorkers.length;
      signed = teamSignIns.length;
      late = teamSignIns.filter((s) => s.status === 'late').length;
      absent = Math.max(0, expected - signed);
    }
    return { expected, signed, late, absent };
  }, [meetings, selectedTeamId, getSignStats, getWorkersByTeam, aggregatedSignIns, signInList]);

  const onDutyCount = aggregatedWorkStatuses.filter((x) => x.status === 'on_duty').length;
  const onDutyRate = stats.expected > 0 ? Math.round((onDutyCount / stats.expected) * 100) : 0;

  const alerts = useMemo(
    () =>
      computeAlerts(
        meetings,
        aggregatedSignIns,
        aggregatedBriefings,
        aggregatedHazards,
        aggregatedWorkStatuses,
        getWorkersByTeam,
        getTeamById,
        getWorkFaceById,
        getConfirmsByBriefing,
        selectedTeamId,
      ),
    [
      meetings, aggregatedSignIns, aggregatedBriefings, aggregatedHazards,
      aggregatedWorkStatuses, getWorkersByTeam, getTeamById, getWorkFaceById,
      getConfirmsByBriefing, selectedTeamId, workerList, teamList, workFaceList, briefingConfirms,
    ],
  );

  const totalAlertCount = Object.values(alerts).reduce((sum, a) => sum + a.length, 0);

  const dangerousOpsLabels = useMemo(() => {
    const ops = new Set<string>();
    for (const m of meetings) {
      for (const k of m.dangerous_ops) ops.add(k);
    }
    return Array.from(ops)
      .map((k) => DANGEROUS_OPS.find((o) => o.key === k)?.label ?? k)
      .join('、');
  }, [meetings]);

  const hasWorkContent = meetings.some((m) => m.work_content);

  const dateTeamTeams = useMemo(() => {
    const ids = new Set<string>();
    for (const m of getMeetingsByDate(selectedDate)) {
      for (const tid of m.team_ids) ids.add(tid);
    }
    return teamList.filter((t) => ids.has(t.id));
  }, [getMeetingsByDate, selectedDate, meetingData, teamList]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedTeamId('');
  }, []);

  const handleTeamChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTeamId(e.target.value);
  }, []);

  if (meetings.length === 0) {
    const isToday = selectedDate === formatDate();
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-r from-[#1E3A5F] via-[#2C5282] to-[#1E3A5F] p-6 md:p-8 text-white relative">
          <div className="absolute inset-0 opacity-10 industrial-pattern" />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-[#F59E0B]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="bg-transparent text-white text-sm outline-none [color-scheme:dark]"
                />
              </div>
              <select
                value={selectedTeamId}
                onChange={handleTeamChange}
                className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800">全部班组</option>
                {teamList.map((t) => (
                  <option key={t.id} value={t.id} className="text-slate-800">{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-[#F59E0B] flex items-center justify-center shadow-2xl shrink-0">
                <ClipboardList className="w-10 h-10 text-[#1E3A5F]" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">
                  {isToday ? '今日晨会待创建' : `${selectedDate} 无晨会`}
                </h2>
                <p className="text-slate-300 mb-4">
                  {isToday
                    ? '班组长请先创建当日晨会，设定班组、作业内容和危险作业类型'
                    : '该日期暂无晨会记录，可切换日期查看'}
                </p>
                {isToday && (
                  <button
                    onClick={() => navigate('/meeting/create')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#1E3A5F] font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    立即创建晨会
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isToday && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '创建晨会', path: '/meeting/create', icon: ClipboardList, desc: '班组长每日发起', color: 'from-[#F59E0B] to-[#D97706]' },
                { label: '工人签到', path: '/meeting/signin', icon: UserPlus, desc: '入场扫码/点名签到', color: 'from-[#10B981] to-[#059669]' },
                { label: '隐患登记', path: '/hazard', icon: FileWarning, desc: '安全员记录问题', color: 'from-[#EF4444] to-[#DC2626]' },
                { label: '专项交底', path: '/briefing', icon: ShieldCheck, desc: '危险作业必做', color: 'from-[#8B5CF6] to-[#7C3AED]' },
              ].map(({ label, path, icon: Icon, desc, color }) => (
                <Link
                  key={path}
                  to={path}
                  className={`group rounded-xl p-5 bg-gradient-to-br ${color} text-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all`}
                >
                  <Icon className="w-10 h-10 mb-3 opacity-90 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-lg">{label}</p>
                  <p className="text-xs text-white/85 mt-1">{desc}</p>
                </Link>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-8">
              <EmptyState
                icon={<ClipboardList className="w-10 h-10" />}
                title="今日暂无晨会数据"
                description="班组长创建晨会后，工人签到、隐患登记、上岗管控等数据会展示在这里"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-r from-[#1E3A5F] via-[#2C5282] to-[#1E3A5F] p-6 md:p-8 text-white relative">
        <div className="absolute inset-0 opacity-10 industrial-pattern" />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-[#F59E0B]" />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="bg-transparent text-white text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <select
              value={selectedTeamId}
              onChange={handleTeamChange}
              className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer"
            >
              <option value="" className="text-slate-800">全部班组</option>
              {dateTeamTeams.map((t) => (
                <option key={t.id} value={t.id} className="text-slate-800">{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-start gap-6 justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {meetings.map((m) => (
                  <span
                    key={m.id}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      m.status === 'ongoing'
                        ? 'bg-amber-400 text-[#1E3A5F]'
                        : m.status === 'ended'
                          ? 'bg-green-400 text-[#1E3A5F]'
                          : 'bg-slate-400 text-white'
                    }`}
                  >
                    {m.status === 'ongoing' ? '● 进行中' : m.status === 'ended' ? '✓ 已结束' : '○ 待开始'}
                  </span>
                ))}
                <span className="text-slate-300 text-sm">{selectedDate}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {primaryMeeting?.title ?? '晨会看板'}
              </h2>
              <p className="text-slate-300 mt-1">
                班组：{teamNames} · 班组长：{leaderNames}
              </p>
              {hasWorkContent && (
                <p className="text-sm text-slate-200 mt-2">
                  今日作业：{meetings.map((m) => m.work_content).filter(Boolean).join('；')}
                </p>
              )}
              {dangerousOpsLabels && (
                <p className="text-sm mt-2">
                  <span className="text-red-300 font-semibold">⚠ 危险作业：</span>
                  <span className="text-amber-200">{dangerousOpsLabels}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/meeting/signin" className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur rounded-lg text-sm font-semibold transition">
                <UserPlus className="w-4 h-4" />签到
              </Link>
              <Link to="/hazard" className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur rounded-lg text-sm font-semibold transition">
                <FileWarning className="w-4 h-4" />隐患
              </Link>
              <Link to="/briefing" className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur rounded-lg text-sm font-semibold transition">
                <ShieldCheck className="w-4 h-4" />交底
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="应到人数" value={stats.expected} icon={Users} from="#1E3A5F" to="#2C5282" />
        <StatCard label="已签到" value={stats.signed} total={stats.expected} icon={UserCheck} from="#059669" to="#10B981" />
        <StatCard label="异常" value={abnormal.length} icon={AlertTriangle} from="#DC2626" to="#EF4444" highlight={abnormal.length > 0} />
        <StatCard label={`上岗率 ${onDutyRate}%`} value={onDutyCount} total={stats.expected} icon={ShieldCheck} from="#7C3AED" to="#A78BFA" />
      </div>

      {totalAlertCount > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <div className="w-1 h-5 bg-red-500 rounded-full" />
            预警提醒
            <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              {totalAlertCount}
            </span>
          </h3>

          <AlertPanel
            icon={<Eye className="w-4 h-4" />}
            title="已签到未交底"
            count={alerts.signed_not_briefed.length}
            color="bg-orange-500"
            bgColor="bg-orange-50/80"
            borderColor="border-orange-300"
            items={alerts.signed_not_briefed}
          />

          <AlertPanel
            icon={<ClipboardCheck className="w-4 h-4" />}
            title="已交底未上岗"
            count={alerts.briefed_not_onduty.length}
            color="bg-blue-500"
            bgColor="bg-blue-50/80"
            borderColor="border-blue-300"
            items={alerts.briefed_not_onduty}
          />

          <AlertPanel
            icon={<FileWarning className="w-4 h-4" />}
            title="隐患未闭环"
            count={alerts.hazard_unclosed.length}
            color="bg-red-500"
            bgColor="bg-red-50/80"
            borderColor="border-red-300"
            items={alerts.hazard_unclosed}
          />

          <AlertPanel
            icon={<Clock className="w-4 h-4" />}
            title="迟到异常"
            count={alerts.late_anomaly.length}
            color="bg-amber-500"
            bgColor="bg-amber-50/80"
            borderColor="border-amber-300"
            items={alerts.late_anomaly}
          />

          <AlertPanel
            icon={<PenLine className="w-4 h-4" />}
            title="补签待复核"
            count={alerts.makeup_pending.length}
            color="bg-purple-500"
            bgColor="bg-purple-50/80"
            borderColor="border-purple-300"
            items={alerts.makeup_pending}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#F59E0B] rounded-full" />
              签到及上岗明细
            </h3>
            <SignInTable workers={workers} signIns={aggregatedSignIns} workStatuses={aggregatedWorkStatuses} meeting={primaryMeeting} />
          </div>
        </div>

        <div className="space-y-6">
          <OnDutyPanel
            meeting={primaryMeeting}
            onValidate={validateAndMarkOnDuty}
            onEndMeeting={endMeeting}
            disabled={primaryMeeting?.status === 'ended'}
          />
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-red-500 rounded-full" />
              异常名单
            </h3>
            <AbnormalList items={abnormal} />
          </div>
        </div>
      </div>
    </div>
  );
}
