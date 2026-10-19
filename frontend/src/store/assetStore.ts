import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';

export interface AssetStatusEvent {
    from: string | null;
    to: string;
    changedAt: string;
    changedBy?: { _id: string; name: string; role: string } | string;
}

export interface Asset {
    _id: string;
    name: string;
    serialNumber: string;
    category: string;
    status: string;
    location: string;
    createdAt: string;
    statusHistory?: AssetStatusEvent[];
}

interface AssetState {
    assets: Asset[];
    isLoading: boolean;
    error: string | null;
    fetchAssets: () => Promise<void>;
    addAsset: (assetData: Partial<Asset>) => Promise<void>;
    updateAsset: (id: string, data: { status: string }) => Promise<Asset>;
    deleteAsset: (id: string) => Promise<void>;
}

let assetFetchVersion = 0;
const currentSession = (epoch: number) => useAuthStore.getState().sessionEpoch === epoch;

export const useAssetStore = create<AssetState>((set) => ({
    assets: [],
    isLoading: false,
    error: null,

    fetchAssets: async () => {
        const epoch = useAuthStore.getState().sessionEpoch;
        const version = ++assetFetchVersion;
        // Never show records from a prior successful request while reloading.
        set({ assets: [], isLoading: true, error: null });
        const stillCurrent = () => currentSession(epoch) && version === assetFetchVersion;
        try {
            const response = await api.get('/assets');
            if (stillCurrent()) set({ assets: response.data, isLoading: false });
        } catch (error: any) {
            if (stillCurrent()) set({
                assets: [], isLoading: false,
                error: error.response?.data?.message || 'Failed to fetch assets',
            });
        }
    },

    addAsset: async (assetData) => {
        const epoch = useAuthStore.getState().sessionEpoch;
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/assets', assetData);
            if (currentSession(epoch)) {
                assetFetchVersion++;
                set((state) => ({ assets: [response.data, ...state.assets], isLoading: false }));
            }
        } catch (error: any) {
            if (currentSession(epoch)) {
                set({ isLoading: false, error: error.response?.data?.message || 'Failed to add asset' });
            }
            throw error;
        }
    },

    updateAsset: async (id, data) => {
        const epoch = useAuthStore.getState().sessionEpoch;
        set({ error: null });
        try {
            const response = await api.put<Asset>(`/assets/${encodeURIComponent(id)}`, data);
            if (currentSession(epoch)) {
                assetFetchVersion++;
                set((state) => ({ assets: state.assets.map((asset) =>
                    asset._id === id ? response.data : asset,
                ), isLoading: false }));
            }
            return response.data;
        } catch (error: any) {
            if (currentSession(epoch)) {
                set({ error: error.response?.data?.message || 'Failed to update asset' });
            }
            throw error;
        }
    },

    deleteAsset: async (id) => {
        const epoch = useAuthStore.getState().sessionEpoch;
        try {
            await api.delete(`/assets/${encodeURIComponent(id)}`);
            if (currentSession(epoch)) {
                assetFetchVersion++;
                set((state) => ({
                    assets: state.assets.filter((asset) => asset._id !== id),
                    isLoading: false,
                }));
            }
        } catch (error: any) {
            if (currentSession(epoch)) {
                set({ error: error.response?.data?.message || 'Failed to delete asset' });
            }
            throw error;
        }
    }
}));

// Synchronously remove the previous session's registry records, and prevent
// outstanding requests from resurrecting them after logout/account switching.
useAuthStore.subscribe((next, previous) => {
    if (next.sessionEpoch !== previous.sessionEpoch) {
        assetFetchVersion++;
        useAssetStore.setState({ assets: [], isLoading: false, error: null });
    }
});
