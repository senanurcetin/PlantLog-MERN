import { create } from 'zustand';
import api from '../services/api';

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

export const useAssetStore = create<AssetState>((set) => ({
    assets: [],
    isLoading: false,
    error: null,

    fetchAssets: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/assets');
            set({ assets: response.data, isLoading: false });
        } catch (error: any) {
            set({ isLoading: false, error: error.response?.data?.message || 'Failed to fetch assets' });
        }
    },

    addAsset: async (assetData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/assets', assetData);
            set((state) => ({ assets: [response.data, ...state.assets], isLoading: false }));
        } catch (error: any) {
            set({ isLoading: false, error: error.response?.data?.message || 'Failed to add asset' });
            throw error;
        }
    },

    updateAsset: async (id, data) => {
        set({ error: null });
        try {
            const response = await api.put<Asset>(`/assets/${encodeURIComponent(id)}`, data);
            set((state) => ({ assets: state.assets.map((asset) =>
                asset._id === id ? response.data : asset,
            ) }));
            return response.data;
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to update asset' });
            throw error;
        }
    },

    deleteAsset: async (id) => {
        try {
            await api.delete(`/assets/${id}`);
            set((state) => ({
                assets: state.assets.filter((asset) => asset._id !== id),
            }));
        } catch (error: any) {
            set({ error: error.response?.data?.message || 'Failed to delete asset' });
            throw error;
        }
    }
}));
