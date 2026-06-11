import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, Worker } from '@/types';
import { initialTeams, initialWorkers } from '@/utils/mockData';
import { genId } from '@/utils/date';

interface TeamState {
  teams: Team[];
  workers: Worker[];
  addTeam: (data: Omit<Team, 'id' | 'created_at'>) => void;
  updateTeam: (id: string, data: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addWorker: (data: Omit<Worker, 'id'>) => void;
  updateWorker: (id: string, data: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  getWorkersByTeam: (teamId: string) => Worker[];
  getTeamById: (teamId: string) => Team | undefined;
  getWorkerById: (workerId: string) => Worker | undefined;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      teams: initialTeams,
      workers: initialWorkers,

      addTeam: (data) =>
        set((state) => ({
          teams: [
            ...state.teams,
            { ...data, id: genId('tm-'), created_at: new Date().toISOString() },
          ],
        })),

      updateTeam: (id, data) =>
        set((state) => ({
          teams: state.teams.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),

      deleteTeam: (id) =>
        set((state) => ({
          teams: state.teams.filter((t) => t.id !== id),
          workers: state.workers.filter((w) => w.team_id !== id),
        })),

      addWorker: (data) =>
        set((state) => ({
          workers: [...state.workers, { ...data, id: genId('wrk-') }],
        })),

      updateWorker: (id, data) =>
        set((state) => ({
          workers: state.workers.map((w) => (w.id === id ? { ...w, ...data } : w)),
        })),

      deleteWorker: (id) =>
        set((state) => ({
          workers: state.workers.filter((w) => w.id !== id),
        })),

      getWorkersByTeam: (teamId) =>
        get().workers.filter((w) => w.team_id === teamId),

      getTeamById: (teamId) => get().teams.find((t) => t.id === teamId),

      getWorkerById: (workerId) => get().workers.find((w) => w.id === workerId),
    }),
    { name: 'site-board:team' },
  ),
);
