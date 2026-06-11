import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserCheck, AlertTriangle, ShieldCheck, Plus, UserPlus, FileWarning, ClipboardList } from 'lucide-react';
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
import { DANGEROUS_OPS } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();

  const meetingData = useMeetingStore((s) => s.meetings);
  const endMeeting = useMeetingStore((s) => s.endMeeting);
  const teamList = useTeamStore((s) => s.teams);
  const workerList = useTeamStore((s) => s.workers);
  const signInList = useSignInStore((s) => s.signIns);
  const hazardList = useHazardStore((s) => s.hazards);
  const workStatusList = useWorkStatusStore((s) => s.workStatuses);

  const getTodayMeeting = useMeetingStore((s) => s.getTodayMeeting);
  const getWorkersByTeam = useTeamStore((s) => s.getWorkersByTeam);
  const getTeamById = useTeamStore((s) => s.getTeamById);
  const getSignInByMeeting = useSignInStore((s) => s.getSignInByMeeting);
  const getAbnormalList = useSignInStore((s) => s.getAbnormalList);
  const getSignStats = useSignInStore((s) => s.getSignStats);
  const getHazardsByMeeting = useHazardStore((s) => s.getHazardsByMeeting);
  const getOnDutyStatuses = useWorkStatusStore((s) => s.getOnDutyStatuses);
  const validateAndMarkOnDuty = useWorkStatusStore((s) => s.validateAndMarkOnDuty);

  const meeting = useMemo(() => getTodayMeeting(), [getTodayMeeting, meetingData]);
  const workers = useMemo(
    () => (meeting ? getWorkersByTeam(meeting.team_id) : []),
    [meeting, getWorkersByTeam, workerList],
  );
  const team = useMemo(
    () => (meeting ? getTeamById(meeting.team_id) : undefined),
    [meeting, getTeamById, teamList],
  );
  const meetingSignIns = useMemo(
    () => (meeting ? getSignInByMeeting(meeting.id) : []),
    [meeting, getSignInByMeeting, signInList],
  );
  const abnormal = useMemo(
    () => (meeting ? getAbnormalList(meeting.id) : []),
    [meeting, getAbnormalList, signInList],
  );
  const stats = useMemo(
    () => (meeting ? getSignStats(meeting.id) : { expected: 0, signed: 0, late: 0, absent: 0 }),
    [meeting, getSignStats, signInList],
  );
  const meetingHazards = useMemo(
    () => (meeting ? getHazardsByMeeting(meeting.id) : []),
    [meeting, getHazardsByMeeting, hazardList],
  );
  const workStatuses = useMemo(
    () => (meeting ? getOnDutyStatuses(meeting.id) : []),
    [meeting, getOnDutyStatuses, workStatusList],
  );

  const onDutyCount = workStatuses.filter((x) => x.status === 'on_duty').length;
  const onDutyRate = stats.expected > 0 ? Math.round((onDutyCount / stats.expected) * 100) : 0;

  const dangerousOpsLabels = useMemo(
    () =>
      meeting?.dangerous_ops.map((k) => DANGEROUS_OPS.find((o) => o.key === k)?.label ?? k).join('、') ?? '',
    [meeting],
  );

  if (!meeting) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-r from-[#1E3A5F] via-[#2C5282] to-[#1E3A5F] p-10 text-white relative">
          <div className="absolute inset-0 opacity-10 industrial-pattern" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-[#F59E0B] flex items-center justify-center shadow-2xl shrink-0">
              <ClipboardList className="w-10 h-10 text-[#1E3A5F]" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">今日晨会待创建</h2>
              <p className="text-slate-300 mb-4">班组长请先创建当日晨会，设定班组、作业内容和危险作业类型</p>
              <button
                onClick={() => navigate('/meeting/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-[#1E3A5F] font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" />
                立即创建晨会
              </button>
            </div>
          </div>
        </div>

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
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-r from-[#1E3A5F] via-[#2C5282] to-[#1E3A5F] p-6 md:p-8 text-white relative">
        <div className="absolute inset-0 opacity-10 industrial-pattern" />
        <div className="relative flex flex-wrap items-start gap-6 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                meeting.status === 'ongoing' ? 'bg-amber-400 text-[#1E3A5F]' : meeting.status === 'ended' ? 'bg-green-400 text-[#1E3A5F]' : 'bg-slate-400 text-white'
              }`}>
                {meeting.status === 'ongoing' ? '● 晨会进行中' : meeting.status === 'ended' ? '✓ 晨会已结束' : '○ 待开始'}
              </span>
              <span className="text-slate-300 text-sm">{meeting.date}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">{meeting.title}</h2>
            <p className="text-slate-300 mt-1">班组：{team?.name ?? '-'} · 班组长：{team?.leader_name ?? '-'}</p>
            {meeting.work_content && <p className="text-sm text-slate-200 mt-2">今日作业：{meeting.work_content}</p>}
            {meeting.dangerous_ops.length > 0 && (
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="应到人数" value={stats.expected} icon={Users} from="#1E3A5F" to="#2C5282" />
        <StatCard label="已签到" value={stats.signed} total={stats.expected} icon={UserCheck} from="#059669" to="#10B981" />
        <StatCard label="异常" value={abnormal.length} icon={AlertTriangle} from="#DC2626" to="#EF4444" highlight={abnormal.length > 0} />
        <StatCard label={`上岗率 ${onDutyRate}%`} value={onDutyCount} total={stats.expected} icon={ShieldCheck} from="#7C3AED" to="#A78BFA" />
      </div>

      {meetingHazards.length > 0 && (
        <div className="rounded-xl border-l-4 border-red-500 bg-red-50/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="font-bold text-red-800">本次晨会登记隐患 <span className="underline">{meetingHazards.length}</span> 条</p>
          </div>
          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
            {meetingHazards.slice(0, 3).map((h) => (
              <li key={h.id}>[{h.level === 'high' ? '高' : h.level === 'medium' ? '中' : '低'}危] {h.title} - 整改人：{h.rectifier}</li>
            ))}
            {meetingHazards.length > 3 && <li className="text-xs text-red-500">还有 {meetingHazards.length - 3} 条...</li>}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-[#F59E0B] rounded-full" />
              签到及上岗明细
            </h3>
            <SignInTable workers={workers} signIns={meetingSignIns} workStatuses={workStatuses} meeting={meeting} />
          </div>
        </div>

        <div className="space-y-6">
          <OnDutyPanel
            meeting={meeting}
            onValidate={validateAndMarkOnDuty}
            onEndMeeting={endMeeting}
            disabled={meeting.status === 'ended'}
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
