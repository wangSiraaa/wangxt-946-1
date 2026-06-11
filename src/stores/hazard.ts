import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Hazard, HazardStatus } from '@/types';
import { genId } from '@/utils/date';

interface HazardState {
  hazards: Hazard[];
  addHazard: (data: Omit<Hazard, 'id'>) => void;
  updateHazard: (id: string, data: Partial<Hazard>) => void;
  deleteHazard: (id: string) => void;
  updateHazardStatus: (id: string, status: HazardStatus) => void;
  getHazardsByMeeting: (meetingId: string) => Hazard[];
}

export const useHazardStore = create<HazardState>()(
  persist(
    (set, get) => ({
      hazards: [],

      addHazard: (data) =>
        set((state) => ({
          hazards: [...state.hazards, { ...data, id: genId('hz-') }],
        })),

      updateHazard: (id, data) =>
        set((state) => ({
          hazards: state.hazards.map((h) => (h.id === id ? { ...h, ...data } : h)),
        })),

      deleteHazard: (id) =>
        set((state) => ({
          hazards: state.hazards.filter((h) => h.id !== id),
        })),

      updateHazardStatus: (id, status) =>
        set((state) => ({
          hazards: state.hazards.map((h) => (h.id === id ? { ...h, status } : h)),
        })),

      getHazardsByMeeting: (meetingId) =>
        get().hazards.filter((h) => h.meeting_id === meetingId),
    }),
    { name: 'site-board:hazard' },
  ),
);
