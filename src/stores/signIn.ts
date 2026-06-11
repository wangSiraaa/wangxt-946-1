import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SignIn, SignInStatus, Worker } from '@/types';
import { genId, diffMinutes } from '@/utils/date';
import { useSettingsStore } from './settings';
import { useMeetingStore } from './meeting';
import { useTeamStore } from './team';

interface AbnormalItem {
  worker: Worker;
  type: 'late' | 'absent';
  signIn?: SignIn;
  lateMinutes?: number;
}

interface SignInState {
  signIns: SignIn[];
  createSignIn: (meetingId: string, workerId: string) => SignIn | null;
  hasSignedIn: (meetingId: string, workerId: string) => boolean;
  getSignInByMeeting: (meetingId: string) => SignIn[];
  getSignInByWorker: (meetingId: string, workerId: string) => SignIn | undefined;
  getAbnormalList: (meetingId: string) => AbnormalItem[];
  getSignStats: (meetingId: string) => { expected: number; signed: number; late: number; absent: number };
  clearMeetingSignIns: (meetingId: string) => void;
}

export const useSignInStore = create<SignInState>()(
  persist(
    (set, get) => ({
      signIns: [],

      createSignIn: (meetingId, workerId) => {
        if (get().hasSignedIn(meetingId, workerId)) return null;

        const meeting = useMeetingStore.getState().getMeetingById(meetingId);
        if (!meeting) return null;

        const now = new Date().toISOString();
        const threshold = useSettingsStore.getState().settings.lateThreshold;
        const lateMins = diffMinutes(meeting.start_time, now);
        const isLate = lateMins > threshold;
        const status: SignInStatus = isLate ? 'late' : 'normal';

        const signIn: SignIn = {
          id: genId('si-'),
          meeting_id: meetingId,
          worker_id: workerId,
          sign_time: now,
          status,
          late_minutes: isLate ? lateMins : 0,
        };

        set((state) => ({ signIns: [...state.signIns, signIn] }));
        return signIn;
      },

      hasSignedIn: (meetingId, workerId) =>
        get().signIns.some((s) => s.meeting_id === meetingId && s.worker_id === workerId),

      getSignInByMeeting: (meetingId) =>
        get().signIns.filter((s) => s.meeting_id === meetingId),

      getSignInByWorker: (meetingId, workerId) =>
        get().signIns.find((s) => s.meeting_id === meetingId && s.worker_id === workerId),

      getAbnormalList: (meetingId) => {
        const meeting = useMeetingStore.getState().getMeetingById(meetingId);
        if (!meeting) return [];
        const teamWorkers = useTeamStore.getState().getWorkersByTeam(meeting.team_id);
        const signIns = get().getSignInByMeeting(meetingId);
        const abnormal: AbnormalItem[] = [];

        for (const w of teamWorkers) {
          const si = signIns.find((s) => s.worker_id === w.id);
          if (!si) {
            abnormal.push({ worker: w, type: 'absent' });
          } else if (si.status === 'late') {
            abnormal.push({ worker: w, type: 'late', signIn: si, lateMinutes: si.late_minutes });
          }
        }
        return abnormal;
      },

      getSignStats: (meetingId) => {
        const meeting = useMeetingStore.getState().getMeetingById(meetingId);
        if (!meeting) return { expected: 0, signed: 0, late: 0, absent: 0 };
        const expected = useTeamStore.getState().getWorkersByTeam(meeting.team_id).length;
        const list = get().getSignInByMeeting(meetingId);
        const signed = list.length;
        const late = list.filter((s) => s.status === 'late').length;
        return { expected, signed, late, absent: Math.max(0, expected - signed) };
      },

      clearMeetingSignIns: (meetingId) =>
        set((state) => ({
          signIns: state.signIns.filter((s) => s.meeting_id !== meetingId),
        })),
    }),
    { name: 'site-board:signin' },
  ),
);
