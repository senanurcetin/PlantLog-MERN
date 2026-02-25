import { create } from 'zustand';
import api from '../services/api';

export interface LogEntry {
    _id: string;
    asset: {
        _id: string;
        name: string;
        serialNumber: string;
    };
    author: {
        _id: string;
        name: string;
        role: string;
    };
    type: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
}

interface LogState {
    logs: LogEntry[];
    isLoading: boolean;
    error: string | null;
    fetchLogs: (assetId?: string) => Promise<void>;
    addLog: (logData: any) => Promise<void>;
    updateLogStatus: (id: string, status: string) => Promise<void>;
}

export const useLogStore = create<LogState>((set) => ({
    logs: [],
    isLoading: false,
    error: null,

    fetchLogs: async (assetId?: string) => {
        set({ isLoading: true, error: null });
        try {
            const url = assetId ? `/logs?assetId=${assetId}` : '/logs';
            const response = await api.get(url);
            set({ logs: response.data, isLoading: false });
        } catch (error: any) {
            set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch logs' });
        }
    },

    addLog: async (logData) => {
        set({ isLoading: true, error: null });
        try {
            await api.post('/logs', logData);
            // We might need to fetch logs again to get the populated asset/author data
            set({ isLoading: false });
        } catch (error: any) {
            set({ isLoading: false, error: error.response?.data?.message || 'Failed to add log entry' });
            throw error;
        }
    },

    updateLogStatus: async (id, status) => {
        try {
            const response = await api.put(`/logs/${id}`, { status });
            set((state) => ({
                logs: state.logs.map((log) =>
                    log._id === id ? { ...log, status: response.data.status } : log
                ),
            }));
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to update log' });
        }
    }
}));
