export interface Team {
  id: string;
  name: string;
  leader_name: string;
  description: string;
  created_at: string;
}

export interface Worker {
  id: string;
  team_id: string;
  name: string;
  work_type: string;
  id_card: string;
  phone: string;
  avatar: string;
}

export type MeetingStatus = 'pending' | 'ongoing' | 'ended';

export interface Meeting {
  id: string;
  team_id: string;
  date: string;
  title: string;
  work_content: string;
  dangerous_ops: string[];
  status: MeetingStatus;
  created_at: string;
  start_time: string;
  end_time?: string;
}

export type SignInStatus = 'normal' | 'late' | 'absent';

export interface SignIn {
  id: string;
  meeting_id: string;
  worker_id: string;
  sign_time: string;
  status: SignInStatus;
  late_minutes: number;
  remark?: string;
}

export type HazardLevel = 'low' | 'medium' | 'high';
export type HazardStatus = 'pending' | 'rectifying' | 'resolved';

export interface Hazard {
  id: string;
  meeting_id: string;
  title: string;
  type: string;
  level: HazardLevel;
  location: string;
  description: string;
  rectifier: string;
  deadline: string;
  status: HazardStatus;
}

export interface Briefing {
  id: string;
  meeting_id: string;
  op_type: string;
  content: string;
  briefer: string;
  brief_time: string;
}

export interface BriefingConfirm {
  id: string;
  briefing_id: string;
  worker_id: string;
  confirm_time: string;
}

export type WorkStatusState = 'on_duty' | 'off_duty' | 'forbidden';

export interface WorkStatus {
  id: string;
  meeting_id: string;
  worker_id: string;
  status: WorkStatusState;
  marked_at: string;
}

export interface Settings {
  lateThreshold: number;
}

export const DANGEROUS_OPS = [
  { key: 'height', label: '高处作业', icon: 'Mountain' },
  { key: 'fire', label: '动火作业', icon: 'Flame' },
  { key: 'confined', label: '有限空间', icon: 'Container' },
  { key: 'lifting', label: '起重吊装', icon: 'GanttChart' },
  { key: 'electric', label: '临时用电', icon: 'Zap' },
  { key: 'excavation', label: '深基坑', icon: 'Pickaxe' },
] as const;

export const WORK_TYPES = [
  '钢筋工', '木工', '电工', '焊工', '架子工',
  '瓦工', '抹灰工', '管道工', '机械操作工', '普工',
] as const;

export const HAZARD_TYPES = [
  '物体打击', '高处坠落', '坍塌', '触电', '机械伤害',
  '起重伤害', '中毒窒息', '火灾', '其他',
] as const;

export interface ValidationResult {
  success: boolean;
  errors: string[];
}
