import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TransferRequest, TransferStatus } from '@/types';
import { genId } from '@/utils/date';

interface TransferState {
  transfers: TransferRequest[];
  createTransfer: (data: Omit<TransferRequest, 'id' | 'created_at'>) => void;
  approveTransfer: (id: string, approver: string, approver_note?: string) => void;
  rejectTransfer: (id: string, approver: string, approver_note?: string) => void;
  cancelTransfer: (id: string) => void;
  getTransfersByDate: (date: string) => TransferRequest[];
  getTransfersByTeam: (teamId: string) => TransferRequest[];
  getPendingTransfers: () => TransferRequest[];
}

export const useTransferStore = create<TransferState>()(
  persist(
    (set, get) => ({
      transfers: [],

      createTransfer: (data) =>
        set((state) => ({
          transfers: [
            ...state.transfers,
            { ...data, id: genId('tr-'), created_at: new Date().toISOString() },
          ],
        })),

      approveTransfer: (id, approver, approver_note) =>
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === id
              ? { ...t, status: 'approved' as TransferStatus, approver, approver_note, approved_at: new Date().toISOString() }
              : t,
          ),
        })),

      rejectTransfer: (id, approver, approver_note) =>
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === id
              ? { ...t, status: 'rejected' as TransferStatus, approver, approver_note }
              : t,
          ),
        })),

      cancelTransfer: (id) =>
        set((state) => ({
          transfers: state.transfers.map((t) =>
            t.id === id ? { ...t, status: 'cancelled' as TransferStatus } : t,
          ),
        })),

      getTransfersByDate: (date) =>
        get().transfers.filter((t) => t.date === date),

      getTransfersByTeam: (teamId) =>
        get().transfers.filter((t) => t.from_team_id === teamId || t.to_team_id === teamId),

      getPendingTransfers: () =>
        get().transfers.filter((t) => t.status === 'pending'),
    }),
    { name: 'site-board:transfers' },
  ),
);
