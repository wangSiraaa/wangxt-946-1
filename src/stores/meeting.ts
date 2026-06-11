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
  getTodayMeeting: (teamId?: string) => Meeting | undefined;
  getMeetingById: (id: string) => Meeting | undefined;
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

      getTodayMeeting: (teamId) => {
        const today = formatDate(new Date());
        const list = get().meetings.filter((m) => m.date === today);
        if (teamId) {
          return list.find((m) => m.team_id === teamId) ?? list[0];
        }
        return list[0];
      },

      getMeetingById: (id) => get().meetings.find((m) => m.id === id),
    }),
    { name: 'site-board:meeting' },
  ),
);
