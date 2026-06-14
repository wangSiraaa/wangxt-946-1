import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Meeting, MeetingStatus } from '@/types';
import { genId, formatDate } from '@/utils/date';

interface MeetingState {
  meetings: Meeting[];
  currentMeetingId: string | null;
  createMeeting: (data: Omit<Meeting, 'id' | 'created_at' | 'status'> & { status?: MeetingStatus }) => Meeting;
  updateMeeting: (id: string, data: Partial<Meeting>) => void;
  endMeeting: (id: string) => void;
  setCurrentMeeting: (id: string | null) => void;
  getTodayMeetings: (teamId?: string) => Meeting[];
  getMeetingsByDate: (date: string, teamId?: string) => Meeting[];
  getMeetingById: (id: string) => Meeting | undefined;
  getTodayMeeting: (teamId?: string) => Meeting | undefined;
}

export const useMeetingStore = create<MeetingState>()(
  persist(
    (set, get) => ({
      meetings: [],
      currentMeetingId: null,

      createMeeting: (data) => {
        const meeting: Meeting = {
          ...data,
          id: genId('mt-'),
          status: data.status ?? 'ongoing',
          created_at: new Date().toISOString(),
        };
        set((state) => ({
          meetings: [...state.meetings, meeting],
          currentMeetingId: meeting.id,
        }));
        return meeting;
      },

      updateMeeting: (id, data) =>
        set((state) => ({
          meetings: state.meetings.map((m) => (m.id === id ? { ...m, ...data } : m)),
        })),

      endMeeting: (id) =>
        set((state) => ({
          meetings: state.meetings.map((m) =>
            m.id === id
              ? { ...m, status: 'ended' as MeetingStatus, end_time: new Date().toISOString() }
              : m,
          ),
        })),

      setCurrentMeeting: (id) => set({ currentMeetingId: id }),

      getTodayMeetings: (teamId) => {
        const today = formatDate(new Date());
        const list = get().meetings.filter((m) => m.date === today);
        if (teamId) {
          return list.filter((m) => m.team_ids.includes(teamId));
        }
        return list;
      },

      getMeetingsByDate: (date, teamId) => {
        const list = get().meetings.filter((m) => m.date === date);
        if (teamId) {
          return list.filter((m) => m.team_ids.includes(teamId));
        }
        return list;
      },

      getMeetingById: (id) => get().meetings.find((m) => m.id === id),

      getTodayMeeting: (teamId) => {
        const today = formatDate(new Date());
        const list = get().meetings.filter((m) => m.date === today);
        if (teamId) {
          return list.find((m) => m.team_ids.includes(teamId)) ?? list[0];
        }
        return list[0];
      },
    }),
    { name: 'site-board:meeting' },
  ),
);
