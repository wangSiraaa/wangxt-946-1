import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkStatus, WorkStatusState as WorkStatusStateType, ValidationResult, Worker } from '@/types';
import { DANGEROUS_OPS } from '@/types';
import { genId } from '@/utils/date';
import { useMeetingStore } from './meeting';
import { useSignInStore } from './signIn';
import { useBriefingStore } from './briefing';
import { useTeamStore } from './team';

interface WorkStatusState {
  workStatuses: WorkStatus[];
  markOnDuty: (meetingId: string, workerId: string) => void;
  markOffDuty: (meetingId: string, workerId: string) => void;
  isOnDuty: (meetingId: string, workerId: string) => boolean;
  getStatus: (meetingId: string, workerId: string) => WorkStatusStateType | 'unknown';
  getOnDutyStatuses: (meetingId: string) => WorkStatus[];
  validateAndMarkOnDuty: (meetingId: string) => ValidationResult;
}

function opLabel(key: string): string {
  const found = DANGEROUS_OPS.find((o) => o.key === key);
  return found ? found.label : key;
}

export const useWorkStatusStore = create<WorkStatusState>()(
  persist(
    (set, get) => ({
      workStatuses: [],

      markOnDuty: (meetingId, workerId) => {
        if (get().isOnDuty(meetingId, workerId)) return;
        set((state) => ({
          workStatuses: [
            ...state.workStatuses.filter(
              (s) => !(s.meeting_id === meetingId && s.worker_id === workerId),
            ),
            {
              id: genId('ws-'),
              meeting_id: meetingId,
              worker_id: workerId,
              status: 'on_duty',
              marked_at: new Date().toISOString(),
            },
          ],
        }));
      },

      markOffDuty: (meetingId, workerId) =>
        set((state) => ({
          workStatuses: state.workStatuses.filter(
            (s) => !(s.meeting_id === meetingId && s.worker_id === workerId),
          ),
        })),

      isOnDuty: (meetingId, workerId) =>
        get().workStatuses.some(
          (s) => s.meeting_id === meetingId && s.worker_id === workerId && s.status === 'on_duty',
        ),

      getStatus: (meetingId, workerId) => {
        const s = get().workStatuses.find(
          (x) => x.meeting_id === meetingId && x.worker_id === workerId,
        );
        return s?.status ?? 'unknown';
      },

      getOnDutyStatuses: (meetingId) =>
        get().workStatuses.filter((s) => s.meeting_id === meetingId),

      validateAndMarkOnDuty: (meetingId): ValidationResult => {
        const errors: string[] = [];
        const meeting = useMeetingStore.getState().getMeetingById(meetingId);
        if (!meeting) {
          return { success: false, errors: ['晨会不存在'] };
        }

        const workers: Worker[] = useTeamStore.getState().getWorkersByTeam(meeting.team_id);
        const signInStore = useSignInStore.getState();

        const absentWorkers = workers.filter(
          (w) => !signInStore.hasSignedIn(meetingId, w.id),
        );
        if (absentWorkers.length > 0) {
          errors.push(`以下工人未参加晨会，不能上岗：${absentWorkers.map((w) => w.name).join('、')}`);
        }

        const briefingResult = useBriefingStore.getState().isDangerousOpsCompleted(meetingId);
        if (briefingResult.missing.length > 0) {
          errors.push(`以下危险作业未完成专项交底：${briefingResult.missing.map(opLabel).join('、')}`);
        }
        if (briefingResult.notFull.length > 0) {
          for (const item of briefingResult.notFull) {
            const names = item.missingWorkers.map((w) => w.name).join('、');
            errors.push(`[${opLabel(item.op)}] 以下工人未签字确认：${names}`);
          }
        }

        if (errors.length > 0) {
          return { success: false, errors };
        }

        const now = new Date().toISOString();
        const existing = get().workStatuses.filter((s) => s.meeting_id === meetingId).map((s) => s.worker_id);
        const toAdd = workers.filter((w) => !existing.includes(w.id)).map((w) => ({
          id: genId('ws-'),
          meeting_id: meetingId,
          worker_id: w.id,
          status: 'on_duty' as const,
          marked_at: now,
        }));

        set((state) => ({
          workStatuses: [
            ...state.workStatuses.filter((s) => s.meeting_id !== meetingId),
            ...toAdd,
            ...state.workStatuses.filter((s) => s.meeting_id === meetingId),
          ],
        }));

        return { success: true, errors: [] };
      },
    }),
    { name: 'site-board:workstatus' },
  ),
);
