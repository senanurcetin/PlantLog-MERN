import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';

export interface StatusEvent {
    from: string | null;
    to: string;
    changedAt: string;
    changedBy?: { _id: string; name: string; role: string } | string;
}

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
    reportedAt?: string;
    acknowledgedAt?: string;
    workStartedAt?: string;
    resolvedAt?: string;
    statusHistory?: StatusEvent[];
}

interface LogState {
    logs: LogEntry[];
    isLoading: boolean;
    error: string | null;
    fetchLogs: (assetId?: string) => Promise<void>;
    addLog: (logData: { assetId: string; type: string; title: string; description: string; status: string }) => Promise<void>;
    updateLogStatus: (id: string, status: string) => Promise<void>;
}

let logFetchVersion = 0;
const currentSession = (epoch: number) => useAuthStore.getState().sessionEpoch === epoch;

export const useLogStore = create<LogState>((set) => ({
    logs: [],
    isLoading: false,
    error: null,

    fetchLogs: async (assetId?: string) => {
        const epoch = useAuthStore.getState().sessionEpoch;
        const version = ++logFetchVersion;
        set({ logs: [], isLoading: true, error: null });
        const stillCurrent = () => currentSession(epoch) && version === logFetchVersion;
        try {
            const url = assetId ? `/logs?assetId=${encodeURIComponent(assetId)}` : '/logs';
            const response = await api.get(url);
            if (stillCurrent()) set({ logs: response.data, isLoading: false });
        } catch (error: any) {
            if (stillCurrent()) set({
                logs: [], isLoading: false,
                error: error.response?.data?.message || 'Failed to fetch logs',
            });
        }
    },

    addLog: async (logData) => {
        const epoch = useAuthStore.getState().sessionEpoch;
        set({ isLoading: true, error: null });
        try {
            await api.post('/logs', logData);
            // The page reloads after save to receive populated actor and asset fields.
            if (currentSession(epoch)) {
                logFetchVersion++;
                set({ isLoading: false });
            }
        } catch (error: any) {
            if (currentSession(epoch)) {
                set({ isLoading: false, error: error.response?.data?.message || 'Failed to add log entry' });
            }
            throw error;
        }
    },

    updateLogStatus: async (id, status) => {
        const epoch = useAuthStore.getState().sessionEpoch;
        try {
            const response = await api.put(`/logs/${encodeURIComponent(id)}`, { status });
            if (currentSession(epoch)) {
                logFetchVersion++;
                set((state) => ({
                    logs: state.logs.map((log) =>
                        log._id === id ? response.data : log,
                    ),
                    isLoading: false,
                }));
            }
        } catch (error: any) {
            if (currentSession(epoch)) {
                set({ error: error.response?.data?.message || 'Failed to update log' });
            }
            throw error;
        }
    }
}));

useAuthStore.subscribe((next, previous) => {
    if (next.sessionEpoch !== previous.sessionEpoch) {
        logFetchVersion++;
        useLogStore.setState({ logs: [], isLoading: false, error: null });
    }
});
