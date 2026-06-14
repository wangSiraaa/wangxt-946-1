import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Hazard, HazardStatus, HazardReviewStatus } from '@/types';
import { genId } from '@/utils/date';

interface HazardState {
  hazards: Hazard[];
  addHazard: (data: Omit<Hazard, 'id'>) => void;
  updateHazard: (id: string, data: Partial<Hazard>) => void;
  deleteHazard: (id: string) => void;
  updateHazardStatus: (id: string, status: HazardStatus) => void;
  reviewHazard: (id: string, reviewStatus: HazardReviewStatus, reviewer: string, reviewNote?: string) => void;
  bindBriefing: (hazardId: string, briefingId: string) => void;
  getHazardsByMeeting: (meetingId: string) => Hazard[];
  getHazardsByWorkFace: (workFaceId: string) => Hazard[];
  getUnclosedHazards: (meetingId: string) => Hazard[];
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

      reviewHazard: (id, reviewStatus, reviewer, reviewNote) =>
        set((state) => ({
          hazards: state.hazards.map((h) =>
            h.id === id
              ? {
                  ...h,
                  review_status: reviewStatus,
                  reviewer,
                  review_note: reviewNote,
                  review_time: new Date().toISOString(),
                }
              : h,
          ),
        })),

      bindBriefing: (hazardId, briefingId) =>
        set((state) => ({
          hazards: state.hazards.map((h) =>
            h.id === hazardId ? { ...h, briefing_id: briefingId } : h,
          ),
        })),

      getHazardsByMeeting: (meetingId) =>
        get().hazards.filter((h) => h.meeting_id === meetingId),

      getHazardsByWorkFace: (workFaceId) =>
        get().hazards.filter((h) => h.work_face_id === workFaceId),

      getUnclosedHazards: (meetingId) =>
        get().hazards.filter(
          (h) => h.meeting_id === meetingId && h.status !== 'resolved',
        ),
    }),
    { name: 'site-board:hazard' },
  ),
);
