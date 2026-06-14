import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkFace } from '@/types';
import { initialWorkFaces } from '@/utils/mockData';
import { genId } from '@/utils/date';

interface WorkFaceState {
  workFaces: WorkFace[];
  addWorkFace: (data: Omit<WorkFace, 'id' | 'created_at'>) => void;
  updateWorkFace: (id: string, data: Partial<WorkFace>) => void;
  deleteWorkFace: (id: string) => void;
  getWorkFaceById: (id: string) => WorkFace | undefined;
}

export const useWorkFaceStore = create<WorkFaceState>()(
  persist(
    (set, get) => ({
      workFaces: initialWorkFaces,

      addWorkFace: (data) =>
        set((state) => ({
          workFaces: [
            ...state.workFaces,
            { ...data, id: genId('wf-'), created_at: new Date().toISOString() },
          ],
        })),

      updateWorkFace: (id, data) =>
        set((state) => ({
          workFaces: state.workFaces.map((wf) =>
            wf.id === id ? { ...wf, ...data } : wf,
          ),
        })),

      deleteWorkFace: (id) =>
        set((state) => ({
          workFaces: state.workFaces.filter((wf) => wf.id !== id),
        })),

      getWorkFaceById: (id) => get().workFaces.find((wf) => wf.id === id),
    }),
    { name: 'site-board:workfaces' },
  ),
);
