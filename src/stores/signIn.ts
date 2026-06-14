import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SignIn, SignInStatus, SignInReviewStatus, Worker } from '@/types';
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
  createSignIn: (meetingId: string, workerId: string, teamId: string, workFaceId: string) => SignIn | null;
  createMakeupSignIn: (meetingId: string, workerId: string, teamId: string, workFaceId: string, lateReason: string) => SignIn | null;
  reviewMakeupSignIn: (signInId: string, approved: boolean, reviewer: string, reviewNote?: string) => void;
  recordLateReason: (signInId: string, reason: string) => void;
  hasSignedIn: (meetingId: string, workerId: string) => boolean;
  getSignInByMeeting: (meetingId: string) => SignIn[];
  getSignInByWorker: (meetingId: string, workerId: string) => SignIn | undefined;
  getSignInsByWorkFace: (meetingId: string, workFaceId: string) => SignIn[];
  getAbnormalList: (meetingId: string) => AbnormalItem[];
  getSignStats: (meetingId: string) => { expected: number; signed: number; late: number; absent: number };
  getPendingReviewSignIns: (meetingId: string) => SignIn[];
  clearMeetingSignIns: (meetingId: string) => void;
}

export const useSignInStore = create<SignInState>()(
  persist(
    (set, get) => ({
      signIns: [],

      createSignIn: (meetingId, workerId, teamId, workFaceId) => {
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
          team_id: teamId,
          work_face_id: workFaceId,
          sign_time: now,
          status,
          late_minutes: isLate ? lateMins : 0,
          is_makeup: false,
          review_status: 'not_required',
        };

        set((state) => ({ signIns: [...state.signIns, signIn] }));
        return signIn;
      },

      createMakeupSignIn: (meetingId, workerId, teamId, workFaceId, lateReason) => {
        if (get().hasSignedIn(meetingId, workerId)) return null;

        const meeting = useMeetingStore.getState().getMeetingById(meetingId);
        if (!meeting) return null;

        const now = new Date().toISOString();
        const threshold = useSettingsStore.getState().settings.lateThreshold;
        const lateMins = diffMinutes(meeting.start_time, now);

        const signIn: SignIn = {
          id: genId('si-'),
          meeting_id: meetingId,
          worker_id: workerId,
          team_id: teamId,
          work_face_id: workFaceId,
          sign_time: now,
          status: lateMins > threshold ? 'late' : 'normal',
          late_minutes: lateMins > threshold ? lateMins : 0,
          late_reason: lateReason,
          is_makeup: true,
          review_status: 'pending',
        };

        set((state) => ({ signIns: [...state.signIns, signIn] }));
        return signIn;
      },

      reviewMakeupSignIn: (signInId, approved, reviewer, reviewNote) => {
        set((state) => ({
          signIns: state.signIns.map((s) =>
            s.id === signInId
              ? {
                  ...s,
                  review_status: (approved ? 'approved' : 'rejected') as SignInReviewStatus,
                  reviewer,
                  review_note: reviewNote,
                  review_time: new Date().toISOString(),
                }
              : s,
          ),
        }));
      },

      recordLateReason: (signInId, reason) => {
        set((state) => ({
          signIns: state.signIns.map((s) =>
            s.id === signInId ? { ...s, late_reason: reason } : s,
          ),
        }));
      },

      hasSignedIn: (meetingId, workerId) =>
        get().signIns.some((s) => s.meeting_id === meetingId && s.worker_id === workerId),

      getSignInByMeeting: (meetingId) =>
        get().signIns.filter((s) => s.meeting_id === meetingId),

      getSignInByWorker: (meetingId, workerId) =>
        get().signIns.find((s) => s.meeting_id === meetingId && s.worker_id === workerId),

      getSignInsByWorkFace: (meetingId, workFaceId) =>
        get().signIns.filter((s) => s.meeting_id === meetingId && s.work_face_id === workFaceId),

      getAbnormalList: (meetingId) => {
        const meeting = useMeetingStore.getState().getMeetingById(meetingId);
        if (!meeting) return [];
        const allWorkers: Worker[] = [];
        for (const tid of meeting.team_ids) {
          allWorkers.push(...useTeamStore.getState().getWorkersByTeam(tid));
        }
        const tempWorkers = (meeting.temp_worker_ids ?? [])
          .map((wid) => useTeamStore.getState().getWorkerById(wid))
          .filter(Boolean) as Worker[];
        const teamWorkers = [...allWorkers, ...tempWorkers];
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
        let expected = 0;
        for (const tid of meeting.team_ids) {
          expected += useTeamStore.getState().getWorkersByTeam(tid).length;
        }
        expected += (meeting.temp_worker_ids ?? []).length;
        const list = get().getSignInByMeeting(meetingId);
        const signed = list.length;
        const late = list.filter((s) => s.status === 'late').length;
        return { expected, signed, late, absent: Math.max(0, expected - signed) };
      },

      getPendingReviewSignIns: (meetingId) =>
        get().signIns.filter((s) => s.meeting_id === meetingId && s.is_makeup && s.review_status === 'pending'),

      clearMeetingSignIns: (meetingId) =>
        set((state) => ({
          signIns: state.signIns.filter((s) => s.meeting_id !== meetingId),
        })),
    }),
    { name: 'site-board:signin' },
  ),
);
