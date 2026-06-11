import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Briefing, BriefingConfirm, Worker } from '@/types';
import { genId } from '@/utils/date';
import { useMeetingStore } from './meeting';
import { useTeamStore } from './team';

interface BriefingState {
  briefings: Briefing[];
  briefingConfirms: BriefingConfirm[];
  addBriefing: (data: Omit<Briefing, 'id' | 'brief_time'>) => Briefing;
  deleteBriefing: (id: string) => void;
  confirmBriefing: (briefingId: string, workerId: string) => void;
  unconfirmBriefing: (briefingId: string, workerId: string) => void;
  getBriefingsByMeeting: (meetingId: string) => Briefing[];
  getConfirmsByBriefing: (briefingId: string) => BriefingConfirm[];
  hasConfirmed: (briefingId: string, workerId: string) => boolean;
  getConfirmedWorkers: (briefingId: string) => Worker[];
  isDangerousOpsCompleted: (meetingId: string) => { completed: boolean; missing: string[]; notFull: { op: string; missingWorkers: Worker[] }[] };
}

export const useBriefingStore = create<BriefingState>()(
  persist(
    (set, get) => ({
      briefings: [],
      briefingConfirms: [],

      addBriefing: (data) => {
        const briefing: Briefing = {
          ...data,
          id: genId('bf-'),
          brief_time: new Date().toISOString(),
        };
        set((state) => ({ briefings: [...state.briefings, briefing] }));
        return briefing;
      },

      deleteBriefing: (id) =>
        set((state) => ({
          briefings: state.briefings.filter((b) => b.id !== id),
          briefingConfirms: state.briefingConfirms.filter((c) => c.briefing_id !== id),
        })),

      confirmBriefing: (briefingId, workerId) => {
        if (get().hasConfirmed(briefingId, workerId)) return;
        set((state) => ({
          briefingConfirms: [
            ...state.briefingConfirms,
            {
              id: genId('bc-'),
              briefing_id: briefingId,
              worker_id: workerId,
              confirm_time: new Date().toISOString(),
            },
          ],
        }));
      },

      unconfirmBriefing: (briefingId, workerId) =>
        set((state) => ({
          briefingConfirms: state.briefingConfirms.filter(
            (c) => !(c.briefing_id === briefingId && c.worker_id === workerId),
          ),
        })),

      getBriefingsByMeeting: (meetingId) =>
        get().briefings.filter((b) => b.meeting_id === meetingId),

      getConfirmsByBriefing: (briefingId) =>
        get().briefingConfirms.filter((c) => c.briefing_id === briefingId),

      hasConfirmed: (briefingId, workerId) =>
        get().briefingConfirms.some(
          (c) => c.briefing_id === briefingId && c.worker_id === workerId,
        ),

      getConfirmedWorkers: (briefingId) => {
        const confirms = get().getConfirmsByBriefing(briefingId);
        const allWorkers = useTeamStore.getState().workers;
        return confirms
          .map((c) => allWorkers.find((w) => w.id === c.worker_id))
          .filter(Boolean) as Worker[];
      },

      isDangerousOpsCompleted: (meetingId) => {
        const meeting = useMeetingStore.getState().getMeetingById(meetingId);
        if (!meeting) return { completed: true, missing: [], notFull: [] };
        const workers = useTeamStore.getState().getWorkersByTeam(meeting.team_id);
        const briefings = get().getBriefingsByMeeting(meetingId);
        const missing: string[] = [];
        const notFull: { op: string; missingWorkers: Worker[] }[] = [];

        for (const op of meeting.dangerous_ops) {
          const briefing = briefings.find((b) => b.op_type === op);
          if (!briefing) {
            missing.push(op);
            continue;
          }
          const confirmed = get().getConfirmedWorkers(briefing.id);
          const missingWorkers = workers.filter(
            (w) => !confirmed.some((c) => c.id === w.id),
          );
          if (missingWorkers.length > 0) {
            notFull.push({ op, missingWorkers });
          }
        }

        return {
          completed: missing.length === 0 && notFull.length === 0,
          missing,
          notFull,
        };
      },
    }),
    { name: 'site-board:briefing' },
  ),
);
